/**
 * useJimboKitStore
 *
 * State management + WebSocket connection for JimboKit panel.
 * Inspired by openbotx chat store architecture.
 *
 * WebSocket events handled:
 *   chat:stream      — incremental token chunk
 *   chat:stream_end  — stream finished (content still visible)
 *   chat:message     — final persisted message
 *   chat:thinking    — agent reasoning step
 *   chat:tool_use    — tool being executed
 *   sessions:updated — refresh session list
 *
 * REST endpoints (openbotx-compatible if connected, else AI Gate fallback):
 *   POST /api/chat          → send message, get { task_id, session_id }
 *   GET  /api/chat/sessions — session list
 *   GET  /api/chat/sessions/:key — history + live_state
 *   DELETE /api/chat/sessions/:key
 *   GET  /api/system/info
 */

import { useState, useEffect, useRef, useCallback } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; name: string; description?: string }
  | { type: 'thinking'; text: string };

export interface JimboMessage {
  role: 'user' | 'assistant';
  content: string | ContentBlock[];
  agent_name?: string;
  task_id?: string;
  timestamp: number;
}

export interface JimboSession {
  key: string;
  label: string;
}

export interface LiveState {
  content: ContentBlock[];
  agent_name: string;
  toolRunning: boolean;
}

export interface TerminalEntry {
  id: string;
  command: string;
  output: string;
  status: 'running' | 'ok' | 'error';
  timestamp: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateSessionKey(): string {
  return `web:${crypto.randomUUID()}`;
}

function sessionLabel(key: string): string {
  const idx = key.indexOf(':');
  const channel = idx !== -1 ? key.slice(0, idx) : key;
  const chatId = idx !== -1 ? key.slice(idx + 1) : key;
  if (channel === 'web') {
    return chatId.length > 12 ? `Chat ${chatId.slice(0, 8)}` : chatId;
  }
  return key;
}

function chatIdFromKey(key: string): string {
  const idx = key.indexOf(':');
  return idx !== -1 ? key.slice(idx + 1) : key;
}

// ─── API base URL ─────────────────────────────────────────────────────────────

const API_BASE = 'http://127.0.0.1:4111';

async function apiPost<T = unknown>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

async function apiGet<T = unknown>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`API ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

async function apiDel(path: string): Promise<void> {
  await fetch(`${API_BASE}${path}`, { method: 'DELETE' });
}

// ─── Fallback: direct AI Gate ─────────────────────────────────────────────────

async function sendViaAiGate(message: string, sessionId: string): Promise<string> {
  const res = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, session_id: sessionId }),
  });
  if (!res.ok) throw new Error(`AI Gate → ${res.status}`);
  const data = await res.json() as { response?: string; content?: string; message?: string };
  return data.response ?? data.content ?? data.message ?? '…';
}

// ─── WebSocket manager ────────────────────────────────────────────────────────

type WsHandler = (event: string, data: unknown) => void;

function createWsConnection(onMessage: WsHandler): WebSocket | null {
  try {
    const ws = new WebSocket(`ws://127.0.0.1:4111/ws`);
    ws.onmessage = (e) => {
      try {
        const parsed = JSON.parse(e.data as string) as { event?: string; type?: string; data?: unknown };
        const event = parsed.event ?? parsed.type ?? '';
        onMessage(event, parsed.data ?? parsed);
      } catch {
        // non-JSON frame — ignore
      }
    };
    ws.onerror = () => { /* silently ignore — fallback to REST */ };
    return ws;
  } catch {
    return null;
  }
}

// ─── Store hook ───────────────────────────────────────────────────────────────

export interface JimboKitStore {
  messages: JimboMessage[];
  live: LiveState | null;
  sessions: JimboSession[];
  currentSessionId: string;
  terminalLog: TerminalEntry[];
  isConnected: boolean;

  sendMessage: (text: string) => Promise<void>;
  newSession: () => void;
  switchSession: (key: string) => Promise<void>;
  deleteSession: (key: string) => Promise<void>;
  addTerminalEntry: (entry: TerminalEntry) => void;
  updateTerminalEntry: (id: string, patch: Partial<TerminalEntry>) => void;
}

