/**
 * AgentWorkspacePanel — agent sandbox cards over the ZENO graphic
 *
 * Renders as transparent position:absolute inside browser-main.
 * Cards float ONLY over the graphic area; pointer-events pass through
 * to the graphic where there are no cards.
 * Supports 1–3 agent columns, each with its own PTY session.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";

// ── Constants ─────────────────────────────────────────────────────────────────

/** CWD base — each agent gets its own subfolder */
const WORKSPACE_BASE = "U:/WWW_Zen_BRo_wser_tool/agents";

const isElectron = !!(window as Window & { electronAPI?: unknown }).electronAPI;

interface AgentDef {
  name:    string;
  icon:    string;
  command: string;
  args:    string[];
  desc:    string;
  color:   string;   // header accent colour
}

const AGENT_DEFS: AgentDef[] = [
  { name: "pi",     icon: "π",  command: "npx",    args: ["pi"],   desc: "Pi coding agent",     color: "#00ffcc" },
  { name: "goose",  icon: "🪿", command: "goose",  args: [],       desc: "Block Goose",          color: "#58a6ff" },
  { name: "claude", icon: "◈",  command: "claude", args: [],       desc: "Claude Code",          color: "#d2a8ff" },
  { name: "codex",  icon: "⌘",  command: "codex",  args: [],       desc: "OpenAI Codex",         color: "#ffa657" },
  { name: "gemini", icon: "✦",  command: "gemini", args: [],       desc: "Gemini CLI",           color: "#79c0ff" },
];

function getDef(name: string): AgentDef {
  return AGENT_DEFS.find(d => d.name === name) ?? AGENT_DEFS[0];
}

// ── Shared mini-button style ──────────────────────────────────────────────────

const btn = (color = "#8892b0", border = "rgba(0,255,204,0.2)"): React.CSSProperties => ({
  background:   "transparent",
  border:       `1px solid ${border}`,
  color,
  fontSize:     "10px",
  padding:      "2px 8px",
  cursor:       "pointer",
  fontFamily:   "'JetBrains Mono','Fira Code',Consolas,monospace",
  borderRadius: 0,
});

// ── AgentColumn ───────────────────────────────────────────────────────────────

interface AgentColumnProps {
  agentName: string;
  workspaceDir: string;
  onRemove: () => void;
}

