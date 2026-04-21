/**
 * JimboKit Server — standalone AI chat backend dla ZENO Browser
 *
 * Port:  3701 (domyślnie)
 * HTTP endpoints:
 *   GET  /health                        — status serwera
 *   GET  /api/system/info               — info o serwisie
 *   POST /api/chat                      — wyślij wiadomość (streaming via WS)
 *   GET  /api/chat/sessions             — lista sesji
 *   GET  /api/chat/sessions/:key        — historia sesji
 *   DELETE /api/chat/sessions/:key      — usuń sesję
 *   POST /api/webgate/fetch             — fetch URL (dla terminala)
 *
 * WebSocket ws://127.0.0.1:3701/ws:
 *   events: chat:stream, chat:stream_end, chat:message, chat:thinking,
 *            chat:tool_use, sessions:updated, connected
 *
 * Env (z ../.env lub własny .env):
 *   OPENROUTER_API_KEY  — klucz OpenRouter (wymagany)
 *   JIMBO_PORT          — port (domyślnie 3701)
 *   JIMBO_MODEL         — model (domyślnie deepseek/deepseek-r1-0528:free)
 */

import http from "http";
import { WebSocketServer, WebSocket } from "ws";
import OpenAI from "openai";
import { randomUUID } from "crypto";
import { readFileSync, existsSync, readdirSync, statSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { executeJimboTool, jimboOpenAITools } from "./tools/index";
import { ROLE_MODELS, FALLBACK_CHAINS } from "../config/openrouter-models.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname_kit = dirname(__filename);

// ── Wczytaj zewnętrzny prompt systemowy (lib/system-prompt.md) ───────────────
const SYSTEM_PROMPT_PATH = resolve(__dirname_kit, "lib/system-prompt.md");
let EXTERNAL_SYSTEM_PROMPT = "";
if (existsSync(SYSTEM_PROMPT_PATH)) {
  EXTERNAL_SYSTEM_PROMPT = readFileSync(SYSTEM_PROMPT_PATH, "utf-8").trim();
  console.log("[JIMBOKIT] Loaded system-prompt.md:", SYSTEM_PROMPT_PATH);
} else {
  console.warn("[JIMBOKIT] system-prompt.md not found, using inline fallback");
}

// ── Auto-start: wczytaj kontekst workspace przy starcie serwera ───────────────

function tryReadFile(filePath: string, label: string): string {
  if (!existsSync(filePath)) {
    console.warn(`[JIMBOKIT] Auto-context: brak pliku: ${label}`);
    return "";
  }
  const content = readFileSync(filePath, "utf-8").trim();
  console.log(`[JIMBOKIT] Auto-context OK: ${label} (${content.length} znaków)`);
  return content;
}

const WORKSPACE_ROOT = resolve(__dirname_kit, "..");

// 1. Jimbo system prompt z WORKSPACE_META_DATA
const WS_JIMBO_PROMPT = tryReadFile(
  resolve(WORKSPACE_ROOT, "WORKSPACE_META_DATA/prompty/jimbo/system-prompt.md"),
  "WORKSPACE_META_DATA/prompty/jimbo/system-prompt.md"
);

// 2. Pliki STEP (procedury kroków)
const STEP_01 = tryReadFile(resolve(__dirname_kit, "lib/STEP_01.md"), "STEP_01.md");
const STEP_02 = tryReadFile(resolve(__dirname_kit, "lib/STEP_02.md"), "STEP_02.md");
const STEP_03 = tryReadFile(resolve(__dirname_kit, "lib/STEP_03.md"), "STEP_03.md");

// 3. README projektu (skrócony do 2000 znaków)
const README_RAW = tryReadFile(resolve(WORKSPACE_ROOT, "README.md"), "README.md");
const README_EXCERPT = README_RAW.length > 2000
  ? README_RAW.slice(0, 2000) + "\n…(skrócono)"
  : README_RAW;

// 4. Statusy projektów z WORKSPACE_META_DATA/projekty/
function loadProjectStatuses(): string {
  const projektDir = resolve(WORKSPACE_ROOT, "WORKSPACE_META_DATA/projekty");
  if (!existsSync(projektDir)) return "";
  const sections: string[] = [];
  try {
    for (const entry of readdirSync(projektDir)) {
      const statusPath = resolve(projektDir, entry, "status.md");
      if (existsSync(statusPath)) {
        const content = readFileSync(statusPath, "utf-8").trim();
        sections.push(content);
        console.log(`[JIMBOKIT] Auto-context: status projektu ${entry}`);
      }
    }
  } catch (e) {
    console.warn("[JIMBOKIT] Auto-context: błąd ładowania statusów projektów:", e);
  }
  return sections.join("\n\n---\n\n");
}
const PROJECT_STATUSES = loadProjectStatuses();

// Złóż SESSION_CONTEXT — doklejany do systemu przy każdej sesji
const contextParts: string[] = [];
if (WS_JIMBO_PROMPT) contextParts.push(`### Instrukcje Jimbo (WORKSPACE)\n${WS_JIMBO_PROMPT}`);
if (STEP_01)          contextParts.push(`### STEP_01 — Procedura kroku 1\n${STEP_01}`);
if (STEP_02)          contextParts.push(`### STEP_02 — Procedura kroku 2\n${STEP_02}`);
if (STEP_03)          contextParts.push(`### STEP_03 — Procedura kroku 3\n${STEP_03}`);
if (PROJECT_STATUSES) contextParts.push(`### Statusy projektów (workspace)\n${PROJECT_STATUSES}`);
if (README_EXCERPT)   contextParts.push(`### README projektu (fragment)\n${README_EXCERPT}`);

const SESSION_CONTEXT = contextParts.length > 0
  ? `\n\n${"═".repeat(60)}\nKONTEKST WORKSPACE — wczytany automatycznie przy starcie\n${"═".repeat(60)}\n\n${contextParts.join("\n\n---\n\n")}\n\n${"═".repeat(60)}\nKONIEC KONTEKSTU WORKSPACE\n${"═".repeat(60)}`
  : "";

if (SESSION_CONTEXT) {
  console.log(`[JIMBOKIT] ✅ Session context: ${contextParts.length} sekcji, ${SESSION_CONTEXT.length} znaków łącznie`);
} else {
  console.warn("[JIMBOKIT] ⚠ Session context pusty — sprawdź ścieżki WORKSPACE_META_DATA");
}

// ── Env (załaduj ../.env lub .env) ────────────────────────────────────────────

function loadEnv(filePath: string) {
  if (!existsSync(filePath)) return;
  const lines = readFileSync(filePath, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed
      .slice(eq + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
    if (key && !process.env[key]) process.env[key] = val;
  }
}

const __dir = dirname(fileURLToPath(import.meta.url));
loadEnv(resolve(__dir, ".env"));
loadEnv(resolve(__dir, "../.env"));

const PORT = Number(process.env.JIMBO_PORT ?? 3701);

// Łańcuchy fallback — sys próbuje modele po kolei, pomijając niedostępne
const CHAT_CHAIN: string[] = process.env.JIMBO_MODEL
  ? [process.env.JIMBO_MODEL, ...FALLBACK_CHAINS.JIMBO_CHAT]
  : [...FALLBACK_CHAINS.JIMBO_CHAT];
const TOOL_CHAIN: string[] = process.env.JIMBO_TOOL_MODEL
  ? [process.env.JIMBO_TOOL_MODEL, ...FALLBACK_CHAINS.JIMBO_TOOLS]
  : [...FALLBACK_CHAINS.JIMBO_TOOLS];
const MODEL = CHAT_CHAIN[0]; // aktywny model (do logów/status)
const TOOL_MODEL = TOOL_CHAIN[0]; // aktywny tool model (do logów/status)
const ORKEY = process.env.OPENROUTER_API_KEY ?? "";
const SEARXNG_URL = process.env.SEARXNG_URL ?? "http://localhost:8888";
const JIMBO_GW =
  process.env.JIMBO_GATEWAY_URL ??
  "https://jimbo-gateway.stolarnia-ams.workers.dev";
const BUCH_URL = process.env.BUCH_URL ?? "http://localhost:5180";

// ── OpenRouter client ──────────────────────────────────────────────────────────

const openrouter = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: ORKEY || "MISSING",
  defaultHeaders: {
    "HTTP-Referer": "https://zenbrowsers.org",
    "X-Title": "ZENO JimboKit",
  },
});

