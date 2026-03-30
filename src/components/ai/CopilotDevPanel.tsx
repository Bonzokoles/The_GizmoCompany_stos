/**
 * ZENO DevTools Panel
 *
 * Narzędzia developerskie dla ZENO Browser:
 *  — Copilot SDK status + runPrompt
 *  — JimboKit WebSocket status (port 4111)
 *  — MCP tools lista
 *  — Sysinfo (Electron, Node, platform)
 *  — Quick actions (reload, open devtools)
 */

import { useState, useCallback, useTransition, useEffect } from 'react';

interface CopilotStatus {
  configured: boolean;
  connected: boolean;
  cliPath: string;
  state: string;
}

interface CopilotPromptResponse {
  success: boolean;
  sessionId?: string;
  response?: string;
  model?: string;
  error?: string;
}

interface CopilotDevPanelProps {
  onClose: () => void;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const panelStyle: React.CSSProperties = {
  position: 'absolute',
  top: '8px',
  right: '8px',
  width: '480px',
  maxHeight: '88vh',
  background: '#080f1a',
  border: '1px solid #1a3354',
  borderRadius: '12px',
  boxShadow: '0 12px 40px rgba(0,0,0,0.7)',
  display: 'flex',
  flexDirection: 'column',
  zIndex: 1000,
  color: '#cdd6f4',
  fontFamily: 'JetBrains Mono, Consolas, monospace',
  fontSize: '12px',
  overflow: 'hidden',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '10px 14px',
  background: 'linear-gradient(90deg, #0d1b2e 0%, #0a1628 100%)',
  borderBottom: '1px solid #1a3354',
  flexShrink: 0,
};

const tabBarStyle: React.CSSProperties = {
  display: 'flex',
  gap: '2px',
  padding: '6px 10px 0',
  background: '#080f1a',
  borderBottom: '1px solid #1a3354',
  flexShrink: 0,
};

const scrollBodyStyle: React.CSSProperties = {
  overflowY: 'auto',
  flex: 1,
};

const sectionStyle: React.CSSProperties = {
  padding: '12px 14px',
  borderBottom: '1px solid #111c2e',
};

const labelStyle: React.CSSProperties = {
  color: '#6272a4',
  fontSize: '10px',
  textTransform: 'uppercase',
  letterSpacing: '0.8px',
  marginBottom: '8px',
  display: 'block',
};

const btn = (color = '#1e6fb5', extra: React.CSSProperties = {}): React.CSSProperties => ({
  background: color,
  border: 'none',
  color: '#fff',
  borderRadius: '5px',
  padding: '4px 12px',
  cursor: 'pointer',
  fontSize: '11px',
  fontWeight: 600,
  letterSpacing: '0.3px',
  ...extra,
});

const inputStyle: React.CSSProperties = {
  background: '#050d18',
  border: '1px solid #1a3354',
  borderRadius: '5px',
  color: '#f8f8f2',
  padding: '5px 8px',
  fontSize: '12px',
  width: '100%',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
};

const outputStyle: React.CSSProperties = {
  background: '#050d18',
  border: '1px solid #1a3354',
  borderRadius: '6px',
  padding: '10px',
  minHeight: '70px',
  maxHeight: '180px',
  overflowY: 'auto',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  lineHeight: 1.5,
  color: '#8be9fd',
  fontSize: '11px',
  marginTop: '8px',
};

const dot = (ok: boolean): React.CSSProperties => ({
  display: 'inline-block',
  width: '7px',
  height: '7px',
  borderRadius: '50%',
  background: ok ? '#50fa7b' : '#ff5555',
  marginRight: '5px',
  flexShrink: 0,
});

type TabId = 'copilot' | 'jimbokit' | 'mcp' | 'sysinfo';

// ─── Component ────────────────────────────────────────────────────────────────

export function CopilotDevPanel({ onClose }: CopilotDevPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>('copilot');

  // Copilot state
  const [copilotStatus, setCopilotStatus] = useState<CopilotStatus | null>(null);
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState('gpt-4o');
  const [output, setOutput] = useState('');
  const [isPending, startTransition] = useTransition();

  // JimboKit state
  const [jimboWs, setJimboWs] = useState<'connecting' | 'open' | 'closed'>('closed');
  const [jimboApiOk, setJimboApiOk] = useState<boolean | null>(null);

  // MCP state
  const [mcpTools, setMcpTools] = useState<string[] | null>(null);
  const [mcpError, setMcpError] = useState('');

  // Sysinfo
  const [sysinfo, setSysinfo] = useState<Record<string, string>>({});

  const { electronAPI } = window;

  // ── JimboKit ping ──
  useEffect(() => {
    if (activeTab !== 'jimbokit') return;
    setJimboWs('connecting');
    let ws: WebSocket;
    try {
      ws = new WebSocket('ws://127.0.0.1:4111/ws');
      ws.onopen = () => setJimboWs('open');
      ws.onerror = () => setJimboWs('closed');
      ws.onclose = () => setJimboWs(prev => prev === 'open' ? 'closed' : prev);
    } catch {
      setJimboWs('closed');
    }
    // REST ping
    void fetch('http://127.0.0.1:4111/api/system/info', { signal: AbortSignal.timeout(2000) })
      .then(r => setJimboApiOk(r.ok))
      .catch(() => setJimboApiOk(false));

    return () => { try { ws?.close(); } catch { /* ignore */ } };
  }, [activeTab]);

  // ── MCP tools ──
  useEffect(() => {
    if (activeTab !== 'mcp') return;
    void (async () => {
      try {
        const tools = await electronAPI.mcp?.listTools();
        setMcpTools(tools ?? []);
        setMcpError('');
      } catch (e) {
        setMcpError(e instanceof Error ? e.message : String(e));
        setMcpTools([]);
      }
    })();
  }, [activeTab, electronAPI]);

  // ── Sysinfo ──
  useEffect(() => {
    if (activeTab !== 'sysinfo') return;
    setSysinfo({
      'Electron': window.navigator.userAgent.match(/Electron\/([\d.]+)/)?.[1] ?? '—',
      'Chrome': window.navigator.userAgent.match(/Chrome\/([\d.]+)/)?.[1] ?? '—',
      'User Agent': window.navigator.userAgent.slice(0, 80) + '…',
      'Viewport': `${window.innerWidth}×${window.innerHeight}`,
      'Memory (MB)': (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory
        ? ((performance as unknown as { memory: { usedJSHeapSize: number } }).memory.usedJSHeapSize / 1024 / 1024).toFixed(1)
        : '—',
    });
  }, [activeTab]);

  // ── Copilot actions ──
  const handleGetStatus = useCallback(() => {
    startTransition(() => {
      void (async () => {
        try {
          const s = await electronAPI.copilot.status();
          setCopilotStatus(s);
        } catch (e) {
          setOutput(`❌ status(): ${e instanceof Error ? e.message : String(e)}`);
        }
      })();
    });
  }, [electronAPI]);

  const handleStart = useCallback(() => {
    startTransition(() => {
      void (async () => {
        try {
          const s = await electronAPI.copilot.start();
          setCopilotStatus(s);
          setOutput(`✅ start() → state: ${s.state}`);
        } catch (e) {
          setOutput(`❌ start(): ${e instanceof Error ? e.message : String(e)}`);
        }
      })();
    });
  }, [electronAPI]);

  const handleRunPrompt = useCallback(() => {
    if (!prompt.trim()) return;
    setOutput('⏳ Wysyłanie...');
    startTransition(() => {
      void (async () => {
        try {
          const res: CopilotPromptResponse = await electronAPI.copilot.runPrompt({ prompt, model });
          if (res.success) {
            setOutput(`✅ Session: ${res.sessionId ?? '-'}\nModel: ${res.model ?? model}\n\n${res.response ?? '(brak odpowiedzi)'}`);
          } else {
            setOutput(`❌ ${res.error}`);
          }
        } catch (e) {
          setOutput(`❌ runPrompt(): ${e instanceof Error ? e.message : String(e)}`);
        }
      })();
    });
  }, [prompt, model, electronAPI]);

  // ── Tab button ──
  const tabBtn = (id: TabId, label: string) => (
    <button
      key={id}
      onClick={() => setActiveTab(id)}
      style={{
        background: activeTab === id ? '#1a3354' : 'transparent',
        border: 'none',
        borderBottom: activeTab === id ? '2px solid #bd93f9' : '2px solid transparent',
        color: activeTab === id ? '#f8f8f2' : '#6272a4',
        padding: '5px 12px',
        cursor: 'pointer',
        fontSize: '11px',
        fontWeight: 600,
        letterSpacing: '0.3px',
        borderRadius: '4px 4px 0 0',
        fontFamily: 'inherit',
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={panelStyle} role="dialog" aria-label="ZENO DevTools">
      {/* ── Header ── */}
      <div style={headerStyle}>
        <span style={{ fontWeight: 700, fontSize: '13px', color: '#bd93f9', display: 'flex', alignItems: 'center', gap: '6px' }}>
          ⚡ ZENO <span style={{ color: '#ff79c6' }}>DevTools</span>
        </span>
        <button onClick={onClose} style={btn('#44475a', { padding: '3px 10px', fontSize: '13px' })} aria-label="Zamknij">✕</button>
      </div>

      {/* ── Tab bar ── */}
      <div style={tabBarStyle}>
        {tabBtn('copilot', '🤖 Copilot')}
        {tabBtn('jimbokit', '🧩 JimboKit')}
        {tabBtn('mcp', '🔧 MCP')}
        {tabBtn('sysinfo', '💻 Sysinfo')}
      </div>

      {/* ── Body ── */}
      <div style={scrollBodyStyle}>

        {/* ── COPILOT TAB ── */}
        {activeTab === 'copilot' && (
          <>
            <div style={sectionStyle}>
              <span style={labelStyle}>Status SDK</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                {copilotStatus && (
                  <span style={{ display: 'flex', alignItems: 'center', color: copilotStatus.connected ? '#50fa7b' : '#ff5555' }}>
                    <span style={dot(copilotStatus.connected)} />
                    {copilotStatus.state}
                  </span>
                )}
              </div>
              {copilotStatus && (
                <div style={{ color: '#6272a4', fontSize: '11px', marginBottom: '8px', lineHeight: 1.7 }}>
                  <div>CLI: <span style={{ color: '#f1fa8c' }}>{copilotStatus.cliPath}</span></div>
                  <div>Configured: <span style={{ color: copilotStatus.configured ? '#50fa7b' : '#ff5555' }}>{String(copilotStatus.configured)}</span></div>
                </div>
              )}
              {copilotStatus && !copilotStatus.configured && copilotStatus.state.includes('error') && (
                <div style={{ background: 'rgba(255,85,85,0.1)', border: '1px solid rgba(255,85,85,0.3)', borderRadius: '6px', padding: '10px 12px', color: '#ff8888', fontSize: '11px', lineHeight: 1.6, marginBottom: '8px' }}>
                  <div style={{ fontWeight: 700, marginBottom: '4px' }}>❌ Copilot CLI nie znaleziony</div>
                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: '5px 8px', borderRadius: '4px', margin: '4px 0', fontFamily: 'monospace' }}>
                    npm install -g @github/copilot
                  </div>
                  <div style={{ fontSize: '10px', opacity: 0.7 }}>Lub ustaw zmienną COPILOT_CLI_PATH</div>
                </div>
              )}
              <div style={{ display: 'flex', gap: '6px' }}>
                <button style={btn()} onClick={handleGetStatus} disabled={isPending}>getStatus()</button>
                <button style={btn('#1e8b5a')} onClick={handleStart} disabled={isPending}>start()</button>
              </div>
            </div>

            <div style={{ ...sectionStyle, display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={labelStyle}>runPrompt()</span>
              <input value={model} onChange={e => setModel(e.target.value)} placeholder="model (np. gpt-4o)" style={{ ...inputStyle, color: '#f1fa8c' }} />
              <textarea
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                placeholder="Wpisz prompt... (Ctrl+Enter = wyślij)"
                rows={3}
                style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
                onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleRunPrompt(); }}
              />
              <button style={btn('#6272a4', { padding: '6px', width: '100%' })} onClick={handleRunPrompt} disabled={isPending || !prompt.trim()}>
                {isPending ? '⏳ Przetwarzanie...' : '▶ Wyślij (Ctrl+Enter)'}
              </button>
              <div style={outputStyle}>{output || <span style={{ color: '#44475a', fontStyle: 'italic' }}>Wynik pojawi się tutaj…</span>}</div>
            </div>
          </>
        )}

        {/* ── JIMBOKIT TAB ── */}
        {activeTab === 'jimbokit' && (
          <div style={sectionStyle}>
            <span style={labelStyle}>JimboKit Agent Server — port 4111</span>
            <div style={{ display: 'grid', gap: '6px', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={dot(jimboWs === 'open')} />
                <span style={{ color: '#f8f8f2' }}>WebSocket</span>
                <span style={{ color: jimboWs === 'open' ? '#50fa7b' : jimboWs === 'connecting' ? '#f1fa8c' : '#ff5555', marginLeft: 'auto' }}>
                  {jimboWs === 'open' ? 'połączony' : jimboWs === 'connecting' ? '…łączenie' : 'rozłączony'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={dot(jimboApiOk === true)} />
                <span style={{ color: '#f8f8f2' }}>REST API</span>
                <span style={{ color: jimboApiOk === true ? '#50fa7b' : jimboApiOk === false ? '#ff5555' : '#f1fa8c', marginLeft: 'auto' }}>
                  {jimboApiOk === true ? 'ok' : jimboApiOk === false ? 'niedostępne' : '…sprawdzanie'}
                </span>
              </div>
            </div>
            <div style={{ color: '#6272a4', fontSize: '11px', lineHeight: 1.7, background: '#050d18', padding: '8px 10px', borderRadius: '6px', border: '1px solid #1a3354' }}>
              <div>URL: <span style={{ color: '#8be9fd' }}>ws://127.0.0.1:4111/ws</span></div>
              <div>REST: <span style={{ color: '#8be9fd' }}>http://127.0.0.1:4111</span></div>
              <div style={{ marginTop: '6px', color: '#44475a' }}>Uruchom: <span style={{ fontFamily: 'monospace', color: '#f1fa8c' }}>cd JIMbo_kit && npm start</span></div>
            </div>
          </div>
        )}

        {/* ── MCP TAB ── */}
        {activeTab === 'mcp' && (
          <div style={sectionStyle}>
            <span style={labelStyle}>MCP Tools ({mcpTools?.length ?? '…'})</span>
            {mcpError && (
              <div style={{ color: '#ff5555', fontSize: '11px', marginBottom: '8px' }}>❌ {mcpError}</div>
            )}
            {!mcpTools && !mcpError && (
              <div style={{ color: '#6272a4', fontSize: '11px' }}>⏳ Ładowanie…</div>
            )}
            {mcpTools && mcpTools.length === 0 && !mcpError && (
              <div style={{ color: '#6272a4', fontSize: '11px' }}>Brak dostępnych narzędzi MCP</div>
            )}
            {mcpTools && mcpTools.length > 0 && (
              <div style={{ display: 'grid', gap: '4px', maxHeight: '320px', overflowY: 'auto' }}>
                {mcpTools.map(tool => (
                  <div key={tool} style={{ background: '#050d18', padding: '5px 8px', borderRadius: '5px', border: '1px solid #1a3354', color: '#50fa7b', fontSize: '11px', fontFamily: 'monospace' }}>
                    🔧 {tool}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── SYSINFO TAB ── */}
        {activeTab === 'sysinfo' && (
          <>
            <div style={sectionStyle}>
              <span style={labelStyle}>Środowisko</span>
              <div style={{ display: 'grid', gap: '5px' }}>
                {Object.entries(sysinfo).map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', fontSize: '11px', padding: '4px 6px', background: '#050d18', borderRadius: '4px', border: '1px solid #111c2e' }}>
                    <span style={{ color: '#6272a4' }}>{k}</span>
                    <span style={{ color: '#f8f8f2', textAlign: 'right', wordBreak: 'break-all' }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={sectionStyle}>
              <span style={labelStyle}>Quick Actions</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                <button style={btn('#1a3354')} onClick={() => window.location.reload()}>🔄 Reload UI</button>
                <button style={btn('#1a3354')} onClick={() => electronAPI.window?.minimize()}>🔽 Minimize</button>
                <button style={btn('#1a3354')} onClick={() => {
                  const info = Object.entries(sysinfo).map(([k, v]) => `${k}: ${v}`).join('\n');
                  void navigator.clipboard.writeText(info);
                }}>📋 Kopiuj info</button>
                <button style={btn('#44475a')} onClick={() => localStorage.clear()}>🗑 Clear localStorage</button>
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
