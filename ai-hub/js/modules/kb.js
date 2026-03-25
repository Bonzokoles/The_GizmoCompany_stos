/* ═══════════════════════════════════════════════════
   MODULE — Knowledge Browser
   ═══════════════════════════════════════════════════ */

const kbState = { currentLib: 'general', articles: [], selectedIds: new Set(), selectedArticleId: null };

function getEndpoint() {
  return (document.getElementById('kb-endpoint')?.value || '').replace(/\/$/, '');
}

async function kbFetch(path, opts = {}) {
  const url = `${getEndpoint()}${path}`;
  try {
    const res = await fetch(url, { ...opts, headers: { 'Content-Type': 'application/json', ...opts.headers } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e) {
    const el = document.getElementById('kb-action-result');
    if (el) el.textContent = `❌ Błąd: ${e.message}`;
    throw e;
  }
}

export async function kbLoadLibraries() {
  try {
    const data = await kbFetch('/kb/categories');
    const cats = document.getElementById('kb-categories');
    cats.innerHTML = (data.categories || []).map(lib => `
      <button style="padding:.5rem .6rem;border-radius:8px;border:1px solid var(--glass-border);
        background:${kbState.currentLib===lib?'rgba(0,255,204,0.12)':'rgba(255,255,255,0.03)'};
        color:var(--${kbState.currentLib===lib?'accent':'text-muted'});cursor:pointer;text-align:left;font-size:.8rem;transition:var(--transition)"
        onclick="kbSwitchLibrary('${lib}')">${lib}</button>
    `).join('');
    document.getElementById('kb-stats-lib').textContent = data.total || '?';
    await kbLoadTopics();
  } catch (e) { console.error(e); }
}

export async function kbSwitchLibrary(lib) {
  kbState.currentLib = lib;
  await Promise.all([kbLoadTopics(), kbLoadArticles('')]);
  await kbLoadLibraries();
}

async function kbLoadTopics() {
  try {
    const data = await kbFetch(`/kb/topics?library=${kbState.currentLib}&limit=15`);
    const container = document.getElementById('kb-topics');
    container.innerHTML = (data.topics || []).map(t => `
      <button style="padding:.25rem .5rem;border-radius:6px;background:rgba(167,139,250,0.12);color:var(--accent2);border:none;cursor:pointer;font-size:.75rem"
        onclick="kbFilterByTopic('${t.topic}')">${t.topic} (${t.count})</button>
    `).join('');
  } catch (e) { console.error(e); }
}

async function kbLoadArticles(topic = '') {
  try {
    const params = new URLSearchParams({ library: kbState.currentLib, limit: 30 });
    if (topic) params.set('topic', topic);
    const data = await kbFetch(`/kb/browse?${params}`);
    kbState.articles = data.articles || [];
    document.getElementById('kb-stats-count').textContent = kbState.articles.length;

    const grid = document.getElementById('kb-articles');
    grid.innerHTML = kbState.articles.map(a => `
      <div class="glass" style="padding:1rem 1.2rem;display:grid;gap:.6rem;position:relative">
        <div style="display:flex;gap:.5rem;align-items:start">
          <input type="checkbox" style="width:18px;height:18px;cursor:pointer" onchange="kbToggleSelect(${a.id})">
          <div style="flex:1">
            <h4 style="color:var(--accent);font-size:.95rem;line-height:1.3;cursor:pointer" onclick="kbShowDetail(${a.id})">${a.title}</h4>
            <p style="font-size:.75rem;color:var(--text-dim);margin-top:.3rem">${a.excerpt}</p>
          </div>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:.5rem">
          <div style="display:flex;gap:.3rem;flex-wrap:wrap">
            ${(a.tags||[]).slice(0,3).map(t => `<span style="font-size:.65rem;background:rgba(255,255,255,0.05);padding:.15rem .4rem;border-radius:4px">${t}</span>`).join('')}
          </div>
          <button class="app-open-btn" style="padding:.35rem .6rem;font-size:.75rem" onclick="kbShowDetail(${a.id})">Przeczytaj</button>
        </div>
      </div>
    `).join('');

    if (!kbState.articles.length) {
      grid.innerHTML = '<div style="grid-column:1/-1;color:var(--text-muted);text-align:center;padding:2rem">Brak artykułów w tej kategorii.</div>';
    }
  } catch (e) { console.error(e); }
}

export async function kbShowDetail(id) {
  try {
    const data = await kbFetch(`/kb/details/${id}`);
    document.getElementById('kb-modal-title').textContent = data.title;
    document.getElementById('kb-modal-meta').innerHTML = `
      <span>📚 ${data.library}</span>
      <span>📅 ${new Date(data.createdAt).toLocaleDateString('pl-PL')}</span>
      ${data.source ? `<span>🔗 ${data.source}</span>` : ''}
    `;
    document.getElementById('kb-modal-content').innerHTML = data.content.replace(/\n/g, '<br>');
    const modal = document.getElementById('kb-modal');
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    kbState.selectedArticleId = id;
  } catch (e) { console.error(e); }
}

export function kbCloseDetail() {
  document.getElementById('kb-modal').style.display = 'none';
}

export function kbToggleSelect(id) {
  if (kbState.selectedIds.has(id)) kbState.selectedIds.delete(id);
  else kbState.selectedIds.add(id);
  document.getElementById('kb-stats-selected').textContent = kbState.selectedIds.size;
}

export function kbFilterByTopic(topic) {
  kbLoadArticles(topic);
}

export async function kbSearchArticles() {
  const q = prompt('Szukaj artykułów (pełny tekst):');
  if (!q) return;
  const grid = document.getElementById('kb-articles');
  grid.innerHTML = '<div style="grid-column:1/-1;color:var(--text-muted);text-align:center;padding:2rem">Szukam...</div>';
  try {
    const data = await kbFetch('/kb/search', {
      method: 'POST',
      body: JSON.stringify({ query: q, library: kbState.currentLib === 'all' ? undefined : kbState.currentLib, limit: 30 }),
    });
    kbState.articles = data.results || [];
    document.getElementById('kb-stats-count').textContent = kbState.articles.length;
    grid.innerHTML = kbState.articles.map(a => `
      <div class="glass" style="padding:1rem 1.2rem;display:grid;gap:.6rem;position:relative">
        <div style="display:flex;gap:.5rem;align-items:start">
          <input type="checkbox" style="width:18px;height:18px;cursor:pointer" onchange="kbToggleSelect(${a.id})">
          <div style="flex:1">
            <div style="font-weight:600;cursor:pointer;color:var(--accent)" onclick="kbShowDetail(${a.id})">${a.title}</div>
            <div style="font-size:.78rem;color:var(--text-muted);margin-top:.3rem">${(a.content||a.excerpt||'').slice(0,200)}...</div>
          </div>
        </div>
        <div style="font-size:.72rem;color:var(--accent2)">${a.library || ''}</div>
      </div>
    `).join('') || '<div style="grid-column:1/-1;color:var(--text-muted);text-align:center;padding:2rem">Brak wyników.</div>';
  } catch (e) {
    grid.innerHTML = `<div style="grid-column:1/-1;color:#f87171;text-align:center;padding:2rem">Błąd wyszukiwania: ${e.message}</div>`;
  }
}

export function kbAddToDataset() {
  if (!kbState.selectedArticleId) { alert('Wybierz artykuł'); return; }
  alert(`Artykuł #${kbState.selectedArticleId} będzie dodany do datasetu:`);
}

export function kbCreateAgentFromArticle() {
  if (!kbState.selectedArticleId) { alert('Wybierz artykuł'); return; }
  const title = document.getElementById('kb-modal-title').textContent || '';
  document.getElementById('kb-dataset-topic').value = title.split(' ').slice(0,3).join(' ');
  alert('Agent będzie utworzony na bazie tego artykułu w następnej wersji');
}

export async function kbBulkCreateDataset() {
  const name = document.getElementById('kb-dataset-name').value.trim();
  const topic = document.getElementById('kb-dataset-topic').value.trim();
  if (!name || !topic) { alert('Wypełnij nazwę i temat'); return; }
  if (kbState.selectedIds.size === 0) { alert('Zaznacz artykuły'); return; }

  const result = document.getElementById('kb-action-result');
  result.textContent = 'Tworzenie datasetu...';
  try {
    const data = await kbFetch('/datasets/create', {
      method: 'POST',
      body: JSON.stringify({ name, topic, library: kbState.currentLib, tags: [...kbState.selectedIds].join(','), limit: kbState.selectedIds.size }),
    });
    result.textContent = `✅ Dataset "${name}" utworzony (#${data.dataset?.id || '?'}) z ${kbState.selectedIds.size} artykułami`;
    kbState.selectedIds.clear();
    document.getElementById('kb-stats-selected').textContent = '0';
  } catch (e) { result.textContent = `❌ ${e.message}`; }
}

export async function kbExportLibrary() {
  const lib = kbState.currentLib;
  const result = document.getElementById('kb-action-result');
  result.textContent = 'Eksportowanie biblioteki...';
  try {
    const res = await fetch(`${getEndpoint()}/kb/bulk-export`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ library: lib, limit: 500 }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${lib}-kb-export.json`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
    result.textContent = `✅ Biblioteka "${lib}" wyeksportowana`;
  } catch (e) { result.textContent = `❌ Błąd eksportu: ${e.message}`; }
}

export async function kbAddArticle() {
  const title = document.getElementById('kb-add-title').value.trim();
  const content = document.getElementById('kb-add-content').value.trim();
  const library = document.getElementById('kb-add-library').value.trim() || 'general';
  const source = document.getElementById('kb-add-source').value.trim() || undefined;
  const tags = document.getElementById('kb-add-tags').value.trim() || undefined;
  const out = document.getElementById('kb-add-result');
  if (!title || !content) { out.textContent = '⚠️ Wypełnij tytuł i treść'; return; }
  out.textContent = 'Zapisywanie...';
  try {
    const data = await kbFetch('/kb/store', { method: 'POST', body: JSON.stringify({ title, content, library, source, tags }) });
    out.textContent = `✅ Zapisano jako #${data.id || '?'} w bibliotece "${library}"`;
    ['kb-add-title','kb-add-content','kb-add-source','kb-add-tags'].forEach(id => { document.getElementById(id).value = ''; });
  } catch (e) { out.textContent = `❌ ${e.message}`; }
}

// ─── Electron-native file/folder import ───────────────────────────────────────

const KB_DEFAULT_PATH = 'U:\\The_DEVz_HUB_of_work';

function pathFilesToPseudo(files) {
  return files.map(f => ({
    name: f.name,
    size: new TextEncoder().encode(f.content).length,
    webkitRelativePath: f.path,
    text: () => Promise.resolve(f.content),
  }));
}

export async function kbOpenFolderElectron() {
  const api = window.electronAPI;
  if (!api?.dialog) return;
  const prog = document.getElementById('kb-local-progress');
  const dirPath = await api.dialog.openFolder({ defaultPath: KB_DEFAULT_PATH, title: 'Wybierz folder biblioteki' });
  if (!dirPath) return;
  prog.textContent = `📂 Wczytuję pliki z: ${dirPath}…`;
  const result = await api.dialog.readDirFiles(dirPath);
  if (!result.success) { prog.textContent = `❌ Błąd odczytu: ${result.error}`; return; }
  if (!result.files.length) { prog.textContent = '⚠️ Brak obsługiwanych plików w tym folderze.'; return; }
  await kbImportFiles(pathFilesToPseudo(result.files));
}

export async function kbOpenFilesElectron() {
  const api = window.electronAPI;
  if (!api?.dialog) return;
  const prog = document.getElementById('kb-local-progress');
  const paths = await api.dialog.openFiles({ defaultPath: KB_DEFAULT_PATH, title: 'Wybierz pliki do importu' });
  if (!paths || !paths.length) return;
  prog.textContent = `📄 Wczytuję ${paths.length} plików…`;
  const files = await api.dialog.readFiles(paths);
  if (!files.length) { prog.textContent = '⚠️ Żaden z wybranych plików nie mógł być odczytany.'; return; }
  await kbImportFiles(pathFilesToPseudo(files));
}

// ──────────────────────────────────────────────────────────────────────────────

export async function kbImportFiles(files) {
  const library = document.getElementById('kb-local-lib').value.trim() || 'devz-hub';
  const prog = document.getElementById('kb-local-progress');
  const endpoint = getEndpoint();
  let ok = 0, skip = 0, fail = 0;
  for (const file of files) {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['md','txt','json','yaml','yml','html','ts','tsx','js'].includes(ext)) { skip++; continue; }
    if (file.size > 500_000) { skip++; prog.textContent = `Pomijam duży plik: ${file.name}`; continue; }
    try {
      const text = await file.text();
      const title = file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
      const source = file.webkitRelativePath || file.name;
      prog.textContent = `[${ok+fail+1}/${files.length}] Importuję: ${file.name}...`;
      const r = await fetch(`${endpoint}/kb/store`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content: text, library, source, tags: ext }),
      });
      if (r.ok) ok++; else fail++;
    } catch { fail++; }
  }
  prog.textContent = `✅ Import zakończony: ${ok} plików OK, ${skip} pominiętych, ${fail} błędów. Biblioteka: "${library}"`;
  kbLoadLibraries();
}

