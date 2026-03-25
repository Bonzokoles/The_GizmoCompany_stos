import { readFileSync, writeFileSync } from 'fs';

const f = 'ai-hub/js/modules/datasets.js';
let c = readFileSync(f, 'utf8');
const orig = c.length;

// ── FIX 1: Replace inside loadCloudDatasetList ───────────────────────────────
// Find the old body and replace it entirely
const fnStart = '/* \u2500\u2500 Fetch dataset list from API \u2500\u2500 */\nasync function loadCloudDatasetList()';
const fnEnd   = '}\n\n/* Mapowanie kategorii';   // unique anchor after this function

const iStart = c.indexOf(fnStart);
const iEnd   = c.indexOf(fnEnd);

if (iStart === -1 || iEnd === -1) {
  console.error('FIX1 anchors not found. iStart=', iStart, 'iEnd=', iEnd);
  process.exit(1);
}

const newLoadFn = `/* \u2500\u2500 Fetch dataset list from API (lub manifest lokalny) \u2500\u2500 */
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

`;

c = c.slice(0, iStart) + newLoadFn + c.slice(iEnd);
console.log('FIX1 OK');

// ── FIX 2: renderCloudDatasets — replace old grid template ───────────────────
const oldRenderGrid = `  grid.innerHTML = datasets.map(d => \`
    <div class="glass model-card" style="cursor:pointer" onclick="previewCloudDataset('\${d.id}')">
      <div class="model-head">
        <div>
          <div class="model-name" style="font-size:.95rem">\${d.icon || '\\u2601\\uFE0F'} \${d.name}</div>
          <div class="model-provider">\${d.cat}</div>
        </div>
        <span class="model-badge badge-local" style="font-size:.65rem;background:linear-gradient(135deg,var(--accent),var(--accent2));color:#000;font-weight:700">\\u2601 R2</span>
      </div>
      <div class="model-desc" style="font-size:.8rem;-webkit-line-clamp:2;display:-webkit-box;-webkit-box-orient:vertical;overflow:hidden">
        \${d.desc}
      </div>
      <div class="model-meta">
        <span class="model-chip" style="font-size:.65rem">\${d.cat}</span>
        <span class="model-chip" style="font-size:.65rem">JSON</span>
      </div>
      <div class="model-footer">
        <span style="font-size:.78rem;color:var(--text-dim)">\\u2601\\uFE0F \${d.file}</span>
        <button class="app-open-btn" style="font-size:.7rem;padding:4px 10px" onclick="event.stopPropagation();previewCloudDataset('\${d.id}')">\uD83D\uDC41\uFE0F Podgl\u0105d</button>
      </div>
    </div>\`).join('');`;

if (c.includes(oldRenderGrid)) {
  const newRenderGrid = `  grid.innerHTML = datasets.map(d => {
    const badge = CAT_BADGE[d.cat] || { label: '\u2601 R2', bg: 'linear-gradient(135deg,var(--accent),var(--accent2))', color: '#000' };
    const r2label = d.r2 ? \`<span class="model-chip" style="font-size:.6rem;opacity:.7">\${d.r2}</span>\` : '';
    return \`
    <div class="glass model-card" style="cursor:pointer" onclick="previewCloudDataset('\${d.id}')">
      <div class="model-head">
        <div>
          <div class="model-name" style="font-size:.95rem">\${d.icon || '\u2601\uFE0F'} \${d.name}</div>
          <div class="model-provider">\${d.cat}</div>
        </div>
        <span class="model-badge" style="font-size:.62rem;background:\${badge.bg};color:\${badge.color};font-weight:700;padding:2px 7px;border-radius:4px">\${badge.label}</span>
      </div>
      <div class="model-desc" style="font-size:.8rem;-webkit-line-clamp:2;display:-webkit-box;-webkit-box-orient:vertical;overflow:hidden">
        \${d.desc}
      </div>
      <div class="model-meta">
        \${r2label}
        <span class="model-chip" style="font-size:.65rem">JSON</span>
      </div>
      <div class="model-footer">
        <span style="font-size:.75rem;color:var(--text-dim);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:140px">\${d.file}</span>
        <button class="app-open-btn" style="font-size:.7rem;padding:4px 10px" onclick="event.stopPropagation();previewCloudDataset('\${d.id}')">\uD83D\uDC41\uFE0F Podgl\u0105d</button>
      </div>
    </div>\`;
  }).join('');`;
  c = c.replace(oldRenderGrid, newRenderGrid);
  console.log('FIX2 OK');
} else {
  // Try to find it via unique sub-string
  const anchor = "badge-local";
  if (c.includes(anchor)) {
    console.warn('FIX2: badge-local still present, manual fix needed');
  } else {
    console.log('FIX2: already applied or not needed');
  }
}

