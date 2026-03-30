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

type Tab = 'chat' | 'terminal';

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
