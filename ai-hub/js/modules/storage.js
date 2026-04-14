/* ═══════════════════════════════════════════════════
   MODULE — R2 Storage Browser
   API: /api/storage/buckets  /api/storage/browse/:bucket
   Write ops (upload/delete) — ZENO Browser only
   ═══════════════════════════════════════════════════ */

const API = '/api/storage';

// Detect ZENO Browser (Electron) — upload/delete only shown here
const IS_ELECTRON = (() => {
  if (typeof window === 'undefined') return false;
  if (window.electronAPI !== undefined) return true;
  if (typeof navigator !== 'undefined' && navigator.userAgent?.includes('Electron/')) return true;
  return false;
})();

// Three Media Hub folders (mybonzo-media bucket)
const MEDIA_HUB_FOLDERS = [
  { label: '🎵 Muzyka',   bucket: 'mybonzo-media', prefix: 'music/',   accept: 'audio/*,.mp3,.flac,.wav,.ogg,.m4a,.aac' },
  { label: '🎬 Wideo',    bucket: 'mybonzo-media', prefix: 'videos/',  accept: 'video/*,.mp4,.mkv,.mov,.avi,.webm' },
  { label: '🖼️ Zdjęcia',  bucket: 'mybonzo-media', prefix: 'images/',  accept: 'image/*,.jpg,.jpeg,.png,.webp,.gif,.avif' },
];

