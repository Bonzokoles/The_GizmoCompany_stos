/**
 * ZENO Browser — MCP Server
 *
 * Narzędzia dostępne dla Claude Desktop / Cursor / Claude Code:
 *   • zeno_project_info     — opis projektu, tech stack, architektura
 *   • query_zeno_db         — read-only SQL na zeno-browser-db (D1)
 *   • search_knowledge_base — szukaj wpisów w knowledge base
 *   • list_api_endpoints    — lista dostępnych CF Functions endpoints
 *   • ask_ai                — zapytaj AI (OpenRouter) z kontekstem ZENO
 */

import { McpAgent } from 'agents/mcp';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

export interface Env {
  DB: D1Database;
  MCP_DO: DurableObjectNamespace;
  OPENROUTER_API_KEY?: string;
  CF_ACCOUNT_ID?: string;
  CF_API_TOKEN?: string;
}

// ─── Forbidden SQL mutations ─────────────────────────────────
const FORBIDDEN_SQL =
  /\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE|REPLACE|GRANT|REVOKE)\b/i;

// ─── Static project context ──────────────────────────────────
const PROJECT_CONTEXT = `
ZENO Browser — projekt (WWW_Zen_BRo_wser_org3)

## Tech Stack
- Frontend: React 18 + Vite + TypeScript + Tailwind CSS
- Hosting: Cloudflare Pages (zenbrowsers.org)
- Backend: Cloudflare Functions (workers in /functions/api/)
- Database: D1 (zeno-browser-db) — browser history, knowledge base, sessions
- AI: CopilotKit sidebar (wyłączony), PageAgent (Alibaba/Midscene), OpenRouter API
- Agenci: midscene-page-agent (DOM automation, przycisk 🤖), MCP server (ten)

## Kluczowe pliki
- src/App.tsx                    — root, CopilotKit wrapper + CopilotSidebar
- src/components/landing/WebLanding.tsx  — strona główna z PageAgent
- src/components/browser-core/BrowserUI.tsx — core browser (Electron)
- functions/api/copilotkit.ts    — endpoint wyłączony (CF edge crash)
- workers/jimbo-gateway/         — REST bridge AI/D1/R2/KV
- workers/zeno-mcp/              — ten MCP server

## Cloudflare Workers
- zeno-browser-web  (Pages)      — główna SPA
- jimbo-gateway                  — AI gateway + D1/R2
- mybonzo-ai-workflow             — content pipeline
- queue-consumer                 — worker kolejki
- zeno-mcp                       — ten MCP server

## Dostępne API endpoints (CF Functions)
- POST /api/copilotkit            — WYŁĄCZONY (503)
- POST /api/ai/v1/*               — OpenAI-compat proxy (PageAgent)
- GET  /api/db/*                  — D1 database explorer
- GET  /api/search/*              — wyszukiwarka
- POST /api/crawlers/*            — web crawlers
- GET  /api/workers/*             — workers management
`.trim();

// ─── ZENO MCP Agent ──────────────────────────────────────────
export class ZenoMCP extends McpAgent<Env> {
  server = new McpServer({ name: 'zeno-browser-mcp', version: '1.0.0' });

