#!/usr/bin/env node
/**
 * MOA PIPELINE — Mixture of Agents Knowledge Base Builder
 * ========================================================
 * 4 agenci działają sekwencyjnie (lub w wybranym stage):
 *
 *  1. ANALYZER    — grupuje rekordy wg tematu, deduplikuje, ocenia jakość
 *  2. TRANSLATOR  — tłumaczy na polski + generuje podsumowania per temat (OpenRouter)
 *  3. HTML WRITER — generuje polską bazę wiedzy HTML (dark theme)
 *  4. EMBEDDER    — tworzy embeddingi OpenAI → wektorowa biblioteka JSON
 *
 * Użycie:
 *   node scripts/moa-pipeline.mjs                   (wszystkie etapy)
 *   node scripts/moa-pipeline.mjs --stage analyze   (tylko analiza)
 *   node scripts/moa-pipeline.mjs --stage translate (tylko tłumaczenie)
 *   node scripts/moa-pipeline.mjs --stage html      (tylko HTML)
 *   node scripts/moa-pipeline.mjs --stage embed     (tylko embeddingi)
 *   node scripts/moa-pipeline.mjs --dry-run         (bez API calls)
 *   node scripts/moa-pipeline.mjs --input <plik>    (inny plik wejściowy)
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
const ROOT       = resolve(__dirname, '..');

// ─── ŚCIEŻKI ────────────────────────────────────────────────────────────────
const ENV_FILE        = join(ROOT, '.env');
const DATASETS_DIR    = join(ROOT, 'ai-hub', 'js', 'data', 'datasets');
const VECTORS_DIR     = join(ROOT, 'ai-hub', 'js', 'data', 'vectors');
const PROCESSED_DIR   = join(ROOT, 'ai-hub', 'js', 'data', 'processed');
const KNOWLEDGE_DIR   = join(ROOT, 'ai-hub', 'knowledge-base');

// ─── ARGUMENTY ───────────────────────────────────────────────────────────────
const args       = process.argv.slice(2);
const DRY_RUN    = args.includes('--dry-run');
const stageIdx   = args.indexOf('--stage');
const ONLY_STAGE = stageIdx !== -1 ? args[stageIdx + 1] : null;
const inputIdx   = args.indexOf('--input');
const INPUT_FILE = inputIdx !== -1 ? args[inputIdx + 1] : null;

// ─── ENV LOADER (bez zależności zewnętrznych) ─────────────────────────────────
function loadEnv() {
  if (!existsSync(ENV_FILE)) {
    console.error('❌ Brak pliku .env:', ENV_FILE);
    process.exit(1);
  }
  const raw = readFileSync(ENV_FILE, 'utf-8');
  const env = {};
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.+)$/);
    if (m) env[m[1]] = m[2].trim();
  }
  return env;
}

// ─── RATE LIMITER ─────────────────────────────────────────────────────────────
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─── HTTP HELPER (Node 18+ native fetch) ─────────────────────────────────────
async function postJSON(url, headers, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`HTTP ${res.status}: ${errText.slice(0, 300)}`);
  }
  return res.json();
}

// ─── LLM CALL (DeepSeek → fallback Anthropic) ───────────────────────────────
async function callLLM(ENV, prompt, _model = 'deepseek-chat', maxTokens = 2000) {
  if (DRY_RUN) {
    return `[DRY-RUN] Odpowiedź LLM`;
  }

  // Pierwsza próba: DeepSeek (API kompatybilne z OpenAI)
  try {
    const data = await postJSON(
      'https://api.deepseek.com/v1/chat/completions',
      { 'Authorization': `Bearer ${ENV.DEEPSEEK_API_KEY}` },
      {
        model: 'deepseek-chat',
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }],
      }
    );
    return data.choices?.[0]?.message?.content || '';
  } catch (errA) {
    // Fallback: Anthropic Claude
    try {
      const data = await postJSON(
        'https://api.anthropic.com/v1/messages',
        {
          'x-api-key': ENV.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        {
          model: 'claude-3-haiku-20240307',
          max_tokens: maxTokens,
          messages: [{ role: 'user', content: prompt }],
        }
      );
      return data.content?.[0]?.text || '';
    } catch (errB) {
      throw new Error(`DeepSeek: ${errA.message.slice(0,60)} | Claude: ${errB.message.slice(0,60)}`);
    }
  }
}

// ─── EMBEDDING CALL (HuggingFace Inference → fallback TF-IDF) ───────────────
async function createEmbedding(ENV, text) {
  if (DRY_RUN) return new Array(384).fill(0);
  try {
    // HuggingFace Inference API — sentence-transformers/all-MiniLM-L6-v2 (384 dim)
    const data = await postJSON(
      'https://api-inference.huggingface.co/models/sentence-transformers/all-MiniLM-L6-v2',
      { 'Authorization': `Bearer ${ENV.HUGGINGFACE_API_KEY}` },
      { inputs: text.slice(0, 512), options: { wait_for_model: true } }
    );
    // HF zwraca tablicę wektorów (jeden na input)
    if (Array.isArray(data) && Array.isArray(data[0])) return data[0];
    if (Array.isArray(data)) return data;
    throw new Error(`Nieoczekiwana odpowiedź HF: ${JSON.stringify(data).slice(0,80)}`);
  } catch (err) {
    // Fallback: prosty TF-IDF hash embedding (lokalnie)
    return tfidfEmbedding(text);
  }
}

// Prosty lokalny embedding 128-dim (fallback gdy brak API)
function tfidfEmbedding(text) {
  const words = text.toLowerCase().replace(/[^a-z0-9ąćęłńóśźż\s]/g, ' ').split(/\s+/).filter(w => w.length > 2);
  const vec = new Array(128).fill(0);
  for (const word of words) {
    let h = 0;
    for (let i = 0; i < word.length; i++) h = (Math.imul(31, h) + word.charCodeAt(i)) | 0;
    vec[((h >>> 0) % 128)] += 1;
    vec[((h * 2654435761 >>> 0) % 128)] += 0.5;
  }
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) + 1e-8;
  return vec.map(v => v / norm);
}

// ─── MATH: cosineSimilarity ───────────────────────────────────────────────────
function cosineSimilarity(a, b) {
  let dot = 0, nA = 0, nB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    nA  += a[i] * a[i];
    nB  += b[i] * b[i];
  }
  return dot / (Math.sqrt(nA) * Math.sqrt(nB) + 1e-8);
}

// ─── ENSURE DIRS ─────────────────────────────────────────────────────────────
function ensureDirs() {
  [VECTORS_DIR, PROCESSED_DIR, KNOWLEDGE_DIR].forEach(d => {
    if (!existsSync(d)) mkdirSync(d, { recursive: true });
  });
}

// ════════════════════════════════════════════════════════════════════════════
// AGENT 1 — ANALYZER
// Grupuje rekordy wg query, deduplikuje, wybiera top-N per temat
// ════════════════════════════════════════════════════════════════════════════
function runAnalyzer(rawDataset) {
  console.log('\n╔══ AGENT 1: ANALYZER ═══════════════════════════════════════╗');
  const items = rawDataset.items || rawDataset;

  // Grupuj wg query
  const byQuery = {};
  for (const item of items) {
    const key = (item.query || 'unknown').trim();
    if (!byQuery[key]) byQuery[key] = [];
    byQuery[key].push(item);
  }

  const topics = [];
  for (const [query, group] of Object.entries(byQuery)) {
    // Weź top 8 per temat (unikaj za długich promptów)
    const topItems = group
      .slice(0, 8)
      .map(i => ({
        title:   i.title || '',
        url:     i.url   || '',
        content: (i.content || '').slice(0, 400),
        score:   i.ai_score || 5,
      }));

    topics.push({
      query,
      slug: query
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 60),
      item_count: group.length,
      items: topItems,
    });
  }

  topics.sort((a, b) => b.item_count - a.item_count);
  console.log(`║ Znaleziono ${topics.length} tematów z łącznie ${items.length} rekordów`);
  console.log(`╚═══════════════════════════════════════════════════════════╝`);
  return topics;
}

// ════════════════════════════════════════════════════════════════════════════
// AGENT 2 — TRANSLATOR
// Dla każdego tematu tłumaczy na polski + generuje podsumowanie
// ════════════════════════════════════════════════════════════════════════════
async function runTranslator(ENV, topics) {
  console.log('\n╔══ AGENT 2: TRANSLATOR ═════════════════════════════════════╗');
  console.log(`║ Do przetworzenia: ${topics.length} tematów (model: gpt-4o-mini → fallback deepseek-chat)`);

  const PROCESSED_FILE = join(PROCESSED_DIR, 'moa-translated.json');
  let cache = {};
  if (existsSync(PROCESSED_FILE)) {
    try {
      cache = JSON.parse(readFileSync(PROCESSED_FILE, 'utf-8'));
      console.log(`║ Cache: ${Object.keys(cache).length} przetłumaczonych tematów wczytano`);
    } catch {}
  }

  const translated = [];
  let apiCalls = 0;

  for (let i = 0; i < topics.length; i++) {
    const topic = topics[i];
    console.log(`║ [${i+1}/${topics.length}] ${topic.query.slice(0, 55)}...`);

    // Sprawdź cache
    if (cache[topic.slug]) {
      translated.push(cache[topic.slug]);
      continue;
    }

    const itemsText = topic.items
      .map((it, idx) => `${idx+1}. ${it.title}\n   URL: ${it.url}\n   Fragment: ${it.content}`)
      .join('\n\n');

    const prompt = `Jesteś ekspertem AI i technologii. Przeanalizuj poniższe artykuły na temat: "${topic.query}"

ARTYKUŁY (${topic.item_count} łącznie, poniżej top ${topic.items.length}):
${itemsText}

Zwróć WYŁĄCZNIE poprawny JSON (bez markdown, bez komentarzy) w formacie:
{
  "title_pl": "Tytuł tematu po polsku (max 60 znaków)",
  "summary_pl": "Podsumowanie tematu po polsku (150-250 słów) - czym są te narzędzia, co robią, dlaczego są ważne w 2026",
  "key_tools": ["narzędzie1", "narzędzie2", "narzędzie3"],
  "category_pl": "Kategoria po polsku (np. Narzędzia AI, Automatyzacja, Testowanie itp.)",
  "importance": 1-10,
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "top_items": [
    {"title_pl": "tytuł po polsku", "url": "url", "desc_pl": "krótki opis po polsku (1-2 zdania)"},
    {"title_pl": "...", "url": "...", "desc_pl": "..."}
  ]
}
Zwróć TYLKO JSON, nic więcej.`;

    try {
      const raw = await callLLM(ENV, prompt, 'deepseek/deepseek-chat', 1200);
      // Wyodrębnij JSON z odpowiedzi (czasem LLM dodaje markdown)
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('Brak JSON w odpowiedzi');

      const parsed = JSON.parse(jsonMatch[0]);
      const result = {
        slug: topic.slug,
        query: topic.query,
        item_count: topic.item_count,
        ...parsed,
        top_items: (parsed.top_items || []).slice(0, 5),
      };

      translated.push(result);
      cache[topic.slug] = result;
      apiCalls++;

      // Zapisuj cache po każdym API call
      if (!DRY_RUN) {
        writeFileSync(PROCESSED_FILE, JSON.stringify(cache, null, 2), 'utf-8');
      }

      // Rate limiting: 1s między callami
      await sleep(1100);

    } catch (err) {
      console.warn(`║   ⚠ Błąd translacji: ${err.message.slice(0, 80)}`);
      // Fallback: dane bez tłumaczenia
      translated.push({
        slug: topic.slug,
        query: topic.query,
        item_count: topic.item_count,
        title_pl: topic.query,
        summary_pl: `Temat: ${topic.query} (${topic.item_count} rekordów)`,
        key_tools: [],
        category_pl: 'AI i Technologia',
        importance: 5,
        tags: ['ai', 'narzędzia'],
        top_items: topic.items.slice(0, 3).map(it => ({
          title_pl: it.title,
          url: it.url,
          desc_pl: it.content.slice(0, 120) + '...',
        })),
      });
      await sleep(500);
    }
  }

  console.log(`║ API calls: ${apiCalls} | Z cache: ${topics.length - apiCalls}`);
  console.log('╚═══════════════════════════════════════════════════════════╝');
  return translated;
}

// ════════════════════════════════════════════════════════════════════════════
// AGENT 3 — HTML WRITER
// Generuje pełną polską bazę wiedzy HTML
// ════════════════════════════════════════════════════════════════════════════
function runHTMLWriter(translated, metadata) {
  console.log('\n╔══ AGENT 3: HTML WRITER ════════════════════════════════════╗');
  const total = translated.length;
  const date  = new Date().toLocaleDateString('pl-PL', { year: 'numeric', month: 'long', day: 'numeric' });
  const totalItems = translated.reduce((s, t) => s + (t.item_count || 0), 0);

  // Buduj karty tematów
  const topicCards = translated
    .sort((a, b) => (b.importance || 5) - (a.importance || 5))
    .map(t => {
      const tags = (t.tags || []).map(tag => `<span class="tag">${tag}</span>`).join('');
      const tools = (t.key_tools || []).map(tool => `<span class="tool-badge">${tool}</span>`).join('');
      const items = (t.top_items || []).map(it =>
        `<li class="resource-item">
          <a href="${it.url || '#'}" target="_blank" rel="noopener noreferrer">${it.title_pl || it.url}</a>
          <p>${it.desc_pl || ''}</p>
        </li>`
      ).join('');

      const importanceColor = t.importance >= 8 ? '#4ade80' : t.importance >= 6 ? '#facc15' : '#94a3b8';

      return `
    <article class="topic-card" data-importance="${t.importance || 5}" data-category="${t.category_pl || ''}" id="${t.slug}">
      <header class="card-header">
        <div class="card-meta">
          <span class="category-badge">${t.category_pl || 'AI'}</span>
          <span class="importance-badge" style="color:${importanceColor}">★ ${t.importance || 5}/10</span>
          <span class="count-badge">${t.item_count} źródeł</span>
        </div>
        <h2 class="card-title">${t.title_pl || t.query}</h2>
        <div class="tags-row">${tags}</div>
      </header>
      <div class="card-body">
        <p class="summary">${t.summary_pl || ''}</p>
        ${tools ? `<div class="tools-row"><strong>Kluczowe narzędzia:</strong><br>${tools}</div>` : ''}
        ${items ? `<ul class="resources-list">${items}</ul>` : ''}
      </div>
    </article>`;
    }).join('\n');

  // Kategorie do filtrowania
  const categories = [...new Set(translated.map(t => t.category_pl || 'AI').filter(Boolean))].sort();
  const filterButtons = categories.map(c =>
    `<button class="filter-btn" data-cat="${c}">${c}</button>`
  ).join('');

  const html = `<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>ZENO AI Knowledge Base 2026 — Polska Baza Wiedzy</title>
  <meta name="description" content="Polska baza wiedzy AI — ${totalItems} artykułów, ${total} tematów, przetworzone przez MOA Pipeline" />
  <style>
    :root {
      --bg:       #0a0a0f;
      --bg2:      #111118;
      --bg3:      #1a1a25;
      --border:   #2a2a3a;
      --accent:   #6366f1;
      --accent2:  #8b5cf6;
      --text:     #e2e8f0;
      --text2:    #94a3b8;
      --text3:    #64748b;
      --green:    #4ade80;
      --yellow:   #facc15;
      --radius:   12px;
    }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      line-height: 1.6;
    }

    /* ── HEADER ── */
    header.site-header {
      background: linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%);
      border-bottom: 1px solid var(--border);
      padding: 40px 24px 32px;
      text-align: center;
    }
    .site-header h1 {
      font-size: clamp(1.6rem, 4vw, 2.4rem);
      font-weight: 800;
      background: linear-gradient(135deg, #818cf8, #c084fc, #67e8f9);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin-bottom: 10px;
    }
    .site-header p { color: var(--text2); font-size: 0.95rem; }
    .stats-row {
      display: flex;
      justify-content: center;
      gap: 32px;
      margin-top: 20px;
      flex-wrap: wrap;
    }
    .stat { text-align: center; }
    .stat .num { font-size: 1.8rem; font-weight: 700; color: var(--accent); }
    .stat .lbl { font-size: 0.75rem; color: var(--text3); text-transform: uppercase; letter-spacing: .05em; }

    /* ── CONTROLS ── */
    .controls {
      background: var(--bg2);
      border-bottom: 1px solid var(--border);
      padding: 16px 24px;
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      align-items: center;
      position: sticky;
      top: 0;
      z-index: 100;
    }
    .search-input {
      flex: 1;
      min-width: 220px;
      background: var(--bg3);
      border: 1px solid var(--border);
      color: var(--text);
      padding: 8px 14px;
      border-radius: 8px;
      font-size: 0.9rem;
      outline: none;
    }
    .search-input:focus { border-color: var(--accent); }
    .filter-btn {
      background: var(--bg3);
      border: 1px solid var(--border);
      color: var(--text2);
      padding: 6px 14px;
      border-radius: 6px;
      font-size: 0.8rem;
      cursor: pointer;
      transition: all .2s;
    }
    .filter-btn:hover,
    .filter-btn.active {
      background: var(--accent);
      border-color: var(--accent);
      color: #fff;
    }
    .sort-select {
      background: var(--bg3);
      border: 1px solid var(--border);
      color: var(--text2);
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 0.8rem;
      cursor: pointer;
    }

    /* ── MAIN GRID ── */
    main {
      max-width: 1400px;
      margin: 0 auto;
      padding: 24px;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
      gap: 20px;
    }

    /* ── TOPIC CARDS ── */
    .topic-card {
      background: var(--bg2);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      overflow: hidden;
      transition: transform .2s, border-color .2s, box-shadow .2s;
      display: flex;
      flex-direction: column;
    }
    .topic-card:hover {
      transform: translateY(-2px);
      border-color: var(--accent);
      box-shadow: 0 8px 32px rgba(99,102,241,.15);
    }
    .card-header {
      padding: 18px 18px 12px;
      border-bottom: 1px solid var(--border);
      background: linear-gradient(180deg, rgba(99,102,241,.06) 0%, transparent 100%);
    }
    .card-meta {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-bottom: 8px;
      align-items: center;
    }
    .category-badge {
      background: rgba(99,102,241,.2);
      color: #818cf8;
      padding: 2px 10px;
      border-radius: 20px;
      font-size: 0.72rem;
      font-weight: 600;
    }
    .importance-badge { font-size: 0.8rem; font-weight: 700; }
    .count-badge {
      color: var(--text3);
      font-size: 0.72rem;
      margin-left: auto;
    }
    .card-title {
      font-size: 1.05rem;
      font-weight: 700;
      line-height: 1.35;
      color: var(--text);
      margin-bottom: 8px;
    }
    .tags-row { display: flex; gap: 6px; flex-wrap: wrap; }
    .tag {
      background: var(--bg3);
      color: var(--text3);
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 0.7rem;
    }
    .card-body { padding: 16px 18px; flex: 1; }
    .summary {
      font-size: 0.875rem;
      color: var(--text2);
      line-height: 1.7;
      margin-bottom: 14px;
    }
    .tools-row {
      margin-bottom: 12px;
      font-size: 0.8rem;
      color: var(--text3);
    }
    .tools-row strong { color: var(--text2); display: block; margin-bottom: 6px; }
    .tool-badge {
      display: inline-block;
      background: rgba(139,92,246,.15);
      color: #c084fc;
      border: 1px solid rgba(139,92,246,.3);
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 0.72rem;
      margin: 2px;
    }
    .resources-list {
      list-style: none;
      border-top: 1px solid var(--border);
      padding-top: 12px;
    }
    .resource-item { margin-bottom: 10px; }
    .resource-item a {
      color: #67e8f9;
      text-decoration: none;
      font-size: 0.82rem;
      font-weight: 600;
    }
    .resource-item a:hover { text-decoration: underline; }
    .resource-item p {
      font-size: 0.77rem;
      color: var(--text3);
      margin-top: 2px;
      line-height: 1.5;
    }

    /* ── EMPTY STATE ── */
    .empty-state {
      grid-column: 1/-1;
      text-align: center;
      padding: 60px;
      color: var(--text3);
    }

    /* ── FOOTER ── */
    footer {
      text-align: center;
      padding: 32px;
      color: var(--text3);
      font-size: 0.8rem;
      border-top: 1px solid var(--border);
      margin-top: 20px;
    }
    footer a { color: var(--accent); text-decoration: none; }

    /* ── SCROLLBAR ── */
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: var(--bg); }
    ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }

    /* ── HIDDEN ── */
    .hidden { display: none !important; }
  </style>