// ── Session store (in-memory) ─────────────────────────────────────────────────

interface JimboMessage {
  role: "user" | "assistant";
  content: string;
  agent_name?: string;
  task_id?: string;
  timestamp: number;
}

interface Session {
  key: string;
  messages: JimboMessage[];
}

const sessionStore = new Map<string, Session>();

function getOrCreate(key: string): Session {
  if (!sessionStore.has(key)) {
    sessionStore.set(key, { key, messages: [] });
  }
  return sessionStore.get(key)!;
}

function chatIdFromKey(key: string): string {
  const idx = key.indexOf(":");
  return idx !== -1 ? key.slice(idx + 1) : key;
}

// ── WebSocket clients ─────────────────────────────────────────────────────────

const wsClients = new Set<WebSocket>();

function broadcast(event: string, data: unknown) {
  const msg = JSON.stringify({ event, data });
  for (const client of wsClients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  }
}

// ── HTTP helpers ──────────────────────────────────────────────────────────────

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += String(chunk);
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function json(res: http.ServerResponse, status: number, data: unknown) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  });
  res.end(body);
}

// ── Chat handler — streaming via WebSocket ────────────────────────────────────

// ── Tool definitions ──────────────────────────────────────────────────────────

const TOOLS: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "web_search",
      description:
        "Search the web using SearXNG. Use for current events, recent data, or unknown facts.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "fetch_url",
      description: "Fetch and read the text content of a URL.",
      parameters: {
        type: "object",
        properties: {
          url: { type: "string", description: "Full URL to fetch" },
        },
        required: ["url"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "kb_search",
      description:
        "Search the BUCH local knowledge base (libraries: BUSINESS_CENTRE, BIZ, THE_MONEY_MACHINE, THE_NOW, etc.). Redirected to BUCH :5180.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query" },
          library: {
            type: "string",
            description:
              "Library name (optional, e.g. BIZ, BUSINESS_CENTRE, THE_MONEY_MACHINE)",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "read_local_file",
      description:
        "Odczytaj zawartość lokalnego pliku z systemu plików. Tylko lokalny dostęp — nie wysyła do chmury.",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "Ścieżka do pliku (absolutna lub relatywna)",
          },
          max_chars: {
            type: "number",
            description: "Max liczba znaków do zwrócenia (domyślnie 5000)",
          },
        },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_local_dir",
      description: "Wylistuj pliki i katalogi w lokalnym folderze projektu.",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "Ścieżka do katalogu (absolutna lub relatywna)",
          },
        },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "save_to_d1",
      description:
        "Zapisz strukturalny rekord JSON do Cloudflare D1 przez BUCH (:5180). Używaj dla metadanych, podsumowań, wyników zadań nadających się do SQL.",
      parameters: {
        type: "object",
        properties: {
          table: {
            type: "string",
            description: "Nazwa tabeli D1 (musi istnieć w bazie)",
          },
          data: {
            type: "string",
            description:
              "JSON string z rekordem do wstawienia (obiekt klucz-wartość)",
          },
        },
        required: ["table", "data"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "save_to_r2",
      description:
        "Zapisz dokument/treść/blob do Cloudflare R2 przez BUCH (:5180). Używaj dla dużych plików, HTML, backup dokumentów, wyników scrapingu.",
      parameters: {
        type: "object",
        properties: {
          key: {
            type: "string",
            description:
              "Klucz obiektu R2 (ścieżka w buckecie, np. results/2026-04-11/raport.txt)",
          },
          content: {
            type: "string",
            description: "Treść/zawartość do zapisania",
          },
          content_type: {
            type: "string",
            description: "MIME type (domyślnie: text/plain)",
          },
        },
        required: ["key", "content"],
      },
    },
  },
];

