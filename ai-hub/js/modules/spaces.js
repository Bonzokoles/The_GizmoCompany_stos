/* 
   MODULE  HuggingFace Spaces & Tools
   Render, filter, embed (iframe modal)
    */
import { SPACES, SPACE_CATEGORIES } from '../data/spaces.js';

let currentFilter = 'all';
let searchQuery = '';

/*  Helpers  */
const HF_BASE = 'https://huggingface.co/spaces/';

function filterSpaces() {
  return SPACES.filter(s => {
    const matchCat = currentFilter === 'all' || s.cat === currentFilter;
    if (!searchQuery) return matchCat;
    const q = searchQuery.toLowerCase();
    return matchCat && (
      s.name.toLowerCase().includes(q) ||
      s.desc.toLowerCase().includes(q) ||
      s.tags.some(t => t.includes(q)) ||
      s.author.toLowerCase().includes(q)
    );
  });
}

/*  Render grid  */
export function renderSpaces() {
  const grid = document.getElementById('spaces-grid');
  const empty = document.getElementById('spaces-empty');
  const countEl = document.getElementById('spaces-count');
  const filtered = filterSpaces();

  if (countEl) countEl.textContent = `${filtered.length} / ${SPACES.length}`;
  if (empty) empty.style.display = filtered.length ? 'none' : 'block';

  grid.innerHTML = filtered.map(s => {
    const tierBadge = s.embed
      ? '<span class="space-badge embed"> Embed</span>'
      : '<span class="space-badge link"> Link</span>';
    const likesK = s.likes >= 1000 ? (s.likes / 1000).toFixed(1) + 'K' : s.likes;
    const catObj = SPACE_CATEGORIES.find(c => c.id === s.cat);
    const catLabel = catObj ? catObj.icon + ' ' + catObj.label : s.cat;

    return `
    <div class="glass space-card" data-id="${s.id}">
      <div class="space-header">
        <span class="space-icon">${s.icon}</span>
        <div class="space-meta">
          <div class="space-name">${s.name}</div>
          <div class="space-author">@${s.author}</div>
        </div>
        <div class="space-likes"> ${likesK}</div>
      </div>
      <div class="space-desc">${s.desc}</div>
      <div class="space-tags">
        ${tierBadge}
        <span class="space-cat-badge">${catLabel}</span>
        <span class="space-sdk">${s.sdk.toUpperCase()}</span>
      </div>
      <div class="space-actions">
        ${s.embed ? `<button class="app-open-btn" onclick="event.stopPropagation();openSpaceEmbed('${s.id}')"> Uruchom</button>` : ''}
        <button class="app-open-btn space-link-btn" onclick="event.stopPropagation();openSpaceHF('${s.hfId}')"> HuggingFace</button>
      </div>
    </div>`;
  }).join('');
}

/*  Open embedded Space in modal  */
export function openSpaceEmbed(id) {
  const space = SPACES.find(s => s.id === id);
  if (!space || !space.embedUrl) return;

  const modal = document.getElementById('space-modal');
  const frame = document.getElementById('space-frame');
  const title = document.getElementById('space-modal-title');

  title.textContent = `${space.icon} ${space.name}  @${space.author}`;
  frame.src = space.embedUrl;
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

export function closeSpaceModal() {
  const modal = document.getElementById('space-modal');
  const frame = document.getElementById('space-frame');
  modal.style.display = 'none';
  frame.src = '';
  document.body.style.overflow = '';
}

/*  Open on HuggingFace  */
export function openSpaceHF(hfId) {
  window.open(HF_BASE + hfId, '_blank');
}

/*  Init filters & search  */
export function initSpaces() {
  // Category pills
  document.querySelectorAll('#spaces-pills .pill').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#spaces-pills .pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.sf || 'all';
      renderSpaces();
    });
  });

  // Search
  const searchInput = document.getElementById('spaces-search');
  if (searchInput) {
    let debounce;
    searchInput.addEventListener('input', () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        searchQuery = searchInput.value.trim();
        renderSpaces();
      }, 250);
    });
  }

  // Modal close
  const modal = document.getElementById('space-modal');
  if (modal) modal.addEventListener('click', e => { if (e.target === modal) closeSpaceModal(); });
}