export function useJimboKitStore(): JimboKitStore {
  const storedKey = localStorage.getItem('jimbokit_session') ?? generateSessionKey();
  const [messages, setMessages] = useState<JimboMessage[]>([]);
  const [live, setLive] = useState<LiveState | null>(null);
  const [sessions, setSessions] = useState<JimboSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>(storedKey);
  const [terminalLog, setTerminalLog] = useState<TerminalEntry[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  const liveCache = useRef<Map<string, LiveState>>(new Map());
  const wsRef = useRef<WebSocket | null>(null);
  const sessionRef = useRef<string>(storedKey);

  useEffect(() => {
    localStorage.setItem('jimbokit_session', storedKey);
  }, [storedKey]);

  // keep sessionRef in sync
  useEffect(() => {
    sessionRef.current = currentSessionId;
  }, [currentSessionId]);

  // ── WebSocket ──
  useEffect(() => {
    const ws = createWsConnection(handleWsEvent);
    wsRef.current = ws;
    if (ws) {
      ws.onopen = () => setIsConnected(true);
      ws.onclose = () => setIsConnected(false);
    }
    return () => { ws?.close(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function chatId(data?: { chat_id?: string }): string {
    return data?.chat_id ?? chatIdFromKey(sessionRef.current);
  }

  function isCurrent(cid: string): boolean {
    return cid === chatIdFromKey(sessionRef.current);
  }

  function ensureLive(data?: { chat_id?: string; agent_name?: string }): LiveState {
    const id = chatId(data);
    let state = liveCache.current.get(id);
    if (!state) {
      state = { content: [], agent_name: data?.agent_name ?? '', toolRunning: false };
      liveCache.current.set(id, state);
    } else if (data?.agent_name && !state.agent_name) {
      state.agent_name = data.agent_name;
    }
    return state;
  }

  function syncLive(cid: string) {
    if (!isCurrent(cid)) return;
    const state = liveCache.current.get(cid);
    if (state) {
      setLive({ ...state, content: [...state.content] });
    }
  }

  function clearLive(cid: string) {
    liveCache.current.delete(cid);
    if (isCurrent(cid)) setLive(null);
  }

  function lastTextBlock(state: LiveState): { type: 'text'; text: string } {
    const last = state.content[state.content.length - 1];
    if (last?.type === 'text') return last as { type: 'text'; text: string };
    const block: { type: 'text'; text: string } = { type: 'text', text: '' };
    state.content.push(block);
    return block;
  }

  function handleWsEvent(event: string, data: unknown) {
    const d = data as Record<string, unknown>;
    const cid = chatId(d as { chat_id?: string });

    switch (event) {
      case 'chat:stream': {
        const state = ensureLive(d as { chat_id?: string; agent_name?: string });
        const block = lastTextBlock(state);
        block.text += (d.content as string) ?? '';
        state.toolRunning = false;
        syncLive(cid);
        break;
      }
      case 'chat:stream_end':
        // content stays visible; nothing to do
        break;
      case 'chat:thinking': {
        const state = ensureLive(d as { chat_id?: string; agent_name?: string });
        state.content.push({ type: 'thinking', text: (d.content as string) ?? '' });
        syncLive(cid);
        break;
      }
      case 'chat:tool_use': {
        const state = ensureLive(d as { chat_id?: string; agent_name?: string });
        state.content.push({
          type: 'tool_use',
          name: (d.tool as string) ?? '',
          description: (d.description as string) ?? undefined,
        });
        state.toolRunning = true;
        syncLive(cid);
        break;
      }
      case 'chat:message': {
        liveCache.current.delete(cid);
        if (!isCurrent(cid)) return;
        setLive(null);
        setMessages((prev) => {
          if (d.task_id && prev.some((m) => m.task_id === d.task_id)) return prev;
          return [
            ...prev,
            {
              role: 'assistant',
              content: (d.content as ContentBlock[]) ?? [],
              agent_name: d.agent_name as string | undefined,
              task_id: d.task_id as string | undefined,
              timestamp: Date.now(),
            },
          ];
        });
        break;
      }
      case 'sessions:updated':
        void loadSessions();
        break;
      default:
        break;
    }
  }

  const loadSessions = useCallback(async () => {
    try {
      const data = await apiGet<{ key: string }[]>('/api/chat/sessions');
      setSessions(data.map((s) => ({ key: s.key, label: sessionLabel(s.key) })));
    } catch {
      // backend not available — sessions will be empty
    }
  }, []);

  const loadHistory = useCallback(async (sessionKey: string) => {
    setCurrentSessionId(sessionKey);
    localStorage.setItem('jimbokit_session', sessionKey);
    try {
      const data = await apiGet<{
        messages?: JimboMessage[];
        live_state?: { tool_uses?: { name: string; description?: string }[]; agent_name?: string };
      }>(`/api/chat/sessions/${sessionKey}`);
      setMessages(
        (data.messages ?? []).map((m) => ({
          ...m,
          timestamp: m.timestamp ?? Date.now(),
        })),
      );
      const cid = chatIdFromKey(sessionKey);
      const backendLive = (data.live_state?.tool_uses?.length ?? 0) > 0;
      if (!backendLive) {
        liveCache.current.delete(cid);
        setLive(null);
      } else {
        const cached = liveCache.current.get(cid);
        if (cached) {
          setLive({ ...cached });
        } else {
          setLive({
            content: (data.live_state?.tool_uses ?? []).map((tu) => ({
              type: 'tool_use' as const,
              name: tu.name,
              description: tu.description,
            })),
            agent_name: data.live_state?.agent_name ?? '',
            toolRunning: true,
          });
        }
      }
    } catch {
      // backend unavailable — start fresh
      setMessages([]);
      setLive(null);
    }
  }, []);

  useEffect(() => {
    void loadHistory(currentSessionId);
    void loadSessions();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    const userMsg: JimboMessage = {
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    const cid = chatIdFromKey(sessionRef.current);
    ensureLive({ chat_id: cid });
    syncLive(cid);

    try {
      // Try openbotx-compatible backend first
      await apiPost('/api/chat', {
        message: text,
        session_id: sessionRef.current,
      });
    } catch {
      // Fallback to direct AI Gate (no streaming, but functional)
      try {
        const response = await sendViaAiGate(text, sessionRef.current);
        clearLive(cid);
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: [{ type: 'text', text: response }],
            timestamp: Date.now(),
          },
        ]);
      } catch (err2) {
        clearLive(cid);
        setMessages((prev) => {
          const idx = prev.indexOf(userMsg);
          if (idx === -1) return prev;
          return [...prev.slice(0, idx), ...prev.slice(idx + 1)];
        });
        console.error('[JimboKit] sendMessage failed:', err2);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const newSession = useCallback(() => {
    const key = generateSessionKey();
    setCurrentSessionId(key);
    localStorage.setItem('jimbokit_session', key);
    setMessages([]);
    setLive(null);
  }, []);

  const switchSession = useCallback(
    async (key: string) => {
      await loadHistory(key);
      await loadSessions();
    },
    [loadHistory, loadSessions],
  );

  const deleteSession = useCallback(
    async (key: string) => {
      try {
        await apiDel(`/api/chat/sessions/${key}`);
      } catch { /* ignore */ }
      liveCache.current.delete(chatIdFromKey(key));
      if (key === sessionRef.current) {
        setMessages([]);
        setLive(null);
      }
      await loadSessions();
    },
    [loadSessions],
  );

  const addTerminalEntry = useCallback((entry: TerminalEntry) => {
    setTerminalLog((prev) => [...prev, entry]);
  }, []);

  const updateTerminalEntry = useCallback((id: string, patch: Partial<TerminalEntry>) => {
    setTerminalLog((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    );
  }, []);

  return {
    messages,
    live,
    sessions,
    currentSessionId,
    terminalLog,
    isConnected,
    sendMessage,
    newSession,
    switchSession,
    deleteSession,
    addTerminalEntry,
    updateTerminalEntry,
  };
}
