/* ═══════════════════════════════════════════════════
   MODULE — JIMBO Studio
   ═══════════════════════════════════════════════════ */

function jimboBase() {
  return (document.getElementById('jimbo-endpoint')?.value || '').trim().replace(/\/$/, '');
}

async function jimboFetch(path, opts = {}) {
  const r = await fetch(jimboBase() + path, opts);
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || ('HTTP ' + r.status));
  return data;
}

export async function jimboReloadAll() {
  try {
    const [libs, topics, datasets, agents] = await Promise.all([
      jimboFetch('/kb/libraries'),
      jimboFetch('/kb/topics?library=all&limit=24'),
      jimboFetch('/datasets/list'),
      jimboFetch('/agents/list'),
    ]);

    document.getElementById('jimbo-libraries').innerHTML =
      (libs.results || []).map(l =>
        `<div style="display:flex;justify-content:space-between;padding:.45rem .55rem;border:1px solid var(--glass-border);border-radius:8px">
          <strong>${l.library}</strong><span style="color:var(--text-muted)">${l.documents} docs</span>
        </div>`
      ).join('') || '<div style="color:var(--text-dim)">Brak danych</div>';

    document.getElementById('jimbo-topics').innerHTML =
      (topics.topics || []).map(t =>
        `<span class="model-chip" style="cursor:pointer"
          onclick="document.getElementById('jimbo-ds-topic').value='${String(t.topic).replace(/'/g,"\\'")}';
                   document.getElementById('jimbo-agent-topic').value='${String(t.topic).replace(/'/g,"\\'")}'">
          ${t.topic} (${t.count})</span>`
      ).join('') || '<div style="color:var(--text-dim)">Brak tematów</div>';

    document.getElementById('jimbo-datasets').innerHTML =
      (datasets.results || []).map(d =>
        `<div style="display:flex;justify-content:space-between;gap:8px;padding:.45rem .55rem;border:1px solid var(--glass-border);border-radius:8px">
          <div><strong>${d.name}</strong><div style="font-size:.72rem;color:var(--text-dim)">${d.topic} · ${d.library}</div></div>
          <span style="font-size:.75rem;color:var(--text-muted)">${d.items||0} items</span>
        </div>`
      ).join('') || '<div style="color:var(--text-dim)">Brak datasetów</div>';

    document.getElementById('jimbo-agents').innerHTML =
      (agents.results || []).map(a =>
        `<div style="display:flex;justify-content:space-between;gap:8px;padding:.5rem .6rem;border:1px solid var(--glass-border);border-radius:8px">
          <div>
            <strong>${a.name}</strong>
            <div style="font-size:.72rem;color:var(--text-dim)">${a.topic} · ${a.library} · ${a.model}</div>
          </div>
          <button class="app-open-btn" style="padding:.25rem .6rem;font-size:.72rem" onclick="jimboExportAgent(${a.id})">Eksport</button>
        </div>`
      ).join('') || '<div style="color:var(--text-dim)">Brak agentów</div>';

  } catch (e) {
    document.getElementById('jimbo-libraries').innerHTML = `<div style="color:var(--danger)">Błąd: ${e.message}</div>`;
  }
}

export async function jimboCreateDataset() {
  const payload = {
    name: document.getElementById('jimbo-ds-name').value.trim(),
    topic: document.getElementById('jimbo-ds-topic').value.trim(),
    library: document.getElementById('jimbo-ds-library').value.trim() || 'general',
    seedQuery: document.getElementById('jimbo-ds-query').value.trim(),
  };
  const out = document.getElementById('jimbo-ds-result');
  try {
    const data = await jimboFetch('/datasets/create', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    });
    out.textContent = `✅ Dataset utworzony: #${data.dataset.id} (${data.dataset.items} items)`;
    jimboReloadAll();
  } catch (e) { out.textContent = `❌ ${e.message}`; }
}

export async function jimboCreateAgent() {
  const payload = {
    name: document.getElementById('jimbo-agent-name').value.trim(),
    topic: document.getElementById('jimbo-agent-topic').value.trim(),
    library: document.getElementById('jimbo-agent-library').value.trim() || 'general',
    model: document.getElementById('jimbo-agent-model').value.trim() || 'deepseek-chat',
  };
  const out = document.getElementById('jimbo-agent-result');
  try {
    const data = await jimboFetch('/agents/create', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    });
    out.textContent = `✅ Agent utworzony: #${data.agent.id}`;
    jimboReloadAll();
  } catch (e) { out.textContent = `❌ ${e.message}`; }
}

export async function jimboExportAgent(id) {
  try {
    const data = await jimboFetch(`/agents/${id}/export`);
    await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    alert(`Skonfigurowano agenta #${id}. JSON eksportu skopiowany do schowka.`);
  } catch (e) { alert('Błąd eksportu: ' + e.message); }
}
