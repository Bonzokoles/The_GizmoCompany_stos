/**
 * ZENO Browser — AI Gate Worker
 * Multi-provider AI routing on Cloudflare Edge
 *
 * Endpoints:
 *   POST /api/ai/chat                — Send prompt to AI (auto-routes to best provider)
 *   POST /api/ai/chat/stream         — Streaming chat response (SSE)
 *   POST /api/ai/v1/chat/completions — OpenAI-compatible proxy (for page-agent)
 *   GET  /api/ai/providers           — List available providers & models
 *   GET  /api/ai/status              — Gateway health + metrics
 */

import type { Env, AIProviderConfig } from "../../types";
import { jsonResponse, errorResponse, corsHeaders } from "../../types";

const PROVIDERS: AIProviderConfig[] = [
  {
    name: "deepseek",
    endpoint: "https://api.deepseek.com/v1/chat/completions",
    models: ["deepseek-chat", "deepseek-coder", "deepseek-reasoner"],
    priority: 1,
    costPerMTok: 0.0014,
  },
  {
    name: "openrouter",
    endpoint: "https://openrouter.ai/api/v1/chat/completions",
    models: [
      "qwen/qwen3.6-plus:free",
      "minimax/minimax-m2.5",
      "qwen/qwen3-coder-next",
      "moonshotai/kimi-k2.5",
      "google/gemini-3-flash-preview",
      "x-ai/grok-4.1-fast",
      "anthropic/claude-sonnet-4",
      "openai/gpt-4o",
      "mistralai/mistral-large-latest",
      "meta-llama/llama-3.1-70b-instruct",
      "google/gemini-2.0-flash-exp",
      "qwen/qwen-2.5-72b-instruct",
      "deepseek/deepseek-r1",
      "nousresearch/hermes-3-llama-3.1-405b",
    ],
    priority: 2,
    costPerMTok: 0.003,
  },
  {
    name: "anthropic",
    endpoint: "https://api.anthropic.com/v1/messages",
    models: ["claude-sonnet-4-20250514"],
    priority: 3,
    costPerMTok: 0.015,
  },
  {
    name: "openai",
    endpoint: "https://api.openai.com/v1/chat/completions",
    models: ["gpt-4o", "gpt-4o-mini", "gpt-4.1-nano"],
    priority: 4,
    costPerMTok: 0.005,
  },
];

// ── BUCH_CHAT Tool Definitions ─────────────────────────────────────────────

interface BuchTool {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties: Record<string, unknown>;
    required: string[];
  };
}

const BUCH_TOOLS: BuchTool[] = [
  {
    name: "fetch_url",
    description:
      "Fetch the content of any URL. Returns cleaned text, HTML, or links list.",
    input_schema: {
      type: "object",
      properties: {
        url: { type: "string", description: "URL to fetch" },
        format: {
          type: "string",
          enum: ["text", "html", "links"],
          description: "Output format (default: text)",
        },
        max_chars: {
          type: "number",
          description: "Max characters returned (default: 8000)",
        },
      },
      required: ["url"],
    },
  },
  {
    name: "extract_text",
    description:
      "Strip HTML tags from raw HTML and return clean readable text.",
    input_schema: {
      type: "object",
      properties: {
        html: { type: "string", description: "HTML string to clean" },
      },
      required: ["html"],
    },
  },
  {
    name: "web_search",
    description:
      "Search the web via DuckDuckGo HTML (no API key needed). Returns titles + URLs.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query" },
        num_results: {
          type: "number",
          description: "Number of results (default: 5, max: 10)",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "searxng_search",
    description:
      "Meta-search via SearXNG (search.mybonzo.com). Aggregates Google, Bing, DuckDuckGo and others. More results than web_search.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query" },
        num_results: {
          type: "number",
          description: "Number of results to return (default: 8, max: 20)",
        },
        language: {
          type: "string",
          description: "Language code e.g. pl, en (default: auto)",
        },
      },
      required: ["query"],
    },
  },
  {
    // PLACEHOLDER — needs headless browser service (steel.dev / browserless.io / Playwright Worker)
    name: "screenshot_url",
    description:
      "[PLACEHOLDER] Take a visual screenshot of a URL. Requires headless browser — not yet implemented. Use fetch_url instead.",
    input_schema: {
      type: "object",
      properties: {
        url: { type: "string" },
        viewport: {
          type: "string",
          enum: ["desktop", "mobile"],
          description: "Viewport preset",
        },
      },
      required: ["url"],
    },
  },
  {
    // PLACEHOLDER — needs CSS selector engine (Cheerio Worker / Playwright)
    name: "scrape_structured",
    description:
      "[PLACEHOLDER] Extract structured data using CSS selectors. Not yet implemented — use fetch_url + Claude parsing instead.",
    input_schema: {
      type: "object",
      properties: {
        url: { type: "string" },
        selectors: {
          type: "object",
          description: "Map of fieldName → CSS selector string",
        },
      },
      required: ["url", "selectors"],
    },
  },
  {
    name: "r2_read",
    description:
      "Read a text/JSON file from an R2 bucket. Returns file content.",
    input_schema: {
      type: "object",
      properties: {
        bucket: {
          type: "string",
          enum: [
            "mybonzo-blog-content",
            "mybonzo-analytics",
            "mybonzo-finanse",
            "vibesdk-templates",
            "zen-static-assets",
            "zen-blog-images",
            "bonzo-media-hub",
          ],
          description: "R2 bucket name",
        },
        key: { type: "string", description: "Object key/path in the bucket" },
      },
      required: ["bucket", "key"],
    },
  },
  {
    name: "d1_query",
    description:
      "Run a read-only SELECT query on a D1 SQLite database. Returns JSON rows.",
    input_schema: {
      type: "object",
      properties: {
        database: {
          type: "string",
          enum: ["zeno-browser-db", "mybonzo-db", "jimbo77-db"],
          description: "Which D1 database to query",
        },
        query: {
          type: "string",
          description: "SQL SELECT statement (read-only)",
        },
      },
      required: ["database", "query"],
    },
  },
  {
    name: "zeno_api",
    description:
      "Call any ZENO dashboard API endpoint on zenbrowsers.org. Use this to check workers, analytics, storage, content, images, MOA pipeline, render, crawlers, pipelines, databases, search, queues.",
    input_schema: {
      type: "object",
      properties: {
        endpoint: {
          type: "string",
          description:
            'API path without /api/ prefix. Examples: "workers/status", "analytics/overview", "storage/browse/mybonzo-blog-content", "content/generate", "moa/run", "images/generate", "render/screenshot", "crawlers/status", "pipelines/status", "search?q=query"',
        },
        method: {
          type: "string",
          enum: ["GET", "POST"],
          description: "HTTP method (default: GET)",
        },
        body: { type: "object", description: "Request body for POST requests" },
      },
      required: ["endpoint"],
    },
  },
  {
    name: "agent_list",
    description:
      "List all saved ZENO agents from the database. Shows name, site, component, model and prompt preview.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "buch_learn",
    description:
      "Save a learning, observation or discovery to BUCH permanent knowledge base. Use this proactively when you discover something new about the system, a working pattern, user preference, or important fact. Knowledge persists across all future sessions.",
    input_schema: {
      type: "object",
      properties: {
        category: {
          type: "string",
          enum: [
            "functions",
            "agents",
            "development",
            "preferences",
            "patterns",
            "errors",
            "integrations",
          ],
          description: "Category of knowledge",
        },
        key: {
          type: "string",
          description:
            'Short unique identifier, e.g. "r2_file_access_works", "analytics_umami_embedded"',
        },
        content: {
          type: "string",
          description:
            "What was learned — be specific and actionable. Include context, how it works, gotchas.",
        },
      },
      required: ["category", "key", "content"],
    },
  },
  {
    name: "agent_save",
    description:
      "Save or update a ZENO agent in the database. Always include a quality_score (1-10) based on prompt specificity, role clarity, examples, constraints and response style. Refuse to save agents with score < 6.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Unique agent name" },
        site: {
          type: "string",
          description:
            "Target site: zenbrowsers.org, mybonzo.com, jimbo77.org, etc.",
        },
        component: {
          type: "string",
          description: "Page component or section this agent handles",
        },
        model: {
          type: "string",
          description:
            "AI model: deepseek-chat, claude-sonnet-4-6, gemini-2.0-flash, etc.",
        },
        prompt: {
          type: "string",
          description: "Full system prompt for the agent (min 80 chars)",
        },
        quality_score: {
          type: "number",
          description:
            "Quality score 1-10. Score breakdown: specificity(2) + role_clarity(2) + examples(2) + constraints(2) + response_style(2)",
        },
      },
      required: [
        "name",
        "site",
        "component",
        "model",
        "prompt",
        "quality_score",
      ],
    },
  },
  {
    name: "goose_dispatch",
    description:
      "Send a task to local JIMBO HUB (Goose AI agent) running at localhost:4224. Use this when the user wants to: save files locally, write code, execute terminal commands, or do anything requiring local filesystem access. Goose will execute the task autonomously.",
    input_schema: {
      type: "object",
      properties: {
        instructions: {
          type: "string",
          description:
            "Complete instructions for Goose. Include absolute paths (U:\\...), expected output, and all steps in one block.",
        },
      },
      required: ["instructions"],
    },
  },
  // ── BizTools API (Etap C) ─────────────────────────────────────────────────
  {
    name: "tavily_search",
    description:
      "AI-powered semantic web search using Tavily. Better than basic web_search for research, news, fact-checking. Returns ranked results with content snippets.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query" },
        max_results: { type: "number", description: "Number of results (default 5, max 10)" },
        search_depth: { type: "string", enum: ["basic", "advanced"], description: "basic=fast, advanced=deeper research" },
        include_answer: { type: "boolean", description: "Include AI-generated answer summary (default true)" },
      },
      required: ["query"],
    },
  },
  {
    name: "jina_read",
    description:
      "Read and extract clean text content from any URL using Jina AI Reader (r.jina.ai). Better than fetch_url for complex pages with JS rendering. No API key needed.",
    input_schema: {
      type: "object",
      properties: {
        url: { type: "string", description: "URL to read and extract content from" },
      },
      required: ["url"],
    },
  },
  {
    name: "fred_data",
    description:
      "Fetch economic data from FRED (Federal Reserve Economic Data). Access 800k+ economic time series: inflation (CPIAUCSL), GDP (GDP), unemployment (UNRATE), interest rates, currency rates, Polish economy data.",
    input_schema: {
      type: "object",
      properties: {
        series_id: { type: "string", description: "FRED series ID, e.g. CPIAUCSL (CPI), GDP, UNRATE, FEDFUNDS, DEXUSEU (USD/EUR)" },
        limit: { type: "number", description: "Number of observations to return (default 12)" },
        sort_order: { type: "string", enum: ["asc", "desc"], description: "Sort order (default desc = newest first)" },
      },
      required: ["series_id"],
    },
  },
  {
    name: "coingecko_price",
    description:
      "Get cryptocurrency prices, market data, and trends from CoinGecko. Free API, no key needed. Supports 10k+ coins.",
    input_schema: {
      type: "object",
      properties: {
        coins: { type: "string", description: "Comma-separated coin IDs, e.g. bitcoin,ethereum,solana,polkadot" },
        vs_currency: { type: "string", description: "Currency for prices (default: usd). Also supports pln, eur, btc." },
        include_24h_change: { type: "boolean", description: "Include 24h price change % (default true)" },
      },
      required: ["coins"],
    },
  },
];