const ALL_TOOLS: OpenAI.Chat.ChatCompletionTool[] = [
  ...TOOLS,
  ...jimboOpenAITools.filter(
    (newTool) =>
      !TOOLS.some(
        (existingTool) => existingTool.function.name === newTool.function.name,
      ),
  ),
];

async function executeTool(
  name: string,
  args: Record<string, any>,
): Promise<string> {
  try {
    if (name === "web_search") {
      const r = await fetch(
        `${SEARXNG_URL}/search?q=${encodeURIComponent(args.query ?? "")}&format=json`,
        {
          signal: AbortSignal.timeout(8_000),
        },
      );
      if (!r.ok) return `SearXNG error ${r.status}`;
      const data = (await r.json()) as {
        results?: Array<{ title: string; url: string; content?: string }>;
      };
      const hits = (data.results ?? []).slice(0, 5);
      if (!hits.length) return "No search results found.";
      return hits
        .map((x, i) => `[${i + 1}] ${x.title}\n${x.url}\n${x.content ?? ""}`)
        .join("\n\n");
    }

    if (name === "fetch_url") {
      const r = await fetch(args.url, {
        headers: { "User-Agent": "ZENO-JimboKit/1.0" },
        signal: AbortSignal.timeout(10_000),
      });
      const text = await r.text();
      const clean = text
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 3_000);
      return clean + (text.length > 3_000 ? "\n…(truncated)" : "");
    }

    if (name === "kb_search") {
      const source = args.library ?? "all";
      const url = `${BUCH_URL}/api/kb/search?q=${encodeURIComponent(args.query ?? "")}&source=${encodeURIComponent(source)}&limit=5`;
      const r = await fetch(url, { signal: AbortSignal.timeout(8_000) });
      if (!r.ok) return `KB error ${r.status}`;
      const data = (await r.json()) as {
        results?: Array<{
          content: string;
          snippet?: string;
          category?: string;
          file?: string;
        }>;
      };
      const hits = data.results ?? [];
      if (!hits.length) return "No KB results found.";
      return hits
        .map(
          (x, i) =>
            `[${i + 1}] [${x.category ?? "?"}] ${x.file ?? ""}\n${x.snippet ?? x.content}`,
        )
        .join("\n\n");
    }

    if (name === "read_local_file") {
      const filePath = resolve(args.path);
      if (!existsSync(filePath)) return `Plik nie znaleziony: ${args.path}`;
      try {
        const content = readFileSync(filePath, "utf-8");
        const limit = Number(args.max_chars ?? 5000);
        return content.length > limit
          ? content.slice(0, limit) + "\n…(skrócono)"
          : content;
      } catch (e) {
        return `Błąd odczytu pliku: ${e instanceof Error ? e.message : String(e)}`;
      }
    }

    if (name === "list_local_dir") {
      const dirPath = resolve(args.path);
      if (!existsSync(dirPath)) return `Katalog nie znaleziony: ${args.path}`;
      try {
        const items = readdirSync(dirPath);
        if (!items.length) return "(pusty katalog)";
        return items
          .map((item) => {
            try {
              return statSync(resolve(dirPath, item)).isDirectory()
                ? `[DIR]  ${item}`
                : `[FILE] ${item}`;
            } catch {
              return item;
            }
          })
          .join("\n");
      } catch (e) {
        return `Błąd listowania: ${e instanceof Error ? e.message : String(e)}`;
      }
    }

    if (name === "save_to_d1") {
      let data: Record<string, unknown>;
      try {
        data = JSON.parse(args.data);
      } catch {
        return "Błąd: data musi być poprawnym JSON stringiem";
      }
      const r = await fetch(`${BUCH_URL}/api/d1/insert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table: args.table, data }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!r.ok) return `D1 insert error ${r.status}: ${await r.text()}`;
      return `Zapisano do D1 tabela '${args.table}': ${JSON.stringify(await r.json())}`;
    }

    if (name === "save_to_r2") {
      const r = await fetch(`${BUCH_URL}/api/r2/upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: args.key,
          content: args.content,
          content_type: args.content_type ?? "text/plain",
        }),
        signal: AbortSignal.timeout(15_000),
      });
      if (!r.ok) return `R2 upload error ${r.status}: ${await r.text()}`;
      return `Zapisano do R2 klucz '${args.key}': ${JSON.stringify(await r.json())}`;
    }

    const delegated = await executeJimboTool(name, args);
    if (delegated) {
      return delegated.ok
        ? JSON.stringify(delegated.data ?? { ok: true })
        : `Tool error (${name}): ${delegated.error ?? "Unknown error"}`;
    }

    return `Unknown tool: ${name}`;
  } catch (e) {
    return `Tool error (${name}): ${e instanceof Error ? e.message : String(e)}`;
  }
}