// Also add filterCat filtering in renderCloudDatasets after loadCloudDatasetList call
const oldAfterLoad = `  const datasets = await loadCloudDatasetList();
  if (loading) loading.style.display = 'none';

  if (!datasets || datasets.length === 0) {`;
const newAfterLoad = `  const allDatasets = await loadCloudDatasetList();
  if (loading) loading.style.display = 'none';

  const datasets = filterCat ? allDatasets.filter(d => d.cat === filterCat) : allDatasets;

  if (!datasets || datasets.length === 0) {`;

if (c.includes(oldAfterLoad)) {
  c = c.replace(oldAfterLoad, newAfterLoad);
  console.log('FIX2b (filter) OK');
} else {
  console.log('FIX2b already applied or not found');
}

// ── FIX 3: showDatasetPreview — support all 3 formats ───────────────────────
const oldShowFn_start = `function showDatasetPreview(ds, data) {
  const grid = document.getElementById('ds-grid');
  const sample = Array.isArray(data) ? data.slice(0, 8) : [];`;

const oldShowFn_end   = `\n}\n\n// Expose for inline onclick`;

const iShowStart = c.indexOf(oldShowFn_start);
const iShowEnd   = c.indexOf(oldShowFn_end);

if (iShowStart === -1 || iShowEnd === -1) {
  console.error('FIX3 anchors not found. iShowStart=', iShowStart, 'iShowEnd=', iShowEnd);
} else {
  const newShowFn = `function showDatasetPreview(ds, data) {
  const grid = document.getElementById('ds-grid');
  const backBtn = \`<button class="app-open-btn" style="font-size:.7rem;padding:4px 10px" onclick="searchDatasets('__local__')">\u2190 Wr\u00F3\u0107</button>\`;
  const badge = CAT_BADGE[ds.cat] || {};
  const badgeHtml = badge.label
    ? \`<span style="font-size:.65rem;background:\${badge.bg};color:\${badge.color};padding:2px 7px;border-radius:4px;font-weight:700">\${badge.label}</span>\`
    : '';

  // FORMAT 1: Flat array
  if (Array.isArray(data)) {
    const sample = data.slice(0, 8);
    const keys = sample.length > 0 ? Object.keys(sample[0]).slice(0, 7) : [];
    const total = data.length;
    grid.innerHTML = \`
      <div class="glass" style="grid-column:1/-1;padding:1.5rem">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;flex-wrap:wrap;gap:.5rem">
          <h3 style="color:var(--accent);font-size:1rem;margin:0">\${ds.icon || ''} \${ds.name} \${badgeHtml}</h3>
          <div style="display:flex;gap:.8rem;align-items:center">
            <span style="font-size:.8rem;color:var(--text-dim)">\${total.toLocaleString()} rekord\u00F3w \u00B7 \${keys.length} kolumn</span>
            \${backBtn}
          </div>
        </div>
        <div style="overflow-x:auto">
          <table style="width:100%;border-collapse:collapse;font-size:.75rem">
            <thead><tr>\${keys.map(k => \`<th style="text-align:left;padding:6px 8px;border-bottom:1px solid var(--glass-border);color:var(--accent2);font-weight:600;white-space:nowrap">\${k}</th>\`).join('')}</tr></thead>
            <tbody>\${sample.map(row => \`<tr>\${keys.map(k => {
              let val = row[k];
              if (typeof val === 'object') val = JSON.stringify(val).slice(0, 60);
              if (typeof val === 'string' && val.length > 90) val = val.slice(0, 90) + '\u2026';
              return \`<td style="padding:5px 8px;border-bottom:1px solid rgba(255,255,255,0.03);color:var(--text-muted);max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">\${val ?? ''}</td>\`;
            }).join('')}</tr>\`).join('')}</tbody>
          </table>
        </div>
        <div style="margin-top:.8rem;font-size:.75rem;color:var(--text-dim)">Pokazano \${Math.min(8, total)} z \${total.toLocaleString()} rekord\u00F3w</div>
      </div>\`;
    return;
  }

  // FORMAT 2: Tavily Research {summary, raw_searches, sources}
  if (data.summary || data.raw_searches) {
    const meta = [
      data.generated     ? \`\uD83D\uDCC5 \${data.generated}\` : '',
      data.source        ? \`\uD83D\uDD27 \${data.source}\` : '',
      data.queries_count ? \`\uD83D\uDD0D \${data.queries_count} zapyta\u0144\` : '',
      data.credits_used  ? \`\uD83D\uDCB3 \${data.credits_used} credits\` : '',
    ].filter(Boolean).join('  \u00B7  ');

    const sources = data.sources || data.raw_searches?.flatMap(s => s.results?.slice(0, 2) || []) || [];
    const sourcesRows = sources.slice(0, 10).map(s => \`
      <tr>
        <td style="padding:5px 8px;color:var(--text-muted);font-size:.75rem;border-bottom:1px solid rgba(255,255,255,0.04)">
          <a href="\${s.url}" target="_blank" style="color:var(--accent);text-decoration:none">\${(s.title || s.url || '').slice(0, 70)}</a>
        </td>
        <td style="padding:5px 8px;color:var(--text-dim);font-size:.7rem;border-bottom:1px solid rgba(255,255,255,0.04);max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
          \${(s.content || '').slice(0, 120)}\u2026
        </td>
      </tr>\`).join('');
    const summaryText = typeof data.summary === 'string'
      ? data.summary.slice(0, 800) + (data.summary.length > 800 ? '\u2026' : '')
      : '';
    grid.innerHTML = \`
      <div class="glass" style="grid-column:1/-1;padding:1.5rem">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;flex-wrap:wrap;gap:.5rem">
          <h3 style="color:var(--accent);font-size:1rem;margin:0">\${ds.icon || ''} \${ds.name} \${badgeHtml}</h3>
          \${backBtn}
        </div>
        <div style="font-size:.78rem;color:var(--text-dim);margin-bottom:1rem">\${meta}</div>
        \${summaryText ? \`<div style="font-size:.82rem;line-height:1.6;color:var(--text-muted);padding:.8rem;background:rgba(255,255,255,0.03);border-radius:6px;margin-bottom:1.2rem;white-space:pre-wrap">\${summaryText}</div>\` : ''}
        \${sourcesRows ? \`
          <div style="font-size:.8rem;color:var(--accent2);font-weight:600;margin-bottom:.5rem">\uD83D\uDCCC \u0179r\u00F3d\u0142a (\${Math.min(10, sources.length)} z \${sources.length})</div>
          <div style="overflow-x:auto">
            <table style="width:100%;border-collapse:collapse">
              <thead><tr>
                <th style="text-align:left;padding:6px 8px;border-bottom:1px solid var(--glass-border);color:var(--accent2);font-size:.72rem">Tytu\u0142 / URL</th>
                <th style="text-align:left;padding:6px 8px;border-bottom:1px solid var(--glass-border);color:var(--accent2);font-size:.72rem">Fragment</th>
              </tr></thead>
              <tbody>\${sourcesRows}</tbody>
            </table>
          </div>\` : ''}
      </div>\`;
    return;
  }

  // FORMAT 3: Curated dataset {title, description, articles, tags}
  const articles = data.articles || data.data_points || [];
  const useCases = data.use_cases || [];
  const tags = data.tags || [];
  const meta2 = [
    data.created  ? \`\uD83D\uDCC5 \${data.created}\` : '',
    data.credits  ? \`\uD83D\uDCB3 \${data.credits} credits\` : '',
    articles.length ? \`\uD83D\uDCC4 \${articles.length} artyku\u0142\u00F3w\` : '',
  ].filter(Boolean).join('  \u00B7  ');
  grid.innerHTML = \`
    <div class="glass" style="grid-column:1/-1;padding:1.5rem">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;flex-wrap:wrap;gap:.5rem">
        <h3 style="color:var(--accent);font-size:1rem;margin:0">\${ds.icon || ''} \${data.title || ds.name} \${badgeHtml}</h3>
        \${backBtn}
      </div>
      <div style="font-size:.78rem;color:var(--text-dim);margin-bottom:.8rem">\${meta2}</div>
      \${data.description ? \`<p style="font-size:.82rem;color:var(--text-muted);line-height:1.6;margin-bottom:1rem">\${data.description}</p>\` : ''}
      \${tags.length ? \`<div style="display:flex;flex-wrap:wrap;gap:.4rem;margin-bottom:1rem">\${tags.map(t => \`<span class="model-chip" style="font-size:.68rem">\${t}</span>\`).join('')}</div>\` : ''}
      \${useCases.length ? \`<div style="margin-bottom:1rem"><div style="font-size:.8rem;color:var(--accent2);font-weight:600;margin-bottom:.4rem">Use cases:</div><ul style="font-size:.8rem;color:var(--text-muted);padding-left:1.2rem;margin:0">\${useCases.map(u => \`<li>\${u}</li>\`).join('')}</ul></div>\` : ''}
      \${articles.slice(0, 6).map(a => \`<div style="padding:.6rem;border-bottom:1px solid rgba(255,255,255,0.05);font-size:.8rem;color:var(--text-muted)">\${typeof a === 'string' ? a : (a.title || JSON.stringify(a).slice(0, 100))}</div>\`).join('')}
    </div>\`;\n}`;

  c = c.slice(0, iShowStart) + newShowFn + c.slice(iShowEnd);
  console.log('FIX3 OK');
}

writeFileSync(f, c, 'utf8');
console.log('Done. Original:', orig, '→ New:', c.length);