async function stripHtml(html: string): Promise<string> {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function executeTool(
  name: string,
  input: Record<string, unknown>,
  env: Env,
): Promise<string> {
  switch (name) {
    case "fetch_url": {
      const url = String(input.url);
      const format = String(input.format ?? "text");
      const maxChars = Number(input.max_chars ?? 8000);
      try {
        const resp = await fetch(url, {
          headers: { "User-Agent": "Mozilla/5.0 (compatible; ZENO-Agent/1.0)" },
          signal: AbortSignal.timeout(12000),
        });
        if (!resp.ok) return `HTTP error ${resp.status} for ${url}`;
        const html = await resp.text();
        if (format === "html") return html.slice(0, maxChars);
        if (format === "links") {
          const links = [...html.matchAll(/href=["']([^"'#][^"']*?)["']/g)]
            .map((m) => m[1])
            .filter((l) => l.startsWith("http"))
            .slice(0, 40);
          return JSON.stringify(links);
        }
        return (await stripHtml(html)).slice(0, maxChars);
      } catch (e: unknown) {
        return `fetch_url error: ${e instanceof Error ? e.message : String(e)}`;
      }
    }

    case "extract_text": {
      const html = String(input.html ?? "");
      return (await stripHtml(html)).slice(0, 12000);
    }

    case "web_search": {
      const query = String(input.query);
      const num = Math.min(Number(input.num_results ?? 5), 10);
      try {
        const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
        const resp = await fetch(searchUrl, {
          headers: { "User-Agent": "Mozilla/5.0 (compatible; ZENO-Agent/1.0)" },
          signal: AbortSignal.timeout(8000),
        });
        const html = await resp.text();
        const results: { title: string; url: string }[] = [];
        for (const m of html.matchAll(
          /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([^<]+)<\/a>/g,
        )) {
          if (results.length >= num) break;
          results.push({ title: m[2].trim(), url: m[1] });
        }
        return results.length > 0
          ? results
              .map((r, i) => `${i + 1}. ${r.title}\n   ${r.url}`)
              .join("\n\n")
          : "No results. Try a more specific query or use fetch_url.";
      } catch (e: unknown) {
        return `web_search error: ${e instanceof Error ? e.message : String(e)}`;
      }
    }

    case "searxng_search": {
      const query = String(input.query);
      const num = Math.min(Number(input.num_results ?? 8), 20);
      const lang = input.language ? String(input.language) : "auto";
      try {
        const params = new URLSearchParams({
          q: query,
          format: "json",
          language: lang,
        });
        const resp = await fetch(
          `https://search.mybonzo.com/search?${params}`,
          {
            headers: {
              "User-Agent": "Mozilla/5.0 (compatible; ZENO-Agent/1.0)",
            },
            signal: AbortSignal.timeout(10000),
          },
        );
        if (!resp.ok) return `searxng_search HTTP error ${resp.status}`;
        const data = (await resp.json()) as {
          results?: {
            title: string;
            url: string;
            content?: string;
            engine?: string;
          }[];
        };
        const results = (data.results ?? []).slice(0, num);
        if (results.length === 0)
          return "Brak wyników SearXNG. Spróbuj innego zapytania lub użyj web_search.";
        return results
          .map(
            (r, i) =>
              `${i + 1}. ${r.title}\n   ${r.url}${r.content ? "\n   " + r.content.slice(0, 200) : ""}${r.engine ? " [" + r.engine + "]" : ""}`,
          )
          .join("\n\n");
      } catch (e: unknown) {
        return `searxng_search error: ${e instanceof Error ? e.message : String(e)}`;
      }
    }

    case "screenshot_url":
      // PLACEHOLDER — integrate steel.dev / browserless.io / Playwright Worker later
      return JSON.stringify({
        status: "not_implemented",
        message:
          "Screenshot requires a headless browser service. Planned: steel.dev or Playwright Worker.",
        workaround: `Use fetch_url("${String(input.url)}", "text") to get text content.`,
      });

    case "scrape_structured":
      // PLACEHOLDER — integrate Cheerio Worker or Playwright later
      return JSON.stringify({
        status: "not_implemented",
        message:
          "Structured scraping placeholder. CSS selector engine not yet deployed.",
        workaround:
          "Use fetch_url to get page HTML, then describe what to extract and Claude will parse it.",
      });

    case "r2_read": {
      const bucket = String(input.bucket);
      const key = String(input.key);
      const cfAccountId = env.CF_ACCOUNT_ID;
      const cfToken = env.CF_API_TOKEN;
      if (!cfAccountId || !cfToken)
        return "Error: CF_ACCOUNT_ID / CF_API_TOKEN not configured in Pages env vars.";
      try {
        const resp = await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/r2/buckets/${bucket}/objects/${encodeURIComponent(key)}`,
          {
            headers: { Authorization: `Bearer ${cfToken}` },
            signal: AbortSignal.timeout(10000),
          },
        );
        if (!resp.ok)
          return `R2 error ${resp.status}: bucket=${bucket} key=${key}`;
        const text = await resp.text();
        return text.slice(0, 20000);
      } catch (e: unknown) {
        return `r2_read error: ${e instanceof Error ? e.message : String(e)}`;
      }
    }

    case "d1_query": {
      const dbName = String(input.database);
      const sql = String(input.query).trim();
      if (!sql.toLowerCase().startsWith("select"))
        return "Security: only SELECT queries allowed.";
      const cfAccountId = env.CF_ACCOUNT_ID;
      const cfToken = env.CF_API_TOKEN;
      if (!cfAccountId || !cfToken)
        return "Error: CF credentials not configured.";
      try {
        const listResp = await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/d1/database?name=${encodeURIComponent(dbName)}`,
          {
            headers: { Authorization: `Bearer ${cfToken}` },
            signal: AbortSignal.timeout(6000),
          },
        );
        const listData = (await listResp.json()) as {
          result?: { uuid: string }[];
        };
        const dbId = listData.result?.[0]?.uuid;
        if (!dbId) return `D1 database '${dbName}' not found.`;
        const qResp = await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/d1/database/${dbId}/query`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${cfToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ sql }),
            signal: AbortSignal.timeout(10000),
          },
        );
        const qData = (await qResp.json()) as { result?: unknown };
        return JSON.stringify(qData.result, null, 2).slice(0, 20000);
      } catch (e: unknown) {
        return `d1_query error: ${e instanceof Error ? e.message : String(e)}`;
      }
    }

    case "buch_learn": {
      const category = String(input.category ?? "general");
      const key = String(input.key ?? "")
        .trim()
        .replace(/\s+/g, "_")
        .toLowerCase();
      const content = String(input.content ?? "").trim();
      if (!key || !content) return "buch_learn: key i content są wymagane.";
      if (content.length < 20)
        return "buch_learn: content za krótki — opisz dokładniej co zostało odkryte.";
      try {
        if (!env.DB) return "D1 not configured.";
        await env.DB.exec(
          `CREATE TABLE IF NOT EXISTS admin_storage (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL)`,
        );
        const row = await env.DB.prepare(
          "SELECT value FROM admin_storage WHERE key = ?",
        )
          .bind("buch_knowledge_v2")
          .first<{ value: string }>();
        const kb: { entries: any[] } = row
          ? JSON.parse(row.value)
          : { entries: [] };
        const idx = kb.entries.findIndex((e: any) => e.key === key);
        const entry = {
          key,
          category,
          content,
          updated_at: new Date().toISOString(),
        };
        if (idx >= 0) kb.entries[idx] = entry;
        else kb.entries.push(entry);
        await env.DB.prepare(
          "INSERT OR REPLACE INTO admin_storage (key, value, updated_at) VALUES (?, ?, ?)",
        )
          .bind(
            "buch_knowledge_v2",
            JSON.stringify(kb),
            new Date().toISOString(),
          )
          .run();
        return `✅ Wiedza zapisana: [${category}] ${key} (łącznie wpisów: ${kb.entries.length})`;
      } catch (e: unknown) {
        return `buch_learn error: ${e instanceof Error ? e.message : String(e)}`;
      }
    }

    case "goose_dispatch": {
      const instructions = String(input.instructions ?? "").trim();
      if (!instructions) return "goose_dispatch: instructions są wymagane.";
      try {
        const hubUrl = "http://localhost:4224/agent/run";
        const resp = await fetch(hubUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ instructions }),
          signal: AbortSignal.timeout(10000),
        });
        if (!resp.ok) {
          const err = await resp.text();
          return `goose_dispatch: HUB error ${resp.status}: ${err.slice(0, 200)}. Upewnij się że JIMBO HUB działa lokalnie (port 4224).`;
        }
        const data = await resp.json() as { taskId?: string; status?: string };
        return `✅ Zadanie wysłane do Goose (taskId: ${data.taskId ?? "?"}, status: ${data.status ?? "queued"}). Wynik pojawi się w panelu Asystent → AgentHub.`;
      } catch (e: unknown) {
        return `goose_dispatch: Nie można połączyć z JIMBO HUB (localhost:4224). Sprawdź czy aplikacja ZENO jest uruchomiona. Błąd: ${e instanceof Error ? e.message : String(e)}`;
      }
    }

    // ── BizTools (Etap C) ────────────────────────────────────────────────────
    case "tavily_search": {
      const tavilyKey = env.TAVILY_API_KEY;
      if (!tavilyKey) return "tavily_search: brak TAVILY_API_KEY w CF Pages secrets.";
      const query = String(input.query ?? "").trim();
      if (!query) return "tavily_search: query jest wymagane.";
      const maxResults = Number(input.max_results ?? 5);
      const searchDepth = String(input.search_depth ?? "basic");
      const includeAnswer = input.include_answer !== false;
      try {
        const resp = await fetch("https://api.tavily.com/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ api_key: tavilyKey, query, max_results: maxResults, search_depth: searchDepth, include_answer: includeAnswer }),
          signal: AbortSignal.timeout(15000),
        });
        if (!resp.ok) return `tavily_search: error ${resp.status}`;
        const data = await resp.json() as { answer?: string; results?: { title: string; url: string; content: string; score: number }[] };
        const parts: string[] = [];
        if (data.answer) parts.push(`**Answer:** ${data.answer}\n`);
        if (data.results) {
          parts.push(...data.results.map((r, i) => `${i + 1}. **${r.title}**\n   ${r.url}\n   ${r.content.slice(0, 300)}`));
        }
        return parts.join("\n\n") || "Brak wyników.";
      } catch (e: unknown) {
        return `tavily_search error: ${e instanceof Error ? e.message : String(e)}`;
      }
    }

    case "jina_read": {
      const url = String(input.url ?? "").trim();
      if (!url) return "jina_read: url jest wymagane.";
      try {
        const resp = await fetch(`https://r.jina.ai/${url}`, {
          headers: { "Accept": "text/plain", "X-Return-Format": "text", "User-Agent": "Mozilla/5.0" },
          signal: AbortSignal.timeout(20000),
        });
        if (!resp.ok) return `jina_read: error ${resp.status} dla ${url}`;
        const text = await resp.text();
        return text.slice(0, 6000);
      } catch (e: unknown) {
        return `jina_read error: ${e instanceof Error ? e.message : String(e)}`;
      }
    }

    case "fred_data": {
      const seriesId = String(input.series_id ?? "").trim().toUpperCase();
      if (!seriesId) return "fred_data: series_id jest wymagane (np. CPIAUCSL, GDP, UNRATE).";
      const limit = Number(input.limit ?? 12);
      const sortOrder = String(input.sort_order ?? "desc");
      try {
        const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&limit=${limit}&sort_order=${sortOrder}&file_type=json&api_key=anonymous`;
        const resp = await fetch(url, { signal: AbortSignal.timeout(10000) });
        if (!resp.ok) return `fred_data: error ${resp.status}. Sprawdź czy series_id jest poprawne.`;
        const data = await resp.json() as { observations?: { date: string; value: string }[]; error_message?: string };
        if (data.error_message) return `fred_data: ${data.error_message}`;
        if (!data.observations?.length) return "fred_data: brak danych dla tego series_id.";
        const rows = data.observations.map(o => `${o.date}: ${o.value}`).join("\n");
        return `**FRED ${seriesId}** (${data.observations.length} obserwacji):\n${rows}`;
      } catch (e: unknown) {
        return `fred_data error: ${e instanceof Error ? e.message : String(e)}`;
      }
    }

    case "coingecko_price": {
      const coins = String(input.coins ?? "bitcoin").toLowerCase().replace(/\s/g, "");
      const vsCurrency = String(input.vs_currency ?? "usd").toLowerCase();
      const include24h = input.include_24h_change !== false;
      try {
        const fields = ["current_price", "market_cap", "total_volume", include24h ? "price_change_percentage_24h" : ""].filter(Boolean).join(",");
        const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=${vsCurrency}&ids=${coins}&per_page=25&sparkline=false&price_change_percentage=24h`;
        const resp = await fetch(url, { headers: { "Accept": "application/json" }, signal: AbortSignal.timeout(10000) });
        if (!resp.ok) return `coingecko_price: error ${resp.status}`;
        const data = await resp.json() as { name: string; symbol: string; current_price: number; market_cap: number; price_change_percentage_24h: number }[];
        if (!data.length) return "coingecko_price: nie znaleziono podanych coin IDs.";
        return data.map(c =>
          `**${c.name} (${c.symbol.toUpperCase()})**: ${c.current_price.toLocaleString()} ${vsCurrency.toUpperCase()}` +
          (include24h ? ` | 24h: ${c.price_change_percentage_24h?.toFixed(2)}%` : "") +
          ` | MCap: ${(c.market_cap / 1e9).toFixed(2)}B`
        ).join("\n");
      } catch (e: unknown) {
        return `coingecko_price error: ${e instanceof Error ? e.message : String(e)}`;
      }
    }

    case "zeno_api": {
      const endpoint = String(input.endpoint ?? "").replace(/^\/+/, "");
      const method = String(input.method ?? "GET").toUpperCase();
      const body = input.body ? JSON.stringify(input.body) : undefined;
      const allowed = [
        "workers",
        "analytics",
        "storage",
        "content",
        "moa",
        "images",
        "render",
        "crawlers",
        "pipelines",
        "db",
        "search",
        "sites",
        "queues",
        "webgate",
      ];
      const base = endpoint.split("/")[0];
      if (!allowed.includes(base))
        return `zeno_api: endpoint '${base}' not allowed. Allowed: ${allowed.join(", ")}`;
      try {
        const resp = await fetch(`https://zenbrowsers.org/api/${endpoint}`, {
          method,
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "BUCH-Agent/1.0",
          },
          ...(body ? { body } : {}),
          signal: AbortSignal.timeout(15000),
        });
        const text = await resp.text();
        return text.slice(0, 12000);
      } catch (e: unknown) {
        return `zeno_api error: ${e instanceof Error ? e.message : String(e)}`;
      }
    }

    case "agent_list": {
      try {
        if (!env.DB) return "D1 not configured.";
        await env.DB.exec(
          `CREATE TABLE IF NOT EXISTS admin_storage (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL)`,
        );
        const row = await env.DB.prepare(
          "SELECT value, updated_at FROM admin_storage WHERE key = ?",
        )
          .bind("zeno_agents_v1")
          .first<{ value: string; updated_at: string }>();
        if (!row)
          return "Brak zapisanych agentów. Użyj agent_save aby dodać pierwszego.";
        const agents = JSON.parse(row.value) as unknown[];
        return (
          `Znaleziono ${agents.length} agentów (sync: ${row.updated_at}):\n\n` +
          (agents as any[])
            .map(
              (a: any, i: number) =>
                `${i + 1}. **${a.name}** — ${a.site} / ${a.component}\n   Model: ${a.model}\n   Prompt: ${String(a.prompt ?? "").slice(0, 120)}…`,
            )
            .join("\n\n")
        );
      } catch (e: unknown) {
        return `agent_list error: ${e instanceof Error ? e.message : String(e)}`;
      }
    }

    case "agent_save": {
      const name = String(input.name ?? "").trim();
      const site = String(input.site ?? "zenbrowsers.org");
      const component = String(input.component ?? "").trim();
      const model = String(input.model ?? "deepseek-chat");
      const prompt = String(input.prompt ?? "").trim();
      const score = Number(input.quality_score ?? 0);
      if (!name || !prompt) return "agent_save: name i prompt są wymagane.";
      if (prompt.length < 80)
        return `agent_save: prompt za krótki (${prompt.length} znaków). Dobry agent potrzebuje min. 80 znaków z konkretnym kontekstem.`;
      try {
        if (!env.DB) return "D1 not configured.";
        await env.DB.exec(
          `CREATE TABLE IF NOT EXISTS admin_storage (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL)`,
        );
        const row = await env.DB.prepare(
          "SELECT value FROM admin_storage WHERE key = ?",
        )
          .bind("zeno_agents_v1")
          .first<{ value: string }>();
        const agents: any[] = row ? JSON.parse(row.value) : [];
        const idx = agents.findIndex((a: any) => a.name === name);
        const agent = {
          name,
          site,
          component,
          model,
          prompt,
          quality_score: score,
          status: "idea",
          created_at: new Date().toISOString(),
        };
        if (idx >= 0) agents[idx] = agent;
        else agents.push(agent);
        await env.DB.prepare(
          "INSERT OR REPLACE INTO admin_storage (key, value, updated_at) VALUES (?, ?, ?)",
        )
          .bind(
            "zeno_agents_v1",
            JSON.stringify(agents),
            new Date().toISOString(),
          )
          .run();
        return `✅ Agent "${name}" zapisany (${idx >= 0 ? "zaktualizowany" : "nowy"}). Łącznie agentów: ${agents.length}. Jakość: ${score}/10.`;
      } catch (e: unknown) {
        return `agent_save error: ${e instanceof Error ? e.message : String(e)}`;
      }
    }

    default:
      return `Unknown tool: ${name}`;
  }
}