const FILE_ICONS = {
  mp4: '🎬', mov: '🎬', avi: '🎬', mkv: '🎬', webm: '🎬',
  mp3: '🎵', flac: '🎵', wav: '🎵', ogg: '🎵', m4a: '🎵', aac: '🎵',
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

  // Media Hub shortcuts (always at top)
  const mediaHubHtml = `
    <div style="grid-column:1/-1;margin-bottom:.3rem">
      <div style="font-size:.72rem;text-transform:uppercase;letter-spacing:.06em;color:var(--text-dim);margin-bottom:.5rem">📂 Media Hub — szybki dostęp</div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:.6rem">
        ${MEDIA_HUB_FOLDERS.map(f => `
          <div onclick="stBrowseMediaHub('${f.bucket}','${f.prefix}')"
               style="padding:.8rem 1rem;cursor:pointer;border:1px solid var(--glass-border);border-radius:10px;
                      background:rgba(96,165,250,0.06);display:flex;align-items:center;gap:.6rem;
                      transition:var(--transition)"
               onmouseover="this.style.background='rgba(96,165,250,0.14)'"
               onmouseout="this.style.background='rgba(96,165,250,0.06)'">
            <span style="font-size:1.4rem">${f.label.split(' ')[0]}</span>
            <div>
              <div style="font-size:.82rem;font-weight:600;color:var(--text)">${f.label.split(' ').slice(1).join(' ')}</div>
              <div style="font-size:.72rem;color:var(--text-dim)">${f.bucket}/${f.prefix}</div>
            </div>
            ${IS_ELECTRON ? `<span onclick="event.stopPropagation();stUploadToFolder('${f.bucket}','${f.prefix}','${f.accept}')"
              style="margin-left:auto;font-size:.75rem;padding:.2rem .55rem;border-radius:6px;
                     background:rgba(52,211,153,0.15);color:#34d399;cursor:pointer;border:1px solid rgba(52,211,153,0.3)"
              title="Wgraj plik">+ wgraj</span>` : ''}
          </div>`).join('')}
      </div>
    </div>
    <div style="grid-column:1/-1;height:1px;background:var(--glass-border);margin-bottom:.3rem"></div>
  `;

  grid.innerHTML = mediaHubHtml + sorted.map(b => `
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

  // Upload zone (Electron only) — inline in object list header
  const uploadZone = IS_ELECTRON && !state.search ? `
    <div id="st-drop-zone"
         ondragover="event.preventDefault();this.style.borderColor='var(--accent)'"
         ondragleave="this.style.borderColor='var(--glass-border)'"
         ondrop="stHandleDrop(event,'${state.currentBucket}','${state.prefix}')"
         onclick="stTriggerUpload('${state.currentBucket}','${state.prefix}','')"
         style="margin:.5rem .8rem;padding:.9rem;border:2px dashed var(--glass-border);border-radius:10px;
                text-align:center;cursor:pointer;font-size:.8rem;color:var(--text-dim);
                transition:border-color .2s">
      ⬆️ Przeciągnij pliki tutaj lub kliknij, aby wgrać do <strong>${state.currentBucket}/${state.prefix || ''}</strong>
    </div>` : '';

  // Dynamic column header
  const headerCols = IS_ELECTRON ? '2rem 1fr auto auto 3rem' : '2rem 1fr auto auto';
  const headerRow = `
    <div style="display:grid;grid-template-columns:${headerCols};gap:.6rem;padding:.5rem .8rem;
                border-bottom:1px solid var(--glass-border);font-size:.72rem;color:var(--text-dim);
                text-transform:uppercase;letter-spacing:.5px">
      <span></span><span>Nazwa</span><span>Rozmiar</span><span>Data</span>${IS_ELECTRON ? '<span></span>' : ''}
    </div>`;

  list.innerHTML = uploadZone + headerRow + objects.map(o => {
    const key = o.key ?? '';
    const name = key.startsWith(state.prefix) ? key.slice(state.prefix.length) : key;
    const isFolder = key.endsWith('/');
    const icon = fileIcon(key);
    const size = formatSize(o.size);
    const date = formatDate(o.uploaded ?? o.lastModified);
    const clickFn = isFolder
      ? `stBrowse('${key}')`
      : `stOpenFile('${state.currentBucket}', '${key.replace(/'/g, "\\'")}')`;
    const safeKey = key.replace(/'/g, "\\'");
    const deleteBtn = IS_ELECTRON && !isFolder
      ? `<span onclick="event.stopPropagation();stDelete('${state.currentBucket}','${safeKey}')"
           style="padding:.15rem .5rem;border-radius:6px;background:rgba(248,113,113,0.15);color:#f87171;
                  cursor:pointer;font-size:.72rem;border:1px solid rgba(248,113,113,0.3);white-space:nowrap"
           title="Usuń plik">🗑</span>`
      : '';

    return `
      <div style="display:grid;grid-template-columns:2rem 1fr auto auto ${IS_ELECTRON && !isFolder ? '3rem' : ''};gap:.6rem;
           align-items:center;padding:.6rem .8rem;border-radius:8px;
           border:1px solid transparent;transition:var(--transition)"
           onmouseover="this.style.background='rgba(255,255,255,0.04)'"
           onmouseout="this.style.background='transparent'">
        <span onclick="${clickFn}" style="font-size:1.1rem;text-align:center;cursor:pointer">${icon}</span>
        <span onclick="${clickFn}" style="font-size:.83rem;color:var(--text);word-break:break-all;cursor:pointer">${name || key}</span>
        <span style="font-size:.75rem;color:var(--text-muted);white-space:nowrap">${size}</span>
        <span style="font-size:.73rem;color:var(--text-dim);white-space:nowrap">${date}</span>
        ${deleteBtn}
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
  const url = `${API}/file/${encodeURIComponent(bucket)}/${encodeURIComponent(key)}`;
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

// ── Write operations ──────────────────────────────

function zenoHeaders(contentType) {
  const ua = navigator.userAgent;
  const isElec = ua.includes('Electron/');
  return {
    ...(contentType ? { 'Content-Type': contentType } : {}),
    ...(isElec ? { 'X-Zeno-Client': 'electron' } : {}),
  };
}

export async function stUploadFile(bucket, key, file) {
  if (!IS_ELECTRON) { alert('Upload dostępny tylko w ZENO Browser'); return; }
  setLoading(true);
  try {
    const res = await fetch(`${API}/upload/${encodeURIComponent(bucket)}/${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: zenoHeaders(file.type || 'application/octet-stream'),
      body: file,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.status }));
      throw new Error(err.error ?? String(res.status));
    }
    toast(`✅ Wgrano: ${key}`, 'success');
    // refresh
    const data = await fetchObjects(state.currentBucket, state.prefix);
    state.objects = data.objects ?? [];
    state.cursor = data.cursor ?? null;
    renderObjects();
  } catch (e) {
    toast(`❌ Upload error: ${e.message}`, 'error');
  } finally {
    setLoading(false);
  }
}

