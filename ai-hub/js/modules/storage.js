/* ═══════════════════════════════════════════════════
   MODULE — R2 Storage Browser
   API: /api/storage/buckets  /api/storage/browse/:bucket
   ═══════════════════════════════════════════════════ */

const API = '/api/storage';

const FILE_ICONS = {
  mp4: '🎬', mov: '🎬', avi: '🎬', mkv: '🎬', webm: '🎬',
  jpg: '🖼', jpeg: '🖼', png: '🖼', gif: '🖼', webp: '🖼', svg: '🖼', avif: '🖼',
  pdf: '📄',
  json: '📝', js: '📝', ts: '📝', md: '📝', txt: '📝', csv: '📝', xml: '📝',
  zip: '📦', tar: '📦', gz: '📦', br: '📦', zst: '📦',
  wasm: '⚙️', bin: '⚙️',
  html: '🌐', css: '🎨',
};

function fileIcon(key) {
  if (key.endsWith('/')) return '📁';
  const ext = key.split('.').pop()?.toLowerCase() ?? '';
  return FILE_ICONS[ext] ?? '📄';
}

function formatSize(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// ── State ──────────────────────────────────────────

let state = {
  buckets: [],
  currentBucket: null,
  prefix: '',
  objects: [],
  cursor: null,
  loading: false,
  search: '',
  error: null,
};

// ── API calls ──────────────────────────────────────

async function fetchBuckets() {
  const res = await fetch(`${API}/buckets`);
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

async function fetchObjects(bucket, prefix = '', cursor = null) {
  let url = `${API}/browse/${encodeURIComponent(bucket)}?limit=100&prefix=${encodeURIComponent(prefix)}`;
  if (cursor) url += `&cursor=${encodeURIComponent(cursor)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

// ── Render helpers ─────────────────────────────────

function el(id) { return document.getElementById(id); }

function renderBuckets() {
  const grid = el('st-buckets-grid');
  if (!grid) return;

  const PRIORITY = ['bonzo-media-hub', 'zen-static-assets', 'zen-blog-images', 'mybonzo-media', 'mybonzo-videos'];

  const sorted = [...state.buckets].sort((a, b) => {
    const ai = PRIORITY.indexOf(a.name), bi = PRIORITY.indexOf(b.name);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return a.name.localeCompare(b.name);
  });

  const CATEGORY_COLOR = {
    media: 'var(--accent)', assets: 'var(--accent2)', ai: '#a78bfa',
    data: '#60a5fa', backups: '#f87171', content: '#34d399',
    templates: '#fbbf24', general: 'var(--text-muted)',
  };

  grid.innerHTML = sorted.map(b => `
    <div class="glass st-bucket-card" onclick="stOpenBucket('${b.name}')"
         style="padding:1.1rem 1.2rem;cursor:pointer;border:1px solid var(--glass-border);border-radius:12px;
                transition:var(--transition);display:flex;flex-direction:column;gap:.4rem">
      <div style="display:flex;align-items:center;gap:.6rem">
        <span style="font-size:1.3rem">🗄</span>
        <span style="font-weight:600;font-size:.88rem;color:var(--text)">${b.name}</span>
        <span style="margin-left:auto;font-size:.72rem;padding:.15rem .5rem;border-radius:20px;
                     background:${CATEGORY_COLOR[b.category] ?? 'var(--text-muted)'}22;
                     color:${CATEGORY_COLOR[b.category] ?? 'var(--text-muted)'};">${b.category}</span>
      </div>
      <div style="font-size:.78rem;color:var(--text-muted)">${b.description}</div>
    </div>
  `).join('');
}

function renderBreadcrumb() {
  const bc = el('st-breadcrumb');
  if (!bc) return;
  const parts = ['STORAGE'];
  if (state.currentBucket) parts.push(state.currentBucket);
  if (state.prefix) state.prefix.split('/').filter(Boolean).forEach(p => parts.push(p));

  bc.innerHTML = parts.map((p, i) => {
    const isLast = i === parts.length - 1;
    if (isLast) return `<span style="color:var(--text)">${p}</span>`;
    let onclick = '';
    if (i === 0) onclick = `onclick="stBack()"`;
    else if (i === 1) onclick = `onclick="stOpenBucket('${state.currentBucket}')"`;
    else {
      const prefixUpTo = state.prefix.split('/').slice(0, i - 1).join('/') + '/';
      onclick = `onclick="stBrowse('${prefixUpTo}')"`;
    }
    return `<span ${onclick} style="color:var(--accent);cursor:pointer">${p}</span> <span style="color:var(--text-dim)">/</span> `;
  }).join('');
}

function renderObjects() {
  const list = el('st-objects-list');
  if (!list) return;

  let objects = state.objects;

  if (state.search) {
    const q = state.search.toLowerCase();
    objects = objects.filter(o => o.key?.toLowerCase().includes(q));
  }

  if (!objects.length) {
    list.innerHTML = `<div style="text-align:center;padding:2rem;color:var(--text-dim);font-size:.85rem">
      ${state.search ? '🔍 Brak wyników wyszukiwania' : '📭 Bucket jest pusty lub brak obiektów'}
    </div>`;
    return;
  }

  list.innerHTML = objects.map(o => {
    const key = o.key ?? '';
    const name = key.startsWith(state.prefix) ? key.slice(state.prefix.length) : key;
    const isFolder = key.endsWith('/');
    const icon = fileIcon(key);
    const size = formatSize(o.size);
    const date = formatDate(o.uploaded ?? o.lastModified);
    const clickFn = isFolder
      ? `stBrowse('${key}')`
      : `stOpenFile('${state.currentBucket}', '${key.replace(/'/g, "\\'")}')`;

    return `
      <div onclick="${clickFn}" style="display:grid;grid-template-columns:2rem 1fr auto auto;gap:.6rem;
           align-items:center;padding:.6rem .8rem;border-radius:8px;cursor:pointer;
           border:1px solid transparent;transition:var(--transition)"
           onmouseover="this.style.background='rgba(255,255,255,0.04)'"
           onmouseout="this.style.background='transparent'">
        <span style="font-size:1.1rem;text-align:center">${icon}</span>
        <span style="font-size:.83rem;color:var(--text);word-break:break-all">${name || key}</span>
        <span style="font-size:.75rem;color:var(--text-muted);white-space:nowrap">${size}</span>
        <span style="font-size:.73rem;color:var(--text-dim);white-space:nowrap">${date}</span>
      </div>`;
  }).join('');
}

