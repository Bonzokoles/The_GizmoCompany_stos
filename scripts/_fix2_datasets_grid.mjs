/**
 * FIX: Replace old renderCloudDatasets() grid template (badge-local) with new CAT_BADGE version
 */
import { readFileSync, writeFileSync } from 'fs';

const path = 'ai-hub/js/modules/datasets.js';
let src = readFileSync(path, 'utf8');

// Find anchors
const ANCHOR_START = '  grid.innerHTML = datasets.map(d => `';
const ANCHOR_END = "    </div>`).join('');";

const si = src.indexOf(ANCHOR_START);
const ei = src.indexOf(ANCHOR_END);

if (si === -1 || ei === -1) {
  console.log('ANCHORS NOT FOUND. si=' + si + ' ei=' + ei);
  // Show chars around expected position
  const bl = src.indexOf('badge-local');
  if (bl !== -1) {
    console.log('badge-local found at', bl);
    console.log('Context:', JSON.stringify(src.slice(bl - 100, bl + 200)));
  }
  process.exit(1);
}

const before = src.slice(0, si);
const after = src.slice(ei + ANCHOR_END.length);

const newBlock = `  grid.innerHTML = datasets.map(d => {
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

const result = before + newBlock + after;

// Verify badge-local is gone
if (result.includes('badge-local')) {
  console.log('ERROR: badge-local still present!');
  process.exit(1);
}

const oldLen = src.length;
writeFileSync(path, result, 'utf8');
console.log(`OK. ${oldLen} -> ${result.length} chars`);
console.log('badge-local in result:', result.includes('badge-local'));
console.log('CAT_BADGE in template:', result.includes('badge.bg'));
