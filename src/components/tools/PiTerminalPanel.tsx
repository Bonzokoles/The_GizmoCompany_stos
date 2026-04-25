/**
 * PiTerminalPanel — dedykowany terminal dla Ollama Pi agent
 *
 * Spawuje: ollama launch pi --model <wybrany>
 * Przez node-pty → xterm.js (ten sam mechanizm co TerminalPanel)
 *
 * Ikona ZENO jako tło terminala (opacity 0.1 = 90% przezroczystości)
 */

import { useState, useRef, useEffect, useCallback, type MouseEvent as ReactMouseEvent } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { type IDisposable } from "@xterm/xterm";
import "@xterm/xterm/css/xterm.css";
import zenoIcon from "../../assets/zeno-icon.png";

// ── Popularne marketplace agents/skills (fallback gdy brak zainstalowanych) ──
const MARKETPLACE_SKILLS = [
  { name: "frontend-code-review",  pkg: "@langgenius/frontend-code-review",  desc: "Code review React/TS" },
  { name: "code-review",           pkg: "code-review",                        desc: "General code review" },
  { name: "git-workflow",          pkg: "git-workflow",                        desc: "Git best practices" },
  { name: "typescript-expert",     pkg: "typescript-expert",                   desc: "TypeScript patterns" },
  { name: "react-patterns",        pkg: "react-patterns",                      desc: "React component patterns" },
  { name: "electron-security",     pkg: "electron-security",                   desc: "Electron security audit" },
  { name: "performance-optimizer", pkg: "performance-optimizer",               desc: "Perf analysis & fixes" },
  { name: "test-generator",        pkg: "test-generator",                      desc: "Auto-generate tests" },
];

const MARKETPLACE_AGENTS = [
  { name: "goose",     desc: "Block Goose — multi-step agent",   cmd: "goose" },
  { name: "pi",        desc: "Pi coding agent (self)",            cmd: "pi" },
  { name: "claude",    desc: "Claude Code — Anthropic agent",     cmd: "claude" },
  { name: "codex",     desc: "OpenAI Codex agent",                cmd: "codex" },
  { name: "gemini",    desc: "Google Gemini CLI agent",           cmd: "gemini" },
];

// Ścieżka do cli.js — rozwiązywana dynamicznie z app.getAppPath() (Electron)
// Fallback dla dev bez Electron: Z:/pi-mono (niezależna instalacja)
let PI_LOCAL = "Z:/pi-mono/packages/coding-agent/dist/cli.js";

// Pi obsługuje: google (default), anthropic, openai, openrouter
// NIE obsługuje: ollama (brak lokalnych modeli)
const PROVIDER_DEFAULTS: Record<string, { model: string; envKey: string; placeholder: string }> = {
  google:      { model: "gemini-2.5-flash",             envKey: "GOOGLE_API_KEY",      placeholder: "AIza..." },
  anthropic:   { model: "claude-3-5-haiku-20241022",    envKey: "ANTHROPIC_API_KEY",   placeholder: "sk-ant-..." },
  openrouter:  { model: "anthropic/claude-3.5-haiku",   envKey: "OPENROUTER_API_KEY",  placeholder: "sk-or-..." },
  openai:      { model: "gpt-4o-mini",                  envKey: "OPENAI_API_KEY",      placeholder: "sk-proj-..." },
};

interface PiTerminalPanelProps {
  onClose?: () => void;
  /** Called when user selects an agent from dropdown — opens AgentWorkspace */
  onSpawnAgent?: (agentName: string) => void;
  /** Active agents in AgentWorkspace — shown as AGENT_1/2/3 pills */
  workspaceAgents?: string[];
}

const isElectron = !!(window as Window & { electronAPI?: unknown }).electronAPI;

// Agent accent colours — match AgentWorkspacePanel
const AGENT_COLORS: Record<string, string> = {
  pi: "#00ffcc", goose: "#58a6ff", claude: "#d2a8ff", codex: "#ffa657", gemini: "#79c0ff",
};

