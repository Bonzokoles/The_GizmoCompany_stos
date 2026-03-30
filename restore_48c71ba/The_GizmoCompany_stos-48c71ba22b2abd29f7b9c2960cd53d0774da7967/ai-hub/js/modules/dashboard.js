/* ═══════════════════════════════════════════════════
   MODULE — Dashboard
   ═══════════════════════════════════════════════════ */
import { MODELS } from '../data/models.js';
import { PROVIDERS } from '../data/providers.js';
import { TOOLS } from '../data/tools.js';
import { SKILLS } from '../data/skills.js';
import { APPS } from '../data/apps.js';
import { SPACES } from '../data/spaces.js';

export function animateCount(el, target) {
  let current = 0;
  const step = Math.max(1, Math.ceil(target / 30));
  const interval = setInterval(() => {
    current += step;
    if (current >= target) { current = target; clearInterval(interval); }
    el.textContent = current;
  }, 30);
}

export function updateStats() {
  animateCount(document.getElementById('s-models'), MODELS.length);
  animateCount(document.getElementById('s-providers'), PROVIDERS.filter(p => p.status === 'online').length);
  animateCount(document.getElementById('s-tools'), TOOLS.length);
  animateCount(document.getElementById('s-skills'), SKILLS.length);
  animateCount(document.getElementById('s-apps'), APPS.length);
  animateCount(document.getElementById('s-spaces'), SPACES.length);
}

export function renderDashTopModels() {
  const topNames = ['Claude Sonnet 4','GPT-4o','Gemini 2.0 Flash','DeepSeek R1 8B','Grok 4','Mistral Large'];
  const top = MODELS.filter(m => topNames.includes(m.name)).slice(0, 6);
  document.getElementById('dash-top-models').innerHTML = top.map(m => `
    <div class="glass" style="padding:1rem;cursor:pointer" onclick="switchTab('models')">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.4rem">
        <strong style="font-size:.9rem">${m.name}</strong>
        <span class="model-badge ${m.type === 'api' ? 'badge-api' : 'badge-local'}" style="font-size:.6rem">${m.type.toUpperCase()}</span>
      </div>
      <div style="font-size:.75rem;color:var(--text-muted);margin-bottom:.4rem">${m.provider} · ${m.cats.join(', ')}</div>
      <div style="font-family:var(--mono);font-size:.78rem;color:var(--accent3)">${m.input === 0 ? 'Free' : `$${m.input} / $${m.output} per 1M`}</div>
    </div>
  `).join('');
}
