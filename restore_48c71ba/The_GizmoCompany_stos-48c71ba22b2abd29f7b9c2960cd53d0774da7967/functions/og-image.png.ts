/**
 * ZENO Browser — OG Image Generator
 * CF Pages Function: GET /og-image.png
 *
 * Generuje grafikę Open Graph (1200×630) przez CF Workers AI (SDXL).
 * Przy błędzie AI zwraca elegancki SVG jako fallback.
 *
 * Cache: CF CDN buforuje wynik przez 24 h (s-maxage=86400).
 * Regeneracja: dodaj ?refresh=1 (omija cache przeglądarki, CF CDN nie).
 */

import type { Env } from './api/types';

// ── SVG fallback (gdy AI nie odpowie) ────────────────────────────────────────
function buildFallbackSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%"   stop-color="#0a0e1a"/>
      <stop offset="50%"  stop-color="#0f3460"/>
      <stop offset="100%" stop-color="#16213e"/>
    </linearGradient>
    <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%"   stop-color="#64ffda"/>
      <stop offset="100%" stop-color="#00bcd4"/>
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="4" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="1200" height="630" fill="url(#bg)"/>

  <!-- Grid pattern -->
  <g opacity="0.08" stroke="#64ffda" stroke-width="1">
    <line x1="0" y1="105" x2="1200" y2="105"/>
    <line x1="0" y1="210" x2="1200" y2="210"/>
    <line x1="0" y1="315" x2="1200" y2="315"/>
    <line x1="0" y1="420" x2="1200" y2="420"/>
    <line x1="0" y1="525" x2="1200" y2="525"/>
    <line x1="200" y1="0" x2="200" y2="630"/>
    <line x1="400" y1="0" x2="400" y2="630"/>
    <line x1="600" y1="0" x2="600" y2="630"/>
    <line x1="800" y1="0" x2="800" y2="630"/>
    <line x1="1000" y1="0" x2="1000" y2="630"/>
  </g>

  <!-- Glow circles -->
  <circle cx="900" cy="150" r="180" fill="#64ffda" opacity="0.04"/>
  <circle cx="200" cy="480" r="140" fill="#0f3460" opacity="0.3"/>

  <!-- Top accent bar -->
  <rect x="0" y="0" width="1200" height="4" fill="url(#accent)"/>

  <!-- Browser icon (stylized) -->
  <g transform="translate(90, 200)">
    <circle cx="80" cy="80" r="70" fill="none" stroke="url(#accent)" stroke-width="3" filter="url(#glow)"/>
    <line x1="80" y1="10" x2="80" y2="150" stroke="#64ffda" stroke-width="2" opacity="0.6"/>
    <line x1="10" y1="80" x2="150" y2="80" stroke="#64ffda" stroke-width="2" opacity="0.6"/>
    <ellipse cx="80" cy="80" rx="30" ry="70" fill="none" stroke="#64ffda" stroke-width="1.5" opacity="0.4"/>
    <circle cx="80" cy="80" r="12" fill="#64ffda" opacity="0.9" filter="url(#glow)"/>
  </g>

  <!-- Main title -->
  <text x="260" y="265" font-family="'Segoe UI', Arial, sans-serif" font-size="86"
        font-weight="700" fill="white" letter-spacing="-2">
    ZENO
  </text>
  <text x="260" y="335" font-family="'Segoe UI', Arial, sans-serif" font-size="46"
        font-weight="300" fill="#64ffda" letter-spacing="8">
    BROWSER
  </text>

  <!-- Tagline -->
  <text x="260" y="405" font-family="'Segoe UI', Arial, sans-serif" font-size="24"
        fill="#8892b0" letter-spacing="1">
    Przeglądarka z AI · MCP · Cloudflare
  </text>

  <!-- Feature pills -->
  <g transform="translate(260, 440)">
    <!-- Pill 1 -->
    <rect x="0" y="0" width="130" height="36" rx="18" fill="#0f3460" stroke="#64ffda" stroke-width="1"/>
    <text x="65" y="23" font-family="Arial, sans-serif" font-size="14" fill="#64ffda" text-anchor="middle">Workers AI</text>
    <!-- Pill 2 -->
    <rect x="145" y="0" width="100" height="36" rx="18" fill="#0f3460" stroke="#64ffda" stroke-width="1"/>
    <text x="195" y="23" font-family="Arial, sans-serif" font-size="14" fill="#64ffda" text-anchor="middle">MCP Tools</text>
    <!-- Pill 3 -->
    <rect x="260" y="0" width="130" height="36" rx="18" fill="#0f3460" stroke="#64ffda" stroke-width="1"/>
    <text x="325" y="23" font-family="Arial, sans-serif" font-size="14" fill="#64ffda" text-anchor="middle">Open Source</text>
    <!-- Pill 4 -->
    <rect x="405" y="0" width="120" height="36" rx="18" fill="#0f3460" stroke="#64ffda" stroke-width="1"/>
    <text x="465" y="23" font-family="Arial, sans-serif" font-size="14" fill="#64ffda" text-anchor="middle">38 Workers</text>
  </g>

  <!-- URL bottom right -->
  <text x="1110" y="590" font-family="'Segoe UI', Arial, sans-serif" font-size="20"
        fill="#64ffda" text-anchor="end" opacity="0.8">
    zenbrowsers.org
  </text>

  <!-- Bottom accent bar -->
  <rect x="0" y="626" width="1200" height="4" fill="url(#accent)"/>
</svg>`;
}

// ── Main handler ──────────────────────────────────────────────────────────────
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env, request } = context;

  // Serve conditional GET (ETag / If-None-Match)
  const etag = '"zeno-og-v2"';
  if (request.headers.get('if-none-match') === etag) {
    return new Response(null, { status: 304 });
  }

  const commonHeaders = {
    'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
    ETag: etag,
    'Access-Control-Allow-Origin': '*',
  };

  // ── Try CF Workers AI (SDXL Lightning — fastest) ──────────────────────────
  if (env.AI) {
    try {
      const result = await (env.AI as any).run(
        '@cf/bytedance/stable-diffusion-xl-lightning',
        {
          prompt:
            'ZENO browser app, dark futuristic UI, glowing teal cyan accents, ' +
            'deep navy blue background, abstract browser interface, AI powered, ' +
            'professional tech product banner, clean minimalist, ' +
            '1200x630 wide aspect ratio, high quality render',
          negative_prompt: 'text, words, letters, watermark, blurry, low quality',
          width: 1024,
          height: 576,
          num_steps: 4,
          guidance: 7.5,
        }
      );

      // Workers AI returns ReadableStream<Uint8Array> or Uint8Array
      const body = result instanceof ReadableStream ? result : new Response(result).body;

      return new Response(body, {
        headers: {
          ...commonHeaders,
          'Content-Type': 'image/png',
          'X-Generator': 'cf-workers-ai-sdxl-lightning',
        },
      });
    } catch (err) {
      // AI failed — fall through to SVG fallback
      console.error('[og-image] CF AI error:', err);
    }
  }

  // ── Fallback: SVG (served as image/svg+xml) ───────────────────────────────
  // Note: SVG og:images work on Discord, Slack, LinkedIn.
  // For Twitter/Facebook PNG is required — use the /api/images/generate endpoint
  // or set up a Replicate secret (REPLICATE_API_TOKEN) in CF dashboard.
  const svg = buildFallbackSvg();

  return new Response(svg, {
    headers: {
      ...commonHeaders,
      'Content-Type': 'image/svg+xml',
      'X-Generator': 'svg-fallback',
    },
  });
};
