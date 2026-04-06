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
import { MemoryManager } from './skills/memory-manager.js';
import { ReflexionEngine } from './core/reflexion-engine.js';
import { listGooseSessions, importGooseSession } from './agents/goose-session-importer.js';
import {
  listCFProjects, listDeployments, triggerDeploy,
  getLatestDeploymentLogs, getD1Stats, d1Query,
  triggerGHWorkflow, listGHRuns,
} from './core/cf-remote.js';

// ── System prompt — wstrzykiwany do każdej rozmowy ─────────────────
const SYSTEM_PROMPT: Message = {
  role: 'system',
  content: `Jesteś JIMBO — asystentem AI w JIMBO Agent HUB (ZENO Browser).
Masz pamięć, bazę skills i Goose AI (autonomiczny agent kodujący).
Projekty: ZENO Browser (U:\\WWW_Zen_BRo_wser_org3), mybonzo.com (U:\\WWW_MyBonzo_com), mybonzoai blog (U:\\WWW_MYbonzoai_blog), jimbo.org (U:\\WWW_Jimbo_ORG).
Stos: TypeScript, Node.js, SQLite, Anthropic API, Goose v1.29.1, CF Pages/Workers/D1/R2.

Gdy zadanie wymaga kodu/plików/komend — ZAWSZE formuluj gotową instrukcję w bloku:
\`\`\`goose
[kompletna instrukcja — wszystkie kroki w jednym bloku, ścieżki absolutne]
\`\`\`

Styl: zwięzły, techniczny, w języku rozmówcy. Nie tłumacz — działaj.`,
};

const PORT = Number(process.env.HUB_PORT ?? 4222);
const GOOSE_PATH = process.env.GOOSE_PATH ?? 'E:\\Programs\\goose\\goose.exe';

// ── Podman ────────────────────────────────────────────────────────
const podman = new PodmanBridge();

// ── Active namespaces — skill injection filtruje po tych domenach ─
// 'global' zawsze aktywny; pozostałe dodawane gdy kontener running
const activeNamespaces = new Set<string>(['global', 'prompts']);

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
const memory = new MemoryManager();
const reflexion = new ReflexionEngine(skills.getDb(), llm);

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
// Mapa taskId → czas startu (do pomiaru executionMs dla ReflexionEngine)
const taskStartTimes = new Map<string, number>();

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

