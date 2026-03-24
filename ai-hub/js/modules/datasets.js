/* ═══════════════════════════════════════════════════
   MODULE — Datasets (HuggingFace Hub)
   ═══════════════════════════════════════════════════ */

const DS_PRESET_QUERIES = {
  trending: '', polish: 'polish', nlp: 'text-classification',
  code: 'code', vision: 'image-classification', audio: 'automatic-speech-recognition',
};
let dsCache = {};

export async function searchDatasets(query) {
  const grid = document.getElementById('ds-grid');
  const loading = document.getElementById('ds-loading');
  const empty = document.getElementById('ds-empty');

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
    document.getElementById('ds-search').value = query;
    searchDatasets(query);
  }));
}
