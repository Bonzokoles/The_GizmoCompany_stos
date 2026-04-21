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
 * Usage: Render inside BrowserUI context.
 */

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  Suspense,
  lazy,
} from "react";
import { JimboKitTerminal } from "./JimboKitTerminal";
import {
  useJimboKitStore,
  type ContentBlock,
  type JimboMessage,
} from "../../hooks/useJimboKitStore";
import { PROMPT_LIBRARY, PROMPT_CATEGORIES } from "../../data/promptLibrary";
import jimboAvatar from "../../assets/jimbo-avatar.png";
import "../../styles/jimbokit.css";

// Lazy-load TerminalPanel (xterm.js) only when PTY tab is opened
const TerminalPanel = lazy(() =>
  import("../tools/TerminalPanel").then((m) => ({ default: m.TerminalPanel })),
);

// ─── Types ─────────────────────────────────────────────────────────────────────

type Tab =
  | "chat"
  | "terminal"
  | "settings"
  | "search"
  | "tunnels"
  | "pty"
  | "kb";

const TAB_META: Record<Tab, { icon: string; label: string; desc: string }> = {
  chat: { icon: "💬", label: "Chat", desc: "Rozmowa z agentem AI" },
  kb: { icon: "📚", label: "Baza wiedzy", desc: "RAG / lokalna KB" },
  search: { icon: "🔍", label: "Szukaj", desc: "Web search + Deep AI" },
  terminal: { icon: "⌨", label: "Terminal", desc: "Komendy agenta" },
  pty: { icon: ">_", label: "PTY", desc: "xterm.js shell" },
  tunnels: { icon: "🌐", label: "Tunele", desc: "Cloudflare tunnels" },
  settings: { icon: "⚙", label: "Ustawienia", desc: "Modele i konfiguracja" },
};

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
  /** Kontekst dokumentu z KB Viewer */
  kbDocContext?: {
    title: string;
    url: string;
    category: string;
    query: string;
    content: string;
    md_path: string;
  } | null;
}

// ─── Markdown-lite renderer (no external deps) ────────────────────────────────

function renderText(text: string): React.ReactNode[] {
  // Split on code fences first, then inline code, then newlines
  const lines = text.split("\n");
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
    <span />
    <span />
    <span />
    <small>Przetwarzanie…</small>
  </div>
);

const ToolBadge: React.FC<{
  name: string;
  description?: string;
  spinning?: boolean;
}> = ({ name, description, spinning }) => (
  <div className="jk-tool-badge">
    <span className={`jk-tool-icon ${spinning ? "jk-spin" : ""}`}>⚙</span>
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
    if (content[i].type === "tool_use") return i === index;
  }
  return false;
}

