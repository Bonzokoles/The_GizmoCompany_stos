/**
 * ZENO Browser — Storage Manager Worker
 * Browse and manage R2 buckets + KV namespaces
 *
 * Endpoints:
 *   GET  /api/storage/buckets         — List all R2 buckets
 *   GET  /api/storage/browse/:bucket  — List objects in a bucket
 *   GET  /api/storage/stats           — Storage usage summary
 *   GET  /api/storage/status          — Service health
 */

import type { Env } from '../../types';
import { jsonResponse, errorResponse, corsHeaders } from '../../types';

const R2_BUCKETS: Record<string, { description: string; category: string }> = {
  'jimbo77-community-images': { description: 'Jimbo77 community uploaded images', category: 'media' },
  'jimbo77com-assets': { description: 'Jimbo77.com static assets', category: 'assets' },
  'mybonzo-ai-models': { description: 'AI model files & weights', category: 'ai' },
  'mybonzo-analytics': { description: 'Analytics data exports', category: 'data' },
  'mybonzo-backups': { description: 'System backups', category: 'backups' },
  'mybonzo-blog-content': { description: 'Blog posts & articles', category: 'content' },
  'mybonzo-finanse': { description: 'Financial documents', category: 'data' },
  'mybonzo-media': { description: 'General media files', category: 'media' },
  'mybonzo-storage': { description: 'General purpose storage', category: 'general' },
  'mybonzo-videos': { description: 'Video content', category: 'media' },
  'pumo-raw-data': { description: 'Pumo product raw data', category: 'data' },
  'vibesdk-templates': { description: 'VibeSDK code templates', category: 'templates' },
  'zen-blog-images': { description: 'Zen Browser blog images', category: 'media' },
  'zen-static-assets': { description: 'Zen Browser static assets', category: 'assets' },
};

async function handleBuckets(): Promise<Response> {
  const buckets = Object.entries(R2_BUCKETS).map(([name, info]) => ({
    name,
    ...info,
  }));

  const categories = buckets.reduce(
    (acc, b) => {
      acc[b.category] = (acc[b.category] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return jsonResponse({
    buckets,
    totalBuckets: buckets.length,
    categories,
  });
}

async function handleBrowse(env: Env, request: Request, bucketName: string): Promise<Response> {
  if (!R2_BUCKETS[bucketName]) {
    return errorResponse(`Unknown bucket: ${bucketName}`, 404);
  }

  const url = new URL(request.url);
  const prefix = url.searchParams.get('prefix') || '';
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
  const cursor = url.searchParams.get('cursor') || undefined;

  // R2 buckets need to be bound in wrangler.toml to access directly
  // For now, return bucket metadata + CF API proxy approach
  const cfAccountId = env.CF_ACCOUNT_ID;
  const cfToken = env.CF_API_TOKEN;

  if (!cfAccountId || !cfToken) {
    return jsonResponse({
      bucket: bucketName,
      info: R2_BUCKETS[bucketName],
      objects: [],
      note: 'CF_ACCOUNT_ID/CF_API_TOKEN required for R2 API access',
      prefix,
      limit,
    });
  }

  try {
    const apiUrl = `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/r2/buckets/${bucketName}/objects?prefix=${encodeURIComponent(prefix)}&limit=${limit}${cursor ? `&cursor=${cursor}` : ''}`;
    const resp = await fetch(apiUrl, {
      headers: { Authorization: `Bearer ${cfToken}` },
      signal: AbortSignal.timeout(10000),
    });

    if (!resp.ok) {
      return jsonResponse({
        bucket: bucketName,
        info: R2_BUCKETS[bucketName],
        objects: [],
        error: `API returned ${resp.status}`,
        prefix,
      });
    }

    const data: any = await resp.json();
    return jsonResponse({
      bucket: bucketName,
      info: R2_BUCKETS[bucketName],
      objects: data.result || [],
      truncated: data.result_info?.truncated || false,
      cursor: data.result_info?.cursor,
      prefix,
    });
  } catch (e: any) {
    return errorResponse(`R2 browse error: ${e.message}`, 500);
  }
}

async function handleStats(env: Env): Promise<Response> {
  const cfAccountId = env.CF_ACCOUNT_ID;
  const cfToken = env.CF_API_TOKEN;

  const bucketList = Object.entries(R2_BUCKETS).map(([name, info]) => ({
    name,
    ...info,
  }));

  if (!cfAccountId || !cfToken) {
    return jsonResponse({
      buckets: bucketList,
      totalBuckets: bucketList.length,
      note: 'CF credentials needed for detailed stats',
    });
  }

  return jsonResponse({
    buckets: bucketList,
    totalBuckets: bucketList.length,
    categories: bucketList.reduce(
      (acc, b) => {
        acc[b.category] = (acc[b.category] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    ),
    timestamp: new Date().toISOString(),
  });
}

export const onRequest: PagesFunction<Env> = async (context) => {
  if (context.request.method === 'OPTIONS') return corsHeaders();

  const url = new URL(context.request.url);
  const path = url.pathname.replace('/api/storage', '').replace(/^\/+/, '');

  if (path === 'buckets') return handleBuckets();
  if (path === 'stats') return handleStats(context.env);
  if (path === 'status') {
    return jsonResponse({
      service: 'storage-manager',
      status: 'operational',
      totalBuckets: Object.keys(R2_BUCKETS).length,
      features: ['list-buckets', 'browse', 'stats'],
      timestamp: new Date().toISOString(),
    });
  }

  // /api/storage/browse/:bucketName
  if (path.startsWith('browse/')) {
    const bucketName = path.replace('browse/', '').split('/')[0];
    return handleBrowse(context.env, context.request, bucketName);
  }

  return errorResponse(`Unknown endpoint: /api/storage/${path}`, 404);
};
