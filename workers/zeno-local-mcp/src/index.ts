#!/usr/bin/env node
/**
 * ZENO Browser — Local MCP Server (stdio)
 *
 * Narzędzia lokalne (nie wymagają CF deploy):
 *   JIMBO HUB   — chat, agent_run, skills, memory, reflexion
 *   BUCH        — chat z Kimi K2 + tools
 *   Search      — SearXNG + Meilisearch
 *   Podman      — status, start/stop kontenerów
 *   File Agent  — statystyki systemu plików z HUB
 *
 * Użycie w .mcp.json:
 *   "zeno-local": { "type": "stdio", "command": "node",
 *     "args": ["U:/WWW_Zen_BRo_wser_org3/workers/zeno-local-mcp/dist/index.js"] }
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

// ─── Config ─────────────────────────────────────────────────

const HUB  = (process.env.JIMBO_HUB_URL   ?? 'http://localhost:4224').replace(/\/$/, '');
const BUCH = (process.env.BUCH_URL         ?? 'http://localhost:5180').replace(/\/$/, '');
const SRXNG = (process.env.SEARXNG_URL     ?? 'http://localhost:8088').replace(/\/$/, '');
const MEILI = (process.env.MEILISEARCH_URL ?? 'http://localhost:7700').replace(/\/$/, '');
const MEILI_KEY = process.env.MEILISEARCH_KEY ?? '';

// ─── Helpers ─────────────────────────────────────────────────

async function hubGet(path: string): Promise<unknown> {
  const res = await fetch(`${HUB}${path}`);
  if (!res.ok) throw new Error(`HUB ${res.status}: ${await res.text()}`);
  return res.json();
}

async function hubPost(path: string, body: unknown): Promise<unknown> {
  const res = await fetch(`${HUB}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HUB ${res.status}: ${await res.text()}`);
  return res.json();
}

function ok(data: unknown): { content: [{ type: 'text'; text: string }] } {
  return { content: [{ type: 'text', text: typeof data === 'string' ? data : JSON.stringify(data, null, 2) }] };
}

function err(e: unknown): { content: [{ type: 'text'; text: string }]; isError: true } {
  const msg = e instanceof Error ? e.message : String(e);
  return { content: [{ type: 'text', text: `❌ ${msg}` }], isError: true };
}

// ─── Server ──────────────────────────────────────────────────

const server = new McpServer({
  name: 'zeno-local',
  version: '1.0.0',
});

// ═══════════════════════════════════════════════════════════
// GRUPA 1 — JIMBO HUB STATUS
// ═══════════════════════════════════════════════════════════

server.registerTool('hub_status', {
  description: 'Status JIMBO Agent HUB (port 4224). Zwraca wersję, liczbę skills, aktywne sesje.',
  inputSchema: {},
  annotations: { readOnlyHint: true },
}, async () => {
  try { return ok(await hubGet('/status')); } catch (e) { return err(e); }
});

// ═══════════════════════════════════════════════════════════
// GRUPA 2 — JIMBO HUB CHAT
// ═══════════════════════════════════════════════════════════

server.registerTool('hub_chat', {
  description: 'Wyślij wiadomość do JIMBO HUB LLM (OpenRouter/Claude). Obsługuje narzędzia i pamięć.',
  inputSchema: {
    message: z.string().describe('Treść wiadomości'),
    model: z.string().optional().describe('Opcjonalny model override, np. "claude-opus-4-6"'),
    session_id: z.string().optional().describe('ID sesji dla kontekstu rozmowy'),
  },
  annotations: { readOnlyHint: false },
}, async ({ message, model, session_id }) => {
  try {
    const body: Record<string, unknown> = {
      messages: [{ role: 'user', content: message }],
      stream: false,
    };
    if (model) body.model = model;
    if (session_id) body.session_id = session_id;
    const res = await hubPost('/chat', body) as { choices?: { message: { content: string } }[] };
    const text = res.choices?.[0]?.message?.content ?? JSON.stringify(res);
    return ok(text);
  } catch (e) { return err(e); }
});

// ═══════════════════════════════════════════════════════════
// GRUPA 3 — JIMBO HUB AGENT
// ═══════════════════════════════════════════════════════════

server.registerTool('hub_agent_run', {
  description: 'Uruchom zadanie w Goose Agent przez JIMBO HUB. Zwraca task_id.',
  inputSchema: {
    instructions: z.string().describe('Instrukcje dla agenta (co ma zrobić)'),
    workdir: z.string().optional().describe('Katalog roboczy, domyślnie U:/WWW_Zen_BRo_wser_org3'),
  },
  annotations: { readOnlyHint: false, destructiveHint: false },
}, async ({ instructions, workdir }) => {
  try {
    const body: Record<string, unknown> = { instructions };
    if (workdir) body.workdir = workdir;
    return ok(await hubPost('/agent/run', body));
  } catch (e) { return err(e); }
});

server.registerTool('hub_agent_tasks', {
  description: 'Lista aktywnych i ostatnich zadań Goose Agenta w JIMBO HUB.',
  inputSchema: {},
  annotations: { readOnlyHint: true },
}, async () => {
  try { return ok(await hubGet('/agent/tasks')); } catch (e) { return err(e); }
});

// ═══════════════════════════════════════════════════════════
// GRUPA 4 — JIMBO HUB SKILLS
// ═══════════════════════════════════════════════════════════

server.registerTool('hub_skills_list', {
  description: 'Lista wszystkich skills w JIMBO HUB. Filtruj po namespace.',
  inputSchema: {
    namespace: z.string().optional().describe('Filtr namespace: prompts | devtools | blog | search | global'),
  },
  annotations: { readOnlyHint: true },
}, async ({ namespace }) => {
  try {
    const q = namespace ? `?namespace=${encodeURIComponent(namespace)}` : '';
    return ok(await hubGet(`/skills/list${q}`));
  } catch (e) { return err(e); }
});

server.registerTool('hub_skills_search', {
  description: 'Semantyczne wyszukiwanie skills w JIMBO HUB (vector similarity).',
  inputSchema: {
    query: z.string().describe('Zapytanie w języku naturalnym'),
    namespace: z.string().optional().describe('Ogranicz do namespace'),
    limit: z.number().optional().describe('Maks. wyniki (domyślnie 5)'),
  },
  annotations: { readOnlyHint: true },
}, async ({ query, namespace, limit }) => {
  try {
    const body: Record<string, unknown> = { query, limit: limit ?? 5 };
    if (namespace && namespace !== 'all') body.namespace = namespace;
    return ok(await hubPost('/skills/search', body));
  } catch (e) { return err(e); }
});

server.registerTool('hub_skills_save', {
  description: 'Zapisz nowy skill do JIMBO HUB (bazę skills.db).',
  inputSchema: {
    name: z.string().describe('Unikalna nazwa skilla'),
    namespace: z.string().describe('Namespace: prompts | devtools | blog | search | global'),
    description: z.string().describe('Opis skilla (używany do semantic search)'),
    content: z.string().describe('Treść skilla (prompt, kod, instrukcja)'),
    tags: z.array(z.string()).optional().describe('Tagi do filtrowania'),
  },
  annotations: { readOnlyHint: false, idempotentHint: false },
}, async ({ name, namespace, description, content, tags }) => {
  try {
    return ok(await hubPost('/skills/save', { name, namespace, description, content, tags: tags ?? [] }));
  } catch (e) { return err(e); }
});

server.registerTool('hub_skills_graph', {
  description: 'Graf podobieństwa skills w JIMBO HUB (nodes + edges cosine similarity).',
  inputSchema: {},
  annotations: { readOnlyHint: true },
}, async () => {
  try { return ok(await hubGet('/skills/graph')); } catch (e) { return err(e); }
});

// ═══════════════════════════════════════════════════════════
// GRUPA 5 — JIMBO HUB MEMORY
// ═══════════════════════════════════════════════════════════

server.registerTool('hub_memory_core', {
  description: 'Odczytaj core memory JIMBO HUB (persona, project, goals, tools_catalog).',
  inputSchema: {},
  annotations: { readOnlyHint: true },
}, async () => {
  try { return ok(await hubGet('/memory/core')); } catch (e) { return err(e); }
});

server.registerTool('hub_memory_archival_search', {
  description: 'Przeszukaj archival memory JIMBO HUB (wiedza techniczna, patterns).',
  inputSchema: {
    query: z.string().describe('Zapytanie do przeszukania archival memory'),
    limit: z.number().optional().describe('Maks. wyniki (domyślnie 10)'),
  },
  annotations: { readOnlyHint: true },
}, async ({ query, limit }) => {
  try {
    return ok(await hubPost('/memory/archival/search', { query, limit: limit ?? 10 }));
  } catch (e) { return err(e); }
});

server.registerTool('hub_memory_save', {
  description: 'Zapisz wiedzę do archival memory JIMBO HUB.',
  inputSchema: {
    content: z.string().describe('Treść wpisu do zapisania'),
    source: z.string().optional().describe('Źródło wiedzy, np. "mcp-session"'),
  },
  annotations: { readOnlyHint: false },
}, async ({ content, source }) => {
  try {
    return ok(await hubPost('/memory/archival/save', { content, source: source ?? 'mcp-session' }));
  } catch (e) { return err(e); }
});

server.registerTool('hub_memory_stats', {
  description: 'Statystyki pamięci JIMBO HUB: liczba wpisów core/archival/recall.',
  inputSchema: {},
  annotations: { readOnlyHint: true },
}, async () => {
  try { return ok(await hubGet('/memory/stats')); } catch (e) { return err(e); }
});

// ═══════════════════════════════════════════════════════════
// GRUPA 6 — JIMBO HUB REFLEXION
// ═══════════════════════════════════════════════════════════

server.registerTool('hub_reflexion_stats', {
  description: 'Statystyki ReflexionEngine: oceny jakości zadań Goose, skills score.',
  inputSchema: {},
  annotations: { readOnlyHint: true },
}, async () => {
  try { return ok(await hubGet('/reflexion/stats')); } catch (e) { return err(e); }
});

// ═══════════════════════════════════════════════════════════
// GRUPA 7 — JIMBO HUB PROJECTS
// ═══════════════════════════════════════════════════════════

server.registerTool('hub_projects_list', {
  description: 'Lista projektów CF Pages/Workers zarządzanych przez JIMBO HUB.',
  inputSchema: {},
  annotations: { readOnlyHint: true },
}, async () => {
  try { return ok(await hubGet('/projects/list')); } catch (e) { return err(e); }
});

server.registerTool('hub_project_deploy', {
  description: 'Wdróż projekt CF Pages przez JIMBO HUB (triggeruje GitHub Actions).',
  inputSchema: {
    project_id: z.string().describe('ID projektu, np. "zeno-browser"'),
  },
  annotations: { readOnlyHint: false, destructiveHint: false },
}, async ({ project_id }) => {
  try {
    return ok(await hubPost(`/projects/${encodeURIComponent(project_id)}/deploy`, {}));
  } catch (e) { return err(e); }
});

// ═══════════════════════════════════════════════════════════
// GRUPA 8 — BUCH CHAT
// ═══════════════════════════════════════════════════════════

server.registerTool('buch_chat', {
  description: 'Wyślij wiadomość do BUCH AI (Kimi K2 z narzędziami CF + HUB). Port 5180.',
  inputSchema: {
    message: z.string().describe('Pytanie lub polecenie dla BUCH'),
    model: z.string().optional().describe('Override modelu, domyślnie moonshotai/kimi-k2'),
  },
  annotations: { readOnlyHint: false },
}, async ({ message, model }) => {
  try {
    const body: Record<string, unknown> = {
      message,
      stream: false,
    };
    if (model) body.model = model;
    const res = await fetch(`${BUCH}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`BUCH ${res.status}: ${await res.text()}`);
    const data = await res.json() as { response?: string; content?: string };
    return ok(data.response ?? data.content ?? JSON.stringify(data));
  } catch (e) { return err(e); }
});

server.registerTool('buch_status', {
  description: 'Status serwisu BUCH (port 5180): czy działa, który model jest aktywny.',
  inputSchema: {},
  annotations: { readOnlyHint: true },
}, async () => {
  try {
    const res = await fetch(`${BUCH}/api/health`);
    if (!res.ok) throw new Error(`BUCH offline (${res.status})`);
    return ok(await res.json());
  } catch (e) { return err(e); }
});

// ═══════════════════════════════════════════════════════════
// GRUPA 9 — SEARCH (SearXNG + Meilisearch)
// ═══════════════════════════════════════════════════════════

server.registerTool('searxng_search', {
  description: 'Przeszukaj internet przez lokalny SearXNG (port 8088). Agreguje wiele silników.',
  inputSchema: {
    query: z.string().describe('Zapytanie wyszukiwania'),
    categories: z.string().optional().describe('Kategorie: general | news | images | files | science (domyślnie general)'),
    language: z.string().optional().describe('Język wyników, np. "pl" lub "en"'),
    max_results: z.number().optional().describe('Maks. wyniki (domyślnie 10)'),
  },
  annotations: { readOnlyHint: true, openWorldHint: true },
}, async ({ query, categories, language, max_results }) => {
  try {
    const params = new URLSearchParams({
      q: query,
      format: 'json',
      categories: categories ?? 'general',
    });
    if (language) params.set('language', language);
    const res = await fetch(`${SRXNG}/search?${params}`);
    if (!res.ok) throw new Error(`SearXNG ${res.status}`);
    const data = await res.json() as { results: unknown[] };
    const results = (data.results ?? []).slice(0, max_results ?? 10);
    return ok({ query, count: results.length, results });
  } catch (e) { return err(e); }
});

server.registerTool('meilisearch_search', {
  description: 'Przeszukaj lokalny indeks Meilisearch (port 7700). Dobry do treści zindeksowanych z ZENO.',
  inputSchema: {
    index: z.string().describe('Nazwa indeksu, np. "zeno-pages" lub "buch-knowledge"'),
    query: z.string().describe('Zapytanie wyszukiwania'),
    limit: z.number().optional().describe('Maks. wyniki (domyślnie 20)'),
    filter: z.string().optional().describe('Filtr Meilisearch, np. "lang = pl"'),
  },
  annotations: { readOnlyHint: true },
}, async ({ index, query, limit, filter }) => {
  try {
    const body: Record<string, unknown> = { q: query, limit: limit ?? 20 };
    if (filter) body.filter = filter;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (MEILI_KEY) headers['Authorization'] = `Bearer ${MEILI_KEY}`;
    const res = await fetch(`${MEILI}/indexes/${encodeURIComponent(index)}/search`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Meilisearch ${res.status}: ${await res.text()}`);
    return ok(await res.json());
  } catch (e) { return err(e); }
});

server.registerTool('meilisearch_indexes', {
  description: 'Lista wszystkich indeksów w lokalnym Meilisearch.',
  inputSchema: {},
  annotations: { readOnlyHint: true },
}, async () => {
  try {
    const headers: Record<string, string> = {};
    if (MEILI_KEY) headers['Authorization'] = `Bearer ${MEILI_KEY}`;
    const res = await fetch(`${MEILI}/indexes`, { headers });
    if (!res.ok) throw new Error(`Meilisearch ${res.status}`);
    return ok(await res.json());
  } catch (e) { return err(e); }
});

// ═══════════════════════════════════════════════════════════
// GRUPA 10 — PODMAN CONTAINERS
// ═══════════════════════════════════════════════════════════

server.registerTool('podman_status', {
  description: 'Status Podman + lista kontenerów zarządzanych przez JIMBO HUB.',
  inputSchema: {},
  annotations: { readOnlyHint: true },
}, async () => {
  try {
    const [status, containers] = await Promise.all([
      hubGet('/podman/status'),
      hubGet('/podman/containers'),
    ]);
    return ok({ status, containers });
  } catch (e) { return err(e); }
});

server.registerTool('podman_container_start', {
  description: 'Uruchom kontener Podman przez JIMBO HUB.',
  inputSchema: {
    name: z.string().describe('Nazwa kontenera, np. "searxng" lub "meilisearch"'),
  },
  annotations: { readOnlyHint: false, destructiveHint: false },
}, async ({ name }) => {
  try {
    return ok(await hubPost(`/podman/containers/${encodeURIComponent(name)}/start`, {}));
  } catch (e) { return err(e); }
});

server.registerTool('podman_container_stop', {
  description: 'Zatrzymaj kontener Podman przez JIMBO HUB.',
  inputSchema: {
    name: z.string().describe('Nazwa kontenera do zatrzymania'),
  },
  annotations: { readOnlyHint: false, destructiveHint: true },
}, async ({ name }) => {
  try {
    return ok(await hubPost(`/podman/containers/${encodeURIComponent(name)}/stop`, {}));
  } catch (e) { return err(e); }
});

server.registerTool('podman_container_restart', {
  description: 'Zrestartuj kontener Podman przez JIMBO HUB.',
  inputSchema: {
    name: z.string().describe('Nazwa kontenera do restartu'),
  },
  annotations: { readOnlyHint: false, destructiveHint: false },
}, async ({ name }) => {
  try {
    return ok(await hubPost(`/podman/containers/${encodeURIComponent(name)}/restart`, {}));
  } catch (e) { return err(e); }
});

// ═══════════════════════════════════════════════════════════
// START
// ═══════════════════════════════════════════════════════════

const transport = new StdioServerTransport();
await server.connect(transport);
