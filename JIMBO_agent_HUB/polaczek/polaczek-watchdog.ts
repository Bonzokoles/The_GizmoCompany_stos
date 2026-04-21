/**
 * Polaczek Watchdog — port 4225
 *
 * Uruchamia agentów Polaczek przez Ollama API:
 *   - sekwencyjny pipeline (run/all): Bibliotekarz → Skaner → Porządkowy → Analityk
 *   - pojedynczy agent (run/:id)
 *   - wyniki zapisywane do polaczek/reports/
 *
 * Dodaj do start_zeno_hub.bat:
 *   start "Polaczek Watchdog" npx tsx polaczek/polaczek-watchdog.ts
 *
 * Endpointy:
 *   GET  /health
 *   GET  /status
 *   POST /run/all          ← pipeline wszystkich aktywnych
 *   POST /run/:id          ← pojedynczy agent
 *   GET  /reports          ← lista raportów
 *   GET  /reports/latest   ← ostatni raport
 */

import http from "http";
import { readFileSync, existsSync, writeFileSync, mkdirSync, readdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import OpenAI from "openai";

const __dir = dirname(fileURLToPath(import.meta.url));
const PORT  = 4225;
const OLLAMA_BASE  = "http://localhost:11434/v1";
const REPORTS_DIR  = resolve(__dir, "reports");
const REGISTRY_PATH = resolve(__dir, "registry.json");

mkdirSync(REPORTS_DIR, { recursive: true });

// ── Typy ─────────────────────────────────────────────────────────────────────

interface AgentDef {
  id: string;
  emoji: string;
  model: string;
  model_fallback: string;
  prompt_file: string;
  tasks_file: string;
  description: string;
  status: "active" | "planned";
  accepts_image?: boolean;
}

interface RunResult {
  agent_id: string;
  model: string;
  status: "ok" | "error" | "skipped";
  output: string;
  duration_ms: number;
}

interface PipelineReport {
  date: string;
  trigger: "manual" | "scheduled";
  results: RunResult[];
  total_ms: number;
  summary?: string;
}

// ── Registry ─────────────────────────────────────────────────────────────────

function loadRegistry(): { agents: AgentDef[] } {
  return JSON.parse(readFileSync(REGISTRY_PATH, "utf-8"));
}

function loadPrompt(agent: AgentDef): string {
  const p = resolve(__dir, agent.prompt_file);
  return existsSync(p) ? readFileSync(p, "utf-8") : `Jesteś ${agent.id}.`;
}

function loadTasks(agent: AgentDef): string {
  const p = resolve(__dir, agent.tasks_file);
  return existsSync(p) ? readFileSync(p, "utf-8") : "";
}

// ── Runner ────────────────────────────────────────────────────────────────────

const client = new OpenAI({ baseURL: OLLAMA_BASE, apiKey: "ollama" });

async function runAgent(agent: AgentDef, task: string, context?: string): Promise<RunResult> {
  const t0 = Date.now();
  const systemPrompt = loadPrompt(agent);
  const allTasks = loadTasks(agent);

  const userMsg = task === "default"
    ? `Wykonaj swoje standardowe zadania z listy. Zacznij od T-001.\n\nLista zadań:\n${allTasks}${context ? `\n\n--- Kontekst od poprzedniego agenta ---\n${context}` : ""}`
    : task.startsWith("T-")
      ? `Wykonaj zadanie ${task}:\n${allTasks}${context ? `\n\n--- Kontekst ---\n${context}` : ""}`
      : task;

  const tryModel = async (model: string): Promise<string> => {
    const r = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user",   content: userMsg },
      ],
      temperature: 0.3,
    });
    return r.choices[0].message.content ?? "";
  };

  try {
    const output = await tryModel(agent.model);
    return { agent_id: agent.id, model: agent.model, status: "ok", output, duration_ms: Date.now() - t0 };
  } catch {
    try {
      const output = await tryModel(agent.model_fallback);
      return { agent_id: agent.id, model: agent.model_fallback + "(fallback)", status: "ok", output, duration_ms: Date.now() - t0 };
    } catch (err2) {
      return { agent_id: agent.id, model: agent.model, status: "error", output: String(err2), duration_ms: Date.now() - t0 };
    }
  }
}

// ── Pipeline ──────────────────────────────────────────────────────────────────

// Kolejność pipeline — wynik poprzedniego przechodzi do następnego jako kontekst
const PIPELINE_ORDER = [
  "Polaczek_01_Bibliotekarz",
  "Polaczek_01_Skaner",
  "Polaczek_01_Porzadkowy",
  "Polaczek_01_Analityk",
];

type PipelineStatus = { running: boolean; started?: string; current?: string; done: number; total: number };
let pipelineStatus: PipelineStatus = { running: false, done: 0, total: 0 };

