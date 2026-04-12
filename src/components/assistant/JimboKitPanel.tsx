/**
 * JimboKitPanel
 *
 * Full-featured agent assistance panel for ZENO Browser.
 * Inspired by openbotx web client architecture.
 *
 * Features:
 *  ─ Chat tab: streaming messages, tool_use indicators, thinking blocks
 *  ─ Terminal tab: agent-controlled page functions
 *  ─ Sessions sidebar: manage conversation history
 *  ─ Dark ZENO theme throughout
 *  ─ WebSocket streaming with REST fallback
 *
 * Usage: Render inside <CopilotKit> wrapper (BrowserUI context).
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { JimboKitTerminal } from './JimboKitTerminal';
import {
  useJimboKitStore,
  type ContentBlock,
  type JimboMessage,
} from '../../hooks/useJimboKitStore';
import '../../styles/jimbokit.css';

// ─── Types ─────────────────────────────────────────────────────────────────────

type Tab = 'chat' | 'terminal' | 'settings';

interface JimboKitPanelProps {
  /** Called to navigate the browser */
  onNavigate?: (url: string) => void;
  onNewTab?: () => void;
  onBack?: () => void;
  onForward?: () => void;
  onReload?: () => void;
  currentUrl?: string;
  /** Whether the panel floats (true) or is embedded (false, default) */
  floating?: boolean;
  onClose?: () => void;
}

// ─── Markdown-lite renderer (no external deps) ────────────────────────────────

function renderText(text: string): React.ReactNode[] {
  // Split on code fences first, then inline code, then newlines
  const lines = text.split('\n');
  return lines.map((line, i) => (
    <React.Fragment key={i}>
      {i > 0 && <br />}
      {line}
    </React.Fragment>
  ));
}

// ─── Sub-components ────────────────────────────────────────────────────────────

const TypingDots: React.FC = () => (
  <div className="jk-typing">
    <span /><span /><span />
    <small>Przetwarzanie…</small>
  </div>
);

const ToolBadge: React.FC<{ name: string; description?: string; spinning?: boolean }> = ({
  name,
  description,
  spinning,
}) => (
  <div className="jk-tool-badge">
    <span className={`jk-tool-icon ${spinning ? 'jk-spin' : ''}`}>⚙</span>
    <span className="jk-tool-name">{name}</span>
    {description && <span className="jk-tool-desc">{description}</span>}
  </div>
);

const ThinkingBlock: React.FC<{ text: string }> = ({ text }) => (
  <details className="jk-thinking">
    <summary>💭 Rozumowanie agenta</summary>
    <pre className="jk-thinking-text">{text}</pre>
  </details>
);

function isLastToolUse(content: ContentBlock[], index: number): boolean {
  for (let i = content.length - 1; i >= 0; i--) {
    if (content[i].type === 'tool_use') return i === index;
  }
  return false;
}

const MessageBubble: React.FC<{
  msg: JimboMessage;
  isLive?: boolean;
  toolRunning?: boolean;
}> = ({ msg, isLive, toolRunning }) => {
  const isUser = msg.role === 'user';
  const contentBlocks: ContentBlock[] = Array.isArray(msg.content)
    ? msg.content
    : [{ type: 'text', text: msg.content as string }];

  return (
    <div className={`jk-msg jk-msg--${msg.role}`}>
      <div className="jk-msg-avatar">
        {isUser ? '👤' : '🤖'}
      </div>
      <div className="jk-msg-body">
        {msg.agent_name && (
          <div className="jk-agent-label">👤 {msg.agent_name} Agent</div>
        )}
        {contentBlocks.map((block, k) => {
          if (block.type === 'text' && block.text) {
            return (
              <div key={k} className="jk-msg-text">
                {renderText(block.text)}
              </div>
            );
          }
          if (block.type === 'thinking') {
            return <ThinkingBlock key={k} text={block.text} />;
          }
          if (block.type === 'tool_use') {
            const spinning = isLive && toolRunning && isLastToolUse(contentBlocks, k);
            return (
              <ToolBadge
                key={k}
                name={block.name}
                description={block.description}
                spinning={spinning}
              />
            );
          }
          return null;
        })}
        {isLive && <TypingDots />}
      </div>
    </div>
  );
};

