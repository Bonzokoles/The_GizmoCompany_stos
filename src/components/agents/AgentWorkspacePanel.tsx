/**
 * AgentWorkspacePanel — główny panel agentów
 * ─────────────────────────────────────────────────────────────────────────────
 * Zarządza maksymalnie 3 terminalami (slots).
 * Każdy terminal to osobny folder:
 *
 *   TERMINAL_SLOT_01 → AGENT_Pi_01/index.tsx  → AgentTerminal_01
 *   TERMINAL_SLOT_02 → AGENT_Pi_02/index.tsx  → AgentTerminal_02
 *   TERMINAL_SLOT_03 → AGENT_Pi_03/index.tsx  → AgentTerminal_03
 *
 * Aby zmodyfikować wygląd/funkcje terminala N — edytuj plik AGENT_Pi_0N/index.tsx.
 * Aby dodać nowy terminal — skopiuj folder AGENT_Pi_01, utwórz AGENT_Pi_04,
 * zaimportuj komponent poniżej i dodaj case w renderSlot().
 */

import { useState, useRef, useEffect, useCallback } from "react";

// ── Import terminali ze slotów ─────────────────────────────────────────────────
// TERMINAL_SLOT_01 — edytuj: AGENT_Pi_01/index.tsx
import {
  AgentTerminal_01,
  PROVIDER_DEFAULTS,
  type AgentTerminal_01_Props,
  type SlotHandle,
} from "./AGENT_Pi_01";
// TERMINAL_SLOT_02 — edytuj: AGENT_Pi_02/index.tsx
import { AgentTerminal_02, type AgentTerminal_02_Props } from "./AGENT_Pi_02";
// TERMINAL_SLOT_03 — edytuj: AGENT_Pi_03/index.tsx
import { AgentTerminal_03, type AgentTerminal_03_Props } from "./AGENT_Pi_03";

// ── Ścieżki ───────────────────────────────────────────────────────────────────

const AGENTS_JSON_DIR = "U:/WWW_Zen_BRo_wser_org3/AGENT_LIBRARY/agents";

/** CWD base — każdy agent dostaje swój podfolder */
const WORKSPACE_BASE = "U:/WWW_Zen_BRo_wser_tool/agents";

/** Folder komunikacyjny Pi → sub-agenci (protokol JIMBOKIT_COMMS) */
const COMMS_DIR = "U:/WWW_Zen_BRo_wser_org3/JIMBOKIT_COMMS";

const isElectron = !!(window as Window & { electronAPI?: unknown }).electronAPI;

// ── Typy ──────────────────────────────────────────────────────────────────────

