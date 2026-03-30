#!/usr/bin/env node
/**
 * KNOWLEDGE CRAWLER — Wieloźródłowy AI Knowledge Base Builder
 * ============================================================
 * Źródła:   Tavily Search (płatne) + Brave Search + HackerNews + Dev.to
 * Ocena:    Gemini 2.0 Flash — scoring 1-10
 * Progi:    ≥7 → auto-datasets  |  5-6 → pending (weryfikacja)  |  <5 → odrzucone
 * Data:     Brak treści starszych niż 8 miesięcy
 * Harmonogram: co 30 min via run-crawlers.ps1
 *
 * Użycie:   node scripts/knowledge-crawler.mjs
 *           node scripts/knowledge-crawler.mjs --dry-run
 *           node scripts/knowledge-crawler.mjs --slot 3
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'fs';
import { join, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '..');

// ─── ŚCIEŻKI ────────────────────────────────────────────────────────────────
const DATASETS_DIR   = join(ROOT, 'ai-hub', 'js', 'data', 'datasets');
const PENDING_DIR    = join(ROOT, 'ai-hub', 'js', 'data', 'pending');
const LOG_FILE       = join(ROOT, 'ai-hub', 'js', 'data', 'crawler-log.json');
const ENV_FILE       = join(ROOT, '.env');

// ─── KONFIGURACJA ────────────────────────────────────────────────────────────
const DAILY_TAVILY_CAP   = 80;   // max kredytów Tavily dziennie
const DAILY_BRAVE_CAP    = 400;  // max zapytań Brave dziennie
const QUERIES_PER_RUN    = 4;    // zapytania Tavily per uruchomienie
const BRAVE_PER_RUN      = 3;    // zapytania Brave per uruchomienie
const QUALITY_THRESHOLD  = 7;    // ≥7 auto-zapisuje do datasets
const PENDING_THRESHOLD  = 5;    // ≥5 idzie do pending queue
const MAX_AGE_MONTHS     = 8;    // odrzucaj starsze niż 8 miesięcy
const DRY_RUN            = process.argv.includes('--dry-run');
const FORCE_SLOT         = process.argv.includes('--slot')
  ? parseInt(process.argv[process.argv.indexOf('--slot') + 1])
  : null;

// ─── WCZYTAJ .env ────────────────────────────────────────────────────────────
function loadEnv() {
  try {
    const raw = readFileSync(ENV_FILE, 'utf-8');
    const env = {};
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.+)$/);
      if (m) env[m[1]] = m[2].trim();
    }
    return env;
  } catch {
    console.error('❌ Nie mogę wczytać .env'); process.exit(1);
  }
}
const ENV = loadEnv();

// ─── ROTACJA TEMATÓW (8 slotów × co 30 min = 4h pełny cykl) ─────────────────
const TOPIC_SLOTS = [
  // Slot 0 — AI narzędzia i workflow
  {
    name: 'AI Tools & Workflow 2026',
    category: '13_AI_NEWS',
    tavily_queries: [
      'best AI productivity tools 2026 comparison review',
      'AI workflow automation business tools 2026',
      'AI coding assistants comparison 2026 developers',
      'AI agent frameworks LangChain AutoGPT 2026 production',
    ],
    brave_queries: ['AI tools business 2026 review', 'AI agent automation 2026'],
    hn_tags: ['ai', 'machinelearning'],
    devto_tags: ['ai', 'artificialintelligence'],
  },
  // Slot 1 — E-commerce i marketing
  {
    name: 'Ecommerce & Digital Marketing',
    category: '04_ECOMMERCE_SHOPS',
    tavily_queries: [
      'ecommerce conversion optimization strategies 2026',
      'digital marketing AI tools ROI statistics 2026',
      'social commerce TikTok Instagram shopping 2026 results',
      'email marketing automation best practices 2026',
    ],
    brave_queries: ['ecommerce growth strategies 2026', 'dropshipping vs private label 2026'],
    hn_tags: ['business', 'entrepreneur'],
    devto_tags: ['webdev', 'javascript'],
  },
  // Slot 2 — Finanse i fintech
  {
    name: 'Finance & Fintech',
    category: '06_FINANCE',
    tavily_queries: [
      'fintech trends Europe Poland 2026',
      'AI financial analysis tools for businesses 2026',
      'crypto business payments adoption statistics 2026',
      'revenue forecasting models SaaS metrics benchmarks',
    ],
    brave_queries: ['fintech startup funding 2026', 'SMB finance tools Europe'],
    hn_tags: ['finance', 'crypto'],
    devto_tags: ['webdev', 'devops'],
  },
  // Slot 3 — Dev narzędzia i stack technologiczny
  {
    name: 'Developer Tools & Tech Stack',
    category: '12_DEV_TOOLS',
    tavily_queries: [
      'best developer tools 2026 productivity list',
      'Cloudflare Workers vs AWS Lambda benchmark 2026',
      'TypeScript trends full-stack 2026',
      'serverless edge computing use cases 2026',
    ],
    brave_queries: ['developer productivity tools 2026', 'cloud native development 2026'],
    hn_tags: ['programming', 'javascript'],
    devto_tags: ['programming', 'typescript'],
  },
  // Slot 4 — Polski rynek i biznes
  {
    name: 'Polish Market & Business',
    category: '05_POLISH_MARKET',
    tavily_queries: [
      'rynek e-commerce Polska 2026 trendy wzrost',
      'sztuczna inteligencja firmy Polska zastosowania 2026',
      'startupy technologiczne Polska finansowanie 2026',
      'narzędzia AI produktywność praca zdalna Polska',
    ],
    brave_queries: ['biznes online Polska 2026', 'AI w Polsce firmy wdrożenia'],
    hn_tags: ['business'],
    devto_tags: ['opensource'],
  },
  // Slot 5 — SEO i content marketing
  {
    name: 'SEO & Content Strategy',
    category: '09_SEO_MARKETING',
    tavily_queries: [
      'SEO AI content strategy 2026 best practices',
      'Google search algorithm updates 2026 ranking factors',
      'content marketing ROI statistics benchmarks 2026',
      'video content strategy YouTube shorts ROI 2026',
    ],
    brave_queries: ['SEO techniques 2026 ranking', 'content strategy AI tools'],
    hn_tags: ['seo', 'marketing'],
    devto_tags: ['seo', 'tutorial'],
  },
  // Slot 6 — Wyłaniające się technologie i badania
  {
    name: 'Emerging Tech & Research',
    category: '14_EMERGING_TECH',
    tavily_queries: [
      'quantum computing business applications 2026',
      'edge AI inference deployment production 2026',
      'WebAssembly WASM production use cases 2026',
      'LLM fine-tuning small business practical guide 2026',
    ],
    brave_queries: ['emerging technology startups 2026', 'AI research breakthroughs 2026'],
    hn_tags: ['wasm', 'rust'],
    devto_tags: ['webassembly', 'rust'],
  },
  // Slot 7 — Szanse rynkowe i case studies
  {
    name: 'Market Opportunities & Case Studies',
    category: '11_OPPORTUNITIES',
    tavily_queries: [
      'profitable SaaS micro-niche ideas 2026 examples',
      'AI startup success stories 2026 case study',
      'solopreneur business revenue 2026 real examples',
      'white label software reselling profit margins 2026',
    ],
    brave_queries: ['indie hackers revenue 2026', 'B2B SaaS opportunities 2026'],
    hn_tags: ['showhn', 'entrepreneur'],
    devto_tags: ['career', 'productivity'],
  },
];

// ─── NARZĘDZIA POMOCNICZE ────────────────────────────────────────────────────
function now() { return new Date().toISOString(); }
function slugDate() { return now().replace(/[:.]/g, '-').slice(0, 19); }
function uid(prefix = 'i') {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Oblicza cut-off date (8 miesięcy temu) */
function cutoffDate() {
  const d = new Date();
  d.setMonth(d.getMonth() - MAX_AGE_MONTHS);
  return d;
}

