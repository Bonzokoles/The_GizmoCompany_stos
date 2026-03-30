/**
 * ZENO Browser — WebGate Worker
 * Cloudflare Workers-based web proxy/gateway
 * 
 * Endpoints:
 *   POST /api/webgate/fetch   — Fetch any URL through CF edge (anti-CORS)
 *   POST /api/webgate/scrape  — Extract text/links/meta from a URL
 *   GET  /api/webgate/status  — Gateway health check
 */

import type { Env } from '../../types';
import { jsonResponse, errorResponse, corsHeaders } from '../../types';

const MAX_FETCH_SIZE = 5 * 1024 * 1024; // 5MB limit
const FETCH_TIMEOUT = 15_000; // 15s

const BLOCKED_HOSTS = [
  'localhost', '127.0.0.1', '0.0.0.0', '::1',
  '169.254.169.254', // AWS metadata
  'metadata.google.internal',
];

function isBlockedUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (BLOCKED_HOSTS.some(h => parsed.hostname === h || parsed.hostname.endsWith('.' + h))) return true;
    if (['file:', 'javascript:', 'data:', 'vbscript:'].includes(parsed.protocol)) return true;
    // Block private IP ranges (SSRF protection)
    const parts = parsed.hostname.split('.');
    if (parts[0] === '10') return true;
    if (parts[0] === '172' && +parts[1] >= 16 && +parts[1] <= 31) return true;
    if (parts[0] === '192' && parts[1] === '168') return true;
    return false;
  } catch {
    return true;
  }
}

async function handleFetch(request: Request, env: Env): Promise<Response> {
  const body = await request.json() as { url: string; method?: string; headers?: Record<string, string> };

  if (!body.url || typeof body.url !== 'string') {
    return errorResponse('Missing or invalid "url" field', 400);
  }

  if (isBlockedUrl(body.url)) {
    return errorResponse('URL blocked by security policy', 403);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  try {
    const resp = await fetch(body.url, {
      method: body.method || 'GET',
      headers: {
        'User-Agent': 'ZENO-WebGate/1.0 (https://zenbrowsers.org)',
        ...(body.headers || {}),
      },
      signal: controller.signal,
      redirect: 'follow',
    });

    clearTimeout(timeout);

    const contentType = resp.headers.get('content-type') || '';
    const contentLength = parseInt(resp.headers.get('content-length') || '0', 10);

    if (contentLength > MAX_FETCH_SIZE) {
      return errorResponse(`Response too large: ${contentLength} bytes (max ${MAX_FETCH_SIZE})`, 413);
    }

    const content = await resp.text();

    return jsonResponse({
      url: body.url,
      status: resp.status,
      statusText: resp.statusText,
      contentType,
      contentLength: content.length,
      headers: Object.fromEntries(
        [...resp.headers.entries()].filter(([k]) =>
          ['content-type', 'content-length', 'last-modified', 'etag', 'cache-control'].includes(k.toLowerCase())
        )
      ),
      body: content.slice(0, MAX_FETCH_SIZE),
      fetchedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') {
      return errorResponse('Fetch timeout exceeded', 504);
    }
    return errorResponse(`Fetch failed: ${err.message}`, 502);
  }
}

async function handleScrape(request: Request, env: Env): Promise<Response> {
  const body = await request.json() as {
    url: string;
    extract?: ('text' | 'links' | 'meta' | 'headers' | 'images')[];
  };

  if (!body.url || typeof body.url !== 'string') {
    return errorResponse('Missing "url" field', 400);
  }

  if (isBlockedUrl(body.url)) {
    return errorResponse('URL blocked by security policy', 403);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  try {
    const resp = await fetch(body.url, {
      headers: { 'User-Agent': 'ZENO-WebGate/1.0 (https://zenbrowsers.org)' },
      signal: controller.signal,
    });

    clearTimeout(timeout);
    const html = await resp.text();
    const extract = body.extract || ['text', 'links', 'meta'];
    const result: Record<string, unknown> = { url: body.url, status: resp.status };

    if (extract.includes('text')) {
      // Strip tags for plain text
      result.text = html
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 50_000);
    }

    if (extract.includes('links')) {
      const linkRegex = /href=["']([^"']+)["']/gi;
      const links: string[] = [];
      let match;
      while ((match = linkRegex.exec(html)) !== null && links.length < 200) {
        try {
          const resolved = new URL(match[1], body.url).href;
          if (resolved.startsWith('http')) links.push(resolved);
        } catch { /* skip invalid URLs */ }
      }
      result.links = [...new Set(links)];
    }

    if (extract.includes('meta')) {
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
      const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
      result.meta = {
        title: titleMatch?.[1]?.trim() || '',
        description: descMatch?.[1]?.trim() || '',
        ogImage: ogImageMatch?.[1]?.trim() || '',
      };
    }

    if (extract.includes('headers')) {
      result.headers = Object.fromEntries(resp.headers.entries());
    }

    if (extract.includes('images')) {
      const imgRegex = /src=["']([^"']+\.(png|jpg|jpeg|gif|svg|webp)[^"']*)["']/gi;
      const images: string[] = [];
      let imgMatch;
      while ((imgMatch = imgRegex.exec(html)) !== null && images.length < 100) {
        try {
          images.push(new URL(imgMatch[1], body.url).href);
        } catch { /* skip */ }
      }
      result.images = [...new Set(images)];
    }

    result.scrapedAt = new Date().toISOString();
    return jsonResponse(result);
  } catch (err: any) {
    clearTimeout(timeout);
    return errorResponse(`Scrape failed: ${err.message}`, 502);
  }
}

export const onRequest: PagesFunction<Env> = async (context) => {
  if (context.request.method === 'OPTIONS') return corsHeaders();

  const url = new URL(context.request.url);
  const path = url.pathname.replace('/api/webgate/', '');

  switch (path) {
    case 'fetch':
      if (context.request.method !== 'POST') return errorResponse('POST required', 405);
      return handleFetch(context.request, context.env);

    case 'scrape':
      if (context.request.method !== 'POST') return errorResponse('POST required', 405);
      return handleScrape(context.request, context.env);

    case 'status':
      return jsonResponse({
        service: 'WebGate',
        status: 'operational',
        version: '1.0.0',
        features: ['fetch', 'scrape', 'text-extract', 'link-extract', 'meta-extract'],
        limits: { maxSize: MAX_FETCH_SIZE, timeout: FETCH_TIMEOUT },
        timestamp: new Date().toISOString(),
      });

    default:
      return errorResponse('Unknown WebGate endpoint', 404);
  }
};
