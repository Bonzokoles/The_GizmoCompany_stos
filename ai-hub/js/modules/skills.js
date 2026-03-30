/* ═══════════════════════════════════════════════════
   MODULE — Skills Grid (HuggingFace)
   ═══════════════════════════════════════════════════ */
import { SKILLS } from '../data/skills.js';

const CAT_COLOR = { training:'tag-app', data:'tag-data', publishing:'tag-gen', frontend:'tag-util', devops:'tag-app', research:'tag-gen' };
const CAT_LABEL = { training:'Training', data:'Data', publishing:'Publishing', frontend:'Frontend', devops:'DevOps', research:'Research' };

let skillFilter = 'all';
let skillSearch = '';

export function renderSkills() {
  const grid = document.getElementById('skills-grid');
  const filtered = SKILLS.filter(s => {
    if (skillFilter !== 'all' && s.cat !== skillFilter) return false;
    if (skillSearch) {
      const q = skillSearch.toLowerCase();
      return s.name.toLowerCase().includes(q) || s.desc.toLowerCase().includes(q) || s.cat.includes(q);
    }
    return true;
  });

  const resolveSkillUrl = (s) => {
    if (s.url) return s.url;
    return `https://github.com/huggingface/skills/tree/main/skills/${encodeURIComponent(s.file.split('/')[2])}`;
  };

  grid.innerHTML = filtered.map(s => `
    <div class="glass tool-card" style="cursor:pointer"
      onclick="window.open('${resolveSkillUrl(s)}','_blank')">
      <div class="tool-icon" style="font-size:1.8rem">${s.icon}</div>
      <div class="tool-name">${s.name}</div>
      <div class="tool-desc">${s.desc}</div>
      <div style="display:flex;gap:.4rem;flex-wrap:wrap;margin-top:.5rem">
        <span class="tool-tag ${CAT_COLOR[s.cat] || 'tag-util'}">${CAT_LABEL[s.cat] || s.cat}</span>
        <span class="tool-tag" style="background:rgba(255,213,0,0.1);color:#fbbf24;border-color:rgba(255,213,0,0.2)">🤗 HuggingFace</span>
      </div>
    </div>
  `).join('');
}

export function initSkills() {
  document.getElementById('skill-search').addEventListener('input', e => {
    skillSearch = e.target.value;
    renderSkills();
  });
  document.querySelectorAll('#skill-pills .pill').forEach(p => p.addEventListener('click', () => {
    document.querySelectorAll('#skill-pills .pill').forEach(x => x.classList.remove('active'));
    p.classList.add('active');
    skillFilter = p.dataset.sf;
    renderSkills();
  }));
}