function AgentColumn({ agentName, workspaceDir, onRemove }: AgentColumnProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef      = useRef<Terminal | null>(null);
  const fitRef       = useRef<FitAddon | null>(null);
  const ptyIdRef     = useRef<string | null>(null);
  const cleanupRef   = useRef<Array<() => void>>([]);
  const [running, setRunning] = useState(false);

  const def = getDef(agentName);

  useEffect(() => {
    if (!containerRef.current) return;

    const term = new Terminal({
      theme: {
        background:          "transparent",
        foreground:          "#cdd9e5",
        cursor:              def.color,
        selectionBackground: "rgba(0,255,204,0.18)",
        black:   "#0d1117", brightBlack:   "#6e7681",
        red:     "#ff7b72", brightRed:     "#ffa198",
        green:   "#3fb950", brightGreen:   "#56d364",
        yellow:  "#d29922", brightYellow:  "#e3b341",
        blue:    "#58a6ff", brightBlue:    "#79c0ff",
        magenta: "#bc8cff", brightMagenta: "#d2a8ff",
        cyan:    "#39c5cf", brightCyan:    "#56d4dd",
        white:   "#b1bac4", brightWhite:   "#f0f6fc",
      },
      fontFamily:       '"JetBrains Mono","Fira Code",Consolas,monospace',
      fontSize:         12,
      lineHeight:       1.3,
      cursorBlink:      true,
      cursorStyle:      "bar",
      scrollback:       5000,
      allowProposedApi: true,
    });

    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(containerRef.current);
    fit.fit();
    termRef.current = term;
    fitRef.current  = fit;

    if (isElectron) {
      term.writeln(`\x1b[1m${def.icon} ${agentName.toUpperCase()}\x1b[0m`);
      term.writeln(`\x1b[90mworkspace: ${workspaceDir}\x1b[0m`);
      term.writeln(`\x1b[90m── Launch aby uruchomić ──\x1b[0m\r\n`);
    } else {
      term.writeln("\x1b[33mTylko w trybie Electron.\x1b[0m");
    }

    const ro = new ResizeObserver(() => {
      try { fit.fit(); } catch { /* ignore */ }
      if (ptyIdRef.current && isElectron) {
        const { cols, rows } = term;
        window.electronAPI?.terminal?.pty?.resize(ptyIdRef.current, cols, rows);
      }
    });
    if (containerRef.current) ro.observe(containerRef.current);
    cleanupRef.current.push(() => ro.disconnect());

    return () => {
      cleanupRef.current.forEach(fn => fn());
      cleanupRef.current = [];
      term.dispose();
    };
  }, [agentName]);

  const launch = useCallback(async () => {
    if (!isElectron || running || !termRef.current) return;
    const term   = termRef.current;
    const ptyAPI = window.electronAPI!.terminal!.pty!;

    term.writeln(`\r\n\x1b[32mStarting ${agentName}...\x1b[0m`);
    term.writeln(`\x1b[90m${workspaceDir}\x1b[0m\r\n`);

    const { cols, rows } = term;
    const result = await ptyAPI.create(cols, rows, workspaceDir, {
      command: def.command,
      args:    def.args,
      env:     {},
    });

    if (!result.success || !result.id) {
      term.writeln(`\x1b[31mError: ${result.error ?? "spawn failed"}\x1b[0m`);
      return;
    }

    const id = result.id;
    ptyIdRef.current = id;
    setRunning(true);

    const offData   = ptyAPI.onData((sid, data) => { if (sid === id) term.write(data); });
    const offExit   = ptyAPI.onExit((sid, code) => {
      if (sid !== id) return;
      term.writeln(`\r\n\x1b[33m[${agentName} exited — code ${code}]\x1b[0m`);
      ptyIdRef.current = null;
      setRunning(false);
    });
    const dispInput = term.onData(data => ptyAPI.write(id, data));

    cleanupRef.current.push(
      () => offData(),
      () => offExit(),
      () => dispInput.dispose(),
      () => { if (ptyIdRef.current) ptyAPI.kill(ptyIdRef.current); },
    );
  }, [running, agentName, def, workspaceDir]);

  const kill = useCallback(() => {
    if (ptyIdRef.current && isElectron)
      window.electronAPI?.terminal?.pty?.kill(ptyIdRef.current);
  }, []);

  return (
    <div style={{
      flex:            1,
      display:         "flex",
      flexDirection:   "column",
      background:      "rgba(7,9,15,0.14)",
      backdropFilter:  "blur(5px)",
      WebkitBackdropFilter: "blur(5px)",
      border:          `1px solid ${def.color}22`,
      borderTop:       `2px solid ${def.color}55`,
      overflow:        "hidden",
      minWidth:        0,
    }}>
      {/* Column header */}
      <div style={{
        display:        "flex",
        alignItems:     "center",
        justifyContent: "space-between",
        padding:        "5px 10px",
        flexShrink:     0,
        background:     "rgba(11,19,37,0.45)",
        borderBottom:   `1px solid ${def.color}22`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
          <span style={{ fontSize: "12px", fontWeight: 700, color: def.color, fontFamily: "'JetBrains Mono',monospace", letterSpacing: "0.5px" }}>
            {def.icon} {agentName.toUpperCase()}
          </span>
          <span style={{
            fontSize:   "9px", padding: "0 5px",
            color:      running ? def.color : "#4a5568",
            background: running ? `${def.color}12` : "transparent",
            border:     `1px solid ${running ? def.color + "44" : "rgba(255,255,255,0.06)"}`,
          }}>
            {running ? "AKTYWNY" : "off"}
          </span>
        </div>
        <div style={{ display: "flex", gap: "3px" }}>
          {running
            ? <button style={btn("#ff5555", "rgba(255,85,85,0.35)")} onClick={kill}>stop</button>
            : <button style={btn(def.color, `${def.color}66`)} onClick={launch} disabled={!isElectron}>launch</button>
          }
          <button style={btn("#ff5555", "rgba(255,85,85,0.25)")} onClick={onRemove} title="Usuń">✕</button>
        </div>
      </div>

      {/* xterm canvas — transparent so ZENO graphic shows through */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden", background: "transparent" }}>
        <div ref={containerRef} style={{ position: "absolute", inset: "2px" }} />
      </div>
    </div>
  );
}

// ── AgentWorkspacePanel ───────────────────────────────────────────────────────

interface AgentSession {
  id:        string;
  agentName: string;
}

export interface AgentWorkspacePanelProps {
  onClose:        () => void;
  initialAgents?: string[];
}

export function AgentWorkspacePanel({ onClose, initialAgents = [] }: AgentWorkspacePanelProps) {
  const [sessions,     setSessions]     = useState<AgentSession[]>(() =>
    initialAgents.map(name => ({ id: `${name}-${Date.now()}`, agentName: name }))
  );
  const [showAddMenu,  setShowAddMenu]  = useState(sessions.length === 0);
  const [pipelineTask, setPipelineTask] = useState("");
  const [showPipeline, setShowPipeline] = useState(false);
  const [cardHeight,   setCardHeight]   = useState(460);
  const addMenuRef = useRef<HTMLDivElement>(null);

  // Sync new agents spawned while panel is already open
  useEffect(() => {
    if (!initialAgents.length) return;
    setSessions(prev => {
      const existing = new Set(prev.map(s => s.agentName));
      const toAdd    = initialAgents
        .filter(a => !existing.has(a))
        .map(a => ({ id: `${a}-${Date.now()}`, agentName: a }));
      if (!toAdd.length) return prev;
      return [...prev, ...toAdd].slice(0, 3);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialAgents.join(",")]);

  // Close add-menu on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node))
        setShowAddMenu(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const addAgent = useCallback((agentName: string) => {
    if (sessions.length >= 3) return;
    if (sessions.some(s => s.agentName === agentName)) return;
    setSessions(prev => [...prev, { id: `${agentName}-${Date.now()}`, agentName }]);
    setShowAddMenu(false);
  }, [sessions]);

  const removeSession = useCallback((id: string) => {
    setSessions(prev => prev.filter(s => s.id !== id));
  }, []);

  const existingNames   = new Set(sessions.map(s => s.agentName));
  const availableAgents = AGENT_DEFS.filter(d => !existingNames.has(d.name));

  const headerBtn = (label: string, active?: boolean): React.CSSProperties => ({
    ...btn(active ? "#00ffcc" : "#8892b0", active ? "rgba(0,255,204,0.45)" : "rgba(0,255,204,0.2)"),
  });

  return (
    /*
     * OUTER CONTAINER — fully transparent, pointer-events: none so the ZENO
     * graphic below is still clickable. Only the actual card elements and the
     * header bar have pointer-events: all.
     */
    <div style={{
      position:      "absolute",
      inset:         0,
      display:       "flex",
      flexDirection: "column",
      zIndex:        10,
      pointerEvents: "none",   // graphic clickable through gaps
    }}>

      {/* ── Narrow header bar ── */}
      <div style={{
        display:        "flex",
        alignItems:     "center",
        justifyContent: "space-between",
        padding:        "0 12px",
        height:         "34px",
        flexShrink:     0,
        background:     "rgba(7,9,15,0.55)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        borderBottom:   "1px solid rgba(0,255,204,0.15)",
        pointerEvents:  "all",
      }}>
        <span style={{ color: "#00ffcc", fontSize: "11px", fontWeight: 700, letterSpacing: "1px", fontFamily: "'JetBrains Mono',monospace" }}>
          ⚡ AGENT WORKSPACE
        </span>

        <div style={{ display: "flex", gap: "5px", alignItems: "center" }}>
          {/* Card height slider */}
          <span style={{ fontSize: "9px", color: "#2d4a5a", fontFamily: "'JetBrains Mono',monospace" }}>{cardHeight}px</span>
          <input
            type="range" min="220" max="700" value={cardHeight}
            onChange={e => setCardHeight(+e.target.value)}
            style={{ width: "70px", accentColor: "#00ffcc", cursor: "pointer" }}
            title="Wysokość kart"
          />

          <button style={headerBtn("Pipeline ▾", showPipeline)} onClick={() => setShowPipeline(v => !v)}
            title="Pipeline — zadanie do wszystkich agentów">
            Pipeline {showPipeline ? "▲" : "▾"}
          </button>

          {/* Add agent */}
          {sessions.length < 3 && (
            <div ref={addMenuRef} style={{ position: "relative" }}>
              <button style={{ ...headerBtn("+ Agent"), color: "#00ffcc", background: "rgba(0,255,204,0.05)" }}
                onClick={() => setShowAddMenu(v => !v)}>
                + Agent
              </button>
              {showAddMenu && availableAgents.length > 0 && (
                <div style={{
                  position: "absolute", top: "calc(100% + 4px)", right: 0,
                  width: "210px", background: "#0b1325", border: "1px solid rgba(0,255,204,0.25)", zIndex: 100,
                }}>
                  <div style={{ padding: "4px 8px", fontSize: "9px", color: "#4a6a8a", borderBottom: "1px solid rgba(0,255,204,0.08)" }}>
                    DOSTĘPNI AGENCI
                  </div>
                  {availableAgents.map(def => (
                    <button key={def.name} onClick={() => addAgent(def.name)} style={{
                      display: "block", width: "100%", textAlign: "left",
                      padding: "6px 10px", background: "transparent", border: "none",
                      borderBottom: "1px solid rgba(0,255,204,0.05)",
                      color: "#e6f1ff", fontSize: "11px", cursor: "pointer",
                      fontFamily: "'JetBrains Mono',monospace",
                    }}
                      onMouseEnter={e => { e.currentTarget.style.background = "rgba(0,255,204,0.07)"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                    >
                      <span style={{ color: def.color }}>{def.icon} {def.name}</span>
                      <span style={{ float: "right", color: "#4a6a8a", fontSize: "10px" }}>{def.desc}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <button style={btn("#ff5555", "rgba(255,85,85,0.3)")} onClick={onClose}>✕</button>
        </div>
      </div>

      {/* ── Pipeline row ── */}
      {showPipeline && (
        <div style={{
          display: "flex", alignItems: "center", gap: "8px",
          padding: "5px 12px", background: "rgba(7,9,15,0.68)",
          backdropFilter: "blur(8px)", borderBottom: "1px solid rgba(0,255,204,0.08)",
          flexShrink: 0, pointerEvents: "all",
        }}>
          <span style={{ fontSize: "10px", color: "#4a6a8a", fontFamily: "'JetBrains Mono',monospace", whiteSpace: "nowrap" }}>Zadanie:</span>
          <input
            value={pipelineTask}
            onChange={e => setPipelineTask(e.target.value)}
            placeholder="np. Napisz komponent React dla formularza kontaktowego…"
            style={{
              flex: 1, background: "rgba(7,9,15,0.9)", border: "1px solid rgba(0,255,204,0.2)",
              color: "#e6f1ff", fontSize: "11px", padding: "4px 8px",
              fontFamily: "'JetBrains Mono',monospace", borderRadius: 0, outline: "none",
            }}
            onKeyDown={e => { if (e.key === "Enter" && pipelineTask.trim()) setPipelineTask(""); }}
          />
          <span style={{ fontSize: "9px", color: "#2d4a5a", fontFamily: "'JetBrains Mono',monospace" }}>Enter → do wszystkich</span>
        </div>
      )}

      {/* ── Cards row — transparent gaps show ZENO graphic ── */}
      {sessions.length === 0 ? (
        /* Empty state: agent picker buttons, floating over graphic */
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", gap: "16px",
          padding: "40px",
          pointerEvents: "all",
          background: "rgba(7,9,15,0.55)",
          backdropFilter: "blur(6px)",
          margin: "20px",
          border: "1px solid rgba(0,255,204,0.12)",
        }}>
          <span style={{ color: "#4a6a8a", fontSize: "12px", fontFamily: "'JetBrains Mono',monospace" }}>
            Wybierz agenta aby otworzyć sandbox
          </span>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "center" }}>
            {AGENT_DEFS.map(def => (
              <button key={def.name} onClick={() => addAgent(def.name)} style={{
                ...btn(def.color, `${def.color}55`),
                padding: "7px 18px", fontSize: "11px", background: `${def.color}08`,
              }}
                onMouseEnter={e => { e.currentTarget.style.background = `${def.color}18`; }}
                onMouseLeave={e => { e.currentTarget.style.background = `${def.color}08`; }}
              >
                {def.icon} {def.name}
              </button>
            ))}
          </div>
          <span style={{ fontSize: "9px", color: "#2d4a5a", fontFamily: "'JetBrains Mono',monospace" }}>
            Workspace: {WORKSPACE_BASE}/&lt;agent&gt;
          </span>
        </div>
      ) : (
        /*
         * Cards — height controlled by slider; the area BELOW the cards is
         * transparent so the ZENO orbit graphic shows through.
         */
        <div style={{
          display:       "flex",
          gap:           "6px",
          padding:       "6px 8px 0",
          alignItems:    "flex-start",
          pointerEvents: "none",  // cards set their own pointer-events
          flexShrink:    0,
        }}>
          {sessions.map(s => (
            <div key={s.id} style={{
              flex:          1,
              height:        `${cardHeight}px`,
              display:       "flex",
              flexDirection: "column",
              pointerEvents: "all",
              overflow:      "hidden",
            }}>
              <AgentColumn
                agentName={s.agentName}
                workspaceDir={`${WORKSPACE_BASE}/${s.agentName}`}
                onRemove={() => removeSession(s.id)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
