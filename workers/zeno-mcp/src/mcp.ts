/**
 * ZENO Browser — MCP Server (Remote, Cloudflare Worker)
 *
 * Grupy narzędzi:
 *   CF Resources  — CF API: workers, D1, R2, KV (via CF_API_TOKEN)
 *   ZENO API      — proxy do CF Functions /api/*
 *   Workers AI    — Cloudflare AI (tekst, embeddingi)
 *   JIMBO Gateway — jimbo-gateway Worker REST API
 *   ZENO Context  — info o projekcie, endpointy, schemat D1
 */

import { McpAgent } from 'agents/mcp';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

export interface Env {
  DB: D1Database;
  AI: Ai;
  STATIC_ASSETS: R2Bucket;
  MCP_OBJECT: DurableObjectNamespace;
  OPENROUTER_API_KEY?: string;
  CF_ACCOUNT_ID?: string;
  CF_API_TOKEN?: string;
  JIMBO_GATEWAY_URL?: string; // https://jimbo-gateway.<account>.workers.dev
  ZENO_ORIGIN?: string;       // https://zenbrowsers.org (lub Pages preview URL)
}

// ─── Helpers ────────────────────────────────────────────────

const FORBIDDEN_SQL =
  /\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE|REPLACE|GRANT|REVOKE)\b/i;

function cfHeaders(env: Env): Record<string, string> {
  return {
    'Authorization': `Bearer ${env.CF_API_TOKEN ?? ''}`,
    'Content-Type': 'application/json',
  };
}

function zenoBase(env: Env): string {
  return (env.ZENO_ORIGIN ?? 'https://zenbrowsers.org').replace(/\/$/, '');
}

function jimboBase(env: Env): string {
  return (env.JIMBO_GATEWAY_URL ?? '').replace(/\/$/, '');
}

async function cfFetch(url: string, env: Env, init?: RequestInit): Promise<unknown> {
  const res = await fetch(url, { ...init, headers: { ...cfHeaders(env), ...(init?.headers as Record<string, string> ?? {}) } });
  if (!res.ok) throw new Error(`CF API ${res.status}: ${await res.text()}`);
  return res.json();
}

function ok(text: string) {
  return { content: [{ type: 'text' as const, text }] };
}
function err(msg: string) {
  return { content: [{ type: 'text' as const, text: `❌ ${msg}` }], isError: true as const };
}

// ─── Static context ──────────────────────────────────────────

const ZENO_CONTEXT = `
# ZENO Browser — ekosystem

## Stos technologiczny
- **Frontend**: Electron 27 + React 18 + Vite + TypeScript
- **Hosting**: Cloudflare Pages (zenbrowsers.org)
- **CF Functions**: /functions/api/ — AI, D1, R2, Queues, Crawlers, MOA
- **Bazy D1**: zeno-browser-db (główna), buch_knowledge_v2 (wiedza BUCH)
- **R2**: zen-static-assets, mybonzo-media, bonzo-media-hub, ...
- **Kolejki**: agent-tasks, image-generation-queue, image-processing-queue, voice-processing
- **AI**: Cloudflare Workers AI + OpenRouter + Anthropic Claude + Gemini

## Lokalne serwisy (localhost)
- :4224 JIMBO Agent HUB — skills, memory, Goose tasks
- :5173 Vite dev server — ZENO Browser frontend
- :5180 BUCH_CHAT — Python AI assistant (FastAPI)
- :7700 Meilisearch — full-text search
- :8085 sist2 — document indexer
- :8088 Superset — BI dashboard
- :8100 Plausible — analytics CE
- :8788 Wrangler — CF bindings local
- :8888 Websurfx — meta-search
- :4100 Mydia — media manager
- :4112 PHILO — philosopher assistant
- :5183 Umami — analytics

## CF Workers
- zeno-browser-web    — Pages SPA (zenbrowsers.org)
- jimbo-gateway       — AI/D1/R2/KV REST bridge
- mybonzo-ai-workflow — content pipeline
- queue-consumer      — kolejkowy worker
- zeno-mcp            — ten MCP server

## Kluczowe pliki
- JIMBO_agent_HUB/hub-server.ts  — HUB REST+WS (port 4224)
- src/components/assistant/      — AgentHubPanel, BuchChatWidget, SkillGraphPanel
- functions/api/ai/[[path]].ts   — główna AI Function (chat, tools, MOA, stream)
- workers/jimbo-gateway/         — CF Worker bridge
`.trim();

