/**
 * AgentHubPanel — Wariant C
 *
 * Trzy panele w jednym widoku:
 *   LEFT   — Agent Chat  (POST http://localhost:4224/chat, streaming SSE)
 *   RIGHT  — Goose Task Runner (POST /agent/run → WS streaming output)
 *   BOTTOM — iframe / sandbox  (URL wpisany ręcznie lub przekazany z taskera)
 *
 * Przyciski cross-panel:
 *   ⚡  — wyślij tekst z chatu jako instrukcję do Goose
 *   →  — wyślij output Goose do chatu
 *   ⊞  — otwórz URL z outputu w iframe
 *   ⎘  — kopiuj do schowka
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { SkillGraphPanel } from "./SkillGraphPanel";
import { AgentStatusBar } from "./AgentStatusBar";
import { AgentChatPane } from "./AgentChatPane";
import { AgentTasksTab } from "./tabs/AgentTasksTab";
import { AgentSkillsTab } from "./tabs/AgentSkillsTab";
import { AgentPodmanTab } from "./tabs/AgentPodmanTab";
import { AgentFilesTab } from "./tabs/AgentFilesTab";
import { AgentPolaczekTab } from "./tabs/AgentPolaczekTab";
import type { FileReport, ScanResult } from "./agentHubTypes";
import type {
  AgentEntry,
  SkillEntry,
  ContainerInfo,
  NamespaceInfo,
  ChatMsg,
  TaskLine,
  TaskEntry,
  GooseSessionMeta,
  PolaczekAgent,
  FileCatalogEntry,
} from "./agentHubTypes";

const HUB = "http://localhost:4224";
const HUB_WS = "ws://localhost:4224/ws";

/* ── SSE parser (obsługuje OpenAI, Anthropic i HUB format) ── */
function parseSSEToken(line: string): string {
  if (!line.startsWith("data: ")) return "";
  const raw = line.slice(6).trim();
  if (raw === "[DONE]") return "";
  try {
    const p = JSON.parse(raw);
    if (typeof p?.choices?.[0]?.delta?.content === "string")
      return p.choices[0].delta.content;
    if (p?.type === "content_block_delta" && p?.delta?.type === "text_delta")
      return p.delta.text ?? "";
    if (typeof p?.text === "string") return p.text;
  } catch {
    /* ignore */
  }
  return "";
}

