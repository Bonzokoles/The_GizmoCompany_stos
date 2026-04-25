/**
 * AGENT_Pi_03 — Terminal slot 03
 * ─────────────────────────────────────────────────────────────────────────────
 * Jeden samodzielny terminal PTY z wyborem dostawcy API i modelu.
 * Funkcje i modele dopiszesz tutaj indywidualnie.
 *
 * Eksportuje: AgentTerminal_01
 * Używany w: AgentWorkspacePanel.tsx → slot TERMINAL_SLOT_03
 */

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useImperativeHandle,
} from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebglAddon } from "@xterm/addon-webgl";
import "@xterm/xterm/css/xterm.css";
import type { SlotHandle } from "../AGENT_Pi_01";

// ── Ścieżki ───────────────────────────────────────────────────────────────────

const ENV_FILE_PATH = "U:/WWW_Zen_BRo_wser_org3/.env";

// ── Sprawdzenie środowiska ────────────────────────────────────────────────────

const isElectron = !!(window as Window & { electronAPI?: unknown }).electronAPI;

// ── Typy ──────────────────────────────────────────────────────────────────────

export interface AgentDef {
  name: string;
  icon: string;
  command: string;
  args: string[];
  desc: string;
  color: string;
  defaultProvider?: string;
  defaultModel?: string;
  systemPromptOverride?: string;
  env?: Record<string, string>;
}

export interface AgentTerminal_03_Props {
  agentDef: AgentDef;
  workspaceDir: string;
  onRemove: () => void;
  ref?: React.Ref<SlotHandle>;
}

// ── Dostawcy API i domyślne modele ────────────────────────────────────────────
// Dopisz lub zmień dostawców tutaj — wpływa tylko na terminal 01.

const PROVIDER_DEFAULTS: Record<
  string,
  { model: string; envKey: string; placeholder: string }
> = {
  google: {
    model: "gemini-2.5-flash",
    envKey: "GOOGLE_API_KEY",
    placeholder: "AIza...",
  },
  anthropic: {
    model: "claude-3-5-haiku-20241022",
    envKey: "ANTHROPIC_API_KEY",
    placeholder: "sk-ant-...",
  },
  openrouter: {
    model: "anthropic/claude-3.5-haiku",
    envKey: "OPENROUTER_API_KEY",
    placeholder: "sk-or-...",
  },
  openai: {
    model: "gpt-4o-mini",
    envKey: "OPENAI_API_KEY",
    placeholder: "sk-proj-...",
  },
};

// ── Styl mini-przycisku ───────────────────────────────────────────────────────

const btn = (
  color = "#8892b0",
  border = "rgba(0,255,204,0.2)",
): React.CSSProperties => ({
  background: "transparent",
  border: `1px solid ${border}`,
  color,
  fontSize: "10px",
  padding: "2px 8px",
  cursor: "pointer",
  fontFamily: "'JetBrains Mono','Fira Code',Consolas,monospace",
  borderRadius: 0,
});

// ── Komponent terminala ───────────────────────────────────────────────────────