/**
 * Określa datę publikacji ze struktur Tavily/Brave/HN.
 * Zwraca Date lub null jeśli brak danych.
 */
function parsePublishedDate(item) {
  const candidates = [
    item.published_date,
    item.publishedDate,
    item.date,
    item.created_at && new Date(item.created_at * 1000).toISOString(),
  ];
  for (const c of candidates) {
    if (!c) continue;
    const d = new Date(c);
    if (!isNaN(d.getTime())) return d;
  }

  // Sprawdź URL pod kątem wzorców daty: /2024/07/ lub /2024-07
  const urlDate = (item.url || '').match(/\/(20\d{2})[\/\-](\d{2})/);
  if (urlDate) {
    const d = new Date(`${urlDate[1]}-${urlDate[2]}-01`);
    if (!isNaN(d.getTime())) return d;
  }

  return null;
}

/**
 * Filtr daty: true = przechodzi (wystarczająco świeże lub data nieznana)
 */
function passesDateFilter(item) {
  const pub = parsePublishedDate(item);
  if (!pub) return true; // brak daty = benefit of the doubt
  return pub >= cutoffDate();
}

// ─── ŁADUJ / ZAPISUJ LOG ─────────────────────────────────────────────────────
function loadLog() {
  if (!existsSync(LOG_FILE)) {
    return {
      runs: [],
      stats: {
        total_runs: 0,
        total_found: 0,
        total_date_filtered: 0,
        total_quality_filtered: 0,
        total_auto_approved: 0,
        total_pending: 0,
        daily: {},
      },
    };
  }
  try { return JSON.parse(readFileSync(LOG_FILE, 'utf-8')); }
  catch { return loadLog.apply(null, []); }
}

