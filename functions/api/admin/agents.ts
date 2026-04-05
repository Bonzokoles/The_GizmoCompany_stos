/**
 * ZENO Admin — Agents Sync
 * Cloudflare Pages Function: /api/admin/agents
 *
 * GET  /api/admin/agents  → pobierz listę agentów z D1
 * POST /api/admin/agents  → zapisz listę agentów do D1
 *
 * Auth: Basic Authorization header (base64(user:pass))
 * Sekrety CF Pages: ADMIN_USER, ADMIN_PASS
 */

import type { Env } from '../../types';
import { corsHeaders } from '../../types';

const AGENTS_KEY = 'zeno_agents_v1';

function unauthorized(): Response {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', 'WWW-Authenticate': 'Basic realm="ZENO Admin"' },
  });
}

function ok(data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function checkAuth(request: Request, env: Env): boolean {
  const authUser = env.ADMIN_USER ?? 'Jimbo77';
  const authPass = env.ADMIN_PASS;
  if (!authPass) return false; // wymaga sekretu w CF Pages

  const header = request.headers.get('Authorization') ?? '';
  if (!header.startsWith('Basic ')) return false;

  let decoded: string;
  try {
    decoded = atob(header.slice(6));
  } catch {
    return false;
  }
  const colon = decoded.indexOf(':');
  if (colon < 0) return false;
  const user = decoded.slice(0, colon);
  const pass = decoded.slice(colon + 1);
  return user === authUser && pass === authPass;
}

async function ensureTable(db: D1Database): Promise<void> {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS admin_storage (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const method = request.method.toUpperCase();

  // CORS preflight
  if (method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (!checkAuth(request, env)) return unauthorized();

  const db = env.DB;
  if (!db) {
    return new Response(JSON.stringify({ error: 'D1 not configured' }), {
      status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  await ensureTable(db);

  // GET — zwróć agentów
  if (method === 'GET') {
    const row = await db
      .prepare('SELECT value FROM admin_storage WHERE key = ?')
      .bind(AGENTS_KEY)
      .first<{ value: string }>();

    const agents = row ? JSON.parse(row.value) : [];
    return ok({ agents, updated_at: row ? (await db.prepare('SELECT updated_at FROM admin_storage WHERE key = ?').bind(AGENTS_KEY).first<{ updated_at: string }>())?.updated_at : null });
  }

  // POST — zapisz agentów
  if (method === 'POST') {
    let body: { agents?: unknown[] };
    try {
      body = await request.json() as { agents?: unknown[] };
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!Array.isArray(body.agents)) {
      return new Response(JSON.stringify({ error: 'agents musi być tablicą' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const now = new Date().toISOString();
    await db
      .prepare('INSERT OR REPLACE INTO admin_storage (key, value, updated_at) VALUES (?, ?, ?)')
      .bind(AGENTS_KEY, JSON.stringify(body.agents), now)
      .run();

    return ok({ saved: body.agents.length, updated_at: now });
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
};