const SessionItem: React.FC<{
  label: string;
  sessionKey: string;
  active: boolean;
  onSelect: () => void;
  onDelete: () => void;
}> = ({ label, active, onSelect, onDelete }) => (
  <div
    className={`jk-session-item ${active ? 'jk-session-item--active' : ''}`}
    onClick={onSelect}
  >
    <span className="jk-session-label">💬 {label}</span>
    <button
      className="jk-session-delete"
      onClick={(e) => { e.stopPropagation(); onDelete(); }}
      title="Usuń sesję"
    >
      ✕
    </button>
  </div>
);

// ─── Popular OpenRouter models ────────────────────────────────────────────────

const POPULAR_MODELS = [
  { label: '── Płatne (OpenAI) ──', value: '', disabled: true },
  { label: 'GPT-4o mini  💰tani ⚡szybki', value: 'openai/gpt-4o-mini' },
  { label: 'GPT-4o', value: 'openai/gpt-4o' },
  { label: 'GPT-4.1 mini', value: 'openai/gpt-4.1-mini' },
  { label: '── Płatne (Anthropic) ──', value: '', disabled: true },
  { label: 'Claude 3.5 Haiku  💰tani', value: 'anthropic/claude-3-5-haiku' },
  { label: 'Claude 3.7 Sonnet', value: 'anthropic/claude-3.7-sonnet' },
  { label: '── Płatne (Google) ──', value: '', disabled: true },
  { label: 'Gemini 2.0 Flash  💰tani ⚡szybki', value: 'google/gemini-2.0-flash-001' },
  { label: 'Gemini 2.5 Pro', value: 'google/gemini-2.5-pro-preview-03-25' },
  { label: '── Darmowe ──', value: '', disabled: true },
  { label: 'Qwen 3.6-plus :free', value: 'qwen/qwen3.6-plus:free' },
  { label: 'DeepSeek Chat V3 :free', value: 'deepseek/deepseek-chat-v3-0324:free' },
  { label: 'Gemma 3 12B :free', value: 'google/gemma-3-12b-it:free' },
  { label: 'Llama 3.3 70B :free', value: 'meta-llama/llama-3.3-70b-instruct:free' },
];

const API_BASE_SETTINGS = 'http://localhost:4111';

