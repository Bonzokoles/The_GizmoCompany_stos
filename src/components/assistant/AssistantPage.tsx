/**
 * BUCH_CHAT — Full Assistant Page
 * Based on BUCH_DEvz_CHAT UI/UX (U:\FROMS\BUCH_DEvz_CHAT)
 * Embedded as the 'assistant' tab inside WebLanding.
 *
 * Modes:
 *   chat     — Multi-provider AI chat with session memory
 *   prompts  — Saved prompt library
 *   kb       — Quick knowledge-base / notes
 *   settings — Provider config, system prompt
 *
 * Storage: localStorage (CF Pages compatible, no Prisma)
 */
import { useState, useRef, useEffect, useCallback } from 'react';

/* ─── Types ─────────────────────────────────────── */

type AssistantMode = 'chat' | 'prompts' | 'kb' | 'settings';

interface ToolCall {
  tool:   string;
  input:  Record<string, unknown>;
  result: string;
}

interface ChatMessage {
  id:         string;
  role:       'user' | 'assistant' | 'system';
  text:       string;
  provider:   string;
  timestamp:  number;
  tokens?:    number;
  toolTrace?: ToolCall[];
  streaming?: boolean;
}

interface Session {
  id:        string;
  name:      string;
  provider:  string;
  messages:  ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

interface SavedPrompt {
  id:        string;
  title:     string;
  content:   string;
  category:  string;
  createdAt: number;
}

interface KBNote {
  id:        string;
  title:     string;
  content:   string;
  tags:      string;
  createdAt: number;
  updatedAt: number;
}

interface AssistantSettings {
  provider:     string;
  model:        string;
  systemPrompt: string;
  maxTokens:    number;
  deepseekKey:  string;
  openrouterKey: string;
  anthropicKey: string;
}

/* ─── Storage Keys ──────────────────────────────── */

const SESSIONS_KEY  = 'buch-assistant-sessions';
const CUR_SESSION_KEY = 'buch-assistant-cur-session';
const PROMPTS_KEY   = 'buch-assistant-prompts';
const KB_KEY        = 'buch-assistant-kb';
const SETTINGS_KEY  = 'buch-assistant-settings';

/* ─── Default Settings ──────────────────────────── */

const DEFAULT_SETTINGS: AssistantSettings = {
  provider:      'deepseek',
  model:         'deepseek-r1',
  systemPrompt:  'Jesteś BUCH_CHAT — asystentem AI projektu ZENO Browser / zenonbrowsers.org.\nProjekt: Electron + React + Vite + Cloudflare Workers/Pages.\nCI/CD: GitHub Actions → deploy-web.yml → Cloudflare Pages.\nWorkers: bonzo-media-hub.stolarnia-ams.workers.dev, moa.mybonzo.com.\nUżywasz /api/ai/chat (Cloudflare Worker) z providerami: DeepSeek R1, OpenRouter, Claude (Anthropic), Workers AI.\nOdpowiadaj po polsku, chyba że użytkownik pisze inaczej.',
  maxTokens:     2048,
  deepseekKey:   '',
  openrouterKey: '',
  anthropicKey:  '',
};

/* ─── Default Prompts ───────────────────────────── */

const DEFAULT_PROMPTS: SavedPrompt[] = [
  { id: 'p1', title: 'Wyjaśnij kod', content: 'Wyjaśnij następujący kod krok po kroku:\n\n```\n{kod}\n```', category: 'dev', createdAt: 0 },
  { id: 'p2', title: 'Napisz testy', content: 'Napisz testy jednostkowe dla poniższego kodu. Użyj Vitest/Jest:\n\n```\n{kod}\n```', category: 'dev', createdAt: 0 },
  { id: 'p3', title: 'Popraw błędy', content: 'Znajdź i popraw błędy w tym kodzie, wyjaśniając każdą zmianę:\n\n```\n{kod}\n```', category: 'dev', createdAt: 0 },
  { id: 'p4', title: 'Przetłumacz tekst', content: 'Przetłumacz poniższy tekst na angielski, zachowując styl i ton:\n\n{tekst}', category: 'content', createdAt: 0 },
  { id: 'p5', title: 'Plan projektu', content: 'Stwórz szczegółowy plan projektu dla: {opis_projektu}\n\nUwzględnij: cele, etapy, ryzyka, zasoby.', category: 'biznes', createdAt: 0 },
  { id: 'p6', title: 'Email profesjonalny', content: 'Napisz profesjonalny email na temat: {temat}\nDo: {odbiorca}\nTon: {ton}', category: 'content', createdAt: 0 },
  { id: 'p7', title: 'Analiza danych', content: 'Przeanalizuj poniższe dane i podaj wnioski:\n\n{dane}', category: 'analiza', createdAt: 0 },
  { id: 'p8', title: 'Refaktoryzacja', content: 'Zrefaktoryzuj ten kod, poprawiając czytelność i wydajność bez zmiany funkcjonalności:\n\n```\n{kod}\n```', category: 'dev', createdAt: 0 },
];

/* ─── Helpers ───────────────────────────────────── */

function uid() { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36); }

