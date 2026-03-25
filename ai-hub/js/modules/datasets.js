/* ═══════════════════════════════════════════════════
   MODULE — Datasets (HuggingFace Hub + Cloud R2)
   ═══════════════════════════════════════════════════ */

const DS_PRESET_QUERIES = {
  local:     '__local__',
  analytics: '__analytics__',
  finanse:   '__finanse__',
  business:  '__business__',
  ecommerce: '__ecommerce__',
  art:       '__art__',
  trending:  '',
  polish:    'polish',
  nlp:       'text-classification',
  code:      'code',
  vision:    'image-classification',
  audio:     'automatic-speech-recognition',
};

/* Cloud datasets served from local files or /api/datasets/ (R2 bucket) */
const DATASETS_API = '/api/datasets';
let cloudDatasets = null;

/* Full manifest — wszystkie datasety z biblioteki */
const ALL_CLOUD_DATASETS = [
  // ── ANALYTICS (mybonzo-analytics) ──────────────────────────────
  { id: 'seo-analytics-poland-free-tools', file: 'seo-analytics-poland-free-tools.json', name: 'SEO Analytics PL', cat: 'analytics', desc: 'Darmowe narzędzia SEO dla polskiego rynku', icon: '🔍', r2: 'mybonzo-analytics' },
  { id: 'website-analytics-free-tools', file: 'website-analytics-free-tools.json', name: 'Website Analytics Tools', cat: 'analytics', desc: 'Darmowe narzędzia analityki webowej', icon: '📊', r2: 'mybonzo-analytics' },
  { id: '_raw_analytics_tools', file: '_raw_analytics_tools.json', name: 'Raw Analytics Tools', cat: 'analytics', desc: 'Surowe dane Tavily — narzędzia analityczne', icon: '🗂️', r2: 'mybonzo-analytics' },
  // ── FINANSE (mybonzo-finanse) ───────────────────────────────────
  { id: 'financial-analytics', file: 'financial-analytics.json', name: 'Financial Analytics', cat: 'finanse', desc: 'Analityka finansowa — research Tavily/Gemini', icon: '📈', r2: 'mybonzo-finanse' },
  { id: 'financial-sentiment', file: 'financial-sentiment.json', name: 'Financial Sentiment', cat: 'finanse', desc: 'Analiza sentymentu finansowego (500 rekordów)', icon: '📉', r2: 'mybonzo-finanse' },
  { id: 'financial-tweets-sentiment', file: 'financial-tweets-sentiment.json', name: 'Financial Tweets Sentiment', cat: 'finanse', desc: 'Sentyment tweetów finansowych (500 rekordów)', icon: '🐦', r2: 'mybonzo-finanse' },
  { id: 'finance-forecasting-ai', file: 'finance-forecasting-ai.json', name: 'Finance Forecasting AI', cat: 'finanse', desc: 'AI w prognozowaniu finansowym', icon: '🔮', r2: 'mybonzo-finanse' },
  { id: 'financial-analysis-company-checklist', file: 'financial-analysis-company-checklist.json', name: 'Company Analysis Checklist', cat: 'finanse', desc: 'Checklist analizy finansowej spółki', icon: '✅', r2: 'mybonzo-finanse' },
  { id: '_raw_finance_forecasting', file: '_raw_finance_forecasting.json', name: 'Raw Finance Forecasting', cat: 'finanse', desc: 'Surowe dane Tavily — prognozowanie finansowe', icon: '🗂️', r2: 'mybonzo-finanse' },
  // ── BIZNES / AI ─────────────────────────────────────────────────
  { id: 'ai-business-models-saas', file: 'ai-business-models-saas.json', name: 'AI Business Models SaaS', cat: 'business', desc: 'Modele biznesowe AI i SaaS', icon: '🏢' },
  { id: 'ai-competitive-landscape', file: 'ai-competitive-landscape.json', name: 'AI Competitive Landscape', cat: 'business', desc: 'Krajobraz konkurencyjny rynku AI', icon: '⚔️' },
  { id: 'ai-in-business', file: 'ai-in-business.json', name: 'AI in Business', cat: 'business', desc: 'Zastosowania AI w biznesie — Tavily research', icon: '🤖' },
  { id: 'business-trends-2026', file: 'business-trends-2026.json', name: 'Business Trends 2026', cat: 'business', desc: 'Trendy biznesowe na rok 2026', icon: '📅' },
  { id: 'market-opportunities', file: 'market-opportunities.json', name: 'Market Opportunities', cat: 'business', desc: 'Możliwości rynkowe 2026 — Tavily research', icon: '💡' },
  { id: 'ai-monetization-online-income', file: 'ai-monetization-online-income.json', name: 'AI Monetization', cat: 'business', desc: 'Monetyzacja AI i zarabianie online', icon: '💰' },
  { id: 'ai-market-trends-statistics', file: 'ai-market-trends-statistics.json', name: 'AI Market Statistics', cat: 'business', desc: 'Statystyki i trendy rynku AI', icon: '📊' },
  { id: 'ai-ethics-safety', file: 'ai-ethics-safety.json', name: 'AI Ethics & Safety', cat: 'business', desc: 'Etyka i bezpieczeństwo systemów AI', icon: '🛡️' },
  { id: 'ai-funding-valuations', file: 'ai-funding-valuations.json', name: 'AI Funding & Valuations', cat: 'business', desc: 'Finansowanie i wyceny startupów AI', icon: '💸' },
  { id: 'ai-genai-tools-comparison', file: 'ai-genai-tools-comparison.json', name: 'GenAI Tools Comparison', cat: 'business', desc: 'Porównanie narzędzi Generative AI', icon: '⚡' },
  { id: 'ai-implementation-case-studies', file: 'ai-implementation-case-studies.json', name: 'AI Case Studies', cat: 'business', desc: 'Studia przypadków wdrożeń AI', icon: '📋' },
  { id: 'ai-regulation-compliance', file: 'ai-regulation-compliance.json', name: 'AI Regulation & Compliance', cat: 'business', desc: 'Regulacje prawne i compliance AI (EU AI Act)', icon: '⚖️' },
  { id: 'ai-talent-market', file: 'ai-talent-market.json', name: 'AI Talent Market', cat: 'business', desc: 'Rynek talentów i zatrudnienie w AI', icon: '👨‍💻' },
  { id: 'online-business-growth-tools', file: 'online-business-growth-tools.json', name: 'Online Business Growth', cat: 'business', desc: 'Narzędzia wzrostu biznesu online', icon: '🚀' },
  { id: 'ai-on-android-apps', file: 'ai-on-android-apps.json', name: 'AI on Android Apps', cat: 'business', desc: 'AI w aplikacjach mobilnych Android', icon: '📱' },
  // ── E-COMMERCE ──────────────────────────────────────────────────
  { id: 'ecommerce-growth', file: 'ecommerce-growth.json', name: 'E-commerce Growth 2026', cat: 'ecommerce', desc: 'Wzrost i trendy e-commerce — Tavily research', icon: '🛒' },
  { id: 'b2b-sales-data', file: 'b2b-sales-data.json', name: 'B2B Sales Data', cat: 'ecommerce', desc: 'Dane sprzedażowe B2B (448 rekordów)', icon: '📦' },
  { id: 'ecommerce-chatbot-training', file: 'ecommerce-chatbot-training.json', name: 'E-commerce Chatbot Training', cat: 'ecommerce', desc: 'Dane treningowe chatbota sklepu (3000+ par)', icon: '🤖' },
  { id: 'ecommerce-support-qa', file: 'ecommerce-support-qa.json', name: 'E-commerce Support QA', cat: 'ecommerce', desc: 'Q&A obsługi klienta e-commerce (11 000+ par)', icon: '💬' },
  // ── ART / PROMPTS ────────────────────────────────────────────────
  { id: 'midjourney-detailed-prompts', file: 'midjourney-detailed-prompts.json', name: 'Midjourney Detailed Prompts', cat: 'art', desc: 'Szczegółowe prompty Midjourney (5000+)', icon: '🎨' },
  { id: 'midjourney-prompts', file: 'midjourney-prompts.json', name: 'Midjourney Prompts', cat: 'art', desc: 'Kolekcja promptów Midjourney', icon: '✨' },
  { id: 'sd-prompts', file: 'sd-prompts.json', name: 'Stable Diffusion Prompts', cat: 'art', desc: 'Prompty Stable Diffusion', icon: '🖼️' },
  { id: 'sdxl-prompts', file: 'sdxl-prompts.json', name: 'SDXL Prompts', cat: 'art', desc: 'Zoptymalizowane prompty SDXL', icon: '⚡' },
  // ── ANALYTICS (raw) ─────────────────────────────────────────────
  { id: '_raw_seo_pl', file: '_raw_seo_pl.json', name: 'Raw SEO PL', cat: 'analytics', desc: 'Surowe dane Tavily — SEO dla polskiego rynku', icon: '🗂️', r2: 'mybonzo-analytics' },
  // ── BIZNES (raw) ─────────────────────────────────────────────────
  { id: '_raw_ai_monetization', file: '_raw_ai_monetization.json', name: 'Raw AI Monetization', cat: 'business', desc: 'Surowe dane Tavily — monetyzacja AI i zarabianie online', icon: '🗂️' },
  { id: '_raw_online_business', file: '_raw_online_business.json', name: 'Raw Online Business', cat: 'business', desc: 'Surowe dane Tavily — biznes online i narzędzia wzrostu', icon: '🗂️' },
  // ── INDEKS ───────────────────────────────────────────────────────
  { id: 'research-index', file: 'research-index.json', name: 'Research Index', cat: 'analytics', desc: 'Indeks wszystkich research sessions Tavily', icon: '📇', r2: 'mybonzo-analytics' },
];