export async function stDelete(bucket, key) {
  if (!IS_ELECTRON) return;
  if (!confirm(`Usunąć plik?\n${key}`)) return;
  setLoading(true);
  try {
    const res = await fetch(`${API}/file/${encodeURIComponent(bucket)}/${encodeURIComponent(key)}`, {
      method: 'DELETE',
      headers: zenoHeaders(null),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    toast(`🗑 Usunięto: ${key}`, 'success');
    state.objects = state.objects.filter(o => o.key !== key);
    renderObjects();
  } catch (e) {
    toast(`❌ Błąd usuwania: ${e.message}`, 'error');
  } finally {
    setLoading(false);
  }
}

export async function stBrowseMediaHub(bucket, prefix) {
  setLoading(true);
  setError(null);
  state.currentBucket = bucket;
  state.prefix = prefix;
  state.objects = [];
  state.cursor = null;
  state.search = '';
  showObjectView();
  renderBreadcrumb();
  try {
    const data = await fetchObjects(bucket, prefix);
    state.objects = data.objects ?? [];
    state.cursor = data.cursor ?? null;
    renderObjects();
  } catch (e) {
    setError(`Błąd: ${e.message}`);
  } finally {
    setLoading(false);
  }
}

export function stTriggerUpload(bucket, prefix, accept) {
  if (!IS_ELECTRON) return;
  const inp = document.createElement('input');
  inp.type = 'file';
  inp.multiple = true;
  if (accept) inp.accept = accept;
  inp.onchange = async () => {
    for (const file of Array.from(inp.files)) {
      const key = prefix + file.name;
      await stUploadFile(bucket, key, file);
    }
  };
  inp.click();
}

export function stUploadToFolder(bucket, prefix, accept) {
  stTriggerUpload(bucket, prefix, accept);
}

export async function stHandleDrop(event, bucket, prefix) {
  if (!IS_ELECTRON) return;
  event.preventDefault();
  const dropZone = document.getElementById('st-drop-zone');
  if (dropZone) dropZone.style.borderColor = 'var(--glass-border)';
  const files = Array.from(event.dataTransfer.files);
  for (const file of files) {
    const key = (prefix || '') + file.name;
    await stUploadFile(bucket, key, file);
  }
}

// ── Init ───────────────────────────────────────────

export async function initStorage() {
  // expose globals
  Object.assign(window, {
    stBack, stOpenBucket, stBrowse, stOpenFile, stSearch, stLoadMore,
    stDelete, stUploadFile, stBrowseMediaHub, stTriggerUpload, stUploadToFolder, stHandleDrop,
  });

  // Update mode banner based on runtime context
  const banner = document.getElementById('st-readonly-banner');
  if (banner) {
    if (IS_ELECTRON) {
      banner.style.background = 'rgba(74,222,128,0.07)';
      banner.style.borderColor = 'rgba(74,222,128,0.25)';
      banner.style.color = '#86efac';
      banner.innerHTML = '<span>✏️</span><span><strong>ZENO Browser</strong> — upload i usuwanie plików aktywne.</span>';
    }
  }

  // Update mode banner based on runtime context
  const banner = document.getElementById('st-readonly-banner');
  if (banner) {
    if (IS_ELECTRON) {
      banner.style.background = 'rgba(74,222,128,0.07)';
      banner.style.borderColor = 'rgba(74,222,128,0.25)';
      banner.style.color = '#86efac';
      banner.innerHTML = '<span>✏️</span><span><strong>ZENO Browser</strong> — upload i usuwanie plików aktywne.</span>';
    }
  }

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
