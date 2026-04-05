/**
 * JIMBO Agent HUB — główny serwer (port 4223)
 *
 * REST API:
 *   GET  /status              — status huba i Goose
 *   POST /chat                — LLM chat (Anthropic/OpenRouter/OpenAI)
 *   POST /agent/run           — uruchom task przez Goose
 *   GET  /agent/tasks         — lista aktywnych tasków
 *   DEL  /agent/tasks/:id     — zatrzymaj task
 *   POST /skills/search       — szukaj skills semantycznie
 *   POST /skills/save         — zapisz nowy skill
 *   GET  /skills/list         — lista wszystkich skills
 *   GET  /skills/:id          — pobierz skill z kodem
 *   POST /skills/:id/result   — oznacz wynik (success/failure)
 *   DEL  /skills/:id          — usuń skill
 *
 * WebSocket ws://localhost:4223/ws
 *   — streaming output z Goose w czasie rzeczywistym
 *
 * Etap 1+2 / ZenoBrowser JIMBO_agent_HUB
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { randomUUID } from 'crypto';
import { GooseBridge } from './core/goose-bridge.js';
import { createLLMClient, chat, chatStream, defaultModel, getProvider, type Message } from './core/llm-client.js';
import { SkillManager } from './skills/skill-manager.js';
import { loadAgents, getAgentById } from './core/agent-loader.js';
import { PodmanBridge } from './core/podman-bridge.js';
import { CONTAINER_NAMESPACE, ALL_NAMESPACES } from './skills/skill-manager.js';
import { SkillAgent } from './agents/skill-agent.js';
import { listGooseSessions, importGooseSession } from './agents/goose-session-importer.js';

// ── System prompt — wstrzykiwany do każdej rozmowy ─────────────────
const SYSTEM_PROMPT: Message = {
  role: 'system',
  content: `Jesteś JIMBO — asystentem AI zintegrowanym z JIMBO Agent HUB (ZENO Browser).

TWOJE MOŻLIWOŚCI:
- Odpowiadasz na pytania i pomagasz w planowaniu zadań
- Masz dostęp do Goose AI (autonomiczny agent kodujący) przez prawy panel
- Goose może: tworzyć pliki, pisać kod, wykonywać komendy, przeglądać web

JAK PRZEKAZAĆ ZADANIE DO GOOSE:
- Gdy użytkownik prosi o coś co wymaga kodu/plików/komend, sformułuj KONKRETNĄ instrukcję
- Napisz: "⚡ Wyślij do Goose: [instrukcja]" — użytkownik klika ⚡ przy Twojej odpowiedzi
- LUB: wpisz instrukcję bezpośrednio do pola "Instrukcja dla Goose" po prawej stronie

TWÓJ STYL:
- Zwięzły, konkretny, techniczny
- Gdy zadanie jest do zrobienia przez Goose — od razu sformułuj gotową instrukcję
- Nie tłumacz jak "można by" coś zrobić — podaj gotowe rozwiązanie
- Używaj polskiego lub angielskiego zależnie od języka użytkownika

KONTEKST PROJEKTU:
- ZENO Browser: Electron + React + Vite + Cloudflare Workers/Pages
- Stos: TypeScript, Node.js, SQLite, Anthropic API, Goose v1.29.1
- Katalog projektu: U:\\WWW_Zen_BRo_wser_org3`,
};

const PORT = Number(process.env.HUB_PORT ?? 4222);
const GOOSE_PATH = process.env.GOOSE_PATH ?? 'E:\\Programs\\goose\\goose.exe';

// ── Podman ────────────────────────────────────────────────────────
const podman = new PodmanBridge();

// ── Active namespaces — skill injection filtruje po tych domenach ─
// 'global' zawsze aktywny; pozostałe dodawane gdy kontener running
const activeNamespaces = new Set<string>(['global']);

// ── Aktywny agent (awesome-copilot) ──────────────────────────────
let activeAgentId     = '';
let activeAgentName   = '';
let activeAgentPrompt = '';

// Preload agentów w tle przy starcie
loadAgents();

// ── Init ──────────────────────────────────────────────────────────
const app = express();
app.use(express.json());

app.use((_req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

const httpServer = createServer(app);
const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
const goose = new GooseBridge(GOOSE_PATH);
const llm = createLLMClient();
const skills = new SkillManager();
const skillAgent = new SkillAgent(llm, skills);

// ── Session persistence ───────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const SESSION_STATE_FILE = path.join(__dirname, 'sessions', 'hub-state.json');

interface HubSessionState {
  sessionName:  string;
  taskCount:    number;
  createdAt:    string;
  lastTaskAt:   string;
}

function loadSessionState(): HubSessionState | null {
  try {
    if (!fs.existsSync(SESSION_STATE_FILE)) return null;
    const raw = fs.readFileSync(SESSION_STATE_FILE, 'utf-8');
    return JSON.parse(raw) as HubSessionState;
  } catch { return null; }
}

function saveSessionState() {
  const sessionName = goose.getSessionName();
  if (!sessionName) return;
  try {
    fs.mkdirSync(path.dirname(SESSION_STATE_FILE), { recursive: true });
    const state: HubSessionState = {
      sessionName,
      taskCount:  goose.getSessionTaskCount(),
      createdAt:  loadSessionState()?.createdAt ?? new Date().toISOString(),
      lastTaskAt: new Date().toISOString(),
    };
    fs.writeFileSync(SESSION_STATE_FILE, JSON.stringify(state, null, 2));
  } catch (e) { console.warn('[HUB] Nie udało się zapisać stanu sesji:', e); }
}

// Załaduj i zainicjuj sesję przy starcie huba
const savedSession = loadSessionState();
if (savedSession) {
  goose.initSession(savedSession.sessionName, savedSession.taskCount);
  console.log(`[HUB] Wznowiono sesję Goose: ${savedSession.sessionName} (${savedSession.taskCount} tasków)`);
} else {
  // Sesja zostanie utworzona przy pierwszym runTask — nadajemy teraz stałą nazwę
  const newSessionName = `jimbo-hub-${new Date().toISOString().slice(0, 10)}`;
  goose.initSession(null, 0); // null → przy pierwszym tasku użyje tej nazwy
  // Zapisz nazwę żeby była spójna — GooseBridge ustawi ją przy pierwszym runTask
  fs.mkdirSync(path.dirname(SESSION_STATE_FILE), { recursive: true });
  fs.writeFileSync(SESSION_STATE_FILE, JSON.stringify({
    sessionName: newSessionName, taskCount: 0,
    createdAt: new Date().toISOString(), lastTaskAt: new Date().toISOString(),
  } satisfies HubSessionState, null, 2));
  goose.initSession(newSessionName, 0);
  console.log(`[HUB] Nowa sesja Goose: ${newSessionName}`);
}

// Mapa taskId → lista WS klientów subskrybujących
const taskSubscribers = new Map<string, Set<WebSocket>>();

// Mapa taskId → instrukcje (do skill smart-save)
const taskInstructions = new Map<string, string>();

// SkillAgent — skill injection + auto-save (zob. agents/skill-agent.ts)

// ── WebSocket ─────────────────────────────────────────────────────
wss.on('connection', (ws) => {
  ws.on('message', (msg) => {
    try {
      const { action, taskId } = JSON.parse(msg.toString());
      if (action === 'subscribe' && taskId) {
        if (!taskSubscribers.has(taskId)) taskSubscribers.set(taskId, new Set());
        taskSubscribers.get(taskId)!.add(ws);
      }
    } catch { /* ignoruj złe wiadomości */ }
  });

  ws.on('close', () => {
    taskSubscribers.forEach((subs) => subs.delete(ws));
  });
});