  async init() {
    // ── Tool 1: Project info ────────────────────────────────
    this.server.tool(
      'zeno_project_info',
      'Zwraca ogólne informacje o projekcie ZENO Browser: tech stack, architektura, kluczowe pliki i komponenty.',
      {},
      async () => ({
        content: [{ type: 'text', text: PROJECT_CONTEXT }],
      }),
    );

    // ── Tool 2: Query D1 database (read-only) ──────────────
    this.server.tool(
      'query_zeno_db',
      'Wykonaj read-only zapytanie SQL na bazie danych zeno-browser-db (D1). Tylko SELECT — mutacje są zablokowane.',
      {
        sql: z.string().min(5).max(2000).describe('Zapytanie SELECT SQL'),
        params: z
          .array(z.union([z.string(), z.number(), z.null()]))
          .optional()
          .describe('Opcjonalne parametry bindowania (?1, ?2, ...)'),
      },
      async ({ sql, params }) => {
        if (FORBIDDEN_SQL.test(sql)) {
          return {
            content: [
              {
                type: 'text',
                text: 'Błąd: dozwolone są tylko zapytania SELECT (read-only).',
              },
            ],
            isError: true,
          };
        }

        try {
          const stmt = this.env.DB.prepare(sql);
          const result = params?.length
            ? await stmt.bind(...params).all()
            : await stmt.all();

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    rows: result.results,
                    meta: {
                      rows_read: result.meta?.rows_read ?? result.results.length,
                      duration_ms: result.meta?.duration ?? null,
                    },
                  },
                  null,
                  2,
                ),
              },
            ],
          };
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          return {
            content: [{ type: 'text', text: `Błąd SQL: ${msg}` }],
            isError: true,
          };
        }
      },
    );

    // ── Tool 3: Search knowledge base ─────────────────────
    this.server.tool(
      'search_knowledge_base',
      'Przeszukaj knowledge base ZENO (tabela kb_entries lub crawler_results w D1) po frazie lub URL.',
      {
        query: z.string().min(2).max(200).describe('Fraza do wyszukania'),
        limit: z
          .number()
          .int()
          .min(1)
          .max(50)
          .default(10)
          .describe('Maksymalna liczba wyników (domyślnie 10)'),
      },
      async ({ query, limit }) => {
        // Sanitize: query is used as a parameter, not concatenated
        const safeQuery = `%${query}%`;

        // Try multiple possible table names (schema may vary)
        const queries = [
          `SELECT url, title, summary, created_at FROM kb_entries
           WHERE title LIKE ?1 OR summary LIKE ?1 OR url LIKE ?1
           ORDER BY created_at DESC LIMIT ?2`,
          `SELECT url, title, content, crawled_at FROM crawler_results
           WHERE title LIKE ?1 OR content LIKE ?1 OR url LIKE ?1
           ORDER BY crawled_at DESC LIMIT ?2`,
          `SELECT url, title, body, ts FROM knowledge_base
           WHERE title LIKE ?1 OR body LIKE ?1
           ORDER BY ts DESC LIMIT ?2`,
        ];

        for (const sql of queries) {
          try {
            const result = await this.env.DB.prepare(sql).bind(safeQuery, limit).all();
            if (result.results.length > 0 || result.error == null) {
              return {
                content: [
                  {
                    type: 'text',
                    text: JSON.stringify(
                      { query, count: result.results.length, results: result.results },
                      null,
                      2,
                    ),
                  },
                ],
              };
            }
          } catch {
            // Try next table
            continue;
          }
        }

        return {
          content: [
            {
              type: 'text',
              text: `Brak wyników dla "${query}" — tabela knowledge base może być pusta lub mieć inną nazwę. Użyj query_zeno_db z "SELECT name FROM sqlite_master WHERE type='table'" żeby sprawdzić schemat.`,
            },
          ],
        };
      },
    );

    // ── Tool 4: List API endpoints ─────────────────────────
    this.server.tool(
      'list_api_endpoints',
      'Listuje wszystkie dostępne CF Pages Functions endpoints projektu ZENO Browser.',
      {
        category: z
          .enum(['all', 'ai', 'db', 'workers', 'crawlers', 'storage', 'other'])
          .default('all')
          .describe('Kategoria endpointów do wyświetlenia'),
      },
      async ({ category }) => {
        const endpoints: Record<string, { method: string; path: string; description: string; status: string }[]> = {
          ai: [
            { method: 'POST', path: '/api/ai/v1/chat/completions', description: 'OpenAI-compat proxy (PageAgent)', status: 'active' },
            { method: 'POST', path: '/api/copilotkit', description: 'CopilotKit runtime', status: 'DISABLED (503)' },
            { method: 'POST', path: '/api/moa/generate', description: 'Mixture-of-Agents pipeline', status: 'active' },
            { method: 'POST', path: '/api/pipelines/ingest', description: 'AI data ingest pipeline', status: 'active' },
          ],
          db: [
            { method: 'GET',  path: '/api/db/databases', description: 'Lista baz D1', status: 'active' },
            { method: 'GET',  path: '/api/db/tables/:dbId', description: 'Tabele w bazie', status: 'active' },
            { method: 'POST', path: '/api/db/query/:dbId', description: 'Read-only SQL query', status: 'active' },
          ],
          workers: [
            { method: 'GET',  path: '/api/workers/list', description: 'Lista Workers', status: 'active' },
            { method: 'GET',  path: '/api/workers/status/:name', description: 'Status workera', status: 'active' },
          ],
          crawlers: [
            { method: 'POST', path: '/api/crawlers/start', description: 'Uruchom crawler', status: 'active' },
            { method: 'GET',  path: '/api/crawlers/status', description: 'Status crawlerów', status: 'active' },
          ],
          storage: [
            { method: 'GET',  path: '/api/storage/list', description: 'Lista plików R2', status: 'active' },
            { method: 'POST', path: '/api/storage/upload', description: 'Upload do R2', status: 'active' },
          ],
          other: [
            { method: 'GET',  path: '/api/analytics/stats', description: 'Statystyki Plausible', status: 'active' },
            { method: 'GET',  path: '/api/search/query', description: 'Wyszukiwarka treści', status: 'active' },
            { method: 'GET',  path: '/api/render/og', description: 'OG image renderer', status: 'active' },
          ],
        };

        const selected =
          category === 'all'
            ? Object.values(endpoints).flat()
            : (endpoints[category] ?? []);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                { category, count: selected.length, endpoints: selected },
                null,
                2,
              ),
            },
          ],
        };
      },
    );

    // ── Tool 5: Ask AI with ZENO context ──────────────────
    this.server.tool(
      'ask_ai',
      'Zadaj pytanie modelowi AI (OpenRouter) z kontekstem projektu ZENO Browser. Wymaga ustawionego sekretu OPENROUTER_API_KEY.',
      {
        question: z.string().min(5).max(1000).describe('Pytanie do AI'),
        model: z
          .enum([
            'deepseek/deepseek-chat',
            'anthropic/claude-3-5-sonnet',
            'openai/gpt-4o',
            'google/gemini-flash-1.5',
          ])
          .default('deepseek/deepseek-chat')
          .describe('Model AI (domyślnie DeepSeek — najtańszy)'),
      },
      async ({ question, model }) => {
        if (!this.env.OPENROUTER_API_KEY) {
          return {
            content: [
              {
                type: 'text',
                text: 'Brak sekretu OPENROUTER_API_KEY. Ustaw: wrangler secret put OPENROUTER_API_KEY',
              },
            ],
            isError: true,
          };
        }

        const systemPrompt = `Jesteś asystentem deweloperskim projektu ZENO Browser.
Kontekst projektu:
${PROJECT_CONTEXT}

Odpowiadaj po polsku, chyba że pytanie jest po angielsku.`;

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.env.OPENROUTER_API_KEY}`,
            'HTTP-Referer': 'https://zenbrowsers.org',
            'X-Title': 'ZENO Browser MCP',
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: question },
            ],
            max_tokens: 800,
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          return {
            content: [{ type: 'text', text: `OpenRouter error ${response.status}: ${errText}` }],
            isError: true,
          };
        }

        const data = (await response.json()) as {
          choices: Array<{ message: { content: string } }>;
        };
        const answer = data.choices?.[0]?.message?.content ?? '(brak odpowiedzi)';

        return { content: [{ type: 'text', text: answer }] };
      },
    );
  }
}