export default function PiTerminalPanel({ onClose, onSpawnAgent, workspaceAgents = [] }: PiTerminalPanelProps) {
  const containerRef   = useRef<HTMLDivElement>(null);
  const termRef        = useRef<Terminal | null>(null);
  const fitRef         = useRef<FitAddon | null>(null);
  const ptyIdRef       = useRef<string | null>(null);
  const cleanupRef     = useRef<Array<() => void>>([]);

  const [running,       setRunning]       = useState(false);
  const [selectedModel, setModel]         = useState("gemini-2.5-flash");
  const [apiKey,        setApiKey]        = useState("");
  const [apiProvider,   setApiProvider]   = useState<"google" | "openrouter" | "anthropic" | "openai">("google");
  const [showSettings,  setShowSettings]  = useState(true);
  const [minimized,     setMinimized]     = useState(false);
  const [panelHeight,   setPanelHeight]   = useState(500);
  const isDragging   = useRef(false);
  const dragStartY   = useRef(0);
  const dragStartH   = useRef(0);

  // ── Skills / Agents dropdown state ───────────────────────────────────────
  const [showSkillsMenu,       setShowSkillsMenu]       = useState(false);
  const [showAgentsMenu,       setShowAgentsMenu]       = useState(false);
  const [installedSkills,      setInstalledSkills]      = useState<string[]>([]);
  const [skillSearch,          setSkillSearch]          = useState("");
  /** Which agent pill was last clicked — shown with brighter highlight */
  const [lastDelegatedAgent,   setLastDelegatedAgent]   = useState<string | null>(null);
  const skillsMenuRef = useRef<HTMLDivElement>(null);
  const agentsMenuRef = useRef<HTMLDivElement>(null);

  // Ustal ścieżkę do cli.js na podstawie app.getAppPath() (Electron)
  useEffect(() => {
    if (!isElectron) return;
    window.electronAPI?.system?.appGetPath?.().then((appPath: string) => {
      if (appPath) {
        // Normalizuj separatory — Windows używa \, node akceptuje /
        const normalized = appPath.replace(/\\/g, "/");
        PI_LOCAL = `${normalized}/pi-mono/packages/coding-agent/dist/cli.js`;
      }
    }).catch(() => {});
  }, []);

  // Aktualizuj model gdy zmienia się provider
  useEffect(() => {
    setModel(PROVIDER_DEFAULTS[apiProvider]?.model ?? "gemini-2.5-flash");
  }, [apiProvider]);

  // ── Load installed skills from ~/.agents/skills + ~/.pi/agent/skills ─────
  useEffect(() => {
    if (!isElectron) return;
    (async () => {
      const names: string[] = [];
      try {
        // Get home dir from env
        const home = (await window.electronAPI?.terminal?.getEnv?.("USERPROFILE")) as string
          || (await window.electronAPI?.terminal?.getEnv?.("HOME")) as string
          || "";
        const home_ = (home as string).replace(/\\/g, "/");
        const dirs = [
          `${home_}/.agents/skills`,
          `${home_}/.pi/agent/skills`,
          "U:/WWW_Zen_BRo_wser_org3/.pi/skills",
        ];
        for (const dir of dirs) {
          const res = await window.electronAPI?.file?.list?.(dir);
          if (res?.success) {
            res.entries
              .filter(e => e.type === "directory")
              .forEach(e => { if (!names.includes(e.name)) names.push(e.name); });
          }
        }
      } catch { /* silent */ }
      setInstalledSkills(names);
    })();
  }, []);

  // ── Close dropdowns on outside click ─────────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (skillsMenuRef.current && !skillsMenuRef.current.contains(e.target as Node))
        setShowSkillsMenu(false);
      if (agentsMenuRef.current && !agentsMenuRef.current.contains(e.target as Node))
        setShowAgentsMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Insert command into running Pi PTY ────────────────────────────────────
  const insertToPty = useCallback((text: string) => {
    const id = ptyIdRef.current;
    if (id && isElectron) {
      window.electronAPI!.terminal!.pty!.write(id, text);
    } else if (termRef.current) {
      termRef.current.writeln(`\x1b[33m[Hint] Uruchom Pi, a następnie użyj: ${text.trim()}\x1b[0m`);
    }
  }, []);

  const activateSkill = useCallback((skillName: string) => {
    insertToPty(`/skill:${skillName}\r`);
    setShowSkillsMenu(false);
  }, [insertToPty]);

  const installSkill = useCallback((pkg: string) => {
    // Insert install command — user confirms in PTY
    insertToPty(`npx agent-skills-cli install ${pkg} -t pi\r`);
    setShowSkillsMenu(false);
  }, [insertToPty]);

  const activateAgent = useCallback((agentName: string) => {
    setShowAgentsMenu(false);
    if (onSpawnAgent) {
      // Open agent in AgentWorkspace (main area panel)
      onSpawnAgent(agentName);
      if (termRef.current) {
        termRef.current.writeln(`\x1b[36m[Workspace] Otwieram ${agentName} w Agent Workspace...\x1b[0m`);
      }
    } else {
      // Fallback: insert command into PTY
      insertToPty(`${agentName} \r`);
    }
  }, [onSpawnAgent, insertToPty]);

  // Inicjalizuj xterm.js
  useEffect(() => {
    if (!containerRef.current) return;

    const term = new Terminal({
      theme: {
        background:          "#0d1117",
        foreground:          "#e6edf3",
        cursor:              "#58a6ff",
        selectionBackground: "#264f78",
        black:        "#0d1117", brightBlack:   "#6e7681",
        red:          "#ff7b72", brightRed:     "#ffa198",
        green:        "#3fb950", brightGreen:   "#56d364",
        yellow:       "#d29922", brightYellow:  "#e3b341",
        blue:         "#58a6ff", brightBlue:    "#79c0ff",
        magenta:      "#bc8cff", brightMagenta: "#d2a8ff",
        cyan:         "#39c5cf", brightCyan:    "#56d4dd",
        white:        "#b1bac4", brightWhite:   "#f0f6fc",
      },
      fontFamily: '"Cascadia Code", "Fira Code", Consolas, monospace',
      fontSize:   13,
      lineHeight: 1.3,
      cursorBlink: true,
      cursorStyle: "bar",
      scrollback:  10000,
      allowProposedApi: true,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.loadAddon(new WebLinksAddon());
    term.open(containerRef.current);
    fitAddon.fit();

    termRef.current = term;
    fitRef.current  = fitAddon;

    // Enable clipboard copy/paste in Electron
    const disposables: IDisposable[] = [];

    if (isElectron) {
      // Copy on selection (Ctrl+C handled by onKey, this is for mouse selection)
      disposables.push(term.onSelectionChange(() => {
        if (term.hasSelection()) {
          window.electronAPI.clipboard.writeText(term.getSelection());
        }
      }));

      // Handle Ctrl+C for copy, Ctrl+V for paste
      disposables.push(term.onKey(async (e) => {
        const ev = e.domEvent;
        if (ev.ctrlKey && ev.shiftKey && e.key === "C") { // Ctrl+Shift+C on Linux for copy
          if (term.hasSelection()) {
            await window.electronAPI.clipboard.writeText(term.getSelection());
            ev.preventDefault();
          }
        } else if (ev.ctrlKey && e.key === "C") { // Ctrl+C for copy (Windows/macOS), or interrupt
          if (term.hasSelection()) {
            await window.electronAPI.clipboard.writeText(term.getSelection());
            ev.preventDefault();
          } else if (ptyIdRef.current) {
            // If no selection, send Ctrl+C to the PTY
            window.electronAPI!.terminal!.pty!.write(ptyIdRef.current, "\x03");
            ev.preventDefault();
          }
        } else if (ev.ctrlKey && e.key === "V") { // Ctrl+V for paste
          if (ptyIdRef.current) {
            const text = await window.electronAPI.clipboard.readText();
            window.electronAPI!.terminal!.pty!.write(ptyIdRef.current, text);
            ev.preventDefault();
          } else {
            // Fallback for non-running PTY or plain terminal
            const text = await window.electronAPI.clipboard.readText();
            term.paste(text);
            ev.preventDefault();
          }
        }
      }));
    }

    if (!isElectron) {
      term.writeln("\x1b[33mPi Terminal dziala tylko w Electron.\x1b[0m");
      term.writeln("\x1b[36mUruchom ZENO Browser jako aplikacje desktopowa.\x1b[0m");
    } else {
      term.writeln("\x1b[36m Pi Agent Terminal\x1b[0m");
      term.writeln("\x1b[90mWybierz model i kliknij Launch\x1b[0m\r\n");
    }

    const ro = new ResizeObserver(() => {
      try { fitAddon.fit(); } catch { /* ignore */ }
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
  }, []);

  const onResizeMouseDown = useCallback((e: ReactMouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    dragStartY.current = e.clientY;
    dragStartH.current = panelHeight;

    const onMove = (ev: MouseEvent) => {
      if (!isDragging.current) return;
      const delta = dragStartY.current - ev.clientY; // drag up = bigger
      const newH = Math.min(Math.max(dragStartH.current + delta, 180), window.innerHeight * 0.8);
      setPanelHeight(newH);
    };
    const onUp = () => {
      isDragging.current = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [panelHeight]);

  const launch = useCallback(async () => {
    if (!isElectron || running || !termRef.current) return;
    const term   = termRef.current;
    const ptyAPI = window.electronAPI!.terminal!.pty!;

    // Env vars dla API providerów
    const env: Record<string, string> = {};
    if (apiProvider === "openrouter" && apiKey) {
      env.OPENROUTER_API_KEY = apiKey;
    } else if (apiProvider === "anthropic" && apiKey) {
      env.ANTHROPIC_API_KEY  = apiKey;
    } else if (apiProvider === "openai" && apiKey) {
      env.OPENAI_API_KEY     = apiKey;
    }

    // Pi args: --provider <name> --model <model>
    // Wspierane: google (default), anthropic, openai, openrouter
    const model = selectedModel || PROVIDER_DEFAULTS[apiProvider]?.model || "gemini-2.5-flash";
    const args: string[] = [PI_LOCAL, "--provider", apiProvider, "--model", model];

    term.writeln(`\r\n\x1b[32mPi v0.67.68 — ${apiProvider}/${model}\x1b[0m`);
    term.writeln(`\x1b[90m${PI_LOCAL}\x1b[0m\r\n`);

    const { cols, rows } = term;
    const result = await ptyAPI.create(cols, rows, undefined, {
      command: "node",
      args,
      env,
    });

    if (!result.success || !result.id) {
      term.writeln(`\x1b[31mBlad: ${result.error}\x1b[0m`);
      return;
    }

    const id = result.id;
    ptyIdRef.current = id;
    setRunning(true);
    setShowSettings(false);

    const offData    = ptyAPI.onData((sid, data)      => { if (sid === id) term.write(data); });
    const offExit    = ptyAPI.onExit((sid, code)      => {
      if (sid !== id) return;
      term.writeln(`\r\n\x1b[33m[Pi zakonczony — kod ${code}]\x1b[0m`);
      term.writeln("\x1b[90mKliknij Launch zeby uruchomic ponownie.\x1b[0m");
      ptyIdRef.current = null;
      setRunning(false);
      setShowSettings(true);
    });
    const disposeInput = term.onData((data) => ptyAPI.write(id, data));

    cleanupRef.current.push(
      () => offData(),
      () => offExit(),
      () => disposeInput.dispose(),
      () => { if (ptyIdRef.current) ptyAPI.kill(ptyIdRef.current); },
    );
  }, [running, selectedModel, apiKey, apiProvider]);

  const kill = useCallback(() => {
    if (ptyIdRef.current && isElectron)
      window.electronAPI?.terminal?.pty?.kill(ptyIdRef.current);
  }, []);

  // ── Shared button style (JimboKit-matching) ───────────────────────────────
  const btnBase: React.CSSProperties = {
    padding: "2px 9px", fontSize: "11px", borderRadius: 0,
    cursor: "pointer", fontFamily: "'JetBrains Mono','Fira Code',Consolas,monospace",
    border: "1px solid rgba(0,255,204,0.2)", background: "transparent",
    color: "#8892b0", transition: "color 0.15s, border-color 0.15s",
  };

  return (
    <div
      className="floating-panel"
      style={{
        position:      "absolute",
        bottom:        "0",
        left:          "0",
        width:         "680px",
        height:        minimized ? "40px" : `${panelHeight}px`,
        overflow:      "hidden",
        background:    "rgba(7,9,15,0.7)",
        borderRight:   "1px solid rgba(0,255,204,0.25)",
        borderTop:     "1px solid rgba(0,255,204,0.15)",
        borderBottom:  "none",
        borderLeft:    "none",
        borderRadius:  0,
        display:       "flex",
        flexDirection: "column",
        zIndex:        1000,
        boxShadow:     "8px 0 40px rgba(0,0,0,0.6)",
        color:         "#e6f1ff",
        fontFamily:    "'JetBrains Mono','Fira Code',Consolas,monospace",
      }}
    >
      {/* Resize handle — drag top edge to change height */}
      {!minimized && (
        <div
          onMouseDown={onResizeMouseDown}
          style={{
            position: "absolute", top: 0, left: 0, right: 0, height: "5px",
            cursor: "ns-resize", zIndex: 10, background: "transparent",
          }}
          title="Przeciągnij aby zmienić rozmiar"
        />
      )}

      {/* Header — JimboKit style */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 10px", height: "40px", flexShrink: 0,
        background: "#0b1325",
        borderBottom: "1px solid rgba(0,255,204,0.2)",
      }}>
        {/* Left */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "13px", fontWeight: 700, color: "#00ffcc", letterSpacing: "0.5px", textTransform: "uppercase" }}>
            π Pi Agent
          </span>
          <span style={{
            fontSize: "10px", letterSpacing: "0.3px",
            color:      running ? "#00ffcc" : "#4a5568",
            background: running ? "rgba(0,255,204,0.08)" : "rgba(255,255,255,0.04)",
            padding: "1px 7px", border: `1px solid ${running ? "rgba(0,255,204,0.3)" : "rgba(255,255,255,0.08)"}`,
          }}>
            {running ? "AKTYWNY" : "zatrzymany"}
          </span>
        </div>
        {/* Right — buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>

          {/* ── Skills dropdown ── */}
          <div ref={skillsMenuRef} style={{ position: "relative" }}>
            <button
              onClick={() => { setShowSkillsMenu(v => !v); setShowAgentsMenu(false); }}
              style={{ ...btnBase, color: showSkillsMenu ? "#00ffcc" : "#8892b0", borderColor: showSkillsMenu ? "rgba(0,255,204,0.5)" : "rgba(0,255,204,0.2)" }}
              title="Skills — zainstalowane i marketplace"
            >
              Skills {showSkillsMenu ? "▲" : "▼"}
            </button>
            {showSkillsMenu && (
              <div style={{
                position: "absolute", top: "calc(100% + 4px)", right: 0,
                width: "300px", background: "#0b1325",
                border: "1px solid rgba(0,255,204,0.25)",
                zIndex: 2000, fontFamily: "'JetBrains Mono','Fira Code',Consolas,monospace",
              }}>
                {/* Search input */}
                <div style={{ padding: "6px 8px", borderBottom: "1px solid rgba(0,255,204,0.1)" }}>
                  <input
                    autoFocus
                    value={skillSearch}
                    onChange={e => setSkillSearch(e.target.value)}
                    placeholder="Szukaj skill..."
                    style={{ width: "100%", background: "#07090f", border: "1px solid rgba(0,255,204,0.2)", color: "#e6f1ff", fontSize: "11px", padding: "3px 6px", fontFamily: "inherit", boxSizing: "border-box" }}
                  />
                </div>

                {/* Zainstalowane */}
                {installedSkills.length > 0 && (
                  <div>
                    <div style={{ padding: "4px 8px", fontSize: "10px", color: "#4a6a8a", borderBottom: "1px solid rgba(0,255,204,0.08)", background: "rgba(0,255,204,0.03)" }}>
                      ZAINSTALOWANE
                    </div>
                    {installedSkills
                      .filter(s => !skillSearch || s.toLowerCase().includes(skillSearch.toLowerCase()))
                      .map(name => (
                        <button key={name} onClick={() => activateSkill(name)}
                          style={{ display: "block", width: "100%", textAlign: "left", padding: "5px 10px", background: "transparent", border: "none", color: "#00ffcc", fontSize: "11px", cursor: "pointer", borderBottom: "1px solid rgba(0,255,204,0.05)" }}
                          onMouseEnter={e => { e.currentTarget.style.background = "rgba(0,255,204,0.06)"; }}
                          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                        >
                          /skill:{name}
                        </button>
                      ))
                    }
                  </div>
                )}

                {/* Marketplace */}
                <div>
                  <div style={{ padding: "4px 8px", fontSize: "10px", color: "#4a6a8a", borderBottom: "1px solid rgba(0,255,204,0.08)", background: "rgba(0,255,204,0.03)" }}>
                    MARKETPLACE — kliknij aby zainstalować
                  </div>
                  {MARKETPLACE_SKILLS
                    .filter(s => !skillSearch || s.name.toLowerCase().includes(skillSearch.toLowerCase()) || s.desc.toLowerCase().includes(skillSearch.toLowerCase()))
                    .map(s => (
                      <button key={s.pkg} onClick={() => installSkill(s.pkg)}
                        style={{ display: "block", width: "100%", textAlign: "left", padding: "5px 10px", background: "transparent", border: "none", color: "#8892b0", fontSize: "11px", cursor: "pointer", borderBottom: "1px solid rgba(0,255,204,0.04)" }}
                        onMouseEnter={e => { e.currentTarget.style.background = "rgba(0,255,204,0.06)"; e.currentTarget.style.color = "#e6f1ff"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#8892b0"; }}
                        title={`Zainstaluje: npx agent-skills-cli install ${s.pkg} -t pi`}
                      >
                        <span style={{ color: "#4a6a8a" }}>+ </span>{s.name}
                        <span style={{ float: "right", fontSize: "10px", color: "#2d4a5a" }}>{s.desc}</span>
                      </button>
                    ))
                  }
                </div>
              </div>
            )}
          </div>

          {/* ── Agents dropdown ── */}
          <div ref={agentsMenuRef} style={{ position: "relative" }}>
            <button
              onClick={() => { setShowAgentsMenu(v => !v); setShowSkillsMenu(false); }}
              style={{ ...btnBase, color: showAgentsMenu ? "#00ffcc" : "#8892b0", borderColor: showAgentsMenu ? "rgba(0,255,204,0.5)" : "rgba(0,255,204,0.2)" }}
              title="Agenci — deleguj zadanie do innego agenta"
            >
              Agents {showAgentsMenu ? "▲" : "▼"}
            </button>
            {showAgentsMenu && (
              <div style={{
                position: "absolute", top: "calc(100% + 4px)", right: 0,
                width: "260px", background: "#0b1325",
                border: "1px solid rgba(0,255,204,0.25)",
                zIndex: 2000, fontFamily: "'JetBrains Mono','Fira Code',Consolas,monospace",
              }}>
                <div style={{ padding: "4px 8px", fontSize: "10px", color: "#4a6a8a", borderBottom: "1px solid rgba(0,255,204,0.08)", background: "rgba(0,255,204,0.03)" }}>
                  DOSTĘPNI AGENCI
                </div>
                {MARKETPLACE_AGENTS.map(agent => (
                  <button key={agent.name} onClick={() => activateAgent(agent.name)}
                    style={{ display: "block", width: "100%", textAlign: "left", padding: "6px 10px", background: "transparent", border: "none", color: "#8892b0", fontSize: "11px", cursor: "pointer", borderBottom: "1px solid rgba(0,255,204,0.04)" }}
                    onMouseEnter={e => { e.currentTarget.style.background = "rgba(0,255,204,0.06)"; e.currentTarget.style.color = "#e6f1ff"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#8892b0"; }}
                    title={agent.desc}
                  >
                    <span style={{ color: "#00ffcc" }}>{agent.name}</span>
                    <span style={{ float: "right", fontSize: "10px", color: "#2d4a5a" }}>{agent.desc}</span>
                  </button>
                ))}
                <div style={{ padding: "6px 10px", borderTop: "1px solid rgba(0,255,204,0.08)" }}>
                  <div style={{ fontSize: "10px", color: "#2d4a5a" }}>
                    Kliknij → otwiera nowy terminal w Agent Workspace
                  </div>
                </div>
              </div>
            )}
          </div>

          <button onClick={() => setShowSettings(s => !s)} style={btnBase} title="Ustawienia providera">
            ustawienia
          </button>
          <button onClick={() => setMinimized(m => !m)} style={btnBase} title={minimized ? "Przywróć" : "Minimalizuj"}>
            {minimized ? "▲" : "▼"}
          </button>
          {running
            ? <button onClick={kill} style={{ ...btnBase, color: "#ff5555", borderColor: "rgba(255,85,85,0.4)" }}>
                stop
              </button>
            : <button onClick={launch} disabled={!isElectron} style={{
                ...btnBase,
                color: isElectron ? "#00ffcc" : "#4a5568",
                borderColor: isElectron ? "rgba(0,255,204,0.5)" : "rgba(255,255,255,0.08)",
                background: isElectron ? "rgba(0,255,204,0.06)" : "transparent",
                cursor: isElectron ? "pointer" : "not-allowed",
              }}>
                launch
              </button>
          }
          {onClose && (
            <button onClick={onClose} style={{ ...btnBase, fontSize: "14px", padding: "0 8px" }} title="Zamknij">
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Settings */}
      {showSettings && (
        <div style={{
          padding: "10px 12px", flexShrink: 0, display: "flex", flexDirection: "column", gap: "8px",
          background: "#0b1325", borderBottom: "1px solid rgba(0,255,204,0.1)",
        }}>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <label style={{ fontSize: "11px", color: "#4a6a8a", width: "70px", flexShrink: 0 }}>Provider:</label>
            <select value={apiProvider} onChange={e => setApiProvider(e.target.value as "google" | "openrouter" | "anthropic" | "openai")}
              style={{ background: "#07090f", border: "1px solid rgba(0,255,204,0.2)", borderRadius: 0, color: "#e6f1ff", fontSize: "11px", padding: "3px 6px", fontFamily: "inherit" }}>
              <option value="google">Google Gemini  (GOOGLE_API_KEY)</option>
              <option value="openrouter">OpenRouter  (OPENROUTER_API_KEY)</option>
              <option value="anthropic">Anthropic  (ANTHROPIC_API_KEY)</option>
              <option value="openai">OpenAI  (OPENAI_API_KEY)</option>
            </select>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <label style={{ fontSize: "11px", color: "#4a6a8a", width: "70px", flexShrink: 0 }}>Model:</label>
            <input
              value={selectedModel}
              onChange={e => setModel(e.target.value)}
              placeholder={PROVIDER_DEFAULTS[apiProvider]?.model ?? "gemini-2.5-flash"}
              style={{ flex: 1, background: "#07090f", border: "1px solid rgba(0,255,204,0.2)", borderRadius: 0, color: "#e6f1ff", fontSize: "11px", padding: "3px 6px", fontFamily: "inherit" }}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <label style={{ fontSize: "11px", color: "#4a6a8a", width: "70px", flexShrink: 0 }}>API Key:</label>
            <input
              type="password"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder={`${PROVIDER_DEFAULTS[apiProvider]?.envKey} lub zostaw puste jeśli w env`}
              style={{
                flex: 1, background: "#07090f", fontFamily: "inherit",
                border: `1px solid ${apiKey ? "rgba(0,255,204,0.5)" : "rgba(0,255,204,0.2)"}`,
                borderRadius: 0, color: "#e6f1ff", fontSize: "11px", padding: "3px 6px",
              }}
            />
          </div>

          <div style={{ fontSize: "10px", color: "#2d4a5a", letterSpacing: "0.3px" }}>
            Ctrl+C — zatrzymaj zadanie &nbsp;·&nbsp; /help — lista komend Pi
          </div>
        </div>
      )}

      {/* Terminal + ikona ZENO jako tło */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        {/* Tło — ikona ZENO, 90% przezroczystości */}
        <div style={{
          position:           "absolute",
          inset:              0,
          backgroundImage:    `url(${zenoIcon})`,
          backgroundRepeat:   "no-repeat",
          backgroundPosition: "center",
          backgroundSize:     "45%",
          opacity:            0.10,
          pointerEvents:      "none",
          zIndex:             0,
        }} />
        {/* xterm.js */}
        <div ref={containerRef} style={{ position: "absolute", inset: "4px", zIndex: 1 }} />
      </div>

      {/* ── AGENT_1 / AGENT_2 / AGENT_3 pills — click to delegate task ── */}
      {workspaceAgents.length > 0 && (
        <div style={{
          display:       "flex",
          alignItems:    "center",
          gap:           "5px",
          padding:       "4px 10px",
          flexShrink:    0,
          background:    "rgba(7,9,15,0.65)",
          borderTop:     "1px solid rgba(0,255,204,0.1)",
          flexWrap:      "wrap",
        }}>
          <span style={{ fontSize: "9px", color: "#2d4a5a", fontFamily: "'JetBrains Mono',monospace", marginRight: "2px" }}>
            delegate:
          </span>
          {workspaceAgents.map((agentName, i) => {
            const color   = AGENT_COLORS[agentName] ?? "#8892b0";
            const label   = `AGENT_${i + 1}`;
            const isActive = lastDelegatedAgent === agentName;
            return (
              <button
                key={agentName}
                title={`Zlec zadanie do ${agentName}\nworkspace: U:/WWW_Zen_BRo_wser_tool/agents/${agentName}`}
                onClick={() => {
                  setLastDelegatedAgent(agentName);
                  insertToPty(
                    `\r\n──── [${label}: ${agentName.toUpperCase()}] workspace: U:/WWW_Zen_BRo_wser_tool/agents/${agentName} ────\nZlec zadanie: `
                  );
                }}
                style={{
                  background:    isActive ? `${color}28` : `${color}0d`,
                  border:        `1px solid ${isActive ? color + "99" : color + "44"}`,
                  color:         isActive ? color : color + "aa",
                  fontSize:      "10px",
                  padding:       "2px 9px",
                  cursor:        "pointer",
                  fontFamily:    "'JetBrains Mono','Fira Code',monospace",
                  borderRadius:  0,
                  letterSpacing: "0.3px",
                  transition:    "all 0.15s",
                  boxShadow:     isActive ? `0 0 6px ${color}40` : "none",
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = `${color}1a`; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = `${color}0d`; }}
              >
                {label}
                <span style={{ opacity: isActive ? 0.85 : 0.5, fontSize: "9px", marginLeft: "4px" }}>
                  {agentName}
                </span>
                {isActive && (
                  <span style={{ fontSize: "8px", marginLeft: "3px", opacity: 0.7 }}>●</span>
                )}
              </button>
            );
          })}
          {workspaceAgents.length > 1 && (
            <button
              title="Pi automatycznie przydzieli zadania do wszystkich agentów"
              onClick={() => {
                setLastDelegatedAgent(null);
                const list = workspaceAgents.map((a, i) => `AGENT_${i + 1}=${a}`).join(", ");
                insertToPty(
                  `\r\n──── [PIPELINE: ${list}] ────\nPodziel następne zadanie między agentów i przydziel każdemu etap. Zadanie: `
                );
              }}
              style={{
                background:   "rgba(0,255,204,0.06)",
                border:       "1px solid rgba(0,255,204,0.3)",
                color:        "#00ffcc",
                fontSize:     "9px",
                padding:      "2px 8px",
                cursor:       "pointer",
                fontFamily:   "'JetBrains Mono',monospace",
                borderRadius: 0,
                marginLeft:   "4px",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(0,255,204,0.14)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(0,255,204,0.06)"; }}
            >
              ⚡ AUTO PIPELINE
            </button>
          )}
        </div>
      )}

    </div>
  );
}
