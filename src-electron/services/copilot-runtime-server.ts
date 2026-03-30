/**
 * ZENO Browser — lokalny CopilotKit runtime server
 *
 * Używany WYŁĄCZNIE przez wersję Electron (lokalna aplikacja).
 * Nasłuchuje na http://localhost:4111/api/copilotkit
 *
 * Model: OpenRouter → deepseek/deepseek-r1-0528:free
 * Fallback: google/gemma-3-27b-it:free
 */

import 'reflect-metadata';
import http from 'http';
import { CopilotRuntime, OpenAIAdapter, copilotRuntimeNodeHttpEndpoint } from '@copilotkit/runtime';
import OpenAI from 'openai';

const COPILOTKIT_PORT = 4111;
const COPILOTKIT_BASE = '/api/copilotkit';

export class CopilotRuntimeServer {
  private server: http.Server | null = null;

  start(openrouterApiKey: string): void {
    if (this.server) return;

    const openrouter = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: openrouterApiKey,
      defaultHeaders: {
        'HTTP-Referer': 'https://zenbrowsers.org',
        'X-Title': 'ZENO Browser',
      },
    });

    const runtime = new CopilotRuntime();

    const serviceAdapter = new OpenAIAdapter({
      // openai@6 (root) vs openai@4 (copilotkit nested) — type-only mismatch, runtime API compatible
      openai: openrouter as any,
      model: 'deepseek/deepseek-r1-0528:free',
    });

    const handler = copilotRuntimeNodeHttpEndpoint({
      endpoint: COPILOTKIT_BASE,
      runtime,
      serviceAdapter,
    });

    this.server = http.createServer(handler);

    this.server.listen(COPILOTKIT_PORT, '127.0.0.1', () => {
      console.log(`✅ CopilotKit runtime listening on http://127.0.0.1:${COPILOTKIT_PORT}${COPILOTKIT_BASE}`);
    });

    this.server.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        console.warn(`⚠️ CopilotKit port ${COPILOTKIT_PORT} już zajęty — pomijam uruchomienie.`);
      } else {
        console.error('CopilotKit server error:', err.message);
      }
    });
  }

  stop(): void {
    if (this.server) {
      this.server.close();
      this.server = null;
    }
  }
}