let dsCache = {};
let localDataLoaded = {};

export async function searchDatasets(query) {
  const grid = document.getElementById('ds-grid');
  const loading = document.getElementById('ds-loading');
  const empty = document.getElementById('ds-empty');

  // Cloud datasets view
  if (query.startsWith('__') && query.endsWith('__')) {
    loading.style.display = 'none';
    empty.style.display = 'none';
    const cat = query.replace(/__/g, '');
    renderCloudDatasets(cat === 'local' ? null : cat);
    return;
  }

  if (dsCache[query]) { renderDatasets(dsCache[query]); return; }

  grid.innerHTML = ''; empty.style.display = 'none'; loading.style.display = 'block';
  try {
    const params = new URLSearchParams({ limit: '24', sort: 'downloads' });
    if (query) params.set('search', query);
    const r = await fetch('https://huggingface.co/api/datasets?' + params.toString());
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const data = await r.json();
    dsCache[query] = data;
    renderDatasets(data);
  } catch (e) {
    loading.style.display = 'none';
    grid.innerHTML = `<div class="glass" style="padding:2rem;grid-column:1/-1;text-align:center;color:var(--danger)">
      ⚠️ Błąd wyszukiwania: ${e.message}<br>
      <span style="font-size:.8rem;color:var(--text-dim)">Spróbuj ponownie lub sprawdź połączenie</span></div>`;
  }
}

