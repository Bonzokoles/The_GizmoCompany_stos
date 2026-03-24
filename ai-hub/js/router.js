/* ═══════════════════════════════════════════════════
   ROUTER — Tab navigation + clock
   ═══════════════════════════════════════════════════ */
import { searchDatasets } from './modules/datasets.js';
import { kbLoadLibraries } from './modules/kb.js';
import { jimboReloadAll } from './modules/jimbo.js';

let currentTab = 'dashboard';
let dsInitialized = false;
let kbInitialized = false;
let jimboInitialized = false;

export function switchTab(id) {
  currentTab = id;
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + id)?.classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === id));

  // Lazy-init heavy tabs on first visit
  if (id === 'datasets' && !dsInitialized) { dsInitialized = true; searchDatasets(''); }
  if (id === 'kb'       && !kbInitialized)  { kbInitialized  = true; kbLoadLibraries(); }
  if (id === 'jimbo'    && !jimboInitialized){ jimboInitialized = true; jimboReloadAll(); }
}

export function initRouter() {
  document.querySelectorAll('.nav-btn').forEach(b => b.addEventListener('click', () => switchTab(b.dataset.tab)));
}

// Clock
function tickClock() {
  const d = new Date();
  const el = document.getElementById('clock');
  if (el) el.textContent = d.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
setInterval(tickClock, 1000);
tickClock();