interface ChatRequest {
  prompt: string;
  model?: string;
  provider?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  systemPrompt?: string;
}

function getApiKey(env: Env, provider: string): string | undefined {
  const keyMap: Record<string, string | undefined> = {
    deepseek: env.DEEPSEEK_API_KEY,
    openrouter: env.OPENROUTER_API_KEY,
    anthropic: env.ANTHROPIC_API_KEY,
    openai: env.OPENAI_API_KEY,
  };
  return keyMap[provider];
}

function resolveProvider(
  request: ChatRequest,
  env: Env,
): { config: AIProviderConfig; apiKey: string } | null {
  // If user specified a provider
  if (request.provider) {
    const cfg = PROVIDERS.find((p) => p.name === request.provider);
    const key = cfg ? getApiKey(env, cfg.name) : undefined;
    if (cfg && key) return { config: cfg, apiKey: key };
  }

  // If user specified a model, find which provider has it
  if (request.model) {
    for (const cfg of PROVIDERS.sort((a, b) => a.priority - b.priority)) {
      if (cfg.models.includes(request.model)) {
        const key = getApiKey(env, cfg.name);
        if (key) return { config: cfg, apiKey: key };
      }
    }
  }

  // Auto-select: cheapest available provider
  for (const cfg of PROVIDERS.sort((a, b) => a.priority - b.priority)) {
    const key = getApiKey(env, cfg.name);
    if (key) return { config: cfg, apiKey: key };
  }

  return null;
}