// ── Fallback wrappers ─────────────────────────────────────────────────────────

async function createCompletionWithFallback(
  models: string[],
  params: Omit<OpenAI.Chat.ChatCompletionCreateParamsNonStreaming, "model">,
): Promise<OpenAI.Chat.ChatCompletion> {
  let lastError: Error | null = null;
  for (const model of models) {
    try {
      const result = await openrouter.chat.completions.create({
        ...params,
        model,
        stream: false,
      } as OpenAI.Chat.ChatCompletionCreateParamsNonStreaming);
      if (model !== models[0]) console.log(`[JIMBO] Tool fallback → ${model}`);
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(
        `[JIMBO] Model ${model} failed: ${msg} — próbuję kolejny...`,
      );
      lastError = err instanceof Error ? err : new Error(msg);
    }
  }
  throw (
    lastError ?? new Error(`Wszystkie modele niedostępne: ${models.join(", ")}`)
  );
}

async function createStreamWithFallback(
  models: string[],
  params: Omit<
    OpenAI.Chat.ChatCompletionCreateParamsStreaming,
    "model" | "stream"
  >,
): Promise<{
  stream: AsyncIterable<OpenAI.Chat.ChatCompletionChunk>;
  usedModel: string;
}> {
  let lastError: Error | null = null;
  for (const model of models) {
    try {
      const stream = await openrouter.chat.completions.create({
        ...params,
        model,
        stream: true,
      } as OpenAI.Chat.ChatCompletionCreateParamsStreaming);
      if (model !== models[0]) console.log(`[JIMBO] Chat fallback → ${model}`);
      return { stream, usedModel: model };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(
        `[JIMBO] Stream model ${model} failed: ${msg} — próbuję kolejny...`,
      );
      lastError = err instanceof Error ? err : new Error(msg);
    }
  }
  throw (
    lastError ??
    new Error(`Wszystkie stream modele niedostępne: ${models.join(", ")}`)
  );
}

