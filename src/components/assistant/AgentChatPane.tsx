import type { RefObject } from "react";
import type { ChatMsg, AgentEntry } from "./agentHubTypes";

interface AgentChatPaneProps {
  hubOnline: boolean;
  chatHistory: ChatMsg[];
  chatInput: string;
  chatLoading: boolean;
  agents: AgentEntry[];
  activeAgentId: string | null;
  activeAgentName: string | null;
  showAgentPicker: boolean;
  agentSearch: string;
  chatBottomRef: RefObject<HTMLDivElement | null>;
  onSendChat: () => void;
  onCopy: (text: string) => void;
  onSendToTask: (text: string) => void;
  onActivateAgent: (id: string | null) => void;
  onClearHistory: () => void;
  onChatInputChange: (v: string) => void;
  onAgentSearchChange: (v: string) => void;
  onToggleAgentPicker: () => void;
}

export function AgentChatPane({
  hubOnline,
  chatHistory,
  chatInput,
  chatLoading,
  agents,
  activeAgentId,
  activeAgentName,
  showAgentPicker,
  agentSearch,
  chatBottomRef,
  onSendChat,
  onCopy,
  onSendToTask,
  onActivateAgent,
  onClearHistory,
  onChatInputChange,
  onAgentSearchChange,
  onToggleAgentPicker,
}: AgentChatPaneProps) {
  return (
    <div className="ah-pane ah-pane-chat">
      <div className="ah-pane-hdr">
        <span className="ah-pane-title">◈ AGENT CHAT</span>
        <span className="ah-pane-sub">claude-haiku · streaming</span>
        {activeAgentName && (
          <span
            className="ah-agent-badge"
            title={`Aktywny agent: ${activeAgentName}`}
          >
            🤖 {activeAgentName.slice(0, 18)}
            {activeAgentName.length > 18 ? "…" : ""}
            <button
              className="ah-agent-badge-x"
              onClick={() => onActivateAgent(null)}
              title="Wyłącz agenta"
            >
              ✕
            </button>
          </span>
        )}
        <button
          className={`ah-agent-btn${showAgentPicker ? " ah-agent-btn-on" : ""}`}
          onClick={onToggleAgentPicker}
          title="Wybierz agenta"
        >
          🤖 Agent{agents.length > 0 ? ` (${agents.length})` : ""}
        </button>
        {chatHistory.length > 0 && (
          <button className="ah-clear-btn" onClick={onClearHistory}>
            ⌫
          </button>
        )}
      </div>

      {/* ── Agent Picker overlay ── */}
      {showAgentPicker && (
        <div className="ah-agent-picker">
          <input
            className="ah-agent-search"
            placeholder="Szukaj agenta…"
            value={agentSearch}
            onChange={(e) => onAgentSearchChange(e.target.value)}
            autoFocus
          />
          <div className="ah-agent-list">
            {agents
              .filter(
                (a) =>
                  !agentSearch ||
                  a.name.toLowerCase().includes(agentSearch.toLowerCase()) ||
                  a.description
                    .toLowerCase()
                    .includes(agentSearch.toLowerCase()),
              )
              .map((a) => (
                <button
                  key={a.id}
                  className={`ah-agent-item${activeAgentId === a.id ? " ah-agent-item-active" : ""}`}
                  onClick={() =>
                    onActivateAgent(activeAgentId === a.id ? null : a.id)
                  }
                  title={a.description}
                >
                  <span className="ah-agent-item-name">{a.name}</span>
                  <span className="ah-agent-item-desc">
                    {a.description.slice(0, 60)}
                    {a.description.length > 60 ? "…" : ""}
                  </span>
                </button>
              ))}
            {agents.length === 0 && (
              <p className="ah-agent-empty">Ładowanie agentów…</p>
            )}
          </div>
        </div>
      )}

      <div className="ah-messages">
        {chatHistory.length === 0 && (
          <p className="ah-empty">
            Wpisz pytanie — Agent HUB odpowie przez Haiku
            <br />
            <span className="ah-empty-hint">
              ⚡ wyśle odpowiedź jako instrukcję do Goose
            </span>
          </p>
        )}
        {chatHistory.map((m, i) => (
          <div key={i} className={`ah-msg ah-msg-${m.role}`}>
            <div className="ah-msg-meta">
              <span className="ah-msg-role">
                {m.role === "user" ? "TY" : "AI"}
              </span>
              <div className="ah-msg-actions">
                <button
                  className="ah-act-btn"
                  onClick={() => onCopy(m.text)}
                  title="Kopiuj"
                >
                  ⎘
                </button>
                {m.role === "assistant" && (
                  <button
                    className="ah-act-btn ah-act-primary"
                    onClick={() => onSendToTask(m.text)}
                    title="Wyślij jako task do Goose"
                  >
                    ⚡
                  </button>
                )}
              </div>
            </div>
            <p className="ah-msg-text">
              {m.text}
              {m.streaming && <span className="ah-typing">▋</span>}
            </p>
          </div>
        ))}
        <div ref={chatBottomRef} />
      </div>

      <div className="ah-input-bar">
        <textarea
          className="ah-textarea"
          placeholder={
            hubOnline
              ? "Pytanie… (Enter = wyślij, Shift+Enter = nowy wiersz)"
              : "Hub offline — uruchom npm run hub"
          }
          value={chatInput}
          onChange={(e) => onChatInputChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSendChat();
            }
          }}
          rows={2}
          disabled={chatLoading || !hubOnline}
        />
        <button
          className="ah-btn-send"
          onClick={onSendChat}
          disabled={chatLoading || !hubOnline || !chatInput.trim()}
        >
          {chatLoading ? "…" : "▶"}
        </button>
      </div>
    </div>
  );
}
