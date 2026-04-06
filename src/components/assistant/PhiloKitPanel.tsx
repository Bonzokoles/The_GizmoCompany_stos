/**
 * PhiloKitPanel — asystent filozoficzny ZENO Browser
 *
 * Łączy się z PHILO_kit server (port 4112).
 * Streaming WS, keyword search po 107k cytatów filozofów.
 */

import { useState, useRef, useEffect, useCallback } from 'react';

const API  = 'http://127.0.0.1:4112';
const WS   = 'ws://127.0.0.1:4112/ws';
const SESSION_KEY = 'philokit_session';

interface PhiloMsg {
  role: 'user' | 'assistant';
  text: string;
  ts: number;
  streaming?: boolean;
  quotes?: Array<{ author: string; excerpt: string }>;
}

interface Philosopher { name: string; count: number; }

export function PhiloKitPanel() {
  const [online,       setOnline]       = useState(false);
  const [indexSize,    setIndexSize]     = useState(0);
  const [philosophers, setPhilosophers] = useState<Philosopher[]>([]);
  const [messages,     setMessages]     = useState<PhiloMsg[]>([]);
  const [input,        setInput]        = useState('');
  const [loading,      setLoading]      = useState(false);
  const [filterAuthor, setFilterAuthor] = useState('');
  const [quoteSearch,  setQuoteSearch]  = useState('');
  const [quoteResults, setQuoteResults] = useState<Array<{ author: string; sentence: string }>>([]);
  const [tab,          setTab]          = useState<'chat' | 'quotes'>('chat');

  const sessionKey = useRef(localStorage.getItem(SESSION_KEY) ?? `philo:${crypto.randomUUID()}`);
  const wsRef      = useRef<WebSocket | null>(null);
  const bottomRef  = useRef<HTMLDivElement>(null);

  // Persist session key
  useEffect(() => { localStorage.setItem(SESSION_KEY, sessionKey.current); }, []);

  // Scroll to bottom on new message
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // Check health
  const checkOnline = useCallback(async () => {
    try {
      const r = await fetch(`${API}/health`);
      if (!r.ok) { setOnline(false); return; }
      const d = await r.json() as { index?: { total?: number }; status?: string };
      setOnline(d.status === 'ok');
      setIndexSize(d.index?.total ?? 0);
    } catch { setOnline(false); }
  }, []);

  const loadPhilosophers = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/philosophers`);
      const d = await r.json() as { philosophers: Philosopher[] };
      setPhilosophers(d.philosophers ?? []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    checkOnline();
    loadPhilosophers();
    const t = setInterval(checkOnline, 10_000);
    return () => clearInterval(t);
  }, [checkOnline, loadPhilosophers]);

  // WebSocket
  useEffect(() => {
    let ws: WebSocket;
    const connect = () => {
      try { ws = new WebSocket(WS); } catch { return; }
      wsRef.current = ws;

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data as string) as {
            event: string;
            sessionKey?: string;
            data?: { token?: string; message?: string; quotesUsed?: Array<{ author: string; excerpt: string }>; error?: string };
          };
          const sk = msg.sessionKey ?? msg.data?.['sessionKey' as keyof typeof msg.data] as string;
          if (sk && sk !== sessionKey.current) return;

          if (msg.event === 'chat:stream') {
            const token = msg.data?.token ?? '';
            setMessages(prev => {
              const last = prev[prev.length - 1];
              if (last?.streaming) {
                return [...prev.slice(0, -1), { ...last, text: last.text + token }];
              }
              return [...prev, { role: 'assistant', text: token, ts: Date.now(), streaming: true }];
            });
          } else if (msg.event === 'chat:stream_end') {
            setMessages(prev => {
              const last = prev[prev.length - 1];
              if (last?.streaming) {
                return [...prev.slice(0, -1), { ...last, streaming: false, quotes: msg.data?.quotesUsed }];
              }
              return prev;
            });
            setLoading(false);
          } else if (msg.event === 'chat:error') {
            setMessages(prev => [...prev, {
              role: 'assistant', text: `⚠ ${msg.data?.error ?? 'Błąd serwera'}`, ts: Date.now(),
            }]);
            setLoading(false);
          }
        } catch { /* ignore */ }
      };

      ws.onclose = () => setTimeout(connect, 3000);
    };
    connect();
    return () => ws?.close();
  }, []);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading || !online) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text, ts: Date.now() }]);
    setLoading(true);
    try {
      await fetch(`${API}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, sessionKey: sessionKey.current }),
      });
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', text: '⚠ Brak połączenia z PhiloKit (port 4112)', ts: Date.now() }]);
      setLoading(false);
    }
  }, [input, loading, online]);

  const searchQuotes = useCallback(async () => {
    if (!quoteSearch.trim()) return;
    try {
      const r = await fetch(`${API}/api/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: quoteSearch, author: filterAuthor || undefined, topK: 10 }),
      });
      const d = await r.json() as { results: Array<{ author: string; sentence: string }> };
      setQuoteResults(d.results ?? []);
    } catch { /* ignore */ }
  }, [quoteSearch, filterAuthor]);

  const newSession = () => {
    sessionKey.current = `philo:${crypto.randomUUID()}`;
    localStorage.setItem(SESSION_KEY, sessionKey.current);
    setMessages([]);
  };

  const useQuoteAsPrompt = (q: { author: string; sentence: string }) => {
    setInput(`Co sądzisz o tej myśli ${q.author}a: "${q.sentence.slice(0, 120)}..."`);
    setTab('chat');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#0d1117', color: '#e6edf3', fontFamily: 'monospace' }}>

      {/* Header */}
      <div style={{ padding: '8px 12px', borderBottom: '1px solid #30363d', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '16px' }}>🦉</span>
        <span style={{ fontSize: '13px', fontWeight: 600, color: '#58a6ff' }}>PHILO</span>
        <span style={{ fontSize: '10px', color: online ? '#4ade80' : '#f87171' }}>
          {online ? `● online · ${indexSize.toLocaleString()} cytatów` : '● offline'}
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px' }}>
          <button
            className="ah-tab-btn"
            style={{ fontSize: '10px', padding: '2px 8px' }}
            onClick={newSession}
            title="Nowa rozmowa"
          >+ nowa</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #21262d' }}>
        <button
          onClick={() => setTab('chat')}
          style={{ flex: 1, padding: '6px', fontSize: '11px', background: 'none', border: 'none', cursor: 'pointer',
            color: tab === 'chat' ? '#58a6ff' : '#8b949e',
            borderBottom: tab === 'chat' ? '2px solid #58a6ff' : '2px solid transparent' }}
        >💬 Rozmowa</button>
        <button
          onClick={() => setTab('quotes')}
          style={{ flex: 1, padding: '6px', fontSize: '11px', background: 'none', border: 'none', cursor: 'pointer',
            color: tab === 'quotes' ? '#58a6ff' : '#8b949e',
            borderBottom: tab === 'quotes' ? '2px solid #58a6ff' : '2px solid transparent' }}
        >📜 Cytaty</button>
      </div>

      {/* Chat tab */}
      {tab === 'chat' && (
        <>
          {/* Philosopher filter chips */}
          {philosophers.length > 0 && (
            <div style={{ padding: '6px 10px', display: 'flex', gap: '4px', flexWrap: 'wrap', borderBottom: '1px solid #21262d' }}>
              {philosophers.map(p => (
                <button
                  key={p.name}
                  onClick={() => setFilterAuthor(filterAuthor === p.name ? '' : p.name)}
                  style={{
                    fontSize: '10px', padding: '2px 8px', borderRadius: '10px', cursor: 'pointer', border: 'none',
                    background: filterAuthor === p.name ? '#1d4ed8' : '#21262d',
                    color: filterAuthor === p.name ? '#fff' : '#8b949e',
                  }}
                  title={`${p.count} cytatów`}
                >{p.name}</button>
              ))}
              {filterAuthor && (
                <span style={{ fontSize: '10px', color: '#fbbf24', alignSelf: 'center' }}>↑ fokus: {filterAuthor}</span>
              )}
            </div>
          )}

          {/* Messages */}
          <div style={{ flex: 1, overflow: 'auto', padding: '12px' }}>
            {messages.length === 0 && (
              <div style={{ color: '#6b7280', fontSize: '12px', textAlign: 'center', marginTop: '40px' }}>
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>🦉</div>
                <div>Zacznij rozmowę o filozofii.</div>
                <div style={{ marginTop: '8px', fontSize: '11px' }}>
                  Kliknij filozofa wyżej żeby skupić się na jego myślach.
                </div>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} style={{ marginBottom: '14px' }}>
                <div style={{
                  fontSize: '11px', color: msg.role === 'user' ? '#58a6ff' : '#a78bfa',
                  marginBottom: '4px',
                }}>
                  {msg.role === 'user' ? '► Ty' : '🦉 PHILO'}
                  <span style={{ color: '#6b7280', marginLeft: '8px' }}>
                    {new Date(msg.ts).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div style={{
                  fontSize: '12px', lineHeight: '1.6', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                  padding: '8px 10px', borderRadius: '6px',
                  background: msg.role === 'user' ? '#161b22' : '#0d1117',
                  border: `1px solid ${msg.role === 'user' ? '#30363d' : '#1f2937'}`,
                }}>
                  {msg.text}
                  {msg.streaming && <span style={{ color: '#6b7280' }}>▋</span>}
                </div>
                {/* Cytaty użyte przez PHILO */}
                {msg.quotes && msg.quotes.length > 0 && (
                  <div style={{ marginTop: '4px', paddingLeft: '10px' }}>
                    {msg.quotes.map((q, qi) => (
                      <div key={qi} style={{ fontSize: '10px', color: '#6b7280', marginTop: '2px' }}>
                        📜 <em>{q.author}</em>: {q.excerpt}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {loading && messages[messages.length - 1]?.role !== 'assistant' && (
              <div style={{ color: '#6b7280', fontSize: '12px' }}>🦉 PHILO myśli…</div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding: '8px', borderTop: '1px solid #30363d', display: 'flex', gap: '6px' }}>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder={online ? 'Zadaj pytanie filozoficzne… (Enter = wyślij)' : 'PhiloKit offline — uruchom: cd PHILO_kit && npm run dev'}
              disabled={!online || loading}
              style={{
                flex: 1, resize: 'none', height: '54px', background: '#161b22', border: '1px solid #30363d',
                color: '#e6edf3', borderRadius: '6px', padding: '8px', fontSize: '12px', fontFamily: 'monospace',
              }}
            />
            <button
              onClick={send}
              disabled={!online || loading || !input.trim()}
              style={{
                padding: '0 14px', background: '#1d4ed8', color: '#fff', border: 'none',
                borderRadius: '6px', cursor: 'pointer', fontSize: '16px',
                opacity: (!online || loading || !input.trim()) ? 0.4 : 1,
              }}
            >→</button>
          </div>
        </>
      )}

      {/* Quotes tab */}
      {tab === 'quotes' && (
        <div style={{ flex: 1, overflow: 'auto', padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            <input
              value={quoteSearch}
              onChange={e => setQuoteSearch(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') searchQuotes(); }}
              placeholder="Szukaj w cytatach…"
              style={{ flex: 1, background: '#161b22', border: '1px solid #30363d', color: '#e6edf3', borderRadius: '6px', padding: '6px 10px', fontSize: '12px' }}
            />
            <select
              value={filterAuthor}
              onChange={e => setFilterAuthor(e.target.value)}
              style={{ background: '#161b22', border: '1px solid #30363d', color: '#e6edf3', borderRadius: '6px', padding: '4px', fontSize: '11px' }}
            >
              <option value="">Wszyscy</option>
              {philosophers.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
            </select>
            <button onClick={searchQuotes} style={{ background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontSize: '12px' }}>
              🔍
            </button>
          </div>

          {quoteResults.length === 0 && (
            <div style={{ color: '#6b7280', fontSize: '11px' }}>Wpisz zapytanie i kliknij 🔍</div>
          )}
          {quoteResults.map((q, i) => (
            <div key={i} style={{ background: '#0d1117', border: '1px solid #21262d', borderRadius: '6px', padding: '8px 10px' }}>
              <div style={{ fontSize: '10px', color: '#a78bfa', marginBottom: '4px' }}>{q.author}</div>
              <div style={{ fontSize: '11px', color: '#e6edf3', lineHeight: '1.5', fontStyle: 'italic' }}>
                "{q.sentence.slice(0, 300)}{q.sentence.length > 300 ? '…' : ''}"
              </div>
              <button
                onClick={() => useQuoteAsPrompt(q)}
                style={{ marginTop: '6px', fontSize: '10px', background: '#21262d', color: '#8b949e', border: 'none', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer' }}
              >💬 omów w chacie</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
