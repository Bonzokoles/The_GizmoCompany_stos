/**
 * ZENO Browser — Images API Worker
 * AI image generation + R2 image management
 *
 * Endpoints:
 *   POST /api/images/generate     — Generate image via CF AI or Replicate
 *   GET  /api/images/gallery      — Browse images from R2 buckets
 *   POST /api/images/optimize     — Image optimization info
 *   GET  /api/images/status       — Service health
 */

import type { Env } from '../../types';
import { jsonResponse, errorResponse, corsHeaders } from '../../types';

const IMAGE_BUCKETS = ['zen-blog-images', 'zen-static-assets', 'jimbo77-community-images', 'mybonzo-media'];

async function handleGenerate(env: Env, request: Request): Promise<Response> {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }

  const { prompt, style, width, height, model } = body;
  if (!prompt) return errorResponse('Prompt is required', 400);

  const imgWidth = Math.min(width || 1024, 2048);
  const imgHeight = Math.min(height || 1024, 2048);

  // Try Cloudflare Workers AI (via account API)
  const cfAccountId = env.CF_ACCOUNT_ID;
  const cfToken = env.CF_API_TOKEN;

  if (cfAccountId && cfToken) {
    try {
      const aiModel = model || '@cf/stabilityai/stable-diffusion-xl-base-1.0';
      const resp = await fetch(`https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/ai/run/${aiModel}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${cfToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: style ? `${prompt}, ${style} style` : prompt,
          width: imgWidth,
          height: imgHeight,
        }),
        signal: AbortSignal.timeout(60000),
      });

      if (resp.ok) {
        const imageData = await resp.arrayBuffer();
        return new Response(imageData, {
          headers: {
            'Content-Type': 'image/png',
            'Access-Control-Allow-Origin': '*',
            'X-Generator': 'cloudflare-ai',
            'X-Model': aiModel,
          },
        });
      }
    } catch {}
  }

  // Fallback: Return generation parameters (client can use external service)
  return jsonResponse({
    status: 'pending',
    prompt,
    style: style || 'default',
    dimensions: { width: imgWidth, height: imgHeight },
    note: 'Image generation requires CF_ACCOUNT_ID and CF_API_TOKEN with Workers AI access',
    availableModels: [
      '@cf/stabilityai/stable-diffusion-xl-base-1.0',
      '@cf/bytedance/stable-diffusion-xl-lightning',
      '@cf/lykon/dreamshaper-8-lcm',
    ],
  });
}

async function handleGallery(env: Env, request: Request): Promise<Response> {
  const url = new URL(request.url);
  const bucket = url.searchParams.get('bucket') || 'zen-blog-images';
  const prefix = url.searchParams.get('prefix') || '';
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 50);

  if (!IMAGE_BUCKETS.includes(bucket)) {
    return errorResponse(`Invalid image bucket. Available: ${IMAGE_BUCKETS.join(', ')}`, 400);
  }

  const cfAccountId = env.CF_ACCOUNT_ID;
  const cfToken = env.CF_API_TOKEN;

  if (!cfAccountId || !cfToken) {
    return jsonResponse({
      bucket,
      images: [],
      availableBuckets: IMAGE_BUCKETS,
      note: 'CF credentials needed for R2 access',
    });
  }

  try {
    const resp = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/r2/buckets/${bucket}/objects?prefix=${encodeURIComponent(prefix)}&limit=${limit}`,
      {
        headers: { Authorization: `Bearer ${cfToken}` },
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!resp.ok) {
      return jsonResponse({ bucket, images: [], error: `R2 API: ${resp.status}` });
    }

    const data: any = await resp.json();
    const objects = (data.result || []).filter((obj: any) => {
      const key = obj.key?.toLowerCase() || '';
      return key.endsWith('.png') || key.endsWith('.jpg') || key.endsWith('.jpeg') || key.endsWith('.webp') || key.endsWith('.gif') || key.endsWith('.svg');
    });

    return jsonResponse({
      bucket,
      images: objects.map((obj: any) => ({
        key: obj.key,
        size: obj.size,
        uploaded: obj.uploaded,
      })),
      totalImages: objects.length,
      prefix,
    });
  } catch (e: any) {
    return errorResponse(`Gallery error: ${e.message}`, 500);
  }
}

async function handleOptimize(request: Request): Promise<Response> {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }

  const { url: imageUrl, format, quality, width } = body;
  if (!imageUrl) return errorResponse('Image URL required', 400);

  // Cloudflare Image Resizing via URL format
  const cfImageUrl = `https://zenbrowsers.org/cdn-cgi/image/format=${format || 'webp'},quality=${quality || 80}${width ? `,width=${width}` : ''}/${imageUrl}`;

  return jsonResponse({
    originalUrl: imageUrl,
    optimizedUrl: cfImageUrl,
    settings: {
      format: format || 'webp',
      quality: quality || 80,
      width: width || 'auto',
    },
    note: 'Image resizing requires Cloudflare Pro plan or higher',
  });
}

export const onRequest: PagesFunction<Env> = async (context) => {
  if (context.request.method === 'OPTIONS') return corsHeaders();

  const url = new URL(context.request.url);
  const path = url.pathname.replace('/api/images', '').replace(/^\/+/, '');

  if (context.request.method === 'POST') {
    if (path === 'generate') return handleGenerate(context.env, context.request);
    if (path === 'optimize') return handleOptimize(context.request);
  }

  if (path === 'gallery') return handleGallery(context.env, context.request);

  if (path === 'status') {
    return jsonResponse({
      service: 'images-api',
      status: 'operational',
      features: ['ai-generation', 'gallery-browse', 'optimization'],
      imageBuckets: IMAGE_BUCKETS,
      supportedFormats: ['png', 'jpg', 'webp', 'gif', 'svg'],
      aiModels: [
        '@cf/stabilityai/stable-diffusion-xl-base-1.0',
        '@cf/bytedance/stable-diffusion-xl-lightning',
        '@cf/lykon/dreamshaper-8-lcm',
      ],
      timestamp: new Date().toISOString(),
    });
  }

  return errorResponse(`Unknown endpoint: /api/images/${path}`, 404);
};
