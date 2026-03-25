/**
 * Copilot Dev Panel — Dev UI for @github/copilot-sdk
 * Udostępnia: status, start, runPrompt przez IPC
 */

import { useState, useCallback, useTransition } from 'react';

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

const panelStyle: React.CSSProperties = {
  position: 'absolute',
  top: '8px',
  right: '8px',
  width: '460px',
  maxHeight: '85vh',
  background: '#0d1b2a',
  border: '1px solid #1e3a5f',
  borderRadius: '10px',
  boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
  display: 'flex',
  flexDirection: 'column',
  zIndex: 1000,
  color: '#e0e0e0',
  fontFamily: 'Consolas, monospace',
  fontSize: '13px',
  overflow: 'hidden',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '10px 14px',
  background: '#1a2f4a',
  borderBottom: '1px solid #1e3a5f',
};

const sectionStyle: React.CSSProperties = {
  padding: '12px 14px',
  borderBottom: '1px solid #1e3a5f',
};

const btnStyle = (color = '#1e6fb5'): React.CSSProperties => ({
  background: color,
  border: 'none',
  color: '#fff',
  borderRadius: '5px',
  padding: '5px 14px',
  cursor: 'pointer',
  fontSize: '12px',
  fontWeight: 600,
  letterSpacing: '0.3px',
  marginRight: '6px',
});

const statusDot = (connected: boolean): React.CSSProperties => ({
  display: 'inline-block',
  width: '8px',
  height: '8px',
  borderRadius: '50%',
  background: connected ? '#64ffda' : '#ff6b6b',
  marginRight: '6px',
});

const outputStyle: React.CSSProperties = {
  background: '#050d18',
  border: '1px solid #1e3a5f',
  borderRadius: '6px',
  padding: '10px',
  minHeight: '80px',
  maxHeight: '200px',
  overflowY: 'auto',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  lineHeight: 1.5,
  color: '#a8d8ea',
  fontSize: '12px',
  marginTop: '8px',
};

export function CopilotDevPanel({ onClose }: CopilotDevPanelProps) {
  const [status, setStatus] = useState<CopilotStatus | null>(null);
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState('gpt-4o');
  const [output, setOutput] = useState('');
  const [isPending, startTransition] = useTransition();

  const { electronAPI } = window;

  const handleGetStatus = useCallback(() => {
    startTransition(() => {
      void (async () => {
        try {
          const s = await (electronAPI.copilot as { status: () => Promise<CopilotStatus> }).status();
          setStatus(s);
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          setOutput(`❌ status(): ${msg}`);
        }
      })();
    });
  }, [electronAPI]);

  const handleStart = useCallback(() => {
    startTransition(() => {
      void (async () => {
        try {
          const s = await (electronAPI.copilot as { start: () => Promise<CopilotStatus> }).start();
          setStatus(s);
          setOutput(`✅ start() → state: ${s.state}`);
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          setOutput(`❌ start(): ${msg}`);
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
          const res = await (electronAPI.copilot as {
            runPrompt: (r: { prompt: string; model: string }) => Promise<CopilotPromptResponse>
          }).runPrompt({ prompt, model });

          if (res.success) {
            setOutput(
              `✅ Session: ${res.sessionId ?? '-'}\nModel: ${res.model ?? model}\n\n${res.response ?? '(brak odpowiedzi)'}`
            );
          } else {
            setOutput(`❌ ${res.error}`);
          }
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          setOutput(`❌ runPrompt(): ${msg}`);
        }
      })();
    });
  }, [prompt, model, electronAPI]);

  return (
    <div style={panelStyle} role="dialog" aria-label="Copilot Dev Panel">
      {/* Header */}
      <div style={headerStyle}>
        <span style={{ fontWeight: 700, fontSize: '14px', color: '#64ffda' }}>
          🤖 Copilot Dev Panel
        </span>
        <button
          onClick={onClose}
          style={{ ...btnStyle('#c0392b'), marginRight: 0, padding: '3px 10px', fontSize: '14px' }}
          title="Zamknij"
          aria-label="Zamknij panel"
        >
          ✕
        </button>
      </div>

      {/* Status sekcja */}
      <div style={sectionStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <span style={{ color: '#8892b0', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Status SDK
          </span>
          {status && (
            <span style={{ display: 'flex', alignItems: 'center' }}>
              <span style={statusDot(status.connected)} />
              <span style={{ color: status.connected ? '#64ffda' : '#ff6b6b' }}>
                {status.state}
              </span>
            </span>
          )}
        </div>

        {status && (
          <div style={{ color: '#8892b0', fontSize: '11px', marginBottom: '8px', lineHeight: 1.6 }}>
            <div>CLI: <span style={{ color: '#ffe57f' }}>{status.cliPath}</span></div>
            <div>Configured: <span style={{ color: status.configured ? '#64ffda' : '#ff6b6b' }}>{String(status.configured)}</span></div>
          </div>
        )}

        <div>
          <button style={btnStyle()} onClick={handleGetStatus} disabled={isPending}>
            getStatus()
          </button>
          <button style={btnStyle('#1e8b5a')} onClick={handleStart} disabled={isPending}>
            start()
          </button>
        </div>
      </div>

      {/* runPrompt sekcja */}
      <div style={{ ...sectionStyle, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <span style={{ color: '#8892b0', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', display: 'block' }}>
          runPrompt()
        </span>

        <input
          value={model}
          onChange={e => setModel(e.target.value)}
          placeholder="model (np. gpt-4o)"
          style={{
            background: '#050d18',
            border: '1px solid #1e3a5f',
            borderRadius: '5px',
            color: '#ffe57f',
            padding: '4px 8px',
            fontSize: '12px',
            marginBottom: '6px',
            width: '100%',
            boxSizing: 'border-box',
          }}
        />

        <textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder="Wpisz prompt..."
          rows={3}
          style={{
            background: '#050d18',
            border: '1px solid #1e3a5f',
            borderRadius: '5px',
            color: '#e0e0e0',
            padding: '6px 8px',
            fontSize: '12px',
            resize: 'vertical',
            marginBottom: '8px',
            width: '100%',
            boxSizing: 'border-box',
          }}
          onKeyDown={e => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleRunPrompt();
          }}
        />

        <button
          style={{ ...btnStyle('#5a2d8b'), width: '100%', padding: '7px' }}
          onClick={handleRunPrompt}
          disabled={isPending || !prompt.trim()}
        >
          {isPending ? '⏳ Przetwarzanie...' : '▶ Wyślij (Ctrl+Enter)'}
        </button>

        <div style={outputStyle}>
          {output || <span style={{ color: '#4a6c8a', fontStyle: 'italic' }}>Wynik pojawi się tutaj...</span>}
        </div>
      </div>
    </div>
  );
}