const ModelSettings: React.FC = () => {
  const [chatModel, setChatModel]     = useState('');
  const [toolModel, setToolModel]     = useState('');
  const [customChat, setCustomChat]   = useState('');
  const [customTool, setCustomTool]   = useState('');
  const [status, setStatus]           = useState<'idle' | 'saving' | 'ok' | 'err'>('idle');
  const [statusMsg, setStatusMsg]     = useState('');

  // Załaduj aktualny config
  useEffect(() => {
    fetch(`${API_BASE_SETTINGS}/api/config`)
      .then(r => r.json() as Promise<{ model: string; toolModel: string }>)
      .then(cfg => {
        setChatModel(cfg.model);
        setToolModel(cfg.toolModel);
      })
      .catch(() => {});
  }, []);

  const effectiveChatModel = chatModel === '__custom__' ? customChat : chatModel;
  const effectiveToolModel = toolModel === '__custom__' ? customTool : toolModel;

  async function handleSave() {
    setStatus('saving');
    try {
      const r = await fetch(`${API_BASE_SETTINGS}/api/config`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ model: effectiveChatModel, toolModel: effectiveToolModel }),
      });
      const data = await r.json() as { ok?: boolean; model?: string; toolModel?: string };
      if (data.ok) {
        setStatus('ok');
        setStatusMsg(`✅ Zapisano: ${data.model} / ${data.toolModel}`);
      } else {
        setStatus('err');
        setStatusMsg('❌ Błąd zapisu');
      }
    } catch {
      setStatus('err');
      setStatusMsg('❌ Brak połączenia z serwerem');
    }
    setTimeout(() => setStatus('idle'), 3000);
  }

  return (
    <div className="jk-settings">
      <div className="jk-settings-section">
        <h3 className="jk-settings-title">⚙ Konfiguracja modeli</h3>
        <p className="jk-settings-info">
          OpenRouter obsługuje wiele modeli jednocześnie — każde zapytanie wskazuje swój model.
          BUCH może używać innego modelu niezależnie.
        </p>
      </div>

      <div className="jk-settings-section">
        <label className="jk-settings-label">💬 Model odpowiedzi (streaming)</label>
        <select
          className="jk-settings-select"
          value={chatModel}
          onChange={e => setChatModel(e.target.value)}
        >
          {POPULAR_MODELS.map((m, i) => (
            <option key={i} value={m.value} disabled={m.disabled}>
              {m.label}
            </option>
          ))}
          <option value="__custom__">✏ Własny model…</option>
        </select>
        {chatModel === '__custom__' && (
          <input
            className="jk-settings-input"
            placeholder="np. openai/gpt-4o-mini"
            value={customChat}
            onChange={e => setCustomChat(e.target.value)}
          />
        )}
        {chatModel && chatModel !== '__custom__' && (
          <div className="jk-settings-current">Aktywny: <code>{chatModel}</code></div>
        )}
      </div>

      <div className="jk-settings-section">
        <label className="jk-settings-label">🔧 Model tool-use (function calling)</label>
        <select
          className="jk-settings-select"
          value={toolModel}
          onChange={e => setToolModel(e.target.value)}
        >
          {POPULAR_MODELS.map((m, i) => (
            <option key={i} value={m.value} disabled={m.disabled}>
              {m.label}
            </option>
          ))}
          <option value="__custom__">✏ Własny model…</option>
        </select>
        {toolModel === '__custom__' && (
          <input
            className="jk-settings-input"
            placeholder="np. openai/gpt-4o-mini"
            value={customTool}
            onChange={e => setCustomTool(e.target.value)}
          />
        )}
        {toolModel && toolModel !== '__custom__' && (
          <div className="jk-settings-current">Aktywny: <code>{toolModel}</code></div>
        )}
      </div>

      <div className="jk-settings-section">
        <button
          className="jk-btn jk-btn--primary"
          onClick={() => void handleSave()}
          disabled={status === 'saving'}
        >
          {status === 'saving' ? '⏳ Zapisuję…' : '💾 Zastosuj (bez restartu)'}
        </button>
        {statusMsg && (
          <div className={`jk-settings-status jk-settings-status--${status}`}>
            {statusMsg}
          </div>
        )}
      </div>

      <div className="jk-settings-section jk-settings-note">
        <strong>OpenRouter — równoległe modele:</strong>
        <ul>
          <li>✅ Każde zapytanie wysyła swój <code>model</code> — pełna izolacja</li>
          <li>✅ BUCH może używać np. Claude 3.5, JIMBO GPT-4o-mini — działają niezależnie</li>
          <li>✅ Ten sam klucz API <code>OPENROUTER_API_KEY</code> obsługuje wszystkie</li>
          <li>⚠ Zmiana modelu działa natychmiast — nowe wiadomości używają nowego modelu</li>
        </ul>
      </div>
    </div>
  );
};

// ─── Main Panel ────────────────────────────────────────────────────────────────