async function runPipeline(trigger: "manual" | "scheduled" = "manual"): Promise<PipelineReport> {
  const reg = loadRegistry();
  const active = PIPELINE_ORDER
    .map(id => reg.agents.find((a: AgentDef) => a.id === id))
    .filter((a): a is AgentDef => !!a && a.status === "active" && !a.accepts_image);

  pipelineStatus = { running: true, started: new Date().toISOString(), done: 0, total: active.length };

  const results: RunResult[] = [];
  const t0 = Date.now();
  let context = "";

  for (const agent of active) {
    pipelineStatus.current = agent.id;
    console.log(`[WATCHDOG] ▶ ${agent.emoji} ${agent.id} (${agent.model})`);

    const result = await runAgent(agent, "default", context);
    results.push(result);
    pipelineStatus.done++;

    if (result.status === "ok") {
      // Przekaż output do następnego agenta jako kontekst
      context = `=== ${agent.id} ===\n${result.output.slice(0, 2000)}`;
      console.log(`[WATCHDOG] ✅ ${agent.id} — ${result.duration_ms}ms`);
    } else {
      console.error(`[WATCHDOG] ❌ ${agent.id} — ${result.output}`);
    }
  }

  pipelineStatus = { running: false, done: active.length, total: active.length };

  // Zapisz raport
  const date = new Date().toISOString().slice(0, 10);
  const report: PipelineReport = { date, trigger, results, total_ms: Date.now() - t0 };
  const reportPath = resolve(REPORTS_DIR, `${new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)}.json`);
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`[WATCHDOG] 📄 Raport: ${reportPath}`);

  return report;
}

// ── HTTP server ───────────────────────────────────────────────────────────────

function json(res: http.ServerResponse, data: unknown, status = 200) {
  res.writeHead(status, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
  res.end(JSON.stringify(data));
}

function body(req: http.IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise(resolve => {
    let b = "";
    req.on("data", c => (b += c));
    req.on("end", () => { try { resolve(JSON.parse(b || "{}")); } catch { resolve({}); } });
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET,POST", "Access-Control-Allow-Headers": "Content-Type" });
    res.end(); return;
  }

  const url = req.url ?? "/";

  if (url === "/health" && req.method === "GET") {
    return json(res, { ok: true, port: PORT, status: pipelineStatus });
  }

  if (url === "/status" && req.method === "GET") {
    return json(res, pipelineStatus);
  }

  if (url === "/run/all" && req.method === "POST") {
    if (pipelineStatus.running) return json(res, { error: "Pipeline już chodzi" }, 409);
    // Uruchom asynchronicznie, od razu odpowiedz
    json(res, { ok: true, message: "Pipeline uruchomiony" });
    runPipeline("manual").catch(console.error);
    return;
  }

  const runMatch = url.match(/^\/run\/(.+)$/);
  if (runMatch && req.method === "POST") {
    const agentId = decodeURIComponent(runMatch[1]);
    const { task } = await body(req) as { task?: string };
    const reg = loadRegistry();
    const agent = reg.agents.find((a: AgentDef) => a.id === agentId);
    if (!agent) return json(res, { error: "Nieznany agent" }, 404);
    if (agent.status !== "active") return json(res, { error: "Agent nieaktywny" }, 400);

    const result = await runAgent(agent, task ?? "default");
    return json(res, result);
  }

  if (url === "/reports" && req.method === "GET") {
    const files = existsSync(REPORTS_DIR)
      ? readdirSync(REPORTS_DIR).filter(f => f.endsWith(".json")).sort().reverse().slice(0, 20)
      : [];
    return json(res, { reports: files });
  }

  if (url === "/reports/latest" && req.method === "GET") {
    const files = existsSync(REPORTS_DIR)
      ? readdirSync(REPORTS_DIR).filter(f => f.endsWith(".json")).sort().reverse()
      : [];
    if (!files.length) return json(res, { error: "Brak raportów" }, 404);
    const latest = JSON.parse(readFileSync(resolve(REPORTS_DIR, files[0]), "utf-8"));
    return json(res, latest);
  }

  json(res, { error: "Not found" }, 404);
});

server.listen(PORT, "127.0.0.1", () => {
  console.log("");
  console.log("╔═══════════════════════════════════════╗");
  console.log("║   Polaczek Watchdog v1.0               ║");
  console.log(`║   http://localhost:${PORT}             ║`);
  console.log("╚═══════════════════════════════════════╝");
  console.log("");
  console.log("  POST /run/all       — pipeline wszystkich");
  console.log("  POST /run/:id       — pojedynczy agent");
  console.log("  GET  /status        — co chodzi");
  console.log("  GET  /reports/latest — ostatni raport");
  console.log("");
});
