/**
 * BUCH_CHAT — Floating Chat Widget
 * Replaces the broken CopilotKit trigger.
 * Backed by the existing /api/ai/chat endpoint.
 * Offers a quick-open panel + link to the full AssistantPage tab.
 */
import { useState, useRef, useEffect, useCallback } from 'react';

interface Message {
  role: 'user' | 'assistant';
  text: string;
  provider: string;
  tokens?: number;
  ts: number;
}

interface BuchChatWidgetProps {
  /** Called when user clicks "Open Full Assistant" → parent switches to 'assistant' tab */
  onOpenFull?: () => void;
}

const HISTORY_KEY  = 'buch-widget-history';
const PROVIDER_KEY = 'buch-widget-provider';

export function BuchChatWidget({ onOpenFull }: BuchChatWidgetProps) {
  const [open, setOpen]     = useState(false);
  const [provider, setProvider] = useState<string>(
    () => localStorage.getItem(PROVIDER_KEY) ?? 'deepseek',
  );
  const [history, setHistory] = useState<Message[]>(() => {
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]'); } catch { return []; }
  });
  const [prompt,  setPrompt]  = useState('');
  const [loading, setLoading] = useState(false);

  const bottomRef   = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  /* persist */
  useEffect(() => {
    localStorage.setItem(HISTORY_KEY,  JSON.stringify(history.slice(-80)));
  }, [history]);
  useEffect(() => {
    localStorage.setItem(PROVIDER_KEY, provider);
  }, [provider]);

  /* scroll to bottom */
  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, open, loading]);

  /* focus on open */
  useEffect(() => {
    if (open) textareaRef.current?.focus();
  }, [open]);

  const sendMessage = useCallback(async () => {
    const text = prompt.trim();
    if (!text || loading) return;
    setPrompt('');
    setHistory(h => [...h, { role: 'user', text, provider, ts: Date.now() }]);
    setLoading(true);
    try {
      const res  = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: text, provider, maxTokens: 1024 }),
      });
      const data = await res.json() as { content?: string; provider?: string; usage?: { total_tokens?: number } };
      setHistory(h => [...h, {
        role:     'assistant',
        text:     data?.content ?? '[Brak odpowiedzi]',
        provider: data?.provider ?? provider,
        tokens:   data?.usage?.total_tokens,
        ts:       Date.now(),
      }]);
    } catch {
      setHistory(h => [...h, {
        role: 'assistant', text: '⚠ Błąd połączenia z API', provider, ts: Date.now(),
      }]);
    } finally {
      setLoading(false);
    }
  }, [prompt, provider, loading]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const openFull = () => { setOpen(false); onOpenFull?.(); };

  return (
    <>
      {/* ── Floating Panel ── */}
      {open && (
        <div className="buch-widget-panel" role="dialog" aria-label="BUCH_CHAT Assistant">
          {/* Header */}
          <div className="buch-widget-hdr">
            <span className="buch-widget-brand">◈ BUCH_CHAT</span>
            <div className="buch-widget-hdr-actions">
              <select
                className="buch-widget-sel"
                value={provider}
                onChange={e => setProvider(e.target.value)}
                aria-label="Provider AI"
              >
                <option value="deepseek">DeepSeek R1</option>
                <option value="openrouter">OpenRouter</option>
                <option value="anthropic">Claude</option>
                <option value="workers-ai">Workers AI</option>
              </select>
              {onOpenFull && (
                <button
                  className="buch-widget-btn"
                  onClick={openFull}
                  title="Otwórz pełnego asystenta"
                  aria-label="Pełny asystent"
                >⊞</button>
              )}
              <button
                className="buch-widget-btn"
                onClick={() => setOpen(false)}
                aria-label="Zamknij"
              >✕</button>
            </div>
          </div>

          {/* Messages */}
          <div className="buch-widget-msgs">
            {history.length === 0 && (
              <div className="buch-widget-empty">
                <p>Witaj — wpisz pytanie aby rozpocząć</p>
                {onOpenFull && (
                  <button className="buch-widget-link-btn" onClick={openFull}>
                    ⊞ Otwórz pełnego Asystenta z pamięcią i narzędziami →
                  </button>
                )}
              </div>
            )}
            {history.map((m, i) => (
              <div key={i} className={`buch-widget-msg buch-msg-${m.role}`}>
                <div className="buch-msg-meta">
                  <span className="buch-msg-role">{m.role === 'user' ? 'TY' : 'AI'}</span>
                  <span className="buch-msg-prov">{m.provider}</span>
                  {m.tokens != null && <span className="buch-msg-tok">{m.tokens}t</span>}
                </div>
                <p className="buch-msg-text">{m.text}</p>
              </div>
            ))}
            {loading && (
              <div className="buch-widget-msg buch-msg-assistant">
                <div className="buch-msg-meta"><span className="buch-msg-role">AI</span></div>
                <p className="buch-msg-text buch-typing">▋</p>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="buch-widget-footer">
            <div className="buch-widget-input-row">
              <textarea
                ref={textareaRef}
                className="buch-widget-textarea"
                placeholder="Pytanie… (Enter = wyślij, Shift+Enter = nowy wiersz)"
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                onKeyDown={onKeyDown}
                rows={2}
                disabled={loading}
                aria-label="Wiadomość"
              />
              <button
                className="buch-widget-send"
                onClick={sendMessage}
                disabled={loading || !prompt.trim()}
                aria-label="Wyślij"
              >{loading ? '…' : '▶'}</button>
            </div>
            {history.length > 0 && (
              <button className="buch-widget-clear" onClick={() => setHistory([])}>
                ⌫ wyczyść historię
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Toggle Button ── */}
      <button
        className={`chat-toggle buch-toggle${open ? ' buch-toggle-active' : ''}`}
        onClick={() => setOpen(o => !o)}
        title={open ? 'Zamknij BUCH_CHAT' : 'Otwórz BUCH_CHAT'}
        aria-expanded={open}
        aria-controls="buch-widget-panel"
      >
        <span className="ct-dot" />
        BUCH_CHAT
      </button>
    </>
  );
}
