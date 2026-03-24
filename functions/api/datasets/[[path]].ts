/**
 * ZENO Browser — Datasets API (public, read-only)
 * Serves JSON datasets from R2 bucket zen-static-assets/datasets/
 *
 * Endpoints:
 *   GET /api/datasets/list          — List available datasets
 *   GET /api/datasets/:filename     — Get dataset JSON content
 */

import type { Env } from '../../types';

const CORS: HeadersInit = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const DATASETS_PREFIX = 'datasets/';

const DATASET_META: Record<string, { name: string; cat: string; desc: string; icon: string }> = {
  'b2b-sales-data.json': { name: 'B2B Sales Data', cat: 'business', desc: 'Dane sprzeda\u017cowe B2B \u2014 produkty, sprzedawcy, autorytety, konkurencja', icon: '\uD83D\uDCBC' },
  'ecommerce-chatbot-training.json': { name: 'E-commerce Chatbot', cat: 'business', desc: 'Dane treningowe chatbota e-commerce \u2014 instrukcje i odpowiedzi', icon: '\uD83E\uDD16' },
  'ecommerce-support-qa.json': { name: 'E-commerce Support QA', cat: 'business', desc: 'Pytania i odpowiedzi supportu e-commerce', icon: '\uD83D\uDED2' },
  'financial-sentiment.json': { name: 'Financial Sentiment', cat: 'business', desc: 'Analiza sentymentu tekst\u00f3w finansowych', icon: '\uD83D\uDCC8' },
  'financial-tweets-sentiment.json': { name: 'Financial Tweets', cat: 'business', desc: 'Sentyment tweet\u00f3w finansowych', icon: '\uD83D\uDC26' },
  'midjourney-detailed-prompts.json': { name: 'Midjourney Detailed Prompts', cat: 'art', desc: 'Szczeg\u00f3\u0142owe prompty Midjourney z obrazami', icon: '\uD83C\uDFA8' },
  'midjourney-prompts.json': { name: 'Midjourney Prompts', cat: 'art', desc: 'Kolekcja prompt\u00f3w do Midjourney', icon: '\u2728' },
  'sd-prompts.json': { name: 'Stable Diffusion Prompts', cat: 'art', desc: 'Prompty do Stable Diffusion', icon: '\uD83D\uDDBC\uFE0F' },
  'sdxl-prompts.json': { name: 'SDXL Prompts', cat: 'art', desc: 'Prompty do SDXL', icon: '\u26A1' },
};

export const onRequest: PagesFunction<Env> = async (context) => {
  if (context.request.method === 'OPTIONS') {
    return new Response(null, { headers: CORS });
  }
  if (context.request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { ...CORS, 'Content-Type': 'application/json' } });
  }

  const url = new URL(context.request.url);
  const segments = context.params.path as string[];
  const route = segments.join('/');

  // GET /api/datasets/list — list all available datasets
  if (route === 'list') {
    const list = Object.entries(DATASET_META).map(([file, meta]) => ({
      id: file.replace('.json', ''),
      file,
      ...meta,
    }));
    return new Response(JSON.stringify({ datasets: list, total: list.length }), {
      headers: { ...CORS, 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600' },
    });
  }

  // GET /api/datasets/:filename — serve dataset from R2
  const filename = route.endsWith('.json') ? route : route + '.json';

  // Security: only allow known dataset files
  if (!DATASET_META[filename]) {
    return new Response(JSON.stringify({ error: 'Dataset not found', available: Object.keys(DATASET_META) }), {
      status: 404, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  try {
    const obj = await context.env.STATIC_ASSETS.get(DATASETS_PREFIX + filename);
    if (!obj) {
      return new Response(JSON.stringify({ error: 'Dataset file not in storage' }), {
        status: 404, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    return new Response(obj.body, {
      headers: {
        ...CORS,
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=86400',
        'ETag': obj.httpEtag,
      },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: 'Storage error', message: e.message }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
};
