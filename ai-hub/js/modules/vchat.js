/* ═══════════════════════════════════════════════════
  MODULE — BUCH_CHAT Inline Assistant (AI Hub)
  ═══════════════════════════════════════════════════ */

const HISTORY_KEY = 'vchat-history';
const PROVIDER_KEY = 'vchat-provider';
const MAX_HISTORY = 20;

export function initVchat() {
  const toggle = document.getElementById('vchatToggle');
  const modal = document.getElementById('chat-modal');
  if (!toggle || !modal) return;

  // Historia wiadomości
  let history = [];
  try {
    const saved = localStorage.getItem(HISTORY_KEY);
    if (saved) history = JSON.parse(saved);
  } catch (e) {
    console.warn('vchat: błąd ładowania historii', e);
  }

  // Zapisz provider do localStorage
  const savedProvider = localStorage.getItem(PROVIDER_KEY) || 'jimbokit';

  const JIMBOKIT_BASE = 'http://127.0.0.1:3701';
  let jimboWs = null;
  let jimboWsReady = false;

  // Nadpisz zawartość modalu na inline chat UI
  modal.innerHTML = `
    <div style="background:#0f172a;border-radius:16px;width:90%;max-width:500px;max-height:80vh;display:flex;flex-direction:column;border:1px solid rgba(148,163,184,0.1);box-shadow:0 25px 50px rgba(0,0,0,0.5)">
      <div style="padding:1rem 1.5rem;border-bottom:1px solid rgba(148,163,184,0.1);display:flex;justify-content:space-between;align-items:center;gap:0.75rem">
        <h3 style="margin:0;font-size:1rem;color:#a5b4fc;white-space:nowrap">◈ BUCH_CHAT</h3>
        <select id="vchatProvider" style="background:rgba(51,65,85,0.5);border:1px solid rgba(148,163,184,0.2);border-radius:6px;padding:0.4rem 0.5rem;color:#e2e8f0;font-size:0.78rem;cursor:pointer;flex:1;max-width:180px">
          <option value="jimbokit">⚡ JIMbo Kit (local)</option>
          <option value="workers-ai">Workers AI</option>
          <option value="deepseek">DeepSeek R1</option>
          <option value="openrouter">OpenRouter</option>
          <option value="anthropic">Claude</option>
        </select>
        <button id="vchatClear" title="Wyczyść historię" style="background:rgba(248,113,113,0.15);border:1px solid rgba(248,113,113,0.3);border-radius:6px;padding:0.4rem 0.6rem;color:#fca5a5;cursor:pointer;font-size:0.85rem;line-height:1">🗑</button>
        <button class="chat-modal-close" style="background:transparent;border:none;color:#94a3b8;cursor:pointer;font-size:1.5rem;line-height:1;padding:0">&times;</button>
      </div>
      <div id="vchatMsgs" style="flex:1;overflow-y:auto;padding:1rem;display:flex;flex-direction:column;gap:0.75rem"></div>
      <div style="padding:1rem;border-top:1px solid rgba(148,163,184,0.1);display:flex;gap:0.5rem">
        <textarea id="vchatText" rows="1" placeholder="Zadaj pytanie... (Enter = wyślij, Shift+Enter = nowa linia)" style="flex:1;background:rgba(51,65,85,0.5);border:1px solid rgba(148,163,184,0.2);border-radius:8px;padding:0.75rem;color:#e2e8f0;font-size:0.9rem;resize:none;font-family:inherit;max-height:120px;overflow-y:auto"></textarea>
        <button id="vchatMic" title="Mikrofon (wkrótce)" style="background:rgba(91,124,246,0.15);border:1px solid rgba(91,124,246,0.4);border-radius:8px;padding:0.75rem;color:#a5b4fc;cursor:pointer;min-width:48px">🎤</button>
        <button id="vchatSend" style="background:rgba(91,124,246,0.15);border:1px solid rgba(91,124,246,0.4);border-radius:8px;padding:0.75rem;color:#a5b4fc;cursor:pointer;min-width:48px">📤</button>
      </div>
    </div>
  `;

  const msgsDiv = modal.querySelector('#vchatMsgs');
  const textInput = modal.querySelector('#vchatText');
  const sendBtn = modal.querySelector('#vchatSend');
  const closeBtn = modal.querySelector('.chat-modal-close');
  const providerSelect = modal.querySelector('#vchatProvider');
  const clearBtn = modal.querySelector('#vchatClear');

  // Ustaw wybrany provider
  providerSelect.value = savedProvider;

  // Zapisz provider do localStorage przy zmianie
  providerSelect.onchange = () => {
    localStorage.setItem(PROVIDER_KEY, providerSelect.value);
  };

  // Funkcja zapisywania historii
  const saveHistory = () => {
    try {
      const toSave = history.slice(-MAX_HISTORY);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(toSave));
    } catch (e) {
      console.warn('vchat: błąd zapisu historii', e);
    }
  };

  // Funkcja dodawania wiadomości
  const addMessage = (role, text, tokens = null) => {
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
      white-space: pre-wrap;
      word-wrap: break-word;
    `;
    msgDiv.textContent = text;

    // Dodaj licznik tokenów jeśli dostępny
    if (tokens && role === 'assistant') {
      const tokenSpan = document.createElement('div');
      tokenSpan.style.cssText = 'margin-top:0.5rem;font-size:11px;color:#94a3b8;opacity:0.7';
      tokenSpan.textContent = `⚡ ${tokens} tokenów`;
      msgDiv.appendChild(tokenSpan);
    }

    msgsDiv.appendChild(msgDiv);
    msgsDiv.scrollTop = msgsDiv.scrollHeight;

    // Dodaj do historii
    history.push({ role, content: text, tokens, timestamp: Date.now() });
    saveHistory();
  };

  // Funkcja wyświetlania typing indicator
  const showTyping = () => {
    const typingDiv = document.createElement('div');
    typingDiv.id = 'vchat-typing';
    typingDiv.style.cssText = `
      background: rgba(51,65,85,0.5);
      border: 1px solid rgba(148,163,184,0.2);
      border-radius: 12px;
      padding: 0.75rem;
      color: #94a3b8;
      font-size: 0.9rem;
      align-self: flex-start;
      max-width: 85%;
    `;
    typingDiv.textContent = '▋';
    msgsDiv.appendChild(typingDiv);
    msgsDiv.scrollTop = msgsDiv.scrollHeight;

    // Animacja migania
    let visible = true;
    const interval = setInterval(() => {
      typingDiv.textContent = visible ? '▋' : '';
      visible = !visible;
    }, 500);

    return () => {
      clearInterval(interval);
      typingDiv.remove();
    };
  };

  // Tworzy pusty bubble asystenta i zwraca funkcję do appendowania tokenów
  const createStreamBubble = () => {
    const msgDiv = document.createElement('div');
    msgDiv.style.cssText = `
      background: rgba(51,65,85,0.5);
      border: 1px solid rgba(148,163,184,0.2);
      border-radius: 12px;
      padding: 0.75rem;
      color: #e2e8f0;
      font-size: 0.9rem;
      line-height: 1.5;
      align-self: flex-start;
      max-width: 85%;
      white-space: pre-wrap;
      word-wrap: break-word;
    `;
    msgDiv.textContent = '';
    msgsDiv.appendChild(msgDiv);
    msgsDiv.scrollTop = msgsDiv.scrollHeight;
    return {
      append: (token) => {
        msgDiv.textContent += token;
        msgsDiv.scrollTop = msgsDiv.scrollHeight;
      },
      getText: () => msgDiv.textContent,
    };
  };

  // Połącz WebSocket z JIMbo Kit (lazy, z re-connect)
  const ensureJimboWs = () => new Promise((resolve, reject) => {
    if (jimboWs && jimboWsReady) { resolve(jimboWs); return; }
    const ws = new WebSocket(`${JIMBOKIT_BASE.replace('http', 'ws')}/ws`);
    ws.onopen = () => { jimboWs = ws; jimboWsReady = true; resolve(ws); };
    ws.onerror = () => reject(new Error('Brak połączenia z JIMbo Kit (ws://127.0.0.1:3701)'));
    ws.onclose = () => { jimboWsReady = false; jimboWs = null; };
  });

  // Wyślij przez JIMbo Kit (streaming przez WebSocket)
  const sendViaJimboKit = async (text, stopTyping) => {
    let ws;
    try {
      ws = await ensureJimboWs();
    } catch {
      stopTyping();
      addMessage('assistant', '⚠ JIMbo Kit offline. Uruchom: cd JIMbo_kit && npm run dev');
      return;
    }

    const res = await fetch(`${JIMBOKIT_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text }),
    });
    const { task_id } = await res.json();

    stopTyping();
    const bubble = createStreamBubble();
    let fullText = '';

    await new Promise((resolve) => {
      const handler = (evt) => {
        const msg = JSON.parse(evt.data);
        if (msg.event === 'chat:stream' && msg.data.task_id === task_id) {
          bubble.append(msg.data.content);
          fullText += msg.data.content;
        } else if (msg.event === 'chat:stream_end' && msg.data.task_id === task_id) {
          ws.removeEventListener('message', handler);
          resolve();
        }
      };
      ws.addEventListener('message', handler);
      // timeout 60s
      setTimeout(() => { ws.removeEventListener('message', handler); resolve(); }, 60_000);
    });

    history.push({ role: 'assistant', content: fullText, timestamp: Date.now() });
    saveHistory();
  };

  // Funkcja wysyłania wiadomości
  const sendMessage = async () => {
    const text = textInput.value.trim();
    if (!text) return;

    addMessage('user', text);
    textInput.value = '';
    textInput.style.height = 'auto';
    sendBtn.disabled = true;

    const stopTyping = showTyping();

    try {
      const provider = providerSelect.value;

      if (provider === 'jimbokit') {
        await sendViaJimboKit(text, stopTyping);
      } else {
        const res = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: text, provider, maxTokens: 512 })
        });
        const data = await res.json();
        stopTyping();

        const content = data.content || data.text || 'Brak odpowiedzi';
        const tokens = data.usage?.total_tokens || null;
        addMessage('assistant', content, tokens);
      }
    } catch (err) {
      stopTyping();
      addMessage('assistant', '⚠ Błąd połączenia z AI Gateway');
      console.error('vchat fetch error:', err);
    }

    sendBtn.disabled = false;
    textInput.focus();
  };

  // Funkcja czyszczenia historii
  const clearHistory = () => {
    if (!confirm('Wyczyścić całą historię czatu?')) return;
    history = [];
    localStorage.removeItem(HISTORY_KEY);
    msgsDiv.innerHTML = '';
  };

  // Funkcja otwierania czatu
  const openChat = () => {
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    toggle.classList.add('active');

    // Załaduj historię
    msgsDiv.innerHTML = '';
    history.forEach(msg => {
      const msgDiv = document.createElement('div');
      msgDiv.style.cssText = `
        background: ${msg.role === 'user' ? 'rgba(91,124,246,0.15)' : 'rgba(51,65,85,0.5)'};
        border: 1px solid ${msg.role === 'user' ? 'rgba(91,124,246,0.4)' : 'rgba(148,163,184,0.2)'};
        border-radius: 12px;
        padding: 0.75rem;
        color: #e2e8f0;
        font-size: 0.9rem;
        line-height: 1.5;
        align-self: ${msg.role === 'user' ? 'flex-end' : 'flex-start'};
        max-width: 85%;
        white-space: pre-wrap;
        word-wrap: break-word;
      `;
      msgDiv.textContent = msg.content;

      if (msg.tokens && msg.role === 'assistant') {
        const tokenSpan = document.createElement('div');
        tokenSpan.style.cssText = 'margin-top:0.5rem;font-size:11px;color:#94a3b8;opacity:0.7';
        tokenSpan.textContent = `⚡ ${msg.tokens} tokenów`;
        msgDiv.appendChild(tokenSpan);
      }

      msgsDiv.appendChild(msgDiv);
    });

    msgsDiv.scrollTop = msgsDiv.scrollHeight;
    textInput?.focus();
  };

  // Funkcja zamykania czatu
  const closeChat = () => {
    modal.style.display = 'none';
    document.body.style.overflow = '';
    toggle.classList.remove('active');
  };

  // Auto-resize textarea
  textInput.oninput = () => {
    textInput.style.height = 'auto';
    textInput.style.height = Math.min(textInput.scrollHeight, 120) + 'px';
  };

  // Obsługa Enter/Shift+Enter
  textInput.onkeydown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  toggle.onclick = openChat;
  closeBtn.onclick = closeChat;
  sendBtn.onclick = sendMessage;
  clearBtn.onclick = clearHistory;

  modal.addEventListener('click', (event) => {
    if (event.target === modal) closeChat();
  });
}