// ─── ZENO MCP Agent ──────────────────────────────────────────
export class ZenoMCPv2 extends McpAgent<Env> {
  server = new McpServer({ name: 'zeno-browser-mcp', version: '2.0.0' });

  async init() {

    // ════════════════════════════════════════════════════════
    // GROUP 1 — ZENO CONTEXT
    // ════════════════════════════════════════════════════════

    this.server.tool(
      'zeno_project_info',
      'Zwraca pełny opis ekosystemu ZENO Browser: stack, serwisy, workery, D1, R2, kolejki.',
      {},
      async () => ok(ZENO_CONTEXT),
    );

    this.server.tool(
      'zeno_db_schema',
      'Zwraca schemat tabel w bazie D1 zeno-browser-db (sqlite_master).',
      {},
      async () => {
        try {
          const result = await this.env.DB
            .prepare("SELECT type, name, sql FROM sqlite_master WHERE type IN ('table','view') ORDER BY type, name")
            .all();
          return ok(JSON.stringify(result.results, null, 2));
        } catch (e) {
          return err(String(e));
        }
      },
    );

    // ════════════════════════════════════════════════════════
    // GROUP 2 — D1 DATABASE
    // ════════════════════════════════════════════════════════

    this.server.tool(
      'zeno_db_query',
      'Wykonaj read-only zapytanie SQL na zeno-browser-db (D1). Tylko SELECT.',
      {
        sql: z.string().min(5).max(3000).describe('Zapytanie SELECT SQL'),
        params: z.array(z.union([z.string(), z.number(), z.null()])).optional()
          .describe('Parametry bindowania (?1, ?2, ...)'),
        limit: z.number().int().min(1).max(500).default(100).describe('Limit wierszy (domyślnie 100)'),
      },
      async ({ sql, params, limit }) => {
        if (FORBIDDEN_SQL.test(sql))
          return err('Tylko SELECT — mutacje zablokowane.');
        const safeSql = sql.replace(/\bLIMIT\s+\d+/i, '').trimEnd() + ` LIMIT ${limit}`;
        try {
          const stmt = this.env.DB.prepare(safeSql);
          const result = params?.length ? await stmt.bind(...params).all() : await stmt.all();
          return ok(JSON.stringify({ rows: result.results, meta: { count: result.results.length, duration_ms: result.meta?.duration } }, null, 2));
        } catch (e) {
          return err(`SQL error: ${e}`);
        }
      },
    );

    this.server.tool(
      'zeno_kb_search',
      'Szukaj w knowledge base ZENO (tabela kb_entries / crawler_results / buch_knowledge_v2 w D1).',
      {
        query: z.string().min(2).max(300).describe('Fraza lub słowo kluczowe'),
        limit: z.number().int().min(1).max(50).default(10),
      },
      async ({ query, limit }) => {
        const like = `%${query}%`;
        const candidates = [
          `SELECT url, title, summary AS content, created_at FROM kb_entries WHERE title LIKE ?1 OR summary LIKE ?1 ORDER BY created_at DESC LIMIT ?2`,
          `SELECT url, title, content, crawled_at AS created_at FROM crawler_results WHERE title LIKE ?1 OR content LIKE ?1 ORDER BY crawled_at DESC LIMIT ?2`,
          `SELECT key AS url, value AS content, updated_at AS created_at FROM admin_storage WHERE key LIKE ?1 OR value LIKE ?1 ORDER BY updated_at DESC LIMIT ?2`,
        ];
        for (const sql of candidates) {
          try {
            const r = await this.env.DB.prepare(sql).bind(like, limit).all();
            if (r.results.length > 0)
              return ok(JSON.stringify({ query, count: r.results.length, results: r.results }, null, 2));
          } catch { continue; }
        }
        return ok(`Brak wyników dla "${query}". Spróbuj zeno_db_schema żeby sprawdzić tabele.`);
      },
    );

    // ════════════════════════════════════════════════════════
    // GROUP 3 — R2 STORAGE
    // ════════════════════════════════════════════════════════

    this.server.tool(
      'r2_list_files',
      'Listuj pliki w R2 bucket zen-static-assets (dostępnym bezpośrednio przez binding).',
      {
        prefix: z.string().default('').describe('Prefix ścieżki (opcjonalny)'),
        limit: z.number().int().min(1).max(200).default(50),
      },
      async ({ prefix, limit }) => {
        try {
          const result = await this.env.STATIC_ASSETS.list({ prefix: prefix || undefined, limit });
          const files = result.objects.map(o => ({ key: o.key, size: o.size, modified: o.uploaded }));
          return ok(JSON.stringify({ prefix, count: files.length, files }, null, 2));
        } catch (e) {
          return err(`R2 list error: ${e}`);
        }
      },
    );

    this.server.tool(
      'r2_read_file',
      'Odczytaj zawartość pliku tekstowego z R2 (zen-static-assets). Max 50KB.',
      {
        key: z.string().min(1).describe('Ścieżka/klucz pliku w R2'),
      },
      async ({ key }) => {
        try {
          const obj = await this.env.STATIC_ASSETS.get(key);
          if (!obj) return err(`Plik "${key}" nie istnieje.`);
          const text = await obj.text();
          return ok(text.slice(0, 50000));
        } catch (e) {
          return err(`R2 read error: ${e}`);
        }
      },
    );

    // ════════════════════════════════════════════════════════
    // GROUP 4 — CLOUDFLARE API (Workers, D1 list, R2 list)
    // ════════════════════════════════════════════════════════

    this.server.tool(
      'cf_workers_list',
      'Listuj wszystkie Cloudflare Workers w koncie (wymaga CF_ACCOUNT_ID + CF_API_TOKEN).',
      {},
      async () => {
        if (!this.env.CF_ACCOUNT_ID || !this.env.CF_API_TOKEN)
          return err('Brak CF_ACCOUNT_ID lub CF_API_TOKEN. Ustaw przez: wrangler secret put ...');
        try {
          const data = await cfFetch(
            `https://api.cloudflare.com/client/v4/accounts/${this.env.CF_ACCOUNT_ID}/workers/scripts`,
            this.env,
          ) as { result: { id: string; modified_on: string; usage_model?: string }[] };
          const workers = data.result.map(w => ({ id: w.id, modified: w.modified_on, model: w.usage_model }));
          return ok(JSON.stringify({ count: workers.length, workers }, null, 2));
        } catch (e) {
          return err(String(e));
        }
      },
    );

    this.server.tool(
      'cf_d1_list',
      'Listuj wszystkie bazy D1 w koncie Cloudflare.',
      {},
      async () => {
        if (!this.env.CF_ACCOUNT_ID || !this.env.CF_API_TOKEN)
          return err('Brak CF_ACCOUNT_ID lub CF_API_TOKEN.');
        try {
          const data = await cfFetch(
            `https://api.cloudflare.com/client/v4/accounts/${this.env.CF_ACCOUNT_ID}/d1/database?per_page=100`,
            this.env,
          ) as { result: { uuid: string; name: string; num_tables?: number; file_size?: number }[] };
          return ok(JSON.stringify({ count: data.result.length, databases: data.result }, null, 2));
        } catch (e) {
          return err(String(e));
        }
      },
    );

    this.server.tool(
      'cf_d1_query',
      'Wykonaj read-only SQL na dowolnej bazie D1 (via CF API). Wymaga CF_ACCOUNT_ID + CF_API_TOKEN.',
      {
        database_id: z.string().describe('UUID bazy D1 (z cf_d1_list)'),
        sql: z.string().min(5).max(2000).describe('Zapytanie SELECT SQL'),
      },
      async ({ database_id, sql }) => {
        if (FORBIDDEN_SQL.test(sql)) return err('Tylko SELECT.');
        if (!this.env.CF_ACCOUNT_ID || !this.env.CF_API_TOKEN)
          return err('Brak CF_ACCOUNT_ID lub CF_API_TOKEN.');
        try {
          const data = await cfFetch(
            `https://api.cloudflare.com/client/v4/accounts/${this.env.CF_ACCOUNT_ID}/d1/database/${database_id}/query`,
            this.env,
            { method: 'POST', body: JSON.stringify({ sql }) },
          ) as { result: [{ results: unknown[] }] };
          return ok(JSON.stringify({ rows: data.result?.[0]?.results ?? [], database_id }, null, 2));
        } catch (e) {
          return err(String(e));
        }
      },
    );

    this.server.tool(
      'cf_r2_list_buckets',
      'Listuj wszystkie R2 buckets w koncie Cloudflare.',
      {},
      async () => {
        if (!this.env.CF_ACCOUNT_ID || !this.env.CF_API_TOKEN)
          return err('Brak CF_ACCOUNT_ID lub CF_API_TOKEN.');
        try {
          const data = await cfFetch(
            `https://api.cloudflare.com/client/v4/accounts/${this.env.CF_ACCOUNT_ID}/r2/buckets?per_page=100`,
            this.env,
          ) as { result: { name: string; creation_date: string }[] };
          return ok(JSON.stringify({ count: data.result.length, buckets: data.result }, null, 2));
        } catch (e) {
          return err(String(e));
        }
      },
    );

    this.server.tool(
      'cf_pages_list',
      'Listuj projekty Cloudflare Pages i ich ostatnie deploye.',
      {},
      async () => {
        if (!this.env.CF_ACCOUNT_ID || !this.env.CF_API_TOKEN)
          return err('Brak CF_ACCOUNT_ID lub CF_API_TOKEN.');
        try {
          const data = await cfFetch(
            `https://api.cloudflare.com/client/v4/accounts/${this.env.CF_ACCOUNT_ID}/pages/projects?per_page=25`,
            this.env,
          ) as { result: { name: string; subdomain: string; latest_deployment?: { id: string; created_on: string; environment: string; url: string } }[] };
          const projects = data.result.map(p => ({
            name: p.name,
            subdomain: p.subdomain,
            latest: p.latest_deployment ? { id: p.latest_deployment.id, env: p.latest_deployment.environment, url: p.latest_deployment.url, created: p.latest_deployment.created_on } : null,
          }));
          return ok(JSON.stringify({ count: projects.length, projects }, null, 2));
        } catch (e) {
          return err(String(e));
        }
      },
    );

    // ════════════════════════════════════════════════════════
    // GROUP 5 — WORKERS AI (Cloudflare AI binding)
    // ════════════════════════════════════════════════════════

    this.server.tool(
      'workers_ai_text',
      'Generuj tekst przez Cloudflare Workers AI (llama-3.1-8b-instruct, tanie i szybkie).',
      {
        prompt: z.string().min(1).max(2000).describe('Prompt dla modelu'),
        model: z.enum([
          '@cf/meta/llama-3.1-8b-instruct',
          '@cf/meta/llama-3.2-3b-instruct',
          '@cf/google/gemma-7b-it',
          '@cf/mistral/mistral-7b-instruct-v0.1',
        ]).default('@cf/meta/llama-3.1-8b-instruct'),
        system: z.string().optional().describe('System prompt (opcjonalny)'),
      },
      async ({ prompt, model, system }) => {
        try {
          const messages: { role: string; content: string }[] = [];
          if (system) messages.push({ role: 'system', content: system });
          messages.push({ role: 'user', content: prompt });
          const result = await this.env.AI.run(model as Parameters<typeof this.env.AI.run>[0], { messages } as Parameters<typeof this.env.AI.run>[1]) as { response?: string };
          return ok(result?.response ?? '(brak odpowiedzi)');
        } catch (e) {
          return err(`Workers AI error: ${e}`);
        }
      },
    );

    this.server.tool(
      'workers_ai_embed',
      'Generuj wektorowe embeddingi tekstu przez Cloudflare Workers AI (bge-base-en-v1.5).',
      {
        texts: z.array(z.string().max(500)).min(1).max(20).describe('Teksty do embeddowania (max 20)'),
      },
      async ({ texts }) => {
        try {
          const result = await this.env.AI.run('@cf/baai/bge-base-en-v1.5', { text: texts } as { text: string[] }) as { data: number[][] };
          return ok(JSON.stringify({
            model: '@cf/baai/bge-base-en-v1.5',
            count: texts.length,
            dims: result.data?.[0]?.length,
            embeddings: result.data,
          }, null, 2));
        } catch (e) {
          return err(`Workers AI embed error: ${e}`);
        }
      },
    );

    this.server.tool(
      'workers_ai_image',
      'Generuj obraz przez Cloudflare Workers AI (flux-1-schnell lub dreamshaper).',
      {
        prompt: z.string().min(5).max(500).describe('Opis obrazu po angielsku'),
        model: z.enum([
          '@cf/black-forest-labs/flux-1-schnell',
          '@cf/lykon/dreamshaper-8-lcm',
          '@cf/stabilityai/stable-diffusion-xl-base-1.0',
        ]).default('@cf/black-forest-labs/flux-1-schnell'),
      },
      async ({ prompt, model }) => {
        try {
          const result = await this.env.AI.run(model as Parameters<typeof this.env.AI.run>[0], { prompt } as Parameters<typeof this.env.AI.run>[1]) as ReadableStream | { image: string } | ArrayBuffer;
          if (result instanceof ReadableStream || result instanceof ArrayBuffer) {
            const buf = result instanceof ReadableStream
              ? await new Response(result).arrayBuffer()
              : result;
            const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
            return ok(`data:image/png;base64,${b64}`);
          }
          if (typeof (result as any)?.image === 'string') {
            return ok(`data:image/png;base64,${(result as any).image}`);
          }
          return ok(JSON.stringify(result));
        } catch (e) {
          return err(`Workers AI image error: ${e}`);
        }
      },
    );

    // ════════════════════════════════════════════════════════
    // GROUP 6 — ZENO CF FUNCTIONS PROXY
    // ════════════════════════════════════════════════════════

    this.server.tool(
      'zeno_api',
      'Wywołaj dowolny endpoint CF Functions ZENO Browser (/api/...). GET i POST.',
      {
        path: z.string().startsWith('/api/').describe('Ścieżka np. /api/db/tables/zeno-browser-db'),
        method: z.enum(['GET', 'POST']).default('GET'),
        body: z.record(z.unknown()).optional().describe('Body dla POST (JSON)'),
      },
      async ({ path, method, body }) => {
        const base = zenoBase(this.env);
        try {
          const res = await fetch(`${base}${path}`, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: body ? JSON.stringify(body) : undefined,
          });
          const text = await res.text();
          return ok(text.slice(0, 20000));
        } catch (e) {
          return err(`ZENO API error: ${e}`);
        }
      },
    );