function saveLog(log) {
  if (DRY_RUN) return;
  writeFileSync(LOG_FILE, JSON.stringify(log, null, 2), 'utf-8');
}

/** Sprawdza dzienny limit Tavily na podstawie logu */
function getDailyUsage(log) {
  const today = new Date().toISOString().slice(0, 10);
  const daily = log.stats.daily[today] || { tavily: 0, brave: 0, runs: 0 };
  return { today, daily };
}

// ─── TAVILY SEARCH ───────────────────────────────────────────────────────────
async function tavilySearch(query) {
  const body = {
    query,
    api_key: ENV.TAVILY_API_KEY,
    search_depth: 'basic',
    include_answer: true,
    include_raw_content: false,
    max_results: 8,
    topic: 'general',
  };
  try {
    const r = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!r.ok) {
      const err = await r.text();
      console.error(`  ❌ Tavily [${r.status}]: ${err.slice(0, 120)}`);
      return null;
    }
    return await r.json();
  } catch (e) {
    console.error(`  ❌ Tavily sieć: ${e.message}`);
    return null;
  }
}

// ─── BRAVE SEARCH (bezpłatne 2000/mies) ──────────────────────────────────────
async function braveSearch(query) {
  try {
    const url = new URL('https://api.search.brave.com/res/v1/web/search');
    url.searchParams.set('q', query);
    url.searchParams.set('count', '8');
    url.searchParams.set('freshness', 'pm');  // past month
    const r = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': ENV.BRAVE_API_KEY,
      },
    });
    if (!r.ok) return null;
    const data = await r.json();
    // Normalizuj do wspólnego formatu
    return (data.web?.results || []).map(item => ({
      title: item.title,
      url: item.url,
      content: item.description || '',
      published_date: item.age,
      score: 0.5,
      source: 'brave',
    }));
  } catch (e) {
    console.error(`  ❌ Brave: ${e.message}`);
    return null;
  }
}

// ─── HACKERNEWS ALGOLIA (bezpłatne) ──────────────────────────────────────────
async function hnSearch(tag) {
  try {
    const cutoff = Math.floor(cutoffDate().getTime() / 1000);
    const url = `https://hn.algolia.com/api/v1/search?tags=${tag},story`
      + `&numericFilters=created_at_i>${cutoff},points>10&hitsPerPage=8&attributesToRetrieve=title,url,points,created_at_i,author`;
    const r = await fetch(url);
    if (!r.ok) return null;
    const data = await r.json();
    return (data.hits || []).filter(h => h.url).map(h => ({
      title: h.title,
      url: h.url,
      content: `HackerNews: ${h.points} points by ${h.author}`,
      published_date: new Date(h.created_at_i * 1000).toISOString(),
      score: Math.min(1, h.points / 200),
      source: 'hackernews',
    }));
  } catch (e) {
    console.error(`  ❌ HN: ${e.message}`);
    return null;
  }
}

