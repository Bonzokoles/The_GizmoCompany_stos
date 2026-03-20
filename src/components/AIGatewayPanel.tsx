/**
 * AI Gateway Panel — Zarządzanie dostawcami AI, metryki, chat
 * Panel pokazuje status providerów, cache, metryki i pozwala na chat z AI
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import type { AIProvider, AIMetrics } from '../types/electron';

interface AIGatewayPanelProps {
  onClose: () => void;
}

type GatewayTab = 'chat' | 'providers' | 'metrics';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  provider?: string;
  latency?: number;
  cost?: number;
  cached?: boolean;
}

const api = () => (window as any).electronAPI;

export function AIGatewayPanel({ onClose }: AIGatewayPanelProps) {
  const [activeTab, setActiveTab] = useState<GatewayTab>('chat');
  const [providers, setProviders] = useState<AIProvider[]>([]);
  const [metrics, setMetrics] = useState<AIMetrics | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'sys-1',
      role: 'system',
      content: 'AI Gateway aktywny. Dostępni dostawcy: DeepSeek, OpenRouter, EdenAI. Wpisz wiadomość aby rozpocząć.',
      timestamp: Date.now(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedModel, setSelectedModel] = useState('');
  const [temperature, setTemperature] = useState(0.7);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load providers on mount
  useEffect(() => {
    loadProviders();
  }, []);

  const loadProviders = useCallback(async () => {
    try {
      const result = await api()?.ai?.getProviders?.();
      if (Array.isArray(result)) {
        setProviders(result);
      }
    } catch (e) {
      console.warn('Nie można załadować dostawców AI:', e);
    }
  }, []);

  const loadMetrics = useCallback(async () => {
    try {
      const result = await api()?.ai?.getMetrics?.();
      if (result) {
        setMetrics(result);
      }
    } catch (e) {
      console.warn('Nie można załadować metryk:', e);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'metrics') loadMetrics();
    if (activeTab === 'providers') loadProviders();
  }, [activeTab, loadMetrics, loadProviders]);

  // Auto-refresh metrics every 10s
  useEffect(() => {
    if (activeTab !== 'metrics') return;
    const interval = setInterval(loadMetrics, 10000);
    return () => clearInterval(interval);
  }, [activeTab, loadMetrics]);

  const handleSendMessage = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isProcessing) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsProcessing(true);

    try {
      const result = await api()?.ai?.execute?.({
        prompt: trimmed,
        model: selectedModel || undefined,
        temperature,
        maxTokens: 4096,
      });

      const assistantMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: result?.success
          ? result.data?.content ?? 'Brak odpowiedzi'
          : `Błąd: ${result?.error ?? 'Nieznany błąd'}`,
        timestamp: Date.now(),
        provider: result?.data?.provider,
        latency: result?.data?.latency,
        cost: result?.data?.cost,
        cached: result?.data?.cached,
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Błąd połączenia z AI Gateway';
      setMessages(prev => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: `❌ ${msg}`,
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsProcessing(false);
    }
  }, [input, isProcessing, selectedModel, temperature]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    },
    [handleSendMessage]
  );

  const clearChat = useCallback(() => {
    setMessages([
      {
        id: `sys-${Date.now()}`,
        role: 'system',
        content: 'Chat wyczyszczony. Rozpocznij nową rozmowę.',
        timestamp: Date.now(),
      },
    ]);
  }, []);

  return (
    <div style={panelStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <span style={{ fontSize: '14px', fontWeight: 600 }}>🧠 AI Gateway</span>
        <div style={{ display: 'flex', gap: '4px' }}>
          {(['chat', 'providers', 'metrics'] as GatewayTab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                ...tabBtnStyle,
                background: activeTab === tab ? '#3b82f6' : 'transparent',
                color: activeTab === tab ? '#fff' : '#94a3b8',
              }}
            >
              {tab === 'chat' ? '💬 Chat' : tab === 'providers' ? '🔌 Dostawcy' : '📊 Metryki'}
            </button>
          ))}
        </div>
        <button onClick={onClose} style={closeBtnStyle}>✕</button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {activeTab === 'chat' && (
          <ChatTab
            messages={messages}
            input={input}
            setInput={setInput}
            isProcessing={isProcessing}
            selectedModel={selectedModel}
            setSelectedModel={setSelectedModel}
            temperature={temperature}
            setTemperature={setTemperature}
            onSend={handleSendMessage}
            onKeyDown={handleKeyDown}
            onClear={clearChat}
            chatEndRef={chatEndRef}
          />
        )}
        {activeTab === 'providers' && (
          <ProvidersTab providers={providers} onRefresh={loadProviders} />
        )}
        {activeTab === 'metrics' && (
          <MetricsTab metrics={metrics} onRefresh={loadMetrics} />
        )}
      </div>
    </div>
  );
}

// ── Chat Tab ───────────────────────────────────────────────────

function ChatTab({
  messages,
  input,
  setInput,
  isProcessing,
  selectedModel,
  setSelectedModel,
  temperature,
  setTemperature,
  onSend,
  onKeyDown,
  onClear,
  chatEndRef,
}: {
  messages: ChatMessage[];
  input: string;
  setInput: (v: string) => void;
  isProcessing: boolean;
  selectedModel: string;
  setSelectedModel: (v: string) => void;
  temperature: number;
  setTemperature: (v: number) => void;
  onSend: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onClear: () => void;
  chatEndRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <>
      {/* Model selector bar */}
      <div style={modelBarStyle}>
        <select
          value={selectedModel}
          onChange={e => setSelectedModel(e.target.value)}
          style={selectStyle}
        >
          <option value="">Auto (najwyższy priorytet)</option>
          <option value="deepseek-chat">DeepSeek Chat</option>
          <option value="deepseek-coder">DeepSeek Coder</option>
          <option value="anthropic/claude-3-opus">Claude 3 Opus</option>
          <option value="openai/gpt-4-turbo">GPT-4 Turbo</option>
        </select>
        <label style={{ fontSize: '11px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
          Temp: {temperature.toFixed(1)}
          <input
            type="range"
            min="0"
            max="2"
            step="0.1"
            value={temperature}
            onChange={e => setTemperature(parseFloat(e.target.value))}
            style={{ width: '60px', accentColor: '#3b82f6' }}
          />
        </label>
        <button onClick={onClear} style={{ ...smallBtnStyle, color: '#ef4444' }} title="Wyczyść chat">
          🗑
        </button>
      </div>

      {/* Messages */}
      <div style={messagesContainerStyle}>
        {messages.map(msg => (
          <div
            key={msg.id}
            style={{
              ...messageBubbleStyle,
              alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
              background:
                msg.role === 'user'
                  ? '#1e40af'
                  : msg.role === 'system'
                    ? '#1e293b'
                    : '#0f172a',
              borderLeft: msg.role === 'assistant' ? '3px solid #3b82f6' : 'none',
              maxWidth: msg.role === 'system' ? '100%' : '85%',
            }}
          >
            <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '4px' }}>
              {msg.role === 'user' ? '👤 Ty' : msg.role === 'system' ? '⚙️ System' : '🤖 AI'}
              {msg.provider && <span> · {msg.provider}</span>}
              {msg.latency != null && <span> · {msg.latency}ms</span>}
              {msg.cached && <span> · 📦 cache</span>}
              {msg.cost != null && msg.cost > 0 && <span> · ${msg.cost.toFixed(4)}</span>}
            </div>
            <div style={{ whiteSpace: 'pre-wrap', fontSize: '13px', lineHeight: 1.5 }}>
              {msg.content}
            </div>
          </div>
        ))}
        {isProcessing && (
          <div style={{ ...messageBubbleStyle, alignSelf: 'flex-start', background: '#0f172a', borderLeft: '3px solid #3b82f6' }}>
            <span style={{ color: '#64748b', fontSize: '13px' }}>⏳ Przetwarzanie...</span>
          </div>
        )}
        <div ref={chatEndRef as React.LegacyRef<HTMLDivElement>} />
      </div>

      {/* Input */}
      <div style={inputBarStyle}>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Wpisz zapytanie... (Enter = wyślij, Shift+Enter = nowa linia)"
          disabled={isProcessing}
          style={textareaStyle}
          rows={2}
        />
        <button
          onClick={onSend}
          disabled={isProcessing || !input.trim()}
          style={{
            ...sendBtnStyle,
            opacity: isProcessing || !input.trim() ? 0.5 : 1,
          }}
        >
          ▶
        </button>
      </div>
    </>
  );
}