function loadJSON<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? (JSON.parse(v) as T) : fallback; } catch { return fallback; }
}

function saveJSON(key: string, val: unknown) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* storage full */ }
}

/* ─── Component ─────────────────────────────────── */

export function AssistantPage() {
  const [mode, setMode] = useState<AssistantMode>('chat');
  const [confirmClearAll, setConfirmClearAll] = useState(false);

  const [settings, setSettings] = useState<AssistantSettings>(
    () => ({ ...DEFAULT_SETTINGS, ...loadJSON<Partial<AssistantSettings>>(SETTINGS_KEY, {}) }),
  );

  const [sessions, setSessions] = useState<Session[]>(() => loadJSON<Session[]>(SESSIONS_KEY, []));
  const [curSessionId, setCurSessionId] = useState<string | null>(
    () => localStorage.getItem(CUR_SESSION_KEY),
  );

  const [prompts, setPrompts] = useState<SavedPrompt[]>(
    () => {
      const saved = loadJSON<SavedPrompt[]>(PROMPTS_KEY, []);
      return saved.length ? saved : DEFAULT_PROMPTS;
    },
  );

  const [notes, setNotes] = useState<KBNote[]>(() => loadJSON<KBNote[]>(KB_KEY, []));

  /* Chat state */
  const [prompt,      setPrompt]      = useState('');
  const [loading,     setLoading]     = useState(false);
  const [useTools,    setUseTools]    = useState(false);
  const [useStreaming, setUseStreaming] = useState(true);
  const [systemMsg, setSystemMsg] = useState(settings.systemPrompt);

  const bottomRef   = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  /* Derived: current session */
  const curSession = sessions.find(s => s.id === curSessionId) ?? null;
  const messages: ChatMessage[] = curSession?.messages ?? [];

  /* Persist sessions */
  useEffect(() => { saveJSON(SESSIONS_KEY, sessions); }, [sessions]);
  useEffect(() => {
    if (curSessionId) localStorage.setItem(CUR_SESSION_KEY, curSessionId);
    else localStorage.removeItem(CUR_SESSION_KEY);
  }, [curSessionId]);
  useEffect(() => { saveJSON(PROMPTS_KEY, prompts); }, [prompts]);
  useEffect(() => { saveJSON(KB_KEY, notes); }, [notes]);
  useEffect(() => { saveJSON(SETTINGS_KEY, settings); }, [settings]);

  /* Scroll on new message */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  /* ── Session helpers ── */
  const newSession = useCallback(() => {
    const s: Session = {
      id:        uid(),
      name:      `Sesja ${new Date().toLocaleDateString('pl-PL')} ${new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}`,
      provider:  settings.provider,
      messages:  [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setSessions(prev => [s, ...prev]);
    setCurSessionId(s.id);
    setMode('chat');
  }, [settings.provider]);

  const deleteSession = useCallback((id: string) => {
    setSessions(prev => prev.filter(s => s.id !== id));
    setCurSessionId(prev => prev === id ? null : prev);
  }, []);

  /* ── SSE chunk parser (OpenAI-compatible + Anthropic) ── */
  function parseSSEToken(line: string): string {
    if (!line.startsWith('data: ')) return '';
    const raw = line.slice(6).trim();
    if (raw === '[DONE]') return '';
    try {
      const parsed = JSON.parse(raw);
      // OpenAI-compatible (DeepSeek, OpenRouter)
      const oaiToken = parsed?.choices?.[0]?.delta?.content;
      if (typeof oaiToken === 'string') return oaiToken;
      // Anthropic streaming
      if (parsed?.type === 'content_block_delta' && parsed?.delta?.type === 'text_delta') {
        return parsed.delta.text ?? '';
      }
    } catch { /* ignore */ }
    return '';
  }

  /* ── Send message ── */
  const sendMessage = useCallback(async () => {
    const text = prompt.trim();
    if (!text || loading) return;

    // Ensure we have a session
    let sessionId = curSessionId;
    let allSessions = sessions;
    if (!sessionId) {
      const s: Session = {
        id: uid(), name: `Sesja ${new Date().toLocaleDateString('pl-PL')} ${new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}`,
        provider: settings.provider, messages: [], createdAt: Date.now(), updatedAt: Date.now(),
      };
      allSessions = [s, ...sessions];
      setSessions(allSessions);
      setCurSessionId(s.id);
      sessionId = s.id;
    }

    const userMsg: ChatMessage = { id: uid(), role: 'user', text, provider: settings.provider, timestamp: Date.now() };
    setPrompt('');

    setSessions(prev => prev.map(s => s.id === sessionId
      ? { ...s, messages: [...s.messages, userMsg], updatedAt: Date.now() }
      : s,
    ));
    setLoading(true);

    // Build full message history for context
    const sessionForContext = allSessions.find(s => s.id === sessionId);
    const contextMessages = [
      ...(systemMsg ? [{ role: 'system' as const, content: systemMsg }] : []),
      ...(sessionForContext?.messages ?? []).slice(-20).map(m => ({
        role:    m.role as 'user' | 'assistant',
        content: m.text,
      })),
      { role: 'user' as const, content: text },
    ];

    const basePayload = {
      prompt:    text,
      messages:  contextMessages,
      provider:  settings.provider,
      maxTokens: settings.maxTokens,
      systemPrompt: systemMsg || undefined,
    };

    try {
      /* ── PATH 1: Tool use (Anthropic agent loop) ── */
      if (useTools) {
        const res = await fetch('/api/ai/chat/tools', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(basePayload),
        });
        const data = await res.json() as {
          content?: string; provider?: string;
          tokens?: { total?: number };
          toolTrace?: ToolCall[];
        };
        const aiMsg: ChatMessage = {
          id:        uid(),
          role:      'assistant',
          text:      data?.content ?? '[Brak odpowiedzi]',
          provider:  data?.provider ?? settings.provider,
          tokens:    data?.tokens?.total,
          toolTrace: data?.toolTrace,
          timestamp: Date.now(),
        };
        setSessions(prev => prev.map(s => s.id === sessionId
          ? { ...s, messages: [...s.messages, aiMsg], updatedAt: Date.now() }
          : s,
        ));
        return;
      }

      /* ── PATH 2: Streaming SSE ── */
      if (useStreaming) {
        const assistantMsgId = uid();
        const placeholder: ChatMessage = {
          id: assistantMsgId, role: 'assistant', text: '', provider: settings.provider,
          timestamp: Date.now(), streaming: true,
        };
        setSessions(prev => prev.map(s => s.id === sessionId
          ? { ...s, messages: [...s.messages, placeholder], updatedAt: Date.now() }
          : s,
        ));

        const res = await fetch('/api/ai/chat/stream', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(basePayload),
        });

        if (!res.ok || !res.body) throw new Error(`Stream error ${res.status}`);

        const reader  = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer    = '';

        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';
          for (const line of lines) {
            const chunk = parseSSEToken(line);
            if (!chunk) continue;
            setSessions(prev => prev.map(s => s.id === sessionId
              ? {
                  ...s,
                  messages: s.messages.map(m =>
                    m.id === assistantMsgId ? { ...m, text: m.text + chunk } : m,
                  ),
                  updatedAt: Date.now(),
                }
              : s,
            ));
          }
        }
        // Mark streaming done
        setSessions(prev => prev.map(s => s.id === sessionId
          ? { ...s, messages: s.messages.map(m => m.id === assistantMsgId ? { ...m, streaming: false } : m) }
          : s,
        ));
        return;
      }

      /* ── PATH 3: Plain fetch (fallback) ── */
      const res  = await fetch('/api/ai/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(basePayload),
      });
      const data = await res.json() as { content?: string; provider?: string; usage?: { total_tokens?: number } };
      const aiMsg: ChatMessage = {
        id:        uid(),
        role:      'assistant',
        text:      data?.content ?? '[Brak odpowiedzi]',
        provider:  data?.provider ?? settings.provider,
        tokens:    data?.usage?.total_tokens,
        timestamp: Date.now(),
      };
      setSessions(prev => prev.map(s => s.id === sessionId
        ? { ...s, messages: [...s.messages, aiMsg], updatedAt: Date.now() }
        : s,
      ));
    } catch {
      const errMsg: ChatMessage = {
        id: uid(), role: 'assistant', text: '⚠ Błąd połączenia z API', provider: settings.provider, timestamp: Date.now(),
      };
      setSessions(prev => prev.map(s => s.id === sessionId
        ? { ...s, messages: [...s.messages, errMsg], updatedAt: Date.now() }
        : s,
      ));
    } finally {
      setLoading(false);
    }
  }, [prompt, loading, curSessionId, sessions, settings, systemMsg, useTools, useStreaming]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  /* ── Note helpers ── */
  const addNote = () => {
    const note: KBNote = { id: uid(), title: 'Nowa notatka', content: '', tags: '', createdAt: Date.now(), updatedAt: Date.now() };
    setNotes(prev => [note, ...prev]);
  };

  /* ── Prompt helpers ── */
  const addPrompt = () => {
    const p: SavedPrompt = { id: uid(), title: 'Nowy prompt', content: '', category: 'inne', createdAt: Date.now() };
    setPrompts(prev => [p, ...prev]);
  };

  const usePrompt = (content: string) => {
    setPrompt(content);
    setMode('chat');
    textareaRef.current?.focus();
  };

  /* ─── Return JSX ─────────────────────────────── */

  return (
    <div className="buch-assistant">
      {/* ── Top navigation bar ── */}
      <div className="ba-topbar">
        <div className="ba-brand">
          <span className="ba-brand-icon">◈</span>
          <span className="ba-brand-name">BUCH_CHAT</span>
          <span className="ba-brand-sub">/ AI ASSISTANT</span>
        </div>

        <nav className="ba-nav" role="navigation">
          {(['chat', 'prompts', 'kb', 'settings'] as AssistantMode[]).map(m => (
            <button
              key={m}
              className={`ba-nav-btn${mode === m ? ' ba-nav-btn-active' : ''}`}
              onClick={() => setMode(m)}
            >
              {m === 'chat'     && '▶ CHAT'}
              {m === 'prompts'  && '◧ PROMPTS'}
              {m === 'kb'       && '◇ BAZA WIEDZY'}
              {m === 'settings' && '⚙ USTAWIENIA'}
            </button>
          ))}
        </nav>

        <div className="ba-status-bar">
          <span className="ba-status-dot ba-dot-ok" title="API Online" />
          <span className="ba-status-label">{settings.provider.toUpperCase()}</span>
          {curSession && <span className="ba-status-session" title={curSession.name}>◈ {curSession.messages.length}msg</span>}
        </div>
      </div>

      {/* ══ CHAT MODE ══════════════════════════════ */}
      {mode === 'chat' && (
        <div className="ba-chat-layout">
          {/* Sidebar: sessions */}
          <aside className="ba-sidebar">
            <div className="ba-sidebar-hdr">
              <span className="ba-sidebar-title">SESJE</span>
              <button className="ba-icon-btn" onClick={newSession} title="Nowa sesja">＋</button>
            </div>
            <div className="ba-session-list">
              {sessions.length === 0 && (
                <p className="ba-sidebar-empty">Brak sesji – kliknij ＋</p>
              )}
              {sessions.map(s => (
                <div
                  key={s.id}
                  className={`ba-session-item${s.id === curSessionId ? ' ba-session-item-active' : ''}`}
                  onClick={() => { setCurSessionId(s.id); }}
                >
                  <div className="ba-session-name">{s.name}</div>
                  <div className="ba-session-meta">{s.messages.length} msg · {s.provider}</div>
                  <div className="ba-session-actions">
                    <button
                      className="ba-icon-btn ba-icon-btn-danger"
                      onClick={e => { e.stopPropagation(); deleteSession(s.id); }}
                      title="Usuń sesję"
                    >⌫</button>
                  </div>
                </div>
              ))}
            </div>

            <div className="ba-sidebar-provider">
              <label className="ba-label">PROVIDER</label>
              <select
                className="ba-select"
                value={settings.provider}
                onChange={e => setSettings(prev => ({ ...prev, provider: e.target.value }))}
              >
                <option value="deepseek">DeepSeek R1</option>
                <option value="openrouter">OpenRouter</option>
                <option value="anthropic">Claude</option>
                <option value="workers-ai">Workers AI</option>
              </select>
              <label className="ba-label" style={{ marginTop: 10 }}>MAX TOKENS</label>
              <input
                className="ba-input"
                type="number"
                min={256}
                max={8192}
                step={256}
                value={settings.maxTokens}
                onChange={e => setSettings(prev => ({ ...prev, maxTokens: Number(e.target.value) }))}
              />
            </div>
          </aside>

          {/* Main: messages + input */}
          <div className="ba-chat-main">
            {/* Messages */}
            <div className="ba-messages" role="log" aria-live="polite">
              {!curSession && (
                <div className="ba-messages-welcome">
                  <div className="ba-welcome-icon">◈</div>
                  <h3>BUCH_CHAT / AI ASSISTANT</h3>
                  <p>Kliknij ＋ aby rozpocząć nową sesję lub wybierz istniejącą z listy po lewej.</p>
                  <button className="ba-btn-primary" onClick={newSession}>＋ Nowa sesja</button>
                </div>
              )}
              {messages.map((m) => (
                <div key={m.id} className={`ba-msg ba-msg-${m.role}`}>
                  <div className="ba-msg-meta">
                    <span className="ba-msg-role">{m.role === 'user' ? 'TY' : m.role === 'system' ? 'SYS' : 'AI'}</span>
                    <span className="ba-msg-prov">{m.provider}</span>
                    {m.tokens != null && <span className="ba-msg-tok">{m.tokens}t</span>}
                    {m.toolTrace && m.toolTrace.length > 0 && (
                      <span className="ba-msg-tools" title={m.toolTrace.map(t => t.tool).join(', ')}>
                        ⚒ {m.toolTrace.length}
                      </span>
                    )}
                    <span className="ba-msg-time">{new Date(m.timestamp).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="ba-msg-text">
                    {m.text}{m.streaming ? <span className="ba-typing">▋</span> : null}
                  </div>
                  {m.toolTrace && m.toolTrace.length > 0 && (
                    <details className="ba-tool-trace">
                      <summary>⚒ Użyte narzędzia ({m.toolTrace.length})</summary>
                      {m.toolTrace.map((t, i) => (
                        <div key={i} className="ba-tool-item">
                          <span className="ba-tool-name">{t.tool}</span>
                          <span className="ba-tool-input">{JSON.stringify(t.input).slice(0, 120)}</span>
                        </div>
                      ))}
                    </details>
                  )}
                </div>
              ))}
              {loading && !messages.some(m => m.streaming) && (
                <div className="ba-msg ba-msg-assistant ba-msg-loading">
                  <div className="ba-msg-meta">
                    <span className="ba-msg-role">AI</span>
                    <span className="ba-msg-prov">{settings.provider}</span>
                    {useTools && <span className="ba-msg-tools">⚒ narzędzia</span>}
                  </div>
                  <div className="ba-msg-text ba-typing">▋</div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input bar */}
            {curSession && (
              <div className="ba-input-bar">
                <div className="ba-system-row">
                  <label className="ba-label">SYS PROMPT</label>
                  <input
                    className="ba-input ba-sys-input"
                    value={systemMsg}
                    onChange={e => setSystemMsg(e.target.value)}
                    placeholder="Opcjonalny system prompt…"
                  />
                </div>
                <div className="ba-tools-row">
                  <button
                    className={`ba-tool-toggle${useStreaming ? ' ba-tool-toggle-on' : ''}`}
                    onClick={() => setUseStreaming(v => !v)}
                    title="Streaming SSE — odpowiedź pojawia się token po tokenie"
                    disabled={useTools}
                  >
                    {useStreaming ? '◉ STREAM' : '○ STREAM'}
                  </button>
                  <button
                    className={`ba-tool-toggle${useTools ? ' ba-tool-toggle-on' : ''}`}
                    onClick={() => setUseTools(v => !v)}
                    title="Narzędzia webowe: web_search, fetch_url, searxng_search, r2_read, d1_query (wymaga Claude)"
                  >
                    {useTools ? '⚒ TOOLS ON' : '⚒ TOOLS OFF'}
                  </button>
                  {useTools && (
                    <span className="ba-tools-note">Claude · web_search · fetch_url · searxng · r2 · d1</span>
                  )}
                </div>
                <div className="ba-input-row">
                  <textarea
                    ref={textareaRef}
                    className="ba-textarea"
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                    onKeyDown={onKeyDown}
                    placeholder="Wiadomość… (Enter = wyślij, Shift+Enter = nowy wiersz)"
                    rows={3}
                    disabled={loading}
                    aria-label="Wiadomość"
                  />
                  <div className="ba-input-actions">
                    <button
                      className="ba-btn-send"
                      onClick={sendMessage}
                      disabled={loading || !prompt.trim()}
                      title="Wyślij (Enter)"
                    >{loading ? '…' : '▶ SEND'}</button>
                    <button
                      className="ba-btn-ghost"
                      onClick={() => { if (curSessionId) setSessions(prev => prev.map(s => s.id === curSessionId ? { ...s, messages: [], updatedAt: Date.now() } : s)); }}
                      title="Wyczyść sesję"
                    >⌫</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ PROMPTS MODE ═══════════════════════════ */}
      {mode === 'prompts' && (
        <div className="ba-panel-layout">
          <div className="ba-panel-hdr">
            <h3 className="ba-panel-title">◧ BIBLIOTEKA PROMPTÓW</h3>
            <button className="ba-btn-primary" onClick={addPrompt}>＋ Nowy prompt</button>
          </div>
          <div className="ba-prompts-grid">
            {prompts.map((p, i) => (
              <div key={p.id} className="ba-prompt-card">
                <div className="ba-prompt-card-hdr">
                  <input
                    className="ba-input ba-prompt-title-input"
                    value={p.title}
                    onChange={e => setPrompts(prev => prev.map((x, xi) => xi === i ? { ...x, title: e.target.value } : x))}
                    aria-label="Tytuł promptu"
                  />
                  <span className="ba-tag">{p.category}</span>
                  <button
                    className="ba-icon-btn ba-icon-btn-danger"
                    onClick={() => setPrompts(prev => prev.filter(x => x.id !== p.id))}
                    title="Usuń"
                  >⌫</button>
                </div>
                <textarea
                  className="ba-textarea ba-prompt-textarea"
                  value={p.content}
                  onChange={e => setPrompts(prev => prev.map((x, xi) => xi === i ? { ...x, content: e.target.value } : x))}
                  rows={4}
                  placeholder="Treść promptu…"
                />
                <div className="ba-prompt-card-footer">
                  <input
                    className="ba-input"
                    style={{ width: 120 }}
                    value={p.category}
                    onChange={e => setPrompts(prev => prev.map((x, xi) => xi === i ? { ...x, category: e.target.value } : x))}
                    placeholder="kategoria"
                    aria-label="Kategoria"
                  />
                  <button className="ba-btn-primary" onClick={() => usePrompt(p.content)}>
                    ▶ Użyj
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══ KB / NOTES MODE ════════════════════════ */}
      {mode === 'kb' && (
        <div className="ba-panel-layout">
          <div className="ba-panel-hdr">
            <h3 className="ba-panel-title">◇ BAZA WIEDZY</h3>
            <button className="ba-btn-primary" onClick={addNote}>＋ Nowa notatka</button>
          </div>
          {notes.length === 0 && (
            <p className="ba-empty-state">Brak notatek — kliknij ＋ aby dodać pierwszą</p>
          )}
          <div className="ba-notes-grid">
            {notes.map((n, i) => (
              <div key={n.id} className="ba-note-card">
                <div className="ba-note-card-hdr">
                  <input
                    className="ba-input ba-note-title-input"
                    value={n.title}
                    onChange={e => setNotes(prev => prev.map((x, xi) => xi === i ? { ...x, title: e.target.value, updatedAt: Date.now() } : x))}
                    aria-label="Tytuł notatki"
                  />
                  <button
                    className="ba-icon-btn ba-icon-btn-danger"
                    onClick={() => setNotes(prev => prev.filter(x => x.id !== n.id))}
                    title="Usuń"
                  >⌫</button>
                </div>
                <textarea
                  className="ba-textarea ba-note-textarea"
                  value={n.content}
                  onChange={e => setNotes(prev => prev.map((x, xi) => xi === i ? { ...x, content: e.target.value, updatedAt: Date.now() } : x))}
                  rows={6}
                  placeholder="Treść notatki…"
                />
                <div className="ba-note-card-footer">
                  <input
                    className="ba-input"
                    value={n.tags}
                    onChange={e => setNotes(prev => prev.map((x, xi) => xi === i ? { ...x, tags: e.target.value } : x))}
                    placeholder="tagi, po, przecinku"
                    aria-label="Tagi"
                  />
                  <button
                    className="ba-btn-primary"
                    onClick={() => { setPrompt(n.content); setMode('chat'); }}
                  >▶ Do chatu</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══ SETTINGS MODE ══════════════════════════ */}
      {mode === 'settings' && (
        <div className="ba-panel-layout">
          <div className="ba-panel-hdr">
            <h3 className="ba-panel-title">⚙ USTAWIENIA ASYSTENTA</h3>
            <button className="ba-btn-primary" onClick={() => saveJSON(SETTINGS_KEY, settings)}>
              ✓ Zapisz
            </button>
          </div>
          <div className="ba-settings-grid">
            <div className="ba-settings-section">
              <h4 className="ba-settings-section-title">AI PROVIDER</h4>
              <label className="ba-label">Domyślny provider</label>
              <select
                className="ba-select"
                value={settings.provider}
                onChange={e => setSettings(prev => ({ ...prev, provider: e.target.value }))}
              >
                <option value="deepseek">DeepSeek R1</option>
                <option value="openrouter">OpenRouter</option>
                <option value="anthropic">Claude (Anthropic)</option>
                <option value="workers-ai">Cloudflare Workers AI</option>
              </select>
              <label className="ba-label" style={{ marginTop: 14 }}>Maksymalna liczba tokenów</label>
              <input
                className="ba-input"
                type="number"
                min={256}
                max={8192}
                step={256}
                value={settings.maxTokens}
                onChange={e => setSettings(prev => ({ ...prev, maxTokens: Number(e.target.value) }))}
              />
            </div>

            <div className="ba-settings-section">
              <h4 className="ba-settings-section-title">SYSTEM PROMPT</h4>
              <label className="ba-label">Domyślny system prompt</label>
              <textarea
                className="ba-textarea"
                rows={5}
                value={settings.systemPrompt}
                onChange={e => setSettings(prev => ({ ...prev, systemPrompt: e.target.value }))}
                placeholder="Opis roli asystenta…"
              />
            </div>

            <div className="ba-settings-section">
              <h4 className="ba-settings-section-title">API KEYS (opcjonalne — overridy env)</h4>
              <p className="ba-settings-note">
                Klucze są przechowywane wyłącznie w localStorage Twojej przeglądarki.
                Pozostaw puste, aby używać kluczy zdefiniowanych w konfiguracji serwera.
              </p>
              {[
                { key: 'deepseekKey', label: 'DeepSeek API Key' },
                { key: 'openrouterKey', label: 'OpenRouter API Key' },
                { key: 'anthropicKey', label: 'Anthropic API Key' },
              ].map(({ key, label }) => (
                <div key={key} style={{ marginTop: 12 }}>
                  <label className="ba-label">{label}</label>
                  <input
                    className="ba-input"
                    type="password"
                    value={settings[key as keyof AssistantSettings] as string}
                    onChange={e => setSettings(prev => ({ ...prev, [key]: e.target.value }))}
                    placeholder="sk-…"
                    autoComplete="off"
                  />
                </div>
              ))}
            </div>

            <div className="ba-settings-section">
              <h4 className="ba-settings-section-title">DANE LOKALNE</h4>
              <p className="ba-settings-note">
                Sesje: {sessions.length} · Prompty: {prompts.length} · Notatki: {notes.length}
              </p>
              <button
                className="ba-btn-danger"
                onClick={() => setConfirmClearAll(true)}
              >⌫ Wyczyść wszystkie sesje</button>
              {confirmClearAll && (
                <div style={{ marginTop: 10, padding: 10, border: '1px solid #7f1d1d', background: '#1f0a0a', borderRadius: 8 }}>
                  <div style={{ marginBottom: 8, color: '#fecaca', fontSize: 12 }}>
                    Potwierdź: to usunie wszystkie sesje i dane chatu.
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      className="ba-btn-danger"
                      onClick={() => {
                        setSessions([]);
                        setCurSessionId(null);
                        setConfirmClearAll(false);
                      }}
                    >Tak, usuń</button>
                    <button
                      className="ba-btn"
                      onClick={() => setConfirmClearAll(false)}
                    >Anuluj</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
