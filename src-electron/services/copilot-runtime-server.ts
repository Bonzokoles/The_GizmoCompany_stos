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
import * as http from 'http';
import { randomUUID } from 'crypto';
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

    const copilotHandler = copilotRuntimeNodeHttpEndpoint({
      endpoint: COPILOTKIT_BASE,
      runtime,
      serviceAdapter,
    });

    this.server = http.createServer((req, res) => {
      const url = new URL(req.url ?? '/', `http://127.0.0.1:${COPILOTKIT_PORT}`);

      // Health check endpoints
      if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/health')) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'ok',
          service: 'copilotkit-runtime',
          endpoint: COPILOTKIT_BASE,
          method: 'POST',
          url: `http://127.0.0.1:${COPILOTKIT_PORT}${COPILOTKIT_BASE}`,
        }));
        return;
      }

      // Jimbo Kit openbotx-compatible endpoint
      if (req.method === 'POST' && url.pathname === '/api/chat') {
        let body = '';
        req.on('data', (chunk) => { body += chunk.toString(); });
        req.on('end', async () => {
          try {
            const { message, session_id } = JSON.parse(body) as { message: string; session_id: string };
            
            // Simple chat completion via OpenRouter
            const response = await openrouter.chat.completions.create({
              model: 'deepseek/deepseek-r1-0528:free',
              messages: [{ role: 'user', content: message }],
              max_tokens: 1024,
            });

            const content = response.choices[0]?.message?.content ?? 'Brak odpowiedzi';
            const task_id = randomUUID();

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ task_id, session_id, content }));
          } catch (err) {
            console.error('/api/chat error:', err);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Chat request failed' }));
          }
        });
        return;
      }

      // WebGate fetch endpoint — terminal /fetch command
      if (req.method === 'POST' && url.pathname === '/api/webgate/fetch') {
        let body = '';
        req.on('data', (chunk) => { body += chunk.toString(); });
        req.on('end', async () => {
          try {
            const { url: targetUrl } = JSON.parse(body) as { url: string };
            
            // Fetch URL content (using built-in fetch)
            const fetchRes = await fetch(targetUrl, {
              headers: { 'User-Agent': 'ZENO-Browser-Terminal/1.0' },
              signal: AbortSignal.timeout(10000), // 10s timeout
            });

            if (!fetchRes.ok) {
              throw new Error(`HTTP ${fetchRes.status} ${fetchRes.statusText}`);
            }

            const content = await fetchRes.text();
            const contentType = fetchRes.headers.get('content-type') || 'text/plain';

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ content, contentType, status: fetchRes.status }));
          } catch (err) {
            console.error('/api/webgate/fetch error:', err);
            const msg = err instanceof Error ? err.message : String(err);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: msg }));
          }
        });
        return;
      }

      // Sessions endpoints (stub - openbotx compatibility)
      if (req.method === 'GET' && url.pathname === '/api/chat/sessions') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify([])); // Empty sessions list for now
        return;
      }

      // Default: CopilotKit handler
      copilotHandler(req, res);
    });

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
