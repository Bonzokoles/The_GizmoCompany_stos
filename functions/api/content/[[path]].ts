/**
 * ZENO Browser — Content Pipeline + CMS Worker
 * Routes to MOA Orchestrator, AI Content Creator, SEO optimizer
 * + Full CMS: articles CRUD, image upload, publish/unpublish
 *
 * Endpoints:
 *   POST /api/content/generate       — Generate content via MOA pipeline
 *   POST /api/content/seo            — SEO analysis & optimization
 *   POST /api/content/translate      — AI translation (PL/EN)
 *   POST /api/content/summarize      — Summarize text/URL
 *   POST /api/content/publish        — Publish article to D1
 *   POST /api/content/unpublish      — Unpublish (archive) article
 *   POST /api/content/upload-image   — Upload image (base64 → store)
 *   GET  /api/content/articles       — List published articles
 *   GET  /api/content/article/:slug  — Get single article by slug
 *   GET  /api/content/status         — Service health
 */

import type { Env } from '../../types';
import { jsonResponse, errorResponse, corsHeaders } from '../../types';

async function aiChat(env: Env, systemPrompt: string, userMessage: string, maxTokens = 2048): Promise<string> {
  // Try DeepSeek first (cheapest)
  const providers = [
    { key: env.DEEPSEEK_API_KEY, url: 'https://api.deepseek.com/v1/chat/completions', model: 'deepseek-chat' },
    { key: env.OPENROUTER_API_KEY, url: 'https://openrouter.ai/api/v1/chat/completions', model: 'deepseek/deepseek-chat' },
  ];

  for (const provider of providers) {
    if (!provider.key) continue;
    try {
      const resp = await fetch(provider.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${provider.key}`,
        },
        body: JSON.stringify({
          model: provider.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
          ],
          max_tokens: maxTokens,
          temperature: 0.7,
        }),
        signal: AbortSignal.timeout(30000),
      });
      if (!resp.ok) continue;
      const data = (await resp.json()) as any;
      return data.choices?.[0]?.message?.content || '';
    } catch {
      continue;
    }
  }
  throw new Error('No AI provider available');
}

async function handleGenerate(request: Request, env: Env): Promise<Response> {
  const body = (await request.json()) as {
    topic: string;
    type?: 'article' | 'blog' | 'social' | 'email' | 'product';
    language?: 'pl' | 'en';
    tone?: string;
    length?: 'short' | 'medium' | 'long';
  };

  if (!body.topic) return errorResponse('Missing "topic" field');

  const type = body.type || 'article';
  const lang = body.language || 'pl';
  const tone = body.tone || 'professional';
  const maxTokens = body.length === 'short' ? 512 : body.length === 'long' ? 4096 : 2048;

  const systemPrompt = `Jesteś ekspertem content marketingu. Generujesz treści w języku ${lang === 'pl' ? 'polskim' : 'angielskim'}.
Typ: ${type}. Ton: ${tone}. Formatuj z nagłówkami Markdown.`;

  const content = await aiChat(env, systemPrompt, `Napisz ${type} na temat: ${body.topic}`, maxTokens);

  return jsonResponse({
    content,
    meta: { type, language: lang, tone, topic: body.topic },
    timestamp: new Date().toISOString(),
  });
}

async function handleSeo(request: Request, env: Env): Promise<Response> {
  const body = (await request.json()) as { text?: string; url?: string; keywords?: string[] };

  if (!body.text && !body.url) return errorResponse('Provide "text" or "url"');

  let text = body.text || '';
  if (body.url && !text) {
    try {
      const resp = await fetch(body.url, { signal: AbortSignal.timeout(10000) });
      text = await resp.text();
      // Strip HTML tags for analysis
      text = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').substring(0, 5000);
    } catch {
      return errorResponse('Failed to fetch URL');
    }
  }

  const systemPrompt = `Jesteś ekspertem SEO. Analizujesz tekst i dajesz konkretne rekomendacje.
Zwróć JSON z polami: score (0-100), title_suggestion, meta_description, keywords[], improvements[], readability_score.`;

  const analysis = await aiChat(env, systemPrompt, `Przeanalizuj SEO tego tekstu:\n${text.substring(0, 3000)}\n\nSłowa kluczowe: ${body.keywords?.join(', ') || 'auto-detect'}`);

  try {
    const parsed = JSON.parse(analysis);
    return jsonResponse({ analysis: parsed, timestamp: new Date().toISOString() });
  } catch {
    return jsonResponse({ analysis: { raw: analysis }, timestamp: new Date().toISOString() });
  }
}

async function handleTranslate(request: Request, env: Env): Promise<Response> {
  const body = (await request.json()) as { text: string; from?: string; to?: string };
  if (!body.text) return errorResponse('Missing "text"');

  const from = body.from || 'auto';
  const to = body.to || (from === 'pl' ? 'en' : 'pl');

  const result = await aiChat(
    env,
    `Jesteś profesjonalnym tłumaczem. Tłumacz z ${from} na ${to}. Zachowaj formatowanie.`,
    body.text,
    Math.min(body.text.length * 3, 4096)
  );

  return jsonResponse({ translation: result, from, to, timestamp: new Date().toISOString() });
}

async function handleSummarize(request: Request, env: Env): Promise<Response> {
  const body = (await request.json()) as { text?: string; url?: string; length?: 'brief' | 'detailed' };

  let text = body.text || '';
  if (body.url && !text) {
    try {
      const resp = await fetch(body.url, { signal: AbortSignal.timeout(10000) });
      text = await resp.text();
      text = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').substring(0, 8000);
    } catch {
      return errorResponse('Failed to fetch URL');
    }
  }
  if (!text) return errorResponse('Provide "text" or "url"');

  const detail = body.length === 'detailed' ? 'szczegółowe' : 'zwięzłe';
  const result = await aiChat(
    env,
    `Stwórz ${detail} podsumowanie tekstu. Użyj bullet points.`,
    text.substring(0, 6000),
    body.length === 'detailed' ? 2048 : 512
  );

  return jsonResponse({ summary: result, originalLength: text.length, timestamp: new Date().toISOString() });
}

// ═══════════════════════════════════════════════════════════
//  CMS: Articles CRUD + Image Upload
// ═══════════════════════════════════════════════════════════

/** Ensure articles table exists in D1 */
async function ensureArticlesTable(db: D1Database): Promise<void> {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS articles (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      excerpt TEXT DEFAULT '',
      cover_image TEXT,
      category TEXT DEFAULT 'general',
      tags TEXT DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'draft',
      language TEXT DEFAULT 'pl',
      author TEXT DEFAULT 'Jimbo',
      seo_title TEXT,
      seo_description TEXT,
      published_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `).run();

  await db.prepare(`
    CREATE TABLE IF NOT EXISTS article_images (
      id TEXT PRIMARY KEY,
      article_slug TEXT,
      file_name TEXT NOT NULL,
      data TEXT NOT NULL,
      mime_type TEXT DEFAULT 'image/png',
      size_bytes INTEGER DEFAULT 0,
      alt_text TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    )
  `).run();
}

/** Publish article from local → D1 */
async function handlePublish(request: Request, env: Env): Promise<Response> {
  try {
    const body = (await request.json()) as {
      title: string;
      slug: string;
      content: string;
      excerpt?: string;
      coverImage?: string;
      category?: string;
      tags?: string[];
      language?: string;
      author?: string;
      seoTitle?: string;
      seoDescription?: string;
    };

    if (!body.title || !body.slug) return errorResponse('Missing title or slug');

    if (!env.DB) return errorResponse('D1 database not bound', 500);

    await ensureArticlesTable(env.DB);

    const id = `art_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();

    // Upsert: if slug exists, update; else insert
    const existing = await env.DB.prepare('SELECT id FROM articles WHERE slug = ?').bind(body.slug).first();

    if (existing) {
      await env.DB.prepare(`
        UPDATE articles SET title = ?, content = ?, excerpt = ?, cover_image = ?,
          category = ?, tags = ?, language = ?, author = ?,
          seo_title = ?, seo_description = ?, status = 'published',
          published_at = ?, updated_at = ?
        WHERE slug = ?
      `).bind(
        body.title, body.content, body.excerpt || '', body.coverImage || null,
        body.category || 'general', JSON.stringify(body.tags || []),
        body.language || 'pl', body.author || 'Jimbo',
        body.seoTitle || body.title, body.seoDescription || '',
        now, now, body.slug
      ).run();

      return jsonResponse({ id: (existing as any).id, slug: body.slug, status: 'updated', publishedAt: now });
    }

    await env.DB.prepare(`
      INSERT INTO articles (id, title, slug, content, excerpt, cover_image, category, tags, status, language, author, seo_title, seo_description, published_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'published', ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, body.title, body.slug, body.content, body.excerpt || '',
      body.coverImage || null, body.category || 'general',
      JSON.stringify(body.tags || []), body.language || 'pl',
      body.author || 'Jimbo', body.seoTitle || body.title,
      body.seoDescription || '', now, now, now
    ).run();

    return jsonResponse({ id, slug: body.slug, status: 'published', publishedAt: now });
  } catch (err: any) {
    return errorResponse(`Publish failed: ${err.message}`, 500);
  }
}

/** Unpublish (archive) article */
async function handleUnpublish(request: Request, env: Env): Promise<Response> {
  try {
    const body = (await request.json()) as { slug: string };
    if (!body.slug) return errorResponse('Missing slug');

    if (!env.DB) return errorResponse('D1 database not bound', 500);

    await ensureArticlesTable(env.DB);
    await env.DB.prepare("UPDATE articles SET status = 'archived', updated_at = ? WHERE slug = ?")
      .bind(new Date().toISOString(), body.slug).run();

    return jsonResponse({ slug: body.slug, status: 'archived' });
  } catch (err: any) {
    return errorResponse(`Unpublish failed: ${err.message}`, 500);
  }
}

/** Upload image (base64 → D1 storage for now, R2 when enabled) */
async function handleUploadImage(request: Request, env: Env): Promise<Response> {
  try {
    const body = (await request.json()) as {
      fileName: string;
      base64: string;
      mimeType?: string;
      articleSlug?: string;
      altText?: string;
    };

    if (!body.fileName || !body.base64) return errorResponse('Missing fileName or base64');

    // Validate base64 size (max 5MB)
    const sizeBytes = Math.ceil(body.base64.length * 3 / 4);
    if (sizeBytes > 5 * 1024 * 1024) return errorResponse('Image too large (max 5MB)');

    if (!env.DB) return errorResponse('D1 database not bound', 500);

    await ensureArticlesTable(env.DB);

    const id = `img_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    await env.DB.prepare(`
      INSERT INTO article_images (id, article_slug, file_name, data, mime_type, size_bytes, alt_text)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, body.articleSlug || null, body.fileName,
      body.base64, body.mimeType || 'image/png', sizeBytes,
      body.altText || ''
    ).run();

    // Return a URL that can be used to fetch the image
    const url = `https://zenbrowsers.org/api/content/image/${id}`;

    return jsonResponse({ id, url, fileName: body.fileName, size: sizeBytes });
  } catch (err: any) {
    return errorResponse(`Upload failed: ${err.message}`, 500);
  }
}

/** Get image by ID (serve base64 as actual image) */
async function handleGetImage(imageId: string, env: Env): Promise<Response> {
  try {
    if (!env.DB) return errorResponse('D1 database not bound', 500);
    await ensureArticlesTable(env.DB);
    const img = await env.DB.prepare('SELECT data, mime_type, file_name FROM article_images WHERE id = ?')
      .bind(imageId).first() as any;

    if (!img) return errorResponse('Image not found', 404);

    const binary = Uint8Array.from(atob(img.data), c => c.charCodeAt(0));

    return new Response(binary, {
      headers: {
        'Content-Type': img.mime_type || 'image/png',
        'Content-Disposition': `inline; filename="${img.file_name}"`,
        'Cache-Control': 'public, max-age=31536000',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err: any) {
    return errorResponse(`Get image failed: ${err.message}`, 500);
  }
}

/** List all published articles */
async function handleListArticles(request: Request, env: Env): Promise<Response> {
  try {
    if (!env.DB) return errorResponse('D1 database not bound', 500);
    const url = new URL(request.url);
    const status = url.searchParams.get('status') || 'published';
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);

    await ensureArticlesTable(env.DB);
    const { results } = await env.DB.prepare(
      'SELECT id, title, slug, excerpt, cover_image, category, tags, status, language, author, published_at, created_at, updated_at FROM articles WHERE status = ? ORDER BY published_at DESC LIMIT ?'
    ).bind(status, limit).all();

    const articles = (results || []).map((a: any) => ({
      ...a,
      tags: (() => { try { return JSON.parse(a.tags); } catch { return []; } })(),
    }));

    return jsonResponse({ articles, count: articles.length });
  } catch (err: any) {
    return errorResponse(`List articles failed: ${err.message}`, 500);
  }
}

/** Get single article by slug */
async function handleGetArticle(slug: string, env: Env): Promise<Response> {
  try {
    if (!env.DB) return errorResponse('D1 database not bound', 500);
    await ensureArticlesTable(env.DB);
    const article = await env.DB.prepare('SELECT * FROM articles WHERE slug = ?').bind(slug).first();

    if (!article) return errorResponse('Article not found', 404);

    // Get attached images
    const { results: images } = await env.DB.prepare(
      'SELECT id, file_name, mime_type, size_bytes, alt_text, created_at FROM article_images WHERE article_slug = ?'
    ).bind(slug).all();

    const parsed = article as any;
    try { parsed.tags = JSON.parse(parsed.tags); } catch { parsed.tags = []; }
    parsed.images = (images || []).map((img: any) => ({
      ...img,
      url: `https://zenbrowsers.org/api/content/image/${img.id}`,
    }));

    return jsonResponse({ article: parsed });
  } catch (err: any) {
    return errorResponse(`Get article failed: ${err.message}`, 500);
  }
}

export const onRequest: PagesFunction<Env> = async (context) => {
  if (context.request.method === 'OPTIONS') return corsHeaders();

  const url = new URL(context.request.url);
  const path = url.pathname.replace('/api/content', '').replace(/^\/+/, '');

  // GET endpoints
  if (context.request.method === 'GET') {
    switch (true) {
      case path === 'status':
        return jsonResponse({
          service: 'content-pipeline-cms',
          status: 'operational',
          features: ['generate', 'seo', 'translate', 'summarize', 'publish', 'articles', 'images'],
          providers: [
            { name: 'deepseek', available: !!context.env.DEEPSEEK_API_KEY },
            { name: 'openrouter', available: !!context.env.OPENROUTER_API_KEY },
          ],
          timestamp: new Date().toISOString(),
        });
      case path === 'articles':
        return handleListArticles(context.request, context.env);
      case path.startsWith('article/'):
        return handleGetArticle(path.replace('article/', ''), context.env);
      case path.startsWith('image/'):
        return handleGetImage(path.replace('image/', ''), context.env);
      default:
        return errorResponse(`Unknown GET endpoint: /api/content/${path}`, 404);
    }
  }

  // POST endpoints
  if (context.request.method !== 'POST') {
    return errorResponse('POST or GET required', 405);
  }

  switch (path) {
    case 'generate':
      return handleGenerate(context.request, context.env);
    case 'seo':
      return handleSeo(context.request, context.env);
    case 'translate':
      return handleTranslate(context.request, context.env);
    case 'summarize':
      return handleSummarize(context.request, context.env);
    case 'publish':
      return handlePublish(context.request, context.env);
    case 'unpublish':
      return handleUnpublish(context.request, context.env);
    case 'upload-image':
      return handleUploadImage(context.request, context.env);
    default:
      return errorResponse(`Unknown endpoint: /api/content/${path}`, 404);
  }
};