goose.on('done', async (result) => {
  broadcast(result.taskId, { type: 'done', ...result });
  taskSubscribers.delete(result.taskId);
  saveSessionState();

  const instructions  = taskInstructions.get(result.taskId) ?? '';
  const executionMs   = Date.now() - (taskStartTimes.get(result.taskId) ?? Date.now());
  taskInstructions.delete(result.taskId);
  taskStartTimes.delete(result.taskId);
  // Ocena i auto-save w tle — nie blokuje odpowiedzi
  skillAgent.evalAndSave(instructions, result.output, result.exitCode).catch(() => {});
  // Reflexion loop — ocena jakości, aktualizacja skill score
  if (instructions && result.output) {
    reflexion.reflect({
      taskId:          result.taskId,
      taskDescription: instructions,
      agentOutput:     result.output,
      executionMs,
    }).catch(() => {});
  }

  // ── Goose synthesis: BUCH podsumowuje wynik Goose i odsyła do chatu ──
  if (instructions && result.output && result.exitCode === 0) {
    try {
      const truncatedOutput = result.output.slice(0, 4000);
      const synthesisMessages: Message[] = [
        { role: 'system', content: SYSTEM_PROMPT.content + memory.formatCoreForPrompt() },
        { role: 'user', content: instructions },
        { role: 'assistant', content: `⚡ Wyślij do Goose: ${instructions}` },
        {
          role: 'user',
          content: `Goose wykonał zadanie (exit: ${result.exitCode}, ${Math.round(result.durationMs / 1000)}s).\n\nOutput:\n${truncatedOutput}\n\n---\nPodsumuj krótko co zostało zrobione i czy zadanie się powiodło.`,
        },
      ];
      const synthesis = await chat(llm, synthesisMessages);
      const summaryContent = synthesis.choices[0]?.message?.content ?? '';
      if (summaryContent.trim()) {
        broadcast(result.taskId, { type: 'goose:synthesis', taskId: result.taskId, content: summaryContent });
        memory.saveRecall('assistant', `[Goose] ${summaryContent}`, goose.getSessionName() ?? 'default');
      }
    } catch {
      // synthesis nie jest krytyczna — ignoruj błędy
    }
  }
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

// ── Model router — wybiera model na podstawie treści zapytania ────
// Używany gdy klient nie podał modelu explicite.
// Wszystkie modele przez OpenRouter — wystarczy zmienić nazwę.
function selectModel(query: string, explicitModel?: string): string | undefined {
  if (explicitModel) return explicitModel;
  const q = query.toLowerCase();
  // Blog / content writing → darmowy Qwen dobry w językowych taskach
  if (/blog|artykuł|artyku|post|treść|tre[sś]|seo|napisz tekst|content/.test(q))
    return 'qwen/qwen3.6-plus:free';
  // Analityka / dane → Gemini Flash szybki i dobry w strukturyzowanych danych
  if (/analityk|statystyk|dashboard|wykres|raport|dane|umami|plausible/.test(q))
    return process.env.ANALYTICS_MODEL ?? 'google/gemini-2.0-flash-001';
  // Kod / debug → Claude najlepszy do tool-use i kodu TypeScript
  if (/kod|debug|bł[aą]d|error|typescript|tsx?|fix|komponent|refaktor|plik|import/.test(q))
    return process.env.CODE_MODEL ?? defaultModel();
  // Domyślny model z .env
  return undefined;
}

// ── REST: chat (OpenRouter) ───────────────────────────────────────
// POST /chat  { messages: [{role, content}] | message: string, stream?: bool, model?: string }
app.post('/chat', async (req, res) => {
  let { messages, message, stream = false, model } = req.body as {
    messages?: Message[];
    message?: string;   // shorthand — zostanie opakowany w messages
    stream?: boolean;
    model?: string;
  };

  // Shorthand: message → messages
  if (!messages?.length && message) {
    messages = [{ role: 'user', content: message }];
  }

  if (!messages?.length) {
    return res.status(400).json({ error: 'Brak wiadomości (pole: messages lub message)' });
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

  // ── System prompt: SYSTEM_PROMPT + core memory (statyczny → cacheable) ──
  const agentSuffix = activeAgentName
    ? `\n\n--- ACTIVE AGENT MODE: ${activeAgentName} ---\n${activeAgentPrompt}`
    : '';
  const coreSection  = memory.formatCoreForPrompt();
  const systemContent = SYSTEM_PROMPT.content + coreSection + agentSuffix;

  // ── User message prefix: skills + recall (Hermes pattern, per-query) ──
  const lastUserContent = messages[messages.length - 1]?.content;
  const lastUserText = typeof lastUserContent === 'string' ? lastUserContent : '';

  const [skillsPrefix, recallMatches] = await Promise.all([
    skillAgent.buildUserPrefix(lastUserText, activeNamespaces),
    lastUserText.trim() ? memory.searchRecall(lastUserText, 3) : Promise.resolve([]),
  ]);
  const recallPrefix = memory.formatRecallForPrefix(recallMatches);
  const combinedPrefix = recallPrefix + skillsPrefix;

  // Auto-select model na podstawie treści zapytania
  const selectedModel = selectModel(lastUserText, model);

  // ── File context injection — jeśli wiadomość zawiera ścieżkę/plik ──
  // Wykryj ścieżki Windows/Unix + rozszerzenia plików → dodaj wpisy z katalogu
  const filePathPattern = /(?:[A-Za-z]:\\[\w\\\s./-]+|\/[\w/\s.:-]+|[\w./\\-]+\.(?:csv|xlsx|json|md|ts|tsx|js|py|txt|pdf|log|yaml|yml))/gi;
  const mentionedPaths = lastUserText.match(filePathPattern) ?? [];
  let fileCatalogContext = '';
  if (mentionedPaths.length > 0) {
    const catalog = memory.listArchival(100).filter(e => e.source === 'file_catalog');
    const relevant = catalog.filter(e =>
      mentionedPaths.some(p => e.content.toLowerCase().includes(p.toLowerCase()))
    );
    if (relevant.length > 0) {
      fileCatalogContext = '\n[Znalezione w katalogu plików:]\n' +
        relevant.map(e => e.content).join('\n---\n') + '\n';
    }
  }

  const fullPrefix = combinedPrefix + fileCatalogContext;
  const injectedMessages: Message[] = fullPrefix
    ? [
        ...messages.slice(0, -1),
        { role: 'user' as const, content: fullPrefix + lastUserText },
      ]
    : messages;
  const fullMessages: Message[] = [{ role: 'system', content: systemContent }, ...injectedMessages];

  // ── Zapisz user message do recall (fire-and-forget) ──
  const sessionId = goose.getSessionName() ?? 'default';
  if (lastUserText.trim()) {
    memory.saveRecall('user', lastUserText, sessionId);
  }

  try {
    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');

      let assistantText = '';
      await chatStream(llm, fullMessages, (text) => {
        assistantText += text;
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      }, selectedModel);

      res.write('data: [DONE]\n\n');
      res.end();
      // Zapisz odpowiedź asystenta do recall
      if (assistantText.trim()) memory.saveRecall('assistant', assistantText, sessionId);
    } else {
      const result = await chat(llm, fullMessages, undefined, selectedModel);
      const content = result.choices[0]?.message?.content ?? '';

      // ── Auto-dispatch Goose jeśli BUCH użył bloku ```goose ... ``` ──
      const gooseMatch = content.match(/```goose\s*\n([\s\S]+?)```/);
      if (gooseMatch && goose.isAvailable()) {
        const instruction = gooseMatch[1].trim();
        const taskId = randomUUID();
        taskInstructions.set(taskId, instruction);
        // Broadcast info że task został auto-dispatched
        broadcast(taskId, { type: 'goose:dispatched', taskId, instruction });
        res.json({
          model: result.model, content, usage: result.usage,
          gooseDispatched: true, gooseTaskId: taskId, gooseInstruction: instruction,
        });
        if (content.trim()) memory.saveRecall('assistant', content, sessionId);
        goose.runTask({ id: taskId, instructions: instruction }).catch((err) => {
          console.error(`[HUB] Auto-dispatch task ${taskId} błąd:`, err.message);
        });
      } else {
        res.json({ model: result.model, content, usage: result.usage });
        if (content.trim()) memory.saveRecall('assistant', content, sessionId);
      }
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

// ── REST: run task ────────────────────────────────────────────────
app.post('/agent/run', async (req, res) => {
  const { instructions, task, workdir } = req.body as {
    instructions?: string;
    task?: string;      // alias dla instructions (kompatybilność ze skillami)
    workdir?: string;
  };

  const instruction = (instructions ?? task ?? '').trim();
  if (!instruction) {
    return res.status(400).json({ error: 'Brak instrukcji (pole: instructions lub task)' });
  }

  if (!goose.isAvailable()) {
    return res.status(503).json({
      error: 'Goose niedostępny',
      goosePath: GOOSE_PATH,
      hint: 'Sprawdź GOOSE_PATH w JIMBO_agent_HUB/.env',
    });
  }

  const taskId = randomUUID();

  // Zapisz instrukcje i czas startu (do skill auto-save + reflexion)
  taskInstructions.set(taskId, instruction);
  taskStartTimes.set(taskId, Date.now());

  // Odpowiedź z taskId — klient może subskrybować przez WS
  res.json({
    taskId,
    status: 'running',
    instruction,
    subscribe: `ws://localhost:${PORT}/ws → { action: "subscribe", taskId: "${taskId}" }`,
  });

  // Uruchamiamy async — nie blokujemy odpowiedzi
  goose.runTask({ id: taskId, instructions: instruction, workdir }).catch((err) => {
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

// ── REST: ReflexionEngine ─────────────────────────────────────────
app.get('/reflexion/stats', (_req, res) => {
  res.json(reflexion.getStats());
});

app.post('/reflexion/approve/:id', (req, res) => {
  const ok = reflexion.approveCandidateSkill(req.params.id);
  res.json({ ok, candidateId: req.params.id });
});

// ── REST: File Agent ──────────────────────────────────────────────
// Rejestruje pliki/foldery jako bazę wiedzy w archival memory.
// BUCH może wtedy znajdować je semantycznie i używać przez Goose.

// POST /files/register { path, description, tags? }
app.post('/files/register', async (req, res) => {
  const { path: filePath, description, tags = [] } = req.body as {
    path?: string; description?: string; tags?: string[];
  };
  if (!filePath || !description) {
    return res.status(400).json({ error: 'Wymagane: path, description' });
  }
  const content = `[PLIK/FOLDER]: ${filePath}\n[OPIS]: ${description}\n[TAGI]: ${(tags as string[]).join(', ')}`;
  const id = await memory.saveArchival(content, 'file_catalog', ['file', 'catalog', ...tags]);
  console.log(`[FileAgent] Zarejestrowano: ${filePath}`);
  res.json({ ok: true, id, path: filePath });
});

// GET /files/catalog — lista zarejestrowanych plików
app.get('/files/catalog', (_req, res) => {
  const entries = memory.listArchival(100).filter(e => e.source === 'file_catalog');
  const catalog = entries.map(e => {
    const pathMatch = e.content.match(/\[PLIK\/FOLDER\]: (.+)/);
    const descMatch = e.content.match(/\[OPIS\]: (.+)/);
    const tagsMatch = e.content.match(/\[TAGI\]: (.+)/);
    return {
      id:          e.id,
      path:        pathMatch?.[1]?.trim() ?? '',
      description: descMatch?.[1]?.trim() ?? '',
      tags:        tagsMatch?.[1]?.split(', ').filter(Boolean) ?? [],
      createdAt:   e.createdAt,
    };
  });
  res.json({ catalog, count: catalog.length });
});

// POST /files/analyze { path, query } — Goose czyta plik + LLM analizuje
app.post('/files/analyze', async (req, res) => {
  const { path: filePath, query = 'Podsumuj zawartość' } = req.body as {
    path?: string; query?: string;
  };
  if (!filePath) return res.status(400).json({ error: 'Wymagane: path' });
  if (!goose.isAvailable()) return res.status(503).json({ error: 'Goose niedostępny' });

  const taskId = randomUUID();
  const instruction = `Odczytaj plik lub folder: ${filePath}

Następnie wykonaj zadanie: ${query}

Jeśli to plik CSV/Excel — użyj Python (pandas) do analizy danych.
Jeśli to plik JSON — sformatuj i podsumuj strukturę.
Jeśli to folder — wylistuj pliki i opisz zawartość.
Jeśli to kod — przeanalizuj architekturę i wzorce.

Zwróć wyniki w czytelnym formacie.`;

  taskInstructions.set(taskId, instruction);
  taskStartTimes.set(taskId, Date.now());
  res.json({ taskId, status: 'running', path: filePath, query });
  goose.runTask({ id: taskId, instructions: instruction }).catch((err: Error) => {
    console.error(`[FileAgent] Analyze task ${taskId} błąd:`, err.message);
  });
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

// GET /skills/export — dump całej bazy skills do JSON (backup/transfer)
// Query: ?namespace=global
app.get('/skills/export', (req, res) => {
  const namespace = typeof req.query['namespace'] === 'string' ? req.query['namespace'] : undefined;
  const data = skills.exportJson(namespace);
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="skills-export-${Date.now()}.json"`);
  res.json({ exported: data.length, namespace: namespace ?? 'all', skills: data });
});

// POST /skills/import — przywróć skills z JSON
// Body: { skills: Skill[], mode: 'merge' | 'replace' }
// mode='merge' (default): zachowaj istniejące, mode='replace': wyczyść i wstaw od nowa
app.post('/skills/import', async (req, res) => {
  const { skills: incoming, mode } = req.body as { skills?: unknown[]; mode?: string };
  if (!Array.isArray(incoming) || incoming.length === 0) {
    return res.status(400).json({ error: 'Wymagane pole: skills (tablica)' });
  }
  const importMode = mode === 'replace' ? 'replace' : 'merge';
  const result = await skills.importJson(incoming as Partial<import('./skills/skill-manager.js').Skill>[], importMode);
  res.json({ mode: importMode, ...result });
});

// GET /skills/export-skill-md — eksport skills do formatu SKILL.md (Goose-native)
// Query params:
//   namespace=global    — filtr namespace (opcjonalny)
//   limit=100           — max liczba skills (default 100)
//   save=true           — zapisz plik SKILL.md obok AGENTS.md (Goose auto-load)
app.get('/skills/export-skill-md', (req, res) => {
  const namespace = typeof req.query['namespace'] === 'string' ? req.query['namespace'] : undefined;
  const limit = Number(req.query['limit'] ?? 100);
  const save = req.query['save'] === 'true';

  const md = skills.exportAsSkillMd(namespace, limit);

  if (save) {
    const skillMdPath = path.join(__dirname, '..', 'SKILL.md');
    try {
      fs.writeFileSync(skillMdPath, md, 'utf-8');
      console.log(`[HUB] SKILL.md zapisany: ${skillMdPath} (${md.length} znaków)`);
    } catch (err) {
      console.warn('[HUB] Nie można zapisać SKILL.md:', err instanceof Error ? err.message : err);
    }
  }

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="SKILL.md"`);
  res.send(md);
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

// ── REST: Memory (Letta 3-tier) ───────────────────────────────────

// ── TIER 1: Core Memory ──────────────────────────────────────────
// GET /memory/core — lista wszystkich wpisów
app.get('/memory/core', (_req, res) => {
  res.json({ entries: memory.getCoreAll() });
});

// POST /memory/core — zapisz/zaktualizuj wpis { key, value }
app.post('/memory/core', (req, res) => {
  const { key, value } = req.body as { key?: string; value?: string };
  if (!key?.trim() || !value?.trim()) return res.status(400).json({ error: 'Wymagane: key, value' });
  memory.setCoreEntry(key.trim(), value.trim());
  res.json({ saved: true, key: key.trim() });
});

// DELETE /memory/core/:key — usuń wpis
app.delete('/memory/core/:key', (req, res) => {
  const deleted = memory.deleteCoreEntry(req.params.key);
  res.json({ deleted, key: req.params.key });
});

// ── TIER 2: Archival Memory ───────────────────────────────────────
// GET /memory/archival — lista (limit=50)
app.get('/memory/archival', (req, res) => {
  const limit = Number(req.query['limit'] ?? 50);
  res.json({ entries: memory.listArchival(limit), count: memory.countArchival() });
});

// POST /memory/archival/save — zapisz { content, source?, tags? }
app.post('/memory/archival/save', async (req, res) => {
  const { content, source, tags } = req.body as { content?: string; source?: string; tags?: string[] };
  if (!content?.trim()) return res.status(400).json({ error: 'Wymagane: content' });
  const id = await memory.saveArchival(content.trim(), source ?? 'manual', Array.isArray(tags) ? tags : []);
  res.json({ saved: true, id });
});

// POST /memory/archival/search — { query, limit?, threshold? }
app.post('/memory/archival/search', async (req, res) => {
  const { query, limit, threshold } = req.body as { query?: string; limit?: number; threshold?: number };
  if (!query?.trim()) return res.status(400).json({ error: 'Wymagane: query' });
  const results = await memory.searchArchival(query.trim(), limit ?? 5, threshold ?? 0.55);
  res.json({ results, total: results.length });
});

// DELETE /memory/archival/:id
app.delete('/memory/archival/:id', (req, res) => {
  const deleted = memory.deleteArchival(req.params.id);
  res.json({ deleted, id: req.params.id });
});

// ── TIER 3: Recall Memory ─────────────────────────────────────────
// GET /memory/recall — ostatnie N wpisów (limit=20, sessionId?)
app.get('/memory/recall', (req, res) => {
  const limit     = Number(req.query['limit'] ?? 20);
  const sessionId = typeof req.query['sessionId'] === 'string' ? req.query['sessionId'] : undefined;
  res.json({ entries: memory.getRecentRecall(limit, sessionId), count: memory.countRecall() });
});

// POST /memory/recall/search — FTS5 { query, limit? }
app.post('/memory/recall/search', (req, res) => {
  const { query, limit } = req.body as { query?: string; limit?: number };
  if (!query?.trim()) return res.status(400).json({ error: 'Wymagane: query' });
  const results = memory.searchRecall(query.trim(), limit ?? 10);
  res.json({ results, total: results.length });
});

// POST /memory/recall/save — ręczny zapis { role, content, sessionId? }
app.post('/memory/recall/save', (req, res) => {
  const { role, content, sessionId } = req.body as { role?: string; content?: string; sessionId?: string };
  if (!role || !content?.trim()) return res.status(400).json({ error: 'Wymagane: role, content' });
  const id = memory.saveRecall(role, content.trim(), sessionId ?? '');
  res.json({ saved: true, id });
});

// GET /memory/stats — statystyki wszystkich tierów
app.get('/memory/stats', (_req, res) => {
  res.json({
    core:     { count: memory.getCoreAll().length },
    archival: { count: memory.countArchival() },
    recall:   { count: memory.countRecall() },
  });
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

// ── REST: ZENO Agents (sync z D1 przez admin API) ─────────────────

const ZENO_ADMIN_URL = 'https://zenbrowsers.org/api/admin/agents';
function zenoAdminToken(): string {
  const user = process.env.ADMIN_USER ?? 'Jimbo77';
  const pass = process.env.ADMIN_PASS ?? '';
  return Buffer.from(`${user}:${pass}`).toString('base64');
}

// GET /zeno/agents — pobierz agentów z D1
app.get('/zeno/agents', async (_req, res) => {
  try {
    const r = await fetch(ZENO_ADMIN_URL, {
      headers: { Authorization: `Basic ${zenoAdminToken()}` },
    });
    if (!r.ok) return res.status(r.status).json({ error: `Admin API ${r.status}` });
    const data = await r.json() as { agents: unknown[] };
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /zeno/agents/deploy — wdróż agenta (zmień status na deployed)
// body: { name: string, test_result?: string, score?: number }
app.post('/zeno/agents/deploy', async (req, res) => {
  const { name, test_result, score } = req.body as { name?: string; test_result?: string; score?: number };
  if (!name) return res.status(400).json({ error: 'name wymagane' });

  try {
    // 1. Pobierz aktualną listę
    const r = await fetch(ZENO_ADMIN_URL, {
      headers: { Authorization: `Basic ${zenoAdminToken()}` },
    });
    if (!r.ok) return res.status(r.status).json({ error: `Admin API fetch ${r.status}` });
    const data = await r.json() as { agents: any[] };
    const agents = data.agents ?? [];

    // 2. Znajdź agenta po nazwie i zaktualizuj status
    const idx = agents.findIndex((a: any) => a.name === name);
    if (idx < 0) return res.status(404).json({ error: `Agent "${name}" nie znaleziony` });

    agents[idx] = {
      ...agents[idx],
      status: 'deployed',
      deployed_at: new Date().toISOString(),
      ...(test_result ? { test_result } : {}),
      ...(score !== undefined ? { quality_score: score } : {}),
    };

    // 3. Zapisz z powrotem
    const saveR = await fetch(ZENO_ADMIN_URL, {
      method: 'POST',
      headers: { Authorization: `Basic ${zenoAdminToken()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ agents }),
    });
    if (!saveR.ok) return res.status(saveR.status).json({ error: `Admin API save ${saveR.status}` });

    res.json({ deployed: true, agent: agents[idx] });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
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

// ── REST: MyBonzo.com — status + skills-aware chat ───────────────

interface ProjectDef {
  id: string;
  name: string;
  dir: string;
  url: string;
  cfProject: string | null;    // null = nie CF Pages (np. Vercel)
  stack: string;
  namespace: string;
  d1Id?: string;               // CF D1 database_id (jeśli jest)
  ghOwner?: string;            // GitHub owner (dla GH Actions)
  ghRepo?: string;             // GitHub repo name
  ghWorkflow?: string;         // workflow file do dispatch (np. deploy.yml)
}

const MYBONZO_PROJECTS: ProjectDef[] = [
  {
    id: 'mybonzo',
    name: 'mybonzo.com — ZENON Biznes HUB',
    dir: 'U:\\WWW_MyBonzo_com',
    url: 'https://mybonzo.com',
    cfProject: 'mybonzo-new',
    stack: 'Astro 5 SSR + CF Pages',
    namespace: 'mybonzo',
    d1Id: '84f0f3cb-7778-4cc4-a6ba-e823ef52f1f3',
    ghOwner: 'Bonzokoles',
    ghRepo: 'luc-de-zen-on',
    ghWorkflow: 'deploy.yml',
  },
  {
    id: 'jimbo77',
    name: 'jimbo77.com',
    dir: 'U:\\WWW_Jimbo77_com',
    url: 'https://jimbo77.com',
    cfProject: 'the-jimbo77com-nxt',
    stack: 'Next.js + CF Workers',
    namespace: 'blog',
    ghOwner: 'Bonzokoles',
    ghRepo: 'the-jimbo77com-nxt',
    ghWorkflow: 'deploy.yml',
  },
  {
    id: 'mybonzoai-blog',
    name: 'mybonzoai blog',
    dir: 'U:\\WWW_MYbonzoai_blog',
    url: 'https://mybonzoai.blog',
    cfProject: 'mybonzoaiblog',
    stack: 'Astro + CF Pages',
    namespace: 'blog',
    d1Id: '08ec6390-7b9f-4177-8e37-d1daed7c67bc',
    ghOwner: 'Bonzokoles',
    ghRepo: 'mybonzoaiblog',
    ghWorkflow: 'deploy.yml',
  },
  {
    id: 'jimbo-org',
    name: 'jimbo.org — AI Social Club',
    dir: 'U:\\WWW_Jimbo_ORG',
    url: 'https://jimbo.org',
    cfProject: null,            // Vercel, nie CF Pages
    stack: 'Vite + React + Vercel',
    namespace: 'blog',
    ghOwner: 'Bonzokoles',
    ghRepo: 'jimbo77-ai-social-club',
    ghWorkflow: 'deploy.yml',
  },
];

// GET /mybonzo/projects — lista projektów z namespace + skill count
app.get('/mybonzo/projects', (_req, res) => {
  const projectsWithSkills = MYBONZO_PROJECTS.map(p => {
    const skillCount = skills.countByNamespace()[p.namespace] ?? 0;
    return { ...p, skillCount };
  });
  res.json({ projects: projectsWithSkills, total: MYBONZO_PROJECTS.length });
});

// GET /mybonzo/status — status wszystkich projektów (lokalne katalogi + skills)
app.get('/mybonzo/status', (_req, res) => {
  const status = MYBONZO_PROJECTS.map(p => {
    const dirExists = fs.existsSync(p.dir);
    const skillCount = skills.countByNamespace()[p.namespace] ?? 0;
    return {
      id: p.id,
      name: p.name,
      url: p.url,
      dir: p.dir,
      dirExists,
      stack: p.stack,
      namespace: p.namespace,
      skillCount,
      cfProject: p.cfProject,
    };
  });
  const nsByCount = skills.countByNamespace();
  res.json({
    ok: true,
    projects: status,
    skillsByNamespace: nsByCount,
    timestamp: new Date().toISOString(),
  });
});

// POST /mybonzo/chat — chat z kontekstem konkretnego projektu
// body: { messages, projectId?, stream? }
app.post('/mybonzo/chat', async (req, res) => {
  const { messages = [], projectId = 'mybonzo', stream = false } = req.body as {
    messages?: Message[];
    projectId?: string;
    stream?: boolean;
  };

  const project = MYBONZO_PROJECTS.find(p => p.id === projectId) ?? MYBONZO_PROJECTS[0];
  const namespaces = new Set([project.namespace, 'global']);

  const rawContent = [...messages].reverse().find(m => m.role === 'user')?.content ?? '';
  const lastUserText = typeof rawContent === 'string' ? rawContent : '';

  // Pobierz skills dla namespace projektu + global
  const [skillsPrefix, recallMatches] = await Promise.all([
    skillAgent.buildUserPrefix(lastUserText, namespaces),
    lastUserText.trim() ? memory.searchRecall(lastUserText, 3) : Promise.resolve([]),
  ]);

  const recallPrefix = memory.formatRecallForPrefix(recallMatches);
  const combinedPrefix = recallPrefix + skillsPrefix;

  // System prompt z kontekstem projektu
  const projectContext = `\n\n─── PROJEKT: ${project.name} ───\nStack: ${project.stack}\nDir: ${project.dir}\nURL: ${project.url}\nCF Project: ${project.cfProject}`;
  const coreSection = memory.formatCoreForPrompt();
  const systemContent = String(SYSTEM_PROMPT.content) + projectContext + coreSection;

  const enrichedMessages: Message[] = combinedPrefix
    ? messages.map((m, i) => i === messages.length - 1 && m.role === 'user'
        ? { ...m, content: combinedPrefix + (typeof m.content === 'string' ? m.content : '') }
        : m)
    : messages;

  const fullMessages: Message[] = [{ role: 'system', content: systemContent }, ...enrichedMessages];

  try {
    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      const fullContent = await chatStream(
        llm, fullMessages,
        (chunk: string) => { res.write(`data: ${JSON.stringify({ delta: chunk })}\n\n`); }
      );
      if (lastUserText) {
        memory.saveRecall('user', lastUserText, `mybonzo-${projectId}`);
        memory.saveRecall('assistant', fullContent, `mybonzo-${projectId}`);
      }
      res.write('data: [DONE]\n\n');
      res.end();
    } else {
      const result = await chat(llm, fullMessages);
      const content = result.choices[0]?.message?.content ?? '';
      if (lastUserText) {
        memory.saveRecall('user', lastUserText, `mybonzo-${projectId}`);
        memory.saveRecall('assistant', content, `mybonzo-${projectId}`);
      }
      res.json({ content, project: project.id, skillsInjected: !!skillsPrefix });
    }
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /mybonzo/skills — skills dla konkretnego projektu/namespace
// query: ?projectId=mybonzo  lub  ?namespace=mybonzo
app.get('/mybonzo/skills', (req, res) => {
  const projectId = req.query['projectId'] as string | undefined;
  const project = projectId ? MYBONZO_PROJECTS.find(p => p.id === projectId) : undefined;
  const ns = (req.query['namespace'] as string | undefined) ?? project?.namespace ?? 'mybonzo';
  const list = skills.list(ns);
  res.json({ namespace: ns, skills: list, total: list.length });
});

// POST /mybonzo/skills/seed — trigger seedera (uruchamia mybonzo-seed.ts przez Goose)
app.post('/mybonzo/skills/seed', async (_req, res) => {
  const seedPath = path.join(__dirname, 'skills', 'mybonzo-seed.ts');
  if (!fs.existsSync(seedPath)) {
    return res.status(404).json({ error: 'mybonzo-seed.ts nie znaleziony' });
  }
  try {
    const result = await goose.runTask({
      id: randomUUID(),
      instructions: `Uruchom plik: npx tsx ${seedPath}\nCel: zaseedować skills biznesowe mybonzo do bazy JIMBO HUB`,
      workdir: path.dirname(seedPath),
    });
    res.json({ started: true, taskId: result.taskId, seedPath });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── REST: Projects — CF Remote Control (Etap B) ──────────────────

function cfConfigured(): boolean {
  return !!(process.env.CF_API_TOKEN && process.env.CF_ACCOUNT_ID);
}
function ghConfigured(): boolean {
  return !!process.env.GITHUB_TOKEN;
}

// GET /projects/list — wszystkie projekty z CF build status
app.get('/projects/list', async (_req, res) => {
  const local = MYBONZO_PROJECTS.map(p => ({
    id: p.id,
    name: p.name,
    url: p.url,
    stack: p.stack,
    cfProject: p.cfProject,
    namespace: p.namespace,
    skillCount: skills.countByNamespace()[p.namespace] ?? 0,
    dirExists: fs.existsSync(p.dir),
    hasCF: !!p.cfProject,
    hasGH: !!(p.ghOwner && p.ghRepo),
    cfConfigured: cfConfigured(),
    ghConfigured: ghConfigured(),
  }));

  if (!cfConfigured()) {
    return res.json({ projects: local, cfError: 'CF_API_TOKEN / CF_ACCOUNT_ID brak w .env', timestamp: new Date().toISOString() });
  }

  // Wzbogać o CF Pages latest deployment
  try {
    const cfProjects = await listCFProjects();
    const cfMap = new Map(cfProjects.map(p => [p.name, p]));
    const enriched = local.map(p => {
      if (!p.cfProject) return { ...p, cf: null };
      const cf = cfMap.get(p.cfProject);
      if (!cf) return { ...p, cf: null };
      return {
        ...p,
        cf: {
          subdomain: cf.subdomain,
          domains: cf.domains,
          latestDeploy: cf.latest_deployment ? {
            id: cf.latest_deployment.id,
            url: cf.latest_deployment.url,
            status: cf.latest_deployment.latest_stage.status,
            env: cf.latest_deployment.environment,
            createdOn: cf.latest_deployment.created_on,
            branch: cf.latest_deployment.deployment_trigger?.metadata?.branch,
            commitMsg: cf.latest_deployment.deployment_trigger?.metadata?.commit_message,
          } : null,
        },
      };
    });
    res.json({ projects: enriched, total: enriched.length, timestamp: new Date().toISOString() });
  } catch (e: any) {
    res.json({ projects: local, cfError: e.message, timestamp: new Date().toISOString() });
  }
});

// GET /projects/:id/deployments — historia deploymentów (limit ?n=5)
app.get('/projects/:id/deployments', async (req, res) => {
  const project = MYBONZO_PROJECTS.find(p => p.id === req.params['id']);
  if (!project) return res.status(404).json({ error: `Projekt "${req.params['id']}" nie znaleziony` });
  if (!project.cfProject) return res.status(400).json({ error: 'Projekt nie jest na CF Pages (Vercel?)' });
  if (!cfConfigured()) return res.status(400).json({ error: 'CF_API_TOKEN / CF_ACCOUNT_ID brak w .env' });

  try {
    const limit = Math.min(Number(req.query['n'] ?? 5), 20);
    const deployments = await listDeployments(project.cfProject, limit);
    res.json({ project: project.id, deployments, total: deployments.length });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /projects/:id/logs — logi ostatniego deploymentu
app.get('/projects/:id/logs', async (req, res) => {
  const project = MYBONZO_PROJECTS.find(p => p.id === req.params['id']);
  if (!project) return res.status(404).json({ error: `Projekt "${req.params['id']}" nie znaleziony` });
  if (!project.cfProject) return res.status(400).json({ error: 'Projekt nie jest na CF Pages' });
  if (!cfConfigured()) return res.status(400).json({ error: 'CF_API_TOKEN / CF_ACCOUNT_ID brak w .env' });

  try {
    const result = await getLatestDeploymentLogs(project.cfProject);
    res.json({ project: project.id, ...result });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /projects/:id/deploy — trigger nowego deploymentu
// Jeśli cfProject → CF Pages API; jeśli ghWorkflow → GH Actions workflow_dispatch
app.post('/projects/:id/deploy', async (req, res) => {
  const project = MYBONZO_PROJECTS.find(p => p.id === req.params['id']);
  if (!project) return res.status(404).json({ error: `Projekt "${req.params['id']}" nie znaleziony` });

  const via = (req.body as { via?: 'cf' | 'gh' })?.via ?? (project.cfProject ? 'cf' : 'gh');

  try {
    if (via === 'cf') {
      if (!project.cfProject) return res.status(400).json({ error: 'Brak cfProject — użyj via:gh' });
      if (!cfConfigured()) return res.status(400).json({ error: 'CF_API_TOKEN / CF_ACCOUNT_ID brak w .env' });
      const deployment = await triggerDeploy(project.cfProject);
      return res.json({
        triggered: true,
        via: 'cf',
        deploymentId: deployment.id,
        url: deployment.url,
        status: deployment.latest_stage.status,
      });
    }

    if (via === 'gh') {
      if (!project.ghOwner || !project.ghRepo || !project.ghWorkflow) {
        return res.status(400).json({ error: 'Brak ghOwner/ghRepo/ghWorkflow w projekcie' });
      }
      if (!ghConfigured()) return res.status(400).json({ error: 'GITHUB_TOKEN brak w .env' });
      await triggerGHWorkflow(project.ghOwner, project.ghRepo, project.ghWorkflow);
      return res.json({ triggered: true, via: 'gh', repo: `${project.ghOwner}/${project.ghRepo}`, workflow: project.ghWorkflow });
    }

    res.status(400).json({ error: 'via musi być "cf" lub "gh"' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /projects/:id/gh/runs — ostatnie GH Actions runy
app.get('/projects/:id/gh/runs', async (req, res) => {
  const project = MYBONZO_PROJECTS.find(p => p.id === req.params['id']);
  if (!project) return res.status(404).json({ error: `Projekt "${req.params['id']}" nie znaleziony` });
  if (!project.ghOwner || !project.ghRepo || !project.ghWorkflow) {
    return res.status(400).json({ error: 'Projekt bez konfiguracji GH Actions' });
  }
  if (!ghConfigured()) return res.status(400).json({ error: 'GITHUB_TOKEN brak w .env' });

  try {
    const limit = Math.min(Number(req.query['n'] ?? 5), 10);
    const runs = await listGHRuns(project.ghOwner, project.ghRepo, project.ghWorkflow, limit);
    res.json({ project: project.id, runs });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /projects/:id/d1 — statystyki D1 + opcjonalne query
app.get('/projects/:id/d1', async (req, res) => {
  const project = MYBONZO_PROJECTS.find(p => p.id === req.params['id']);
  if (!project) return res.status(404).json({ error: `Projekt "${req.params['id']}" nie znaleziony` });
  if (!project.d1Id) return res.status(400).json({ error: 'Projekt nie ma skonfigurowanej bazy D1' });
  if (!cfConfigured()) return res.status(400).json({ error: 'CF_API_TOKEN / CF_ACCOUNT_ID brak w .env' });

  try {
    const stats = await getD1Stats(project.d1Id);
    res.json({ project: project.id, d1: stats });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /projects/:id/d1/query — SQL query do D1 przez REST API
// body: { sql: string, params?: (string|number|null)[] }
app.post('/projects/:id/d1/query', async (req, res) => {
  const project = MYBONZO_PROJECTS.find(p => p.id === req.params['id']);
  if (!project) return res.status(404).json({ error: `Projekt "${req.params['id']}" nie znaleziony` });
  if (!project.d1Id) return res.status(400).json({ error: 'Projekt nie ma skonfigurowanej bazy D1' });
  if (!cfConfigured()) return res.status(400).json({ error: 'CF_API_TOKEN / CF_ACCOUNT_ID brak w .env' });

  const { sql, params = [] } = req.body as { sql?: string; params?: (string | number | null)[] };
  if (!sql) return res.status(400).json({ error: 'sql wymagane' });

  // Blokuj destruktywne zapytania
  const sqlUpper = sql.trim().toUpperCase();
  if (sqlUpper.startsWith('DROP') || sqlUpper.startsWith('DELETE') || sqlUpper.startsWith('TRUNCATE')) {
    return res.status(403).json({ error: 'Destruktywne zapytania zablokowane. Użyj wrangler CLI.' });
  }

  try {
    const result = await d1Query(project.d1Id, sql, params);
    res.json({ project: project.id, sql, ...result });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /projects/cf/all — wszystkie CF Pages projekty na koncie (raw)
app.get('/projects/cf/all', async (_req, res) => {
  if (!cfConfigured()) return res.status(400).json({ error: 'CF_API_TOKEN / CF_ACCOUNT_ID brak w .env' });
  try {
    const projects = await listCFProjects();
    res.json({ projects, total: projects.length });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
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