function getAvailableProviders(
  request: ChatRequest,
  env: Env,
): Array<{ config: AIProviderConfig; apiKey: string }> {
  const sorted = [...PROVIDERS].sort((a, b) => a.priority - b.priority);

  // If user pinned a specific provider, try it first, then fallback to others
  if (request.provider) {
    const cfg = sorted.find((p) => p.name === request.provider);
    const key = cfg ? getApiKey(env, cfg.name) : undefined;
    const result: Array<{ config: AIProviderConfig; apiKey: string }> = [];
    if (cfg && key) result.push({ config: cfg, apiKey: key });
    // Add remaining providers as fallbacks
    for (const other of sorted) {
      if (other.name !== request.provider) {
        const k = getApiKey(env, other.name);
        if (k) result.push({ config: other, apiKey: k });
      }
    }
    return result;
  }

  // If user pinned a model, put that provider first but keep fallbacks
  const result: Array<{ config: AIProviderConfig; apiKey: string }> = [];
  if (request.model) {
    const primary = sorted.find((p) => p.models.includes(request.model!));
    if (primary) {
      const key = getApiKey(env, primary.name);
      if (key) result.push({ config: primary, apiKey: key });
    }
  }

  // Add remaining providers as fallbacks
  for (const cfg of sorted) {
    if (!result.some((r) => r.config.name === cfg.name)) {
      const key = getApiKey(env, cfg.name);
      if (key) result.push({ config: cfg, apiKey: key });
    }
  }

  return result;
}

function buildRequestBody(
  provider: string,
  request: ChatRequest,
): Record<string, unknown> {
  const messages = [];
  if (request.systemPrompt) {
    messages.push({ role: "system", content: request.systemPrompt });
  }
  messages.push({ role: "user", content: request.prompt });

  if (provider === "anthropic") {
    return {
      model: request.model || "claude-sonnet-4-20250514",
      max_tokens: request.maxTokens || 4096,
      messages,
      ...(request.systemPrompt ? { system: request.systemPrompt } : {}),
      stream: request.stream || false,
    };
  }

  // OpenAI-compatible (DeepSeek, OpenRouter)
  return {
    model:
      request.model ||
      (provider === "deepseek" ? "deepseek-chat" : "qwen/qwen3.6-plus:free"),
    messages,
    temperature: request.temperature ?? 0.7,
    max_tokens: request.maxTokens || 4096,
    stream: request.stream || false,
  };
}

function buildHeaders(
  provider: string,
  apiKey: string,
): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (provider === "anthropic") {
    headers["x-api-key"] = apiKey;
    headers["anthropic-version"] = "2023-06-01";
  } else if (provider === "openrouter") {
    headers["Authorization"] = `Bearer ${apiKey}`;
    headers["HTTP-Referer"] = "https://zenbrowsers.org";
    headers["X-Title"] = "ZENO Browser AI Gate";
  } else {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  return headers;
}