// ─── DEV.TO API (bezpłatne) ─────────────────────────────────────────────────
async function devtoSearch(tag) {
  try {
    const r = await fetch(
      `https://dev.to/api/articles?tag=${tag}&top=7&per_page=8`,
      { headers: { 'User-Agent': 'ZenoBrowser KnowledgeCrawler/1.0' } }
    );
    if (!r.ok) return null;
    const articles = await r.json();
    const cutoff = cutoffDate();
    return articles
      .filter(a => new Date(a.published_at) >= cutoff)
      .map(a => ({
        title: a.title,
        url: a.url,
        content: a.description || a.tag_list?.join(', ') || '',
        published_date: a.published_at,
        score: Math.min(1, a.positive_reactions_count / 500),
        source: 'devto',
      }));
  } catch (e) {
    console.error(`  ❌ Dev.to: ${e.message}`);
    return null;
  }
}

// ─── OCENA JAKOŚCI GEMINI ─────────────────────────────────────────────────────
async function scoreWithGemini(items) {
  if (!items.length) return [];
  const today = new Date().toISOString().slice(0, 10);

  const itemsSummary = items.slice(0, 15).map((item, i) => ({
    i,
    title: item.title,
    url: item.url,
    snippet: (item.content || '').slice(0, 250),
  }));

  const prompt = `Jesteś ekspertem oceniającym wartość artykułów do bazy wiedzy biznesowo-technicznej.
Dzisiejsza data: ${today}. Odrzucaj treści starsze niż lipiec 2025.

Oceń każdy artykuł na skali 1-10:
- 8-10: Konkretne dane/statystyki, praktyczne porady, świeże (2025-2026), zaufane źródło
- 5-7: Przydatne informacje ale ogólne lub bez twardych danych
- 1-4: Zbyt ogólne, promocyjne, zduplikowane, lub stare

Artykuły:
${JSON.stringify(itemsSummary, null, 2)}

Odpowiedz TYLKO w JSON: [{"i": 0, "score": 7, "reason": "krótki powód po polsku"}]`;

  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${ENV.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 1024 },
        }),
      }
    );
    if (!r.ok) {
      console.error(`  ❌ Gemini [${r.status}]`);
      return items.map((_, i) => ({ i, score: 5, reason: 'ocena niedostępna' }));
    }
    const data = await r.json();
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return items.map((_, i) => ({ i, score: 5, reason: 'błąd parsowania' }));
    return JSON.parse(jsonMatch[0]);
  } catch (e) {
    console.error(`  ❌ Gemini: ${e.message}`);
    return items.map((_, i) => ({ i, score: 5, reason: 'błąd sieci' }));
  }
}

// ─── ZAPIS DO DATASETU ────────────────────────────────────────────────────────
function ensureDirs() {
  [DATASETS_DIR, PENDING_DIR].forEach(d => { if (!existsSync(d)) mkdirSync(d, { recursive: true }); });
}

function saveItemsToDataset(items, topicName, category) {
  if (!items.length || DRY_RUN) return null;
  const key = topicName.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').slice(0, 40)
    .replace(/-$/, '');
  const date = new Date().toISOString().slice(0, 10);
  const fileName = `${key}-${date}.json`;
  const outPath = join(DATASETS_DIR, fileName);

  const existing = existsSync(outPath)
    ? JSON.parse(readFileSync(outPath, 'utf-8'))
    : { topic: topicName, category, crawled_at: now(), raw_searches: [] };

  existing.crawled_at = now();
  for (const item of items) {
    existing.raw_searches.push({
      query: item.query || '',
      answer: item.answer || item.content || '',
      results: [{
        title: item.title,
        url: item.url,
        content: item.content,
        score: item.ai_score,
        published_date: item.published_date || null,
        source: item.source,
      }],
      ai_score: item.ai_score,
      ai_reason: item.ai_reason,
      collected_at: now(),
    });
  }

  writeFileSync(outPath, JSON.stringify(existing, null, 2), 'utf-8');
  return fileName;
}