interface AgentDef {
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

interface AgentSession {
  id: string;
  agentName: string;
}

export type AddAgentFunction = (agentName: string) => void;

export interface AgentWorkspacePanelProps {
  onClose: () => void;
  initialAgents?: string[];
  onAddAgentRef?: React.MutableRefObject<AddAgentFunction | null>;
  onAgentsUpdate?: (agentNames: string[]) => void;
}

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

// ── Renderowanie terminala dla danego slotu ───────────────────────────────────
//
// Każda sesja dostaje slot na podstawie pozycji w tablicy sessions[]:
//   sessions[0] → SLOT 01 → AgentTerminal_01
//   sessions[1] → SLOT 02 → AgentTerminal_02
//   sessions[2] → SLOT 03 → AgentTerminal_03
//
// Aby DODAĆ terminal:
//   1. Skopiuj folder AGENT_Pi_01 jako AGENT_Pi_04
//   2. Zaimportuj AgentTerminal_04 na górze pliku
//   3. Dodaj case 3 w funkcji renderSlot poniżej
//   4. Zmień limit sessions.length < 3 na < 4

function renderSlot(
  slotIndex: number,
  sharedProps: {
    agentDef: AgentDef;
    workspaceDir: string;
    onRemove: () => void;
  },
  slotRef: React.Ref<SlotHandle>,
) {
  switch (slotIndex) {
    // ── SLOT 01 — zmień w: AGENT_Pi_01/index.tsx ──────────────────────────
    case 0:
      return (
        <AgentTerminal_01
          ref={slotRef}
          {...(sharedProps as AgentTerminal_01_Props)}
        />
      );

    // ── SLOT 02 — zmień w: AGENT_Pi_02/index.tsx ──────────────────────────
    case 1:
      return (
        <AgentTerminal_02
          ref={slotRef}
          {...(sharedProps as AgentTerminal_02_Props)}
        />
      );

    // ── SLOT 03 — zmień w: AGENT_Pi_03/index.tsx ──────────────────────────
    case 2:
      return (
        <AgentTerminal_03
          ref={slotRef}
          {...(sharedProps as AgentTerminal_03_Props)}
        />
      );

    // ── SLOT 04+ — dodaj tutaj nowe sloty ────────────────────────────────
    // case 3:
    //   return <AgentTerminal_04 {...(sharedProps as AgentTerminal_04_Props)} />;

    default:
      return null;
  }
}

// ── Komponent główny ─────────────────────────────────────────────────────────

export function AgentWorkspacePanel({
  onClose,
  initialAgents = [],
  onAddAgentRef,
  onAgentsUpdate,
}: AgentWorkspacePanelProps) {
  const [sessions, setSessions] = useState<AgentSession[]>(() =>
    initialAgents.map((name) => ({
      id: `${name}-${Date.now()}`,
      agentName: name,
    })),
  );
  const [showAddMenu, setShowAddMenu] = useState(sessions.length === 0);
  const [pipelineTask, setPipelineTask] = useState("");
  const [showPipeline, setShowPipeline] = useState(false);
  const [cardHeight, setCardHeight] = useState(460);
  const FALLBACK_AGENTS: AgentDef[] = [
    {
      name: "pi",
      icon: "π",
      command: "npx",
      args: ["pi"],
      desc: "GŁÓWNY ORKIESTRATOR",
      color: "#00ffcc",
    },
    {
      name: "claude",
      icon: "◈",
      command: "claude",
      args: [],
      desc: "Claude Code (Sub-agent)",
      color: "#d2a8ff",
    },
    {
      name: "codex",
      icon: "⌘",
      command: "codex",
      args: [],
      desc: "OpenAI Codex (Sub-agent)",
      color: "#ffa657",
    },
    {
      name: "gemini",
      icon: "✦",
      command: "gemini",
      args: [],
      desc: "Gemini CLI (Sub-agent)",
      color: "#79c0ff",
    },
    {
      name: "goose",
      icon: "🪿",
      command: "goose",
      args: [],
      desc: "Block Goose (Layer 2)",
      color: "#58a6ff",
    },
  ];

  const [agentDefs, setAgentDefs] = useState<AgentDef[]>(FALLBACK_AGENTS);
  const addMenuRef = useRef<HTMLDivElement>(null);

  // ── Refs do slotów — Pi wywołuje metody imperatywne ────────────────────────
  const slot0Ref = useRef<SlotHandle | null>(null);
  const slot1Ref = useRef<SlotHandle | null>(null);
  const slot2Ref = useRef<SlotHandle | null>(null);

  // ── Stan panelu Pi Kontroluje ────────────────────────────────────────────
  // piCtrl[agentName] = { provider, model, cmd } — opcje wysyłania przez Pi
  const [piCtrl, setPiCtrl] = useState<
    Record<string, { provider: string; model: string; cmd: string }>
  >({});
  const [commsTask, setCommsTask] = useState("");
  const [commsStatus, setCommsStatus] = useState<string | null>(null);
  const [showPiCtrl, setShowPiCtrl] = useState(true);

  // ── Wczytaj definicje agentów z AGENT_LIBRARY/agents/*.json ──────────────

  useEffect(() => {
    const load = async () => {
      if (!isElectron) return; // fallback już ustawiony jako stan domyślny
      try {
        const res = await window.electronAPI?.file?.list(AGENTS_JSON_DIR);
        if (res?.success) {
          const defs: AgentDef[] = [];
          for (const entry of res.entries.filter((e) =>
            e.name.endsWith(".json"),
          )) {
            const fileRes = await window.electronAPI?.file?.read(
              `${AGENTS_JSON_DIR}/${entry.name}`,
            );
            if (fileRes?.success && fileRes.content) {
              try {
                defs.push(JSON.parse(fileRes.content));
              } catch (e) {
                console.error(`Parse error ${entry.name}:`, e);
              }
            }
          }
          // nadpisuj fallback tylko gdy udało się załadować min. 1 def
          if (defs.length > 0) setAgentDefs(defs);
        }
      } catch (e) {
        console.error("Failed to load agent definitions:", e);
      }
    };
    load();
  }, []);

  // ── Synchronizacja nowych agentów gdy panel jest już otwarty ─────────────

  useEffect(() => {
    if (!initialAgents.length) return;
    setSessions((prev) => {
      const existing = new Set(prev.map((s) => s.agentName));
      const toAdd = initialAgents
        .filter((a) => !existing.has(a))
        .map((a) => ({ id: `${a}-${Date.now()}`, agentName: a }));
      if (!toAdd.length) return prev;
      return [...prev, ...toAdd].slice(0, 3);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialAgents.join(",")]);

  // ── Zamknij menu przy kliknięciu poza nim ─────────────────────────────────

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node))
        setShowAddMenu(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // ── Dodaj agenta ─────────────────────────────────────────────────────────

  const addAgent = useCallback(
    (agentName: string) => {
      if (sessions.length >= 3) {
        console.warn("Maks. 3 agentów w workspace.");
        return;
      }
      if (sessions.some((s) => s.agentName === agentName)) {
        console.warn(`${agentName} już jest w workspace.`);
        return;
      }
      if (!agentDefs.find((d) => d.name === agentName)) {
        console.warn(`Brak definicji dla ${agentName}.`);
        return;
      }
      setSessions((prev) => [
        ...prev,
        { id: `${agentName}-${Date.now()}`, agentName },
      ]);
      setShowAddMenu(false);
    },
    [sessions, agentDefs],
  );

  // ── Referencja do addAgent (dla PiTerminalPanel) ──────────────────────────

  useEffect(() => {
    if (onAddAgentRef) onAddAgentRef.current = addAgent;
    return () => {
      if (onAddAgentRef) onAddAgentRef.current = null;
    };
  }, [onAddAgentRef, addAgent]);

  // ── Powiadom o zmianie aktywnych agentów ─────────────────────────────────

  useEffect(() => {
    onAgentsUpdate?.(sessions.map((s) => s.agentName));
  }, [sessions, onAgentsUpdate]);

  const removeSession = useCallback((id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
  }, []);

  // ── Inicjalizuj piCtrl dla nowych sub-agentów ─────────────────────────────
  useEffect(() => {
    setPiCtrl((prev) => {
      const next = { ...prev };
      sessions.forEach((s) => {
        if (s.agentName !== "pi" && !next[s.agentName]) {
          const def = agentDefs.find((d) => d.name === s.agentName);
          next[s.agentName] = {
            provider: def?.defaultProvider ?? "google",
            model: def?.defaultModel ?? PROVIDER_DEFAULTS.google.model,
            cmd: "",
          };
        }
      });
      return next;
    });
  }, [sessions, agentDefs]);

  // ── Zapisz zadanie do JIMBOKIT_COMMS ────────────────────────────────────
  const writeToComms = useCallback(
    async (agentName: string, content: string) => {
      if (!isElectron || !content.trim()) return;
      const ts = new Date()
        .toISOString()
        .slice(0, 19)
        .replace("T", "_")
        .replace(/:/g, "-");
      const filePath = `${COMMS_DIR}/${agentName}_task_${ts}.md`;
      const md = `# Zadanie → ${agentName}\n> Wystawione przez: Pi Agent | ${new Date().toLocaleString("pl-PL")}\n\n${content}\n`;
      try {
        const res = await window.electronAPI?.file?.write?.(filePath, md);
        setCommsStatus(
          res?.success
            ? `✓ COMMS/${agentName}_task_${ts}.md`
            : `✗ ${res?.error ?? "błąd zapisu"}`,
        );
      } catch (e) {
        setCommsStatus(`✗ ${String(e)}`);
      }
      setTimeout(() => setCommsStatus(null), 5000);
    },
    [],
  );

  // ── Wyślij komendę do konkretnego slotu PTY ──────────────────────────────
  const sendToSlot = useCallback(
    (slotIndex: number, agentName: string) => {
      const refs = [slot0Ref, slot1Ref, slot2Ref];
      const cmd = piCtrl[agentName]?.cmd ?? "";
      if (!cmd.trim()) return;
      refs[slotIndex].current?.sendInput(cmd);
      setPiCtrl((prev) => ({
        ...prev,
        [agentName]: { ...prev[agentName], cmd: "" },
      }));
    },
    [piCtrl, slot0Ref, slot1Ref, slot2Ref],
  );

  // ── Uruchom sub-agenta z parametrami z Pi Control ────────────────────────
  const launchSubAgent = useCallback(
    (slotIndex: number, agentName: string) => {
      const refs = [slot0Ref, slot1Ref, slot2Ref];
      const ctrl = piCtrl[agentName];
      if (!ctrl) return;
      refs[slotIndex].current?.launchWith(ctrl.provider, ctrl.model);
    },
    [piCtrl, slot0Ref, slot1Ref, slot2Ref],
  );

  // ── Broadcast COMMS do wszystkich sub-agentów ────────────────────────────
  const broadcastComms = useCallback(async () => {
    if (!commsTask.trim()) return;
    const subAgents = sessions.filter((s) => s.agentName !== "pi");
    for (const s of subAgents) await writeToComms(s.agentName, commsTask);
    setCommsTask("");
  }, [commsTask, sessions, writeToComms]);

  const existingNames = new Set(sessions.map((s) => s.agentName));
  const availableAgents = agentDefs.filter((d) => !existingNames.has(d.name));
  const hasPi = sessions.some((s) => s.agentName === "pi");
  const slotRefs = [slot0Ref, slot1Ref, slot2Ref];

  const headerBtn = (active?: boolean): React.CSSProperties => ({
    ...btn(
      active ? "#00ffcc" : "#8892b0",
      active ? "rgba(0,255,204,0.45)" : "rgba(0,255,204,0.2)",
    ),
  });

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    /*
     * OUTER CONTAINER — w pełni transparentny, pointer-events: none
     * Grafika ZENO poniżej jest klikalna przez prześwity między kartami.
     */
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        zIndex: 10,
        pointerEvents: "none",
      }}
    >
      {/* ── Pasek nagłówka ── */}
      <div
        style={{
          position: "relative",
          zIndex: 200,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 12px",
          height: "34px",
          flexShrink: 0,
          background: "rgba(7,9,15,0.55)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          borderBottom: "1px solid rgba(0,255,204,0.15)",
          pointerEvents: "all",
        }}
      >
        {/* Tytuł — bez ikony ⚡ */}
        <span
          style={{
            color: "#00ffcc",
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: "1px",
            fontFamily: "'JetBrains Mono',monospace",
          }}
        >
          AGENT WORKSPACE
        </span>