</head>
<body>

<header class="site-header">
  <h1>🧠 ZENO AI Knowledge Base 2026</h1>
  <p>Polska baza wiedzy AI — przetworzona przez MOA Pipeline (Mixture of Agents)</p>
  <div class="stats-row">
    <div class="stat"><div class="num">${totalItems}</div><div class="lbl">Źródeł</div></div>
    <div class="stat"><div class="num">${total}</div><div class="lbl">Tematów</div></div>
    <div class="stat"><div class="num">${categories.length}</div><div class="lbl">Kategorii</div></div>
    <div class="stat"><div class="num">${date}</div><div class="lbl">Aktualizacja</div></div>
  </div>
</header>

<div class="controls">
  <input
    class="search-input"
    type="search"
    placeholder="🔍 Szukaj tematu, narzędzia, tagu..."
    id="searchInput"
    autocomplete="off"
  />
  <button class="filter-btn active" data-cat="all">Wszystkie</button>
  ${filterButtons}
  <select class="sort-select" id="sortSelect">
    <option value="importance">Sortuj: Ważność</option>
    <option value="count">Sortuj: Liczba źródeł</option>
    <option value="alpha">Sortuj: Alfabetycznie</option>
  </select>
</div>

<main id="mainGrid">
${topicCards}
  <div class="empty-state hidden" id="emptyState">
    <p>Brak wyników dla podanego filtra.</p>
  </div>
