/**
 * TerminalPanel — xterm.js + node-pty real terminal
 * Tabs: 🖥 Terminal | ⚡ JS | 📋 Komendy
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { SearchAddon } from "@xterm/addon-search";
import "@xterm/xterm/css/xterm.css";

interface TerminalPanelProps {
  onClose: () => void;
  onNavigate?: (url: string) => void;
}

type TerminalTab = "shell" | "js" | "commands";

// ── Command Palette data ───────────────────────────────────────

interface QuickCommand {
  label: string;
  cmd: string;
  icon: string;
  description: string;
}
interface CommandCategory {
  name: string;
  icon: string;
  commands: QuickCommand[];
}

const COMMAND_CATEGORIES: CommandCategory[] = [
  {
    name: "System",
    icon: "💻",
    commands: [
      { label: "Info systemowe", cmd: 'systeminfo | Select-String "OS Name|OS Version|System Type|Total Physical Memory"', icon: "🖥", description: "OS i pamięć" },
      { label: "Dyski", cmd: "Get-PSDrive -PSProvider FileSystem | Format-Table Name,Used,Free,Root -AutoSize", icon: "💾", description: "Wolne miejsce" },
      { label: "Procesy (Top 10)", cmd: "Get-Process | Sort-Object CPU -Descending | Select-Object -First 10 Name,Id,CPU,WorkingSet | Format-Table -AutoSize", icon: "📊", description: "Procesy wg CPU" },
      { label: "Pamięć RAM", cmd: '[math]::Round((Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory/1MB,1).ToString() + " GB wolne / " + [math]::Round((Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory/1GB,1).ToString() + " GB"', icon: "🧠", description: "Użycie RAM" },
      { label: "Uptime", cmd: '(Get-Date) - (Get-CimInstance Win32_OperatingSystem).LastBootUpTime | ForEach-Object { "$($_.Days)d $($_.Hours)h $($_.Minutes)m" }', icon: "⏱", description: "Czas działania" },
    ],
  },
  {
    name: "Sieć",
    icon: "🌐",
    commands: [
      { label: "Adres IP", cmd: 'Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notmatch "Loopback" } | Select-Object InterfaceAlias,IPAddress | Format-Table -AutoSize', icon: "📡", description: "Adresy IP" },
      { label: "Ping Google", cmd: "Test-Connection google.com -Count 3 | Format-Table Address,Latency -AutoSize", icon: "🏓", description: "Sprawdź łączność" },
      { label: "Otwarte porty", cmd: "Get-NetTCPConnection -State Listen | Select-Object -First 15 LocalPort,OwningProcess | Sort-Object LocalPort | Format-Table -AutoSize", icon: "🚪", description: "Nasłuchujące porty" },
      { label: "Publiczne IP", cmd: '(Invoke-RestMethod -Uri "https://api.ipify.org?format=json" -TimeoutSec 5).ip', icon: "🌍", description: "Twoje publiczne IP" },
    ],
  },
  {
    name: "Git",
    icon: "🔀",
    commands: [
      { label: "Status", cmd: "git status --short", icon: "📋", description: "Stan repozytorium" },
      { label: "Log (10)", cmd: "git log --oneline -10 --graph --decorate", icon: "📜", description: "Ostatnie 10 commitów" },
      { label: "Branch", cmd: "git branch -a", icon: "🌿", description: "Lista gałęzi" },
      { label: "Diff", cmd: "git diff --stat", icon: "📊", description: "Statystyki zmian" },
    ],
  },
  {
    name: "Podman / Docker",
    icon: "🐳",
    commands: [
      { label: "Kontenery", cmd: 'docker ps --format "table {{.Names}}\\t{{.Status}}\\t{{.Ports}}"', icon: "📦", description: "Działające kontenery" },
      { label: "Obrazy", cmd: 'docker images --format "table {{.Repository}}\\t{{.Tag}}\\t{{.Size}}"', icon: "💿", description: "Lokalne obrazy" },
      { label: "Stats", cmd: 'docker stats --no-stream --format "table {{.Name}}\\t{{.CPUPerc}}\\t{{.MemUsage}}"', icon: "📊", description: "CPU/RAM kontenerów" },
    ],
  },
  {
    name: "NPM / Node",
    icon: "📦",
    commands: [
      { label: "Wersje", cmd: 'Write-Output "Node: $(node -v)"; Write-Output "NPM: $(npm -v)"', icon: "📌", description: "Wersje" },
      { label: "Outdated", cmd: "npm outdated 2>$null", icon: "⚡", description: "Przestarzałe pakiety" },
      { label: "Audyt", cmd: 'npm audit --omit=dev 2>$null | Select-String "found|severity"', icon: "🔒", description: "Audyt bezpieczeństwa" },
    ],
  },
  {
    name: "ZENO Browser",
    icon: "⚡",
    commands: [
      { label: "Build dev", cmd: "npm run dev", icon: "🔧", description: "Serwer deweloperski" },
      { label: "Build prod", cmd: "npm run build", icon: "📦", description: "Build produkcyjny" },
      { label: "TS Check", cmd: "npx tsc --noEmit", icon: "✅", description: "Sprawdź typy" },
      { label: "Lint", cmd: "npx eslint src/ --ext .ts,.tsx 2>$null", icon: "🔍", description: "ESLint" },
      { label: "Tests", cmd: "npm run test:unit", icon: "🧪", description: "Testy jednostkowe" },
    ],
  },
  {
    name: "JIMBO Hub",
    icon: "◆",
    commands: [
      { label: "Health", cmd: "curl -s http://localhost:4224/health", icon: "💚", description: "Status JIMBO HUB" },
      { label: "Skills lista", cmd: 'curl -s http://localhost:4224/skills/list | python -c "import sys,json; d=json.load(sys.stdin); [print(f\'{s[\\\"namespace\\\"]}/{s[\\\"name\\\"]}\') for s in d[\\\"skills\\\"]]"', icon: "📚", description: "Skills w DB" },
      { label: "Memory core", cmd: "curl -s http://localhost:4224/memory/core", icon: "🧠", description: "Core memory JIMBO" },
      { label: "Hub restart", cmd: "cd U:\\WWW_Zen_BRo_wser_org3\\JIMBO_agent_HUB && npx tsx hub-server.ts", icon: "🔄", description: "Restart JIMBO HUB" },
    ],
  },
  {
    name: "AI Tools",
    icon: "🤖",
    commands: [
      { label: "JIMBO tools", cmd: "curl -s http://localhost:4111/tools", icon: "🛠", description: "Lista narzędzi JIMBO_kit" },
      { label: "JIMBO config", cmd: "curl -s http://localhost:4111/api/config", icon: "⚙", description: "Konfiguracja" },
      { label: "Workers AI", cmd: 'curl -s "https://zeno-mcp.stolarnia-ams.workers.dev/status"', icon: "☁", description: "Status Workers AI" },
    ],
  },
];

// ── Command Palette Component ──────────────────────────────────

function CommandPalette({ onRun }: { onRun: (cmd: string) => void }) {
  const [filter, setFilter] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const filterRef = useRef<HTMLInputElement>(null);

  useEffect(() => { filterRef.current?.focus(); }, []);

  const filtered = COMMAND_CATEGORIES.map((cat) => ({
    ...cat,
    commands: cat.commands.filter(
      (c) => !filter ||
        c.label.toLowerCase().includes(filter.toLowerCase()) ||
        c.description.toLowerCase().includes(filter.toLowerCase()) ||
        c.cmd.toLowerCase().includes(filter.toLowerCase()),
    ),
  })).filter((cat) => cat.commands.length > 0);

  return (
    <div style={{ flex: 1, overflow: "auto", padding: "8px" }}>
      <input
        ref={filterRef}
        type="text"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="🔍 Filtruj komendy..."
        style={{ width: "100%", background: "#0f172a", border: "1px solid #334155", color: "#e2e8f0", borderRadius: "6px", padding: "6px 10px", fontSize: "12px", outline: "none", boxSizing: "border-box", marginBottom: "8px" }}
        spellCheck={false}
      />
      {filtered.map((cat) => (
        <div key={cat.name} style={{ marginBottom: "6px" }}>
          <button
            onClick={() => setExpanded(expanded === cat.name ? null : cat.name)}
            style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#1e293b", border: "none", color: "#94a3b8", padding: "6px 10px", fontSize: "12px", fontWeight: 600, cursor: "pointer", borderRadius: "6px", marginBottom: "2px" }}
          >
            <span>{cat.icon} {cat.name}</span>
            <span style={{ fontSize: "10px" }}>{cat.commands.length} {expanded === cat.name ? "▾" : "▸"}</span>
          </button>
          {(expanded === cat.name || filter) && cat.commands.map((c) => (
            <button
              key={c.label}
              onClick={() => onRun(c.cmd)}
              style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", background: "transparent", border: "none", color: "#cbd5e1", padding: "5px 10px 5px 20px", fontSize: "12px", cursor: "pointer", borderRadius: "4px", textAlign: "left" }}
              title={c.cmd}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "13px" }}>{c.icon}</span>
                <div>
                  <div style={{ fontSize: "12px", fontWeight: 600, color: "#e2e8f0" }}>{c.label}</div>
                  <div style={{ fontSize: "10px", color: "#64748b" }}>{c.description}</div>
                </div>
              </div>
              <span style={{ fontSize: "14px", color: "#475569", flexShrink: 0 }}>▶</span>
            </button>
          ))}
        </div>
      ))}
      {filtered.length === 0 && (
        <div style={{ textAlign: "center", color: "#475569", padding: "24px", fontSize: "13px" }}>
          Brak komend pasujących do "{filter}"
        </div>
      )}
    </div>
  );
}

// ── JS Console Tab ─────────────────────────────────────────────

function JsConsole() {
  const [input, setInput] = useState("");
  const [lines, setLines] = useState<Array<{ type: "in" | "out" | "err"; text: string }>>([
    { type: "out", text: "⚡ JS Console — eval w kontekście przeglądarki" },
  ]);
  const [history, setHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState(-1);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [lines]);

  const run = useCallback(() => {
    const code = input.trim();
    if (!code) return;
    setLines((prev) => [...prev, { type: "in", text: `> ${code}` }]);
    setHistory((h) => [code, ...h.slice(0, 49)]);
    setHistIdx(-1);
    setInput("");
    try {
      // indirect eval — intentional JS console, evaluated in window scope
      // eslint-disable-next-line no-eval
      const result = (0, eval)(code);
      setLines((prev) => [...prev, { type: "out", text: String(result) }]);
    } catch (err) {
      setLines((prev) => [...prev, { type: "err", text: String(err) }]);
    }
  }, [input]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", fontFamily: "monospace", fontSize: "12px" }}>
      <div style={{ flex: 1, overflow: "auto", padding: "8px", color: "#e2e8f0" }}>
        {lines.map((l, i) => (
          <div key={i} style={{ color: l.type === "err" ? "#f87171" : l.type === "in" ? "#7dd3fc" : "#a3e635", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
            {l.text}
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <div style={{ display: "flex", borderTop: "1px solid #1e293b", padding: "6px" }}>
        <span style={{ color: "#7dd3fc", padding: "4px 6px", userSelect: "none" }}>{">"}</span>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { run(); }
            if (e.key === "ArrowUp") { const idx = Math.min(histIdx + 1, history.length - 1); setHistIdx(idx); if (history[idx]) setInput(history[idx]); }
            if (e.key === "ArrowDown") { const idx = Math.max(histIdx - 1, -1); setHistIdx(idx); setInput(idx === -1 ? "" : (history[idx] ?? "")); }
          }}
          style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "#e2e8f0", fontFamily: "monospace", fontSize: "12px" }}
          placeholder="JavaScript expression..."
          spellCheck={false}
        />
        <button onClick={run} style={{ background: "#1d4ed8", border: "none", color: "#fff", padding: "2px 10px", borderRadius: "4px", cursor: "pointer", fontSize: "11px" }}>▶</button>
      </div>
    </div>
  );
}

// ── xterm.js Shell ─────────────────────────────────────────────

function XtermShell({ active }: { active: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const ptyIdRef = useRef<string | null>(null);
  const cleanupRef = useRef<(() => void)[]>([]);
  const isElectron = typeof window !== "undefined" && !!window.electronAPI?.terminal?.pty;

  // Initialize terminal
  useEffect(() => {
    if (!containerRef.current) return;

    const term = new Terminal({
      theme: {
        background: "#0a0f1a",
        foreground: "#e2e8f0",
        cursor: "#7c3aed",
        selectionBackground: "#7c3aed44",
        black: "#1e293b",
        red: "#f87171",
        green: "#4ade80",
        yellow: "#facc15",
        blue: "#60a5fa",
        magenta: "#c084fc",
        cyan: "#22d3ee",
        white: "#e2e8f0",
        brightBlack: "#475569",
        brightRed: "#fca5a5",
        brightGreen: "#86efac",
        brightYellow: "#fde047",
        brightBlue: "#93c5fd",
        brightMagenta: "#d8b4fe",
        brightCyan: "#67e8f9",
        brightWhite: "#f8fafc",
      },
      fontFamily: '"Cascadia Code", "Fira Code", "JetBrains Mono", Consolas, monospace',
      fontSize: 13,
      lineHeight: 1.3,
      cursorBlink: true,
      cursorStyle: "bar",
      scrollback: 5000,
      allowProposedApi: true,
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();
    const searchAddon = new SearchAddon();

    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);
    term.loadAddon(searchAddon);

    term.open(containerRef.current);
    fitAddon.fit();

    termRef.current = term;
    fitRef.current = fitAddon;

    if (isElectron) {
      // Real PTY mode
      const ptyAPI = window.electronAPI!.terminal!.pty!;
      const { cols, rows } = term;

      ptyAPI.create(cols, rows)
        .then((result: { success: boolean; id?: string; error?: string }) => {
          if (!result.success || !result.id) {
            term.writeln("\r\n\x1b[31m[PTY] Failed to create session: " + (result.error ?? "unknown") + "\x1b[0m");
            return;
          }
          const id = result.id;
          ptyIdRef.current = id;

          // PTY data → terminal
          const offData = ptyAPI.onData((sessionId: string, data: string) => {
            if (sessionId === id) term.write(data);
          });

          // PTY exit → terminal message
          const offExit = ptyAPI.onExit((sessionId: string, code: number) => {
            if (sessionId === id) {
              term.writeln(`\r\n\x1b[33m[Shell exited with code ${code}]\x1b[0m`);
              ptyIdRef.current = null;
            }
          });

          // Terminal input → PTY
          const disposeInput = term.onData((data) => {
            ptyAPI.write(id, data);
          });

          cleanupRef.current.push(
            () => offData(),
            () => offExit(),
            () => { disposeInput.dispose(); },
            () => { if (ptyIdRef.current) ptyAPI.kill(ptyIdRef.current); },
          );
        });
    } else {
      // Web/fallback mode — show info
      term.writeln("\x1b[33m⚠ Terminal PTY dostępny tylko w aplikacji Electron.\x1b[0m");
      term.writeln("\x1b[36mUruchom ZENO Browser jako aplikację desktopową.\x1b[0m\r\n");
      term.writeln("\x1b[90mW trybie web użyj zakładki 📋 Komendy lub ⚡ JS.\x1b[0m");
    }

    // Resize observer
    const resizeObserver = new ResizeObserver(() => {
      try { fitAddon.fit(); } catch { /* ignore */ }
      if (ptyIdRef.current && isElectron) {
        const { cols, rows } = term;
        window.electronAPI?.terminal?.pty?.resize(ptyIdRef.current, cols, rows);
      }
    });
    if (containerRef.current) resizeObserver.observe(containerRef.current);

    cleanupRef.current.push(() => resizeObserver.disconnect());

    return () => {
      cleanupRef.current.forEach((fn) => { try { fn(); } catch { /* ignore */ } });
      cleanupRef.current = [];
      term.dispose();
      termRef.current = null;
      fitRef.current = null;
      ptyIdRef.current = null;
    };
  }, []); // mount-only: terminal init runs once

  // Fit on tab activation
  useEffect(() => {
    if (active && fitRef.current) {
      setTimeout(() => {
        try { fitRef.current?.fit(); } catch { /* ignore */ }
      }, 50);
    }
  }, [active]);

  // Public method: write command to PTY
  const writeCommand = useCallback((cmd: string) => {
    const term = termRef.current;
    const id = ptyIdRef.current;
    if (!term) return;

    if (id && isElectron) {
      window.electronAPI?.terminal?.pty?.write(id, cmd + "\r");
    } else {
      // Fallback: show command in terminal (no execution)
      term.writeln(`\r\n\x1b[36m$ ${cmd}\x1b[0m`);
      term.writeln("\x1b[33m[Tylko Electron — brak PTY]\x1b[0m");
    }
  }, [isElectron]);

  // Expose writeCommand via ref on container
  useEffect(() => {
    if (containerRef.current) {
      (containerRef.current as HTMLDivElement & { writeCommand?: typeof writeCommand }).writeCommand = writeCommand;
    }
  }, [writeCommand]);

  return (
    <div
      ref={containerRef}
      style={{ flex: 1, overflow: "hidden", padding: "4px", background: "#0a0f1a" }}
    />
  );
}

