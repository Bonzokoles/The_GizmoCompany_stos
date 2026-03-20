/**
 * ZENO Browser — Workers Monitor API
 * Monitors all 39 Cloudflare Workers across the infrastructure
 *
 * Endpoints:
 *   GET  /api/workers/list       — List all workers with metadata
 *   POST /api/workers/health     — Check health of all/selected workers
 *   GET  /api/workers/stats      — Aggregate worker statistics
 *   GET  /api/workers/status     — Service health
 */

import type { Env } from '../../types';
import { WORKER_REGISTRY, jsonResponse, errorResponse, corsHeaders } from '../../types';

type WorkerCategory = 'ai' | 'content' | 'api' | 'proxy' | 'ecommerce' | 'media' | 'seo' | 'other';

const ROUTED_WORKERS: Record<string, string> = {
  'hub-jimbo77': 'https://hub.jimbo77.com/health',
  'jimbo77-agents-orchestrator': 'https://orchestrator.jimbo77.com/health',
  'jimbo77-api-docs': 'https://jimbo77.org/docs/api/',
  'moe-rag-api': 'https://api.jimbo77.com/api/moe-rag/health',
  'pumo-rag': 'https://pumo-api.jimbo77.com/health',
};

async function handleList(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const category = url.searchParams.get('category') as WorkerCategory | null;
  const search = url.searchParams.get('q')?.toLowerCase();

  let workers = [...WORKER_REGISTRY];

  if (category) {
    workers = workers.filter((w) => w.category === category);
  }
  if (search) {
    workers = workers.filter(
      (w) => w.name.toLowerCase().includes(search) || w.description.toLowerCase().includes(search)
    );
  }

  const categories = WORKER_REGISTRY.reduce(
    (acc, w) => {
      acc[w.category] = (acc[w.category] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return jsonResponse({
    workers,
    total: WORKER_REGISTRY.length,
    filtered: workers.length,
    categories,
  });
}

async function handleHealth(request: Request): Promise<Response> {
  const body = (await request.json().catch(() => ({}))) as { ids?: string[] };
  const targetIds = body.ids || WORKER_REGISTRY.filter((w) => w.route).map((w) => w.id);

  const results = await Promise.allSettled(
    targetIds.map(async (id) => {
      const healthUrl = ROUTED_WORKERS[id];
      if (!healthUrl) {
        return { id, status: 'no-route' as const, latency: 0 };
      }
      const start = Date.now();
      try {
        const resp = await fetch(healthUrl, {
          method: 'GET',
          signal: AbortSignal.timeout(8000),
          headers: { 'User-Agent': 'ZENO-Monitor/1.0' },
        });
        return {
          id,
          status: resp.ok ? ('healthy' as const) : ('unhealthy' as const),
          statusCode: resp.status,
          latency: Date.now() - start,
        };
      } catch {
        return { id, status: 'unreachable' as const, latency: Date.now() - start };
      }
    })
  );

  const healthResults = results.map((r) => (r.status === 'fulfilled' ? r.value : { id: 'unknown', status: 'error' }));
  const healthy = healthResults.filter((r) => r.status === 'healthy').length;

  return jsonResponse({
    results: healthResults,
    summary: {
      total: targetIds.length,
      healthy,
      unhealthy: healthResults.filter((r) => r.status === 'unhealthy').length,
      unreachable: healthResults.filter((r) => r.status === 'unreachable').length,
      noRoute: healthResults.filter((r) => r.status === 'no-route').length,
    },
    timestamp: new Date().toISOString(),
  });
}

async function handleStats(): Promise<Response> {
  const categories = WORKER_REGISTRY.reduce(
    (acc, w) => {
      acc[w.category] = (acc[w.category] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const withRoutes = WORKER_REGISTRY.filter((w) => w.route).length;

  return jsonResponse({
    total: WORKER_REGISTRY.length,
    categories,
    withRoutes,
    withoutRoutes: WORKER_REGISTRY.length - withRoutes,
    registry: 'zenbrowsers.org',
    lastUpdated: new Date().toISOString(),
  });
}

export const onRequest: PagesFunction<Env> = async (context) => {
  if (context.request.method === 'OPTIONS') return corsHeaders();

  const url = new URL(context.request.url);
  const path = url.pathname.replace('/api/workers', '').replace(/^\/+/, '');

  switch (path) {
    case 'list':
      return handleList(context.request);
    case 'health':
      if (context.request.method !== 'POST') return errorResponse('POST required', 405);
      return handleHealth(context.request);
    case 'stats':
      return handleStats();
    case 'status':
      return jsonResponse({
        service: 'workers-monitor',
        status: 'operational',
        trackedWorkers: WORKER_REGISTRY.length,
        timestamp: new Date().toISOString(),
      });
    default:
      return errorResponse(`Unknown endpoint: /api/workers/${path}`, 404);
  }
};