function setLoading(on) {
  state.loading = on;
  const spinner = el('st-spinner');
  if (spinner) spinner.style.display = on ? 'block' : 'none';
}

function setError(msg) {
  state.error = msg;
  const err = el('st-error');
  if (err) {
    err.textContent = msg ?? '';
    err.style.display = msg ? 'block' : 'none';
  }
}

function showBucketList() {
  el('st-bucket-view')?.style.setProperty('display', 'none');
  el('st-bucket-list')?.style.removeProperty('display');
  renderBuckets();
}

function showObjectView() {
  el('st-bucket-list')?.style.setProperty('display', 'none');
  el('st-bucket-view')?.style.removeProperty('display');
}

// ── Public actions (exposed to window) ─────────────

export async function stBack() {
  state.currentBucket = null;
  state.prefix = '';
  state.objects = [];
  state.search = '';
  showBucketList();
  renderBreadcrumb();
}

export async function stOpenBucket(name) {
  state.currentBucket = name;
  state.prefix = '';
  state.search = '';
  showObjectView();
  renderBreadcrumb();
  await stBrowse('');
}

export async function stBrowse(prefix) {
  state.prefix = prefix;
  state.cursor = null;
  renderBreadcrumb();
  setLoading(true);
  setError(null);
  try {
    const data = await fetchObjects(state.currentBucket, prefix);
    state.objects = data.objects ?? [];
    state.cursor = data.cursor ?? null;
    renderObjects();
  } catch (e) {
    setError(`Błąd: ${e.message}`);
  } finally {
    setLoading(false);
  }
}

export function stOpenFile(bucket, key) {
  // Open via the pages function download endpoint or CF public URL
  const url = `/api/storage/file/${encodeURIComponent(bucket)}/${encodeURIComponent(key)}`;
  window.open(url, '_blank');
}

export function stSearch(q) {
  state.search = q;
  if (state.currentBucket) renderObjects();
}

export async function stLoadMore() {
  if (!state.cursor || !state.currentBucket) return;
  setLoading(true);
  try {
    const data = await fetchObjects(state.currentBucket, state.prefix, state.cursor);
    state.objects = [...state.objects, ...(data.objects ?? [])];
    state.cursor = data.cursor ?? null;
    renderObjects();
  } catch (e) {
    setError(`Błąd ładowania: ${e.message}`);
  } finally {
    setLoading(false);
  }
}

// ── Init ───────────────────────────────────────────

export async function initStorage() {
  // expose globals
  Object.assign(window, { stBack, stOpenBucket, stBrowse, stOpenFile, stSearch, stLoadMore });

  // load buckets when storage tab is activated
  const nav = document.querySelector('[data-tab="storage"]');
  if (nav) {
    nav.addEventListener('click', async () => {
      if (!state.buckets.length) {
        setLoading(true);
        try {
          const data = await fetchBuckets();
          state.buckets = data.buckets ?? [];
          renderBuckets();
        } catch (e) {
          setError(`Nie można załadować bucketów: ${e.message}`);
        } finally {
          setLoading(false);
        }
      }
    });
  }
}