export function AgentTerminal_03({
  agentDef,
  workspaceDir,
  onRemove,
  ref,
}: AgentTerminal_03_Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const ptyIdRef = useRef<string | null>(null);
  const cleanupRef = useRef<Array<() => void>>([]);

  const [running, setRunning] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState(
    agentDef.defaultProvider || "google",
  );
  const [selectedModel, setSelectedModel] = useState(
    agentDef.defaultModel ||
      PROVIDER_DEFAULTS[agentDef.defaultProvider || "google"]?.model ||
      "gemini-2.5-flash",
  );

  // Synchronizuj model przy zmianie dostawcy
  useEffect(() => {
    setSelectedModel(
      PROVIDER_DEFAULTS[selectedProvider]?.model ?? "gemini-2.5-flash",
    );
  }, [selectedProvider]);

  // ── Inicjalizacja xterm.js ────────────────────────────────────────────────

  useEffect(() => {
    if (!containerRef.current) return;

    const term = new Terminal({
      theme: {
        background: "transparent",
        foreground: "#cdd9e5",
        cursor: agentDef.color,
        selectionBackground: "rgba(0,255,204,0.18)",
        black: "#0d1117",
        brightBlack: "#6e7681",
        red: "#ff7b72",
        brightRed: "#ffa198",
        green: "#3fb950",
        brightGreen: "#56d364",
        yellow: "#d29922",
        brightYellow: "#e3b341",
        blue: "#58a6ff",
        brightBlue: "#79c0ff",
        magenta: "#bc8cff",
        brightMagenta: "#d2a8ff",
        cyan: "#39c5cf",
        brightCyan: "#56d4dd",
        white: "#b1bac4",
        brightWhite: "#f0f6fc",
      },
      fontFamily: '"JetBrains Mono","Fira Code",Consolas,monospace',
      fontSize: 12,
      lineHeight: 1.3,
      cursorBlink: true,
      cursorStyle: "bar",
      scrollback: 5000,
      allowProposedApi: true,
    });

    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(containerRef.current);
    try {
      term.loadAddon(new WebglAddon());
    } catch {
      // fallback do domyślnego renderera
    }
    fit.fit();
    termRef.current = term;
    fitRef.current = fit;

    if (isElectron) {
      term.writeln(
        `\x1b[1m${agentDef.icon} ${agentDef.name.toUpperCase()} [SLOT 03]\x1b[0m`,
      );
      term.writeln(`\x1b[90mworkspace: ${workspaceDir}\x1b[0m`);
      term.writeln(`\x1b[90m── Naciśnij Launch aby uruchomić ──\x1b[0m\r\n`);
    } else {
      term.writeln("\x1b[33mTylko w trybie Electron.\x1b[0m");
    }

    // ResizeObserver — dopasowanie terminala do rozmiaru kontenera
    const ro = new ResizeObserver(() => {
      try {
        fit.fit();
      } catch {
        /* ignore */
      }
      if (ptyIdRef.current && isElectron) {
        const { cols, rows } = term;
        window.electronAPI?.terminal?.pty?.resize(ptyIdRef.current, cols, rows);
      }
    });
    if (containerRef.current) ro.observe(containerRef.current);
    cleanupRef.current.push(() => ro.disconnect());

    return () => {
      cleanupRef.current.forEach((fn) => fn());
      cleanupRef.current = [];
      term.dispose();
    };
  }, [agentDef.name, agentDef.color, agentDef.icon, workspaceDir]);

  // ── Launch — uruchomienie agenta w PTY ────────────────────────────────────

  const launchWithParams = useCallback(
    async (provider: string, model: string) => {
      if (!isElectron || running || !termRef.current) return;
      const term = termRef.current;
      const ptyAPI = window.electronAPI!.terminal!.pty!;

      term.writeln(`\r\n\x1b[32mStarting ${agentDef.name} [SLOT 03]...\x1b[0m`);
      term.writeln(
        `\x1b[90m${workspaceDir} | ${provider} / ${model}\x1b[0m\r\n`,
      );

      // Wczytaj zmienne środowiskowe z .env
      let envVars: Record<string, string> = {};
      if (window.electronAPI?.file?.read) {
        try {
          const envRes = await window.electronAPI.file.read(ENV_FILE_PATH);
          const envContent = envRes?.success ? (envRes.content ?? "") : "";
          envContent.split("\n").forEach((line: string) => {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith("#")) {
              const eqIdx = trimmed.indexOf("=");
              if (eqIdx > 0) {
                const key = trimmed.slice(0, eqIdx).trim();
                const val = trimmed.slice(eqIdx + 1).trim();
                if (key) envVars[key] = val;
              }
            }
          });
        } catch {
          term.writeln("\x1b[33m[warn] Nie można wczytać .env\x1b[0m");
        }
      }

      const { cols, rows } = term;
      const result = await ptyAPI.create(cols, rows, workspaceDir, {
        command: agentDef.command,
        args: [...agentDef.args, "--provider", provider, "--model", model],
        env: { ...envVars, ...(agentDef.env ?? {}) },
      });

      if (!result.success || !result.id) {
        term.writeln(`\x1b[31mError: ${result.error ?? "spawn failed"}\x1b[0m`);
        return;
      }

      const id = result.id;
      ptyIdRef.current = id;
      setRunning(true);

      const offData = ptyAPI.onData((sid: string, data: string) => {
        if (sid === id) term.write(data);
      });
      const offExit = ptyAPI.onExit((sid: string, code: number) => {
        if (sid !== id) return;
        term.writeln(
          `\r\n\x1b[33m[${agentDef.name} exited — code ${code}]\x1b[0m`,
        );
        ptyIdRef.current = null;
        setRunning(false);
      });
      const dispInput = term.onData((data: string) => ptyAPI.write(id, data));

      cleanupRef.current.push(
        () => offData(),
        () => offExit(),
        () => dispInput.dispose(),
        () => {
          if (ptyIdRef.current) ptyAPI.kill(ptyIdRef.current);
        },
      );
    },
    [running, agentDef, workspaceDir],
  );

  const launch = useCallback(async () => {
    launchWithParams(selectedProvider, selectedModel);
  }, [launchWithParams, selectedProvider, selectedModel]);

  // ── Kill — zatrzymanie agenta ────────────────────────────────────────────

  const kill = useCallback(() => {
    if (ptyIdRef.current && isElectron)
      window.electronAPI?.terminal?.pty?.kill(ptyIdRef.current);
  }, []);

  // ── Imperatywne API — Pi może kontrolować ten terminal ────────────────────

  useImperativeHandle(
    ref,
    () => ({
      sendInput: (text: string) => {
        if (ptyIdRef.current && isElectron) {
          window.electronAPI!.terminal!.pty!.write(
            ptyIdRef.current,
            text + "\r",
          );
        }
      },
      launchWith: (provider: string, model: string) => {
        setSelectedProvider(provider);
        setSelectedModel(model);
        launchWithParams(provider, model);
      },
      kill,
      isRunning: () => running,
      setProviderModel: (provider: string, model: string) => {
        setSelectedProvider(provider);
        setSelectedModel(model);
      },
    }),
    [running, kill, launchWithParams],
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        background: "rgba(7,9,15,0.14)",
        backdropFilter: "blur(5px)",
        WebkitBackdropFilter: "blur(5px)",
        border: `1px solid ${agentDef.color}22`,
        borderTop: `2px solid ${agentDef.color}55`,
        overflow: "hidden",
        minWidth: 0,
      }}
    >
      {/* ── Nagłówek terminala ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "5px 10px",
          flexShrink: 0,
          background: "rgba(11,19,37,0.45)",
          borderBottom: `1px solid ${agentDef.color}22`,
        }}
      >
        {/* Lewa strona: ikona, nazwa, status */}
        <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
          <span
            style={{
              fontSize: "12px",
              fontWeight: 700,
              color: agentDef.color,
              fontFamily: "'JetBrains Mono',monospace",
              letterSpacing: "0.5px",
            }}
          >
            {agentDef.icon} {agentDef.name.toUpperCase()}
          </span>
          <span
            style={{
              fontSize: "9px",
              padding: "0 5px",
              color: running ? agentDef.color : "#4a5568",
              background: running ? `${agentDef.color}12` : "transparent",
              border: `1px solid ${running ? agentDef.color + "44" : "rgba(255,255,255,0.06)"}`,
            }}
          >
            {running ? "AKTYWNY" : "off"}
          </span>
        </div>

        {/* Prawa strona: wybór dostawcy, modelu, launch/stop, usuń */}
        <div style={{ display: "flex", gap: "3px", alignItems: "center" }}>
          {/* Wybór dostawcy API */}
          <select
            value={selectedProvider}
            onChange={(e) => setSelectedProvider(e.target.value)}
            style={{ ...btn("#8892b0", "rgba(0,255,204,0.15)"), width: "auto" }}
            title={`Klucz API: ${PROVIDER_DEFAULTS[selectedProvider]?.envKey ?? "?"}`}
          >
            {Object.keys(PROVIDER_DEFAULTS).map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          {/* Pole modelu — edytowalne */}
          <input
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            placeholder="model"
            style={{ ...btn("#8892b0", "rgba(0,255,204,0.15)"), width: "90px" }}
            title="Nazwa modelu (edytowalna)"
          />

          {/* Launch / Stop */}
          {running ? (
            <button
              style={btn("#ff5555", "rgba(255,85,85,0.35)")}
              onClick={kill}
            >
              stop
            </button>
          ) : (
            <button
              style={btn(agentDef.color, `${agentDef.color}66`)}
              onClick={launch}
              disabled={!isElectron}
              title={isElectron ? "Uruchom agenta" : "Tylko w Electron"}
            >
              launch
            </button>
          )}

          {/* Usuń terminal */}
          <button
            style={btn("#ff5555", "rgba(255,85,85,0.25)")}
            onClick={onRemove}
            title="Usuń"
          >
            ✕
          </button>
        </div>
      </div>

      {/* ── Obszar xterm — transparentny, grafika ZENO widoczna przez tło ── */}
      <div
        style={{
          flex: 1,
          position: "relative",
          overflow: "hidden",
          background: "transparent",
        }}
      >
        <div
          ref={containerRef}
          style={{ position: "absolute", inset: "2px" }}
        />
      </div>
    </div>
  );
}