function extractContent(
  provider: string,
  data: any,
): { content: string; model: string; tokens: Record<string, number> } {
  if (provider === "anthropic") {
    return {
      content: data.content?.[0]?.text || "",
      model: data.model || "",
      tokens: {
        input: data.usage?.input_tokens || 0,
        output: data.usage?.output_tokens || 0,
        total:
          (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
      },
    };
  }

  // OpenAI-compatible
  return {
    content: data.choices?.[0]?.message?.content || "",
    model: data.model || "",
    tokens: {
      input: data.usage?.prompt_tokens || 0,
      output: data.usage?.completion_tokens || 0,
      total: data.usage?.total_tokens || 0,
    },
  };
}

async function handleChat(request: Request, env: Env): Promise<Response> {
  const body = (await request.json()) as ChatRequest;

  if (
    !body.prompt ||
    typeof body.prompt !== "string" ||
    body.prompt.trim().length === 0
  ) {
    return errorResponse('Missing or empty "prompt" field', 400);
  }

  if (body.prompt.length > 100_000) {
    return errorResponse("Prompt too long (max 100k chars)", 413);
  }

  // Cascade: try all available providers in priority order
  const availableProviders = getAvailableProviders(body, env);
  if (availableProviders.length === 0) {
    return errorResponse(
      "No AI provider available. Check API key configuration.",
      503,
    );
  }

  const errors: string[] = [];
  const startTime = Date.now();

  for (const { config, apiKey } of availableProviders) {
    try {
      const resp = await fetch(config.endpoint, {
        method: "POST",
        headers: buildHeaders(config.name, apiKey),
        body: JSON.stringify(buildRequestBody(config.name, body)),
        signal: AbortSignal.timeout(30_000),
      });

      if (!resp.ok) {
        const errText = await resp.text();
        let errorMsg = `${config.name}: `;

        // Interpret HTTP status codes
        if (resp.status === 401) {
          errorMsg += "API key invalid or expired";
        } else if (resp.status === 402) {
          errorMsg += "No credits available";
        } else if (resp.status === 429) {
          errorMsg += "Rate limit exceeded";
        } else if (resp.status === 403) {
          errorMsg += "Access forbidden (check API key permissions)";
        } else {
          errorMsg += `HTTP ${resp.status}: ${errText.slice(0, 200)}`;
        }

        errors.push(errorMsg);
        continue; // Try next provider
      }

      const data = await resp.json();
      const extracted = extractContent(config.name, data);
      const latency = Date.now() - startTime;

      return jsonResponse({
        id: crypto.randomUUID(),
        provider: config.name,
        model: extracted.model,
        content: extracted.content,
        tokens: extracted.tokens,
        cost: (extracted.tokens.total / 1_000_000) * config.costPerMTok,
        latency,
        cached: false,
        timestamp: new Date().toISOString(),
        ...(errors.length > 0
          ? { fallback: true, attemptedProviders: errors.length + 1 }
          : {}),
      });
    } catch (err: any) {
      errors.push(`${config.name}: ${err.message}`);
      continue; // Try next provider
    }
  }

  return errorResponse(`All providers failed: ${errors.join(" | ")}`, 502);
}

async function handleStream(request: Request, env: Env): Promise<Response> {
  const body = (await request.json()) as ChatRequest;
  body.stream = true;

  if (!body.prompt || typeof body.prompt !== "string") {
    return errorResponse('Missing "prompt" field', 400);
  }

  // Use fallback loop like handleChat — try all available providers
  const availableProviders = getAvailableProviders(body, env);
  if (availableProviders.length === 0) {
    return errorResponse("No AI provider available", 503);
  }

  const errors: string[] = [];

  for (const { config, apiKey } of availableProviders) {
    try {
      const resp = await fetch(config.endpoint, {
        method: "POST",
        headers: buildHeaders(config.name, apiKey),
        body: JSON.stringify(buildRequestBody(config.name, body)),
        signal: AbortSignal.timeout(30_000),
      });

      if (!resp.ok || !resp.body) {
        const errText = await resp.text().catch(() => "");
        errors.push(
          `${config.name}: HTTP ${resp.status}: ${errText.slice(0, 200)}`,
        );
        continue; // Try next provider
      }

      // Pass through the SSE stream
      return new Response(resp.body, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
          "Access-Control-Allow-Origin": "*",
          "X-Zeno-Provider": config.name,
        },
      });
    } catch (err: any) {
      errors.push(`${config.name}: ${err.message}`);
      continue; // Try next provider
    }
  }

  return errorResponse(
    `All stream providers failed: ${errors.join(" | ")}`,
    502,
  );
}

/**
 * OpenAI-compatible proxy for page-agent integration.
 * Forwards the request body as-is to OpenAI-compatible providers (DeepSeek, OpenRouter).
 * Supports tools/function_calling required by page-agent for DOM manipulation.
 */
async function handleCompletionsProxy(
  request: Request,
  env: Env,
): Promise<Response> {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return new Response(
      JSON.stringify({
        error: {
          message: "Invalid JSON body",
          type: "invalid_request_error",
          code: "bad_request",
        },
      }),
      {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  }
  const requestedModel = (body.model as string) || "deepseek-chat";
  const isStream = body.stream === true;

  // Resolve to OpenAI-compatible provider (skip Anthropic — different format)
  const openaiProviders = PROVIDERS.filter((p) => p.name !== "anthropic").sort(
    (a, b) => a.priority - b.priority,
  );

  const defaultModelByProvider: Record<string, string> = {
    deepseek: "deepseek-chat",
    openrouter: "qwen/qwen3.6-plus:free",
  };

  const responseHeaders: Record<string, string> = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  const attempted: string[] = [];

  // 1) Prefer provider matching requested model
  // 2) Then try remaining available providers as fallback
  const orderedProviders = [
    ...openaiProviders.filter((p) => p.models.includes(requestedModel)),
    ...openaiProviders.filter((p) => !p.models.includes(requestedModel)),
  ];

  for (const cfg of orderedProviders) {
    const apiKey = getApiKey(env, cfg.name);
    if (!apiKey) continue;

    const modelForProvider = cfg.models.includes(requestedModel)
      ? requestedModel
      : defaultModelByProvider[cfg.name] || cfg.models[0] || requestedModel;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    };

    if (cfg.name === "openrouter") {
      headers["HTTP-Referer"] = "https://zenbrowsers.org";
      headers["X-Title"] = "ZENO Page Agent";
    }

    try {
      const resp = await fetch(cfg.endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({ ...body, model: modelForProvider }),
        signal: AbortSignal.timeout(60_000),
      });

      if (!resp.ok) {
        const errText = await resp.text();
        attempted.push(
          `${cfg.name}(${modelForProvider}) -> ${resp.status}: ${errText.slice(0, 200)}`,
        );
        continue;
      }

      if (isStream) {
        responseHeaders["Content-Type"] = "text/event-stream";
        responseHeaders["Cache-Control"] = "no-cache";
        responseHeaders["X-Zeno-Provider"] = cfg.name;
        return new Response(resp.body, {
          status: resp.status,
          headers: responseHeaders,
        });
      }

      responseHeaders["Content-Type"] = "application/json";
      responseHeaders["X-Zeno-Provider"] = cfg.name;
      const data = await resp.text();
      return new Response(data, {
        status: resp.status,
        headers: responseHeaders,
      });
    } catch (err: any) {
      attempted.push(
        `${cfg.name}(${modelForProvider}) -> network_error: ${err?.message || "unknown error"}`,
      );
    }
  }

  return new Response(
    JSON.stringify({
      error: {
        message:
          "All OpenAI-compatible providers failed for page-agent request",
        type: "server_error",
        attempted,
      },
    }),
    {
      status: 502,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    },
  );
}

interface AnthropicContentBlock {
  type: "text" | "tool_use";
  text?: string;
  id?: string;
  name?: string;
  input?: unknown;
}

interface AnthropicResponse {
  stop_reason: "end_turn" | "tool_use" | string;
  content: AnthropicContentBlock[];
  model: string;
  usage?: { input_tokens: number; output_tokens: number };
}