// ── Chat handler — tool-use + streaming ──────────────────────────────────────

async function handleChat(req: http.IncomingMessage, res: http.ServerResponse) {
  const raw = await readBody(req);
  const body = JSON.parse(raw) as {
    message?: string;
    prompt?: string;
    session_id?: string;
  };

  const message = body.message ?? body.prompt ?? "";
  const sessionKey = body.session_id ?? `web:${randomUUID()}`;
  const chatId = chatIdFromKey(sessionKey);
  const task_id = randomUUID();

  if (!message.trim()) {
    return json(res, 400, { error: "Empty message" });
  }

  console.log(
    `[JIMBOKIT] handleChat: Incoming message for session ${sessionKey}: ${message}`,
  );
  const session = getOrCreate(sessionKey);
  session.messages.push({
    role: "user",
    content: message,
    timestamp: Date.now(),
  });

  // Odpowiedź natychmiastowa (openbotx-compatible — frontend zna task_id)
  json(res, 200, { task_id, session_id: sessionKey, content: "" });

  // Streaming async — wyniki przez WebSocket
  setImmediate(async () => {
    if (!ORKEY) {
      console.warn(
        "[JIMBOKIT] OPENROUTER_API_KEY is missing. AI responses will not work.",
      );
      broadcast("chat:message", {
        chat_id: chatId,
        task_id,
        content: [
          {
            type: "text",
            text: "⚠ Brak OPENROUTER_API_KEY w konfiguracji serwera.",
          },
        ],
      });
      return;
    }

    try {
      type Msg = OpenAI.Chat.ChatCompletionMessageParam;

      const systemMessage: Msg = {
        role: "system",
        content: (EXTERNAL_SYSTEM_PROMPT || `Jesteś JimboKit — WARSTWA LOKALNA w architekturze 2-warstwowej ZENO Browser.
Masz dostęp do 7 narzędzi.

  WARSTWA 1 — TY (JimboKit :3701)  : web_search, fetch_url, kb_search, read_local_file, list_local_dir
  WARSTWA 2 — BUCH (:5180)         : tylko Cloudflare D1 i R2 (bez dostępu do lokalnych plików)

ZASADA: Ty czytasz lokalny FS. Zapisy do D1/R2 przechodzą przez BUCH — nigdy odwrotnie.

═══ NARZĘDZIA I ICH ZASTOSOWANIE ═══

🔍 web_search (SearXNG) — UŻYWAJ GDY:
  • Potrzebujesz aktualnych informacji (newsy, wydarzenia)
  • Sprawdzasz fakty lub weryfikujesz dane
  • Szukasz ogólnej wiedzy dostępnej w Internecie
  ⏱ Timeout: 8s | Wynik: max 6 rezultatów z tytułami/linkami/snippetami

📄 fetch_url — UŻYWAJ GDY:
  • Potrzebujesz pobrać konkretną stronę WWW
  • Analizujesz treść konkretnego artykułu/dokumentu
  ⏱ Timeout: 10s | Wynik: tekst HTML (stripped tags), max 50KB

💾 kb_search (BUCH local KB — biblioteki biznesowe) — UŻYWAJ GDY:
  • Szukasz w lokalnej bazie wiedzy (BUSINESS_CENTRE, BIZ, THE_MONEY_MACHINE, THE_NOW)
  • Użytkownik pyta o dokumentację ZENO/Bonzo/projekt
  ⏱ Timeout: 8s | Wynik: category, file, snippet

📁 read_local_file — UŻYWAJ GDY:
  • Potrzebujesz odczytać zawartość lokalnego pliku
  • Przygotowujesz dane do wysłania do D1 lub R2
  • Analizujesz kod lub konfigurację projektu
  ⚠ Tylko odczyt FS — żadnych operacji sieciowych

📂 list_local_dir — UŻYWAJ GDY:
  • Przeglądasz strukturę katalogów projektu
  • Identyfikujesz pliki do przetworzenia

☁ save_to_d1 — UŻYWAJ GDY:
  • Wynik zadania to strukturalne dane (rekordy, metadane, podsumowania)
  • Dane nadają się do SQL: klucz-wartość, tabela, kategoria
  ⚠ Przesyła przez BUCH → Cloudflare D1 (wymaga konfiguracji CF w BUCH)

☁ save_to_r2 — UŻYWAJ GDY:
  • Wynik to duży dokument, HTML, blob, backup pliku
  • Treść zbyt duża lub binarna dla D1
  ⚠ Przesyła przez BUCH → Cloudflare R2 (wymaga konfiguracji CF w BUCH)

═══ STRATEGIE ═══

1. **Wybór narzędzia**:
   - Aktualne info → web_search
   - Konkretny URL → fetch_url
   - Projekt ZENO/Bonzo/baza wiedzy → kb_search
   - Odczyt lokalnego pliku → read_local_file
   - Przeglądanie folderu → list_local_dir
   - Zapis strukturalnych danych → save_to_d1
   - Zapis dużych dokumentów/blobów → save_to_r2
   - Pipeline: read_local_file → przetwórz → save_to_d1 lub save_to_r2

2. **Error handling**:
   - Timeout → poinformuj użytkownika, zaproponuj alternatywę
   - BUCH niedostępny (D1/R2 error) → zaproponuj restart :5180
   - Plik nie istnieje → sprawdź list_local_dir

3. **Best practices**:
   - Wyjaśniaj DLACZEGO używasz narzędzia — ale jednym zdaniem, nie elaboruj
   - Podsumowuj wyniki zamiast wklejać raw data
   - Używaj kb_search ZAWSZE przed web_search dla wewnętrznych pytań

═══ PEŁNA DOKUMENTACJA ═══
.workspace_meta/scripts/ai-tools-index.md (schematy, przykłady, provider matrix)

Odpowiadaj po polsku, chyba że użytkownik pisze inaczej.`) + SESSION_CONTEXT,
      };

      const contextMessages: Msg[] = [
        systemMessage,
        ...session.messages
          .slice(-20)
          .map((m) => ({ role: m.role, content: m.content })),
      ];

      console.log(
        "[JIMBOKIT] handleChat: Calling OpenRouter for tool-use phase with messages:",
        JSON.stringify(contextMessages),
      );
      // ── Phase 1: tool-use (non-streaming, z fallback) ─────────────────────
      const toolResp = await createCompletionWithFallback(TOOL_CHAIN, {
        messages: contextMessages,
        tools: ALL_TOOLS,
        tool_choice: "auto",
        max_tokens: 1024,
      });

      const toolMsg = toolResp.choices[0]?.message;
      const toolCalls = toolMsg?.tool_calls ?? [];
      console.log(
        `[JIMBOKIT] handleChat: OpenRouter tool-use response. Tool calls: ${toolCalls.length}`,
      );

      if (toolCalls.length > 0) {
        // Execute each tool and collect results
        const toolMessages: Msg[] = [toolMsg as Msg];

        for (const call of toolCalls) {
          const fnName = call.function.name;
          let fnArgs: Record<string, any> = {};
          try {
            fnArgs = JSON.parse(call.function.arguments);
          } catch {
            /* empty */
          }

          console.log(
            `[JIMBOKIT] handleChat: Executing tool '${fnName}' with args:`,
            JSON.stringify(fnArgs),
          );
          broadcast("chat:tool_use", {
            chat_id: chatId,
            task_id,
            tool: fnName,
            args: fnArgs,
          });

          const result = await executeTool(fnName, fnArgs);
          console.log(
            `[JIMBOKIT] handleChat: Tool '${fnName}' result:`,
            result.slice(0, 200) + (result.length > 200 ? "..." : ""),
          ); // Log first 200 chars of result

          toolMessages.push({
            role: "tool",
            tool_call_id: call.id,
            content: result,
          });
        }

        contextMessages.push(...toolMessages);
      }
      console.log(
        "[JIMBOKIT] handleChat: Calling OpenRouter for streaming phase with messages:",
        JSON.stringify(contextMessages),
      );
      // ── Phase 2: streaming final answer (z fallback) ──────────────────────
      const { stream } = await createStreamWithFallback(CHAT_CHAIN, {
        messages: contextMessages,
        max_tokens: 2048,
      });

      let fullContent = "";
      console.log("[JIMBOKIT] handleChat: Starting to stream response...");
      for await (const chunk of stream) {
        const token = chunk.choices[0]?.delta?.content ?? "";
        if (token) {
          fullContent += token;
          // console.log(`[JIMBOKIT] handleChat: Stream chunk: ${token}`); // Too verbose, uncomment if needed
          broadcast("chat:stream", {
            chat_id: chatId,
            content: token,
            task_id,
          });
        }
      }

      console.log(
        "[JIMBOKIT] handleChat: Streaming complete. Full content length:",
        fullContent.length,
      );
      broadcast("chat:stream_end", { chat_id: chatId, task_id });

      session.messages.push({
        role: "assistant",
        content: fullContent,
        task_id,
        timestamp: Date.now(),
      });

      broadcast("chat:message", {
        chat_id: chatId,
        task_id,
        content: [{ type: "text", text: fullContent }],
        agent_name: "jimbo",
      });

      broadcast("sessions:updated", {});
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[jimbokit] chat error:", msg);
      broadcast("chat:message", {
        chat_id: chatId,
        task_id,
        content: [{ type: "text", text: `⚠ Błąd AI: ${msg}` }],
      });
    }
  });
}