function broadcast(taskId: string, payload: object) {
  const subs = taskSubscribers.get(taskId);
  if (!subs) return;
  const msg = JSON.stringify(payload);
  subs.forEach((ws) => ws.readyState === WebSocket.OPEN && ws.send(msg));
}

// Podłącz streaming Goose → WebSocket
goose.on('chunk', ({ taskId, text, isStderr }) => {
  broadcast(taskId, { type: 'chunk', taskId, text, isStderr: !!isStderr });
});

goose.on('done', (result) => {
  broadcast(result.taskId, { type: 'done', ...result });
  taskSubscribers.delete(result.taskId);
  saveSessionState();

  const instructions = taskInstructions.get(result.taskId) ?? '';
  taskInstructions.delete(result.taskId);
  // Ocena i auto-save w tle — nie blokuje odpowiedzi
  skillAgent.evalAndSave(instructions, result.output, result.exitCode).catch(() => {});
});

goose.on('error', ({ taskId, error }) => {
  broadcast(taskId, { type: 'error', taskId, error });
  taskSubscribers.delete(taskId);
  taskInstructions.delete(taskId);
});

// ── REST: status ──────────────────────────────────────────────────
app.get('/status', (_req, res) => {
  res.json({
    hub: 'JIMBO_agent_HUB',
    version: '0.1.0',
    port: PORT,
    model: defaultModel(),
    goose: {
      path: GOOSE_PATH,
      available: goose.isAvailable(),
      activeTasks: goose.getActiveTasks(),
    },
    jimboKit: `http://localhost:${process.env.JIMBO_KIT_PORT ?? 4111}`,
  });
});