</main>

<footer>
  Wygenerowano przez <strong>ZENO MOA Pipeline</strong> — ${date} |
  <a href="../index.html">AI Hub</a> |
  Dane: ${totalItems} rekordów z Tavily &amp; Brave Search
</footer>

<script>
  // ── SEARCH & FILTER ──────────────────────────────────────────────────────
  const cards      = Array.from(document.querySelectorAll('.topic-card'));
  const searchInput = document.getElementById('searchInput');
  const emptyState  = document.getElementById('emptyState');
  const sortSelect  = document.getElementById('sortSelect');
  const filterBtns  = document.querySelectorAll('.filter-btn');
  const main        = document.getElementById('mainGrid');

  let activeCategory = 'all';

  function applyFilters() {
    const query = searchInput.value.toLowerCase();
    let visible = 0;

    cards.forEach(card => {
      const text = card.textContent.toLowerCase();
      const cat  = card.dataset.category || '';

      const matchSearch = !query || text.includes(query);
      const matchCat    = activeCategory === 'all' || cat === activeCategory;

      if (matchSearch && matchCat) { card.classList.remove('hidden'); visible++; }
      else                         { card.classList.add('hidden'); }
    });

    emptyState.classList.toggle('hidden', visible > 0);
  }

  function applySort(mode) {
    const visibleCards = cards.filter(c => !c.classList.contains('hidden'));
    visibleCards.sort((a, b) => {
      if (mode === 'importance') return +b.dataset.importance - +a.dataset.importance;
      if (mode === 'count')      return +b.querySelector('.count-badge').textContent.replace(/\\D/g,'') - +a.querySelector('.count-badge').textContent.replace(/\\D/g,'');
      if (mode === 'alpha')      return a.querySelector('.card-title').textContent.localeCompare(b.querySelector('.card-title').textContent, 'pl');
      return 0;
    });
    visibleCards.forEach(c => main.appendChild(c));
  }

  searchInput.addEventListener('input', () => { applyFilters(); applySort(sortSelect.value); });

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeCategory = btn.dataset.cat;
      applyFilters();
      applySort(sortSelect.value);
    });
  });

  sortSelect.addEventListener('change', () => { applySort(sortSelect.value); });

  // ── DEEP LINK (hash scroll) ──────────────────────────────────────────────
  if (location.hash) {
    const el = document.querySelector(location.hash);
    if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 300);
  }
