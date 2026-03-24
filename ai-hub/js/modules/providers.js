/* ═══════════════════════════════════════════════════
   MODULE — Providers Grid
   ═══════════════════════════════════════════════════ */
import { PROVIDERS } from '../data/providers.js';

export function renderProviders() {
  const grid = document.getElementById('providers-grid');
  grid.innerHTML = PROVIDERS.map(p => `
    <div class="glass provider-card">
      <div class="prov-icon" style="background:${p.bg};color:#fff;font-size:${p.icon.length > 2 ? '1rem' : '1.4rem'}">${p.icon}</div>
      <div class="prov-info">
        <div class="prov-name">${p.name}</div>
        <div class="prov-models">${p.desc}</div>
        <div style="font-size:.73rem;color:var(--text-dim);margin-top:.2rem">${p.models} model${p.models !== 1 ? 'i' : ''}</div>
      </div>
      <div class="prov-status ${p.status === 'online' ? 'prov-online' : 'prov-offline'}"></div>
    </div>
  `).join('');
}