// ── REST: chat (OpenRouter) ───────────────────────────────────────
// POST /chat  { messages: [{role, content}], stream?: boolean, model?: string }
app.post('/chat', async (req, res) => {
  const { messages, stream = false, model } = req.body as {
    messages?: Message[];
    stream?: boolean;
    model?: string;
  };

  if (!messages?.length) {
    return res.status(400).json({ error: 'Brak wiadomości (pole: messages)' });
  }

  // Sprawdź klucz aktywnego providera
  const provider = getProvider();
  const keyMap: Record<string, string | undefined> = {
    anthropic:  process.env.ANTHROPIC_API_KEY,
    openrouter: process.env.OPENROUTER_API_KEY,
    openai:     process.env.OPENAI_API_KEY,
  };
  if (!keyMap[provider]) {
    return res.status(503).json({
      error: `Brak API key dla providera: ${provider}`,
      hint: `Dodaj ${provider.toUpperCase()}_API_KEY w JIMBO_agent_HUB/.env`,
    });
  }

  // Wstrzyknij system prompt — połącz z aktywnym agentem jeśli ustawiony
  const agentSuffix = activeAgentName
    ? `\n\n--- ACTIVE AGENT MODE: ${activeAgentName} ---\n${activeAgentPrompt}`
    : '';

  // Skill injection — sprawdź bazę skills przed wywołaniem LLM
  const lastUserContent = messages[messages.length - 1]?.content;
  const lastUserText = typeof lastUserContent === 'string' ? lastUserContent : '';
  const skillsSuffix = await skillAgent.buildSuffix(lastUserText, activeNamespaces);

  const systemContent = SYSTEM_PROMPT.content + agentSuffix + skillsSuffix;
  const fullMessages: Message[] = [{ role: 'system', content: systemContent }, ...messages];

  try {
    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');

      await chatStream(llm, fullMessages, (text) => {
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      }, model);

      res.write('data: [DONE]\n\n');
      res.end();
    } else {
      const result = await chat(llm, fullMessages, undefined, model);
      res.json({
        model: result.model,
        content: result.choices[0]?.message?.content ?? '',
        usage: result.usage,
      });
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

// ── REST: run task ────────────────────────────────────────────────
app.post('/agent/run', async (req, res) => {
  const { instructions, workdir } = req.body as {
    instructions?: string;
    workdir?: string;
  };

  if (!instructions?.trim()) {
    return res.status(400).json({ error: 'Brak instrukcji (pole: instructions)' });
  }

  if (!goose.isAvailable()) {
    return res.status(503).json({
      error: 'Goose niedostępny',
      goosePath: GOOSE_PATH,
      hint: 'Sprawdź GOOSE_PATH w JIMBO_agent_HUB/.env',
    });
  }

  const taskId = randomUUID();

  // Zapisz instrukcje do auto-save skill po zakończeniu
  taskInstructions.set(taskId, instructions);

  // Odpowiedź z taskId — klient może subskrybować przez WS
  res.json({
    taskId,
    status: 'running',
    subscribe: `ws://localhost:${PORT}/ws → { action: "subscribe", taskId: "${taskId}" }`,
  });

  // Uruchamiamy async — nie blokujemy odpowiedzi
  goose.runTask({ id: taskId, instructions, workdir }).catch((err) => {
    console.error(`[HUB] Task ${taskId} błąd:`, err.message);
  });
});

// ── REST: aktywne taski ───────────────────────────────────────────
app.get('/agent/tasks', (_req, res) => {
  res.json({ activeTasks: goose.getActiveTasks() });
});

// ── REST: zatrzymaj task ──────────────────────────────────────────
app.delete('/agent/tasks/:id', (req, res) => {
  const killed = goose.killTask(req.params.id);
  res.json({ killed, taskId: req.params.id });
});

// ── REST: skills ──────────────────────────────────────────────────

// GET /skills/list — wszystkie skills, opcjonalnie filtruj ?namespace=analytics
app.get('/skills/list', (req, res) => {
  const ns = req.query['namespace'] as string | undefined;
  const list = skills.list(ns);
  res.json({ skills: list, total: list.length, namespace: ns ?? 'all' });
});

// POST /skills/search — szukaj semantycznie
// body: { query, topK?, minSimilarity?, namespaces?: string[] }
app.post('/skills/search', async (req, res) => {
  const { query, topK = 5, minSimilarity = 0.3, namespaces = [] } = req.body as {
    query?: string; topK?: number; minSimilarity?: number; namespaces?: string[];
  };
  if (!query?.trim()) return res.status(400).json({ error: 'Brak query' });
  try {
    const results = await skills.search(query, topK, minSimilarity, namespaces);
    res.json({ results, query });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// POST /skills/save — zapisz nowy skill
// body: { name, description, code, tags?, namespace? }
app.post('/skills/save', async (req, res) => {
  const { name, description, code, tags = [], namespace = 'global' } = req.body as {
    name?: string; description?: string; code?: string; tags?: string[]; namespace?: string;
  };
  if (!name?.trim() || !description?.trim() || !code?.trim()) {
    return res.status(400).json({ error: 'Wymagane pola: name, description, code' });
  }
  try {
    const skill = await skills.save({ name, description, code, tags, namespace });
    res.json({ skill, saved: true });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// GET /skills/export — eksport całej bazy skills jako JSON
app.get('/skills/export', (req, res) => {
  const ns = req.query['namespace'] as string | undefined;
  const list = skills.list(ns);
  // Dołącz pełny kod każdego skilla
  const full = list.map(s => {
    const detail = skills.getById(s.id);
    return { ...s, code: detail?.code ?? '' };
  });
  const payload = {
    exported_at: new Date().toISOString(),
    version: 1,
    namespace: ns ?? 'all',
    total: full.length,
    skills: full,
  };
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="skills-export-${Date.now()}.json"`);
  res.json(payload);
});

// POST /skills/import — import skills z JSON (pomija duplikaty wg name+namespace)
app.post('/skills/import', async (req, res) => {
  const body = req.body as { skills?: unknown[] };
  if (!Array.isArray(body.skills)) {
    return res.status(400).json({ error: 'Brak pola skills[] w body' });
  }
  let imported = 0;
  const skipped: string[] = [];
  for (const raw of body.skills) {
    const s = raw as Record<string, unknown>;
    if (!s.name || !s.description || !s.code) { skipped.push(String(s.name ?? '?')); continue; }
    // Sprawdź duplikat
    const existing = skills.list(s.namespace as string | undefined)
      .find(e => e.name === s.name && e.namespace === (s.namespace ?? 'global'));
    if (existing) { skipped.push(String(s.name)); continue; }
    try {
      await skills.save({
        name:        String(s.name),
        description: String(s.description),
        code:        String(s.code),
        tags:        Array.isArray(s.tags) ? s.tags as string[] : [],
        namespace:   String(s.namespace ?? 'global'),
      });
      imported++;
    } catch { skipped.push(String(s.name)); }
  }
  res.json({ imported, skipped, skippedCount: skipped.length });
});

// GET /skills/graph — nodes + edges dla React Flow
// query: ?threshold=0.65&namespace=analytics (opcjonalne)
app.get('/skills/graph', (req, res) => {
  const threshold = parseFloat((req.query['threshold'] as string) ?? '0.65');
  const ns = req.query['namespace'] as string | undefined;

  const allSkills = skills.list(ns);

  // Wczytaj embeddingi z bazy
  interface SkillRow { id: string; embedding: string; namespace: string; name: string; description: string; success_count: number; failure_count: number; tags: string; }
  const rows = allSkills as unknown as SkillRow[];

  // Cosine similarity helper
  const cosine = (a: number[], b: number[]): number => {
    if (a.length === 0 || b.length === 0) return 0;
    let dot = 0, na = 0, nb = 0;
    for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] ** 2; nb += b[i] ** 2; }
    return na === 0 || nb === 0 ? 0 : dot / (Math.sqrt(na) * Math.sqrt(nb));
  };

  // Parsuj embeddingi
  const withEmbed = rows.map(r => {
    const fullSkill = skills.getById(r.id);
    let emb: number[] = [];
    try { emb = JSON.parse((fullSkill as any)?.embedding ?? '[]'); } catch { /* ignore */ }
    return { ...r, emb, tags: JSON.parse(r.tags ?? '[]') };
  });

  // Namespace → kolor
  const NS_COLORS: Record<string, string> = {
    global:    '#6366f1',
    analytics: '#3b82f6',
    search:    '#22c55e',
    media:     '#a855f7',
    finance:   '#f59e0b',
  };

  // Nodes — pozycja: namespace-clustered layout (proste grid per namespace)
  const byNs: Record<string, typeof withEmbed> = {};
  for (const s of withEmbed) {
    (byNs[s.namespace] ??= []).push(s);
  }

  const nodes: object[] = [];
  const nsKeys = Object.keys(byNs);
  nsKeys.forEach((ns, ni) => {
    const list = byNs[ns];
    const cols = Math.ceil(Math.sqrt(list.length));
    list.forEach((s, si) => {
      nodes.push({
        id: s.id,
        type: 'skillNode',
        position: {
          x: ni * 320 + (si % cols) * 155,
          y: 60 + Math.floor(si / cols) * 100,
        },
        data: {
          label:     s.name,
          namespace: s.namespace,
          description: s.description,
          tags:      s.tags,
          ok:        s.success_count ?? 0,
          fail:      s.failure_count ?? 0,
          color:     NS_COLORS[s.namespace] ?? '#6366f1',
        },
      });
    });
  });

  // Edges — tylko pary z similarity >= threshold
  const edges: object[] = [];
  for (let i = 0; i < withEmbed.length; i++) {
    for (let j = i + 1; j < withEmbed.length; j++) {
      const sim = cosine(withEmbed[i].emb, withEmbed[j].emb);
      if (sim >= threshold) {
        edges.push({
          id:     `e-${withEmbed[i].id}-${withEmbed[j].id}`,
          source: withEmbed[i].id,
          target: withEmbed[j].id,
          animated: sim > 0.85,
          style:  { stroke: `rgba(148,163,184,${(sim - threshold) * 2})`, strokeWidth: Math.round(sim * 3) },
          label:  sim.toFixed(2),
          data:   { similarity: sim },
        });
      }
    }
  }

  res.json({ nodes, edges, total: allSkills.length, namespaces: nsKeys });
});

// ── REST: Goose Desktop session import ───────────────────────────

// GET /skills/goose-sessions — lista sesji z Goose Desktop DB
app.get('/skills/goose-sessions', (_req, res) => {
  const limit = Number(_req.query['limit'] ?? 30);
  const sessions = listGooseSessions(limit);
  res.json({ sessions, total: sessions.length });
});

// POST /skills/import-goose-session — importuj sesję Goose → Skills DB
// body: { sessionId: string }
app.post('/skills/import-goose-session', async (req, res) => {
  const { sessionId } = req.body as { sessionId?: string };
  if (!sessionId?.trim()) {
    return res.status(400).json({ error: 'Wymagane pole: sessionId' });
  }
  const result = await importGooseSession(sessionId, skillAgent);
  if (result.error) {
    return res.status(404).json(result);
  }
  res.json(result);
});

// ⚠️  UWAGA — KOLEJNOŚĆ ROUTES MA ZNACZENIE ⚠️
// GET /skills/:id jest wildcardowym catchall — MUSI być OSTATNI w sekcji /skills/.
// Wszystkie specyficzne ścieżki (/list, /search, /save, /export, /import, /graph,
// /goose-sessions, /import-goose-session) MUSZĄ być zdefiniowane PRZED tym routem.
// Dodając nowy endpoint /skills/<coś> — zawsze umieszczaj go PRZED tą linią.
// GET /skills/:id — pobierz skill z pełnym kodem
app.get('/skills/:id', (req, res) => {
  const skill = skills.getById(req.params.id);
  if (!skill) return res.status(404).json({ error: 'Skill nie znaleziony' });
  res.json({ skill });
});

// POST /skills/:id/result — zapisz wynik (success: true/false)
app.post('/skills/:id/result', (req, res) => {
  const { success } = req.body as { success?: boolean };
  if (typeof success !== 'boolean') return res.status(400).json({ error: 'Wymagane pole: success (boolean)' });
  skills.recordResult(req.params.id, success);
  res.json({ recorded: true, id: req.params.id, success });
});

// DELETE /skills/:id — usuń skill
app.delete('/skills/:id', (req, res) => {
  const deleted = skills.delete(req.params.id);
  res.json({ deleted, id: req.params.id });
});

// ── REST: Session ─────────────────────────────────────────────────

// GET /session — status bieżącej sesji Goose
app.get('/session', (_req, res) => {
  const state = loadSessionState();
  res.json({
    sessionName: goose.getSessionName(),
    taskCount:   goose.getSessionTaskCount(),
    createdAt:   state?.createdAt ?? null,
    lastTaskAt:  state?.lastTaskAt ?? null,
    active:      !!goose.getSessionName(),
  });
});

// POST /session/reset — zresetuj sesję (następny task = nowa sesja)
app.post('/session/reset', (_req, res) => {
  const previous = goose.resetSession();
  // Nowa nazwa sesji na przyszłość
  const newName = `jimbo-hub-${new Date().toISOString().slice(0, 10)}-${Date.now().toString(36)}`;
  goose.initSession(newName, 0);
  saveSessionState();
  res.json({ reset: true, previous, newSession: newName });
});

// ── REST: Podman containers ───────────────────────────────────────

// GET /podman/status — czy podman dostępny
app.get('/podman/status', (_req, res) => {
  res.json({ available: podman.isAvailable() });
});

// GET /podman/containers — lista wszystkich kontenerów
app.get('/podman/containers', async (_req, res) => {
  const containers = await podman.list();
  // Sync active namespaces z running containers
  activeNamespaces.clear();
  activeNamespaces.add('global');
  for (const c of containers) {
    if (c.state === 'running' && c.namespace !== 'global') {
      activeNamespaces.add(c.namespace);
    }
  }
  res.json({ containers, activeNamespaces: [...activeNamespaces] });
});

// POST /podman/containers/:name/start
app.post('/podman/containers/:name/start', async (req, res) => {
  const result = await podman.start(req.params.name);
  if (result.ok) {
    const ns = CONTAINER_NAMESPACE[req.params.name];
    if (ns) activeNamespaces.add(ns);
  }
  res.json(result);
});

// POST /podman/containers/:name/stop
app.post('/podman/containers/:name/stop', async (req, res) => {
  const result = await podman.stop(req.params.name);
  res.json(result);
});

// POST /podman/containers/:name/restart
app.post('/podman/containers/:name/restart', async (req, res) => {
  const result = await podman.restart(req.params.name);
  res.json(result);
});

// GET /podman/containers/:name/logs
app.get('/podman/containers/:name/logs', async (req, res) => {
  const lines = Number(req.query['lines'] ?? 80);
  const logs = await podman.logs(req.params.name, lines);
  res.json({ name: req.params.name, logs });
});

// ── REST: namespaces (skill domains) ─────────────────────────────

// GET /namespaces — lista wszystkich + aktywnych + counts
app.get('/namespaces', (_req, res) => {
  const counts = skills.countByNamespace();
  res.json({
    all:    ALL_NAMESPACES,
    active: [...activeNamespaces],
    counts,
  });
});

// POST /namespaces/activate — ręcznie aktywuj namespace
app.post('/namespaces/activate', (req, res) => {
  const { namespace } = req.body as { namespace?: string };
  if (!namespace || !ALL_NAMESPACES.includes(namespace)) {
    return res.status(400).json({ error: `Nieznany namespace: ${namespace}` });
  }
  activeNamespaces.add(namespace);
  res.json({ active: [...activeNamespaces] });
});

// POST /namespaces/deactivate
app.post('/namespaces/deactivate', (req, res) => {
  const { namespace } = req.body as { namespace?: string };
  if (namespace && namespace !== 'global') activeNamespaces.delete(namespace);
  res.json({ active: [...activeNamespaces] });
});

// ── REST: agents (awesome-copilot) ───────────────────────────────

// GET /agents/list — lista wszystkich agentów (bez pełnego systemPrompt)
app.get('/agents/list', (_req, res) => {
  const agents = loadAgents().map(({ id, name, description }) => ({ id, name, description }));
  res.json({ agents, total: agents.length });
});

// GET /agents/active — aktualnie aktywny agent
app.get('/agents/active', (_req, res) => {
  res.json(activeAgentId
    ? { id: activeAgentId, name: activeAgentName, active: true }
    : { id: null, name: null, active: false },
  );
});

// POST /agents/activate — ustaw aktywny agent
// body: { id: string } lub { id: null } żeby wyłączyć
app.post('/agents/activate', (req, res) => {
  const { id } = req.body as { id?: string | null };

  if (!id) {
    activeAgentId     = '';
    activeAgentName   = '';
    activeAgentPrompt = '';
    return res.json({ active: false, message: 'Agent wyłączony' });
  }

  const agent = getAgentById(id);
  if (!agent) return res.status(404).json({ error: `Agent nie znaleziony: ${id}` });

  activeAgentId     = agent.id;
  activeAgentName   = agent.name;
  activeAgentPrompt = agent.systemPrompt;

  res.json({ active: true, id: agent.id, name: agent.name });
});

// ── REST: Goose Desktop launcher ─────────────────────────────────

const GOOSE_DESKTOP_PATH = process.env.GOOSE_DESKTOP_PATH ?? 'U:\\Goose-1.29.1\\dist-windows\\Goose.exe';

// GET /goose/desktop/status — czy Goose Desktop dostępny
app.get('/goose/desktop/status', (_req, res) => {
  res.json({
    available: fs.existsSync(GOOSE_DESKTOP_PATH),
    path: GOOSE_DESKTOP_PATH,
  });
});

// POST /goose/desktop/launch — uruchom Goose Desktop (detached)
app.post('/goose/desktop/launch', (_req, res) => {
  if (!fs.existsSync(GOOSE_DESKTOP_PATH)) {
    return res.status(404).json({
      error: 'Goose Desktop nie znaleziony',
      path: GOOSE_DESKTOP_PATH,
      hint: 'Ustaw GOOSE_DESKTOP_PATH w JIMBO_agent_HUB/.env',
    });
  }
  try {
    const proc = spawn(GOOSE_DESKTOP_PATH, [], {
      detached: true,
      stdio:    'ignore',
      shell:    false,
    });
    proc.unref();
    console.log(`[HUB] Goose Desktop uruchomiony (PID: ${proc.pid})`);
    res.json({ launched: true, path: GOOSE_DESKTOP_PATH });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// ── Start ─────────────────────────────────────────────────────────
httpServer.listen(PORT, '127.0.0.1', () => {
  console.log('');
  console.log('╔══════════════════════════════════════╗');
  console.log('║     JIMBO Agent HUB v0.1.0           ║');
  console.log(`║     http://localhost:${PORT}           ║`);
  console.log('╚══════════════════════════════════════╝');
  console.log('');
  console.log(`Goose: ${GOOSE_PATH}`);
  console.log(`Goose dostępny: ${goose.isAvailable() ? 'TAK ✓' : 'NIE ✗ — sprawdź .env'}`);
  console.log('');
  console.log('Endpointy:');
  console.log(`  GET  http://localhost:${PORT}/status`);
  console.log(`  POST http://localhost:${PORT}/agent/run`);
  console.log(`  WS   ws://localhost:${PORT}/ws`);
  console.log('');
});