</script>
</body>
</html>`;

  console.log(`║ Wygenerowano HTML: ${total} tematów, ${categories.length} kategorii`);
  console.log('╚═══════════════════════════════════════════════════════════╝');
  return html;
}

// ════════════════════════════════════════════════════════════════════════════
// AGENT 4 — EMBEDDER
// Tworzy embeddingi OpenAI → wektorowa biblioteka JSON
// ════════════════════════════════════════════════════════════════════════════
async function runEmbedder(ENV, translated) {
  console.log('\n╔══ AGENT 4: EMBEDDER ════════════════════════════════════════╗');
  console.log(`║ Embeddingi: HuggingFace all-MiniLM-L6-v2 (384 dim, fallback TF-IDF lokalnie)`);

  const VECTORS_FILE = join(VECTORS_DIR, 'kb-vectors.json');
  let existingVectors = {};
  if (existsSync(VECTORS_FILE)) {
    try {
      existingVectors = JSON.parse(readFileSync(VECTORS_FILE, 'utf-8'));
      console.log(`║ Cache wektory: ${Object.keys(existingVectors).length} istniejących`);
    } catch {}
  }

  const vectors = { ...existingVectors };
  let newEmbeds = 0;

  for (let i = 0; i < translated.length; i++) {
    const t = translated[i];
    if (vectors[t.slug]) continue; // Już przetworzone

    const textToEmbed = [
      t.title_pl || '',
      t.summary_pl || '',
      (t.key_tools || []).join(', '),
      (t.tags || []).join(', '),
    ].join('\n');

    try {
      const embedding = await createEmbedding(ENV, textToEmbed);
      vectors[t.slug] = {
        id:         t.slug,
        title:      t.title_pl || t.query,
        category:   t.category_pl || 'AI',
        importance: t.importance || 5,
        tags:       t.tags || [],
        tools:      t.key_tools || [],
        query:      t.query,
        embedding,
        metadata: {
          item_count: t.item_count,
          url: `knowledge-base/index.html#${t.slug}`,
        },
      };
      newEmbeds++;
      if (!DRY_RUN) {
        writeFileSync(VECTORS_FILE, JSON.stringify(vectors, null, 2), 'utf-8');
      }
      await sleep(200); // Rate limit embeddings
    } catch (err) {
      console.warn(`║   ⚠ Embedding błąd [${t.slug}]: ${err.message.slice(0, 60)}`);
    }
  }

  console.log(`║ Nowe embeddingi: ${newEmbeds} | Łącznie: ${Object.keys(vectors).length}`);
  console.log('╚═══════════════════════════════════════════════════════════╝');

  // Zapisz też uproszczony indeks (bez wektorów) do szybkiego wyszukiwania
  const index = Object.values(vectors).map(v => {
    const { embedding, ...rest } = v;
    return rest;
  });
  if (!DRY_RUN) {
    writeFileSync(
      join(VECTORS_DIR, 'kb-index.json'),
      JSON.stringify({ updated_at: new Date().toISOString(), count: index.length, entries: index }, null, 2),
      'utf-8'
    );
  }

  // Eksportuj funkcję wyszukiwania jako moduł
  generateSearchModule(vectors);

  return vectors;
}