export const JimboKitPanel: React.FC<JimboKitPanelProps> = ({
  onNavigate,
  onNewTab,
  onBack,
  onForward,
  onReload,
  currentUrl = '',
  floating = false,
  onClose,
}) => {
  const store = useJimboKitStore();
  const [activeTab, setActiveTab] = useState<Tab>('chat');
  const [inputText, setInputText] = useState('');
  const [showSessions, setShowSessions] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom on new messages / live update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [store.messages.length, store.live?.content.length]);

  // Handle /clear command — when terminal adds marker, reset log
  useEffect(() => {
    const lastEntry = store.terminalLog[store.terminalLog.length - 1];
    if (lastEntry?.command === '/clear') {
      store.clearTerminalLog();
    }
  }, [store.terminalLog, store.clearTerminalLog]);

  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text) return;
    setInputText('');
    await store.sendMessage(text);
  }, [inputText, store]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend().catch(console.error);
    }
  }

  async function handleDeleteSession(key: string) {
    setDeleteConfirm(null);
    await store.deleteSession(key);
  }

  return (
    <div className={`jk-panel ${floating ? 'jk-panel--floating' : ''}`}>
      {/* ── Header ── */}
      <div className="jk-header">
        <div className="jk-header-left">
          <button
            className="jk-icon-btn"
            title="Sesje"
            onClick={() => setShowSessions((v) => !v)}
          >
            ☰
          </button>
          <span className="jk-header-title">Jimbo_kit</span>
          <span
            className={`jk-conn-dot ${store.isConnected ? 'jk-conn-dot--on' : 'jk-conn-dot--off'}`}
            title={store.isConnected ? 'WebSocket połączony' : 'REST fallback'}
          />
        </div>
        <div className="jk-header-right">
          <button
            className={`jk-tab-btn ${activeTab === 'chat' ? 'jk-tab-btn--active' : ''}`}
            onClick={() => setActiveTab('chat')}
          >
            💬 Chat
          </button>
          <button
            className={`jk-tab-btn ${activeTab === 'terminal' ? 'jk-tab-btn--active' : ''}`}
            onClick={() => setActiveTab('terminal')}
          >
            ⌨ Terminal
          </button>
          <button
            className={`jk-tab-btn ${activeTab === 'settings' ? 'jk-tab-btn--active' : ''}`}
            onClick={() => setActiveTab('settings')}
            title="Ustawienia modeli"
          >
            ⚙ Modele
          </button>
          {onClose && (
            <button className="jk-icon-btn" onClick={onClose} title="Zamknij">
              ✕
            </button>
          )}
        </div>
      </div>

      <div className="jk-body">
        {/* ── Sessions sidebar ── */}
        {showSessions && (
          <div className="jk-sessions">
            <div className="jk-sessions-header">
              <span>Sesje</span>
              <button className="jk-icon-btn" onClick={() => store.newSession()} title="Nowa sesja">
                ＋
              </button>
            </div>
            {store.sessions.length === 0 && (
              <div className="jk-sessions-empty">Brak zapisanych sesji</div>
            )}
            {store.sessions.map((s) => (
              <SessionItem
                key={s.key}
                label={s.label}
                sessionKey={s.key}
                active={s.key === store.currentSessionId}
                onSelect={() => {
                  store.switchSession(s.key).catch(console.error);
                  setShowSessions(false);
                }}
                onDelete={() => setDeleteConfirm(s.key)}
              />
            ))}
          </div>
        )}

        {/* ── Content area ── */}
        <div className="jk-content">
          {activeTab === 'chat' && (
            <>
              <div className="jk-messages">
                {store.messages.length === 0 && !store.live && (
                  <div className="jk-empty-state">
                    <div className="jk-empty-icon">🤖</div>
                    <div>Wyślij wiadomość aby rozpocząć rozmowę z Jimbo_kit</div>
                  </div>
                )}
                {store.messages.map((msg, i) => (
                  <MessageBubble key={i} msg={msg} />
                ))}
                {store.live && (
                  <MessageBubble
                    msg={{ ...store.live, role: 'assistant', timestamp: Date.now() }}
                    isLive
                    toolRunning={store.live.toolRunning}
                  />
                )}
                <div ref={messagesEndRef} />
              </div>
              <div className="jk-input-area">
                <textarea
                  ref={textareaRef}
                  className="jk-input"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Napisz do Jimbo_kit… (Enter = wyślij, Shift+Enter = nowa linia)"
                  rows={2}
                />
                <button
                  className="jk-send-btn"
                  onClick={() => handleSend().catch(console.error)}
                  disabled={!inputText.trim()}
                  title="Wyślij"
                >
                  ➤
                </button>
              </div>
            </>
          )}

          {activeTab === 'terminal' && (
            <JimboKitTerminal
              log={store.terminalLog}
              addEntry={store.addTerminalEntry}
              updateEntry={store.updateTerminalEntry}
              onNavigate={onNavigate}
              onNewTab={onNewTab}
              onBack={onBack}
              onForward={onForward}
              onReload={onReload}
              currentUrl={currentUrl}
            />
          )}

          {activeTab === 'settings' && <ModelSettings />}
        </div>
      </div>

      {/* ── Delete confirm dialog ── */}
      {deleteConfirm && (
        <div className="jk-overlay">
          <div className="jk-dialog">
            <div className="jk-dialog-title">Usuń sesję</div>
            <div className="jk-dialog-text">
              Na pewno chcesz usunąć tę sesję? Tej operacji nie można cofnąć.
            </div>
            <div className="jk-dialog-actions">
              <button
                className="jk-btn jk-btn--secondary"
                onClick={() => setDeleteConfirm(null)}
              >
                Anuluj
              </button>
              <button
                className="jk-btn jk-btn--danger"
                onClick={() => handleDeleteSession(deleteConfirm).catch(console.error)}
              >
                Usuń
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