function renderDatasets(datasets) {
  const grid = document.getElementById('ds-grid');
  const loading = document.getElementById('ds-loading');
  const empty = document.getElementById('ds-empty');
  loading.style.display = 'none';

  if (!datasets || datasets.length === 0) {
    empty.style.display = 'block'; grid.innerHTML = ''; return;
  }
  empty.style.display = 'none';

  grid.innerHTML = datasets.map(d => {
    const dl = d.downloads || 0;
    const likes = d.likes || 0;
    const dlStr = dl >= 1e6 ? (dl/1e6).toFixed(1)+'M' : dl >= 1e3 ? (dl/1e3).toFixed(1)+'K' : dl;
    const likesStr = likes >= 1e3 ? (likes/1e3).toFixed(1)+'K' : likes;
    const tags = (d.tags || []).slice(0, 4);
    return `
    <div class="glass model-card" style="cursor:pointer"
      onclick="window.open('https://huggingface.co/datasets/${encodeURIComponent(d.id)}','_blank')">
      <div class="model-head">
        <div>
          <div class="model-name" style="font-size:.95rem">${d.id.split('/').pop()}</div>
          <div class="model-provider">${d.id.includes('/') ? d.id.split('/')[0] : 'community'}</div>
        </div>
        <span class="model-badge badge-api" style="font-size:.65rem">HF</span>
      </div>
      <div class="model-desc" style="font-size:.8rem;-webkit-line-clamp:2;display:-webkit-box;-webkit-box-orient:vertical;overflow:hidden">
        ${d.description || d.id}
      </div>
      <div class="model-meta">
        ${tags.map(t => `<span class="model-chip" style="font-size:.65rem">${t}</span>`).join('')}
      </div>
      <div class="model-footer">
        <span style="font-size:.78rem;color:var(--text-dim)">⬇️ ${dlStr} &nbsp;❤️ ${likesStr}</span>
        <span class="model-badge badge-new" style="font-size:.6rem">Dataset</span>
      </div>
    </div>`;
  }).join('');
}

