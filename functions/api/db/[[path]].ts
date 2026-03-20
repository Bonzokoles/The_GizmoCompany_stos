/**
 * ZENO Browser — Database Explorer Worker
 * Browse and query D1 databases via CF API
 *
 * Endpoints:
 *   GET  /api/db/databases          — List all D1 databases
 *   GET  /api/db/tables/:dbId       — List tables in a database
 *   POST /api/db/query/:dbId        — Execute read-only SQL query
 *   GET  /api/db/status             — Service health
 */

import type { Env } from '../../types';
import { jsonResponse, errorResponse, corsHeaders } from '../../types';

const D1_DATABASES: Record<string, { name: string; description: string; project: string }> = {
  'ddac77ec-c59b-4c19-895f-19e5b8e0b335': {
    name: 'zeno-browser-db',
    description: 'Zen Browser main database',
    project: 'zenbrowsers.org',
  },
  '5c46da23-b3ae-42d3-91a2-0a2b81d8f3ec': {
    name: 'jimbo77-community-db',
    description: 'Jimbo77 community data',
    project: 'jimbo77.com',
  },
  '7cd9d679-77d5-466d-930e-a5c57ba18621': {
    name: 'jimbo77-social-db',
    description: 'Jimbo77 social features',
    project: 'jimbo77.com',
  },
  '84f0f3cb-9cfa-4c18-abd1-ab3f13d2e6ea': {
    name: 'mybonzo',
    description: 'MyBonzo main database',
    project: 'mybonzo.com',
  },
  '50360b87-8e2a-42bc-b65f-66c4ddd09a2e': {
    name: 'pumo-db',
    description: 'Pumo product database',
    project: 'pumo/jimbo77',
  },
  '9534ef30-1a4e-4ef2-be90-09cfbd879fe8': {
    name: 'pumo_products',
    description: 'Pumo product catalog',
    project: 'pumo/jimbo77',
  },
  '90fe9b43-3d7e-4e8b-8a1f-2c5f9d4e6b7a': {
    name: 'jimbo-rag-db',
    description: 'RAG knowledge base',
    project: 'jimbo77.com',
  },
};

// Forbidden SQL patterns to prevent mutations
const FORBIDDEN_SQL = /\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE|REPLACE|GRANT|REVOKE)\b/i;

async function cfApiCall(path: string, env: Env, method = 'GET', body?: any): Promise<any> {
  const cfAccountId = env.CF_ACCOUNT_ID;
  const cfToken = env.CF_API_TOKEN;
  if (!cfAccountId || !cfToken) return null;

  const resp = await fetch(`https://api.cloudflare.com/client/v4/accounts/${cfAccountId}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${cfToken}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15000),
  });

  if (!resp.ok) return null;
  return resp.json();
}

async function handleDatabases(): Promise<Response> {
  const databases = Object.entries(D1_DATABASES).map(([id, info]) => ({
    id,
    ...info,
  }));

  return jsonResponse({
    databases,
    totalDatabases: databases.length,
    projects: [...new Set(databases.map((d) => d.project))],
  });
}

async function handleTables(env: Env, dbId: string): Promise<Response> {
  const dbInfo = D1_DATABASES[dbId];
  if (!dbInfo) return errorResponse(`Unknown database ID: ${dbId}`, 404);

  const result = await cfApiCall(`/d1/database/${dbId}/query`, env, 'POST', {
    sql: "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
  });

  if (!result) {
    return jsonResponse({
      database: dbInfo,
      tables: [],
      note: 'CF_ACCOUNT_ID/CF_API_TOKEN required for D1 API access',
    });
  }

  const tables = result.result?.[0]?.results?.map((r: any) => r.name) || [];
  return jsonResponse({
    database: { id: dbId, ...dbInfo },
    tables,
    totalTables: tables.length,
  });
}

async function handleQuery(env: Env, request: Request, dbId: string): Promise<Response> {
  const dbInfo = D1_DATABASES[dbId];
  if (!dbInfo) return errorResponse(`Unknown database ID: ${dbId}`, 404);

  let body: any;
  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }

  const sql = (body.sql || '').trim();
  if (!sql) return errorResponse('SQL query required', 400);
  if (sql.length > 2000) return errorResponse('Query too long (max 2000 chars)', 400);

  // Read-only enforcement
  if (FORBIDDEN_SQL.test(sql)) {
    return errorResponse('Only read-only queries (SELECT) are allowed', 403);
  }

  const result = await cfApiCall(`/d1/database/${dbId}/query`, env, 'POST', {
    sql,
    params: body.params || [],
  });

  if (!result) {
    return jsonResponse({
      database: dbInfo,
      query: sql,
      results: [],
      note: 'CF credentials required for queries',
    });
  }

  const queryResult = result.result?.[0] || {};
  return jsonResponse({
    database: { id: dbId, ...dbInfo },
    query: sql,
    results: queryResult.results || [],
    meta: {
      rows: queryResult.results?.length || 0,
      duration: queryResult.meta?.duration,
      changes: queryResult.meta?.changes,
    },
  });
}

export const onRequest: PagesFunction<Env> = async (context) => {
  if (context.request.method === 'OPTIONS') return corsHeaders();

  const url = new URL(context.request.url);
  const path = url.pathname.replace('/api/db', '').replace(/^\/+/, '');

  if (path === 'databases') return handleDatabases();
  if (path === 'status') {
    return jsonResponse({
      service: 'database-explorer',
      status: 'operational',
      totalDatabases: Object.keys(D1_DATABASES).length,
      features: ['list-databases', 'list-tables', 'read-only-query'],
      readOnly: true,
      timestamp: new Date().toISOString(),
    });
  }

  // /api/db/tables/:dbId
  if (path.startsWith('tables/')) {
    const dbId = path.replace('tables/', '').split('/')[0];
    return handleTables(context.env, dbId);
  }

  // POST /api/db/query/:dbId
  if (path.startsWith('query/') && context.request.method === 'POST') {
    const dbId = path.replace('query/', '').split('/')[0];
    return handleQuery(context.env, context.request, dbId);
  }

  return errorResponse(`Unknown endpoint: /api/db/${path}`, 404);
};
