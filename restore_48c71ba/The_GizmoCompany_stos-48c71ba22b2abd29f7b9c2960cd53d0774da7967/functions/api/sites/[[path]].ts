/**
 * ZENO Browser — Cross-Site API Worker
 * Hub connecting all 5 websites with unified registry, health-check, and broadcast
 *
 * Endpoints:
 *   GET  /api/sites/registry      — List all connected sites with info
 *   POST /api/sites/ping          — Health-check all sites (or one)
 *   POST /api/sites/broadcast     — Forward a payload to all sites
 *   GET  /api/sites/status        — Service health
 */

import type { Env, SiteInfo } from '../../types';
import { jsonResponse, errorResponse, corsHeaders } from '../../types';

function buildRegistry(env: Env): SiteInfo[] {
  return [
    {
      name: 'jimbo77.org',
      url: env.SITES_JIMBO77_ORG || 'https://jimbo77.org',
      status: 'unknown',
      features: ['portfolio', 'blog'],
    },
    {
      name: 'mybonzoaiblog.com',
      url: env.SITES_MYBONZOAI_BLOG || 'https://mybonzoaiblog.com',
      status: 'unknown',
      features: ['ai-blog', 'articles'],
    },
    {
      name: 'mybonzo.com',
      url: env.SITES_MYBONZO_COM || 'https://mybonzo.com',
      status: 'unknown',
      features: ['main-site', 'moa-pipeline'],
    },
    {
      name: 'jimbo77.com',
      url: env.SITES_JIMBO77_COM || 'https://jimbo77.com',
      status: 'unknown',
      features: ['personal', 'projects'],
    },
    {
      name: 'zenbrowsers.org',
      url: env.SITE_URL || 'https://zenbrowsers.org',
      status: 'online',
      features: ['browser', 'webgate', 'ai-gate', 'search'],
    },
  ];
}

async function pingSite(site: SiteInfo, timeout = 8000): Promise<SiteInfo> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const resp = await fetch(site.url, {
      method: 'HEAD',
      signal: controller.signal,
      headers: { 'User-Agent': 'ZENO-SiteMonitor/1.0' },
    });
    return {
      ...site,
      status: resp.ok ? 'online' : 'offline',
      lastCheck: Date.now(),
    };
  } catch {
    return { ...site, status: 'offline', lastCheck: Date.now() };
  } finally {
    clearTimeout(timer);
  }
}

async function handleRegistry(env: Env): Promise<Response> {
  return jsonResponse({
    hub: 'zenbrowsers.org',
    version: '1.0.0',
    sites: buildRegistry(env),
    total: 5,
    timestamp: new Date().toISOString(),
  });
}

async function handlePing(request: Request, env: Env): Promise<Response> {
  const body = (await request.json().catch(() => ({}))) as { site?: string };
  const registry = buildRegistry(env);

  if (body.site) {
    const target = registry.find(s => s.name === body.site || s.url === body.site);
    if (!target) return errorResponse('Site not found in registry', 404);
    const result = await pingSite(target);
    return jsonResponse({ site: result });
  }

  // Ping all sites in parallel
  const results = await Promise.all(registry.map(s => pingSite(s)));
  const online = results.filter(r => r.status === 'online').length;

  return jsonResponse({
    results,
    summary: { total: results.length, online, offline: results.length - online },
    timestamp: new Date().toISOString(),
  });
}

async function handleBroadcast(request: Request, env: Env): Promise<Response> {
  const body = (await request.json()) as {
    event: string;
    data?: unknown;
    targets?: string[];
  };

  if (!body.event || typeof body.event !== 'string') {
    return errorResponse('Missing "event" field', 400);
  }

  const registry = buildRegistry(env);

  // Filter targets if specified, exclude self
  const targets = body.targets
    ? registry.filter(s => body.targets!.includes(s.name) && s.name !== 'zenbrowsers.org')
    : registry.filter(s => s.name !== 'zenbrowsers.org');

  if (targets.length === 0) {
    return errorResponse('No target sites to broadcast to', 400);
  }

  // Broadcast — best-effort POST to each site's /api/zenohub webhook
  const results = await Promise.all(
    targets.map(async (site) => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      try {
        const resp = await fetch(`${site.url}/api/zenohub`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-ZenoHub-Event': body.event,
            'User-Agent': 'ZENO-Hub/1.0',
          },
          body: JSON.stringify({ event: body.event, data: body.data, from: 'zenbrowsers.org' }),
          signal: controller.signal,
        });
        return { site: site.name, delivered: resp.ok, status: resp.status };
      } catch {
        return { site: site.name, delivered: false, status: 0 };
      } finally {
        clearTimeout(timer);
      }
    }),
  );

  const delivered = results.filter(r => r.delivered).length;

  return jsonResponse({
    event: body.event,
    results,
    summary: { sent: targets.length, delivered, failed: targets.length - delivered },
    timestamp: new Date().toISOString(),
  });
}

export const onRequest: PagesFunction<Env> = async (context) => {
  if (context.request.method === 'OPTIONS') return corsHeaders();

  const url = new URL(context.request.url);
  const path = url.pathname.replace('/api/sites/', '');

  switch (path) {
    case 'registry':
      return handleRegistry(context.env);

    case 'ping':
      if (context.request.method !== 'POST') return errorResponse('POST required', 405);
      return handlePing(context.request, context.env);

    case 'broadcast':
      if (context.request.method !== 'POST') return errorResponse('POST required', 405);
      return handleBroadcast(context.request, context.env);

    case 'status':
      return jsonResponse({
        service: 'Cross-Site Hub',
        status: 'operational',
        version: '1.0.0',
        connectedSites: 5,
        timestamp: new Date().toISOString(),
      });

    default:
      return errorResponse('Unknown sites endpoint', 404);
  }
};