export function initDatasets() {
  // Debounced search input
  let debounce;
  document.getElementById('ds-search').addEventListener('input', e => {
    clearTimeout(debounce);
    debounce = setTimeout(() => {
      const q = e.target.value.trim();
      if (q.length >= 2) searchDatasets(q);
    }, 500);
  });

  // Category pills
  document.querySelectorAll('#ds-pills .pill').forEach(p => p.addEventListener('click', () => {
    document.querySelectorAll('#ds-pills .pill').forEach(x => x.classList.remove('active'));
    p.classList.add('active');
    const ds = p.dataset.ds;
    if (ds === 'tools') { renderToolsPanel(); return; }
    const query = DS_PRESET_QUERIES[ds] || '';
    document.getElementById('ds-search').value = query === '__local__' ? '' : query;
    searchDatasets(query);
  }));

  // Auto-load cloud datasets on start
  renderCloudDatasets();
}

/* ── Fetch dataset list from API (lub manifest lokalny) ── */
async function loadCloudDatasetList() {
  if (cloudDatasets) return cloudDatasets;
  try {
    const r = await fetch(DATASETS_API + '/list', { signal: AbortSignal.timeout(3000) });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const data = await r.json();
    const apiIds = new Set((data.datasets || []).map(d => d.id));
    const localOnly = ALL_CLOUD_DATASETS.filter(d => !apiIds.has(d.id));
    cloudDatasets = [...(data.datasets || []), ...localOnly];
    return cloudDatasets;
  } catch {
    cloudDatasets = [...ALL_CLOUD_DATASETS];
    return cloudDatasets;
  }
}

/* Mapowanie kategorii → badge kolor + etykieta */
const CAT_BADGE = {
  analytics: { label: '📊 Analytics', bg: 'linear-gradient(135deg,#0ea5e9,#38bdf8)', color: '#000' },
  finanse:   { label: '💰 Finanse',   bg: 'linear-gradient(135deg,#22c55e,#4ade80)', color: '#000' },
  business:  { label: '🤖 Biznes/AI', bg: 'linear-gradient(135deg,#a855f7,#c084fc)', color: '#fff' },
  ecommerce: { label: '🛒 E-commerce',bg: 'linear-gradient(135deg,#f97316,#fb923c)', color: '#fff' },
  art:       { label: '🎨 Art',       bg: 'linear-gradient(135deg,#ec4899,#f472b6)', color: '#fff' },
};

