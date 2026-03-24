/* ═══════════════════════════════════════════════════
   MODULE — Datasets (HuggingFace Hub + Local)
   ═══════════════════════════════════════════════════ */

const DS_PRESET_QUERIES = {
  trending: '', polish: 'polish', nlp: 'text-classification',
  code: 'code', vision: 'image-classification', audio: 'automatic-speech-recognition',
  local: '__local__',
};

const LOCAL_DATASETS = [
  { id: 'b2b-sales-data', name: 'B2B Sales Data', file: 'b2b-sales-data.json', cat: 'business', desc: 'Dane sprzedażowe B2B — produkty, sprzedawcy, autorytety, konkurencja', icon: '💼' },
  { id: 'ecommerce-chatbot', name: 'E-commerce Chatbot', file: 'ecommerce-chatbot-training.json', cat: 'business', desc: 'Dane treningowe chatbota e-commerce — instrukcje i odpowiedzi', icon: '🤖' },
  { id: 'ecommerce-support', name: 'E-commerce Support QA', file: 'ecommerce-support-qa.json', cat: 'business', desc: 'Pytania i odpowiedzi supportu e-commerce — kategorie problemów', icon: '🛒' },
  { id: 'financial-sentiment', name: 'Financial Sentiment', file: 'financial-sentiment.json', cat: 'business', desc: 'Analiza sentymentu tekstów finansowych — pozytywny/negatywny/neutralny', icon: '📈' },
  { id: 'financial-tweets', name: 'Financial Tweets', file: 'financial-tweets-sentiment.json', cat: 'business', desc: 'Sentyment tweetów finansowych — analiza nastrojów rynkowych', icon: '🐦' },
  { id: 'midjourney-detailed', name: 'Midjourney Detailed Prompts', file: 'midjourney-detailed-prompts.json', cat: 'art', desc: 'Szczegółowe prompty Midjourney z obrazami referencyjnymi', icon: '🎨' },
  { id: 'midjourney-prompts', name: 'Midjourney Prompts', file: 'midjourney-prompts.json', cat: 'art', desc: 'Kolekcja promptów do Midjourney — różne style i tematy', icon: '✨' },
  { id: 'sd-prompts', name: 'Stable Diffusion Prompts', file: 'sd-prompts.json', cat: 'art', desc: 'Prompty do Stable Diffusion — render, sci-fi, fotorealizm', icon: '🖼️' },
  { id: 'sdxl-prompts', name: 'SDXL Prompts', file: 'sdxl-prompts.json', cat: 'art', desc: 'Prompty do SDXL — zaawansowane opisy do generowania obrazów', icon: '⚡' },
];

let dsCache = {};
let localDataLoaded = {};

export async function searchDatasets(query) {
  const grid = document.getElementById('ds-grid');
  const loading = document.getElementById('ds-loading');
  const empty = document.getElementById('ds-empty');

  // Local datasets view
  if (query === '__local__') {
    loading.style.display = 'none';
    empty.style.display = 'none';
    renderLocalDatasets();
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
    const query = DS_PRESET_QUERIES[p.dataset.ds] || '';
    document.getElementById('ds-search').value = query === '__local__' ? '' : query;
    searchDatasets(query);
  }));

  // Auto-load local datasets on start
  renderLocalDatasets();
}

/* ── Local datasets renderer ── */
function renderLocalDatasets() {
  const grid = document.getElementById('ds-grid');
  const empty = document.getElementById('ds-empty');
  if (empty) empty.style.display = 'none';

  grid.innerHTML = LOCAL_DATASETS.map(d => {
    const sizeStr = '';
    return `
    <div class="glass model-card" style="cursor:pointer" onclick="previewLocalDataset('${d.id}')">
      <div class="model-head">
        <div>
          <div class="model-name" style="font-size:.95rem">${d.icon} ${d.name}</div>
          <div class="model-provider">${d.cat}</div>
        </div>
        <span class="model-badge badge-local" style="font-size:.65rem;background:linear-gradient(135deg,var(--accent),var(--accent2));color:#000;font-weight:700">LOKALNY</span>
      </div>
      <div class="model-desc" style="font-size:.8rem;-webkit-line-clamp:2;display:-webkit-box;-webkit-box-orient:vertical;overflow:hidden">
        ${d.desc}
      </div>
      <div class="model-meta">
        <span class="model-chip" style="font-size:.65rem">${d.cat}</span>
        <span class="model-chip" style="font-size:.65rem">JSON</span>
      </div>
      <div class="model-footer">
        <span style="font-size:.78rem;color:var(--text-dim)">📁 ${d.file}</span>
        <button class="app-open-btn" style="font-size:.7rem;padding:4px 10px" onclick="event.stopPropagation();previewLocalDataset('${d.id}')">👁️ Podgląd</button>
      </div>
    </div>`;
  }).join('');
}

/* ── Preview local dataset ── */
async function previewLocalDataset(id) {
  const ds = LOCAL_DATASETS.find(d => d.id === id);
  if (!ds) return;

  const grid = document.getElementById('ds-grid');

  if (localDataLoaded[id]) {
    showDatasetPreview(ds, localDataLoaded[id]);
    return;
  }

  grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:2rem;color:var(--text-dim)">⏳ Ładowanie ${ds.name}...</div>`;

  try {
    const r = await fetch(`js/data/datasets/${ds.file}`);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const data = await r.json();
    localDataLoaded[id] = data;
    showDatasetPreview(ds, data);
  } catch (e) {
    grid.innerHTML = `<div class="glass" style="padding:2rem;grid-column:1/-1;text-align:center;color:var(--danger)">⚠️ Błąd: ${e.message}</div>`;
  }
}

function showDatasetPreview(ds, data) {
  const grid = document.getElementById('ds-grid');
  const sample = Array.isArray(data) ? data.slice(0, 8) : [];
  const keys = sample.length > 0 ? Object.keys(sample[0]).slice(0, 6) : [];
  const total = Array.isArray(data) ? data.length : 0;

  grid.innerHTML = `
    <div class="glass" style="grid-column:1/-1;padding:1.5rem">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem">
        <h3 style="color:var(--accent);font-size:1rem;margin:0">${ds.icon} ${ds.name}</h3>
        <div style="display:flex;gap:.8rem;align-items:center">
          <span style="font-size:.8rem;color:var(--text-dim)">${total} rekordów · ${keys.length} kolumn</span>
          <button class="app-open-btn" style="font-size:.7rem;padding:4px 10px" onclick="searchDatasets('__local__')">← Wróć</button>
        </div>
      </div>
      <div style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse;font-size:.75rem">
          <thead>
            <tr>${keys.map(k => `<th style="text-align:left;padding:6px 8px;border-bottom:1px solid var(--glass-border);color:var(--accent2);font-weight:600;white-space:nowrap">${k}</th>`).join('')}</tr>
          </thead>
          <tbody>
            ${sample.map(row => `<tr>${keys.map(k => {
              let val = row[k];
              if (typeof val === 'object') val = JSON.stringify(val).slice(0, 60);
              if (typeof val === 'string' && val.length > 80) val = val.slice(0, 80) + '…';
              return `<td style="padding:5px 8px;border-bottom:1px solid rgba(255,255,255,0.03);color:var(--text-muted);max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${val ?? ''}</td>`;
            }).join('')}</tr>`).join('')}
          </tbody>
        </table>
      </div>
      <div style="margin-top:.8rem;font-size:.75rem;color:var(--text-dim)">Pokazano ${Math.min(8, total)} z ${total} rekordów</div>
    </div>`;
}

// Expose for inline onclick
window.previewLocalDataset = previewLocalDataset;
