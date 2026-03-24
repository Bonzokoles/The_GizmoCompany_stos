/* ═══════════════════════════════════════════════════
   MODULE — Voice Chat Widget (Jimbo)
   ═══════════════════════════════════════════════════ */

export function initVchat() {
  const toggle   = document.getElementById('vchatToggle');
  const win      = document.getElementById('vchatWin');
  const msgs     = document.getElementById('vchatMsgs');
  const txt      = document.getElementById('vchatText');
  const sendBtn  = document.getElementById('vchatSend');
  const micBtn   = document.getElementById('vchatMic');
  const closeBtn = document.getElementById('vchatClose');

  let history = [], mediaRec = null, audioChunks = [], recording = false, currentAudio = null;
  let silenceTimer = null, audioCtx = null, analyser = null, silenceStart = 0;
  const SILENCE_THRESHOLD = 0.01, SILENCE_DURATION = 3000;
  let greeted = false;

  toggle.onclick = () => {
    win.classList.toggle('open');
    toggle.classList.toggle('active');
    if (win.classList.contains('open')) {
      txt.focus();
      if (!greeted) {
        greeted = true;
        setTimeout(() => addMsg('ai', 'Cześć! Jestem Jimbo, twój kolega i przewodnik po tej aplikacji. Karol ją cały czas rozwija, a ta część jest eksperymentalna — więc jeżeli coś pójdzie nie tak z moimi odpowiedziami głosowymi, to pisz i też postaram się pomóc! 😊'), 2000);
      }
    }
  };
  closeBtn.onclick = () => { win.classList.remove('open'); toggle.classList.remove('active'); };
  txt.onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(); } };
  sendBtn.onclick = () => sendMsg();

  function addMsg(role, text) {
    const d = document.createElement('div');
    d.className = 'vchat-msg ' + (role === 'user' ? 'user' : 'ai');
    if (role === 'ai') {
      const span = document.createElement('span'); span.textContent = text; d.appendChild(span);
      const ttsBtn = document.createElement('button'); ttsBtn.className = 'vchat-tts';
      ttsBtn.textContent = '🔊'; ttsBtn.title = 'Odtwórz głosowo';
      ttsBtn.onclick = () => playTTS(text, ttsBtn); d.appendChild(ttsBtn);
    } else { d.textContent = text; }
    msgs.appendChild(d); msgs.scrollTop = msgs.scrollHeight; return d;
  }

  async function searchKbForContext(query) {
    try {
      const endpoint = document.getElementById('kb-endpoint')?.value || 'https://jimbo-gateway.stolarnia-ams.workers.dev';
      const r = await fetch(`${endpoint}/kb/search`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, limit: 3 }),
      });
      if (!r.ok) return '';
      const data = await r.json();
      const results = data.results || [];
      if (!results.length) return '';
      return '\n\nKontekst z bazy wiedzy:\n' + results.map((d, i) =>
        `[${i+1}] ${d.title}: ${(d.content||d.excerpt||'').slice(0,300)}`).join('\n');
    } catch { return ''; }
  }

  async function sendMsg() {
    const text = txt.value.trim(); if (!text) return; txt.value = '';
    addMsg('user', text); history.push({ role: 'user', content: text });
    const aiEl = addMsg('ai', '...');
    try {
      const kbCtx = await searchKbForContext(text);
      const systemPrompt = 'Jesteś Jimbo — pomocnym asystentem AI tego portalu. Odpowiadaj po polsku, krótko i konkretnie. Masz dostęp do bazy wiedzy projektu — korzystaj z niej gdy to przydatne.' + kbCtx;
      const r = await fetch('/api/ai/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: text, maxTokens: 1024, systemPrompt }),
      });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const data = await r.json();
      const reply = data.content || data.response || data.text || '(brak odpowiedzi)';
      aiEl.firstChild.textContent = reply;
      history.push({ role: 'assistant', content: reply });
    } catch (e) { aiEl.firstChild.textContent = 'Błąd: ' + e.message; aiEl.style.color = '#f87171'; }
    msgs.scrollTop = msgs.scrollHeight;
  }

  async function playTTS(text, btn) {
    if (currentAudio) {
      currentAudio.pause(); currentAudio = null;
      document.querySelectorAll('.vchat-tts.playing').forEach(b => b.classList.remove('playing'));
    }
    btn.classList.add('playing'); btn.textContent = '⏳';
    try {
      const r = await fetch('/api/ai/tts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice: 'nova' }),
      });
      if (!r.ok) throw new Error('TTS HTTP ' + r.status);
      const blob = await r.blob(); const url = URL.createObjectURL(blob);
      currentAudio = new Audio(url);
      currentAudio.onended = () => { btn.classList.remove('playing'); btn.textContent = '🔊'; URL.revokeObjectURL(url); currentAudio = null; };
      currentAudio.onerror = () => { btn.classList.remove('playing'); btn.textContent = '🔊'; currentAudio = null; };
      await currentAudio.play();
    } catch (e) { btn.classList.remove('playing'); btn.textContent = '🔊'; console.error('TTS error:', e); }
  }

  micBtn.onclick = async () => {
    if (recording) { stopRecording(); return; }
    if (!navigator.mediaDevices?.getUserMedia) { alert('Przeglądarka nie obsługuje nagrywania.'); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { sampleRate: 16000, channelCount: 1 } });
      audioChunks = [];
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioCtx.createMediaStreamSource(stream);
      analyser = audioCtx.createAnalyser(); analyser.fftSize = 512;
      source.connect(analyser);
      const dataArr = new Float32Array(analyser.fftSize);
      silenceStart = 0;
      function checkSilence() {
        if (!recording) return;
        analyser.getFloatTimeDomainData(dataArr);
        let rms = 0; for (let i = 0; i < dataArr.length; i++) rms += dataArr[i]*dataArr[i];
        rms = Math.sqrt(rms / dataArr.length);
        if (rms < SILENCE_THRESHOLD) {
          if (!silenceStart) silenceStart = Date.now();
          else if (Date.now() - silenceStart >= SILENCE_DURATION) { stopRecording(); return; }
        } else { silenceStart = 0; }
        silenceTimer = requestAnimationFrame(checkSilence);
      }
      mediaRec = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm',
      });
      mediaRec.ondataavailable = e => { if (e.data.size > 0) audioChunks.push(e.data); };
      mediaRec.onstop = async () => {
        if (silenceTimer) { cancelAnimationFrame(silenceTimer); silenceTimer = null; }
        if (audioCtx) { audioCtx.close().catch(() => {}); audioCtx = null; }
        stream.getTracks().forEach(t => t.stop());
        await processAudio();
      };
      mediaRec.start(); recording = true; micBtn.classList.add('recording'); micBtn.textContent = '⏹';
      checkSilence();
    } catch (e) { alert('Brak dostępu do mikrofonu: ' + e.message); }
  };

  function stopRecording() {
    if (mediaRec && mediaRec.state !== 'inactive') {
      mediaRec.stop(); recording = false;
      micBtn.classList.remove('recording'); micBtn.textContent = '🎤';
    }
  }

  async function processAudio() {
    const blob = new Blob(audioChunks, { type: 'audio/webm' });
    if (blob.size < 500) return;
    micBtn.textContent = '⏳';
    try {
      const r = await fetch('/api/ai/stt', { method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body: blob });
      if (!r.ok) { const t = await r.text(); throw new Error('STT ' + r.status + ': ' + t.slice(0,100)); }
      const data = await r.json();
      if (data.text?.trim()) { txt.value = data.text.trim(); sendMsg(); }
      else { const s = document.createElement('div'); s.className = 'vchat-msg system'; s.textContent = 'Nie rozpoznano mowy.'; msgs.appendChild(s); }
    } catch (e) {
      const s = document.createElement('div'); s.className = 'vchat-msg system'; s.textContent = 'Błąd STT: ' + e.message; msgs.appendChild(s);
    }
    micBtn.textContent = '🎤'; msgs.scrollTop = msgs.scrollHeight;
  }
}
