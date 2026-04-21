/**
 * Polaczek Manager — uruchamia lokalnych pomocników AI przez Ollama
 *
 * Ollama OpenAI-compat API: http://localhost:11434/v1
 * Modele: bielik-4.5b (PL), gemma3:4b, schematron-3b (po konwersji)
 *
 * Użycie:
 *   npx tsx polaczek/polaczek-manager.ts list
 *   npx tsx polaczek/polaczek-manager.ts run Polaczek_01_Bibliotekarz "T-001"
 *   npx tsx polaczek/polaczek-manager.ts chat Polaczek_01_Porzadkowy
 */

import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import OpenAI from "openai";

const __dir = dirname(fileURLToPath(import.meta.url));

const REGISTRY_PATH = resolve(__dir, "registry.json");
const OLLAMA_BASE = "http://localhost:11434/v1";

interface PolaczekAgent {
  id: string;
  role: string;
  emoji: string;
  model: string;
  model_fallback: string;
  prompt_file: string;
  tasks_file: string;
  description: string;
  tags: string[];
  status: "active" | "planned";
}

interface Registry {
  version: string;
  agents: PolaczekAgent[];
  ollama_base: string;
}

function loadRegistry(): Registry {
  return JSON.parse(readFileSync(REGISTRY_PATH, "utf-8"));
}

function loadPrompt(agent: PolaczekAgent): string {
  const path = resolve(__dir, agent.prompt_file);
  return existsSync(path) ? readFileSync(path, "utf-8") : `Jesteś ${agent.id}.`;
}

function loadTasks(agent: PolaczekAgent): string {
  const path = resolve(__dir, agent.tasks_file);
  return existsSync(path) ? readFileSync(path, "utf-8") : "Brak zdefiniowanych zadań.";
}

async function checkOllamaModel(model: string): Promise<boolean> {
  try {
    const res = await fetch(`${OLLAMA_BASE.replace("/v1", "")}/api/show`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: model }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function runPolaczek(agentId: string, task: string): Promise<void> {
  const registry = loadRegistry();
  const agent = registry.agents.find((a) => a.id === agentId);

  if (!agent) {
    console.error(`❌ Nieznany agent: ${agentId}`);
    console.log("Dostępni:", registry.agents.map((a) => a.id).join(", "));
    process.exit(1);
  }

  if (agent.status === "planned") {
    console.log(`⚠️  ${agent.emoji} ${agent.id} jest planowany (status: planned)`);
    return;
  }

  // Wybierz model — sprawdź dostępność w Ollama
  let model = agent.model;
  const available = await checkOllamaModel(model);
  if (!available) {
    console.warn(`⚠️  Model ${model} niedostępny, próbuję fallback: ${agent.model_fallback}`);
    model = agent.model_fallback;
  }

  const systemPrompt = loadPrompt(agent);
  const tasks = loadTasks(agent);

  const client = new OpenAI({
    baseURL: OLLAMA_BASE,
    apiKey: "ollama",
  });

  console.log(`\n${agent.emoji} ${agent.id} [${model}]`);
  console.log("─".repeat(60));

  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: task.startsWith("T-")
        ? `Wykonaj zadanie ${task} z listy:\n\n${tasks}`
        : task,
    },
  ];

  const stream = await client.chat.completions.create({
    model,
    messages,
    stream: true,
    temperature: 0.3,
  });

  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content ?? "";
    process.stdout.write(text);
  }
  console.log("\n");
}

async function listAgents(): Promise<void> {
  const registry = loadRegistry();
  console.log(`\n📋 Polaczek Agents v${registry.version}\n`);
  for (const agent of registry.agents) {
    const statusIcon = agent.status === "active" ? "✅" : "🔲";
    console.log(`  ${statusIcon} ${agent.emoji} ${agent.id}`);
    console.log(`     Model: ${agent.model}`);
    console.log(`     ${agent.description}`);
    console.log(`     Tags: ${agent.tags.join(", ")}\n`);
  }
}

// ── CLI ───────────────────────────────────────────────────────────────────────
const [, , cmd, ...args] = process.argv;

switch (cmd) {
  case "list":
    await listAgents();
    break;
  case "run":
    if (!args[0] || !args[1]) {
      console.error("Użycie: run <AgentId> <task_id_lub_pytanie>");
      process.exit(1);
    }
    await runPolaczek(args[0], args.slice(1).join(" "));
    break;
  default:
    console.log("Komendy: list | run <AgentId> <task>");
    break;
}