/* ── Cloud datasets renderer ── */
async function renderCloudDatasets(filterCat) {
  const grid = document.getElementById('ds-grid');
  const loading = document.getElementById('ds-loading');
  const empty = document.getElementById('ds-empty');
  if (empty) empty.style.display = 'none';
  if (loading) loading.style.display = 'block';

  const allDatasets = await loadCloudDatasetList();
  if (loading) loading.style.display = 'none';

  const datasets = filterCat ? allDatasets.filter(d => d.cat === filterCat) : allDatasets;

  if (!datasets || datasets.length === 0) {
    if (empty) empty.style.display = 'block';
    return;
  }

  grid.innerHTML = datasets.map(d => {
    const badge = CAT_BADGE[d.cat] || { label: '☁ R2', bg: 'linear-gradient(135deg,var(--accent),var(--accent2))', color: '#000' };
    const r2label = d.r2 ? `<span class="model-chip" style="font-size:.6rem;opacity:.7">${d.r2}</span>` : '';
    return `
    <div class="glass model-card" style="cursor:pointer" onclick="previewCloudDataset('${d.id}')">
      <div class="model-head">
        <div>
          <div class="model-name" style="font-size:.95rem">${d.icon || '☁️'} ${d.name}</div>
          <div class="model-provider">${d.cat}</div>
        </div>
        <span class="model-badge" style="font-size:.62rem;background:${badge.bg};color:${badge.color};font-weight:700;padding:2px 7px;border-radius:4px">${badge.label}</span>
      </div>
      <div class="model-desc" style="font-size:.8rem;-webkit-line-clamp:2;display:-webkit-box;-webkit-box-orient:vertical;overflow:hidden">
        ${d.desc}
      </div>
      <div class="model-meta">
        ${r2label}
        <span class="model-chip" style="font-size:.65rem">JSON</span>
      </div>
      <div class="model-footer">
        <span style="font-size:.75rem;color:var(--text-dim);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:140px">${d.file}</span>
        <button class="app-open-btn" style="font-size:.7rem;padding:4px 10px" onclick="event.stopPropagation();previewCloudDataset('${d.id}')">👁️ Podgląd</button>
      </div>
    </div>`;
  }).join('');
}

/* ── Preview cloud dataset ── */
async function previewCloudDataset(id) {
  const datasets = await loadCloudDatasetList();
  const ds = datasets.find(d => d.id === id);
  if (!ds) return;

  const grid = document.getElementById('ds-grid');

  if (localDataLoaded[id]) {
    showDatasetPreview(ds, localDataLoaded[id]);
    return;
  }

  grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:2rem;color:var(--text-dim)">\u23F3 \u0141adowanie ${ds.name} z chmury...</div>`;

  // 1. Spróbuj lokalny plik (działa zawsze, w dev i produkcji)
  const localPath = `./js/data/datasets/${ds.file}`;
  const apiPath   = `${DATASETS_API}/${ds.id}`;

  let data = null;
  let fetchErr = null;

  for (const url of [localPath, apiPath]) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      data = await r.json();
      break;
    } catch (e) {
      fetchErr = e;
    }
  }

  if (!data) {
    grid.innerHTML = `<div class="glass" style="padding:2rem;grid-column:1/-1;text-align:center;color:var(--danger)">⚠️ Błąd pobierania: ${fetchErr?.message}<br><span style="font-size:.8rem;color:var(--text-dim)">Plik: ${ds.file}</span></div>`;
    return;
  }

  localDataLoaded[id] = data;
  showDatasetPreview(ds, data);
}