// ── Seed wiedzy bazowej BUCH — ładowany do D1 przy pierwszym uruchomieniu ──
const BUCH_SEED_KNOWLEDGE = [
  {
    key: "stack",
    category: "development",
    content:
      "ZENO Browser: Electron + React 19 + Vite + TypeScript. Backend: Cloudflare Pages Functions (Workers). Baza: D1 SQLite + R2 Object Storage. AI: Anthropic Claude, DeepSeek, OpenRouter, Gemini. Lokalnie: JIMBO Agent HUB (port 4224) + Goose CLI v1.28.",
    updated_at: new Date().toISOString(),
  },
  {
    key: "dashboard_tabs",
    category: "functions",
    content:
      "Dashboard zenbrowsers.org ma 17 zakładek: Overview(działa), Workers(38 CF Workers), Content(CMS+AI gen), Analytics(Umami+bar chart+iframe), Pipelines(7 CF Pipelines), Crawlers(43 profili), Storage(14 R2 bucketów, pliki otwieralne), Databases(7 D1), Images(AI gen+gallery), MOA(multi-agent writing), Render(screenshot+PDF+scrape), Queues(CF Queues), AI Chat(multi-provider), Asystent(JIMBO Hub lokalnie), Media Hub(zewnętrzny Worker), BizTools(katalog+Tavily), Workflows(mybonzo AI).",
    updated_at: new Date().toISOString(),
  },
  {
    key: "buch_tools",
    category: "functions",
    content:
      "BUCH_CHAT tools (Claude Sonnet, tryb ⚒): fetch_url, extract_text, web_search(DuckDuckGo), searxng_search(search.mybonzo.com), r2_read, d1_query, zeno_api(dowolny /api/* endpoint), agent_list, agent_save(status:idea), buch_learn(zapis wiedzy do D1). Narzędzia działają tylko gdy model=anthropic i włączony tryb ⚒.",
    updated_at: new Date().toISOString(),
  },
  {
    key: "agent_workflow",
    category: "agents",
    content:
      "Agenci: web BUCH_CHAT(⚒) tworzy→agent_save→status:idea w D1. Lokalnie JIMBO Hub(port 4224)+Goose testuje→POST /zeno/agents/deploy→status:deployed. ai-hub(zenbrowsers.org/ai-hub/) pokazuje badge 💡pomysł/✅wdrożony + ★score/10. Sync: ☁️Pull(D1→localStorage), ☁️Push(localStorage→D1). Jakość 1-10: specyficzność(2)+rola(2)+przykłady(2)+ograniczenia(2)+format(2). Nie zapisuj <6/10.",
    updated_at: new Date().toISOString(),
  },
  {
    key: "r2_file_access",
    category: "functions",
    content:
      "R2 pliki otwieralne przez /api/storage/file/:bucket/:key. Wymaga CF_ACCOUNT_ID i CF_API_TOKEN w CF Pages secrets (ustawione). Typy: obrazy→🖼Podgląd, PDF→📄Otwórz, text/json/md/csv→📝Czytaj. Każdy plik ma ⬇Pobierz. Narzędzie r2_read czyta text/JSON z R2 bezpośrednio.",
    updated_at: new Date().toISOString(),
  },
  {
    key: "analytics_setup",
    category: "functions",
    content:
      "Analytics: Umami na analytics.mybonzo.com, 5 trackownych stron. API: /api/analytics/overview zwraca pageviews/visitors/visits per site. Dashboard ma bar chart CSS (gradient) + iframe Umami osadzony (520px). Dane live po kliknięciu Refresh.",
    updated_at: new Date().toISOString(),
  },
  {
    key: "page_agent",
    category: "integrations",
    content:
      "PAGE AGENT: page-agent v1.7.1 (alibaba, 15k stars). Floating button 🤖(fioletowy) obok BUCH_CHAT(zielony) na zenbrowsers.org. Używa /api/ai/v1/chat/completions → DeepSeek chat. Steruje stroną przez DOM bez screenshotów. Oba przyciski w .floating-actions flex container, position:fixed bottom:28px right:28px.",
    updated_at: new Date().toISOString(),
  },
  {
    key: "jimbo_hub_local",
    category: "integrations",
    content:
      "JIMBO Agent HUB lokalnie: port 4224, model claude-haiku-4-5-20251001. Goose CLI: E:\\Programs\\goose\\goose.exe v1.28, args: --quiet --output-format text --max-turns 20. Goose Desktop: U:\\Goose-1.29.1\\dist-windows\\Goose.exe. Skill Manager: SQLite skills.db. SkillAgent: buildSuffix+evalAndSave. Goose sessions.db: C:\\Users\\Bonzo2\\AppData\\Roaming\\Block\\goose\\data\\sessions\\sessions.db.",
    updated_at: new Date().toISOString(),
  },
  {
    key: "admin_sync",
    category: "integrations",
    content:
      "Admin API: /api/admin/agents (CF Pages Function). Auth: Basic(Jimbo77:Haos1977) — sekrety w CF Pages. D1 tabela admin_storage(key,value,updated_at). Klucze: zeno_agents_v1(lista agentów JSON), buch_knowledge_v2(wiedza BUCH). Hub endpointy: GET /zeno/agents, POST /zeno/agents/deploy.",
    updated_at: new Date().toISOString(),
  },
  {
    key: "cf_secrets",
    category: "development",
    content:
      "CF Pages sekrety ustawione: ANTHROPIC_API_KEY, DEEPSEEK_API_KEY, OPENROUTER_API_KEY, GEMINI_API_KEY, CF_ACCOUNT_ID, CF_API_TOKEN, ADMIN_USER(Jimbo77), ADMIN_PASS. Skrypt update-cf-secrets-api.ps1 czyta z .workspace_meta/secrets/.env i patchuje CF Pages przez API.",
    updated_at: new Date().toISOString(),
  },
  {
    key: "moa_pipeline",
    category: "functions",
    content:
      'MOA (Mixture of Agents): 4 etapy — parallel-writing→critique→aggregation→validation. Endpoint /api/moa/run POST:{topic}. Wyniki zapisywane w R2. Używaj zeno_api("moa/run","POST",{topic}) aby uruchomić.',
    updated_at: new Date().toISOString(),
  },
  {
    key: "content_cms",
    category: "functions",
    content:
      "Content/CMS: generowanie AI przez /api/content/generate POST:{topic,type,language}. Typy: article,seo,translate,summary. CMS editor w zakładce Content z polami: tytuł, treść MD, excerpt, kategoria, tagi, SEO title/desc. Artykuły publikowane na mybonzoaiblog.com i jimbo77.org.",
    updated_at: new Date().toISOString(),
  },
  {
    key: "tools_require_anthropic",
    category: "functions",
    content:
      "Narzędzia (⚒ TOOLS ON) działają z: provider=openrouter (domyślny model: moonshotai/kimi-k2 — dobry tool calling, dobra cena; alternatywy: google/gemini-2.0-flash-001, deepseek/deepseek-chat-v3-0324), provider=anthropic (claude-sonnet), provider=openai (gpt-4o-mini). Aby używać narzędzi: wybierz provider i kliknij ⚒ TOOLS ON.",
    updated_at: new Date().toISOString(),
  },
  {
    key: "prompt_blog",
    category: "prompts",
    content:
      "Zadanie: pisanie artykułu/bloga. Kolejność narzędzi: 1) web_search lub searxng_search — zbierz 3-5 źródeł. 2) fetch_url — przeczytaj najważniejszy artykuł. 3) zeno_api('content/generate','POST',{topic,type:'article',language:'pl'}) — wygeneruj draft. Format: H1 z słowem kluczowym, lead 2-3 zdania, 3-5 sekcji H2, konkluzja z CTA, meta description 120-160 znaków.",
    updated_at: new Date().toISOString(),
  },
  {
    key: "prompt_image",
    category: "prompts",
    content:
      "Zadanie: generowanie obrazu. Narzędzie: zeno_api('images/generate','POST',{prompt:'opis obrazu',style:'digital art'}) — zwraca URL. Wyświetl obraz jako ![opis](URL). Style: realistic photo, digital art, watercolor, minimalist icon. Nie pytaj o potwierdzenie — wygeneruj od razu.",
    updated_at: new Date().toISOString(),
  },
  {
    key: "prompt_research",
    category: "prompts",
    content:
      "Zadanie: research/analiza/raport. Kolejność: 1) web_search — aktualne fakty. 2) fetch_url — szczegóły ze strony. Format odpowiedzi: executive summary (3 punkty), dane w tabeli markdown gdy >3 pozycje, źródła z datą, dane >12 miesięcy oznacz '[może być nieaktualne]'.",
    updated_at: new Date().toISOString(),
  },
  {
    key: "prompt_agent_create",
    category: "prompts",
    content:
      "Zadanie: tworzenie agenta. Kroki: 1) Zapytaj o: stronę/komponent, cel, ograniczenia. 2) Napisz system prompt (min 150 znaków) z: rolą, URL kontekstem, 2+ przykładami zadań, 'czego NIE robić', formatem odpowiedzi. 3) Oceń 1-10 (specyficzność+rola+przykłady+ograniczenia+format). 4) Jeśli <7 — ulepsz. 5) agent_save. Nigdy nie zapisuj <6/10.",
    updated_at: new Date().toISOString(),
  },
];

