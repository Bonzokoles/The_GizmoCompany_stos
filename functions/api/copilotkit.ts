/**
 * ZENO Browser — CopilotKit Runtime Endpoint
 *
 * Route: POST /api/copilotkit
 *
 * Kolejność adapterów AI:
 *   1. AnthropicAdapter  (ANTHROPIC_API_KEY) — najwyższa jakość
 *   2. OpenAIAdapter     (OPENROUTER_API_KEY, model claude-sonnet-4) — fallback
 *   3. OpenAIAdapter     (DEEPSEEK_API_KEY)  — najtańszy fallback
 *
 * Secrets (ustaw przez: wrangler secret put <NAME>):
 *   ANTHROPIC_API_KEY
 *   OPENROUTER_API_KEY
 *   DEEPSEEK_API_KEY
 */

/// <reference types="@cloudflare/workers-types" />

import {
  CopilotRuntime,
  AnthropicAdapter,
  OpenAIAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from '@copilotkit/runtime';
import type { Env } from '../types';

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  let serviceAdapter: AnthropicAdapter | OpenAIAdapter;

  if (env.ANTHROPIC_API_KEY) {
    serviceAdapter = new AnthropicAdapter({
      model: 'claude-sonnet-4-20250514',
    } as ConstructorParameters<typeof AnthropicAdapter>[0]);
    // Anthropic SDK pobierze klucz z process.env lub z explicit passing
    // Wstrzykujemy przez process.env żeby uniknąć konieczności tworzenia instancji SDK
    (globalThis as Record<string, unknown>).ANTHROPIC_API_KEY = env.ANTHROPIC_API_KEY;
  } else if (env.OPENROUTER_API_KEY) {
    serviceAdapter = new OpenAIAdapter({
      apiKey: env.OPENROUTER_API_KEY,
      model: 'anthropic/claude-sonnet-4',
      baseURL: 'https://openrouter.ai/api/v1',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
  } else if (env.DEEPSEEK_API_KEY) {
    serviceAdapter = new OpenAIAdapter({
      apiKey: env.DEEPSEEK_API_KEY,
      model: 'deepseek-chat',
      baseURL: 'https://api.deepseek.com/v1',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
  } else {
    return new Response(
      JSON.stringify({ error: 'Brak klucza API: ustaw ANTHROPIC_API_KEY, OPENROUTER_API_KEY lub DEEPSEEK_API_KEY' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } },
    ) as unknown as Response;
  }

  const runtime = new CopilotRuntime();

  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime,
    serviceAdapter,
    endpoint: '/api/copilotkit',
  });

  const origin = request.headers.get('Origin') ?? '*';
  const response = await handleRequest(request as unknown as Request);

  const headers = new Headers(response.headers);
  headers.set('Access-Control-Allow-Origin', origin);
  headers.set('Access-Control-Allow-Credentials', 'true');

  return new Response(response.body, { status: response.status, headers }) as unknown as Response;
};

export const onRequestOptions: PagesFunction = async (context) => {
  const origin = context.request.headers.get('Origin') ?? '*';
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  }) as unknown as Response;
};
