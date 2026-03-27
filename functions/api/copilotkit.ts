/**
 * ZENO Browser — CopilotKit Runtime Endpoint
 *
 * Route: /api/copilotkit  (GET info / POST run / OPTIONS CORS)
 *
 * Używa @copilotkitnext/runtime + BuiltInAgent bezpośrednio
 * (CF Pages edge-kompatybilne: bez type-graphql / reflect-metadata / node:module)
 *
 * Model domyślny: OpenRouter → deepseek/deepseek-r1-0528:free
 * Fallback:       OpenRouter → google/gemma-3-27b-it:free
 */

/// <reference types="@cloudflare/workers-types" />

import { BuiltInAgent } from '@copilotkitnext/agent';
import { CopilotRuntime, createCopilotEndpointSingleRoute } from '@copilotkitnext/runtime';
import { createOpenAI } from '@ai-sdk/openai';
import type { Env } from '../types';

// ─── Build Hono app per request (stateless, edge-safe) ────────
function buildApp(env: Env) {
  const apiKey = env.OPENROUTER_API_KEY ?? '';

  if (!apiKey) {
    throw new Error('Brak OPENROUTER_API_KEY w środowisku Cloudflare.');
  }

  const openrouter = createOpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey,
  });

  const agent = new BuiltInAgent({
    model: openrouter('deepseek/deepseek-r1-0528:free'),
    maxSteps: 5,
    temperature: 0.7,
  });

  const runtime = new CopilotRuntime({
    agents: {
      default: agent,
    },
  });

  return createCopilotEndpointSingleRoute({
    runtime,
    basePath: '/api/copilotkit',
  });
}

// ─── CF Pages Functions handlers ─────────────────────────────
export const onRequest: PagesFunction<Env> = async (context) => {
  const app = buildApp(context.env);
  return app.fetch(context.request) as unknown as Response;
};