// ─── SEARCH MODULE — gotowy do użycia przez agentów ─────────────────────────
function generateSearchModule(vectors) {
  const entries = Object.values(vectors);
  const searchCode = `/**
 * ZENO Knowledge Base Search
 * Wygenerowano automatycznie przez MOA Pipeline
 * Użycie w agencie: import { searchKB } from '@/vectors/kb-search.mjs'
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const VECTORS_FILE = join(__dirname, 'kb-vectors.json');

let _vectorCache = null;

function loadVectors() {
  if (_vectorCache) return _vectorCache;
  _vectorCache = JSON.parse(readFileSync(VECTORS_FILE, 'utf-8'));
  return _vectorCache;
}

function cosineSimilarity(a, b) {
  let dot = 0, nA = 0, nB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    nA  += a[i] * a[i];
    nB  += b[i] * b[i];
  }
  return dot / (Math.sqrt(nA) * Math.sqrt(nB) + 1e-8);
}

/**
 * Wyszukuje semantycznie w bazie wiedzy używając pre-computed embeddings
 * @param {number[]} queryEmbedding - embedding wektora zapytania (1536 dim)
 * @param {number}   topK           - ile wyników zwrócić
 * @returns {Array<{id, title, category, score, url}>}
 */
export function searchKB(queryEmbedding, topK = 5) {
  const vectors = loadVectors();
  const results = [];

  for (const entry of Object.values(vectors)) {
    if (!entry.embedding) continue;
    const score = cosineSimilarity(queryEmbedding, entry.embedding);
    results.push({
      id:         entry.id,
      title:      entry.title,
      category:   entry.category,
      tags:       entry.tags,
      tools:      entry.tools,
      importance: entry.importance,
      url:        entry.metadata?.url || '',
      score,
    });
  }

  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

/**
 * Keyword search (bez embeddings) — szybkie wyszukiwanie tekstowe
 * @param {string} query
 * @param {number} topK
 */
export function searchKBKeyword(query, topK = 10) {
  const vectors = loadVectors();
  const q = query.toLowerCase();
  const results = [];

  for (const entry of Object.values(vectors)) {
    const text = [entry.title, ...(entry.tags || []), ...(entry.tools || [])].join(' ').toLowerCase();
    if (text.includes(q)) {
      results.push({
        id:         entry.id,
        title:      entry.title,
        category:   entry.category,
        tags:       entry.tags,
        tools:      entry.tools,
        url:        entry.metadata?.url || '',
        importance: entry.importance,
      });
    }
  }

  return results
    .sort((a, b) => (b.importance || 5) - (a.importance || 5))
    .slice(0, topK);
}

/** Lista wszystkich kategorii */
export function listCategories() {
  const vectors = loadVectors();
  return [...new Set(Object.values(vectors).map(e => e.category).filter(Boolean))].sort();
}

/** Pobierz wszystkie tematy danej kategorii */
export function getByCategory(category) {
  const vectors = loadVectors();
  return Object.values(vectors)
    .filter(e => e.category === category)
    .sort((a, b) => (b.importance || 5) - (a.importance || 5))
    .map(({ embedding, ...rest }) => rest);
}
`;

  if (!DRY_RUN) {
    writeFileSync(join(VECTORS_DIR, 'kb-search.mjs'), searchCode, 'utf-8');
    console.log(`     → Moduł wyszukiwania: ai-hub/js/data/vectors/kb-search.mjs`);
  }
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN ORCHESTRATOR
// ════════════════════════════════════════════════════════════════════════════
async function main() {
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║          ZENO MOA PIPELINE — Mixture of Agents              ║');
  console.log('║    Analiza → Tłumaczenie PL → HTML → Wektory               ║');
  console.log(`╚══════════════════════════════════════════════════════════════╝`);
  console.log(`   Tryb: ${DRY_RUN ? '🔵 DRY-RUN (bez API calls)' : '🟢 PRODUKCJA'}`);
  if (ONLY_STAGE) console.log(`   Stage: ${ONLY_STAGE}`);

  const ENV = loadEnv();
  ensureDirs();

  // ── Wczytaj dataset ───────────────────────────────────────────────────────
  let inputPath = INPUT_FILE;
  if (!inputPath) {
    // Znajdź najnowszy plik batch (zawierający datę w nazwie, np. ai-tools-workflow-2026-*.json)
    // Priorytet: pliki z datą YYYY-MM-DD w nazwie → największy plik z items[]
    const { statSync } = await import('fs');
    const files = readdirSync(DATASETS_DIR)
      .filter(f => f.endsWith('.json') && !f.startsWith('_'))
      .map(f => {
        const p = join(DATASETS_DIR, f);
        const st = statSync(p);
        return { name: f, path: p, mtime: st.mtimeMs, size: st.size };
      })
      .filter(f => f.size > 10000) // pomijaj małe pliki metadanych
      .sort((a, b) => b.mtime - a.mtime); // najnowszy wg daty modyfikacji

    if (!files.length) {
      console.error('❌ Brak plików dataset (>10KB) w:', DATASETS_DIR);
      process.exit(1);
    }
    inputPath = files[0].path;
  }

  console.log(`\n📂 Dataset: ${inputPath}`);
  const rawDataset = JSON.parse(readFileSync(inputPath, 'utf-8'));
  const itemCount = (rawDataset.items || rawDataset).length;
  console.log(`   Rekordów: ${itemCount}`);

  // ── Sprawdź przetłumaczone (cache) ───────────────────────────────────────
  const PROCESSED_FILE = join(PROCESSED_DIR, 'moa-translated.json');
  let translated = null;
  if (existsSync(PROCESSED_FILE) && ONLY_STAGE && !['analyze', 'translate'].includes(ONLY_STAGE)) {
    console.log(`\n📁 Wczytuję przetłumaczone dane z cache: ${PROCESSED_FILE}`);
    try {
      const cache = JSON.parse(readFileSync(PROCESSED_FILE, 'utf-8'));
      translated = Object.values(cache);
      console.log(`   Tematów: ${translated.length}`);
    } catch {}
  }

  // ── STAGE 1: ANALYZER ────────────────────────────────────────────────────
  let topics;
  if (!ONLY_STAGE || ONLY_STAGE === 'analyze' || ONLY_STAGE === 'translate' || !translated) {
    topics = runAnalyzer(rawDataset);
    if (ONLY_STAGE === 'analyze') {
      const out = join(PROCESSED_DIR, 'moa-topics.json');
      if (!DRY_RUN) writeFileSync(out, JSON.stringify(topics, null, 2), 'utf-8');
      console.log(`\n✅ Stage 'analyze' zakończony. Wynik: ${out}`);
      return;
    }
  }

  // ── STAGE 2: TRANSLATOR ──────────────────────────────────────────────────
  if (!ONLY_STAGE || ONLY_STAGE === 'translate' || !translated) {
    if (!topics) topics = runAnalyzer(rawDataset);
    translated = await runTranslator(ENV, topics);
    if (!DRY_RUN) {
      const translatedArr = translated;
      const cache = {};
      translatedArr.forEach(t => { cache[t.slug] = t; });
      writeFileSync(PROCESSED_FILE, JSON.stringify(cache, null, 2), 'utf-8');
    }
    if (ONLY_STAGE === 'translate') {
      console.log(`\n✅ Stage 'translate' zakończony. Wynik: ${PROCESSED_FILE}`);
      return;
    }
  }

  // ── STAGE 3: HTML WRITER ─────────────────────────────────────────────────
  if (!ONLY_STAGE || ONLY_STAGE === 'html' || ONLY_STAGE !== 'embed') {
    const html = runHTMLWriter(translated, { source: inputPath });
    const htmlPath = join(KNOWLEDGE_DIR, 'index.html');
    if (!DRY_RUN) {
      writeFileSync(htmlPath, html, 'utf-8');
      console.log(`\n✅ HTML zapisany: ${htmlPath}`);
    } else {
      console.log(`\n[DRY-RUN] HTML byłby zapisany do: ${htmlPath}`);
    }
    if (ONLY_STAGE === 'html') return;
  }

  // ── STAGE 4: EMBEDDER ────────────────────────────────────────────────────
  if (!ONLY_STAGE || ONLY_STAGE === 'embed') {
    await runEmbedder(ENV, translated);
    const vectorsPath = join(VECTORS_DIR, 'kb-vectors.json');
    console.log(`\n✅ Wektory zapisane: ${vectorsPath}`);
    if (ONLY_STAGE === 'embed') return;
  }

  // ── PODSUMOWANIE ─────────────────────────────────────────────────────────
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║                  MOA PIPELINE — ZAKOŃCZONY                  ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log(`║  📊 Dataset:    ${itemCount} rekordów`);
  console.log(`║  🗂  Tematy:     ${translated.length} tematów przetłumaczonych`);
  console.log(`║  🌐 HTML:       ai-hub/knowledge-base/index.html`);
  console.log(`║  🔍 Wektory:    ai-hub/js/data/vectors/kb-vectors.json`);
  console.log(`║  🔎 Moduł:      ai-hub/js/data/vectors/kb-search.mjs`);
  console.log('╚══════════════════════════════════════════════════════════════╝\n');
}

main().catch(err => {
  console.error('\n❌ KRYTYCZNY BŁĄD MOA PIPELINE:', err.message || err);
  if (err.stack) console.error(err.stack);
  process.exit(1);
});