async function handleToolChat(request: Request, env: Env): Promise<Response> {
  const body = (await request.json()) as ChatRequest & {
    messages?: { role: string; content: string }[];
  };

  // Resolve provider: user's choice → OpenRouter → OpenAI → DeepSeek → Anthropic
  const openrouterKey = env.OPENROUTER_API_KEY;
  const anthropicKey = env.ANTHROPIC_API_KEY;
  const deepseekKey = env.DEEPSEEK_API_KEY;
  const openaiKey = env.OPENAI_API_KEY;

  // Determine which provider to use for tool-use
  let toolProvider: "openrouter" | "openai" | "deepseek" | "anthropic";
  let toolEndpoint: string;
  let toolApiKey: string;
  let model: string;

  if (body.provider === "openai" && openaiKey) {
    toolProvider = "openai";
    toolEndpoint = "https://api.openai.com/v1/chat/completions";
    toolApiKey = openaiKey;
    model = body.model || "gpt-4o-mini";
  } else if (body.provider === "deepseek" && deepseekKey) {
    toolProvider = "deepseek";
    toolEndpoint = "https://api.deepseek.com/v1/chat/completions";
    toolApiKey = deepseekKey;
    model = body.model || "deepseek-chat";
  } else if (body.provider === "anthropic" && anthropicKey) {
    toolProvider = "anthropic";
    toolEndpoint = "https://api.anthropic.com/v1/messages";
    toolApiKey = anthropicKey;
    model = body.model || "claude-sonnet-4-20250514";
  } else if (body.provider === "openrouter" && openrouterKey) {
    toolProvider = "openrouter";
    toolEndpoint = "https://openrouter.ai/api/v1/chat/completions";
    toolApiKey = openrouterKey;
    // Modele z dobrym tool calling na OpenRouter (tanie/średnie):
    // moonshotai/kimi-k2          — świetny tool calling, dobra cena
    // google/gemini-2.0-flash-001 — tani, niezawodny
    // google/gemini-flash-1.5     — bardzo tani
    // deepseek/deepseek-chat-v3-0324 — tani, dobry kod
    model = body.model || "moonshotai/kimi-k2";
  } else if (openrouterKey) {
    // Fallback: OpenRouter z modelem obsługującym tool calling
    toolProvider = "openrouter";
    toolEndpoint = "https://openrouter.ai/api/v1/chat/completions";
    toolApiKey = openrouterKey;
    model = body.model || "moonshotai/kimi-k2";
  } else if (openaiKey) {
    toolProvider = "openai";
    toolEndpoint = "https://api.openai.com/v1/chat/completions";
    toolApiKey = openaiKey;
    model = "gpt-4o-mini";
  } else if (deepseekKey) {
    toolProvider = "deepseek";
    toolEndpoint = "https://api.deepseek.com/v1/chat/completions";
    toolApiKey = deepseekKey;
    model = "deepseek-chat";
  } else if (anthropicKey) {
    toolProvider = "anthropic";
    toolEndpoint = "https://api.anthropic.com/v1/messages";
    toolApiKey = anthropicKey;
    model = "claude-sonnet-4-20250514";
  } else {
    return errorResponse("No API key available for tool use", 503);
  }

  const useOpenRouter = toolProvider !== "anthropic";

  // Build messages array (skip system role — goes into `system` param)
  const messages: { role: string; content: unknown }[] = [];
  if (body.messages) {
    for (const m of body.messages) {
      if (m.role !== "system")
        messages.push({ role: m.role, content: m.content });
    }
  }
  if (messages.length === 0 || messages[messages.length - 1]?.role !== "user") {
    messages.push({ role: "user", content: body.prompt });
  }

  // ── Ładuj wiedzę z D1 ────────────────────────────────────────────
  let knowledgeSection = "";
  if (env.DB) {
    try {
      await env.DB.exec(
        `CREATE TABLE IF NOT EXISTS admin_storage (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL)`,
      );
      // Seed wiedzy bazowej jeśli pusta
      const kbRow = await env.DB.prepare(
        "SELECT value FROM admin_storage WHERE key = ?",
      )
        .bind("buch_knowledge_v2")
        .first<{ value: string }>();
      let kb: { entries: any[] } = kbRow
        ? JSON.parse(kbRow.value)
        : { entries: [] };
      if (kb.entries.length === 0) {
        kb = { entries: BUCH_SEED_KNOWLEDGE };
        await env.DB.prepare(
          "INSERT OR REPLACE INTO admin_storage (key, value, updated_at) VALUES (?, ?, ?)",
        )
          .bind(
            "buch_knowledge_v2",
            JSON.stringify(kb),
            new Date().toISOString(),
          )
          .run();
      }
      if (kb.entries.length > 0) {
        const byCategory: Record<string, any[]> = {};
        for (const e of kb.entries) {
          const cat = e.category ?? "general";
          if (!byCategory[cat]) byCategory[cat] = [];
          byCategory[cat].push(e);
        }
        knowledgeSection =
          "\n\n─── BUCH WIEDZA (z D1, aktualizowana na bieżąco) ───\n" +
          Object.entries(byCategory)
            .map(
              ([cat, entries]) =>
                `[${cat.toUpperCase()}]\n` +
                entries.map((e: any) => `• ${e.key}: ${e.content}`).join("\n"),
            )
            .join("\n\n") +
          "\n─────────────────────────────────────────────────\n" +
          "Ucz się nowych rzeczy używając narzędzia buch_learn. Wiedza jest trwała — inne sesje też ją zobaczą.";
      }
    } catch {
      /* ignoruj błąd ładowania wiedzy */
    }
  }

  const systemPrompt =
    (body.systemPrompt ||
      `Jesteś BUCH_CHAT — zaawansowanym asystentem operacyjnym ZENO Browser (zenbrowsers.org). Odpowiadasz po polsku.

DOSTĘP DO DASHBOARDU ZENO — używaj narzędzia zeno_api:
- workers/status — status 38 CF Workers
- analytics/overview — statystyki Umami (pageviews, visitors, visits per site)
- storage/list — 14 bucketów R2 | storage/browse/:bucket — pliki w buckecie
- content/generate — generowanie treści AI (POST: {topic, type, language})
- moa/run — pipeline MOA multi-agent writing (POST: {topic})
- images/generate — generowanie obrazów AI (POST: {prompt})
- render/screenshot — screenshot URL (POST: {url})
- crawlers/status — monitor 43 profili botów
- pipelines/status — 7 CF Pipelines (6 aktywnych)
- db/tables/zeno-browser-db — tabele D1 | d1_query — zapytania SQL
- search?q=:query — SearXNG metasearch
- sites/status — status wszystkich connected sites

TWORZENIE AGENTÓW — zasady jakości ZENO:
Gdy użytkownik chce stworzyć agenta:
1. Zapytaj: dla jakiej strony/komponentu, jaki cel, jakie ograniczenia
2. Napisz system prompt (min 150 znaków) z: konkretną rolą, URL kontekstem, przykładami zadań, "czego NIE robić", formatem odpowiedzi
3. Oceń prompt w skali 1-10:
   - Specyficzność (0-2): czy konkretny dla danej strony/komponentu?
   - Klarowność roli (0-2): czy jasno określona rola i zakres?
   - Przykłady/zadania (0-2): czy zawiera 2+ przykłady co może zrobić?
   - Ograniczenia (0-2): czy zawiera "czego NIE robić"?
   - Format odpowiedzi (0-2): czy określony styl, język, długość?
4. Jeśli wynik < 7: ulepsz prompt przed zapisem
5. Zapisz agent_save z wynikiem jakości
6. NIGDY nie zapisuj agenta z wynikiem < 6/10

JAKOŚĆ — przykład dobrego agenta (9/10):
"Jesteś asystentem sekcji Analytics na zenbrowsers.org. Pomagasz użytkownikowi interpretować dane z Umami — pageviews, visitors, bounce rate. Używasz narzędzia zeno_api(analytics/overview) aby pobrać aktualne dane. Wyjaśniasz trendy po polsku, porównujesz okresy. NIE: nie tworzysz danych, nie odpowiadasz na pytania niezwiązane z analityką. Format: krótka analiza + 2-3 rekomendacje w punktach."`) +
    knowledgeSection;
  const toolTrace: {
    tool: string;
    input: Record<string, unknown>;
    result: string;
  }[] = [];

  // Tool use loop — max 6 iterations
  for (let iter = 0; iter < 6; iter++) {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    let reqBody: Record<string, unknown>;

    if (useOpenRouter) {
      headers["Authorization"] = `Bearer ${toolApiKey}`;
      headers["HTTP-Referer"] = "https://zenbrowsers.org";
      headers["X-Title"] = "ZENO BUCH_CHAT Tools";
      // Convert Anthropic tools format to OpenAI tools format
      const openaiTools = BUCH_TOOLS.map((t) => ({
        type: "function" as const,
        function: {
          name: t.name,
          description: t.description,
          parameters: t.input_schema,
        },
      }));
      // Build OpenAI-style messages
      const oaiMessages = [
        ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
        ...messages.map((m) => {
          // Convert tool_result messages for OpenAI format
          if (m.role === "user" && Array.isArray(m.content)) {
            return m.content.map((tr: any) => ({
              role: "tool" as const,
              tool_call_id: tr.tool_use_id,
              content: tr.content,
            }));
          }
          // Convert assistant with tool_use blocks
          if (m.role === "assistant" && Array.isArray(m.content)) {
            const textParts = (m.content as any[])
              .filter((c: any) => c.type === "text")
              .map((c: any) => c.text)
              .join("");
            const toolCalls = (m.content as any[])
              .filter((c: any) => c.type === "tool_use")
              .map((c: any) => ({
                id: c.id,
                type: "function" as const,
                function: {
                  name: c.name,
                  arguments: JSON.stringify(c.input ?? {}),
                },
              }));
            if (toolCalls.length > 0) {
              return {
                role: "assistant",
                content: textParts || null,
                tool_calls: toolCalls,
              };
            }
            return { role: "assistant", content: textParts };
          }
          return m;
        }),
      ].flat();
      reqBody = {
        model,
        max_tokens: body.maxTokens || 4096,
        messages: oaiMessages,
        tools: openaiTools,
      };
    } else {
      headers["x-api-key"] = toolApiKey;
      headers["anthropic-version"] = "2023-06-01";
      reqBody = {
        model,
        max_tokens: body.maxTokens || 4096,
        ...(systemPrompt ? { system: systemPrompt } : {}),
        messages,
        tools: BUCH_TOOLS,
      };
    }

    const resp = await fetch(toolEndpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(reqBody),
      signal: AbortSignal.timeout(60000),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      // If OpenRouter fails, try direct Anthropic as fallback
      if (useOpenRouter && anthropicKey && iter === 0) {
        // Retry with direct Anthropic on next iteration would be complex,
        // so just return the error for now
      }
      return errorResponse(
        `Tool API error ${resp.status}: ${errText.slice(0, 300)}`,
        502,
      );
    }

    const rawData = await resp.json();

    // Normalize response to Anthropic format
    let data: AnthropicResponse;
    if (useOpenRouter) {
      // OpenAI format → Anthropic format
      const choice = (rawData as any).choices?.[0];
      const msg = choice?.message;
      const finishReason = choice?.finish_reason;
      const contentBlocks: any[] = [];

      if (msg?.content) {
        contentBlocks.push({ type: "text", text: msg.content });
      }
      if (msg?.tool_calls) {
        for (const tc of msg.tool_calls) {
          contentBlocks.push({
            type: "tool_use",
            id: tc.id,
            name: tc.function?.name,
            input: JSON.parse(tc.function?.arguments ?? "{}"),
          });
        }
      }
      data = {
        content: contentBlocks,
        model: (rawData as any).model ?? model,
        stop_reason: finishReason === "tool_calls" ? "tool_use" : "end_turn",
        usage: {
          input_tokens: (rawData as any).usage?.prompt_tokens ?? 0,
          output_tokens: (rawData as any).usage?.completion_tokens ?? 0,
        },
      };
    } else {
      data = rawData as AnthropicResponse;
    }

    if (data.stop_reason === "end_turn") {
      const textBlock = data.content.find((c) => c.type === "text");
      let content = textBlock?.text ?? "";
      // Fallback 1: model zwrócił pustą odpowiedź i nie użył narzędzi
      if (!content && toolTrace.length === 0) {
        content = `⚠️ Model (${data.model}) nie zwrócił odpowiedzi. Ten model może nie obsługiwać tool calling.\n\nSpróbuj zmienić model na: **moonshotai/kimi-k2** lub **google/gemini-2.0-flash-001**`;
      }
      // Fallback 2: if model returned no text but tools ran, summarize results
      if (!content && toolTrace.length > 0) {
        const parts: string[] = [];
        for (const t of toolTrace) {
          if (typeof t.result === "string") {
            // Surface image URLs directly
            const imgMatch = t.result.match(
              /https?:\/\/\S+\.(?:png|jpe?g|gif|webp|svg)(?:\?\S*)?/i,
            );
            if (imgMatch) {
              parts.push(imgMatch[0]);
            } else {
              parts.push(t.result.slice(0, 400));
            }
          }
        }
        content = parts.join("\n\n");
      }
      return jsonResponse({
        id: crypto.randomUUID(),
        provider: toolProvider,
        model: data.model,
        content,
        toolTrace,
        tokens: {
          input: data.usage?.input_tokens ?? 0,
          output: data.usage?.output_tokens ?? 0,
          total:
            (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0),
        },
        timestamp: new Date().toISOString(),
      });
    }

    if (data.stop_reason === "tool_use") {
      // Push assistant message with tool_use blocks
      messages.push({ role: "assistant", content: data.content });

      // Execute each tool and collect results
      const toolResults: {
        type: "tool_result";
        tool_use_id: string;
        content: string;
      }[] = [];
      for (const block of data.content) {
        if (block.type === "tool_use" && block.id && block.name) {
          const toolInput = (block.input ?? {}) as Record<string, unknown>;
          const result = await executeTool(block.name, toolInput, env);
          toolTrace.push({
            tool: block.name,
            input: toolInput,
            result: result.slice(0, 800),
          });
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: result,
          });
        }
      }
      messages.push({ role: "user", content: toolResults });
    } else {
      // Unexpected stop reason — return whatever we have
      const textBlock = data.content.find((c) => c.type === "text");
      return jsonResponse({
        id: crypto.randomUUID(),
        provider: toolProvider,
        model: data.model,
        content: textBlock?.text ?? `[Stopped: ${data.stop_reason}]`,
        toolTrace,
        tokens: {
          input: data.usage?.input_tokens ?? 0,
          output: data.usage?.output_tokens ?? 0,
          total:
            (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0),
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  return errorResponse(
    "Tool loop exceeded 6 iterations — possible infinite loop",
    500,
  );
}

export const onRequest: PagesFunction<Env> = async (context) => {
  try {
    if (context.request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    const url = new URL(context.request.url);
    const path = url.pathname.replace("/api/ai/", "");

    switch (path) {
      case "chat":
        if (context.request.method !== "POST")
          return errorResponse("POST required", 405);
        return handleChat(context.request, context.env);

      case "chat/stream":
        if (context.request.method !== "POST")
          return errorResponse("POST required", 405);
        return handleStream(context.request, context.env);

      case "chat/tools":
        if (context.request.method !== "POST")
          return errorResponse("POST required", 405);
        return handleToolChat(context.request, context.env);

      case "v1/chat/completions":
        if (context.request.method !== "POST")
          return errorResponse("POST required", 405);
        return handleCompletionsProxy(context.request, context.env);

      case "providers":
        return jsonResponse({
          providers: PROVIDERS.map((p) => ({
            name: p.name,
            models: p.models,
            priority: p.priority,
            costPerMTok: p.costPerMTok,
            available: !!getApiKey(context.env, p.name),
          })),
        });

      case "status":
        return jsonResponse({
          service: "AI Gate",
          status: "operational",
          version: "2.0.0",
          providers: PROVIDERS.map((p) => ({
            name: p.name,
            available: !!getApiKey(context.env, p.name),
            models: p.models.length,
          })),
          pageAgent: true,
          timestamp: new Date().toISOString(),
        });

      default:
        return errorResponse("Unknown AI Gate endpoint", 404);
    }
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        error: {
          message: `Internal server error: ${err?.message || "unknown"}`,
          type: "server_error",
        },
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  }
};