const MessageBubble: React.FC<{
  msg: JimboMessage;
  isLive?: boolean;
  toolRunning?: boolean;
}> = ({ msg, isLive, toolRunning }) => {
  const isUser = msg.role === "user";
  const contentBlocks: ContentBlock[] = Array.isArray(msg.content)
    ? msg.content
    : [{ type: "text", text: msg.content as string }];

  return (
    <div className={`jk-msg jk-msg--${msg.role}`}>
      <div className="jk-msg-avatar">
        {isUser ? "👤" : <img src={jimboAvatar} alt="J" style={{ width: 18, height: 18, objectFit: 'contain' }} />}
      </div>
      <div className="jk-msg-body">
        {msg.agent_name && (
          <div className="jk-agent-label">👤 {msg.agent_name} Agent</div>
        )}
        {contentBlocks.map((block, k) => {
          if (block.type === "text" && block.text) {
            return (
              <div key={k} className="jk-msg-text">
                {renderText(block.text)}
              </div>
            );
          }
          if (block.type === "thinking") {
            return <ThinkingBlock key={k} text={block.text} />;
          }
          if (block.type === "tool_use") {
            const spinning =
              isLive && toolRunning && isLastToolUse(contentBlocks, k);
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
    className={`jk-session-item ${active ? "jk-session-item--active" : ""}`}
    onClick={onSelect}
  >
    <span className="jk-session-label">💬 {label}</span>
    <button
      className="jk-session-delete"
      onClick={(e) => {
        e.stopPropagation();
        onDelete();
      }}
      title="Usuń sesję"
    >
      ✕
    </button>
  </div>
);

// ─── Popular OpenRouter models ────────────────────────────────────────────────

const POPULAR_MODELS = [
  { label: "── Płatne (OpenAI) ──", value: "", disabled: true },
  { label: "GPT-4o mini  💰tani ⚡szybki", value: "openai/gpt-4o-mini" },
  { label: "GPT-4o", value: "openai/gpt-4o" },
  { label: "GPT-4.1 mini", value: "openai/gpt-4.1-mini" },
  { label: "── Płatne (Anthropic) ──", value: "", disabled: true },
  { label: "Claude 3.5 Haiku  💰tani", value: "anthropic/claude-3-5-haiku" },
  { label: "Claude 3.7 Sonnet", value: "anthropic/claude-3.7-sonnet" },
  { label: "── Płatne (Google) ──", value: "", disabled: true },
  {
    label: "Gemini 2.0 Flash  💰tani ⚡szybki",
    value: "google/gemini-2.0-flash-001",
  },
  { label: "Gemini 2.5 Pro", value: "google/gemini-2.5-pro-preview-03-25" },
  { label: "── Darmowe ──", value: "", disabled: true },
  { label: "Qwen 3.6-plus :free", value: "qwen/qwen3.6-plus:free" },
  {
    label: "DeepSeek Chat V3 :free",
    value: "deepseek/deepseek-chat-v3-0324:free",
  },
  { label: "Gemma 3 12B :free", value: "google/gemma-3-12b-it:free" },
  {
    label: "Llama 3.3 70B :free",
    value: "meta-llama/llama-3.3-70b-instruct:free",
  },
];

const API_BASE_SETTINGS = "http://localhost:4111";

const ModelSettings: React.FC = () => {
  const [chatModel, setChatModel] = useState("");
  const [toolModel, setToolModel] = useState("");
  const [customChat, setCustomChat] = useState("");
  const [customTool, setCustomTool] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "ok" | "err">(
    "idle",
  );
  const [statusMsg, setStatusMsg] = useState("");

  // Załaduj aktualny config
  useEffect(() => {
    fetch(`${API_BASE_SETTINGS}/api/config`)
      .then((r) => r.json() as Promise<{ model: string; toolModel: string }>)
      .then((cfg) => {
        setChatModel(cfg.model);
        setToolModel(cfg.toolModel);
      })
      .catch(() => {});
  }, []);

  const effectiveChatModel =
    chatModel === "__custom__" ? customChat : chatModel;
  const effectiveToolModel =
    toolModel === "__custom__" ? customTool : toolModel;

  async function handleSave() {
    setStatus("saving");
    try {
      const r = await fetch(`${API_BASE_SETTINGS}/api/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: effectiveChatModel,
          toolModel: effectiveToolModel,
        }),
      });
      const data = (await r.json()) as {
        ok?: boolean;
        model?: string;
        toolModel?: string;
      };
      if (data.ok) {
        setStatus("ok");
        setStatusMsg(`✅ Zapisano: ${data.model} / ${data.toolModel}`);
      } else {
        setStatus("err");
        setStatusMsg("❌ Błąd zapisu");
      }
    } catch {
      setStatus("err");
      setStatusMsg("❌ Brak połączenia z serwerem");
    }
    setTimeout(() => setStatus("idle"), 3000);
  }

  return (
    <div className="jk-settings">
      <div className="jk-settings-section">
        <h3 className="jk-settings-title">⚙ Konfiguracja modeli</h3>
        <p className="jk-settings-info">
          OpenRouter obsługuje wiele modeli jednocześnie — każde zapytanie
          wskazuje swój model. BUCH może używać innego modelu niezależnie.
        </p>
      </div>

      <div className="jk-settings-section">
        <label className="jk-settings-label">
          💬 Model odpowiedzi (streaming)
        </label>
        <select
          className="jk-settings-select"
          value={chatModel}
          onChange={(e) => setChatModel(e.target.value)}
        >
          {POPULAR_MODELS.map((m, i) => (
            <option key={i} value={m.value} disabled={m.disabled}>
              {m.label}
            </option>
          ))}
          <option value="__custom__">✏ Własny model…</option>
        </select>
        {chatModel === "__custom__" && (
          <input
            className="jk-settings-input"
            placeholder="np. openai/gpt-4o-mini"
            value={customChat}
            onChange={(e) => setCustomChat(e.target.value)}
          />
        )}
        {chatModel && chatModel !== "__custom__" && (
          <div className="jk-settings-current">
            Aktywny: <code>{chatModel}</code>
          </div>
        )}
      </div>

      <div className="jk-settings-section">
        <label className="jk-settings-label">
          🔧 Model tool-use (function calling)
        </label>
        <select
          className="jk-settings-select"
          value={toolModel}
          onChange={(e) => setToolModel(e.target.value)}
        >
          {POPULAR_MODELS.map((m, i) => (
            <option key={i} value={m.value} disabled={m.disabled}>
              {m.label}
            </option>
          ))}
          <option value="__custom__">✏ Własny model…</option>
        </select>
        {toolModel === "__custom__" && (
          <input
            className="jk-settings-input"
            placeholder="np. openai/gpt-4o-mini"
            value={customTool}
            onChange={(e) => setCustomTool(e.target.value)}
          />
        )}
        {toolModel && toolModel !== "__custom__" && (
          <div className="jk-settings-current">
            Aktywny: <code>{toolModel}</code>
          </div>
        )}
      </div>

      <div className="jk-settings-section">
        <button
          className="jk-btn jk-btn--primary"
          onClick={() => void handleSave()}
          disabled={status === "saving"}
        >
          {status === "saving" ? "⏳ Zapisuję…" : "💾 Zastosuj (bez restartu)"}
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
          <li>
            ✅ Każde zapytanie wysyła swój <code>model</code> — pełna izolacja
          </li>
          <li>
            ✅ BUCH może używać np. Claude 3.5, JIMBO GPT-4o-mini — działają
            niezależnie
          </li>
          <li>
            ✅ Ten sam klucz API <code>OPENROUTER_API_KEY</code> obsługuje
            wszystkie
          </li>
          <li>
            ⚠ Zmiana modelu działa natychmiast — nowe wiadomości używają nowego
            modelu
          </li>
        </ul>
      </div>
    </div>
  );
};

// ─── Search Tab ────────────────────────────────────────────────────────────────

const SearchTab: React.FC<{ onNavigate?: (url: string) => void }> = ({
  onNavigate,
}) => {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [webResults, setWebResults] = useState<
    Array<{ url: string; title: string; snippet: string; engine: string }>
  >([]);
  const [deepReport, setDeepReport] = useState<{
    summary: string;
    sources: Array<{ url: string; title: string }>;
  } | null>(null);
  const [activeSearch, setActiveSearch] = useState<"web" | "deep">("web");
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setWebResults([]);
    setDeepReport(null);
    try {
      if (activeSearch === "web") {
        const res = await window.electronAPI.search.webSearch(query);
        if (res.success && res.data) setWebResults(res.data);
        else setError(res.error ?? "Brak wyników");
      } else {
        const res = await window.electronAPI.search.deepSearch(query);
        if (res.success && res.data) setDeepReport(res.data);
        else setError(res.error ?? "Analiza niedostępna");
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Błąd wyszukiwania");
    }
    setLoading(false);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        padding: "8px",
      }}
    >
      <div style={{ display: "flex", gap: "4px", marginBottom: "8px" }}>
        {(["web", "deep"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setActiveSearch(t)}
            style={{
              padding: "4px 10px",
              fontSize: "12px",
              cursor: "pointer",
              background: activeSearch === t ? "#1a3a5c" : "transparent",
              color: activeSearch === t ? "#64b5f6" : "#8892b0",
              border: "none",
              borderBottom:
                activeSearch === t
                  ? "2px solid #64b5f6"
                  : "2px solid transparent",
            }}
          >
            {t === "web" ? "🌐 Web" : "🧠 Deep"}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", gap: "6px", marginBottom: "8px" }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void handleSearch()}
          placeholder="Szukaj…"
          style={{
            flex: 1,
            padding: "6px 8px",
            background: "#112240",
            border: "1px solid #233554",
            borderRadius: "4px",
            color: "#ccd6f6",
            fontSize: "12px",
            outline: "none",
          }}
        />
        <button
          onClick={() => void handleSearch()}
          disabled={loading}
          style={{
            padding: "6px 12px",
            background: "#1a3a5c",
            color: "#64b5f6",
            border: "1px solid #2a5a8c",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "12px",
          }}
        >
          {loading ? "⏳" : "🔍"}
        </button>
      </div>
      {error && (
        <div
          style={{ color: "#f87171", fontSize: "12px", marginBottom: "6px" }}
        >
          {error}
        </div>
      )}
      <div style={{ flex: 1, overflow: "auto" }}>
        {webResults.map((r, i) => (
          <div
            key={i}
            onClick={() => onNavigate?.(r.url)}
            style={{
              padding: "8px",
              marginBottom: "4px",
              background: "#112240",
              borderRadius: "4px",
              cursor: "pointer",
              borderLeft: "2px solid #233554",
            }}
          >
            <div
              style={{
                fontWeight: "bold",
                fontSize: "12px",
                color: "#64b5f6",
                marginBottom: "2px",
              }}
            >
              {r.title}
            </div>
            <div
              style={{
                fontSize: "10px",
                color: "#4a7aaa",
                marginBottom: "2px",
              }}
            >
              {r.url.slice(0, 60)}
            </div>
            <div style={{ fontSize: "11px", color: "#8892b0" }}>
              {r.snippet.slice(0, 120)}
            </div>
          </div>
        ))}
        {deepReport && (
          <div
            style={{
              padding: "8px",
              background: "#112240",
              borderRadius: "4px",
            }}
          >
            <div
              style={{
                color: "#64ffda",
                fontWeight: "bold",
                marginBottom: "6px",
                fontSize: "12px",
              }}
            >
              🧠 Analiza AI
            </div>
            <div
              style={{
                fontSize: "12px",
                color: "#ccd6f6",
                marginBottom: "8px",
                lineHeight: 1.5,
              }}
            >
              {deepReport.summary}
            </div>
            {deepReport.sources.map((s, i) => (
              <div
                key={i}
                onClick={() => onNavigate?.(s.url)}
                style={{
                  fontSize: "11px",
                  color: "#64b5f6",
                  cursor: "pointer",
                  marginBottom: "2px",
                }}
              >
                🔗 {s.title}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Tunnels Tab ───────────────────────────────────────────────────────────────

const TunnelsTab: React.FC = () => {
  const [tunnels, setTunnels] = useState<
    Array<{
      hostname: string;
      service: string;
      status: string;
      uptime: number;
      requestsPerMinute: number;
    }>
  >([]);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const load = async () => {
    try {
      const status = await window.electronAPI.tunnel?.status();
      if (status) setTunnels(status);
    } catch {
      /* tunnel not available */
    }
  };

  useEffect(() => {
    void load();
    if (!autoRefresh) return;
    const id = setInterval(() => void load(), 10000);
    return () => clearInterval(id);
  }, [autoRefresh]);

  const handleReconnect = async () => {
    setLoading(true);
    try {
      await window.electronAPI.tunnel?.reconnect();
      await load();
    } finally {
      setLoading(false);
    }
  };

  const COLOR: Record<string, string> = {
    active: "#4ade80",
    error: "#f87171",
    disconnected: "#fbbf24",
  };

  return (
    <div
      style={{
        padding: "8px",
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: "6px",
          marginBottom: "8px",
          alignItems: "center",
        }}
      >
        <button
          onClick={() => void load()}
          style={{
            padding: "4px 10px",
            fontSize: "11px",
            background: "#1a2f4a",
            color: "#64b5f6",
            border: "1px solid #2a4a6a",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          🔄 Odśwież
        </button>
        <button
          onClick={() => void handleReconnect()}
          disabled={loading}
          style={{
            padding: "4px 10px",
            fontSize: "11px",
            background: "#1a3a5c",
            color: "#64ffda",
            border: "1px solid #2a5a8c",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          {loading ? "⏳" : "🔌 Połącz ponownie"}
        </button>
        <label
          style={{
            marginLeft: "auto",
            fontSize: "11px",
            color: "#8892b0",
            display: "flex",
            alignItems: "center",
            gap: "4px",
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
          />
          Auto (10s)
        </label>
      </div>

      {tunnels.length === 0 ? (
        <div
          style={{
            color: "#4a5568",
            textAlign: "center",
            padding: "30px",
            fontSize: "12px",
          }}
        >
          Brak aktywnych tuneli
          <br />
          <span style={{ fontSize: "10px" }}>
            Cloudflare tunnele są konfigurowane przez cloudflared
          </span>
        </div>
      ) : (
        <div style={{ flex: 1, overflow: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "11px",
            }}
          >
            <thead>
              <tr
                style={{ color: "#4a5568", borderBottom: "1px solid #233554" }}
              >
                {["Hostname", "Usługa", "Status", "Uptime", "RPM"].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "4px 6px",
                      textAlign: "left",
                      fontWeight: "normal",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tunnels.map((t, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #1a2a3a" }}>
                  <td style={{ padding: "4px 6px", color: "#ccd6f6" }}>
                    {t.hostname}
                  </td>
                  <td style={{ padding: "4px 6px", color: "#8892b0" }}>
                    {t.service}
                  </td>
                  <td style={{ padding: "4px 6px" }}>
                    <span
                      style={{
                        color: COLOR[t.status] ?? "#8892b0",
                        fontWeight: "bold",
                      }}
                    >
                      ● {t.status}
                    </span>
                  </td>
                  <td style={{ padding: "4px 6px", color: "#8892b0" }}>
                    {Math.floor(t.uptime / 60)}m
                  </td>
                  <td style={{ padding: "4px 6px", color: "#8892b0" }}>
                    {t.requestsPerMinute}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ─── KB / Resources Tab ───────────────────────────────────────────────────────

// KB category id → emoji map
const KB_CAT_ICONS: Record<string, string> = {
  "01": "🤖", "02": "🐱", "03": "🐍", "04": "🛒", "05": "🧠",
  "06": "💰", "07": "📊", "08": "🏪", "09": "🔄", "10": "📈",
  "11": "💡", "12": "🔮", "13": "📰", "14": "✍️", "15": "📄",
  "16": "📝", "17": "🤖", "18": "🔧", "19": "🗺️", "20": "📚",
};

const KB_CAT_COLORS: Record<string, string> = {
  "01": "#6366f1", "02": "#8b5cf6", "03": "#10b981", "04": "#f59e0b",
  "05": "#a855f7", "06": "#22c55e", "07": "#3b82f6", "08": "#f97316",
  "09": "#06b6d4", "10": "#eab308", "11": "#ec4899", "12": "#14b8a6",
  "13": "#ef4444", "14": "#84cc16", "15": "#64748b", "16": "#0ea5e9",
  "17": "#f97316", "18": "#3b82f6", "19": "#a3e635", "20": "#94a3b8",
};

interface KBCategory {
  id: string;
  name: string;
  description: string;
  file_count: number;
  indexed_documents: number;
  exists: boolean;
}

interface KBResult {
  title: string;
  category: string;
  snippet: string;
  score?: number;
}

const HUB = "http://localhost:4224";
const KB_VIEWER = "http://localhost:8765";

const KBTab: React.FC<{ onNavigate?: (url: string) => void }> = ({
  onNavigate,
}) => {
  const [view, setView] = useState<"search" | "categories">("search");
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"search" | "rag">("search");
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [results, setResults] = useState<KBResult[]>([]);
  const [categories, setCategories] = useState<KBCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [catsLoading, setCatsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serverOnline, setServerOnline] = useState<boolean | null>(null);
  const [stats, setStats] = useState<{ total_files: number; total_indexed: number } | null>(null);

  // Ping KB server on mount
  useEffect(() => {
    fetch(`${HUB}/kb/stats`, { signal: AbortSignal.timeout(3000) })
      .then((r) => r.json())
      .then((d: { total_files?: number; total_indexed?: number }) => {
        setServerOnline(true);
        setStats({ total_files: d.total_files ?? 0, total_indexed: d.total_indexed ?? 0 });
      })
      .catch(() => setServerOnline(false));
  }, []);

  // Load categories when view switches
  useEffect(() => {
    if (view !== "categories" || categories.length > 0) return;
    setCatsLoading(true);
    fetch(`${HUB}/kb/categories`, { signal: AbortSignal.timeout(5000) })
      .then((r) => r.json())
      .then((d: KBCategory[]) => setCategories(d))
      .catch(() => setError("Nie można pobrać kategorii"))
      .finally(() => setCatsLoading(false));
  }, [view, categories.length]);

  async function handleSearch() {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setResults([]);
    try {
      const endpoint = mode === "rag" ? `${HUB}/kb/rag` : `${HUB}/kb/search`;
      const body: Record<string, unknown> = { query, limit: 12 };
      if (selectedCats.length > 0) body.categories = selectedCats;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }

      const data = await res.json() as {
        // /kb/search response
        results?: { documents?: string[][]; metadatas?: Array<Array<Record<string, string>>>; distances?: number[][] };
        // /kb/rag response
        context?: string;
        context_documents?: number;
        warning?: string;
      };

      if (data.warning) {
        setError("⚠ " + data.warning);
        return;
      }

      if (mode === "rag" && data.context) {
        // RAG returns a single formatted context — show as one block
        setResults([{
          title: `RAG Context (${data.context_documents ?? "?"} dokumentów)`,
          category: selectedCats.length ? selectedCats.join(", ") : "wszystkie",
          snippet: data.context,
        }]);
        return;
      }

      // Search returns raw ChromaDB format
      const docs = data.results?.documents?.[0] ?? [];
      const metas = data.results?.metadatas?.[0] ?? [];
      const dists = data.results?.distances?.[0] ?? [];

      setResults(
        docs.map((doc, i) => ({
          title: metas[i]?.title ?? metas[i]?.file_path?.split(/[\\/]/).pop() ?? `Dokument ${i + 1}`,
          category: metas[i]?.category ?? "?",
          snippet: doc,
          score: dists[i] != null ? 1 - dists[i] : undefined,
        }))
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Błąd połączenia z KB Server");
    } finally {
      setLoading(false);
    }
  }

  function toggleCat(id: string) {
    setSelectedCats((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  }

  return (
    <div className="jk-kb-root">
      {/* ── Status bar ── */}
      <div className="jk-kb-statusbar">
        <span
          className={`jk-kb-dot ${serverOnline === true ? "jk-kb-dot--on" : serverOnline === false ? "jk-kb-dot--off" : "jk-kb-dot--unk"}`}
        />
        <span className="jk-kb-statuslabel">
          {serverOnline === true
            ? `KB Online · ${stats?.total_indexed ?? "?"} zind. / ${stats?.total_files ?? "?"} plików`
            : serverOnline === false
            ? "KB Server offline — uruchom start_kb_full.bat"
            : "Sprawdzanie KB…"}
        </span>
        <button
          className="jk-kb-quickbtn"
          onClick={() => onNavigate?.(KB_VIEWER)}
          title="Otwórz KB Viewer (port 8765)"
        >
          📂 Viewer
        </button>
        <button
          className="jk-kb-quickbtn"
          onClick={() => onNavigate?.("http://localhost:7071/docs")}
          title="FastAPI /docs"
        >
          🔌 API
        </button>
      </div>

      {/* ── View tabs ── */}
      <div className="jk-kb-tabs">
        <button
          className={`jk-kb-tab ${view === "search" ? "jk-kb-tab--active" : ""}`}
          onClick={() => setView("search")}
        >
          🔍 Wyszukaj
        </button>
        <button
          className={`jk-kb-tab ${view === "categories" ? "jk-kb-tab--active" : ""}`}
          onClick={() => setView("categories")}
        >
          📑 Kategorie
        </button>
      </div>

      {/* ── SEARCH VIEW ── */}
      {view === "search" && (
        <>
          {/* Mode toggle */}
          <div className="jk-kb-modetoggle">
            <button
              className={`jk-kb-modbtn ${mode === "search" ? "jk-kb-modbtn--active" : ""}`}
              onClick={() => setMode("search")}
            >
              Wyszukiwanie
            </button>
            <button
              className={`jk-kb-modbtn ${mode === "rag" ? "jk-kb-modbtn--active" : ""}`}
              onClick={() => setMode("rag")}
            >
              RAG Query
            </button>
            {selectedCats.length > 0 && (
              <span className="jk-kb-catbadge">
                {selectedCats.length} kat.
                <button onClick={() => setSelectedCats([])} className="jk-kb-catclear">✕</button>
              </span>
            )}
          </div>

          {/* Category quick-filter chips */}
          {mode === "rag" && (
            <div className="jk-kb-catfilter">
              {Object.entries({
                "01": "AI SEO", "05": "Agents/RAG", "06": "Finance",
                "07": "B2B", "13": "AI News", "16": "Prompts",
                "17": "Agent KB", "18": "MCP",
              }).map(([id, label]) => (
                <button
                  key={id}
                  className={`jk-kb-chip ${selectedCats.includes(id) ? "jk-kb-chip--on" : ""}`}
                  style={selectedCats.includes(id) ? { borderColor: KB_CAT_COLORS[id], color: KB_CAT_COLORS[id] } : {}}
                  onClick={() => toggleCat(id)}
                >
                  {KB_CAT_ICONS[id]} {label}
                </button>
              ))}
            </div>
          )}

          {/* Search bar */}
          <div className="jk-kb-searchrow">
            <input
              className="jk-kb-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void handleSearch()}
              placeholder={mode === "rag"
                ? "RAG query — dostaniesz sformatowany kontekst…"
                : "Szukaj semantycznie w KB (ChromaDB)…"}
              disabled={serverOnline === false}
            />
            <button
              className="jk-kb-searchbtn"
              onClick={() => void handleSearch()}
              disabled={loading || !query.trim() || serverOnline === false}
            >
              {loading ? "⏳" : "🔍"}
            </button>
          </div>

          {error && <div className="jk-kb-error">⚠ {error}</div>}

          {/* Results */}
          <div className="jk-kb-results">
            {!loading && results.length === 0 && !error && (
              <div className="jk-kb-empty">
                {serverOnline === false
                  ? "Uruchom KB Server: U:\\The_DEVz_HUB_of_work\\knowledge_base\\start_kb_full.bat"
                  : "Wpisz zapytanie i kliknij 🔍 — przeszukuję 20 kategorii ChromaDB"}
              </div>
            )}
            {results.map((r, i) => (
              <div key={i} className="jk-kb-result">
                <div className="jk-kb-result-hdr">
                  <span className="jk-kb-result-title">{r.title}</span>
                  {r.score != null && (
                    <span className="jk-kb-result-score">
                      {(r.score * 100).toFixed(0)}%
                    </span>
                  )}
                </div>
                <div className="jk-kb-result-cat">📁 {r.category}</div>
                <div className="jk-kb-result-snippet">
                  {r.snippet.slice(0, 400)}
                  {r.snippet.length > 400 && "…"}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── CATEGORIES VIEW ── */}
      {view === "categories" && (
        <div className="jk-kb-catgrid">
          {catsLoading && <div className="jk-kb-empty">⏳ Ładowanie kategorii…</div>}
          {!catsLoading && categories.length === 0 && (
            <div className="jk-kb-empty">Brak kategorii (KB Server offline?)</div>
          )}
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="jk-kb-catcard"
              style={{ borderColor: (KB_CAT_COLORS[cat.id] ?? "#233344") + "55" }}
              onClick={() => {
                setView("search");
                setMode("rag");
                setSelectedCats([cat.id]);
              }}
            >
              <div className="jk-kb-catcard-icon" style={{ color: KB_CAT_COLORS[cat.id] }}>
                {KB_CAT_ICONS[cat.id] ?? "📁"}
              </div>
              <div className="jk-kb-catcard-name">{cat.name.replace(/_/g, " ")}</div>
              <div className="jk-kb-catcard-counts">
                <span style={{ color: cat.indexed_documents > 0 ? "#00ffcc" : "#4a6488" }}>
                  {cat.indexed_documents} zaind.
                </span>
                {" / "}
                <span>{cat.file_count} plików</span>
              </div>
              {!cat.exists && <div className="jk-kb-catcard-missing">brak folderu</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Hamburger side-menu ──────────────────────────────────────────────────────

const HamburgerMenu: React.FC<{
  activeTab: Tab;
  onTab: (t: Tab) => void;
  onClose: () => void;
  sessions: Array<{ key: string; label: string }>;
  currentSessionId: string | null;
  onNewSession: () => void;
  onSwitchSession: (key: string) => void;
  onDeleteSession: (key: string) => void;
  onShowPrompts: () => void;
  onClearChat: () => void;
  isConnected: boolean;
}> = ({
  activeTab,
  onTab,
  onClose,
  sessions,
  currentSessionId,
  onNewSession,
  onSwitchSession,
  onDeleteSession,
  onShowPrompts,
  onClearChat,
  isConnected,
}) => {
  const s: React.CSSProperties = {
    width: "230px",
    background: "#060d18",
    borderRight: "1px solid #1a2e44",
    display: "flex",
    flexDirection: "column",
    overflowY: "auto",
    flexShrink: 0,
    zIndex: 20,
  };
  const sectionHead: React.CSSProperties = {
    padding: "8px 12px 4px",
    fontSize: "9px",
    letterSpacing: "1.5px",
    color: "#2a4a6a",
    textTransform: "uppercase",
    fontWeight: 700,
  };
  const tabItem = (t: Tab): React.CSSProperties => ({
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "8px 14px",
    cursor: "pointer",
    fontSize: "13px",
    transition: "background 0.1s",
    background: activeTab === t ? "#0f2540" : "transparent",
    borderLeft: activeTab === t ? "3px solid #00aaff" : "3px solid transparent",
    color: activeTab === t ? "#64d9ff" : "#8892b0",
  });
  const actionBtn: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "7px 14px",
    cursor: "pointer",
    fontSize: "12px",
    color: "#8892b0",
    background: "transparent",
    border: "none",
    width: "100%",
    textAlign: "left",
    transition: "color 0.1s",
  };

  return (
    <div style={s}>
      {/* Header */}
      <div
        style={{
          padding: "10px 14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid #0e1f35",
        }}
      >
        <span
          style={{
            color: "#00aaff",
            fontWeight: 700,
            fontSize: "13px",
            letterSpacing: "1px",
          }}
        >
          JIMBO_KIT
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span
            style={{
              width: "7px",
              height: "7px",
              borderRadius: "50%",
              background: isConnected ? "#4ade80" : "#f59e0b",
              display: "inline-block",
            }}
          />
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "#4a6a8a",
              cursor: "pointer",
              fontSize: "14px",
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </span>
      </div>

      {/* Nawigacja */}
      <div style={sectionHead}>📱 Nawigacja</div>
      {(Object.keys(TAB_META) as Tab[]).map((t) => (
        <div
          key={t}
          style={tabItem(t)}
          onClick={() => {
            onTab(t);
            onClose();
          }}
        >
          <span
            style={{ fontSize: "15px", width: "20px", textAlign: "center" }}
          >
            {TAB_META[t].icon}
          </span>
          <span>
            <div style={{ fontWeight: activeTab === t ? 600 : 400 }}>
              {TAB_META[t].label}
            </div>
            <div
              style={{ fontSize: "10px", color: "#3a5a7a", marginTop: "1px" }}
            >
              {TAB_META[t].desc}
            </div>
          </span>
        </div>
      ))}

      {/* Sesje */}
      <div style={{ borderTop: "1px solid #0e1f35", marginTop: "4px" }} />
      <div
        style={{
          ...sectionHead,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingRight: "8px",
        }}
      >
        <span>💬 Sesje ({sessions.length})</span>
        <button
          onClick={onNewSession}
          style={{
            background: "#0f2540",
            border: "1px solid #1a3a5c",
            color: "#64b5f6",
            borderRadius: "3px",
            cursor: "pointer",
            fontSize: "11px",
            padding: "1px 6px",
          }}
        >
          + Nowa
        </button>
      </div>
      {sessions.length === 0 && (
        <div
          style={{ padding: "6px 14px", fontSize: "11px", color: "#2a4a6a" }}
        >
          Brak sesji
        </div>
      )}
      {sessions.map((s) => (
        <div
          key={s.key}
          style={{
            display: "flex",
            alignItems: "center",
            padding: "5px 14px",
            background: s.key === currentSessionId ? "#0a1e32" : "transparent",
            cursor: "pointer",
            fontSize: "12px",
          }}
        >
          <span
            style={{
              flex: 1,
              color: s.key === currentSessionId ? "#64d9ff" : "#6a8aaa",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            onClick={() => {
              onSwitchSession(s.key);
              onClose();
            }}
          >
            {s.key === currentSessionId ? "▶ " : "○ "}
            {s.label}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDeleteSession(s.key);
            }}
            style={{
              background: "none",
              border: "none",
              color: "#2a4a6a",
              cursor: "pointer",
              fontSize: "12px",
              padding: "0 2px",
            }}
          >
            ✕
          </button>
        </div>
      ))}

      {/* Akcje */}
      <div style={{ borderTop: "1px solid #0e1f35", marginTop: "4px" }} />
      <div style={sectionHead}>⚡ Akcje</div>
      <button
        style={actionBtn}
        onClick={() => {
          onShowPrompts();
          onClose();
        }}
      >
        <span>📋</span>
        <span>
          Szablony promptów
          <div style={{ fontSize: "10px", color: "#2a4a6a" }}>
            Biblioteka gotowych promptów
          </div>
        </span>
      </button>
      <button
        style={actionBtn}
        onClick={() => {
          onClearChat();
          onClose();
        }}
      >
        <span>🗑</span>
        <span>Wyczyść chat</span>
      </button>
    </div>
  );
};

// ─── Prompts modal ─────────────────────────────────────────────────────────────

const PromptsModal: React.FC<{
  onUse: (prompt: string) => void;
  onClose: () => void;
}> = ({ onUse, onClose }) => {
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState<string>("all");

  const filtered = PROMPT_LIBRARY.filter((p) => {
    const matchCat = cat === "all" || p.category === cat;
    const matchSearch =
      !search ||
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.prompt.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const catColors: Record<string, string> = {
    analysis: "#64b5f6",
    coding: "#4ade80",
    security: "#f87171",
    content: "#fbbf24",
    ops: "#a78bfa",
    research: "#34d399",
  };

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 50,
        background: "#060d18",
        display: "flex",
        flexDirection: "column",
        borderLeft: "1px solid #1a2e44",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          borderBottom: "1px solid #0e1f35",
        }}
      >
        <span style={{ fontSize: "16px" }}>📋</span>
        <span
          style={{
            flex: 1,
            color: "#ccd6f6",
            fontWeight: 700,
            fontSize: "14px",
          }}
        >
          Szablony promptów
        </span>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            color: "#4a6a8a",
            cursor: "pointer",
            fontSize: "18px",
          }}
        >
          ✕
        </button>
      </div>

      {/* Search */}
      <div
        style={{ padding: "10px 12px 6px", borderBottom: "1px solid #0e1f35" }}
      >
        <input
          autoFocus
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 Szukaj w szablonach…"
          style={{
            width: "100%",
            padding: "7px 10px",
            background: "#0c1b2a",
            border: "1px solid #1a3a5c",
            borderRadius: "6px",
            color: "#ccd6f6",
            fontSize: "13px",
            outline: "none",
            boxSizing: "border-box",
          }}
        />
      </div>

      {/* Category pills */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "6px",
          padding: "8px 12px",
          borderBottom: "1px solid #0e1f35",
        }}
      >
        <button
          onClick={() => setCat("all")}
          style={{
            padding: "4px 12px",
            borderRadius: "12px",
            fontSize: "11px",
            cursor: "pointer",
            fontWeight: cat === "all" ? 700 : 400,
            background: cat === "all" ? "#0f2540" : "transparent",
            color: cat === "all" ? "#64d9ff" : "#4a6a8a",
            border: `1px solid ${cat === "all" ? "#00aaff55" : "#1a2e44"}`,
          }}
        >
          Wszystkie ({PROMPT_LIBRARY.length})
        </button>
        {PROMPT_CATEGORIES.map((c) => {
          const count = PROMPT_LIBRARY.filter(
            (p) => p.category === c.id,
          ).length;
          return (
            <button
              key={c.id}
              onClick={() => setCat(c.id)}
              style={{
                padding: "4px 12px",
                borderRadius: "12px",
                fontSize: "11px",
                cursor: "pointer",
                fontWeight: cat === c.id ? 700 : 400,
                background: cat === c.id ? "#0f2540" : "transparent",
                color:
                  cat === c.id ? (catColors[c.id] ?? "#ccd6f6") : "#4a6a8a",
                border: `1px solid ${cat === c.id ? (catColors[c.id] ?? "#00aaff") + "55" : "#1a2e44"}`,
              }}
            >
              {c.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Cards */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "10px 12px",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
        }}
      >
        {filtered.length === 0 && (
          <div
            style={{
              color: "#2a4a6a",
              textAlign: "center",
              padding: "30px",
              fontSize: "13px",
            }}
          >
            Brak wyników
          </div>
        )}
        {filtered.map((p) => (
          <div
            key={p.id}
            style={{
              background: "#0a1929",
              border: "1px solid #1a2e44",
              borderRadius: "8px",
              padding: "12px 14px",
              transition: "border-color 0.15s",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.borderColor = "#00aaff55")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.borderColor = "#1a2e44")
            }
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                marginBottom: "6px",
              }}
            >
              <span
                style={{ fontWeight: 700, fontSize: "13px", color: "#ccd6f6" }}
              >
                {p.title}
              </span>
              <span
                style={{
                  fontSize: "10px",
                  padding: "2px 8px",
                  borderRadius: "10px",
                  marginLeft: "8px",
                  flexShrink: 0,
                  color: catColors[p.category] ?? "#8892b0",
                  background: (catColors[p.category] ?? "#8892b0") + "22",
                  border: `1px solid ${catColors[p.category] ?? "#8892b0"}33`,
                }}
              >
                {p.category}
              </span>
            </div>
            <div
              style={{
                fontSize: "12px",
                color: "#6a8aaa",
                lineHeight: 1.5,
                marginBottom: "8px",
              }}
            >
              {p.prompt.length > 120 ? p.prompt.slice(0, 120) + "…" : p.prompt}
            </div>
            {p.tags && p.tags.length > 0 && (
              <div
                style={{
                  display: "flex",
                  gap: "4px",
                  flexWrap: "wrap",
                  marginBottom: "8px",
                }}
              >
                {p.tags.map((tag) => (
                  <span
                    key={tag}
                    style={{
                      fontSize: "9px",
                      padding: "1px 6px",
                      background: "#0e1f35",
                      color: "#3a5a7a",
                      borderRadius: "4px",
                    }}
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
            <button
              onClick={() => {
                onUse(p.prompt);
                onClose();
              }}
              style={{
                padding: "5px 14px",
                background: "#0f2540",
                color: "#64d9ff",
                border: "1px solid #00aaff44",
                borderRadius: "6px",
                fontSize: "12px",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              → Użyj
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── LibraryBrowser ────────────────────────────────────────────────────────────

const HUB_PORT = 4224;

interface LibEntry {
  name: string;
  isDir: boolean;
  size?: number;
}

const LibraryBrowser: React.FC<{
  onInsert: (text: string) => void;
  onClose: () => void;
}> = ({ onInsert, onClose }) => {
  const [currentPath, setCurrentPath] = useState("U:\\WWW_Zen_BRo_wser_tool");
  const [entries, setEntries] = useState<LibEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const loadDir = useCallback(async (p: string) => {
    setLoading(true);
    setError(null);
    setFileContent(null);
    try {
      const res = await fetch(
        `http://localhost:${HUB_PORT}/tools/list-dir?path=${encodeURIComponent(p)}`
      );
      const data = await res.json() as { ok: boolean; listing?: string; error?: string };
      if (!data.ok) throw new Error(data.error ?? "Błąd listowania");
      const lines = (data.listing ?? "").split("\n").filter(Boolean);
      const parsed: LibEntry[] = lines.map((l) => {
        const isDir = l.startsWith("📁");
        const rest = l.replace(/^[📁📄]\s/, "");
        const sizeMatch = rest.match(/\((\d+)B\)$/);
        const name = rest.replace(/\s*\(\d+B\)$/, "").trim();
        return { name, isDir, size: sizeMatch ? parseInt(sizeMatch[1]) : undefined };
      });
      setEntries(parsed);
      setCurrentPath(p);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadDir(currentPath); }, []);

  const openFile = async (entry: LibEntry) => {
    if (entry.isDir) {
      loadDir(currentPath + "\\" + entry.name);
      return;
    }
    setLoading(true);
    setError(null);
    const fullPath = currentPath + "\\" + entry.name;
    try {
      const res = await fetch(
        `http://localhost:${HUB_PORT}/tools/read-file?path=${encodeURIComponent(fullPath)}`
      );
      const data = await res.json() as { ok: boolean; content?: string; error?: string };
      if (!data.ok) throw new Error(data.error ?? "Błąd odczytu");
      setFileContent(data.content ?? "");
      setFileName(entry.name);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  const goUp = () => {
    const parent = currentPath.split("\\").slice(0, -1).join("\\");
    if (parent) loadDir(parent);
  };

  return (
    <div className="jk-library-overlay">
      <div className="jk-library-panel">
        <div className="jk-library-hdr">
          <span>📚 Biblioteki — {currentPath.split("\\").pop()}</span>
          <button className="jk-icon-btn" onClick={onClose} style={{ marginLeft: "auto" }}>✕</button>
        </div>
        {error && <div className="jk-library-error">{error}</div>}
        {loading && <div className="jk-library-loading">⏳ Ładowanie…</div>}
        {!loading && !fileContent && (
          <>
            <div className="jk-library-path">{currentPath}</div>
            <div className="jk-library-list">
              <div className="jk-library-entry jk-library-entry--up" onClick={goUp}>
                ⬆ ..
              </div>
              {entries.map((e) => (
                <div
                  key={e.name}
                  className={`jk-library-entry${e.isDir ? " jk-library-entry--dir" : ""}`}
                  onClick={() => openFile(e)}
                >
                  {e.isDir ? "📁" : "📄"} {e.name}
                  {e.size !== undefined && <span className="jk-library-size"> {(e.size / 1024).toFixed(1)}KB</span>}
                </div>
              ))}
            </div>
          </>
        )}
        {fileContent !== null && (
          <div className="jk-library-file">
            <div className="jk-library-file-hdr">
              <button className="jk-icon-btn" onClick={() => setFileContent(null)}>← Wróć</button>
              <span style={{ marginLeft: 8, fontSize: 12, color: "#94a3b8" }}>{fileName}</span>
            </div>
            <pre className="jk-library-file-pre">{fileContent}</pre>
            <button
              className="jk-send-btn"
              style={{ margin: "8px", fontSize: "12px", padding: "6px 14px" }}
              onClick={() => {
                onInsert(`\`\`\`\n// ${fileName}\n${fileContent}\n\`\`\``);
                onClose();
              }}
            >
              📥 Wstaw do chatu
            </button>
          </div>
        )}
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
  currentUrl = "",
  floating = false,
  onClose,
  kbDocContext,
}) => {
  const store = useJimboKitStore();
  const [activeTab, setActiveTab] = useState<Tab>("chat");
  const [inputText, setInputText] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ── Bottom-edge drag resize (floating mode only) ──────────────────────────
  const [panelHeight, setPanelHeight] = useState(700);
  const isDraggingJK  = useRef(false);
  const jkDragStartY  = useRef(0);
  const jkDragStartH  = useRef(0);

  const onBottomDragMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingJK.current  = true;
    jkDragStartY.current  = e.clientY;
    jkDragStartH.current  = panelHeight;

    const onMove = (ev: MouseEvent) => {
      if (!isDraggingJK.current) return;
      // Drag down → bigger, drag up → smaller
      const delta = ev.clientY - jkDragStartY.current;
      const newH  = Math.min(Math.max(jkDragStartH.current + delta, 200), window.innerHeight * 0.92);
      setPanelHeight(newH);
    };
    const onUp = () => {
      isDraggingJK.current = false;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [panelHeight]);

  // Auto-scroll to bottom on new messages / live update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [store.messages.length, store.live?.content.length]);

  // Handle /clear command — when terminal adds marker, reset log
  useEffect(() => {
    const lastEntry = store.terminalLog[store.terminalLog.length - 1];
    if (lastEntry?.command === "/clear") {
      store.clearTerminalLog();
    }
  }, [store.terminalLog, store.clearTerminalLog]);

  // Gdy kbDocContext się zmienia → przełącz na chat
  useEffect(() => {
    if (kbDocContext) {
      setActiveTab("chat");
    }
  }, [kbDocContext]);

  const [showPrompts, setShowPrompts] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);

  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text) return;
    setInputText("");
    await store.sendMessage(text);
  }, [inputText, store]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend().catch(console.error);
    }
  }

  async function handleDeleteSession(key: string) {
    setDeleteConfirm(null);
    await store.deleteSession(key);
  }

  // Floating panel: position:absolute (inside browser-main) with variable height.
  // The CSS class sets position:fixed — inline style overrides it.
  const panelStyle: React.CSSProperties =
    floating && minimized
      ? { position: "absolute", width: "420px", height: "40px", overflow: "hidden", top: 0, right: 0 }
      : floating && activeTab === "pty"
        ? { position: "absolute", width: "660px", height: `${panelHeight}px`, top: 0, right: 0 }
        : floating
          ? { position: "absolute", width: "420px", height: `${panelHeight}px`, top: 0, right: 0 }
          : {};

  return (
    <div
      className={`jk-panel ${floating ? "jk-panel--floating" : ""}`}
      style={panelStyle}
    >
      {/* ── Bottom drag-resize handle (floating only) ── */}
      {floating && !minimized && (
        <div
          onMouseDown={onBottomDragMouseDown}
          style={{
            position:   "absolute",
            bottom:     0,
            left:       0,
            right:      0,
            height:     "5px",
            cursor:     "ns-resize",
            zIndex:     10,
            background: "transparent",
          }}
          title="Przeciągnij aby zmienić wysokość"
        />
      )}

      {/* ── Header ── */}
      <div className="jk-header">
        <div className="jk-header-left">
          {onClose && (
            <button
              className="jk-icon-btn"
              onClick={onClose}
              title="Zamknij panel"
            >
              ✕
            </button>
          )}
          <button
            className="jk-icon-btn"
            title="Menu"
            onClick={() => setShowMenu((v) => !v)}
          >
            ☰
          </button>
          <span className="jk-header-title">Jimbo_kit</span>
          <span
            className={`jk-conn-dot ${store.isConnected ? "jk-conn-dot--on" : "jk-conn-dot--off"}`}
            title={store.isConnected ? "WebSocket połączony" : "REST fallback"}
          />
        </div>
        <div className="jk-header-right">
          <span style={{ fontSize: "12px", color: "#8892b0", opacity: 0.9 }}>
            {TAB_META[activeTab].icon} {TAB_META[activeTab].label}
          </span>
          {floating && (
            <button
              className="jk-icon-btn"
              onClick={() => setMinimized(m => !m)}
              title={minimized ? "Przywróć panel" : "Minimalizuj panel"}
              style={{ marginLeft: "8px", fontSize: "13px" }}
            >
              {minimized ? "▲" : "▼"}
            </button>
          )}
        </div>
      </div>

      <div className="jk-body">
        {/* ── Hamburger menu ── */}
        {showMenu && (
          <HamburgerMenu
            activeTab={activeTab}
            onTab={setActiveTab}
            onClose={() => setShowMenu(false)}
            sessions={store.sessions}
            currentSessionId={store.currentSessionId}
            onNewSession={() => store.newSession()}
            onSwitchSession={(key) =>
              store.switchSession(key).catch(console.error)
            }
            onDeleteSession={(key) => setDeleteConfirm(key)}
            onShowPrompts={() => setShowPrompts(true)}
            onClearChat={() => {
              store.newSession();
              setShowMenu(false);
            }}
            isConnected={store.isConnected}
          />
        )}

        {/* ── Content area ── */}
        <div className="jk-content">
          {activeTab === "chat" && (
            <>
              {/* ── Chat toolbar ── */}
              <div className="jk-chat-toolbar">
                <button
                  className="jk-icon-btn"
                  title="Biblioteka promptów"
                  onClick={() => setShowPrompts(true)}
                >
                  📋 Szablony
                </button>
                <button
                  className="jk-icon-btn"
                  title="Biblioteki — przeglądaj lokalne pliki"
                  onClick={() => setShowLibrary((v) => !v)}
                  style={{ marginLeft: "4px" }}
                >
                  📚 Biblioteki
                </button>
              </div>
              {/* ── Library browser ── */}
              {showLibrary && (
                <LibraryBrowser
                  onInsert={(text) => {
                    setInputText((prev) => prev ? prev + "\n" + text : text);
                    setShowLibrary(false);
                  }}
                  onClose={() => setShowLibrary(false)}
                />
              )}
              <div className="jk-messages">
                {store.messages.length === 0 && !store.live && (
                  <div className="jk-empty-state">
                    <div className="jk-empty-icon"><img src={jimboAvatar} alt="J" style={{ width: 36, height: 36, objectFit: 'contain', opacity: 0.5 }} /></div>
                    <div>
                      Wyślij wiadomość aby rozpocząć rozmowę z Jimbo_kit
                    </div>
                  </div>
                )}
                {store.messages.map((msg, i) => (
                  <MessageBubble key={i} msg={msg} />
                ))}
                {store.live && (
                  <MessageBubble
                    msg={{
                      ...store.live,
                      role: "assistant",
                      timestamp: Date.now(),
                    }}
                    isLive
                    toolRunning={store.live.toolRunning}
                  />
                )}
                <div ref={messagesEndRef} />
              </div>
              <div className="jk-input-area">
                {kbDocContext && (
                  <div
                    style={{
                      background: "#1e1b4b",
                      border: "1px solid #7c3aed",
                      borderRadius: "8px",
                      padding: "10px 14px",
                      marginBottom: "8px",
                      fontSize: "12px",
                    }}
                  >
                    <div
                      style={{
                        color: "#a78bfa",
                        fontWeight: 700,
                        marginBottom: "6px",
                      }}
                    >
                      📄 Artykuł z KB Viewer:
                    </div>
                    <div
                      style={{
                        color: "#e2e8f0",
                        marginBottom: "8px",
                        lineHeight: 1.4,
                      }}
                    >
                      {kbDocContext.title}
                    </div>
                    {kbDocContext.url && (
                      <div
                        style={{
                          color: "#64748b",
                          fontSize: "11px",
                          marginBottom: "8px",
                        }}
                      >
                        🌐 {kbDocContext.url.slice(0, 60)}
                      </div>
                    )}
                    <div
                      style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}
                    >
                      {[
                        {
                          label: "✍️ Napisz artykuł",
                          prompt: `Na podstawie tego artykułu napisz po polsku profesjonalny artykuł blogowy:\n\nTytuł: ${kbDocContext.title}\nŹródło: ${kbDocContext.url}\nKategoria: ${kbDocContext.category}\n\nTreść:\n${kbDocContext.content.slice(0, 3000)}`,
                        },
                        {
                          label: "🔧 Plan integracji ZENO",
                          prompt: `Przeanalizuj poniższy artykuł i stwórz szczegółowy plan integracji tej technologii/narzędzia z projektem ZENO Browser (Electron + React + Vite + Cloudflare Workers AI):\n\nTytuł: ${kbDocContext.title}\nŹródło: ${kbDocContext.url}\n\nTreść:\n${kbDocContext.content.slice(0, 3000)}`,
                        },
                        {
                          label: "📋 Podsumuj",
                          prompt: `Podsumuj po polsku w 5 punktach najważniejsze informacje z artykułu:\n\nTytuł: ${kbDocContext.title}\n\nTreść:\n${kbDocContext.content.slice(0, 3000)}`,
                        },
                        {
                          label: "💡 Wnioski dla projektu",
                          prompt: `Co z tego artykułu możemy wykorzystać w projekcie ZENO Browser? Wymień konkretne zastosowania:\n\nTytuł: ${kbDocContext.title}\n\nTreść:\n${kbDocContext.content.slice(0, 3000)}`,
                        },
                      ].map(({ label, prompt }) => (
                        <button
                          key={label}
                          onClick={() => setInputText(prompt)}
                          style={{
                            padding: "4px 10px",
                            background: "#312e81",
                            color: "#c4b5fd",
                            border: "1px solid #4c1d95",
                            borderRadius: "6px",
                            fontSize: "11px",
                            cursor: "pointer",
                          }}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
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

          {activeTab === "terminal" && (
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

          {activeTab === "settings" && <ModelSettings />}
          {activeTab === "kb" && <KBTab onNavigate={onNavigate} />}
          {activeTab === "search" && <SearchTab onNavigate={onNavigate} />}
          {activeTab === "tunnels" && <TunnelsTab />}
          {activeTab === "pty" && (
            <Suspense
              fallback={
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    height: "100%",
                    color: "#64b5f6",
                    fontSize: "13px",
                  }}
                >
                  ⏳ Ładowanie terminala…
                </div>
              }
            >
              <TerminalPanel
                onClose={() => setActiveTab("chat")}
                onNavigate={onNavigate}
              />
            </Suspense>
          )}
        </div>
      </div>

      {/* ── Prompts modal ── */}
      {showPrompts && (
        <PromptsModal
          onUse={(prompt) => {
            setInputText(prompt);
            setActiveTab("chat");
          }}
          onClose={() => setShowPrompts(false)}
        />
      )}

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
                onClick={() =>
                  handleDeleteSession(deleteConfirm).catch(console.error)
                }
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
