/* ═══════════════════════════════════════════════════
  MODULE — BUCH_CHAT Inline Assistant (AI Hub)
  ═══════════════════════════════════════════════════ */

export function initVchat() {
  const toggle = document.getElementById('vchatToggle');
  const modal = document.getElementById('chat-modal');
  if (!toggle || !modal) return;

  // Nadpisz zawartość modalu na inline chat UI
  modal.innerHTML = `
    <div style="background:#0f172a;border-radius:16px;width:90%;max-width:500px;max-height:80vh;display:flex;flex-direction:column;border:1px solid rgba(148,163,184,0.1);box-shadow:0 25px 50px rgba(0,0,0,0.5)">
      <div style="padding:1rem 1.5rem;border-bottom:1px solid rgba(148,163,184,0.1);display:flex;justify-content:space-between;align-items:center">
        <h3 style="margin:0;font-size:1rem;color:#a5b4fc">◈ BUCH_CHAT — Asystent AI</h3>
        <button class="chat-modal-close" style="background:transparent;border:none;color:#94a3b8;cursor:pointer;font-size:1.5rem;line-height:1;padding:0">&times;</button>
      </div>
      <div id="vchatMsgs" style="flex:1;overflow-y:auto;padding:1rem;display:flex;flex-direction:column;gap:0.75rem"></div>
      <div style="padding:1rem;border-top:1px solid rgba(148,163,184,0.1);display:flex;gap:0.5rem">
        <input id="vchatText" type="text" placeholder="Zadaj pytanie..." style="flex:1;background:rgba(51,65,85,0.5);border:1px solid rgba(148,163,184,0.2);border-radius:8px;padding:0.75rem;color:#e2e8f0;font-size:0.9rem" />
        <button id="vchatMic" title="Mikrofon (wkrótce)" style="background:rgba(91,124,246,0.15);border:1px solid rgba(91,124,246,0.4);border-radius:8px;padding:0.75rem;color:#a5b4fc;cursor:pointer;min-width:48px">🎤</button>
        <button id="vchatSend" style="background:rgba(91,124,246,0.15);border:1px solid rgba(91,124,246,0.4);border-radius:8px;padding:0.75rem;color:#a5b4fc;cursor:pointer;min-width:48px">📤</button>
      </div>
    </div>
  `;

  const msgsDiv = modal.querySelector('#vchatMsgs');
  const textInput = modal.querySelector('#vchatText');
  const sendBtn = modal.querySelector('#vchatSend');
  const closeBtn = modal.querySelector('.chat-modal-close');

  const addMessage = (role, text) => {
    const msgDiv = document.createElement('div');
    msgDiv.style.cssText = `
      background: ${role === 'user' ? 'rgba(91,124,246,0.15)' : 'rgba(51,65,85,0.5)'};
      border: 1px solid ${role === 'user' ? 'rgba(91,124,246,0.4)' : 'rgba(148,163,184,0.2)'};
      border-radius: 12px;
      padding: 0.75rem;
      color: #e2e8f0;
      font-size: 0.9rem;
      line-height: 1.5;
      align-self: ${role === 'user' ? 'flex-end' : 'flex-start'};
      max-width: 85%;
    `;
    msgDiv.textContent = text;
    msgsDiv.appendChild(msgDiv);
    msgsDiv.scrollTop = msgsDiv.scrollHeight;
  };

  const sendMessage = async () => {
    const text = textInput.value.trim();
    if (!text) return;

    addMessage('user', text);
    textInput.value = '';
    sendBtn.disabled = true;
    sendBtn.textContent = '⏳';

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: text, provider: 'workers-ai', maxTokens: 512 })
      });
      const data = await res.json();
      addMessage('assistant', data.content || data.text || 'Brak odpowiedzi');
    } catch (err) {
      addMessage('assistant', '⚠ Błąd połączenia z AI Gateway');
      console.error('vchat fetch error:', err);
    }

    sendBtn.disabled = false;
    sendBtn.textContent = '📤';
  };

  const openChat = () => {
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    toggle.classList.add('active');
    textInput?.focus();
  };

  const closeChat = () => {
    modal.style.display = 'none';
    document.body.style.overflow = '';
    toggle.classList.remove('active');
  };

  toggle.onclick = openChat;
  closeBtn.onclick = closeChat;
  sendBtn.onclick = sendMessage;
  textInput.onkeypress = (e) => {
    if (e.key === 'Enter') sendMessage();
  };

  modal.addEventListener('click', (event) => {
    if (event.target === modal) closeChat();
  });
}
