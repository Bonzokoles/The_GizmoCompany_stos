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

import { useState, useRef, useEffect, useCallback } from 'react';
import { SkillGraphPanel } from './SkillGraphPanel';
import { useJimboCopilotActions } from '../../hooks/useJimboCopilotActions';

const HUB = 'http://localhost:4224';
const HUB_WS = 'ws://localhost:4224/ws';

/* ── SSE parser (obsługuje OpenAI, Anthropic i HUB format) ── */
function parseSSEToken(line: string): string {
  if (!line.startsWith('data: ')) return '';
  const raw = line.slice(6).trim();
  if (raw === '[DONE]') return '';
  try {
    const p = JSON.parse(raw);
    if (typeof p?.choices?.[0]?.delta?.content === 'string') return p.choices[0].delta.content;
    if (p?.type === 'content_block_delta' && p?.delta?.type === 'text_delta') return p.delta.text ?? '';
    if (typeof p?.text === 'string') return p.text;
  } catch { /* ignore */ }
  return '';
}

/* ── Types ── */
interface AgentEntry { id: string; name: string; description: string; }
interface SkillEntry  {
  id: string; name: string; description: string; code?: string;
  tags?: string[]; namespace?: string; successCount?: number; failureCount?: number;
}
interface ContainerInfo {
  id: string; name: string; image: string;
  status: string; state: 'running' | 'stopped' | 'paused' | 'error' | 'unknown';
  ports: string; namespace: string;
}
interface NamespaceInfo { all: string[]; active: string[]; counts: Record<string, number>; }

interface ChatMsg {
  role: 'user' | 'assistant';
  text: string;
  ts: number;
  streaming?: boolean;
}

interface TaskLine { text: string; isStderr?: boolean; ts: number; }
interface TaskEntry {
  id: string;
  instructions: string;
  lines: TaskLine[];
  status: 'running' | 'done' | 'error';
  durationMs?: number;
}