// ── Providers Tab ──────────────────────────────────────────────

function ProvidersTab({
  providers,
  onRefresh,
}: {
  providers: AIProvider[];
  onRefresh: () => void;
}) {
  return (
    <div style={{ padding: '12px', overflow: 'auto', flex: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
        <span style={{ fontSize: '13px', fontWeight: 600, color: '#e2e8f0' }}>
          Dostawcy AI ({providers.length})
        </span>
        <button onClick={onRefresh} style={smallBtnStyle}>🔄 Odśwież</button>
      </div>

      {providers.length === 0 ? (
        <div style={{ color: '#64748b', fontSize: '12px', textAlign: 'center', padding: '24px' }}>
          Brak dostępnych dostawców. Sprawdź konfigurację AI Gateway.
          <br />
          <button onClick={onRefresh} style={{ ...smallBtnStyle, marginTop: '8px' }}>
            Spróbuj ponownie
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {providers.map(p => (
            <div key={p.name} style={providerCardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, color: '#e2e8f0', fontSize: '13px' }}>
                  {p.displayName}
                </span>
                <span style={{
                  fontSize: '11px',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  background: p.enabled ? '#065f46' : '#7f1d1d',
                  color: p.enabled ? '#6ee7b7' : '#fca5a5',
                }}>
                  {p.enabled ? '● Online' : '○ Offline'}
                </span>
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                Priorytet: #{p.priority} · Modele: {p.models?.join(', ') || 'N/A'}
              </div>
              {p.capabilities && (
                <div style={{ display: 'flex', gap: '4px', marginTop: '6px', flexWrap: 'wrap' }}>
                  {p.capabilities.map(cap => (
                    <span key={cap} style={capBadgeStyle}>{cap}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Metrics Tab ────────────────────────────────────────────────

function MetricsTab({
  metrics,
  onRefresh,
}: {
  metrics: AIMetrics | null;
  onRefresh: () => void;
}) {
  return (
    <div style={{ padding: '12px', overflow: 'auto', flex: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
        <span style={{ fontSize: '13px', fontWeight: 600, color: '#e2e8f0' }}>
          Metryki AI Gateway
        </span>
        <button onClick={onRefresh} style={smallBtnStyle}>🔄 Odśwież</button>
      </div>

      {!metrics ? (
        <div style={{ color: '#64748b', fontSize: '12px', textAlign: 'center', padding: '24px' }}>
          Brak danych metryk. Gateway może nie być jeszcze podłączony.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <MetricCard label="Zapytania" value={String(metrics.totalRequests)} icon="📨" />
          <MetricCard label="Cache hits" value={String(metrics.cacheHits ?? 0)} icon="📦" />
          <MetricCard label="Avg latency" value={`${(metrics.avgLatency ?? 0).toFixed(0)}ms`} icon="⚡" />
          <MetricCard label="Koszt total" value={`$${(metrics.totalCost ?? 0).toFixed(4)}`} icon="💰" />
          <MetricCard label="Cache size" value={String(metrics.cacheSize ?? 0)} icon="🗂" />
          <MetricCard
            label="Dostawcy aktywni"
            value={String(metrics.providers?.filter(p => p.enabled).length ?? 0)}
            icon="🔌"
          />
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div style={metricCardStyle}>
      <div style={{ fontSize: '20px' }}>{icon}</div>
      <div>
        <div style={{ fontSize: '18px', fontWeight: 700, color: '#e2e8f0' }}>{value}</div>
        <div style={{ fontSize: '11px', color: '#64748b' }}>{label}</div>
      </div>
    </div>
  );
}

// ── Styles ─────────────────────────────────────────────────────

const panelStyle: React.CSSProperties = {
  position: 'absolute',
  top: '8px',
  right: '8px',
  width: '480px',
  height: 'calc(100% - 16px)',
  background: '#0f172a',
  border: '1px solid #1e293b',
  borderRadius: '12px',
  zIndex: 1000,
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
  fontFamily: 'system-ui, -apple-system, sans-serif',
  color: '#e2e8f0',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '8px 12px',
  borderBottom: '1px solid #1e293b',
  background: '#1e293b',
  borderRadius: '12px 12px 0 0',
  gap: '8px',
};

const tabBtnStyle: React.CSSProperties = {
  border: 'none',
  padding: '4px 10px',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '11px',
  fontWeight: 500,
};

const closeBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#94a3b8',
  cursor: 'pointer',
  fontSize: '16px',
  padding: '2px 6px',
};

const modelBarStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '6px 12px',
  borderBottom: '1px solid #1e293b',
  background: '#0c1222',
};

const selectStyle: React.CSSProperties = {
  flex: 1,
  background: '#1e293b',
  border: '1px solid #334155',
  color: '#e2e8f0',
  padding: '4px 8px',
  borderRadius: '6px',
  fontSize: '11px',
};

const messagesContainerStyle: React.CSSProperties = {
  flex: 1,
  overflow: 'auto',
  padding: '12px',
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
};

const messageBubbleStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderRadius: '8px',
  color: '#e2e8f0',
  wordBreak: 'break-word',
};

const inputBarStyle: React.CSSProperties = {
  display: 'flex',
  gap: '8px',
  padding: '8px 12px',
  borderTop: '1px solid #1e293b',
  background: '#0c1222',
  borderRadius: '0 0 12px 12px',
};

const textareaStyle: React.CSSProperties = {
  flex: 1,
  background: '#1e293b',
  border: '1px solid #334155',
  color: '#e2e8f0',
  padding: '8px 12px',
  borderRadius: '8px',
  fontSize: '13px',
  resize: 'none',
  fontFamily: 'inherit',
  outline: 'none',
};

const sendBtnStyle: React.CSSProperties = {
  background: '#3b82f6',
  border: 'none',
  color: '#fff',
  padding: '8px 16px',
  borderRadius: '8px',
  cursor: 'pointer',
  fontSize: '16px',
  fontWeight: 600,
  alignSelf: 'flex-end',
};

const smallBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid #334155',
  color: '#94a3b8',
  padding: '2px 8px',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '11px',
};

const providerCardStyle: React.CSSProperties = {
  background: '#1e293b',
  border: '1px solid #334155',
  borderRadius: '8px',
  padding: '10px 12px',
};

const capBadgeStyle: React.CSSProperties = {
  fontSize: '10px',
  padding: '1px 6px',
  borderRadius: '10px',
  background: '#1e3a5f',
  color: '#93c5fd',
};

const metricCardStyle: React.CSSProperties = {
  background: '#1e293b',
  border: '1px solid #334155',
  borderRadius: '8px',
  padding: '12px',
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
};
