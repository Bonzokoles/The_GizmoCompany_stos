/**
 * ZENO Browser — Analytics Hub Worker
 * Aggregates analytics from Umami across all sites
 *
 * Endpoints:
 *   GET  /api/analytics/overview   — Cross-site analytics summary
 *   GET  /api/analytics/sites      — Per-site stats
 *   GET  /api/analytics/realtime   — Active visitors across all sites
 *   GET  /api/analytics/status     — Service health
 */

import type { Env } from '../../types';
import { jsonResponse, errorResponse, corsHeaders } from '../../types';

const UMAMI_URL = 'https://analytics.mybonzo.com';

const SITE_IDS: Record<string, string> = {
  'jimbo77.org': '4505adfc-d398-43d9-b3a9-750ec4abf561',
  'mybonzoaiblog.com': '79467ba2-ff07-4ce5-9126-87d51dedebf3',
  'zenbrowsers.org': '8fbc639b-7427-4323-9931-faa797bb7fd3',
  'mybonzo.com': 'af266351-8b2e-4358-9717-aa93f7ad2589',
  'jimbo77.com': 'ddcd9b63-7ffd-4024-a9b9-a5b02ad9e002',
};

async function umamiApi(path: string, env: Env): Promise<any> {
  const resp = await fetch(`${UMAMI_URL}/api${path}`, {
    headers: {
      'User-Agent': 'ZENO-Analytics/1.0',
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(10000),
  });
  if (!resp.ok) return null;
  return resp.json();
}

async function handleOverview(env: Env, request: Request): Promise<Response> {
  const url = new URL(request.url);
  const period = url.searchParams.get('period') || '24h';

  const now = Date.now();
  const startAt = period === '7d' ? now - 7 * 86400000 : period === '30d' ? now - 30 * 86400000 : now - 86400000;

  const results = await Promise.allSettled(
    Object.entries(SITE_IDS).map(async ([site, id]) => {
      try {
        const stats = await umamiApi(`/websites/${id}/stats?startAt=${startAt}&endAt=${now}`, env);
        return { site, id, stats, status: 'ok' as const };
      } catch {
        return { site, id, stats: null, status: 'error' as const };
      }
    })
  );

  const siteStats = results.map((r) => (r.status === 'fulfilled' ? r.value : { site: 'unknown', stats: null, status: 'error' }));

  const totals = siteStats.reduce(
    (acc, s) => {
      if (s.stats) {
        acc.pageviews += s.stats.pageviews?.value || 0;
        acc.visitors += s.stats.visitors?.value || 0;
        acc.visits += s.stats.visits?.value || 0;
        acc.bounces += s.stats.bounces?.value || 0;
      }
      return acc;
    },
    { pageviews: 0, visitors: 0, visits: 0, bounces: 0 }
  );

  return jsonResponse({
    period,
    totals,
    sites: siteStats,
    trackedSites: Object.keys(SITE_IDS).length,
    timestamp: new Date().toISOString(),
  });
}

async function handleSites(): Promise<Response> {
  return jsonResponse({
    sites: Object.entries(SITE_IDS).map(([name, id]) => ({
      name,
      id,
      dashboardUrl: `${UMAMI_URL}/websites/${id}`,
    })),
    umamiUrl: UMAMI_URL,
    totalSites: Object.keys(SITE_IDS).length,
  });
}

async function handleRealtime(env: Env): Promise<Response> {
  const results = await Promise.allSettled(
    Object.entries(SITE_IDS).map(async ([site, id]) => {
      try {
        const data = await umamiApi(`/websites/${id}/active`, env);
        return { site, activeVisitors: data?.x || data?.visitors || 0 };
      } catch {
        return { site, activeVisitors: 0 };
      }
    })
  );

  const siteData = results.map((r) => (r.status === 'fulfilled' ? r.value : { site: 'unknown', activeVisitors: 0 }));
  const totalActive = siteData.reduce((sum, s) => sum + s.activeVisitors, 0);

  return jsonResponse({
    totalActiveVisitors: totalActive,
    sites: siteData,
    timestamp: new Date().toISOString(),
  });
}

export const onRequest: PagesFunction<Env> = async (context) => {
  if (context.request.method === 'OPTIONS') return corsHeaders();

  const url = new URL(context.request.url);
  const path = url.pathname.replace('/api/analytics', '').replace(/^\/+/, '');

  switch (path) {
    case 'overview':
      return handleOverview(context.env, context.request);
    case 'sites':
      return handleSites();
    case 'realtime':
      return handleRealtime(context.env);
    case 'status':
      return jsonResponse({
        service: 'analytics-hub',
        status: 'operational',
        umamiInstance: UMAMI_URL,
        trackedSites: Object.keys(SITE_IDS).length,
        features: ['overview', 'per-site', 'realtime'],
        timestamp: new Date().toISOString(),
      });
    default:
      return errorResponse(`Unknown endpoint: /api/analytics/${path}`, 404);
  }
};