/* ════════════════════════════════════════════════════════════ */
export function AgentHubPanel() {

  /* Hub status */
  const [hubOnline,       setHubOnline]       = useState(false);
  const [gooseAvail,      setGooseAvail]       = useState(false);
  const [hubModel,        setHubModel]         = useState('');
  const [sessionName,     setSessionName]      = useState<string | null>(null);
  const [sessionTasks,    setSessionTasks]     = useState(0);
  const [gooseDesktopAvail, setGooseDesktopAvail] = useState(false);
  const [gooseLaunching,  setGooseLaunching]   = useState(false);

  /* Chat (left) */
  const [chatHistory, setChatHistory] = useState<ChatMsg[]>([]);
  const [chatInput,   setChatInput]   = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  /* Tasks (right) */
  const [tasks,       setTasks]       = useState<TaskEntry[]>([]);
  const [taskInput,   setTaskInput]   = useState('');
  const [taskRunning, setTaskRunning] = useState(false);
  const taskBottomRef = useRef<HTMLDivElement>(null);

  /* Iframe (bottom) */
  const [iframeUrl,    setIframeUrl]    = useState('');
  const [iframeInput,  setIframeInput]  = useState('');
  const [showIframe,   setShowIframe]   = useState(false);

  /* Right pane tab: tasks | skills | podman | graph */
  const [rightTab, setRightTab] = useState<'tasks' | 'skills' | 'podman' | 'graph'>('tasks');

  /* Skills panel */
  const [skillsList,   setSkillsList]   = useState<SkillEntry[]>([]);
  const [skillSearch,  setSkillSearch]  = useState('');
  const [skillExpanded,setSkillExpanded]= useState<string | null>(null);
  const [skillsLoading,setSkillsLoading]= useState(false);

  /* Goose session import */
  interface GooseSessionMeta {
    id: string; name: string; workingDir: string;
    createdAt: string; updatedAt: string; msgCount: number; provider: string | null;
  }
  const [showGooseImport,  setShowGooseImport]  = useState(false);
  const [gooseSessions,    setGooseSessions]    = useState<GooseSessionMeta[]>([]);
  const [gooseImportBusy,  setGooseImportBusy]  = useState<Record<string, boolean>>({});
  const [gooseImportDone,  setGooseImportDone]  = useState<Record<string, string>>({});

  /* Podman */
  const [containers,    setContainers]    = useState<ContainerInfo[]>([]);
  const [nsInfo,        setNsInfo]        = useState<NamespaceInfo>({ all: [], active: [], counts: {} });
  const [podmanAvail,   setPodmanAvail]   = useState(false);
  const [logsContainer, setLogsContainer] = useState<string | null>(null);
  const [containerLogs, setContainerLogs] = useState<Record<string, string>>({});
  const [podmanBusy,    setPodmanBusy]    = useState<Record<string, boolean>>({});

  /* Agents picker */
  const [agents,          setAgents]          = useState<AgentEntry[]>([]);
  const [activeAgentId,   setActiveAgentId]   = useState<string | null>(null);
  const [activeAgentName, setActiveAgentName] = useState<string | null>(null);
  const [showAgentPicker, setShowAgentPicker] = useState(false);
  const [agentSearch,     setAgentSearch]     = useState('');

  const wsRef = useRef<WebSocket | null>(null);

  /* ── Scroll helpers ── */
  useEffect(() => { chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatHistory]);
  useEffect(() => { taskBottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [tasks]);

  /* ── Agents: load list ── */
  useEffect(() => {
    if (!hubOnline) return;
    fetch(`${HUB}/agents/list`)
      .then(r => r.json() as Promise<{ agents: AgentEntry[] }>)
      .then(d => setAgents(d.agents ?? []))
      .catch(() => {});
    fetch(`${HUB}/agents/active`)
      .then(r => r.json() as Promise<{ id: string | null; name: string | null; active: boolean }>)
      .then(d => { setActiveAgentId(d.id); setActiveAgentName(d.name); })
      .catch(() => {});
  }, [hubOnline]);

  /* ── Agents: activate / deactivate ── */
  const activateAgent = useCallback(async (id: string | null) => {
    try {
      const res = await fetch(`${HUB}/agents/activate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const d = await res.json() as { id?: string | null; name?: string | null; active?: boolean };
      setActiveAgentId(d.id ?? null);
      setActiveAgentName(d.name ?? null);
      setShowAgentPicker(false);
      setAgentSearch('');
    } catch { /* ignore */ }
  }, []);

  /* ── Skills: load + search ── */
  const loadSkills = useCallback(async () => {
    if (!hubOnline) return;
    setSkillsLoading(true);
    try {
      const r = await fetch(`${HUB}/skills/list`);
      const d = await r.json() as { skills: SkillEntry[] };
      setSkillsList(d.skills ?? []);
    } catch { /* ignore */ }
    finally { setSkillsLoading(false); }
  }, [hubOnline]);

  const searchSkills = useCallback(async (q: string) => {
    if (!q.trim() || !hubOnline) { loadSkills(); return; }
    setSkillsLoading(true);
    try {
      const r = await fetch(`${HUB}/skills/search`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, topK: 20, minSimilarity: 0.2 }),
      });
      const d = await r.json() as { results: SkillEntry[] };
      setSkillsList(d.results ?? []);
    } catch { /* ignore */ }
    finally { setSkillsLoading(false); }
  }, [hubOnline, loadSkills]);

  useEffect(() => {
    if (rightTab === 'skills' && hubOnline) loadSkills();
  }, [rightTab, hubOnline, loadSkills]);

  const deleteSkill = useCallback(async (id: string) => {
    await fetch(`${HUB}/skills/${id}`, { method: 'DELETE' }).catch(() => {});
    setSkillsList(prev => prev.filter(s => s.id !== id));
  }, []);

  const exportSkills = useCallback(async () => {
    try {
      const r = await fetch(`${HUB}/skills/export`);
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `skills-export-${new Date().toISOString().slice(0,10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { /* ignore */ }
  }, []);

  const importSkills = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as { skills?: unknown[] };
      const body = Array.isArray(parsed.skills) ? parsed : { skills: [parsed] };
      const r = await fetch(`${HUB}/skills/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const d = await r.json() as { imported: number; skippedCount: number };
      alert(`Import: ${d.imported} dodano, ${d.skippedCount} pominięto (duplikaty)`);
      loadSkills();
    } catch (err) {
      alert(`Błąd importu: ${err instanceof Error ? err.message : 'nieznany'}`);
    }
    e.target.value = '';
  }, [loadSkills]);

  /* ── Goose Desktop launch ── */
  const launchGooseDesktop = useCallback(async () => {
    if (!hubOnline || gooseLaunching) return;
    setGooseLaunching(true);
    try {
      await fetch(`${HUB}/goose/desktop/launch`, { method: 'POST' });
    } catch { /* ignore */ }
    finally { setTimeout(() => setGooseLaunching(false), 2000); }
  }, [hubOnline, gooseLaunching]);

  /* ── Goose session import ── */
  const loadGooseSessions = useCallback(async () => {
    try {
      const r = await fetch(`${HUB}/skills/goose-sessions`);
      const d = await r.json() as { sessions: GooseSessionMeta[] };
      setGooseSessions(d.sessions ?? []);
    } catch { /* ignore */ }
  }, []);

  const importGooseSession = useCallback(async (sessionId: string) => {
    setGooseImportBusy(b => ({ ...b, [sessionId]: true }));
    try {
      const r = await fetch(`${HUB}/skills/import-goose-session`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });
      const d = await r.json() as { saved?: string[]; processed?: number; skipped?: number; error?: string };
      if (d.error) {
        setGooseImportDone(p => ({ ...p, [sessionId]: `⚠ ${d.error}` }));
      } else {
        const saved = d.saved?.length ?? 0;
        setGooseImportDone(p => ({ ...p, [sessionId]: `✓ ${saved} skill${saved !== 1 ? 's' : ''} zapisano (${d.skipped ?? 0} pominięto)` }));
        if (saved > 0) loadSkills();
      }
    } catch (err) {
      setGooseImportDone(p => ({ ...p, [sessionId]: `⚠ ${err instanceof Error ? err.message : 'błąd'}` }));
    } finally {
      setGooseImportBusy(b => ({ ...b, [sessionId]: false }));
    }
  }, [loadSkills]);

  /* ── Podman: load containers + namespaces ── */
  const loadPodman = useCallback(async () => {
    if (!hubOnline) return;
    try {
      const [rc, rn] = await Promise.all([
        fetch(`${HUB}/podman/containers`),
        fetch(`${HUB}/namespaces`),
      ]);
      const dc = await rc.json() as { available?: boolean; containers?: ContainerInfo[] };
      const dn = await rn.json() as { all?: string[]; active?: string[]; counts?: Record<string, number> };
      setPodmanAvail(dc.available ?? false);
      setContainers(dc.containers ?? []);
      setNsInfo({
        all:    dn.all    ?? [],
        active: dn.active ?? [],
        counts: dn.counts ?? {},
      });
    } catch { /* ignore */ }
  }, [hubOnline]);

  useEffect(() => {
    if (rightTab === 'podman' && hubOnline) loadPodman();
  }, [rightTab, hubOnline, loadPodman]);

  const podmanAction = useCallback(async (name: string, action: 'start' | 'stop' | 'restart') => {
    setPodmanBusy(b => ({ ...b, [name]: true }));
    try {
      await fetch(`${HUB}/podman/containers/${name}/${action}`, { method: 'POST' });
      await loadPodman();
    } catch { /* ignore */ }
    finally { setPodmanBusy(b => ({ ...b, [name]: false })); }
  }, [loadPodman]);

  const fetchLogs = useCallback(async (name: string) => {
    setLogsContainer(prev => prev === name ? null : name);
    if (containerLogs[name]) return; // cached
    try {
      const r = await fetch(`${HUB}/podman/containers/${name}/logs`);
      const d = await r.json() as { logs?: string };
      setContainerLogs(prev => ({ ...prev, [name]: d.logs ?? '(brak logów)' }));
    } catch { /* ignore */ }
  }, [containerLogs]);

  /* ── Hub status poll ── */
  useEffect(() => {
    const check = async () => {
      try {
        const r = await fetch(`${HUB}/status`, { signal: AbortSignal.timeout(3000) });
        const d = await r.json() as { goose?: { available?: boolean }; model?: string };
        setHubOnline(true);
        setGooseAvail(d.goose?.available ?? false);
        setHubModel(d.model ?? '');
        fetch(`${HUB}/goose/desktop/status`)
          .then(r => r.json())
          .then((s: unknown) => setGooseDesktopAvail((s as { available?: boolean }).available ?? false))
          .catch(() => {});
        // Pobierz info o sesji równolegle
        fetch(`${HUB}/session`).then(r => r.json()).then((s: unknown) => {
          const sd = s as { sessionName?: string | null; taskCount?: number };
          setSessionName(sd.sessionName ?? null);
          setSessionTasks(sd.taskCount ?? 0);
        }).catch(() => {});
      } catch {
        setHubOnline(false);
        setGooseAvail(false);
      }
    };
    check();
    const t = setInterval(check, 10_000);
    return () => clearInterval(t);
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
            type: string; taskId: string; text?: string;
            isStderr?: boolean; exitCode?: number; durationMs?: number;
          };
          if (msg.type === 'chunk') {
            setTasks(prev => prev.map(t =>
              t.id === msg.taskId
                ? { ...t, lines: [...t.lines, { text: msg.text ?? '', isStderr: !!msg.isStderr, ts: Date.now() }] }
                : t,
            ));
          } else if (msg.type === 'done') {
            setTasks(prev => prev.map(t =>
              t.id === msg.taskId
                ? { ...t, status: (msg.exitCode ?? 0) === 0 ? 'done' : 'error', durationMs: msg.durationMs }
                : t,
            ));
            setTaskRunning(false);
          } else if (msg.type === 'error') {
            setTasks(prev => prev.map(t =>
              t.id === msg.taskId ? { ...t, status: 'error' } : t,
            ));
            setTaskRunning(false);
          }
        } catch { /* ignore */ }
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
    setChatInput('');
    setChatHistory(h => [...h, { role: 'user', text, ts: Date.now() }]);
    setChatLoading(true);
    const messages = [
      ...chatHistory.slice(-20).map(m => ({ role: m.role, content: m.text })),
      { role: 'user' as const, content: text },
    ];
    try {
      setChatHistory(h => [...h, { role: 'assistant', text: '', ts: Date.now(), streaming: true }]);
      const res = await fetch(`${HUB}/chat`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, stream: true }),
      });
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          const chunk = parseSSEToken(line);
          if (!chunk) continue;
          setChatHistory(h => h.map((m, i) =>
            i === h.length - 1 && m.streaming ? { ...m, text: m.text + chunk } : m,
          ));
        }
      }
      setChatHistory(h => h.map((m, i) =>
        i === h.length - 1 && m.streaming ? { ...m, streaming: false } : m,
      ));
    } catch (err) {
      setChatHistory(h => h.map((m, i) =>
        i === h.length - 1 && m.streaming
          ? { ...m, text: `⚠ ${err instanceof Error ? err.message : 'Błąd połączenia z hubem'}`, streaming: false }
          : m,
      ));
    } finally {
      setChatLoading(false);
    }
  }, [chatInput, chatHistory, chatLoading, hubOnline]);

  /* ── Task run ── */
  const runTask = useCallback(async () => {
    const instructions = taskInput.trim();
    if (!instructions || taskRunning || !gooseAvail) return;
    setTaskInput('');
    setTaskRunning(true);
    try {
      const res = await fetch(`${HUB}/agent/run`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instructions }),
      });
      const data = await res.json() as { taskId?: string; error?: string };
      if (!data.taskId) throw new Error(data.error ?? 'Brak taskId');
      setTasks(prev => [...prev, { id: data.taskId!, instructions, lines: [], status: 'running' }]);
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ action: 'subscribe', taskId: data.taskId }));
      }
    } catch (err) {
      setTaskRunning(false);
      setTasks(prev => [...prev, {
        id: crypto.randomUUID(), instructions,
        lines: [{ text: `⚠ ${err instanceof Error ? err.message : 'Błąd'}`, ts: Date.now() }],
        status: 'error',
      }]);
    }
  }, [taskInput, taskRunning, gooseAvail]);

  /* ── Helpers ── */
  const copy = (text: string) => navigator.clipboard.writeText(text).catch(() => {});
  const sendToChat  = (text: string) => setChatInput(prev => prev ? prev + '\n' + text : text);

  // sendToTask: wypełnia pole + od razu uruchamia jeśli Goose dostępny
  const sendToTask = useCallback(async (text: string) => {
    if (!gooseAvail || taskRunning) { setTaskInput(text); setRightTab('tasks'); return; }
    setRightTab('tasks');
    setTaskInput('');
    setTaskRunning(true);
    try {
      const res = await fetch(`${HUB}/agent/run`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instructions: text }),
      });
      const data = await res.json() as { taskId?: string; error?: string };
      if (!data.taskId) throw new Error(data.error ?? 'Brak taskId');
      setTasks(prev => [...prev, { id: data.taskId!, instructions: text, lines: [], status: 'running' }]);
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ action: 'subscribe', taskId: data.taskId }));
      }
    } catch (err) {
      setTaskRunning(false);
      setTasks(prev => [...prev, {
        id: crypto.randomUUID(), instructions: text,
        lines: [{ text: `⚠ ${err instanceof Error ? err.message : 'Błąd'}`, ts: Date.now() }],
        status: 'error',
      }]);
    }
  }, [gooseAvail, taskRunning, wsRef]);
  const openIframe  = (url: string) => { setIframeUrl(url); setShowIframe(true); };

  const taskOutput = (t: TaskEntry) => t.lines.map(l => l.text).join('');

  /* ── URL detection in task output ── */
  const extractUrls = (text: string) =>
    [...text.matchAll(/https?:\/\/[^\s"'>)]+/g)].map(m => m[0]).slice(0, 3);

  /* ── CopilotKit actions ── */
  useJimboCopilotActions({
    hubOnline,
    hubModel,
    sessionName,
    activeAgentName,
    sendToChat,
    sendToTask,
    setRightTab,
  });

  /* ════ RENDER ════════════════════════════════════════════════ */
  return (
    <div className="agent-hub-panel">

      {/* ── Status bar ── */}
      <div className="ah-statusbar">
        <span className={`ah-dot ${hubOnline ? 'ah-dot-ok' : 'ah-dot-err'}`} />
        <span className="ah-status-lbl">Hub {hubOnline ? 'online' : 'offline'} :4224</span>
        {hubOnline && <span className="ah-status-model">{hubModel}</span>}
        <span className="ah-sep">·</span>
        <span className={`ah-dot ${gooseAvail ? 'ah-dot-ok' : 'ah-dot-warn'}`} />
        <span className="ah-status-lbl">Goose {gooseAvail ? 'ready' : 'offline'}</span>
        {!hubOnline && <span className="ah-status-hint">→ uruchom: npm run hub</span>}
        {hubOnline && sessionName && (
          <>
            <span className="ah-sep">·</span>
            <span className="ah-session-info" title={`Sesja: ${sessionName}`}>
              🧠 {sessionTasks} task{sessionTasks !== 1 ? 'ów' : ''}
            </span>
            <button
              className="ah-session-reset"
              title={`Reset sesji "${sessionName}" — następny task zacznie nową sesję`}
              onClick={() => fetch(`${HUB}/session/reset`, { method: 'POST' })
                .then(() => { setSessionName(null); setSessionTasks(0); })
                .catch(() => {})}
            >↺ sesja</button>
          </>
        )}
        <div className="ah-status-spacer" />
        {gooseDesktopAvail && (
          <button
            className="ah-goose-desktop-btn"
            onClick={launchGooseDesktop}
            disabled={gooseLaunching || !hubOnline}
            title="Uruchom Goose Desktop (v41)"
          >{gooseLaunching ? '⟳' : '🖥'} Goose</button>
        )}
        <button
          className={`ah-iframe-toggle${showIframe ? ' ah-iframe-toggle-on' : ''}`}
          onClick={() => setShowIframe(v => !v)}
          title="Pokaż/ukryj sandbox iframe"
        >⊟ Sandbox</button>
      </div>

      {/* ── Split: Chat + Tasks ── */}
      <div className={`ah-split${showIframe ? ' ah-split-with-iframe' : ''}`}>

        {/* LEFT — Chat */}
        <div className="ah-pane ah-pane-chat">
          <div className="ah-pane-hdr">
            <span className="ah-pane-title">◈ AGENT CHAT</span>
            <span className="ah-pane-sub">claude-haiku · streaming</span>
            {activeAgentName && (
              <span className="ah-agent-badge" title={`Aktywny agent: ${activeAgentName}`}>
                🤖 {activeAgentName.slice(0, 18)}{activeAgentName.length > 18 ? '…' : ''}
                <button className="ah-agent-badge-x" onClick={() => activateAgent(null)} title="Wyłącz agenta">✕</button>
              </span>
            )}
            <button
              className={`ah-agent-btn${showAgentPicker ? ' ah-agent-btn-on' : ''}`}
              onClick={() => setShowAgentPicker(v => !v)}
              title="Wybierz agenta"
            >🤖 Agent{agents.length > 0 ? ` (${agents.length})` : ''}</button>
            {chatHistory.length > 0 &&
              <button className="ah-clear-btn" onClick={() => setChatHistory([])}>⌫</button>}
          </div>

          {/* ── Agent Picker overlay ── */}
          {showAgentPicker && (
            <div className="ah-agent-picker">
              <input
                className="ah-agent-search"
                placeholder="Szukaj agenta…"
                value={agentSearch}
                onChange={e => setAgentSearch(e.target.value)}
                autoFocus
              />
              <div className="ah-agent-list">
                {agents
                  .filter(a =>
                    !agentSearch ||
                    a.name.toLowerCase().includes(agentSearch.toLowerCase()) ||
                    a.description.toLowerCase().includes(agentSearch.toLowerCase())
                  )
                  .map(a => (
                    <button
                      key={a.id}
                      className={`ah-agent-item${activeAgentId === a.id ? ' ah-agent-item-active' : ''}`}
                      onClick={() => activateAgent(activeAgentId === a.id ? null : a.id)}
                      title={a.description}
                    >
                      <span className="ah-agent-item-name">{a.name}</span>
                      <span className="ah-agent-item-desc">{a.description.slice(0, 60)}{a.description.length > 60 ? '…' : ''}</span>
                    </button>
                  ))
                }
                {agents.length === 0 && <p className="ah-agent-empty">Ładowanie agentów…</p>}
              </div>
            </div>
          )}

          <div className="ah-messages">
            {chatHistory.length === 0 && (
              <p className="ah-empty">Wpisz pytanie — Agent HUB odpowie przez Haiku<br />
                <span className="ah-empty-hint">⚡ wyśle odpowiedź jako instrukcję do Goose</span>
              </p>
            )}
            {chatHistory.map((m, i) => (
              <div key={i} className={`ah-msg ah-msg-${m.role}`}>
                <div className="ah-msg-meta">
                  <span className="ah-msg-role">{m.role === 'user' ? 'TY' : 'AI'}</span>
                  <div className="ah-msg-actions">
                    <button className="ah-act-btn" onClick={() => copy(m.text)} title="Kopiuj">⎘</button>
                    {m.role === 'assistant' &&
                      <button className="ah-act-btn ah-act-primary" onClick={() => sendToTask(m.text)} title="Wyślij jako task do Goose">⚡</button>}
                  </div>
                </div>
                <p className="ah-msg-text">
                  {m.text}{m.streaming && <span className="ah-typing">▋</span>}
                </p>
              </div>
            ))}
            <div ref={chatBottomRef} />
          </div>

          <div className="ah-input-bar">
            <textarea
              className="ah-textarea"
              placeholder={hubOnline ? 'Pytanie… (Enter = wyślij, Shift+Enter = nowy wiersz)' : 'Hub offline — uruchom npm run hub'}
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); } }}
              rows={2}
              disabled={chatLoading || !hubOnline}
            />
            <button className="ah-btn-send" onClick={sendChat}
              disabled={chatLoading || !hubOnline || !chatInput.trim()}>
              {chatLoading ? '…' : '▶'}
            </button>
          </div>
        </div>

        {/* RIGHT — Goose Tasks / Skills */}
        <div className="ah-pane ah-pane-task">
          <div className="ah-pane-hdr">
            <button
              className={`ah-tab-btn${rightTab === 'tasks' ? ' ah-tab-btn-on' : ''}`}
              onClick={() => setRightTab('tasks')}
            >⚡ TASKS {tasks.length > 0 && <span className="ah-tab-count">{tasks.length}</span>}</button>
            <button
              className={`ah-tab-btn${rightTab === 'skills' ? ' ah-tab-btn-on' : ''}`}
              onClick={() => setRightTab('skills')}
            >📚 SKILLS {skillsList.length > 0 && <span className="ah-tab-count">{skillsList.length}</span>}</button>
            <button
              className={`ah-tab-btn${rightTab === 'podman' ? ' ah-tab-btn-on' : ''}`}
              onClick={() => setRightTab('podman')}
            >🐳 PODMAN {containers.length > 0 && <span className="ah-tab-count">{containers.filter(c => c.state === 'running').length}/{containers.length}</span>}</button>
            <button
              className={`ah-tab-btn${rightTab === 'graph' ? ' ah-tab-btn-on' : ''}`}
              onClick={() => setRightTab('graph')}
            >🔮 GRAPH</button>
            <div className="ah-status-spacer" />
            {rightTab === 'tasks' && tasks.length > 0 &&
              <button className="ah-clear-btn" onClick={() => { setTasks([]); setTaskRunning(false); }}>⌫</button>}
            {rightTab === 'skills' && <>
              <button className="ah-clear-btn" title="Odśwież" onClick={loadSkills}>↺</button>
              <button
                className={`ah-clear-btn${showGooseImport ? ' ah-tab-btn-on' : ''}`}
                title="Importuj skills z sesji Goose Desktop"
                onClick={() => { setShowGooseImport(v => !v); if (!showGooseImport) loadGooseSessions(); }}
              >🎯 Goose</button>
              <button className="ah-clear-btn" title="Eksportuj skills do JSON" onClick={exportSkills}>⬇ exp</button>
              <label className="ah-clear-btn" title="Importuj skills z JSON" style={{ cursor: 'pointer' }}>
                ⬆ imp
                <input type="file" accept=".json" style={{ display: 'none' }} onChange={importSkills} />
              </label>
            </>}
            {rightTab === 'podman' &&
              <button className="ah-clear-btn" title="Odśwież" onClick={loadPodman}>↺</button>}
          </div>

          {/* ── Skills tab ── */}
          {rightTab === 'skills' && (
            <div className="ah-skills-panel">

              {/* Goose session import overlay */}
              {showGooseImport && (
                <div className="ah-goose-import">
                  <div className="ah-goose-import-hdr">
                    <span>🎯 Importuj sesję Goose Desktop</span>
                    <button className="ah-act-btn" onClick={() => setShowGooseImport(false)}>✕</button>
                  </div>
                  {gooseSessions.length === 0
                    ? <p className="ah-empty">Brak sesji lub Goose Desktop nie uruchomiony</p>
                    : <div className="ah-goose-sessions-list">
                        {gooseSessions.map(s => (
                          <div key={s.id} className="ah-goose-session-row">
                            <div className="ah-goose-session-info">
                              <span className="ah-goose-session-name">{s.name}</span>
                              <span className="ah-goose-session-meta">
                                {s.msgCount} msg · {s.updatedAt.slice(0, 10)}
                                {s.provider && <span className="ah-goose-session-provider"> · {s.provider}</span>}
                              </span>
                              {s.workingDir && <span className="ah-goose-session-dir">{s.workingDir.slice(-40)}</span>}
                            </div>
                            <div className="ah-goose-session-actions">
                              {gooseImportDone[s.id]
                                ? <span className="ah-goose-import-result">{gooseImportDone[s.id]}</span>
                                : <button
                                    className="ah-act-btn ah-act-primary"
                                    disabled={gooseImportBusy[s.id]}
                                    onClick={() => importGooseSession(s.id)}
                                  >{gooseImportBusy[s.id] ? '⟳' : '⬆ importuj'}</button>
                              }
                            </div>
                          </div>
                        ))}
                      </div>
                  }
                </div>
              )}

              <div className="ah-skills-search-bar">
                <input
                  className="ah-skills-search"
                  placeholder="Szukaj skills semantycznie…"
                  value={skillSearch}
                  onChange={e => setSkillSearch(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && searchSkills(skillSearch)}
                />
                <button className="ah-btn-send" onClick={() => searchSkills(skillSearch)}
                  disabled={skillsLoading}>🔍</button>
              </div>
              <div className="ah-skills-list">
                {skillsLoading && <p className="ah-empty">Ładowanie…</p>}
                {!skillsLoading && skillsList.length === 0 &&
                  <p className="ah-empty">Brak skills.<br />
                    <span className="ah-empty-hint">Skills zapisują się automatycznie po każdym udanym Goose tasku</span>
                  </p>}
                {skillsList.map(s => (
                  <div key={s.id} className={`ah-skill-item${skillExpanded === s.id ? ' ah-skill-item-open' : ''}`}>
                    <div className="ah-skill-hdr" onClick={() => setSkillExpanded(skillExpanded === s.id ? null : s.id)}>
                      <span className="ah-skill-name">{s.name}</span>
                      <span className="ah-skill-stats">
                        {s.successCount != null && <span className="ah-skill-ok">✓{s.successCount}</span>}
                        {s.failureCount != null && s.failureCount > 0 && <span className="ah-skill-fail">✗{s.failureCount}</span>}
                      </span>
                      <span className="ah-skill-chevron">{skillExpanded === s.id ? '▲' : '▼'}</span>
                    </div>
                    {skillExpanded === s.id && (
                      <div className="ah-skill-body">
                        <p className="ah-skill-desc">{s.description}</p>
                        {s.tags && s.tags.length > 0 &&
                          <p className="ah-skill-tags">{s.tags.map(t => <span key={t} className="ah-skill-tag">{t}</span>)}</p>}
                        {s.code && <pre className="ah-skill-code">{s.code.slice(0, 600)}{s.code.length > 600 ? '\n…' : ''}</pre>}
                        <div className="ah-skill-actions">
                          <button className="ah-act-btn ah-act-primary" onClick={() => sendToTask(s.description)}
                            title="Wyślij do Goose">⚡ uruchom</button>
                          <button className="ah-act-btn" onClick={() => sendToChat(s.description)}
                            title="Wyślij do chatu">→ chat</button>
                          <button className="ah-act-btn" onClick={() => copy(s.code ?? s.description)}
                            title="Kopiuj">⎘</button>
                          <button className="ah-act-btn ah-act-danger" onClick={() => deleteSkill(s.id)}
                            title="Usuń skill">✕</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Podman tab ── */}
          {rightTab === 'podman' && (
            <div className="ah-podman-panel">
              {/* Namespace pills */}
              <div className="ah-ns-bar">
                <span className="ah-ns-label">Active namespaces:</span>
                {nsInfo.all.length === 0
                  ? <span className="ah-ns-empty">brak danych</span>
                  : nsInfo.all.map(ns => (
                    <span
                      key={ns}
                      className={`ah-ns-pill${nsInfo.active.includes(ns) ? ' ah-ns-pill-on' : ''}`}
                      title={`${nsInfo.counts[ns] ?? 0} skills`}
                    >
                      {ns}
                      {nsInfo.counts[ns] ? <span className="ah-ns-count">{nsInfo.counts[ns]}</span> : null}
                    </span>
                  ))
                }
              </div>

              {!podmanAvail && (
                <p className="ah-empty">Podman niedostępny — zainstaluj Podman i upewnij się że jest w PATH</p>
              )}

              {/* Container list */}
              <div className="ah-container-list">
                {containers.length === 0 && podmanAvail && (
                  <p className="ah-empty">Brak kontenerów — uruchom: podman ps -a</p>
                )}
                {containers.map(c => (
                  <div key={c.id} className={`ah-container-row ah-c-${c.state}`}>
                    <span className={`ah-c-dot ah-c-dot-${c.state}`} title={c.state} />
                    <div className="ah-c-info">
                      <span className="ah-c-name">{c.name}</span>
                      <span className="ah-c-image">{c.image.split('/').pop()?.split(':')[0]}</span>
                      {c.namespace && c.namespace !== 'global' &&
                        <span className="ah-c-ns">{c.namespace}</span>}
                      {c.ports && <span className="ah-c-ports">{c.ports.slice(0, 30)}</span>}
                    </div>
                    <div className="ah-c-actions">
                      {c.state !== 'running'
                        ? <button className="ah-act-btn ah-act-primary" disabled={podmanBusy[c.name]}
                            onClick={() => podmanAction(c.name, 'start')}>▶ start</button>
                        : <button className="ah-act-btn ah-act-danger" disabled={podmanBusy[c.name]}
                            onClick={() => podmanAction(c.name, 'stop')}>■ stop</button>
                      }
                      <button className="ah-act-btn" disabled={podmanBusy[c.name]}
                        onClick={() => podmanAction(c.name, 'restart')}>↺</button>
                      <button
                        className={`ah-act-btn${logsContainer === c.name ? ' ah-tab-btn-on' : ''}`}
                        onClick={() => fetchLogs(c.name)}
                      >logs</button>
                    </div>
                    {logsContainer === c.name && (
                      <pre className="ah-c-logs">
                        {containerLogs[c.name] ?? 'Ładowanie…'}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Graph tab ── */}
          {rightTab === 'graph' && (
            <div className="ah-graph-pane">
              <SkillGraphPanel />
            </div>
          )}

          {/* ── Tasks tab ── */}
          <div className="ah-task-output" ref={taskBottomRef}
            style={{ display: rightTab === 'tasks' ? undefined : 'none' }}>
            {tasks.length === 0 && (
              <p className="ah-empty">Wpisz instrukcję — Goose wykona ją i pokaże output tutaj<br />
                <span className="ah-empty-hint">Shift+Enter = uruchom · → wyśle output do chatu</span>
              </p>
            )}
            {tasks.map(task => {
              const urls = extractUrls(taskOutput(task));
              return (
                <div key={task.id} className={`ah-task ah-task-${task.status}`}>
                  <div className="ah-task-hdr">
                    <span className="ah-task-icon">
                      {task.status === 'running' ? '⟳' : task.status === 'done' ? '✓' : '✗'}
                    </span>
                    <span className="ah-task-instr" title={task.instructions}>
                      {task.instructions.slice(0, 70)}{task.instructions.length > 70 ? '…' : ''}
                    </span>
                    {task.durationMs != null &&
                      <span className="ah-task-dur">{(task.durationMs / 1000).toFixed(1)}s</span>}
                  </div>
                  <pre className="ah-task-lines">
                    {task.lines.map((l, i) => (
                      <span key={i} className={l.isStderr ? 'ah-line-err' : ''}>{l.text}</span>
                    ))}
                    {task.status === 'running' && <span className="ah-typing">▋</span>}
                  </pre>
                  <div className="ah-task-actions">
                    <button className="ah-act-btn" onClick={() => copy(taskOutput(task))} title="Kopiuj output">⎘ kopiuj</button>
                    <button className="ah-act-btn" onClick={() => sendToChat(taskOutput(task).slice(0, 3000))} title="Wyślij do chatu">→ chat</button>
                    {urls.map(url => (
                      <button key={url} className="ah-act-btn ah-act-url" onClick={() => openIframe(url)} title={url}>
                        ⊞ {new URL(url).hostname.replace('www.', '')}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {rightTab === 'tasks' && (
            <div className="ah-input-bar">
              <textarea
                className="ah-textarea"
                placeholder={
                  !hubOnline ? 'Hub offline'
                  : !gooseAvail ? 'Goose offline — uruchom hub z Goose'
                  : 'Instrukcja dla Goose… (Shift+Enter = uruchom)'
                }
                value={taskInput}
                onChange={e => setTaskInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && e.shiftKey) { e.preventDefault(); runTask(); } }}
                rows={2}
                disabled={taskRunning || !gooseAvail}
              />
              <button className="ah-btn-run" onClick={runTask}
                disabled={taskRunning || !gooseAvail || !taskInput.trim()}>
                {taskRunning ? '⟳' : '⚡'}
              </button>
            </div>
          )}
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
              onChange={e => setIframeInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { setIframeUrl(iframeInput || iframeUrl); setIframeInput(''); } }}
            />
            <button className="ah-btn-go"
              onClick={() => { setIframeUrl(iframeInput || iframeUrl); setIframeInput(''); }}>
              GO
            </button>
            <button className="ah-act-btn" onClick={() => copy(iframeUrl)} title="Kopiuj URL">⎘</button>
            <button className="ah-act-btn" onClick={() => setShowIframe(false)} title="Zamknij">✕</button>
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