// ── HTTP server ───────────────────────────────────────────────────────────────

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://127.0.0.1:${PORT}`);
  const method = req.method ?? "GET";

  // CORS preflight
  if (method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    res.end();
    return;
  }

  try {
    // ── GET /health ──────────────────────────────────────────────────────────
    if (
      method === "GET" &&
      (url.pathname === "/" || url.pathname === "/health")
    ) {
      return json(res, 200, {
        status: "ok",
        service: "jimbokit-server",
        port: PORT,
        model: MODEL,
        chatChain: CHAT_CHAIN,
        sessions: sessionStore.size,
        clients: wsClients.size,
        ws: `ws://127.0.0.1:${PORT}/ws`,
      });
    }

    // ── GET /api/system/info ─────────────────────────────────────────────────
    if (method === "GET" && url.pathname === "/api/system/info") {
      return json(res, 200, {
        service: "jimbokit-server",
        version: "1.0.0",
        port: PORT,
        model: MODEL,
        toolModel: TOOL_MODEL,
        provider: "openrouter",
        sessions: sessionStore.size,
        clients: wsClients.size,
        uptime: process.uptime(),
        nodeVersion: process.version,
        hasApiKey: !!ORKEY,
      });
    }

    // ── GET /api/models ──────────────────────────────────────────────────────
    if (method === "GET" && url.pathname === "/api/models") {
      return json(res, 200, {
        chat: { primary: CHAT_CHAIN[0], chain: CHAT_CHAIN },
        tools: { primary: TOOL_CHAIN[0], chain: TOOL_CHAIN },
        env: {
          JIMBO_MODEL: process.env.JIMBO_MODEL ?? null,
          JIMBO_TOOL_MODEL: process.env.JIMBO_TOOL_MODEL ?? null,
        },
      });
    }

    // ── POST /api/chat ───────────────────────────────────────────────────────
    if (method === "POST" && url.pathname === "/api/chat") {
      return await handleChat(req, res);
    }

    // ── GET /api/chat/sessions ───────────────────────────────────────────────
    if (method === "GET" && url.pathname === "/api/chat/sessions") {
      const list = [...sessionStore.values()].map((s) => ({ key: s.key }));
      return json(res, 200, list);
    }

    // ── session/:key ─────────────────────────────────────────────────────────
    const sessionMatch = url.pathname.match(/^\/api\/chat\/sessions\/(.+)$/);
    if (sessionMatch) {
      const key = decodeURIComponent(sessionMatch[1]);

      if (method === "GET") {
        const s = sessionStore.get(key);
        if (!s) return json(res, 404, { error: "Session not found" });
        return json(res, 200, { messages: s.messages, live_state: null });
      }

      if (method === "DELETE") {
        sessionStore.delete(key);
        broadcast("sessions:updated", {});
        return json(res, 200, { ok: true });
      }
    }

    // ── POST /api/webgate/fetch (terminal /fetch command) ────────────────────
    if (method === "POST" && url.pathname === "/api/webgate/fetch") {
      const body = JSON.parse(await readBody(req)) as { url: string };
      const fetchRes = await fetch(body.url, {
        headers: { "User-Agent": "ZENO-JimboKit/1.0" },
        signal: AbortSignal.timeout(10_000),
      });
      const content = await fetchRes.text();
      const contentType = fetchRes.headers.get("content-type") ?? "text/plain";
      return json(res, 200, { content, contentType, status: fetchRes.status });
    }

    json(res, 404, { error: "Not found", path: url.pathname });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[jimbokit] request error:", msg);
    json(res, 500, { error: msg });
  }
});

// ── WebSocket ─────────────────────────────────────────────────────────────────

const wss = new WebSocketServer({ server, path: "/ws" });

wss.on("connection", (ws) => {
  wsClients.add(ws);
  ws.on("close", () => wsClients.delete(ws));
  ws.on("error", () => wsClients.delete(ws));
  ws.send(
    JSON.stringify({
      event: "connected",
      data: { service: "jimbokit-server", model: MODEL },
    }),
  );
});

// ── Start ─────────────────────────────────────────────────────────────────────

server.listen(PORT, "127.0.0.1", () => {
  console.log(`✅ JimboKit server  →  http://127.0.0.1:${PORT}`);
  console.log(`   WebSocket        →  ws://127.0.0.1:${PORT}/ws`);
  console.log(`   Model            →  ${MODEL}`);
  if (!ORKEY) {
    console.warn(
      "⚠️  OPENROUTER_API_KEY nie ustawiony — odpowiedzi AI nie będą działać",
    );
  }
});

server.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    console.error(`❌ Port ${PORT} jest już zajęty`);
    process.exit(1);
  } else {
    console.error("Server error:", err.message);
  }
});