function savePendingBatch(items, batchId, slot) {
  if (!items.length || DRY_RUN) return null;
  const fileName = `batch-${batchId}.json`;
  const outPath = join(PENDING_DIR, fileName);
  const payload = {
    batch_id: batchId,
    slot_name: slot.name,
    category: slot.category,
    created_at: now(),
    item_count: items.length,
    items: items.map(item => ({
      id: uid('p'),
      status: 'pending',
      title: item.title,
      url: item.url,
      content: (item.content || '').slice(0, 600),
      published_date: item.published_date || null,
      source: item.source,
      query: item.query || '',
      ai_score: item.ai_score,
      ai_reason: item.ai_reason,
    })),
  };
  writeFileSync(outPath, JSON.stringify(payload, null, 2), 'utf-8');
  return fileName;
}

// ─── GŁÓWNA PROCEDURA CRAWLOWANIA ─────────────────────────────────────────────
async function runCrawl() {
  console.log('\n╔════════════════════════════════════════════════╗');
  console.log('║   KNOWLEDGE CRAWLER — Start                    ║');
  console.log(`╚════════════════════════════════════════════════╝`);
  console.log(`📅 ${now()}${DRY_RUN ? '  [DRY-RUN]' : ''}`);

  ensureDirs();
  const log = loadLog();
  const { today, daily } = getDailyUsage(log);

  // Sprawdź dzienny budżet Tavily
  if (daily.tavily >= DAILY_TAVILY_CAP) {
    console.log(`\n⛔ Dzienny limit Tavily osiągnięty (${daily.tavily}/${DAILY_TAVILY_CAP} kredytów). Zakończono.`);
    return;
  }

  // Wybierz slot (rotacja lub wymuszony)
  const slotIndex = FORCE_SLOT !== null
    ? FORCE_SLOT % TOPIC_SLOTS.length
    : Math.floor(Date.now() / (30 * 60 * 1000)) % TOPIC_SLOTS.length;
  const slot = TOPIC_SLOTS[slotIndex];
  const batchId = slugDate();

  console.log(`\n🔄 Slot ${slotIndex}: "${slot.name}" (${slot.category})`);
  console.log(`📊 Dzienny budżet Tavily: ${daily.tavily}/${DAILY_TAVILY_CAP} użytych kredytów`);

  const allRawItems = [];
  let tavilyCreditsUsed = 0;
  let braveQueriesUsed = 0;

  // ── 1. TAVILY SEARCH ──────────────────────────────────────────────────────
  const availableTavily = Math.min(QUERIES_PER_RUN, DAILY_TAVILY_CAP - daily.tavily);
  const tavilyQueries = slot.tavily_queries.slice(0, availableTavily);

  console.log(`\n🔍 Tavily (${tavilyQueries.length} zapytań):`);
  for (const query of tavilyQueries) {
    console.log(`  → "${query}"`);
    if (DRY_RUN) { tavilyCreditsUsed++; continue; }
    const result = await tavilySearch(query);
    if (result) {
      tavilyCreditsUsed++;
      const rawResults = result.results || [];
      for (const r of rawResults) {
        allRawItems.push({
          title: r.title,
          url: r.url,
          content: r.content || result.answer || '',
          answer: result.answer || '',
          published_date: r.published_date || null,
          source: 'tavily',
          query,
          score: r.score,
        });
      }
    }
    await new Promise(r => setTimeout(r, 300)); // rate limit
  }

  // ── 2. BRAVE SEARCH ───────────────────────────────────────────────────────
  if (daily.brave < DAILY_BRAVE_CAP) {
    const braveQueries = slot.brave_queries.slice(0, BRAVE_PER_RUN);
    console.log(`\n🦁 Brave Search (${braveQueries.length} zapytań):`);
    for (const query of braveQueries) {
      console.log(`  → "${query}"`);
      if (DRY_RUN) { braveQueriesUsed++; continue; }
      const results = await braveSearch(query);
      if (results) {
        braveQueriesUsed++;
        results.forEach(r => allRawItems.push({ ...r, query }));
      }
      await new Promise(r => setTimeout(r, 200));
    }
  }

  // ── 3. HACKERNEWS ─────────────────────────────────────────────────────────
  for (const tag of slot.hn_tags.slice(0, 2)) {
    console.log(`\n🟠 HackerNews tag: ${tag}`);
    if (!DRY_RUN) {
      const items = await hnSearch(tag);
      if (items) items.forEach(r => allRawItems.push({ ...r, query: `hn:${tag}` }));
      await new Promise(r => setTimeout(r, 200));
    }
  }

  // ── 4. DEV.TO ─────────────────────────────────────────────────────────────
  for (const tag of slot.devto_tags.slice(0, 2)) {
    console.log(`\n📝 Dev.to tag: ${tag}`);
    if (!DRY_RUN) {
      const items = await devtoSearch(tag);
      if (items) items.forEach(r => allRawItems.push({ ...r, query: `devto:${tag}` }));
      await new Promise(r => setTimeout(r, 200));
    }
  }

  console.log(`\n📦 Zebrano ${allRawItems.length} surowych elementów`);

  // ── FILTR DATY ─────────────────────────────────────────────────────────────
  const dateFilteredOut = [];
  const datePassed = [];
  for (const item of allRawItems) {
    if (passesDateFilter(item)) datePassed.push(item);
    else dateFilteredOut.push(item);
  }
  console.log(`📅 Filtr daty (>${MAX_AGE_MONTHS} mies.): ✅ ${datePassed.length} przeszło | ❌ ${dateFilteredOut.length} odrzucono`);

  // ── DEDUPLIKACJA URL ───────────────────────────────────────────────────────
  const seenUrls = new Set();
  const unique = datePassed.filter(item => {
    if (!item.url || seenUrls.has(item.url)) return false;
    seenUrls.add(item.url);
    return true;
  });
  console.log(`🔗 Deduplikacja: ${unique.length} unikalnych URL-i`);

  if (!unique.length) {
    console.log('\n⚠️  Brak elementów do oceny. Zakończono.');
    updateLog(log, today, batchId, slot, tavilyCreditsUsed, braveQueriesUsed,
      allRawItems.length, dateFilteredOut.length, 0, 0, 0, 0, null, null);
    return;
  }

  // ── OCENA JAKOŚCI GEMINI ───────────────────────────────────────────────────
  console.log(`\n🤖 Gemini scoring ${unique.length} elementów...`);
  let scores = [];
  if (!DRY_RUN) {
    // Przetwarzaj partiami po 15
    for (let i = 0; i < unique.length; i += 15) {
      const batch = unique.slice(i, i + 15);
      const batchScores = await scoreWithGemini(batch);
      scores.push(...batchScores.map(s => ({ ...s, i: s.i + i })));
      if (i + 15 < unique.length) await new Promise(r => setTimeout(r, 500));
    }
  } else {
    scores = unique.map((_, i) => ({ i, score: 6, reason: 'dry-run' }));
  }

  // Połącz wyniki z ocenami
  const scored = unique.map((item, i) => {
    const scoreData = scores.find(s => s.i === i) || { score: 5, reason: 'brak oceny' };
    return { ...item, ai_score: scoreData.score, ai_reason: scoreData.reason };
  });

  const autoApproved = scored.filter(i => i.ai_score >= QUALITY_THRESHOLD);
  const pendingItems = scored.filter(i => i.ai_score >= PENDING_THRESHOLD && i.ai_score < QUALITY_THRESHOLD);
  const rejected = scored.filter(i => i.ai_score < PENDING_THRESHOLD);

  console.log(`\n📊 Wyniki oceny:`);
  console.log(`  ✅ Auto-approved (≥${QUALITY_THRESHOLD}): ${autoApproved.length} elementów`);
  console.log(`  🔄 Pending (${PENDING_THRESHOLD}-${QUALITY_THRESHOLD - 1}):   ${pendingItems.length} elementów`);
  console.log(`  ❌ Odrzucone (<${PENDING_THRESHOLD}):   ${rejected.length} elementów`);

  // ── ZAPIS WYNIKÓW ──────────────────────────────────────────────────────────
  let datasetFile = null;
  let pendingFile = null;

  if (autoApproved.length) {
    datasetFile = saveItemsToDataset(autoApproved, slot.name, slot.category);
    console.log(`\n💾 Zapisano do datasets: ${datasetFile || '[dry-run]'}`);
    autoApproved.slice(0, 5).forEach(i =>
      console.log(`   [${i.ai_score}/10] ${i.title?.slice(0, 70)}`));
  }

  if (pendingItems.length) {
    pendingFile = savePendingBatch(pendingItems, batchId, slot);
    console.log(`\n⏳ Pending do weryfikacji: ${pendingFile || '[dry-run]'}`);
    pendingItems.slice(0, 3).forEach(i =>
      console.log(`   [${i.ai_score}/10] ${i.title?.slice(0, 70)}`));
  }

  // ── AKTUALIZACJA LOGU ──────────────────────────────────────────────────────
  updateLog(log, today, batchId, slot, tavilyCreditsUsed, braveQueriesUsed,
    allRawItems.length, dateFilteredOut.length, unique.length,
    autoApproved.length, pendingItems.length, rejected.length,
    datasetFile, pendingFile);

  console.log('\n╔════════════════════════════════════════════════╗');
  console.log(`║   ZAKOŃCZONO — ${now().slice(11, 19)}                    ║`);
  console.log('╚════════════════════════════════════════════════╝\n');
}