/* ════════════════════════════════════════════════════════════ */
export function AgentHubPanel() {
  /* Hub status */
  const [hubOnline, setHubOnline] = useState(false);
  const [gooseAvail, setGooseAvail] = useState(false);
  const [hubModel, setHubModel] = useState("");
  const [sessionName, setSessionName] = useState<string | null>(null);
  const [sessionTasks, setSessionTasks] = useState(0);
  const [gooseDesktopAvail, setGooseDesktopAvail] = useState(false);
  const [gooseLaunching, setGooseLaunching] = useState(false);

  /* Chat (left) */
  const [chatHistory, setChatHistory] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  /* Tasks (right) */
  const [tasks, setTasks] = useState<TaskEntry[]>([]);
  const [taskInput, setTaskInput] = useState("");
  const [taskRunning, setTaskRunning] = useState(false);
  const taskBottomRef = useRef<HTMLDivElement>(null);

  /* Iframe (bottom) */
  const [iframeUrl, setIframeUrl] = useState("");
  const [iframeInput, setIframeInput] = useState("");
  const [showIframe, setShowIframe] = useState(false);

  /* Right pane tab: tasks | skills | podman | graph | files | polaczek */
  const [rightTab, setRightTab] = useState<
    "tasks" | "skills" | "podman" | "graph" | "files" | "polaczek"
  >("tasks");

  /* Skills panel */
  const [skillsList, setSkillsList] = useState<SkillEntry[]>([]);
  const [skillSearch, setSkillSearch] = useState("");
  const [skillExpanded, setSkillExpanded] = useState<string | null>(null);
  const [skillsLoading, setSkillsLoading] = useState(false);

  /* Goose session import */
  const [showGooseImport, setShowGooseImport] = useState(false);
  const [gooseSessions, setGooseSessions] = useState<GooseSessionMeta[]>([]);
  const [gooseImportBusy, setGooseImportBusy] = useState<
    Record<string, boolean>
  >({});
  const [gooseImportDone, setGooseImportDone] = useState<
    Record<string, string>
  >({});

  /* Podman */
  const [containers, setContainers] = useState<ContainerInfo[]>([]);
  const [nsInfo, setNsInfo] = useState<NamespaceInfo>({
    all: [],
    active: [],
    counts: {},
  });
  const [podmanAvail, setPodmanAvail] = useState(false);
  const [logsContainer, setLogsContainer] = useState<string | null>(null);
  const [containerLogs, setContainerLogs] = useState<Record<string, string>>(
    {},
  );
  const [podmanBusy, setPodmanBusy] = useState<Record<string, boolean>>({});

  /* File Agent */
  const [filePath, setFilePath] = useState("");
  const [fileQuery, setFileQuery] = useState("Podsumuj zawartość");
  const [fileSync, setFileSync] = useState(true);
  const [fileAutoReg, setFileAutoReg] = useState(true);
  const [fileSaveRep, setFileSaveRep] = useState(false);
  const [fileBusy, setFileBusy] = useState(false);
  const [fileReport, setFileReport] = useState<null | {
    summary: string;
    insights: string[];
    fileType: string;
    tags: string[];
    actionItems: string[];
    rawOutput: string;
  }>(null);
  const [fileTaskId, setFileTaskId] = useState<string | null>(null);
  const [scanDir, setScanDir] = useState("");
  const [scanDepth, setScanDepth] = useState(2);
  const [scanBusy, setScanBusy] = useState(false);
  const [scanResult, setScanResult] = useState<null | {
    dir: string;
    scanned: number;
    cataloged: number;
    catalog: Array<{
      path: string;
      type: string;
      ext: string;
      description: string;
    }>;
  }>(null);
  const [fileCatalog, setFileCatalog] = useState<
    Array<{ id: string; path: string; description: string; tags: string[] }>
  >([]);

  /* Agents picker */
  const [agents, setAgents] = useState<AgentEntry[]>([]);
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null);
  const [activeAgentName, setActiveAgentName] = useState<string | null>(null);
  const [showAgentPicker, setShowAgentPicker] = useState(false);
  const [agentSearch, setAgentSearch] = useState("");

  /* Polaczek agents */
  const [polaczekList, setPolaczekList] = useState<PolaczekAgent[]>([]);
  const [polaczekTask, setPolaczekTask] = useState("");
  const [polaczekActive, setPolaczekActive] = useState<string | null>(null);
  const [polaczekBusy, setPolaczekBusy] = useState(false);
  const [polaczekOutput, setPolaczekOutput] = useState("");
  const [polaczekImage, setPolaczekImage] = useState<string | null>(null); // base64
  const [polaczekImageName, setPolaczekImageName] = useState("");
  const [polaczekProvider, setPolaczekProvider] = useState<
    "ollama" | "openrouter" | "openai" | "anthropic"
  >("ollama");
  const [polaczekApiKey, setPolaczekApiKey] = useState("");
  const [polaczekModelOverride, setPolaczekModelOverride] = useState("");

  const wsRef = useRef<WebSocket | null>(null);

  /* ── Scroll helpers ── */
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);
  useEffect(() => {
    taskBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [tasks]);

  /* ── Agents: load list ── */
  useEffect(() => {
    if (!hubOnline) return;
    fetch(`${HUB}/agents/list`)
      .then((r) => r.json() as Promise<{ agents: AgentEntry[] }>)
      .then((d) => setAgents(d.agents ?? []))
      .catch(() => {});
    fetch(`${HUB}/agents/active`)
      .then(
        (r) =>
          r.json() as Promise<{
            id: string | null;
            name: string | null;
            active: boolean;
          }>,
      )
      .then((d) => {
        setActiveAgentId(d.id);
        setActiveAgentName(d.name);
      })
      .catch(() => {});
  }, [hubOnline]);

  /* ── Agents: activate / deactivate ── */
  const activateAgent = useCallback(async (id: string | null) => {
    try {
      const res = await fetch(`${HUB}/agents/activate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const d = (await res.json()) as {
        id?: string | null;
        name?: string | null;
        active?: boolean;
      };
      setActiveAgentId(d.id ?? null);
      setActiveAgentName(d.name ?? null);
      setShowAgentPicker(false);
      setAgentSearch("");
    } catch {
      /* ignore */
    }
  }, []);

  /* ── File Agent: analyze, scan, catalog ── */
  const runFileAnalyze = useCallback(async () => {
    if (!filePath.trim() || fileBusy) return;
    setFileBusy(true);
    setFileReport(null);
    setFileTaskId(null);
    try {
      const r = await fetch(`${HUB}/files/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: filePath.trim(),
          query: fileQuery,
          sync: fileSync,
          autoRegister: fileAutoReg,
          saveReport: fileSaveRep,
        }),
      });
      const d = (await r.json()) as {
        taskId?: string;
        report?: typeof fileReport;
        status?: string;
      };
      if (fileSync && d.report) {
        setFileReport(d.report);
      } else {
        setFileTaskId(d.taskId ?? null);
      }
    } catch {
      /* ignore */
    } finally {
      setFileBusy(false);
    }
  }, [filePath, fileQuery, fileSync, fileAutoReg, fileBusy]);

  const runFileScan = useCallback(async () => {
    if (!scanDir.trim() || scanBusy) return;
    setScanBusy(true);
    setScanResult(null);
    try {
      const r = await fetch(`${HUB}/files/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dir: scanDir.trim(),
          depth: scanDepth,
          autoRegister: true,
        }),
      });
      const d = (await r.json()) as typeof scanResult;
      setScanResult(d);
    } catch {
      /* ignore */
    } finally {
      setScanBusy(false);
    }
  }, [scanDir, scanDepth, scanBusy]);

  const loadFileCatalog = useCallback(async () => {
    try {
      const r = await fetch(`${HUB}/files/catalog`);
      const d = (await r.json()) as { catalog: typeof fileCatalog };
      setFileCatalog(d.catalog ?? []);
    } catch {
      /* ignore */
    }
  }, []);

  /* ── Skills: load + search ── */
  const loadSkills = useCallback(async () => {
    if (!hubOnline) return;
    setSkillsLoading(true);
    try {
      const r = await fetch(`${HUB}/skills/list`);
      const d = (await r.json()) as { skills: SkillEntry[] };
      setSkillsList(d.skills ?? []);
    } catch {
      /* ignore */
    } finally {
      setSkillsLoading(false);
    }
  }, [hubOnline]);

  const searchSkills = useCallback(
    async (q: string) => {
      if (!q.trim() || !hubOnline) {
        loadSkills();
        return;
      }
      setSkillsLoading(true);
      try {
        const r = await fetch(`${HUB}/skills/search`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: q, topK: 20, minSimilarity: 0.2 }),
        });
        const d = (await r.json()) as { results: SkillEntry[] };
        setSkillsList(d.results ?? []);
      } catch {
        /* ignore */
      } finally {
        setSkillsLoading(false);
      }
    },
    [hubOnline, loadSkills],
  );

  useEffect(() => {
    if (rightTab === "skills" && hubOnline) loadSkills();
  }, [rightTab, hubOnline, loadSkills]);

  /* ── Polaczek ── */
  useEffect(() => {
    if (rightTab === "polaczek" && hubOnline && polaczekList.length === 0) {
      fetch(`${HUB}/polaczek/list`)
        .then((r) => r.json())
        .then((d) => setPolaczekList(d.agents ?? []))
        .catch(() => {});
    }
  }, [rightTab, hubOnline, polaczekList.length]);

  const runPolaczek = useCallback(async () => {
    if (!polaczekActive || !polaczekTask.trim() || polaczekBusy) return;
    if (polaczekProvider !== "ollama" && !polaczekApiKey.trim()) {
      setPolaczekOutput(`Wymagany API key dla ${polaczekProvider}`);
      return;
    }
    setPolaczekBusy(true);
    setPolaczekOutput("");
    try {
      const body: Record<string, string> = {
        task: polaczekTask,
        provider: polaczekProvider,
      };
      if (polaczekImage) body.image_base64 = polaczekImage;
      if (polaczekApiKey.trim()) body.api_key = polaczekApiKey.trim();
      if (polaczekModelOverride.trim())
        body.model_override = polaczekModelOverride.trim();
      const r = await fetch(`${HUB}/polaczek/${polaczekActive}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      setPolaczekOutput(d.output ?? d.error ?? "Brak odpowiedzi");
    } catch (e) {
      setPolaczekOutput(`Błąd: ${e}`);
    } finally {
      setPolaczekBusy(false);
    }
  }, [
    polaczekActive,
    polaczekTask,
    polaczekBusy,
    polaczekImage,
    polaczekProvider,
    polaczekApiKey,
    polaczekModelOverride,
  ]);

  const deleteSkill = useCallback(async (id: string) => {
    await fetch(`${HUB}/skills/${id}`, { method: "DELETE" }).catch(() => {});
    setSkillsList((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const exportSkills = useCallback(async () => {
    try {
      const r = await fetch(`${HUB}/skills/export`);
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `skills-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      /* ignore */
    }
  }, []);

  const importSkills = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const parsed = JSON.parse(text) as { skills?: unknown[] };
        const body = Array.isArray(parsed.skills)
          ? parsed
          : { skills: [parsed] };
        const r = await fetch(`${HUB}/skills/import`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const d = (await r.json()) as {
          imported: number;
          skippedCount: number;
        };
        alert(
          `Import: ${d.imported} dodano, ${d.skippedCount} pominięto (duplikaty)`,
        );
        loadSkills();
      } catch (err) {
        alert(
          `Błąd importu: ${err instanceof Error ? err.message : "nieznany"}`,
        );
      }
      e.target.value = "";
    },
    [loadSkills],
  );

  /* ── Goose Desktop launch ── */
  const launchGooseDesktop = useCallback(async () => {
    if (!hubOnline || gooseLaunching) return;
    setGooseLaunching(true);
    try {
      await fetch(`${HUB}/goose/desktop/launch`, { method: "POST" });
    } catch {
      /* ignore */
    } finally {
      setTimeout(() => setGooseLaunching(false), 2000);
    }
  }, [hubOnline, gooseLaunching]);

  /* ── Goose session import ── */
  const loadGooseSessions = useCallback(async () => {
    try {
      const r = await fetch(`${HUB}/skills/goose-sessions`);
      const d = (await r.json()) as { sessions: GooseSessionMeta[] };
      setGooseSessions(d.sessions ?? []);
    } catch {
      /* ignore */
    }
  }, []);

  const importGooseSession = useCallback(
    async (sessionId: string) => {
      setGooseImportBusy((b) => ({ ...b, [sessionId]: true }));
      try {
        const r = await fetch(`${HUB}/skills/import-goose-session`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });
        const d = (await r.json()) as {
          saved?: string[];
          processed?: number;
          skipped?: number;
          error?: string;
        };
        if (d.error) {
          setGooseImportDone((p) => ({ ...p, [sessionId]: `⚠ ${d.error}` }));
        } else {
          const saved = d.saved?.length ?? 0;
          setGooseImportDone((p) => ({
            ...p,
            [sessionId]: `✓ ${saved} skill${saved !== 1 ? "s" : ""} zapisano (${d.skipped ?? 0} pominięto)`,
          }));
          if (saved > 0) loadSkills();
        }
      } catch (err) {
        setGooseImportDone((p) => ({
          ...p,
          [sessionId]: `⚠ ${err instanceof Error ? err.message : "błąd"}`,
        }));
      } finally {
        setGooseImportBusy((b) => ({ ...b, [sessionId]: false }));
      }
    },
    [loadSkills],
  );

  /* ── Podman: load containers + namespaces ── */
  const loadPodman = useCallback(async () => {
    if (!hubOnline) return;
    try {
      const [rc, rn] = await Promise.all([
        fetch(`${HUB}/podman/containers`),
        fetch(`${HUB}/namespaces`),
      ]);
      const dc = (await rc.json()) as {
        available?: boolean;
        containers?: ContainerInfo[];
      };
      const dn = (await rn.json()) as {
        all?: string[];
        active?: string[];
        counts?: Record<string, number>;
      };
      setPodmanAvail(dc.available ?? false);
      setContainers(dc.containers ?? []);
      setNsInfo({
        all: dn.all ?? [],
        active: dn.active ?? [],
        counts: dn.counts ?? {},
      });
    } catch {
      /* ignore */
    }
  }, [hubOnline]);

  useEffect(() => {
    if (rightTab === "podman" && hubOnline) loadPodman();
  }, [rightTab, hubOnline, loadPodman]);

  const podmanAction = useCallback(
    async (name: string, action: "start" | "stop" | "restart") => {
      setPodmanBusy((b) => ({ ...b, [name]: true }));
      try {
        await fetch(`${HUB}/podman/containers/${name}/${action}`, {
          method: "POST",
        });
        await loadPodman();
      } catch {
        /* ignore */
      } finally {
        setPodmanBusy((b) => ({ ...b, [name]: false }));
      }
    },
    [loadPodman],
  );

  const fetchLogs = useCallback(
    async (name: string) => {
      setLogsContainer((prev) => (prev === name ? null : name));
      if (containerLogs[name]) return; // cached
      try {
        const r = await fetch(`${HUB}/podman/containers/${name}/logs`);
        const d = (await r.json()) as { logs?: string };
        setContainerLogs((prev) => ({
          ...prev,
          [name]: d.logs ?? "(brak logów)",
        }));
      } catch {
        /* ignore */
      }
    },
    [containerLogs],
  );

  /* ── Hub status poll ── */
  useEffect(() => {
    let connected = false;
    const check = async () => {
      try {
        const r = await fetch(`${HUB}/status`, {
          signal: AbortSignal.timeout(3000),
        });
        const d = (await r.json()) as {
          goose?: { available?: boolean };
          model?: string;
        };
        connected = true;
        setHubOnline(true);
        setGooseAvail(d.goose?.available ?? false);
        setHubModel(d.model ?? "");
        fetch(`${HUB}/goose/desktop/status`)
          .then((r) => r.json())
          .then((s: unknown) =>
            setGooseDesktopAvail(
              (s as { available?: boolean }).available ?? false,
            ),
          )
          .catch(() => {});
        fetch(`${HUB}/session`)
          .then((r) => r.json())
          .then((s: unknown) => {
            const sd = s as { sessionName?: string | null; taskCount?: number };
            setSessionName(sd.sessionName ?? null);
            setSessionTasks(sd.taskCount ?? 0);
          })
          .catch(() => {});
      } catch {
        setHubOnline(false);
        setGooseAvail(false);
      }
    };
    // Szybki retry co 2s dopóki nie połączy (max 60s), potem co 10s
    check();
    const fastTimer = setInterval(() => {
      if (!connected) check();
    }, 2_000);
    const slowTimer = setInterval(check, 10_000);
    const stopFast = setTimeout(() => clearInterval(fastTimer), 60_000);
    return () => {
      clearInterval(fastTimer);
      clearInterval(slowTimer);
      clearTimeout(stopFast);
    };
  }, []);

  /* ── WebSocket (task streaming) ── */
  useEffect(() => {
    if (!hubOnline) return;
    let ws: WebSocket;
    const connect = () => {
      ws = new WebSocket(HUB_WS);
      wsRef.current = ws;
      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data as string) as {
            type: string;
            taskId: string;
            text?: string;
            isStderr?: boolean;
            exitCode?: number;
            durationMs?: number;
            verdict?: string;
            score?: number;
            reflection?: string;
            improvement?: string;
            retryCount?: number;
            retryTaskId?: string;
            retryNum?: number;
            maxRetries?: number;
            reason?: string;
          };
          if (msg.type === "chunk") {
            setTasks((prev) =>
              prev.map((t) =>
                t.id === msg.taskId
                  ? {
                      ...t,
                      lines: [
                        ...t.lines,
                        {
                          text: msg.text ?? "",
                          isStderr: !!msg.isStderr,
                          ts: Date.now(),
                        },
                      ],
                    }
                  : t,
              ),
            );
          } else if (msg.type === "done") {
            setTasks((prev) =>
              prev.map((t) =>
                t.id === msg.taskId
                  ? {
                      ...t,
                      status: (msg.exitCode ?? 0) === 0 ? "done" : "error",
                      durationMs: msg.durationMs,
                    }
                  : t,
              ),
            );
            setTaskRunning(false);
          } else if (msg.type === "error") {
            setTasks((prev) =>
              prev.map((t) =>
                t.id === msg.taskId ? { ...t, status: "error" } : t,
              ),
            );
            setTaskRunning(false);
          } else if (msg.type === "reflexion") {
            setTasks((prev) =>
              prev.map((t) =>
                t.id === msg.taskId
                  ? {
                      ...t,
                      reflexionScore: msg.score,
                      reflexionVerdict: msg.verdict,
                      reflexionImprovement: msg.improvement,
                    }
                  : t,
              ),
            );
          } else if (msg.type === "retry") {
            setTaskRunning(true);
            setTasks((prev) => [
              ...prev.map((t) =>
                t.id === msg.taskId
                  ? { ...t, retryNum: msg.retryNum, maxRetries: msg.maxRetries }
                  : t,
              ),
              {
                id: msg.retryTaskId!,
                instructions: `[AUTO-RETRY ${msg.retryNum}/${msg.maxRetries}] ${msg.reason ?? ""}`,
                lines: [],
                status: "running" as const,
                collapsed: false,
              },
            ]);
            if (wsRef.current?.readyState === WebSocket.OPEN) {
              wsRef.current.send(
                JSON.stringify({
                  action: "subscribe",
                  taskId: msg.retryTaskId,
                }),
              );
            }
          }
        } catch {
          /* ignore */
        }
      };
      ws.onclose = () => setTimeout(connect, 3000); // reconnect
    };
    connect();
    return () => ws?.close();
  }, [hubOnline]);

  /* ── Chat send ── */
  const sendChat = useCallback(async () => {
    const text = chatInput.trim();
    if (!text || chatLoading || !hubOnline) return;
    setChatInput("");
    setChatHistory((h) => [...h, { role: "user", text, ts: Date.now() }]);
    setChatLoading(true);
    const messages = [
      ...chatHistory.slice(-20).map((m) => ({ role: m.role, content: m.text })),
      { role: "user" as const, content: text },
    ];
    try {
      setChatHistory((h) => [
        ...h,
        { role: "assistant", text: "", ts: Date.now(), streaming: true },
      ]);
      const res = await fetch(`${HUB}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages, stream: true }),
      });
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const chunk = parseSSEToken(line);
          if (!chunk) continue;
          setChatHistory((h) =>
            h.map((m, i) =>
              i === h.length - 1 && m.streaming
                ? { ...m, text: m.text + chunk }
                : m,
            ),
          );
        }
      }
      setChatHistory((h) =>
        h.map((m, i) =>
          i === h.length - 1 && m.streaming ? { ...m, streaming: false } : m,
        ),
      );
    } catch (err) {
      setChatHistory((h) =>
        h.map((m, i) =>
          i === h.length - 1 && m.streaming
            ? {
                ...m,
                text: `⚠ ${err instanceof Error ? err.message : "Błąd połączenia z hubem"}`,
                streaming: false,
              }
            : m,
        ),
      );
    } finally {
      setChatLoading(false);
    }
  }, [chatInput, chatHistory, chatLoading, hubOnline]);

  /* ── Task run ── */
  const runTask = useCallback(async () => {
    const instructions = taskInput.trim();
    if (!instructions || taskRunning || !gooseAvail) return;
    setTaskInput("");
    setTaskRunning(true);
    try {
      const res = await fetch(`${HUB}/agent/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instructions }),
      });
      const data = (await res.json()) as { taskId?: string; error?: string };
      if (!data.taskId) throw new Error(data.error ?? "Brak taskId");
      // Auto-collapse poprzednich tasków gdy startuje nowy
      setTasks((prev) => [
        ...prev.map((t) => ({ ...t, collapsed: true })),
        {
          id: data.taskId!,
          instructions,
          lines: [],
          status: "running" as const,
          collapsed: false,
        },
      ]);
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({ action: "subscribe", taskId: data.taskId }),
        );
      }
    } catch (err) {
      setTaskRunning(false);
      setTasks((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          instructions,
          lines: [
            {
              text: `⚠ ${err instanceof Error ? err.message : "Błąd"}`,
              ts: Date.now(),
            },
          ],
          status: "error" as const,
        },
      ]);
    }
  }, [taskInput, taskRunning, gooseAvail]);

  /* ── Helpers ── */
  const copy = (text: string) =>
    navigator.clipboard.writeText(text).catch(() => {});
  const sendToChat = (text: string) =>
    setChatInput((prev) => (prev ? prev + "\n" + text : text));
  const toggleTaskCollapse = (id: string) =>
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, collapsed: !t.collapsed } : t)),
    );

  // sendToTask: wypełnia pole + od razu uruchamia jeśli Goose dostępny
  const sendToTask = useCallback(
    async (text: string) => {
      if (!gooseAvail || taskRunning) {
        setTaskInput(text);
        setRightTab("tasks");
        return;
      }
      setRightTab("tasks");
      setTaskInput("");
      setTaskRunning(true);
      try {
        const res = await fetch(`${HUB}/agent/run`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ instructions: text }),
        });
        const data = (await res.json()) as { taskId?: string; error?: string };
        if (!data.taskId) throw new Error(data.error ?? "Brak taskId");
        // Auto-collapse poprzednich tasków gdy startuje nowy
        setTasks((prev) => [
          ...prev.map((t) => ({ ...t, collapsed: true })),
          {
            id: data.taskId!,
            instructions: text,
            lines: [],
            status: "running" as const,
            collapsed: false,
          },
        ]);
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(
            JSON.stringify({ action: "subscribe", taskId: data.taskId }),
          );
        }
      } catch (err) {
        setTaskRunning(false);
        setTasks((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            instructions: text,
            lines: [
              {
                text: `⚠ ${err instanceof Error ? err.message : "Błąd"}`,
                ts: Date.now(),
              },
            ],
            status: "error",
          },
        ]);
      }
    },
    [gooseAvail, taskRunning, wsRef],
  );
  /* ── URL detection in task output (kept for taskOutput helper) ── */
  const openIframe = (url: string) => {
    setIframeUrl(url);
    setShowIframe(true);
  };

  /* ════ RENDER ════════════════════════════════════════════════ */
  return (
    <div className="agent-hub-panel">
      {/* ── Status bar ── */}
      <AgentStatusBar
        hubOnline={hubOnline}
        gooseAvail={gooseAvail}
        hubModel={hubModel}
        sessionName={sessionName}
        sessionTasks={sessionTasks}
        gooseDesktopAvail={gooseDesktopAvail}
        gooseLaunching={gooseLaunching}
        showIframe={showIframe}
        onResetSession={() =>
          fetch(`${HUB}/session/reset`, { method: "POST" })
            .then(() => {
              setSessionName(null);
              setSessionTasks(0);
            })
            .catch(() => {})
        }
        onLaunchGooseDesktop={launchGooseDesktop}
        onToggleIframe={() => setShowIframe((v) => !v)}
      />

      {/* ── Split: Chat + Tasks ── */}
      <div className={`ah-split${showIframe ? " ah-split-with-iframe" : ""}`}>
        {/* LEFT — Chat */}
        <AgentChatPane
          hubOnline={hubOnline}
          chatHistory={chatHistory}
          chatInput={chatInput}
          chatLoading={chatLoading}
          agents={agents}
          activeAgentId={activeAgentId}
          activeAgentName={activeAgentName}
          showAgentPicker={showAgentPicker}
          agentSearch={agentSearch}
          chatBottomRef={chatBottomRef}
          onSendChat={sendChat}
          onCopy={copy}
          onSendToTask={sendToTask}
          onActivateAgent={activateAgent}
          onClearHistory={() => setChatHistory([])}
          onChatInputChange={setChatInput}
          onAgentSearchChange={setAgentSearch}
          onToggleAgentPicker={() => setShowAgentPicker((v) => !v)}
        />

        {/* RIGHT — Goose Tasks / Skills */}
        <div className="ah-pane ah-pane-task">
          <div className="ah-pane-hdr">
            <button
              className={`ah-tab-btn${rightTab === "tasks" ? " ah-tab-btn-on" : ""}`}
              onClick={() => setRightTab("tasks")}
            >
              ⚡ TASKS{" "}
              {tasks.length > 0 && (
                <span className="ah-tab-count">{tasks.length}</span>
              )}
            </button>
            <button
              className={`ah-tab-btn${rightTab === "skills" ? " ah-tab-btn-on" : ""}`}
              onClick={() => setRightTab("skills")}
            >
              📚 SKILLS{" "}
              {skillsList.length > 0 && (
                <span className="ah-tab-count">{skillsList.length}</span>
              )}
            </button>
            <button
              className={`ah-tab-btn${rightTab === "podman" ? " ah-tab-btn-on" : ""}`}
              onClick={() => setRightTab("podman")}
            >
              🐳 PODMAN{" "}
              {containers.length > 0 && (
                <span className="ah-tab-count">
                  {containers.filter((c) => c.state === "running").length}/
                  {containers.length}
                </span>
              )}
            </button>
            <button
              className={`ah-tab-btn${rightTab === "graph" ? " ah-tab-btn-on" : ""}`}
              onClick={() => setRightTab("graph")}
            >
              🔮 GRAPH
            </button>
            <button
              className={`ah-tab-btn${rightTab === "files" ? " ah-tab-btn-on" : ""}`}
              onClick={() => {
                setRightTab("files");
                loadFileCatalog();
              }}
            >
              📂 FILES{" "}
              {fileCatalog.length > 0 && (
                <span className="ah-tab-count">{fileCatalog.length}</span>
              )}
            </button>
            <button
              className={`ah-tab-btn${rightTab === "polaczek" ? " ah-tab-btn-on" : ""}`}
              onClick={() => setRightTab("polaczek")}
            >
              POLACZKI{" "}
              {polaczekList.filter((a) => a.status === "active").length > 0 && (
                <span className="ah-tab-count">
                  {polaczekList.filter((a) => a.status === "active").length}
                </span>
              )}
            </button>
            <div className="ah-status-spacer" />
            {rightTab === "tasks" && tasks.length > 0 && (
              <button
                className="ah-clear-btn"
                onClick={() => {
                  setTasks([]);
                  setTaskRunning(false);
                }}
              >
                ⌫
              </button>
            )}
            {rightTab === "skills" && (
              <>
                <button
                  className="ah-clear-btn"
                  title="Odśwież"
                  onClick={loadSkills}
                >
                  ↺
                </button>
                <button
                  className={`ah-clear-btn${showGooseImport ? " ah-tab-btn-on" : ""}`}
                  title="Importuj skills z sesji Goose Desktop"
                  onClick={() => {
                    setShowGooseImport((v) => !v);
                    if (!showGooseImport) loadGooseSessions();
                  }}
                >
                  🎯 Goose
                </button>
                <button
                  className="ah-clear-btn"
                  title="Eksportuj skills do JSON"
                  onClick={exportSkills}
                >
                  ⬇ exp
                </button>
                <label
                  className="ah-clear-btn"
                  title="Importuj skills z JSON"
                  style={{ cursor: "pointer" }}
                >
                  ⬆ imp
                  <input
                    type="file"
                    accept=".json"
                    style={{ display: "none" }}
                    onChange={importSkills}
                  />
                </label>
              </>
            )}
            {rightTab === "podman" && (
              <button
                className="ah-clear-btn"
                title="Odśwież"
                onClick={loadPodman}
              >
                ↺
              </button>
            )}
          </div>

          {/* ── Skills tab ── */}
          {rightTab === "skills" && (
            <AgentSkillsTab
              hubOnline={hubOnline}
              skillsList={skillsList}
              skillSearch={skillSearch}
              skillExpanded={skillExpanded}
              skillsLoading={skillsLoading}
              showGooseImport={showGooseImport}
              gooseSessions={gooseSessions}
              gooseImportBusy={gooseImportBusy}
              gooseImportDone={gooseImportDone}
              onLoadSkills={loadSkills}
              onSearchSkills={searchSkills}
              onDeleteSkill={deleteSkill}
              onExportSkills={exportSkills}
              onImportSkills={importSkills}
              onSendToTask={sendToTask}
              onSendToChat={sendToChat}
              onCopy={copy}
              onSkillSearchChange={setSkillSearch}
              onSkillExpandedChange={setSkillExpanded}
              onToggleGooseImport={() => setShowGooseImport((v) => !v)}
              onImportGooseSession={importGooseSession}
              onLoadGooseSessions={loadGooseSessions}
            />
          )}

          {/* ── Podman tab ── */}
          {rightTab === "podman" && (
            <AgentPodmanTab
              podmanAvail={podmanAvail}
              containers={containers}
              nsInfo={nsInfo}
              containerLogs={containerLogs}
              logsContainer={logsContainer}
              podmanBusy={podmanBusy}
              onPodmanAction={podmanAction}
              onFetchLogs={fetchLogs}
            />
          )}

          {/* ── Graph tab ── */}
          {rightTab === "graph" && (
            <div className="ah-graph-pane">
              <SkillGraphPanel />
            </div>
          )}

          {/* ── File Agent tab ── */}
          {rightTab === "files" && (
            <AgentFilesTab
              filePath={filePath}
              fileQuery={fileQuery}
              fileSync={fileSync}
              fileAutoReg={fileAutoReg}
              fileSaveRep={fileSaveRep}
              fileBusy={fileBusy}
              fileReport={fileReport}
              fileTaskId={fileTaskId}
              scanDir={scanDir}
              scanDepth={scanDepth}
              scanBusy={scanBusy}
              scanResult={scanResult}
              fileCatalog={fileCatalog}
              onRunFileAnalyze={runFileAnalyze}
              onRunFileScan={runFileScan}
              onLoadFileCatalog={loadFileCatalog}
              onFilePathChange={setFilePath}
              onFileQueryChange={setFileQuery}
              onFileSyncChange={setFileSync}
              onFileAutoRegChange={setFileAutoReg}
              onFileSaveRepChange={setFileSaveRep}
              onScanDirChange={setScanDir}
              onScanDepthChange={setScanDepth}
              onSelectCatalogPath={(path) => {
                setFilePath(path);
                setRightTab("files");
              }}
            />
          )}

          {/* ── Polaczek tab ── */}
          {rightTab === "polaczek" && (
            <AgentPolaczekTab
              polaczekList={polaczekList}
              polaczekTask={polaczekTask}
              polaczekActive={polaczekActive}
              polaczekBusy={polaczekBusy}
              polaczekOutput={polaczekOutput}
              polaczekImage={polaczekImage}
              polaczekImageName={polaczekImageName}
              polaczekProvider={polaczekProvider}
              polaczekApiKey={polaczekApiKey}
              polaczekModelOverride={polaczekModelOverride}
              onRunPolaczek={runPolaczek}
              onSetPolaczekTask={setPolaczekTask}
              onSetPolaczekActive={setPolaczekActive}
              onSetPolaczekImage={setPolaczekImage}
              onSetPolaczekImageName={setPolaczekImageName}
              onSetPolaczekProvider={setPolaczekProvider}
              onSetPolaczekApiKey={setPolaczekApiKey}
              onSetPolaczekModelOverride={setPolaczekModelOverride}
              onSetPolaczekOutput={setPolaczekOutput}
              onSetPolaczekBusy={setPolaczekBusy}
              onOpenPiTerminal={() =>
                window.dispatchEvent(
                  new CustomEvent("zeno:open-panel", {
                    detail: { panelId: "pi-terminal" },
                  }),
                )
              }
            />
          )}

          {/* ── Tasks tab ── */}
          <AgentTasksTab
            visible={rightTab === "tasks"}
            hubOnline={hubOnline}
            gooseAvail={gooseAvail}
            tasks={tasks}
            taskInput={taskInput}
            taskRunning={taskRunning}
            taskBottomRef={taskBottomRef}
            onRunTask={runTask}
            onCopy={copy}
            onSendToChat={sendToChat}
            onOpenIframe={openIframe}
            onToggleCollapse={toggleTaskCollapse}
            onTaskInputChange={setTaskInput}
          />
        </div>
      </div>

      {/* ── Iframe / Sandbox ── */}
      {showIframe && (
        <div className="ah-iframe-pane">
          <div className="ah-iframe-bar">
            <span className="ah-pane-title">⊟ SANDBOX</span>
            <input
              className="ah-iframe-input"
              type="url"
              placeholder="https://..."
              value={iframeInput || iframeUrl}
              onChange={(e) => setIframeInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setIframeUrl(iframeInput || iframeUrl);
                  setIframeInput("");
                }
              }}
            />
            <button
              className="ah-btn-go"
              onClick={() => {
                setIframeUrl(iframeInput || iframeUrl);
                setIframeInput("");
              }}
            >
              GO
            </button>
            <button
              className="ah-act-btn"
              onClick={() => copy(iframeUrl)}
              title="Kopiuj URL"
            >
              ⎘
            </button>
            <button
              className="ah-act-btn"
              onClick={() => setShowIframe(false)}
              title="Zamknij"
            >
              ✕
            </button>
          </div>
          {iframeUrl ? (
            <iframe
              className="ah-iframe"
              src={iframeUrl}
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              title="Agent HUB Sandbox"
            />
          ) : (
            <div className="ah-iframe-empty">
              Wpisz URL lub kliknij ⊞ przy URL w outputcie Goose
            </div>
          )}
        </div>
      )}
    </div>
  );
}
