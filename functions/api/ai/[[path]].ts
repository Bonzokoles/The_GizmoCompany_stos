/**
 * ZENO Browser — AI Gate Worker
 * Multi-provider AI routing on Cloudflare Edge
 *
 * Endpoints:
 *   POST /api/ai/chat           — Send prompt to AI (auto-routes to best provider)
 *   POST /api/ai/chat/stream    — Streaming chat response (SSE)
 *   GET  /api/ai/providers      — List available providers & models
 *   GET  /api/ai/status         — Gateway health + metrics
 */

import type { Env, AIProviderConfig } from '../../types';
import { jsonResponse, errorResponse, corsHeaders } from '../../types';

const PROVIDERS: AIProviderConfig[] = [
  {
    name: 'deepseek',
    endpoint: 'https://api.deepseek.com/v1/chat/completions',
    models: ['deepseek-chat', 'deepseek-coder', 'deepseek-reasoner'],
    priority: 1,
    costPerMTok: 0.0014,
  },
  {
    name: 'openrouter',
    endpoint: 'https://openrouter.ai/api/v1/chat/completions',
    models: [
      'anthropic/claude-sonnet-4',
      'openai/gpt-4o',
      'mistralai/mistral-large-latest',
      'meta-llama/llama-3.1-70b-instruct',
      'google/gemini-2.0-flash-exp',
      'qwen/qwen-2.5-72b-instruct',
      'deepseek/deepseek-r1',
      'nousresearch/hermes-3-llama-3.1-405b',
    ],
    priority: 2,
    costPerMTok: 0.003,
  },
  {
    name: 'anthropic',
    endpoint: 'https://api.anthropic.com/v1/messages',
    models: ['claude-sonnet-4-20250514'],
    priority: 3,
    costPerMTok: 0.015,
  },
];

interface ChatRequest {
  prompt: string;
  model?: string;
  provider?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  systemPrompt?: string;
}

function getApiKey(env: Env, provider: string): string | undefined {
  const keyMap: Record<string, string | undefined> = {
    deepseek: env.DEEPSEEK_API_KEY,
    openrouter: env.OPENROUTER_API_KEY,
    anthropic: env.ANTHROPIC_API_KEY,
  };
  return keyMap[provider];
}

function resolveProvider(request: ChatRequest, env: Env): { config: AIProviderConfig; apiKey: string } | null {
  // If user specified a provider
  if (request.provider) {
    const cfg = PROVIDERS.find(p => p.name === request.provider);
    const key = cfg ? getApiKey(env, cfg.name) : undefined;
    if (cfg && key) return { config: cfg, apiKey: key };
  }

  // If user specified a model, find which provider has it
  if (request.model) {
    for (const cfg of PROVIDERS.sort((a, b) => a.priority - b.priority)) {
      if (cfg.models.includes(request.model)) {
        const key = getApiKey(env, cfg.name);
        if (key) return { config: cfg, apiKey: key };
      }
    }
  }

  // Auto-select: cheapest available provider
  for (const cfg of PROVIDERS.sort((a, b) => a.priority - b.priority)) {
    const key = getApiKey(env, cfg.name);
    if (key) return { config: cfg, apiKey: key };
  }

  return null;
}

function buildRequestBody(provider: string, request: ChatRequest): Record<string, unknown> {
  const messages = [];
  if (request.systemPrompt) {
    messages.push({ role: 'system', content: request.systemPrompt });
  }
  messages.push({ role: 'user', content: request.prompt });

  if (provider === 'anthropic') {
    return {
      model: request.model || 'claude-sonnet-4-20250514',
      max_tokens: request.maxTokens || 4096,
      messages,
      ...(request.systemPrompt ? { system: request.systemPrompt } : {}),
      stream: request.stream || false,
    };
  }

  // OpenAI-compatible (DeepSeek, OpenRouter)
  return {
    model: request.model || (provider === 'deepseek' ? 'deepseek-chat' : 'anthropic/claude-sonnet-4'),
    messages,
    temperature: request.temperature ?? 0.7,
    max_tokens: request.maxTokens || 4096,
    stream: request.stream || false,
  };
}

function buildHeaders(provider: string, apiKey: string): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  if (provider === 'anthropic') {
    headers['x-api-key'] = apiKey;
    headers['anthropic-version'] = '2024-10-22';
  } else if (provider === 'openrouter') {
    headers['Authorization'] = `Bearer ${apiKey}`;
    headers['HTTP-Referer'] = 'https://zenbrowsers.org';
    headers['X-Title'] = 'ZENO Browser AI Gate';
  } else {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  return headers;
}