function updateLog(log, today, batchId, slot, tavilyUsed, braveUsed,
  found, dateFiltered, unique, autoApproved, pending, rejected,
  datasetFile, pendingFile) {
  // Dzienna statystyka
  if (!log.stats.daily[today]) {
    log.stats.daily[today] = { tavily: 0, brave: 0, runs: 0, auto_approved: 0, pending: 0 };
  }
  log.stats.daily[today].tavily   += tavilyUsed;
  log.stats.daily[today].brave    += braveUsed;
  log.stats.daily[today].runs     += 1;
  log.stats.daily[today].auto_approved += autoApproved;
  log.stats.daily[today].pending  += pending;

  // Łączna statystyka
  log.stats.total_runs++;
  log.stats.total_found            += found;
  log.stats.total_date_filtered    += dateFiltered;
  log.stats.total_auto_approved    += autoApproved;
  log.stats.total_pending          += pending;

  // Wpis uruchomienia
  log.runs.unshift({
    batch_id:        batchId,
    timestamp:       now(),
    slot_index:      TOPIC_SLOTS.indexOf(slot),
    slot_name:       slot.name,
    category:        slot.category,
    dry_run:         DRY_RUN,
    credits: {
      tavily:  tavilyUsed,
      brave:   braveUsed,
    },
    results: {
      found,
      date_filtered:    dateFiltered,
      unique,
      auto_approved:    autoApproved,
      pending,
      rejected,
    },
    files: {
      dataset: datasetFile,
      pending: pendingFile,
    },
  });

  // Zachowaj tylko 200 ostatnich wpisów
  if (log.runs.length > 200) log.runs = log.runs.slice(0, 200);

  // Usuń statystyki starsze niż 30 dni
  const cutoff30 = new Date();
  cutoff30.setDate(cutoff30.getDate() - 30);
  for (const day of Object.keys(log.stats.daily)) {
    if (new Date(day) < cutoff30) delete log.stats.daily[day];
  }

  saveLog(log);
}

// ─── URUCHOMIENIE ─────────────────────────────────────────────────────────────
runCrawl().catch(e => {
  console.error('\n💥 Nieoczekiwany błąd:', e);
  process.exit(1);
});
