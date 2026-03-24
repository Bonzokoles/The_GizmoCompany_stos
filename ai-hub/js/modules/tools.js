/* ═══════════════════════════════════════════════════
   MODULE — Tools Grid
   ═══════════════════════════════════════════════════ */
import { TOOLS } from '../data/tools.js';

const CAT_COLOR = { framework:'tag-app', platform:'tag-gen', sdk:'tag-util', devtool:'tag-data', database:'tag-app', monitoring:'tag-gen' };

let toolFilter = 'all';
let toolSearch = '';

export function renderTools() {
  const grid = document.getElementById('tools-grid');
  const filtered = TOOLS.filter(t => {
    if (toolFilter !== 'all' && t.cat !== toolFilter) return false;
    if (toolSearch) {
      const q = toolSearch.toLowerCase();
      return t.name.toLowerCase().includes(q) || t.desc.toLowerCase().includes(q) || t.cat.includes(q);
    }
    return true;
  });

  grid.innerHTML = filtered.map(t => `
    <div class="glass tool-card">
      <div class="tool-icon">${t.icon}</div>
      <div class="tool-name">${t.name}</div>
      <div class="tool-desc">${t.desc}</div>
      <span class="tool-tag ${CAT_COLOR[t.cat] || 'tag-util'}">${t.cat}</span>
    </div>
  `).join('');
}

export function initTools() {
  document.getElementById('tool-search').addEventListener('input', e => {
    toolSearch = e.target.value;
    renderTools();
  });
  document.querySelectorAll('#tool-pills .pill').forEach(p => p.addEventListener('click', () => {
    document.querySelectorAll('#tool-pills .pill').forEach(x => x.classList.remove('active'));
    p.classList.add('active');
    toolFilter = p.dataset.tf;
    renderTools();
  }));
}
