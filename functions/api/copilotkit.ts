/**
 * ZENO Browser — CopilotKit Runtime Endpoint (temporary safety fallback)
 *
 * Route: POST /api/copilotkit
 *
 * Uwaga:
 * Aktualna wersja @copilotkit/runtime (1.54.1) powoduje crash podczas publikacji
 * Cloudflare Pages Functions (node:module createRequire / path undefined).
 *
 * Ten fallback utrzymuje stabilny deploy produkcyjny. Docelowo endpoint zostanie
 * przywrócony po migracji do edge-kompatybilnej ścieżki runtime.
 */

/// <reference types="@cloudflare/workers-types" />

import type { Env } from '../types';

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const origin = context.request.headers.get('Origin') ?? '*';
  const headers = new Headers({
    'Content-Type': 'application/json',
  });
  headers.set('Access-Control-Allow-Origin', origin);
  headers.set('Access-Control-Allow-Credentials', 'true');

  return new Response(
    JSON.stringify({
      error: 'CopilotKit endpoint tymczasowo wyłączony na środowisku Cloudflare Pages (stabilizacja deploy).',
      code: 'COPILOTKIT_EDGE_TEMP_DISABLED',
    }),
    { status: 503, headers },
  ) as unknown as Response;
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
