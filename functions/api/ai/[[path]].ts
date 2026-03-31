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

// ── BUCH_CHAT Tool Definitions ─────────────────────────────────────────────

interface BuchTool {
  name: string;
  description: string;
  input_schema: { type: 'object'; properties: Record<string, unknown>; required: string[] };
}

const BUCH_TOOLS: BuchTool[] = [
  {
    name: 'fetch_url',
    description: 'Fetch the content of any URL. Returns cleaned text, HTML, or links list.',
    input_schema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'URL to fetch' },
        format: { type: 'string', enum: ['text', 'html', 'links'], description: 'Output format (default: text)' },
        max_chars: { type: 'number', description: 'Max characters returned (default: 8000)' },
      },
      required: ['url'],
    },
  },
  {
    name: 'extract_text',
    description: 'Strip HTML tags from raw HTML and return clean readable text.',
    input_schema: {
      type: 'object',
      properties: {
        html: { type: 'string', description: 'HTML string to clean' },
      },
      required: ['html'],
    },
  },
  {
    name: 'web_search',
    description: 'Search the web via DuckDuckGo HTML (no API key needed). Returns titles + URLs.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        num_results: { type: 'number', description: 'Number of results (default: 5, max: 10)' },
      },
      required: ['query'],
    },
  },
  {
    name: 'searxng_search',
    description: 'Meta-search via SearXNG (search.mybonzo.com). Aggregates Google, Bing, DuckDuckGo and others. More results than web_search.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        num_results: { type: 'number', description: 'Number of results to return (default: 8, max: 20)' },
        language: { type: 'string', description: 'Language code e.g. pl, en (default: auto)' },
      },
      required: ['query'],
    },
  },
  {
    // PLACEHOLDER — needs headless browser service (steel.dev / browserless.io / Playwright Worker)
    name: 'screenshot_url',
    description: '[PLACEHOLDER] Take a visual screenshot of a URL. Requires headless browser — not yet implemented. Use fetch_url instead.',
    input_schema: {
      type: 'object',
      properties: {
        url: { type: 'string' },
        viewport: { type: 'string', enum: ['desktop', 'mobile'], description: 'Viewport preset' },
      },
      required: ['url'],
    },
  },
  {
    // PLACEHOLDER — needs CSS selector engine (Cheerio Worker / Playwright)
    name: 'scrape_structured',
    description: '[PLACEHOLDER] Extract structured data using CSS selectors. Not yet implemented — use fetch_url + Claude parsing instead.',
    input_schema: {
      type: 'object',
      properties: {
        url: { type: 'string' },
        selectors: { type: 'object', description: 'Map of fieldName → CSS selector string' },
      },
      required: ['url', 'selectors'],
    },
  },
  {
    name: 'r2_read',
    description: 'Read a text/JSON file from an R2 bucket. Returns file content.',
    input_schema: {
      type: 'object',
      properties: {
        bucket: {
          type: 'string',
          enum: ['mybonzo-blog-content', 'mybonzo-analytics', 'mybonzo-finanse', 'vibesdk-templates', 'zen-static-assets', 'zen-blog-images', 'bonzo-media-hub'],
          description: 'R2 bucket name',
        },
        key: { type: 'string', description: 'Object key/path in the bucket' },
      },
      required: ['bucket', 'key'],
    },
  },
  {
    name: 'd1_query',
    description: 'Run a read-only SELECT query on a D1 SQLite database. Returns JSON rows.',
    input_schema: {
      type: 'object',
      properties: {
        database: {
          type: 'string',
          enum: ['zeno-browser-db', 'mybonzo-db', 'jimbo77-db'],
          description: 'Which D1 database to query',
        },
        query: { type: 'string', description: 'SQL SELECT statement (read-only)' },
      },
      required: ['database', 'query'],
    },
  },
];

