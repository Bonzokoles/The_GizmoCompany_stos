/* ═══════════════════════════════════════════════════
   MODULE — Pricing Table
   ═══════════════════════════════════════════════════ */
import { MODELS } from '../data/models.js';

let priceFilter = 'all';

export function renderPricing() {
  const tbody = document.getElementById('price-tbody');
  const filtered = MODELS.filter(m => priceFilter === 'all' || m.tier === priceFilter)
    .sort((a, b) => a.input - b.input);

  tbody.innerHTML = filtered.map(m => `
    <tr>
      <td class="model-name-cell">${m.name}</td>
      <td>${m.provider}</td>
      <td class="price-val">${m.input === 0 ? 'Free' : '$' + m.input}</td>
      <td class="price-val">${m.output === 0 ? '—' : '$' + m.output}</td>
      <td><span class="tier-${m.tier}">${m.tier}</span></td>
      <td>${m.ctx}</td>
    </tr>
  `).join('');
}

export function initPricing() {
  document.querySelectorAll('#price-pills .pill').forEach(p => p.addEventListener('click', () => {
    document.querySelectorAll('#price-pills .pill').forEach(x => x.classList.remove('active'));
    p.classList.add('active');
    priceFilter = p.dataset.pf;
    renderPricing();
  }));
}
