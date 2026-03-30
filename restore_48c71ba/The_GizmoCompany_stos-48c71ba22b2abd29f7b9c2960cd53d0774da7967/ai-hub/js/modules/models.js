/* ═══════════════════════════════════════════════════
   MODULE — Models Grid
   ═══════════════════════════════════════════════════ */
import { MODELS } from '../data/models.js';

let modelFilter = 'all';
let modelSearch = '';

export function renderModels() {
  const grid = document.getElementById('models-grid');
  const filtered = MODELS.filter(m => {
    if (modelFilter !== 'all') {
      if (modelFilter === 'api' && m.type !== 'api') return false;
      if (modelFilter === 'local' && m.type !== 'local') return false;
      if (!['api','local'].includes(modelFilter) && !m.cats.includes(modelFilter)) return false;
    }
    if (modelSearch) {
      const q = modelSearch.toLowerCase();
      return m.name.toLowerCase().includes(q) || m.provider.toLowerCase().includes(q) || m.cats.some(c => c.includes(q));
    }
    return true;
  });

  grid.innerHTML = filtered.map(m => `
    <div class="glass model-card">
      <div class="model-head">
        <div>
          <div class="model-name">${m.name}</div>
          <div class="model-provider">${m.provider}</div>
        </div>
        <span class="model-badge ${m.type === 'api' ? 'badge-api' : 'badge-local'}">${m.type.toUpperCase()}</span>
      </div>
      <div class="model-desc">${m.desc}</div>
      <div class="model-meta">
        ${m.cats.map(c => `<span class="model-chip">${c}</span>`).join('')}
        <span class="model-chip">ctx: ${m.ctx}</span>
      </div>
      <div class="model-footer">
        <span class="model-price">${m.input === 0 ? '🆓 Free' : `$${m.input} / $${m.output}`}</span>
        <span class="model-badge badge-${m.tier === 'free' ? 'local' : m.tier === 'budget' ? 'api' : 'new'}">${m.tier}</span>
      </div>
    </div>
  `).join('');
}

export function initModels() {
  document.getElementById('model-search').addEventListener('input', e => {
    modelSearch = e.target.value;
    renderModels();
  });
  document.querySelectorAll('#model-pills .pill').forEach(p => p.addEventListener('click', () => {
    document.querySelectorAll('#model-pills .pill').forEach(x => x.classList.remove('active'));
    p.classList.add('active');
    modelFilter = p.dataset.mf;
    renderModels();
  }));
}