function showDatasetPreview(ds, data) {
  const grid = document.getElementById('ds-grid');
  const backBtn = `<button class="app-open-btn" style="font-size:.7rem;padding:4px 10px" onclick="searchDatasets('__local__')">← Wróć</button>`;
  const badge = CAT_BADGE[ds.cat] || {};
  const badgeHtml = badge.label
    ? `<span style="font-size:.65rem;background:${badge.bg};color:${badge.color};padding:2px 7px;border-radius:4px;font-weight:700">${badge.label}</span>`
    : '';

  // FORMAT 1: Flat array
  if (Array.isArray(data)) {
    const sample = data.slice(0, 8);
    const keys = sample.length > 0 ? Object.keys(sample[0]).slice(0, 7) : [];
    const total = data.length;
    grid.innerHTML = `
      <div class="glass" style="grid-column:1/-1;padding:1.5rem">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;flex-wrap:wrap;gap:.5rem">
          <h3 style="color:var(--accent);font-size:1rem;margin:0">${ds.icon || ''} ${ds.name} ${badgeHtml}</h3>
          <div style="display:flex;gap:.8rem;align-items:center">
            <span style="font-size:.8rem;color:var(--text-dim)">${total.toLocaleString()} rekordów · ${keys.length} kolumn</span>
            ${backBtn}
          </div>
        </div>
        <div style="overflow-x:auto">
          <table style="width:100%;border-collapse:collapse;font-size:.75rem">
            <thead><tr>${keys.map(k => `<th style="text-align:left;padding:6px 8px;border-bottom:1px solid var(--glass-border);color:var(--accent2);font-weight:600;white-space:nowrap">${k}</th>`).join('')}</tr></thead>
            <tbody>${sample.map(row => `<tr>${keys.map(k => {
              let val = row[k];
              if (typeof val === 'object') val = JSON.stringify(val).slice(0, 60);
              if (typeof val === 'string' && val.length > 90) val = val.slice(0, 90) + '…';
              return `<td style="padding:5px 8px;border-bottom:1px solid rgba(255,255,255,0.03);color:var(--text-muted);max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${val ?? ''}</td>`;
            }).join('')}</tr>`).join('')}</tbody>
          </table>
        </div>
        <div style="margin-top:.8rem;font-size:.75rem;color:var(--text-dim)">Pokazano ${Math.min(8, total)} z ${total.toLocaleString()} rekordów</div>
      </div>`;
    return;
  }

  // FORMAT 2: Tavily Research {summary, raw_searches, sources}
  if (data.summary || data.raw_searches) {
    const meta = [
      data.generated     ? `📅 ${data.generated}` : '',
      data.source        ? `🔧 ${data.source}` : '',
      data.queries_count ? `🔍 ${data.queries_count} zapytań` : '',
      data.credits_used  ? `💳 ${data.credits_used} credits` : '',
    ].filter(Boolean).join('  ·  ');

    const sources = data.sources || data.raw_searches?.flatMap(s => s.results?.slice(0, 2) || []) || [];
    const sourcesRows = sources.slice(0, 10).map(s => `
      <tr>
        <td style="padding:5px 8px;color:var(--text-muted);font-size:.75rem;border-bottom:1px solid rgba(255,255,255,0.04)">
          <a href="${s.url}" target="_blank" style="color:var(--accent);text-decoration:none">${(s.title || s.url || '').slice(0, 70)}</a>
        </td>
        <td style="padding:5px 8px;color:var(--text-dim);font-size:.7rem;border-bottom:1px solid rgba(255,255,255,0.04);max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
          ${(s.content || '').slice(0, 120)}…
        </td>
      </tr>`).join('');
    const summaryText = typeof data.summary === 'string'
      ? data.summary.slice(0, 800) + (data.summary.length > 800 ? '…' : '')
      : '';
    grid.innerHTML = `
      <div class="glass" style="grid-column:1/-1;padding:1.5rem">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;flex-wrap:wrap;gap:.5rem">
          <h3 style="color:var(--accent);font-size:1rem;margin:0">${ds.icon || ''} ${ds.name} ${badgeHtml}</h3>
          ${backBtn}
        </div>
        <div style="font-size:.78rem;color:var(--text-dim);margin-bottom:1rem">${meta}</div>
        ${summaryText ? `<div style="font-size:.82rem;line-height:1.6;color:var(--text-muted);padding:.8rem;background:rgba(255,255,255,0.03);border-radius:6px;margin-bottom:1.2rem;white-space:pre-wrap">${summaryText}</div>` : ''}
        ${sourcesRows ? `
          <div style="font-size:.8rem;color:var(--accent2);font-weight:600;margin-bottom:.5rem">📌 Źródła (${Math.min(10, sources.length)} z ${sources.length})</div>
          <div style="overflow-x:auto">
            <table style="width:100%;border-collapse:collapse">
              <thead><tr>
                <th style="text-align:left;padding:6px 8px;border-bottom:1px solid var(--glass-border);color:var(--accent2);font-size:.72rem">Tytuł / URL</th>
                <th style="text-align:left;padding:6px 8px;border-bottom:1px solid var(--glass-border);color:var(--accent2);font-size:.72rem">Fragment</th>
              </tr></thead>
              <tbody>${sourcesRows}</tbody>
            </table>
          </div>` : ''}
      </div>`;
    return;
  }

  // FORMAT 3: Curated dataset {title, description, articles, tags}
  const articles = data.articles || data.data_points || [];
  const useCases = data.use_cases || [];
  const tags = data.tags || [];
  const meta2 = [
    data.created  ? `📅 ${data.created}` : '',
    data.credits  ? `💳 ${data.credits} credits` : '',
    articles.length ? `📄 ${articles.length} artykułów` : '',
  ].filter(Boolean).join('  ·  ');
  grid.innerHTML = `
    <div class="glass" style="grid-column:1/-1;padding:1.5rem">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;flex-wrap:wrap;gap:.5rem">
        <h3 style="color:var(--accent);font-size:1rem;margin:0">${ds.icon || ''} ${data.title || ds.name} ${badgeHtml}</h3>
        ${backBtn}
      </div>
      <div style="font-size:.78rem;color:var(--text-dim);margin-bottom:.8rem">${meta2}</div>
      ${data.description ? `<p style="font-size:.82rem;color:var(--text-muted);line-height:1.6;margin-bottom:1rem">${data.description}</p>` : ''}
      ${tags.length ? `<div style="display:flex;flex-wrap:wrap;gap:.4rem;margin-bottom:1rem">${tags.map(t => `<span class="model-chip" style="font-size:.68rem">${t}</span>`).join('')}</div>` : ''}
      ${useCases.length ? `<div style="margin-bottom:1rem"><div style="font-size:.8rem;color:var(--accent2);font-weight:600;margin-bottom:.4rem">Use cases:</div><ul style="font-size:.8rem;color:var(--text-muted);padding-left:1.2rem;margin:0">${useCases.map(u => `<li>${u}</li>`).join('')}</ul></div>` : ''}
      ${articles.slice(0, 6).map(a => `<div style="padding:.6rem;border-bottom:1px solid rgba(255,255,255,0.05);font-size:.8rem;color:var(--text-muted)">${typeof a === 'string' ? a : (a.title || JSON.stringify(a).slice(0, 100))}</div>`).join('')}
    </div>`;
}