// ── Main TerminalPanel ─────────────────────────────────────────

export function TerminalPanel({ onClose }: TerminalPanelProps) {
  const [activeTab, setActiveTab] = useState<TerminalTab>("shell");
  const [isWide, setIsWide] = useState(false);
  const shellRef = useRef<HTMLDivElement & { writeCommand?: (cmd: string) => void }>(null);

  const handleCommandRun = useCallback((cmd: string) => {
    setActiveTab("shell");
    // Small delay to ensure tab switch + xterm mount
    setTimeout(() => {
      shellRef.current?.writeCommand?.(cmd);
    }, 80);
  }, []);

  const tabStyle = (tab: TerminalTab) => ({
    background: activeTab === tab ? "#1e293b" : "transparent",
    border: "none",
    borderBottom: activeTab === tab ? "2px solid #7c3aed" : "2px solid transparent",
    color: activeTab === tab ? "#e2e8f0" : "#64748b",
    padding: "6px 12px",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: activeTab === tab ? 700 : 400,
    transition: "all 0.15s",
  });

  return (
    <div
      className="floating-panel"
      style={{
        position: "fixed",
        bottom: "48px",
        right: isWide ? "0" : "0",
        width: isWide ? "900px" : "520px",
        height: "420px",
        background: "#0f172a",
        border: "1px solid #1e293b",
        borderRadius: "10px 10px 0 0",
        display: "flex",
        flexDirection: "column",
        zIndex: 1000,
        boxShadow: "0 -4px 24px rgba(0,0,0,0.6)",
        transition: "width 0.2s",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", borderBottom: "1px solid #1e293b", padding: "0 8px", flexShrink: 0 }}>
        <button onClick={() => setActiveTab("shell")} style={tabStyle("shell")}>🖥 Terminal</button>
        <button onClick={() => setActiveTab("js")} style={tabStyle("js")}>⚡ JS</button>
        <button onClick={() => setActiveTab("commands")} style={tabStyle("commands")}>📋 Komendy</button>
        <div style={{ flex: 1 }} />
        <button
          onClick={() => setIsWide((w) => !w)}
          title={isWide ? "Zwęź" : "Rozszerz"}
          style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: "14px", padding: "4px 6px" }}
        >
          {isWide ? "⟨⟩" : "⟩⟨"}
        </button>
        <button
          onClick={onClose}
          style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: "16px", padding: "4px 8px" }}
          title="Zamknij"
        >
          ×
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {/* Shell tab — always mounted so PTY stays alive */}
        <div style={{ display: activeTab === "shell" ? "flex" : "none", flex: 1, flexDirection: "column", overflow: "hidden" }}>
          <XtermShell active={activeTab === "shell"} />
        </div>

        {/* JS tab */}
        {activeTab === "js" && (
          <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <JsConsole />
          </div>
        )}

        {/* Commands tab */}
        {activeTab === "commands" && (
          <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <CommandPalette onRun={handleCommandRun} />
          </div>
        )}
      </div>

      {/* Status bar */}
      <div style={{ borderTop: "1px solid #1e293b", padding: "3px 12px", fontSize: "10px", color: "#475569", display: "flex", gap: "12px", flexShrink: 0 }}>
        <span>PowerShell PTY</span>
        <span style={{ color: "#4ade80" }}>● xterm.js</span>
        <span>node-pty</span>
        <div style={{ flex: 1 }} />
        <span>Ctrl+C przerywa • Ctrl+L czyści</span>
      </div>
    </div>
  );
}