        <div style={{ display: "flex", gap: "5px", alignItems: "center" }}>
          {/* Suwak wysokości kart */}
          <span
            style={{
              fontSize: "9px",
              color: "#2d4a5a",
              fontFamily: "'JetBrains Mono',monospace",
            }}
          >
            {cardHeight}px
          </span>
          <input
            type="range"
            min="220"
            max="700"
            value={cardHeight}
            onChange={(e) => setCardHeight(+e.target.value)}
            style={{ width: "70px", accentColor: "#00ffcc", cursor: "pointer" }}
            title="Wysokość kart"
          />

          {/* Pipeline */}
          <button
            style={headerBtn(showPipeline)}
            onClick={() => setShowPipeline((v) => !v)}
            title="Pipeline — zadanie do wszystkich agentów"
          >
            Pipeline {showPipeline ? "▲" : "▾"}
          </button>

          {/* + Agent — widoczny gdy < 3 sesji */}
          {sessions.length < 3 && (
            <div ref={addMenuRef} style={{ position: "relative" }}>
              <button
                style={{
                  ...headerBtn(),
                  color: "#00ffcc",
                  background: "rgba(0,255,204,0.05)",
                }}
                onClick={() => setShowAddMenu((v) => !v)}
              >
                + Agent
              </button>

              {showAddMenu && availableAgents.length > 0 && (
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 4px)",
                    right: 0,
                    width: "210px",
                    background: "#0b1325",
                    border: "1px solid rgba(0,255,204,0.25)",
                    zIndex: 1000,
                    pointerEvents: "all",
                  }}
                >
                  <div
                    style={{
                      padding: "4px 8px",
                      fontSize: "9px",
                      color: "#4a6a8a",
                      borderBottom: "1px solid rgba(0,255,204,0.08)",
                    }}
                  >
                    DOSTĘPNI AGENCI
                  </div>
                  {availableAgents.map((def) => (
                    <button
                      key={def.name}
                      onClick={() => addAgent(def.name)}
                      style={{
                        display: "block",
                        width: "100%",
                        textAlign: "left",
                        padding: "6px 10px",
                        background: "transparent",
                        border: "none",
                        borderBottom: "1px solid rgba(0,255,204,0.05)",
                        color: "#e6f1ff",
                        fontSize: "11px",
                        cursor: "pointer",
                        fontFamily: "'JetBrains Mono',monospace",
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.background =
                          "rgba(0,255,204,0.07)";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.background =
                          "transparent";
                      }}
                    >
                      <span style={{ color: def.color }}>
                        {def.icon} {def.name}
                      </span>
                      <span
                        style={{
                          float: "right",
                          color: "#4a6a8a",
                          fontSize: "10px",
                        }}
                      >
                        {def.desc}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <button
            style={btn("#ff5555", "rgba(255,85,85,0.3)")}
            onClick={onClose}
          >
            ✕
          </button>
        </div>
      </div>

      {/* ── Pi Control / Pipeline ── */}
      {showPipeline && (
        <div
          style={{
            background: "rgba(7,9,15,0.78)",
            backdropFilter: "blur(8px)",
            borderBottom: "1px solid rgba(0,255,204,0.12)",
            flexShrink: 0,
            pointerEvents: "all",
            padding: "5px 10px",
          }}
        >
          {hasPi && sessions.length > 1 ? (
            /* ── PI CONTROL MODE: Pi kontroluje sub-agentów ────────────── */
            <>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "4px",
                }}
              >
                <span
                  style={{
                    color: "#00ffcc",
                    fontSize: "10px",
                    fontWeight: 700,
                    fontFamily: "'JetBrains Mono',monospace",
                    letterSpacing: "0.5px",
                  }}
                >
                  π PI KONTROLUJE
                </span>
                <button
                  style={btn("#4a6a8a", "rgba(0,255,204,0.1)")}
                  onClick={() => setShowPiCtrl((v) => !v)}
                >
                  {showPiCtrl ? "▲ zwiń" : "▾ rozwiń"}
                </button>
              </div>

              {showPiCtrl &&
                sessions
                  .filter((s) => s.agentName !== "pi")
                  .map((s) => {
                    const slotIndex = sessions.indexOf(s);
                    const def = agentDefs.find((d) => d.name === s.agentName);
                    if (!def) return null;
                    const ctrl = piCtrl[s.agentName] ?? {
                      provider: "google",
                      model: "",
                      cmd: "",
                    };
                    return (
                      <div
                        key={s.id}
                        style={{
                          display: "flex",
                          gap: "4px",
                          alignItems: "center",
                          marginBottom: "4px",
                          paddingBottom: "4px",
                          borderBottom: "1px solid rgba(255,255,255,0.04)",
                          flexWrap: "wrap",
                        }}
                      >
                        {/* Etykieta agenta */}
                        <span
                          style={{
                            color: def.color,
                            fontSize: "10px",
                            fontWeight: 700,
                            fontFamily: "'JetBrains Mono',monospace",
                            minWidth: "65px",
                          }}
                        >
                          {def.icon} {def.name}
                        </span>

                        {/* Dostawca */}
                        <select
                          value={ctrl.provider}
                          onChange={(e) =>
                            setPiCtrl((prev) => ({
                              ...prev,
                              [s.agentName]: {
                                ...prev[s.agentName],
                                provider: e.target.value,
                                model:
                                  PROVIDER_DEFAULTS[e.target.value]?.model ??
                                  prev[s.agentName]?.model ??
                                  "",
                              },
                            }))
                          }
                          style={{
                            ...btn("#8892b0", "rgba(0,255,204,0.15)"),
                            width: "auto",
                          }}
                        >
                          {Object.keys(PROVIDER_DEFAULTS).map((p) => (
                            <option key={p} value={p}>
                              {p}
                            </option>
                          ))}
                        </select>

                        {/* Model */}
                        <input
                          value={ctrl.model}
                          onChange={(e) =>
                            setPiCtrl((prev) => ({
                              ...prev,
                              [s.agentName]: {
                                ...prev[s.agentName],
                                model: e.target.value,
                              },
                            }))
                          }
                          placeholder="model"
                          style={{
                            ...btn("#8892b0", "rgba(0,255,204,0.15)"),
                            width: "110px",
                          }}
                        />

                        {/* Launch / Kill */}
                        <button
                          style={btn(def.color, `${def.color}55`)}
                          onClick={() => launchSubAgent(slotIndex, s.agentName)}
                          title={`Uruchom ${def.name} z podanymi parametrami`}
                        >
                          ▶ launch
                        </button>
                        <button
                          style={btn("#ff5555", "rgba(255,85,85,0.3)")}
                          onClick={() => slotRefs[slotIndex].current?.kill()}
                          title={`Zatrzymaj ${def.name}`}
                        >
                          ■ stop
                        </button>

                        {/* Wyślij komendę do PTY */}
                        <span
                          style={{
                            fontSize: "9px",
                            color: "#4a6a8a",
                            fontFamily: "'JetBrains Mono',monospace",
                          }}
                        >
                          cmd:
                        </span>
                        <input
                          value={ctrl.cmd}
                          onChange={(e) =>
                            setPiCtrl((prev) => ({
                              ...prev,
                              [s.agentName]: {
                                ...prev[s.agentName],
                                cmd: e.target.value,
                              },
                            }))
                          }
                          placeholder="wyślij komendę do terminala…"
                          onKeyDown={(e) => {
                            if (e.key === "Enter")
                              sendToSlot(slotIndex, s.agentName);
                          }}
                          style={{
                            ...btn("#cdd9e5", "rgba(0,255,204,0.15)"),
                            width: "170px",
                          }}
                        />
                        <button
                          style={btn("#00ffcc", "rgba(0,255,204,0.4)")}
                          onClick={() => sendToSlot(slotIndex, s.agentName)}
                          title="Wyślij do PTY (Enter)"
                        >
                          → PTY
                        </button>
                        <button
                          style={btn("#79c0ff", "rgba(121,192,255,0.35)")}
                          onClick={() =>
                            writeToComms(
                              s.agentName,
                              ctrl.cmd || `Zadanie od Pi dla ${def.name}`,
                            )
                          }
                          title="Zapisz do JIMBOKIT_COMMS"
                        >
                          ✉ COMMS
                        </button>
                      </div>
                    );
                  })}

              {/* Broadcast do JIMBOKIT_COMMS */}
              {showPiCtrl && (
                <div
                  style={{
                    display: "flex",
                    gap: "5px",
                    alignItems: "center",
                    marginTop: "4px",
                    paddingTop: "4px",
                    borderTop: "1px solid rgba(0,255,204,0.08)",
                  }}
                >
                  <span
                    style={{
                      fontSize: "9px",
                      color: "#79c0ff",
                      fontFamily: "'JetBrains Mono',monospace",
                      whiteSpace: "nowrap",
                    }}
                  >
                    JIMBOKIT_COMMS →
                  </span>
                  <input
                    value={commsTask}
                    onChange={(e) => setCommsTask(e.target.value)}
                    placeholder="Broadcast zadania do wszystkich sub-agentów…"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") broadcastComms();
                    }}
                    style={{
                      flex: 1,
                      background: "rgba(7,9,15,0.9)",
                      border: "1px solid rgba(121,192,255,0.2)",
                      color: "#e6f1ff",
                      fontSize: "11px",
                      padding: "4px 8px",
                      fontFamily: "'JetBrains Mono',monospace",
                      borderRadius: 0,
                      outline: "none",
                    }}
                  />
                  <button
                    style={btn("#79c0ff", "rgba(121,192,255,0.4)")}
                    onClick={broadcastComms}
                    title="Zapisz do JIMBOKIT_COMMS dla wszystkich sub-agentów"
                  >
                    → wszystkie
                  </button>
                  {commsStatus && (
                    <span
                      style={{
                        fontSize: "9px",
                        color: commsStatus.startsWith("✓")
                          ? "#3fb950"
                          : "#ff7b72",
                        fontFamily: "'JetBrains Mono',monospace",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {commsStatus}
                    </span>
                  )}
                </div>
              )}
            </>
          ) : (
            /* ── PIPELINE MODE: brak Pi, wyślij do wszystkich ──────────── */
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span
                style={{
                  fontSize: "10px",
                  color: "#4a6a8a",
                  fontFamily: "'JetBrains Mono',monospace",
                  whiteSpace: "nowrap",
                }}
              >
                Zadanie:
              </span>
              <input
                value={pipelineTask}
                onChange={(e) => setPipelineTask(e.target.value)}
                placeholder="np. Napisz komponent React dla formularza kontaktowego…"
                style={{
                  flex: 1,
                  background: "rgba(7,9,15,0.9)",
                  border: "1px solid rgba(0,255,204,0.2)",
                  color: "#e6f1ff",
                  fontSize: "11px",
                  padding: "4px 8px",
                  fontFamily: "'JetBrains Mono',monospace",
                  borderRadius: 0,
                  outline: "none",
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && pipelineTask.trim()) {
                    slotRefs.forEach((r) => r.current?.sendInput(pipelineTask));
                    setPipelineTask("");
                  }
                }}
              />
              <span
                style={{
                  fontSize: "9px",
                  color: "#2d4a5a",
                  fontFamily: "'JetBrains Mono',monospace",
                }}
              >
                Enter → do wszystkich
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── Obszar kart terminali ── */}
      {sessions.length === 0 ? (
        /* Stan pusty — przyciski wyboru agenta */
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "16px",
            padding: "40px",
            pointerEvents: "all",
            background: "rgba(7,9,15,0.55)",
            backdropFilter: "blur(6px)",
            margin: "20px",
            border: "1px solid rgba(0,255,204,0.12)",
          }}
        >
          <span
            style={{
              color: "#4a6a8a",
              fontSize: "12px",
              fontFamily: "'JetBrains Mono',monospace",
            }}
          >
            Wybierz agenta aby otworzyć sandbox
          </span>
          <div
            style={{
              display: "flex",
              gap: "8px",
              flexWrap: "wrap",
              justifyContent: "center",
            }}
          >
            {agentDefs.map((def) => (
              <button
                key={def.name}
                onClick={() => addAgent(def.name)}
                style={{
                  ...btn(def.color, `${def.color}55`),
                  padding: "7px 18px",
                  fontSize: "11px",
                  background: `${def.color}08`,
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background =
                    `${def.color}18`;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background =
                    `${def.color}08`;
                }}
              >
                {def.icon} {def.name}
              </button>
            ))}
          </div>
          <span
            style={{
              fontSize: "9px",
              color: "#2d4a5a",
              fontFamily: "'JetBrains Mono',monospace",
            }}
          >
            Workspace: {WORKSPACE_BASE}/&lt;agent&gt;
          </span>
        </div>
      ) : (
        /*
         * Karty terminali — wysokość kontrolowana suwakiem.
         * Obszar poniżej kart jest transparentny — grafika ZENO widoczna.
         *
         * sessions[0] → SLOT 01 (AGENT_Pi_01)
         * sessions[1] → SLOT 02 (AGENT_Pi_02)
         * sessions[2] → SLOT 03 (AGENT_Pi_03)
         */
        <div
          style={{
            display: "flex",
            gap: "6px",
            padding: "6px 8px 0",
            alignItems: "flex-start",
            pointerEvents: "none",
            flexShrink: 0,
          }}
        >
          {sessions.map((s, slotIndex) => {
            const agentDef = agentDefs.find((def) => def.name === s.agentName);
            if (!agentDef) return null;

            const sharedProps = {
              agentDef,
              workspaceDir: `${WORKSPACE_BASE}/${s.agentName}`,
              onRemove: () => removeSession(s.id),
            };

            return (
              <div
                key={s.id}
                style={{
                  flex: 1,
                  height: `${cardHeight}px`,
                  display: "flex",
                  flexDirection: "column",
                  pointerEvents: "all",
                  overflow: "hidden",
                }}
              >
                {/* ── Przypisanie terminala do slotu ── */}
                {renderSlot(slotIndex, sharedProps, slotRefs[slotIndex])}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
