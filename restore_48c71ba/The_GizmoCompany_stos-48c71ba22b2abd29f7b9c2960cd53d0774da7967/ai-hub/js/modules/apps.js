/* ═══════════════════════════════════════════════════
   MODULE — Apps Grid + Chat Modal
   ═══════════════════════════════════════════════════ */
import { APPS } from '../data/apps.js';

export function openApp(url) {
  if (url && url !== '#') window.open(url, '_blank');
}

export function openChatModal(url) {
  const m = document.getElementById('chat-modal');
  const fr = document.getElementById('chat-frame');
  fr.src = url;
  m.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

export function closeChatModal() {
  const m = document.getElementById('chat-modal');
  const fr = document.getElementById('chat-frame');
  m.style.display = 'none';
  fr.src = '';
  document.body.style.overflow = '';
}

export function renderApps() {
  const grid = document.getElementById('apps-grid');
  grid.innerHTML = APPS.map(a => {
    const statsHtml = Object.entries(a.stats).map(([k, v]) => `<span>📌 ${k}: <strong>${v}</strong></span>`).join('');
    const isComingSoon = a.url === '#' && !a.action;
    const clickFn = a.action ? `switchTab('${a.action}')` : a.modal ? `openChatModal('${a.url}')` : `openApp('${a.url}')`;
    const btnLabel = a.action ? 'Otwórz zakładkę →' : a.modal ? 'Otwórz Chat →' : 'Otwórz →';
    return `
    <div class="glass app-card" ${!isComingSoon ? `onclick="${clickFn}"` : ''} style="cursor:${isComingSoon ? 'default' : 'pointer'}">
      <div class="app-banner" style="background:${a.banner_bg}">
        <span class="bg-icon">${a.icon}</span>
        <div class="app-banner-gradient" style="background:linear-gradient(to top,#0a0e1a 0%,transparent 70%)"></div>
      </div>
      <div class="app-body">
        <div class="app-name">${a.name}</div>
        <div class="app-desc">${a.desc}</div>
        <div class="app-stats">${statsHtml}</div>
        <div style="margin-top:.8rem">
          ${isComingSoon
            ? '<span style="color:var(--accent3);font-size:.82rem;font-weight:700">🚧 Wkrótce</span>'
            : `<button class="app-open-btn" onclick="event.stopPropagation();${clickFn}">${btnLabel}</button>`}
        </div>
      </div>
    </div>`;
  }).join('');
}
