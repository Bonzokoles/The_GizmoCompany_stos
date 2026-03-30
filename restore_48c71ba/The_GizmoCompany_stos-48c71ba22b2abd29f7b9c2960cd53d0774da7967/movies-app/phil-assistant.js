/* ================================================================
   JIMBO Phil-Assistant  Prywatny Filozof-Film Karola Lissona
   Globalny floating widget | zamek  czat
   Zabezpieczenie: ten sam token co panel Admin (jimbo_admin_token)
   ================================================================ */
(function () {
  'use strict';
  if (document.getElementById('_phil_root')) return;

  /*  SYSTEM PROMPT  */
  const SYSTEM = `Jesteś JIMBO  prywatny asystent filozoficzno-filmowy Karola Lissona, nieodłączny towarzysz jego myśli.

## TOŻSAMOŚĆ  TRINITY
- GONZO (Hunter S. Thompson): uczestniczący, subiektywny, first-person, hiperbola, społeczna krytyka
- BONZO (Karol własne doświadczenie): ulice Poznania, deskorolka, Plac Wolności, outsider w post-PRL Polsce
- BUKOWSKI (Charles Bukowski): brutalnie bezpośredni, surowy język, anty-pretensjonalny, każde zdanie musi mieć SOK

Filozoficzne fundamenty: Jung (archetypy, Cień, indywiduacja), Nietzsche (wola mocy, Übermensch), Camus (absurdalna rebelia, mit Syzyfa), Stoicyzm (Seneka, Marek Aureliusz).

## KAROL LISSON aka KEFIS / JIMBO / BONZO
Urodzony w okolicach Poznania. Wychowany wiejsko, duszą w centrum. Deskorolka  tożsamość od wczesnej młodości, Plac Wolności, ikona poznańskiej sceny sk8. Liceum plastyczne. Outsider, który nie oglądał się na opinie, wchodził oknem gdy zamykali drzwi. Książki, filmy, komiksy  klucz do wyobraźni.

## KOLEKCJA FILMÓW (66)
12 Monkeys, A Clockwork Orange, A Ghost Story, A Hidden Life, Blade Runner, Blade Runner 2049, Blue Valentine, Bram Stoker's Dracula, Bug, Bullet, Dark City, Dead Man, Deliver Us from Evil, Devs, Dheepan, Enemy, Fear and Loathing in Las Vegas, Forgetting Sarah Marshall, Forrest Gump, Freddy Got Fingered, Gran Torino, Gummo, Holy Motors, Infinity Pool, It, Jacob's Ladder, K-PAX, La Haine, Little Nicky, Lock Stock and Two Smoking Barrels, Longlegs, Looking for Eric, Me Myself & Irene, Monster Ball, No Country for Old Men, Nocturnal Animals, Perfect World, Pulp Fiction, Punch Drunk Love, Reality, Seven Pounds, Sicario, Silver Linings Playbook, Stigmata, The Beach, The Big Lebowski, The Counselor, The Fisher King, The Florida Project, The Game, The Jacket, The New World, The Possession of Michael King, The Secret Life of Walter Mitty, The Separation, The Station Agent, The Sting, The Truman Show, There's Something About Mary, Time Out of Mind, Tropic Thunder, True Romance, Upstream Color, Vivarium, We Need to Talk About Kevin, You Were Never Really Here.

## MAPA SERWISU
- JIMBO Film Vault (movies-app/index.html)  66 filmów, recenzje, wyszukiwarka, filtry, admin panel
- AI Hub (ai-hub/index.html)  3 zakładki: Agenci (twórz agentów AI), Film Vault (iframe), Dane (datasety + bazy wiedzy)
- Dataset Viewer (ai-hub/dataset-viewer/)  przeglądarka datasetów
- Crawler Dashboard (ai-hub/crawler-dashboard/)  status crawlerów
- ZENO Browser  główna aplikacja Electron (src/)  przeglądarka z wbudowanym AI
- MOA Pipeline (scripts/moa-pipeline.mjs)  Mixture-of-Agents content pipeline, etapy: analyzetranslatehtmlembed

## STYL
- Mów jak kumpel który dużo wie, nie jak asystent korporacyjny
- Krótkie sycące zdania > długie wywody
- Cytuj filozofów życiowo, nie akademicko
- Język polski, angielski tylko gdy naturalniejszy
- Nie bądź grzeczny dla świętego spokoju  mów prawdę`;

  /*  CSS  */
  const CSS = `
#_phil_root *{box-sizing:border-box;margin:0;padding:0}
#_phil_btn{
  position:fixed;bottom:28px;left:28px;z-index:9998;
  width:52px;height:52px;border-radius:50%;
  background:#0f0f18;
  border:1.5px solid rgba(139,92,246,0.35);
  cursor:pointer;
  box-shadow:0 4px 20px rgba(0,0,0,0.5);
  display:flex;align-items:center;justify-content:center;
  transition:transform 180ms cubic-bezier(0.23,1,0.32,1),
             border-color 180ms,box-shadow 180ms;
}
#_phil_btn:hover{
  transform:scale(1.08);
  border-color:rgba(139,92,246,0.7);
  box-shadow:0 6px 28px rgba(139,92,246,0.35);
}
#_phil_btn:active{transform:scale(0.94)}
#_phil_btn.unlocked{border-color:rgba(139,92,246,0.55);background:#100d1f}
#_phil_btn svg{width:22px;height:22px;fill:none;stroke:rgba(139,92,246,0.8);stroke-width:2;stroke-linecap:round;stroke-linejoin:round;transition:stroke 180ms}
#_phil_btn:hover svg{stroke:#a78bfa}
#_phil_btn.unlocked svg{stroke:#a78bfa}

/* lock screen overlay */
#_phil_lock{
  position:fixed;bottom:90px;left:28px;z-index:9997;
  width:300px;
  background:rgba(8,6,18,0.97);
  border:1px solid rgba(139,92,246,0.2);
  border-radius:10px;
  padding:22px 20px 20px;
  box-shadow:0 16px 48px rgba(0,0,0,0.7);
  backdrop-filter:blur(20px);
  display:none;flex-direction:column;gap:12px;
  animation:_phil_in 180ms cubic-bezier(0.23,1,0.32,1) both;
  transform-origin:bottom left;
  font-family:'Inter',system-ui,sans-serif;
}
#_phil_lock.open{display:flex}
@keyframes _phil_in{from{opacity:0;transform:scale(0.96) translateY(6px)}to{opacity:1;transform:none}}
#_phil_lock_title{font-size:.8rem;font-weight:700;color:#c4b5fd;letter-spacing:.5px;text-transform:uppercase}
#_phil_lock_sub{font-size:.72rem;color:#475569;margin-top:-4px}
#_phil_lock_inp{
  width:100%;padding:10px 12px;
  background:rgba(255,255,255,0.05);
  border:1px solid rgba(139,92,246,0.25);
  border-radius:7px;color:#e2e8f0;
  font-size:.85rem;font-family:inherit;outline:none;
  transition:border-color 160ms;
}
#_phil_lock_inp:focus{border-color:rgba(139,92,246,0.6);box-shadow:0 0 0 2px rgba(139,92,246,0.1)}
#_phil_lock_inp::placeholder{color:#334155}
#_phil_lock_err{font-size:.72rem;color:#f87171;display:none;min-height:16px}
#_phil_lock_btn{
  padding:9px;border-radius:7px;border:none;cursor:pointer;
  background:rgba(139,92,246,0.2);color:#a78bfa;
  font-size:.82rem;font-family:inherit;font-weight:600;
  transition:background 150ms,transform 120ms;
}
#_phil_lock_btn:hover{background:rgba(139,92,246,0.35)}
#_phil_lock_btn:active{transform:scale(0.97)}

/* chat window */
#_phil_win{
  position:fixed;bottom:90px;left:28px;z-index:9997;
  width:375px;max-width:calc(100vw - 48px);
  background:rgba(8,6,18,0.96);
  border:1px solid rgba(139,92,246,0.2);
  border-radius:10px;
  display:none;flex-direction:column;
  box-shadow:0 16px 48px rgba(0,0,0,0.7);
  backdrop-filter:blur(24px);
  height:470px;max-height:calc(100vh - 130px);
  transform-origin:bottom left;
  font-family:'Inter',system-ui,sans-serif;
}
#_phil_win.open{display:flex;animation:_phil_in 180ms cubic-bezier(0.23,1,0.32,1) both}
#_phil_hdr{
  padding:11px 14px;display:flex;align-items:center;gap:10px;
  border-bottom:1px solid rgba(139,92,246,0.12);
  background:rgba(139,92,246,0.06);
  border-radius:10px 10px 0 0;flex-shrink:0;
}
#_phil_hdr_dot{width:7px;height:7px;border-radius:50%;background:#7c3aed;
  animation:_phil_pulse 2.5s infinite;flex-shrink:0}
@keyframes _phil_pulse{0%,100%{opacity:1}50%{opacity:.3}}
#_phil_hdr_info{flex:1}
#_phil_hdr_t{font-size:.8rem;font-weight:700;color:#ddd6fe;letter-spacing:.2px}
#_phil_hdr_s{font-size:.6rem;color:#6d28d9;font-weight:500;letter-spacing:.6px;text-transform:uppercase}
#_phil_hdr_close{background:none;border:none;color:#334155;cursor:pointer;
  font-size:1rem;padding:4px;line-height:1;transition:color 140ms}
#_phil_hdr_close:hover{color:#f87171}
#_phil_msgs{
  flex:1;overflow-y:auto;padding:12px;
  display:flex;flex-direction:column;gap:9px;
  scrollbar-width:thin;scrollbar-color:rgba(139,92,246,0.15) transparent;
}
#_phil_msgs::-webkit-scrollbar{width:3px}
#_phil_msgs::-webkit-scrollbar-thumb{background:rgba(139,92,246,0.15);border-radius:2px}
._pm{max-width:87%;padding:9px 13px;border-radius:9px;font-size:.81rem;line-height:1.55;word-break:break-word}
._pm.user{align-self:flex-end;background:rgba(109,40,217,0.2);color:#ddd6fe;border-bottom-right-radius:3px}
._pm.ai{align-self:flex-start;background:rgba(139,92,246,0.1);color:#e2e8f0;border-bottom-left-radius:3px}
._pm.sys{align-self:center;color:#334155;font-size:.69rem;font-style:italic;background:none;padding:3px}
._pt{display:inline-block;margin-left:5px;background:none;border:none;cursor:pointer;
  color:#6d28d9;opacity:.55;font-size:.8rem;vertical-align:middle;transition:color 120ms,opacity 120ms;line-height:1}
._pt:hover{opacity:1;color:#a78bfa}
._pt.playing{color:#f59e0b;opacity:1}
._typing{display:flex;gap:4px;padding:9px 13px;background:rgba(139,92,246,0.08);
  border-radius:9px;border-bottom-left-radius:3px;align-self:flex-start}
._typing span{width:5px;height:5px;border-radius:50%;background:#7c3aed;opacity:.4;animation:_td 1.2s infinite}
._typing span:nth-child(2){animation-delay:.2s}
._typing span:nth-child(3){animation-delay:.4s}
@keyframes _td{0%,80%,100%{opacity:.4;transform:scale(1)}40%{opacity:1;transform:scale(1.25)}}
#_phil_inp{
  display:flex;gap:6px;padding:9px 10px 11px;
  border-top:1px solid rgba(139,92,246,0.1);flex-shrink:0;
}
#_phil_txt{
  flex:1;background:rgba(255,255,255,0.04);
  border:1px solid rgba(139,92,246,0.18);
  border-radius:7px;color:#e2e8f0;font-size:.81rem;
  font-family:inherit;padding:8px 11px;outline:none;resize:none;
  transition:border-color 160ms;line-height:1.4;
  min-height:36px;max-height:90px;
}
#_phil_txt:focus{border-color:rgba(139,92,246,0.45);box-shadow:0 0 0 2px rgba(139,92,246,0.09)}
#_phil_txt::placeholder{color:#1e293b}
#_phil_send{
  width:36px;height:36px;border-radius:7px;border:none;cursor:pointer;
  background:rgba(109,40,217,0.2);color:#a78bfa;flex-shrink:0;
  display:flex;align-items:center;justify-content:center;
  transition:background 140ms,transform 120ms;
}
#_phil_send:hover{background:rgba(109,40,217,0.38)}
#_phil_send:active{transform:scale(0.92)}
@media(max-width:480px){
  #_phil_win,#_phil_lock{left:8px;right:8px;width:auto;max-width:100%}
  #_phil_btn{bottom:18px;left:16px}
}`;

  /*  SVG ICONS  */
  const ICON_LOCKED = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>`;
  const ICON_UNLOCKED = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0 1 9.9-1"/>
  </svg>`;
  const ICON_SEND = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`;

  /*  DOM  */
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  const root = document.createElement('div');
  root.id = '_phil_root';
  root.innerHTML = `
<button id="_phil_btn" title="JIMBO  Prywatny Filozof">${ICON_LOCKED}</button>

<div id="_phil_lock">
  <div id="_phil_lock_title">Dostęp prywatny</div>
  <div id="_phil_lock_sub">Wprowadź token admina</div>
  <input id="_phil_lock_inp" type="password" placeholder="" autocomplete="off" spellcheck="false"/>
  <div id="_phil_lock_err"></div>
  <button id="_phil_lock_btn">Odblokuj</button>
</div>

<div id="_phil_win">
  <div id="_phil_hdr">
    <span id="_phil_hdr_dot"></span>
    <div id="_phil_hdr_info">
      <div id="_phil_hdr_t">JIMBO  Prywatny Filozof</div>
      <div id="_phil_hdr_s">GONZO  BONZO  BUKOWSKI</div>
    </div>
    <button id="_phil_hdr_close" title="Zamknij"></button>
  </div>
  <div id="_phil_msgs"></div>
  <div id="_phil_inp">
    <textarea id="_phil_txt" placeholder="Zapytaj o film, filozofię, życie..." rows="1" autocomplete="off"></textarea>
    <button id="_phil_send" title="Wyślij">${ICON_SEND}</button>
  </div>
</div>`;
  document.body.appendChild(root);

  /*  REFS  */
  const btn     = document.getElementById('_phil_btn');
  const lockDiv = document.getElementById('_phil_lock');
  const lockInp = document.getElementById('_phil_lock_inp');
  const lockBtn = document.getElementById('_phil_lock_btn');
  const lockErr = document.getElementById('_phil_lock_err');
  const win     = document.getElementById('_phil_win');
  const msgs    = document.getElementById('_phil_msgs');
  const txt     = document.getElementById('_phil_txt');
  const sendBtn = document.getElementById('_phil_send');
  const closeBtn= document.getElementById('_phil_hdr_close');

  /*  STATE  */
  let unlocked = false;
  let history = [];
  let greeted = false;
  let currentAudio = null;

  /*  AUTO-UNLOCK if admin token already set  */
  const savedToken = sessionStorage.getItem('jimbo_admin_token');
  if (savedToken) unlock(savedToken, true);

  /*  BUTTON CLICK  */
  btn.onclick = () => {
    if (unlocked) {
      const open = win.classList.toggle('open');
      if (open && !greeted) { greeted = true; setTimeout(sendGreeting, 600); }
    } else {
      lockDiv.classList.toggle('open');
      if (lockDiv.classList.contains('open')) setTimeout(() => lockInp.focus(), 50);
    }
  };

  /*  LOCK SCREEN  */
  lockBtn.onclick = () => doUnlock();
  lockInp.onkeydown = e => { if (e.key === 'Enter') doUnlock(); };

  async function doUnlock() {
    const token = lockInp.value.trim();
    if (!token) return;
    lockErr.style.display = 'none';
    lockBtn.textContent = '...';
    lockBtn.disabled = true;
    try {
      const r = await fetch('/api/movies/moa-config', {
        headers: { 'Authorization': 'Bearer ' + token }
      });
      if (r.ok) {
        sessionStorage.setItem('jimbo_admin_token', token);
        lockInp.value = '';
        unlock(token, false);
      } else {
        lockErr.textContent = 'Nieprawidłowy token';
        lockErr.style.display = 'block';
      }
    } catch (e) {
      lockErr.textContent = 'Błąd połączenia';
      lockErr.style.display = 'block';
    }
    lockBtn.textContent = 'Odblokuj';
    lockBtn.disabled = false;
  }

  function unlock(token, silent) {
    unlocked = true;
    btn.classList.add('unlocked');
    btn.innerHTML = ICON_UNLOCKED;
    btn.title = 'JIMBO  Prywatny Filozof';
    lockDiv.classList.remove('open');
    if (!silent) {
      win.classList.add('open');
      if (!greeted) { greeted = true; setTimeout(sendGreeting, 600); }
    }
    // restore session history
    try {
      const h = sessionStorage.getItem('_phil_hist');
      if (h) {
        history = JSON.parse(h);
        history.forEach(m => addMsg(m.role, m.content, false));
      }
    } catch (_) {}
  }

  /*  CLOSE  */
  closeBtn.onclick = () => win.classList.remove('open');

  /*  MESSAGES  */
  function addMsg(role, text, save = true) {
    const d = document.createElement('div');
    d.className = '_pm ' + (role === 'user' ? 'user' : role === 'ai' ? 'ai' : 'sys');
    if (role === 'ai') {
      const span = document.createElement('span');
      span.textContent = text;
      d.appendChild(span);
      const tts = document.createElement('button');
      tts.className = '_pt'; tts.textContent = ''; tts.title = 'Odtwórz';
      tts.onclick = () => playTTS(text, tts);
      d.appendChild(tts);
    } else {
      d.textContent = text;
    }
    msgs.appendChild(d);
    msgs.scrollTop = msgs.scrollHeight;
    if (save && (role === 'user' || role === 'ai')) {
      try { sessionStorage.setItem('_phil_hist', JSON.stringify(history)); } catch (_) {}
    }
    return d;
  }

  function showTyping() {
    const d = document.createElement('div');
    d.className = '_typing';
    d.innerHTML = '<span></span><span></span><span></span>';
    msgs.appendChild(d); msgs.scrollTop = msgs.scrollHeight; return d;
  }

  /*  SEND  */
  async function sendMsg(text) {
    text = (text || txt.value).trim();
    if (!text) return;
    txt.value = ''; txt.style.height = 'auto';
    addMsg('user', text);
    history.push({ role: 'user', content: text });
    const typing = showTyping();
    try {
      const r = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: text, maxTokens: 1024, systemPrompt: SYSTEM, history: history.slice(-12) })
      });
      typing.remove();
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const data = await r.json();
      const reply = data.response || data.text || '(brak odpowiedzi)';
      addMsg('ai', reply);
      history.push({ role: 'assistant', content: reply });
      try { sessionStorage.setItem('_phil_hist', JSON.stringify(history)); } catch (_) {}
    } catch (e) { typing.remove(); addMsg('sys', 'Błąd: ' + e.message); }
    msgs.scrollTop = msgs.scrollHeight;
  }

  function sendGreeting() {
    const h = new Date().getHours();
    const greetings = [
      h < 12 ? 'Ranek, Kefis. Z czym idziemy  film, filozofia, czy po prostu trzeba pogadać?'
             : h < 18 ? 'Hej Bonzo. 66 filmów czeka, Nietzsche czeka, Bukowski też. Co ruszamy?'
                      : 'Wieczór. GONZO jest gotowy. Pytaj.',
    ];
    const g = greetings[0];
    addMsg('ai', g);
    history.push({ role: 'assistant', content: g });
    try { sessionStorage.setItem('_phil_hist', JSON.stringify(history)); } catch (_) {}
  }

  sendBtn.onclick = () => sendMsg();
  txt.onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(); } };
  txt.oninput = () => { txt.style.height = 'auto'; txt.style.height = Math.min(txt.scrollHeight, 88) + 'px'; };

  /*  TTS  */
  async function playTTS(text, ttsBtn) {
    if (currentAudio) { currentAudio.pause(); currentAudio = null; }
    document.querySelectorAll('._pt.playing').forEach(b => { b.classList.remove('playing'); b.textContent = ''; });
    ttsBtn.classList.add('playing'); ttsBtn.textContent = '';
    try {
      const r = await fetch('/api/ai/tts', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice: 'onyx' }) });
      if (!r.ok) throw new Error('TTS ' + r.status);
      const url = URL.createObjectURL(await r.blob());
      currentAudio = new Audio(url);
      currentAudio.onended = () => { ttsBtn.classList.remove('playing'); ttsBtn.textContent = ''; URL.revokeObjectURL(url); currentAudio = null; };
      currentAudio.onerror = () => { ttsBtn.classList.remove('playing'); ttsBtn.textContent = ''; currentAudio = null; };
      await currentAudio.play();
    } catch (e) { ttsBtn.classList.remove('playing'); ttsBtn.textContent = ''; }
  }

  /*  PUBLIC API  */
  window.jimboAsk = q => { if (unlocked) { win.classList.add('open'); sendMsg(q); } };

})();