export function kbSetLib(name) {
  const input = document.getElementById('kb-local-lib');
  if (input) { input.value = name; localStorage.setItem('kb_local_lib', name); }
  kbUpdateShortcutButtons();
}

export function kbUpdateShortcutButtons() {
  const current = (document.getElementById('kb-local-lib')?.value || '').toLowerCase();
  document.querySelectorAll('.kb-shortcut-btn').forEach(btn => {
    const btnLib = btn.getAttribute('onclick')?.match(/kbSetLib\('([^']+)'\)/)?.[1] || '';
    btn.classList.toggle('active', btnLib === current);
  });
}

export function initKb() {
  // Restore persisted settings
  const savedEndpoint = localStorage.getItem('kb_endpoint');
  if (savedEndpoint) {
    const ep = document.getElementById('kb-endpoint');
    if (ep) ep.value = savedEndpoint;
    const ep2 = document.getElementById('jimbo-endpoint');
    if (ep2) ep2.value = savedEndpoint;
  }
  const savedLib = localStorage.getItem('kb_local_lib');
  if (savedLib) {
    const lib = document.getElementById('kb-local-lib');
    if (lib) lib.value = savedLib;
  }
  kbUpdateShortcutButtons();

  // Wire file inputs
  document.getElementById('kb-local-files')?.addEventListener('change', e => {
    if (e.target.files.length) kbImportFiles(Array.from(e.target.files));
  });
  document.getElementById('kb-local-files-single')?.addEventListener('change', e => {
    if (e.target.files.length) kbImportFiles(Array.from(e.target.files));
  });

  // In Electron: override folder/files buttons to use native dialog with defaultPath
  if (window.electronAPI?.dialog) {
    const folderLabel = document.getElementById('kb-folder-label');
    const filesLabel = document.getElementById('kb-files-label');
    if (folderLabel) {
      folderLabel.style.cursor = 'pointer';
      folderLabel.addEventListener('click', e => { e.preventDefault(); kbOpenFolderElectron(); });
    }
    if (filesLabel) {
      filesLabel.style.cursor = 'pointer';
      filesLabel.addEventListener('click', e => { e.preventDefault(); kbOpenFilesElectron(); });
    }
  }

  // Auto-load in background
  setTimeout(() => kbLoadLibraries().catch(() => {}), 800);
}