    this.server.tool(
      'zeno_moa_generate',
      'Uruchom MOA (Mixture-of-Agents) pipeline ZENO — wielu agentów generuje i agreguje odpowiedź.',
      {
        prompt: z.string().min(5).max(2000).describe('Zapytanie/prompt'),
        agents: z.number().int().min(2).max(4).default(3).describe('Liczba agentów (2-4)'),
      },
      async ({ prompt, agents }) => {
        const base = zenoBase(this.env);
        try {
          const res = await fetch(`${base}/api/moa/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt, num_agents: agents }),
          });
          const data = await res.text();
          return ok(data.slice(0, 10000));
        } catch (e) {
          return err(`MOA error: ${e}`);
        }
      },
    );

    this.server.tool(
      'zeno_search',
      'Wyszukaj przez ZENO SearXNG meta-search (Google + Bing + DDG + Wikipedia).',
      {
        query: z.string().min(2).max(300).describe('Zapytanie wyszukiwania'),
        limit: z.number().int().min(1).max(20).default(5),
      },
      async ({ query, limit }) => {
        const base = zenoBase(this.env);
        try {
          const res = await fetch(`${base}/api/ai/search?q=${encodeURIComponent(query)}&limit=${limit}`);
          const data = await res.text();
          return ok(data.slice(0, 8000));
        } catch (e) {
          return err(`Search error: ${e}`);
        }
      },
    );

    this.server.tool(
      'zeno_crawl',
      'Crawluj stronę przez ZENO crawler (pobierz treść i metadane z URL).',
      {
        url: z.string().url().describe('URL do crawlowania'),
        extract_text: z.boolean().default(true).describe('Czy wyciągnąć czysty tekst (bez HTML)'),
      },
      async ({ url, extract_text }) => {
        const base = zenoBase(this.env);
        try {
          const res = await fetch(`${base}/api/crawlers/fetch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, extract_text }),
          });
          const data = await res.text();
          return ok(data.slice(0, 15000));
        } catch (e) {
          return err(`Crawl error: ${e}`);
        }
      },
    );

    this.server.tool(
      'zeno_analytics',
      'Pobierz statystyki analytics ZENO (Umami/Plausible via ZENO API).',
      {
        period: z.enum(['1d', '7d', '30d', '90d']).default('7d').describe('Okres'),
      },
      async ({ period }) => {
        const base = zenoBase(this.env);
        try {
          const res = await fetch(`${base}/api/analytics/overview?period=${period}`);
          const data = await res.text();
          return ok(data.slice(0, 5000));
        } catch (e) {
          return err(`Analytics error: ${e}`);
        }
      },
    );

    // ════════════════════════════════════════════════════════
    // GROUP 7 — JIMBO GATEWAY (CF Worker bridge do lokalnych serwisów)
    // ════════════════════════════════════════════════════════

    this.server.tool(
      'jimbo_gateway',
      'Wywołaj JIMBO Gateway Worker — bridge do D1, R2, AI, agentów. Wymaga JIMBO_GATEWAY_URL.',
      {
        path: z.string().startsWith('/').describe('Ścieżka API np. /api/kb/search, /api/agents/list'),
        method: z.enum(['GET', 'POST']).default('GET'),
        body: z.record(z.unknown()).optional().describe('Body dla POST'),
      },
      async ({ path, method, body }) => {
        const base = jimboBase(this.env);
        if (!base) return err('Brak JIMBO_GATEWAY_URL. Ustaw: wrangler secret put JIMBO_GATEWAY_URL');
        try {
          const res = await fetch(`${base}${path}`, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: body ? JSON.stringify(body) : undefined,
          });
          const text = await res.text();
          return ok(text.slice(0, 15000));
        } catch (e) {
          return err(`JIMBO Gateway error: ${e}`);
        }
      },
    );

    this.server.tool(
      'jimbo_chat',
      'Porozmawiaj z JIMBO AI (przez JIMBO Gateway Worker) z kontekstem projektu ZENO.',
      {
        message: z.string().min(2).max(2000).describe('Wiadomość do JIMBO'),
        project: z.enum(['zeno', 'mybonzo', 'jimbo77', 'global']).default('zeno')
          .describe('Kontekst projektu'),
      },
      async ({ message, project }) => {
        const base = jimboBase(this.env);
        if (!base) return err('Brak JIMBO_GATEWAY_URL.');
        try {
          const res = await fetch(`${base}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message, project, stream: false }),
          });
          const data = await res.json() as { content?: string; model?: string; error?: string };
          if (data.error) return err(data.error);
          return ok(`[${data.model ?? 'AI'}] ${data.content ?? '(brak odpowiedzi)'}`);
        } catch (e) {
          return err(`JIMBO chat error: ${e}`);
        }
      },
    );

    this.server.tool(
      'jimbo_skills_search',
      'Szukaj semantycznie w bazie skills JIMBO HUB (przez JIMBO Gateway).',
      {
        query: z.string().min(2).max(300).describe('Zapytanie semantyczne'),
        namespace: z.enum(['all', 'global', 'blog', 'devtools', 'analytics', 'search', 'media', 'finance', 'mybonzo', 'prompts'])
          .default('all'),
        limit: z.number().int().min(1).max(10).default(5),
      },
      async ({ query, namespace, limit }) => {
        const base = jimboBase(this.env);
        if (!base) return err('Brak JIMBO_GATEWAY_URL.');
        try {
          const res = await fetch(`${base}/api/skills/search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, namespace: namespace === 'all' ? undefined : namespace, limit }),
          });
          const data = await res.json() as { results?: { name: string; description: string; namespace: string; similarity?: number }[]; skills?: typeof data.results };
          const skills = data.results ?? data.skills ?? [];
          if (!skills.length) return ok(`Brak skills dla "${query}"`);
          const text = skills.map(s => `**${s.name}** [${s.namespace}]\n  ${s.description}${s.similarity ? ` (sim: ${s.similarity.toFixed(2)})` : ''}`).join('\n\n');
          return ok(`Skills dla "${query}":\n\n${text}`);
        } catch (e) {
          return err(`Skills search error: ${e}`);
        }
      },
    );

    // ════════════════════════════════════════════════════════
    // GROUP 8 — ASK AI (OpenRouter z pełnym kontekstem)
    // ════════════════════════════════════════════════════════

    this.server.tool(
      'ask_ai',
      'Zadaj pytanie AI (OpenRouter) z pełnym kontekstem ekosystemu ZENO Browser.',
      {
        question: z.string().min(5).max(2000).describe('Pytanie'),
        model: z.enum([
          'moonshotai/kimi-k2',
          'google/gemini-2.0-flash-001',
          'anthropic/claude-haiku-4-5',
          'deepseek/deepseek-chat-v3-0324',
          'meta-llama/llama-3.3-70b-instruct',
        ]).default('google/gemini-2.0-flash-001'),
        context: z.string().optional().describe('Dodatkowy kontekst (np. fragment kodu)'),
      },
      async ({ question, model, context }) => {
        if (!this.env.OPENROUTER_API_KEY)
          return err('Brak OPENROUTER_API_KEY. Ustaw: wrangler secret put OPENROUTER_API_KEY');

        const systemPrompt = `Jesteś asystentem deweloperskim ekosystemu ZENO Browser.\n\n${ZENO_CONTEXT}`;
        const userContent = context ? `${question}\n\nKontekst:\n${context}` : question;

        try {
          const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${this.env.OPENROUTER_API_KEY}`,
              'HTTP-Referer': 'https://zenbrowsers.org',
              'X-Title': 'ZENO Browser MCP',
            },
            body: JSON.stringify({
              model,
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userContent },
              ],
              max_tokens: 1500,
            }),
          });

          if (!res.ok) return err(`OpenRouter ${res.status}: ${await res.text()}`);
          const data = await res.json() as { choices: [{ message: { content: string } }] };
          return ok(data.choices[0]?.message?.content ?? '(brak odpowiedzi)');
        } catch (e) {
          return err(`AI error: ${e}`);
        }
      },
    );
  }
}


// ─── Legacy stub (kept for delete_classes migration v2) ─────
export class ZenoMCP extends McpAgent<Env> {
  server = new McpServer({ name: 'zeno-legacy', version: '1.0.0' });
  async init() {}
}