async function stripHtml(html: string): Promise<string> {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function executeTool(name: string, input: Record<string, unknown>, env: Env): Promise<string> {
  switch (name) {
    case 'fetch_url': {
      const url = String(input.url);
      const format = String(input.format ?? 'text');
      const maxChars = Number(input.max_chars ?? 8000);
      try {
        const resp = await fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ZENO-Agent/1.0)' },
          signal: AbortSignal.timeout(12000),
        });
        if (!resp.ok) return `HTTP error ${resp.status} for ${url}`;
        const html = await resp.text();
        if (format === 'html') return html.slice(0, maxChars);
        if (format === 'links') {
          const links = [...html.matchAll(/href=["']([^"'#][^"']*?)["']/g)]
            .map(m => m[1]).filter(l => l.startsWith('http')).slice(0, 40);
          return JSON.stringify(links);
        }
        return (await stripHtml(html)).slice(0, maxChars);
      } catch (e: unknown) {
        return `fetch_url error: ${e instanceof Error ? e.message : String(e)}`;
      }
    }

    case 'extract_text': {
      const html = String(input.html ?? '');
      return (await stripHtml(html)).slice(0, 12000);
    }

    case 'web_search': {
      const query = String(input.query);
      const num = Math.min(Number(input.num_results ?? 5), 10);
      try {
        const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
        const resp = await fetch(searchUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ZENO-Agent/1.0)' },
          signal: AbortSignal.timeout(8000),
        });
        const html = await resp.text();
        const results: { title: string; url: string }[] = [];
        for (const m of html.matchAll(/<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([^<]+)<\/a>/g)) {
          if (results.length >= num) break;
          results.push({ title: m[2].trim(), url: m[1] });
        }
        return results.length > 0
          ? results.map((r, i) => `${i + 1}. ${r.title}\n   ${r.url}`).join('\n\n')
          : 'No results. Try a more specific query or use fetch_url.';
      } catch (e: unknown) {
        return `web_search error: ${e instanceof Error ? e.message : String(e)}`;
      }
    }

    case 'searxng_search': {
      const query = String(input.query);
      const num = Math.min(Number(input.num_results ?? 8), 20);
      const lang = input.language ? String(input.language) : 'auto';
      try {
        const params = new URLSearchParams({ q: query, format: 'json', language: lang });
        const resp = await fetch(`https://search.mybonzo.com/search?${params}`, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ZENO-Agent/1.0)' },
          signal: AbortSignal.timeout(10000),
        });
        if (!resp.ok) return `searxng_search HTTP error ${resp.status}`;
        const data = await resp.json() as { results?: { title: string; url: string; content?: string; engine?: string }[] };
        const results = (data.results ?? []).slice(0, num);
        if (results.length === 0) return 'Brak wyników SearXNG. Spróbuj innego zapytania lub użyj web_search.';
        return results.map((r, i) =>
          `${i + 1}. ${r.title}\n   ${r.url}${r.content ? '\n   ' + r.content.slice(0, 200) : ''}${r.engine ? ' [' + r.engine + ']' : ''}`,
        ).join('\n\n');
      } catch (e: unknown) {
        return `searxng_search error: ${e instanceof Error ? e.message : String(e)}`;
      }
    }

    case 'screenshot_url':
      // PLACEHOLDER — integrate steel.dev / browserless.io / Playwright Worker later
      return JSON.stringify({
        status: 'not_implemented',
        message: 'Screenshot requires a headless browser service. Planned: steel.dev or Playwright Worker.',
        workaround: `Use fetch_url("${String(input.url)}", "text") to get text content.`,
      });

    case 'scrape_structured':
      // PLACEHOLDER — integrate Cheerio Worker or Playwright later
      return JSON.stringify({
        status: 'not_implemented',
        message: 'Structured scraping placeholder. CSS selector engine not yet deployed.',
        workaround: 'Use fetch_url to get page HTML, then describe what to extract and Claude will parse it.',
      });

    case 'r2_read': {
      const bucket = String(input.bucket);
      const key = String(input.key);
      const cfAccountId = env.CF_ACCOUNT_ID;
      const cfToken = env.CF_API_TOKEN;
      if (!cfAccountId || !cfToken) return 'Error: CF_ACCOUNT_ID / CF_API_TOKEN not configured in Pages env vars.';
      try {
        const resp = await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/r2/buckets/${bucket}/objects/${encodeURIComponent(key)}`,
          { headers: { Authorization: `Bearer ${cfToken}` }, signal: AbortSignal.timeout(10000) },
        );
        if (!resp.ok) return `R2 error ${resp.status}: bucket=${bucket} key=${key}`;
        const text = await resp.text();
        return text.slice(0, 20000);
      } catch (e: unknown) {
        return `r2_read error: ${e instanceof Error ? e.message : String(e)}`;
      }
    }

    case 'd1_query': {
      const dbName = String(input.database);
      const sql = String(input.query).trim();
      if (!sql.toLowerCase().startsWith('select')) return 'Security: only SELECT queries allowed.';
      const cfAccountId = env.CF_ACCOUNT_ID;
      const cfToken = env.CF_API_TOKEN;
      if (!cfAccountId || !cfToken) return 'Error: CF credentials not configured.';
      try {
        const listResp = await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/d1/database?name=${encodeURIComponent(dbName)}`,
          { headers: { Authorization: `Bearer ${cfToken}` }, signal: AbortSignal.timeout(6000) },
        );
        const listData = await listResp.json() as { result?: { uuid: string }[] };
        const dbId = listData.result?.[0]?.uuid;
        if (!dbId) return `D1 database '${dbName}' not found.`;
        const qResp = await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/d1/database/${dbId}/query`,
          {
            method: 'POST',
            headers: { Authorization: `Bearer ${cfToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ sql }),
            signal: AbortSignal.timeout(10000),
          },
        );
        const qData = await qResp.json() as { result?: unknown };
        return JSON.stringify(qData.result, null, 2).slice(0, 20000);
      } catch (e: unknown) {
        return `d1_query error: ${e instanceof Error ? e.message : String(e)}`;
      }
    }

    default:
      return `Unknown tool: ${name}`;
  }
}

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
  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return new Response(JSON.stringify({
      error: { message: 'Invalid JSON body', type: 'invalid_request_error', code: 'bad_request' },
    }), { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
  }
  const requestedModel = (body.model as string) || 'deepseek-chat';
  const isStream = body.stream === true;

  // Resolve to OpenAI-compatible provider (skip Anthropic — different format)
  const openaiProviders = PROVIDERS.filter(p => p.name !== 'anthropic')
    .sort((a, b) => a.priority - b.priority);

  const defaultModelByProvider: Record<string, string> = {
    deepseek: 'deepseek-chat',
    openrouter: 'anthropic/claude-sonnet-4',
  };

  const responseHeaders: Record<string, string> = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  const attempted: string[] = [];

  // 1) Prefer provider matching requested model
  // 2) Then try remaining available providers as fallback
  const orderedProviders = [
    ...openaiProviders.filter((p) => p.models.includes(requestedModel)),
    ...openaiProviders.filter((p) => !p.models.includes(requestedModel)),
  ];

  for (const cfg of orderedProviders) {
    const apiKey = getApiKey(env, cfg.name);
    if (!apiKey) continue;

    const modelForProvider = cfg.models.includes(requestedModel)
      ? requestedModel
      : (defaultModelByProvider[cfg.name] || cfg.models[0] || requestedModel);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    };

    if (cfg.name === 'openrouter') {
      headers['HTTP-Referer'] = 'https://zenbrowsers.org';
      headers['X-Title'] = 'ZENO Page Agent';
    }

    try {
      const resp = await fetch(cfg.endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({ ...body, model: modelForProvider }),
        signal: AbortSignal.timeout(60_000),
      });

      if (!resp.ok) {
        const errText = await resp.text();
        attempted.push(`${cfg.name}(${modelForProvider}) -> ${resp.status}: ${errText.slice(0, 200)}`);
        continue;
      }

      if (isStream) {
        responseHeaders['Content-Type'] = 'text/event-stream';
        responseHeaders['Cache-Control'] = 'no-cache';
        responseHeaders['X-Zeno-Provider'] = cfg.name;
        return new Response(resp.body, { status: resp.status, headers: responseHeaders });
      }

      responseHeaders['Content-Type'] = 'application/json';
      responseHeaders['X-Zeno-Provider'] = cfg.name;
      const data = await resp.text();
      return new Response(data, { status: resp.status, headers: responseHeaders });
    } catch (err: any) {
      attempted.push(`${cfg.name}(${modelForProvider}) -> network_error: ${err?.message || 'unknown error'}`);
    }
  }

  return new Response(JSON.stringify({
    error: {
      message: 'All OpenAI-compatible providers failed for page-agent request',
      type: 'server_error',
      attempted,
    },
  }), {
    status: 502,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}

interface AnthropicContentBlock {
  type: 'text' | 'tool_use';
  text?: string;
  id?: string;
  name?: string;
  input?: unknown;
}

interface AnthropicResponse {
  stop_reason: 'end_turn' | 'tool_use' | string;
  content: AnthropicContentBlock[];
  model: string;
  usage?: { input_tokens: number; output_tokens: number };
}

async function handleToolChat(request: Request, env: Env): Promise<Response> {
  const body = (await request.json()) as ChatRequest & { messages?: { role: string; content: string }[] };

  const anthropicKey = env.ANTHROPIC_API_KEY;
  if (!anthropicKey) return errorResponse('Anthropic API key required for tool use', 503);

  // Prefer high model for tool use; fall back to sonnet
  const model = body.model && body.model.includes('opus')
    ? body.model
    : 'claude-opus-4-6-20251101';

  // Build messages array (skip system role — goes into `system` param)
  const messages: { role: string; content: unknown }[] = [];
  if (body.messages) {
    for (const m of body.messages) {
      if (m.role !== 'system') messages.push({ role: m.role, content: m.content });
    }
  }
  if (messages.length === 0 || messages[messages.length - 1]?.role !== 'user') {
    messages.push({ role: 'user', content: body.prompt });
  }

  const systemPrompt = body.systemPrompt || '';
  const toolTrace: { tool: string; input: Record<string, unknown>; result: string }[] = [];

  // Tool use loop — max 6 iterations
  for (let iter = 0; iter < 6; iter++) {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': anthropicKey,
        'anthropic-version': '2024-10-22',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: body.maxTokens || 4096,
        ...(systemPrompt ? { system: systemPrompt } : {}),
        messages,
        tools: BUCH_TOOLS,
      }),
      signal: AbortSignal.timeout(60000),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      return errorResponse(`Anthropic error ${resp.status}: ${errText.slice(0, 300)}`, 502);
    }

    const data = (await resp.json()) as AnthropicResponse;

    if (data.stop_reason === 'end_turn') {
      const textBlock = data.content.find(c => c.type === 'text');
      return jsonResponse({
        id: crypto.randomUUID(),
        provider: 'anthropic',
        model: data.model,
        content: textBlock?.text ?? '',
        toolTrace,
        tokens: {
          input: data.usage?.input_tokens ?? 0,
          output: data.usage?.output_tokens ?? 0,
          total: (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0),
        },
        timestamp: new Date().toISOString(),
      });
    }

    if (data.stop_reason === 'tool_use') {
      // Push assistant message with tool_use blocks
      messages.push({ role: 'assistant', content: data.content });

      // Execute each tool and collect results
      const toolResults: { type: 'tool_result'; tool_use_id: string; content: string }[] = [];
      for (const block of data.content) {
        if (block.type === 'tool_use' && block.id && block.name) {
          const toolInput = (block.input ?? {}) as Record<string, unknown>;
          const result = await executeTool(block.name, toolInput, env);
          toolTrace.push({ tool: block.name, input: toolInput, result: result.slice(0, 300) });
          toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: result });
        }
      }
      messages.push({ role: 'user', content: toolResults });
    } else {
      // Unexpected stop reason — return whatever we have
      const textBlock = data.content.find(c => c.type === 'text');
      return jsonResponse({
        id: crypto.randomUUID(),
        provider: 'anthropic',
        model: data.model,
        content: textBlock?.text ?? `[Stopped: ${data.stop_reason}]`,
        toolTrace,
        tokens: {
          input: data.usage?.input_tokens ?? 0,
          output: data.usage?.output_tokens ?? 0,
          total: (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0),
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  return errorResponse('Tool loop exceeded 6 iterations — possible infinite loop', 500);
}

export const onRequest: PagesFunction<Env> = async (context) => {
  try {
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

    case 'chat/tools':
      if (context.request.method !== 'POST') return errorResponse('POST required', 405);
      return handleToolChat(context.request, context.env);

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
  } catch (err: any) {
    return new Response(JSON.stringify({
      error: { message: `Internal server error: ${err?.message || 'unknown'}`, type: 'server_error' },
    }), { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
  }
};
