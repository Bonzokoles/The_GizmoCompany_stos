/**
 * ZENO Browser — Search API Worker
 * Meta-search routing via SearXNG + AI-powered analysis
 *
 * Endpoints:
 *   POST /api/search/query     — Run a search query (meta-search)
 *   POST /api/search/analyze   — Search + AI analysis of results
 *   GET  /api/search/engines   — List available search engines
 *   GET  /api/search/status    — Service health
 */

import type { Env } from '../../types';
import { jsonResponse, errorResponse, corsHeaders } from '../../types';

const SEARXNG_INSTANCE = 'https://search.mybonzo.com'; // SearXNG instance — update if needed

interface SearchRequest {
  query: string;
  engines?: string[];
  categories?: string[];
  language?: string;
  page?: number;
  limit?: number;
}

interface SearchResult {
  title: string;
  url: string;
  content: string;
  engine: string;
  score?: number;
}

async function searchSearXNG(params: SearchRequest): Promise<SearchResult[]> {
  const url = new URL(`${SEARXNG_INSTANCE}/search`);
  url.searchParams.set('q', params.query);
  url.searchParams.set('format', 'json');
  if (params.language) url.searchParams.set('language', params.language);
  if (params.engines?.length) url.searchParams.set('engines', params.engines.join(','));
  if (params.categories?.length) url.searchParams.set('categories', params.categories.join(','));
  if (params.page) url.searchParams.set('pageno', String(params.page));

  const resp = await fetch(url.toString(), {
    headers: { 'User-Agent': 'ZENO-Search/1.0', Accept: 'application/json' },
    signal: AbortSignal.timeout(15_000),
  });

  if (!resp.ok) {
    throw new Error(`SearXNG returned ${resp.status}`);
  }

  const data = (await resp.json()) as { results?: SearchResult[] };
  const results = (data.results || []).slice(0, params.limit || 20);

  return results.map((r) => ({
    title: r.title || '',
    url: r.url || '',
    content: r.content || '',
    engine: r.engine || 'unknown',
    score: r.score,
  }));
}

async function handleQuery(request: Request): Promise<Response> {
  const body = (await request.json()) as SearchRequest;

  if (!body.query || typeof body.query !== 'string' || body.query.trim().length === 0) {
    return errorResponse('Missing "query" field', 400);
  }

  if (body.query.length > 2000) {
    return errorResponse('Query too long (max 2000 chars)', 400);
  }

  try {
    const results = await searchSearXNG(body);
    return jsonResponse({
      query: body.query,
      results,
      total: results.length,
      engine: 'searxng',
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return errorResponse(`Search failed: ${err.message}`, 502);
  }
}

async function handleAnalyze(request: Request, env: Env): Promise<Response> {
  const body = (await request.json()) as SearchRequest & { systemPrompt?: string };

  if (!body.query || typeof body.query !== 'string') {
    return errorResponse('Missing "query" field', 400);
  }

  // Step 1: Run search
  let results: SearchResult[];
  try {
    results = await searchSearXNG({ ...body, limit: 10 });
  } catch (err: any) {
    return errorResponse(`Search step failed: ${err.message}`, 502);
  }

  if (results.length === 0) {
    return jsonResponse({ query: body.query, analysis: 'No results found.', results: [], timestamp: new Date().toISOString() });
  }

  // Step 2: Build summary for AI
  const snippets = results
    .slice(0, 8)
    .map((r, i) => `[${i + 1}] ${r.title}\n${r.url}\n${r.content}`)
    .join('\n\n');

  const aiPrompt = `Analyze these search results for the query "${body.query}" and provide a concise, helpful summary in the language of the query:\n\n${snippets}\n\nProvide a structured answer based on the sources above. Cite source numbers [n].`;

  // Step 3: Call AI Gate internally
  const apiKey = env.DEEPSEEK_API_KEY || env.OPENROUTER_API_KEY;
  const isOpenRouter = !env.DEEPSEEK_API_KEY && !!env.OPENROUTER_API_KEY;
  const endpoint = isOpenRouter
    ? 'https://openrouter.ai/api/v1/chat/completions'
    : 'https://api.deepseek.com/v1/chat/completions';

  if (!apiKey) {
    return jsonResponse({
      query: body.query,
      analysis: null,
      note: 'AI analysis unavailable — no API key configured. Returning raw results.',
      results,
      timestamp: new Date().toISOString(),
    });
  }

  try {
    const aiResp = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        ...(isOpenRouter ? { 'HTTP-Referer': 'https://zenbrowsers.org', 'X-Title': 'ZENO Search' } : {}),
      },
      body: JSON.stringify({
        model: isOpenRouter ? 'deepseek/deepseek-r1' : 'deepseek-chat',
        messages: [
          { role: 'system', content: body.systemPrompt || 'You are a helpful search assistant. Always cite sources.' },
          { role: 'user', content: aiPrompt },
        ],
        temperature: 0.4,
        max_tokens: 2048,
      }),
    });

    if (!aiResp.ok) {
      return jsonResponse({ query: body.query, analysis: null, note: 'AI analysis failed — returning raw results.', results, timestamp: new Date().toISOString() });
    }

    const aiData = (await aiResp.json()) as any;
    const analysis = aiData.choices?.[0]?.message?.content || 'No analysis generated.';

    return jsonResponse({
      query: body.query,
      analysis,
      results,
      total: results.length,
      timestamp: new Date().toISOString(),
    });
  } catch {
    return jsonResponse({ query: body.query, analysis: null, note: 'AI analysis unavailable.', results, timestamp: new Date().toISOString() });
  }
}

export const onRequest: PagesFunction<Env> = async (context) => {
  if (context.request.method === 'OPTIONS') return corsHeaders();

  const url = new URL(context.request.url);
  const path = url.pathname.replace('/api/search/', '');

  switch (path) {
    case 'query':
      if (context.request.method !== 'POST') return errorResponse('POST required', 405);
      return handleQuery(context.request);

    case 'analyze':
      if (context.request.method !== 'POST') return errorResponse('POST required', 405);
      return handleAnalyze(context.request, context.env);

    case 'engines':
      return jsonResponse({
        primary: 'searxng',
        instance: SEARXNG_INSTANCE,
        features: ['meta-search', 'ai-analysis', 'multi-engine', 'multi-language'],
        supportedCategories: ['general', 'images', 'news', 'science', 'files', 'social media'],
      });

    case 'status':
      return jsonResponse({
        service: 'Search API',
        status: 'operational',
        version: '1.0.0',
        engine: 'searxng',
        aiAnalysis: true,
        timestamp: new Date().toISOString(),
      });

    default:
      return errorResponse('Unknown search endpoint', 404);
  }
};
