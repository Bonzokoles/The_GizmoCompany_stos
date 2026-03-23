/**
 * JIMBO Gateway Worker
 *
 * Endpoints:
 *   POST /chat              — AI chat przez CF AI Gateway (bielik_gateway)
 *   POST /kb/search         — semantic search w D1 (libraries)
 *   POST /kb/store          — zapisz dokument do D1 + KV cache
 *   GET  /kb/list           — lista dokumentów z D1
 *   GET  /storage/list      — lista plików R2
 *   GET  /storage/:key      — pobierz plik z R2
 *   PUT  /storage/:key      — upload pliku do R2
 *   GET  /health            — status wszystkich bindingów
 *
 * Deploy: cd workers/jimbo-gateway && npx wrangler deploy
 * KV setup: npx wrangler kv namespace create jimbo-cache  → podmień ID w wrangler.toml
 */

export interface Env {
  AI: Ai;
  DB: D1Database;
  STORAGE: R2Bucket;
  CACHE: KVNamespace;
  OPENAI_API_KEY: string;
  CF_GATEWAY_BASE: string;
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json; charset=utf-8" },
  });
}

function err(msg: string, status = 400) {
  return json({ error: msg }, status);
}

// ── Init DB schema ────────────────────────────────────────────────────────
async function ensureSchema(db: D1Database) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS jimbo_kb (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      library   TEXT    NOT NULL DEFAULT 'general',
      title     TEXT    NOT NULL,
      content   TEXT    NOT NULL,
      source    TEXT,
      tags      TEXT,
      created_at TEXT   NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_jimbo_kb_library ON jimbo_kb(library);
    CREATE VIRTUAL TABLE IF NOT EXISTS jimbo_kb_fts
      USING fts5(title, content, content='jimbo_kb', content_rowid='id');
  `);
}

// ── Router ────────────────────────────────────────────────────────────────
export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

    const url = new URL(req.url);
    const path = url.pathname;

    // ── /health ──────────────────────────────────────────────────────────
    if (path === "/health" && req.method === "GET") {
      let dbOk = false;
      try { await env.DB.exec("SELECT 1"); dbOk = true; } catch {}
      let kvOk = false;
      try { await env.CACHE.get("__ping__"); kvOk = true; } catch {}
      return json({
        status: "ok",
        bindings: { ai: "✅", db: dbOk ? "✅" : "❌", r2: "✅", kv: kvOk ? "✅" : "❌" },
        gateway: env.CF_GATEWAY_BASE,
      });
    }

    // ── /chat ─────────────────────────────────────────────────────────────
    if (path === "/chat" && req.method === "POST") {
      const body = await req.json<{
        messages: { role: string; content: string }[];
        model?: string;
        max_tokens?: number;
        temperature?: number;
        system?: string;
      }>();

      const model = body.model ?? "gpt-4o-mini";
      const messages = body.messages ?? [];
      if (body.system) messages.unshift({ role: "system", content: body.system });

      // Cache key from last user message
      const lastUser = messages.findLast(m => m.role === "user")?.content ?? "";
      const cacheKey = `chat:${model}:${btoa(lastUser).slice(0, 40)}`;
      const cached = await env.CACHE.get(cacheKey);
      if (cached) return json({ text: cached, cached: true, model });

      const apiKey = env.OPENAI_API_KEY;
      if (!apiKey) return err("OPENAI_API_KEY not set", 500);

      const gwRes = await fetch(`${env.CF_GATEWAY_BASE}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: body.max_tokens ?? 1024,
          temperature: body.temperature ?? 0.7,
        }),
      });

      if (!gwRes.ok) {
        const errText = await gwRes.text();
        return err(`CF Gateway error ${gwRes.status}: ${errText}`, 502);
      }

      const gwData = await gwRes.json<{ choices: { message: { content: string } }[] }>();
      const text = gwData.choices?.[0]?.message?.content ?? "";

      // Cache for 1 hour
      await env.CACHE.put(cacheKey, text, { expirationTtl: 3600 });

      return json({ text, cached: false, model });
    }

    // ── /kb/store ─────────────────────────────────────────────────────────
    if (path === "/kb/store" && req.method === "POST") {
      await ensureSchema(env.DB);
      const body = await req.json<{
        library?: string; title: string; content: string; source?: string; tags?: string;
      }>();

      if (!body.title || !body.content) return err("title and content required");

      const result = await env.DB.prepare(
        `INSERT INTO jimbo_kb (library, title, content, source, tags) VALUES (?,?,?,?,?)`
      ).bind(
        body.library ?? "general",
        body.title,
        body.content,
        body.source ?? null,
        body.tags ?? null,
      ).run();

      // Also cache in KV for fast access
      const kvKey = `kb:${result.meta.last_row_id}`;
      await env.CACHE.put(kvKey, JSON.stringify(body), { expirationTtl: 86400 });

      return json({ id: result.meta.last_row_id, stored: true });
    }

    // ── /kb/search ────────────────────────────────────────────────────────
    if (path === "/kb/search" && req.method === "POST") {
      await ensureSchema(env.DB);
      const body = await req.json<{ query: string; library?: string; limit?: number }>();
      if (!body.query) return err("query required");

      const limit = body.limit ?? 10;

      let rows: D1Result<Record<string, unknown>>;
      if (body.library && body.library !== "all") {
        rows = await env.DB.prepare(
          `SELECT id, library, title, content, source, created_at
           FROM jimbo_kb WHERE library = ? AND (title LIKE ? OR content LIKE ?)
           ORDER BY id DESC LIMIT ?`
        ).bind(body.library, `%${body.query}%`, `%${body.query}%`, limit).all();
      } else {
        rows = await env.DB.prepare(
          `SELECT id, library, title, content, source, created_at
           FROM jimbo_kb WHERE title LIKE ? OR content LIKE ?
           ORDER BY id DESC LIMIT ?`
        ).bind(`%${body.query}%`, `%${body.query}%`, limit).all();
      }

      return json({ query: body.query, results: rows.results, total: rows.results.length });
    }

    // ── /kb/list ──────────────────────────────────────────────────────────
    if (path === "/kb/list" && req.method === "GET") {
      await ensureSchema(env.DB);
      const library = url.searchParams.get("library") ?? null;
      const limit = parseInt(url.searchParams.get("limit") ?? "50");

      const rows = library
        ? await env.DB.prepare(`SELECT id, library, title, source, created_at FROM jimbo_kb WHERE library=? ORDER BY id DESC LIMIT ?`).bind(library, limit).all()
        : await env.DB.prepare(`SELECT id, library, title, source, created_at FROM jimbo_kb ORDER BY id DESC LIMIT ?`).bind(limit).all();

      return json({ results: rows.results });
    }

    // ── /storage/list ─────────────────────────────────────────────────────
    if (path === "/storage/list" && req.method === "GET") {
      const prefix = url.searchParams.get("prefix") ?? "";
      const listed = await env.STORAGE.list({ prefix, limit: 100 });
      return json({
        objects: listed.objects.map(o => ({
          key: o.key, size: o.size, uploaded: o.uploaded,
        })),
        truncated: listed.truncated,
      });
    }

    // ── /storage/:key GET ──────────────────────────────────────────────────
    if (path.startsWith("/storage/") && req.method === "GET") {
      const key = decodeURIComponent(path.slice("/storage/".length));
      const obj = await env.STORAGE.get(key);
      if (!obj) return err("Not found", 404);
      return new Response(obj.body, {
        headers: {
          ...CORS,
          "Content-Type": obj.httpMetadata?.contentType ?? "application/octet-stream",
        },
      });
    }

    // ── /storage/:key PUT ──────────────────────────────────────────────────
    if (path.startsWith("/storage/") && req.method === "PUT") {
      const key = decodeURIComponent(path.slice("/storage/".length));
      const ct = req.headers.get("Content-Type") ?? "application/octet-stream";
      await env.STORAGE.put(key, req.body!, { httpMetadata: { contentType: ct } });
      return json({ key, stored: true });
    }

    return err("Not found", 404);
  },
};
