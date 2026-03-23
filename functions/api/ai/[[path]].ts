/**
 * ZENO Browser — AI Gate Worker
 * Multi-provider AI routing on Cloudflare Edge
 *
 * Endpoints:
 *   POST /api/ai/chat                — Send prompt to AI (auto-routes to best provider)
 *   POST /api/ai/chat/stream         — Streaming chat response (SSE)
 *   POST /api/ai/v1/chat/completions — OpenAI-compatible proxy (for page-agent)
 *   GET  /api/ai/providers           — List available providers & models
 *   GET  /api/ai/status              — Gateway health + metrics
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

function getAvailableProviders(request: ChatRequest, env: Env): Array<{ config: AIProviderConfig; apiKey: string }> {
  const sorted = [...PROVIDERS].sort((a, b) => a.priority - b.priority);

  // If user pinned a specific provider, try only that one
  if (request.provider) {
    const cfg = sorted.find(p => p.name === request.provider);
    const key = cfg ? getApiKey(env, cfg.name) : undefined;
    return cfg && key ? [{ config: cfg, apiKey: key }] : [];
  }

  // If user pinned a model, put that provider first but keep fallbacks
  const result: Array<{ config: AIProviderConfig; apiKey: string }> = [];
  if (request.model) {
    const primary = sorted.find(p => p.models.includes(request.model!));
    if (primary) {
      const key = getApiKey(env, primary.name);
      if (key) result.push({ config: primary, apiKey: key });
    }
  }

  // Add remaining providers as fallbacks
  for (const cfg of sorted) {
    if (!result.some(r => r.config.name === cfg.name)) {
      const key = getApiKey(env, cfg.name);
      if (key) result.push({ config: cfg, apiKey: key });
    }
  }

  return result;
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

  // Cascade: try all available providers in priority order
  const availableProviders = getAvailableProviders(body, env);
  if (availableProviders.length === 0) {
    return errorResponse('No AI provider available. Check API key configuration.', 503);
  }

  const errors: string[] = [];
  const startTime = Date.now();

  for (const { config, apiKey } of availableProviders) {
    try {
      const resp = await fetch(config.endpoint, {
        method: 'POST',
        headers: buildHeaders(config.name, apiKey),
        body: JSON.stringify(buildRequestBody(config.name, body)),
        signal: AbortSignal.timeout(30_000),
      });

      if (!resp.ok) {
        const errText = await resp.text();
        errors.push(`${config.name}: ${resp.status} ${errText.slice(0, 200)}`);
        continue; // Try next provider
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
        ...(errors.length > 0 ? { fallback: true, attemptedProviders: errors.length + 1 } : {}),
      });
    } catch (err: any) {
      errors.push(`${config.name}: ${err.message}`);
      continue; // Try next provider
    }
  }

  return errorResponse(`All providers failed: ${errors.join(' | ')}`, 502);
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

/**
 * OpenAI-compatible proxy for page-agent integration.
 * Forwards the request body as-is to OpenAI-compatible providers (DeepSeek, OpenRouter).
 * Supports tools/function_calling required by page-agent for DOM manipulation.
 */
async function handleCompletionsProxy(request: Request, env: Env): Promise<Response> {
  const body = await request.json() as Record<string, unknown>;
  const model = (body.model as string) || 'deepseek-chat';
  const isStream = body.stream === true;

  // Resolve to OpenAI-compatible provider (skip Anthropic — different format)
  const openaiProviders = PROVIDERS.filter(p => p.name !== 'anthropic')
    .sort((a, b) => a.priority - b.priority);

  let target: { config: AIProviderConfig; apiKey: string } | null = null;

  // Try to match model to provider
  for (const cfg of openaiProviders) {
    if (cfg.models.includes(model)) {
      const key = getApiKey(env, cfg.name);
      if (key) { target = { config: cfg, apiKey: key }; break; }
    }
  }

  // Fallback to first available
  if (!target) {
    for (const cfg of openaiProviders) {
      const key = getApiKey(env, cfg.name);
      if (key) { target = { config: cfg, apiKey: key }; break; }
    }
  }

  if (!target) {
    return new Response(JSON.stringify({ error: { message: 'No AI provider available', type: 'server_error' } }), {
      status: 503,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${target.apiKey}`,
  };
  if (target.config.name === 'openrouter') {
    headers['HTTP-Referer'] = 'https://zenbrowsers.org';
    headers['X-Title'] = 'ZENO Page Agent';
  }

  const resp = await fetch(target.config.endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({ ...body, model }),
    signal: AbortSignal.timeout(60_000),
  });

  // Pass through the response as-is (already OpenAI-compatible)
  const responseHeaders: Record<string, string> = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (isStream) {
    responseHeaders['Content-Type'] = 'text/event-stream';
    responseHeaders['Cache-Control'] = 'no-cache';
    return new Response(resp.body, { status: resp.status, headers: responseHeaders });
  }

  responseHeaders['Content-Type'] = 'application/json';
  const data = await resp.text();
  return new Response(data, { status: resp.status, headers: responseHeaders });
}

export const onRequest: PagesFunction<Env> = async (context) => {
  if (context.request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  const url = new URL(context.request.url);
  const path = url.pathname.replace('/api/ai/', '');

  switch (path) {
    case 'chat':
      if (context.request.method !== 'POST') return errorResponse('POST required', 405);
      return handleChat(context.request, context.env);

    case 'chat/stream':
      if (context.request.method !== 'POST') return errorResponse('POST required', 405);
      return handleStream(context.request, context.env);

    case 'v1/chat/completions':
      if (context.request.method !== 'POST') return errorResponse('POST required', 405);
      return handleCompletionsProxy(context.request, context.env);

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
        version: '2.0.0',
        providers: PROVIDERS.map(p => ({
          name: p.name,
          available: !!getApiKey(context.env, p.name),
          models: p.models.length,
        })),
        pageAgent: true,
        timestamp: new Date().toISOString(),
      });

    default:
      return errorResponse('Unknown AI Gate endpoint', 404);
  }
};