function extractContent(provider: string, data: any): { content: string; model: string; tokens: Record<string, number> } {
  if (provider === 'anthropic') {
    return {
      content: data.content?.[0]?.text || '',
      model: data.model || '',
      tokens: {
        input: data.usage?.input_tokens || 0,
        output: data.usage?.output_tokens || 0,
        total: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
      },
    };
  }

  // OpenAI-compatible
  return {
    content: data.choices?.[0]?.message?.content || '',
    model: data.model || '',
    tokens: {
      input: data.usage?.prompt_tokens || 0,
      output: data.usage?.completion_tokens || 0,
      total: data.usage?.total_tokens || 0,
    },
  };
}

async function handleChat(request: Request, env: Env): Promise<Response> {
  const body = (await request.json()) as ChatRequest;

  if (!body.prompt || typeof body.prompt !== 'string' || body.prompt.trim().length === 0) {
    return errorResponse('Missing or empty "prompt" field', 400);
  }

  if (body.prompt.length > 100_000) {
    return errorResponse('Prompt too long (max 100k chars)', 413);
  }

  const resolved = resolveProvider(body, env);
  if (!resolved) {
    return errorResponse('No AI provider available. Check API key configuration.', 503);
  }

  const { config, apiKey } = resolved;
  const startTime = Date.now();

  try {
    const resp = await fetch(config.endpoint, {
      method: 'POST',
      headers: buildHeaders(config.name, apiKey),
      body: JSON.stringify(buildRequestBody(config.name, body)),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      return errorResponse(`Provider ${config.name} returned ${resp.status}: ${errText.slice(0, 500)}`, 502);
    }

    const data = await resp.json();
    const extracted = extractContent(config.name, data);
    const latency = Date.now() - startTime;

    return jsonResponse({
      id: crypto.randomUUID(),
      provider: config.name,
      model: extracted.model,
      content: extracted.content,
      tokens: extracted.tokens,
      cost: (extracted.tokens.total / 1_000_000) * config.costPerMTok,
      latency,
      cached: false,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return errorResponse(`AI request failed: ${err.message}`, 502);
  }
}

async function handleStream(request: Request, env: Env): Promise<Response> {
  const body = (await request.json()) as ChatRequest;
  body.stream = true;

  if (!body.prompt || typeof body.prompt !== 'string') {
    return errorResponse('Missing "prompt" field', 400);
  }

  const resolved = resolveProvider(body, env);
  if (!resolved) {
    return errorResponse('No AI provider available', 503);
  }

  const { config, apiKey } = resolved;

  try {
    const resp = await fetch(config.endpoint, {
      method: 'POST',
      headers: buildHeaders(config.name, apiKey),
      body: JSON.stringify(buildRequestBody(config.name, body)),
    });

    if (!resp.ok || !resp.body) {
      return errorResponse(`Provider ${config.name} stream error: ${resp.status}`, 502);
    }

    // Pass through the SSE stream
    return new Response(resp.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err: any) {
    return errorResponse(`Stream failed: ${err.message}`, 502);
  }
}

export const onRequest: PagesFunction<Env> = async (context) => {
  if (context.request.method === 'OPTIONS') return corsHeaders();

  const url = new URL(context.request.url);
  const path = url.pathname.replace('/api/ai/', '');

  switch (path) {
    case 'chat':
      if (context.request.method !== 'POST') return errorResponse('POST required', 405);
      return handleChat(context.request, context.env);

    case 'chat/stream':
      if (context.request.method !== 'POST') return errorResponse('POST required', 405);
      return handleStream(context.request, context.env);

    case 'providers':
      return jsonResponse({
        providers: PROVIDERS.map(p => ({
          name: p.name,
          models: p.models,
          priority: p.priority,
          costPerMTok: p.costPerMTok,
          available: !!getApiKey(context.env, p.name),
        })),
      });

    case 'status':
      return jsonResponse({
        service: 'AI Gate',
        status: 'operational',
        version: '1.0.0',
        providers: PROVIDERS.map(p => ({
          name: p.name,
          available: !!getApiKey(context.env, p.name),
          models: p.models.length,
        })),
        timestamp: new Date().toISOString(),
      });

    default:
      return errorResponse('Unknown AI Gate endpoint', 404);
  }
};