// ── Tools panel (tools-and-links.json) ────────────────────────────────────
async function renderToolsPanel() {
  const grid = document.getElementById('ds-grid');
  const loading = document.getElementById('ds-loading');
  const empty = document.getElementById('ds-empty');
  if (empty) empty.style.display = 'none';
  if (loading) loading.style.display = 'block';
  grid.innerHTML = '';

  let report;
  try {
    const resp = await fetch('./js/data/datasets/tools-and-links.json');
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    report = await resp.json();
  } catch(e) {
    if (loading) loading.style.display = 'none';
    grid.innerHTML = `<div class="glass" style="grid-column:1/-1;padding:2rem;text-align:center;color:var(--text-dim)"><div style="font-size:1.5rem;margin-bottom:.5rem">⚠️</div><p>Brak pliku tools-and-links.json — uruchom scripts/cf-process-datasets.mjs</p><code style="font-size:.75rem;color:var(--accent)">${e.message}</code></div>`;
    return;
  }
  if (loading) loading.style.display = 'none';

  const CAT_LABEL = { analytics:'📊 Analytics', finanse:'💰 Finanse', business:'🤖 Biznes', ecommerce:'🛒 E-commerce', other:'🌐 Inne' };
  const CAT_COLOR = { analytics:'#3B82F6', finanse:'#10B981', business:'#8B5CF6', ecommerce:'#F59E0B', other:'#6B7280' };

  // Header stats
  const s = report.stats || {};
  let html = `<div class="glass" style="grid-column:1/-1;padding:1.5rem;margin-bottom:.5rem">
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:.5rem;margin-bottom:1rem">
      <h3 style="color:var(--accent);font-size:1rem;margin:0">🔧 Narzędzia wyekstrahowane przez CF AI</h3>
      <span style="font-size:.72rem;color:var(--text-dim)">Model: ${report.model || ''} · ${report.generated || ''}</span>
    </div>
    <div style="display:flex;gap:1.5rem;flex-wrap:wrap">
      <div style="text-align:center"><div style="font-size:1.6rem;font-weight:700;color:var(--accent)">${s.tools_total||0}</div><div style="font-size:.72rem;color:var(--text-dim)">narzędzi</div></div>
      <div style="text-align:center"><div style="font-size:1.6rem;font-weight:700;color:var(--accent2)">${s.links_total||0}</div><div style="font-size:.72rem;color:var(--text-dim)">linków</div></div>
      <div style="text-align:center"><div style="font-size:1.6rem;font-weight:700;color:#10B981">${s.translations_total||0}</div><div style="font-size:.72rem;color:var(--text-dim)">tłumaczeń</div></div>
      <div style="text-align:center"><div style="font-size:1.6rem;font-weight:700;color:var(--text-muted)">${s.files_processed||0}</div><div style="font-size:.72rem;color:var(--text-dim)">plików</div></div>
    </div>
  </div>`;

  // Tools by category
  const byCategory = report.tools_by_category || {};
  for (const [cat, tools] of Object.entries(byCategory)) {
    if (!tools || tools.length === 0) continue;
    const color = CAT_COLOR[cat] || '#6B7280';
    const label = CAT_LABEL[cat] || cat;
    html += `<div class="glass" style="grid-column:1/-1;padding:1.2rem;margin-bottom:.3rem">
      <div style="font-size:.85rem;font-weight:700;color:${color};margin-bottom:.8rem;border-bottom:1px solid rgba(255,255,255,.06);padding-bottom:.5rem">${label} · ${tools.length} narzędzi</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:.5rem">
        ${tools.map(t => {
          const pricingColor = t.pricing==='free'?'#10B981':t.pricing==='freemium'?'#F59E0B':'#EF4444';
          const urlHtml = t.url ? `<a href="${t.url}" target="_blank" rel="noopener" style="color:var(--accent);font-size:.7rem;word-break:break-all">${t.url.replace(/^https?:\/\//, '').slice(0,40)}</a>` : '<span style="color:var(--text-dim);font-size:.7rem">brak URL</span>';
          return `<div style="padding:.6rem .8rem;background:rgba(255,255,255,.03);border-radius:6px;border:1px solid rgba(255,255,255,.06)">
            <div style="font-size:.82rem;font-weight:600;color:var(--text-muted);margin-bottom:.2rem">${t.name||'?'} <span style="font-size:.67rem;color:${pricingColor};font-weight:700">${(t.pricing||'').toUpperCase()}</span></div>
            ${urlHtml}
            ${t.desc_pl ? `<div style="font-size:.7rem;color:var(--text-dim);margin-top:.25rem;line-height:1.4">${t.desc_pl.slice(0,80)}</div>` : ''}
          </div>`;
        }).join('')}
      </div>
    </div>`;
  }

  // Translations section
  const trans = report.translations || {};
  const transKeys = Object.keys(trans);
  if (transKeys.length > 0) {
    html += `<div class="glass" style="grid-column:1/-1;padding:1.2rem">
      <div style="font-size:.85rem;font-weight:700;color:#10B981;margin-bottom:.8rem">🌍 Tłumaczenia PL (${transKeys.length})</div>
      ${transKeys.map(k => `<details style="margin-bottom:.5rem"><summary style="cursor:pointer;font-size:.8rem;color:var(--accent2);padding:.4rem 0">${k}</summary><p style="font-size:.78rem;color:var(--text-muted);line-height:1.6;padding:.5rem 0;margin:0">${trans[k].translated_pl||''}</p></details>`).join('')}
    </div>`;
  }

  grid.innerHTML = html;
}

// Expose for inline onclick
window.previewCloudDataset = previewCloudDataset;
window.renderToolsPanel = renderToolsPanel;
