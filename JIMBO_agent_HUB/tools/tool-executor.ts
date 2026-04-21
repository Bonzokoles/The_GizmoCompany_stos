/**
 * BUCH_AGENT — executor narzędzi
 *
 * Każde narzędzie zwraca string (wynik jako tekst dla LLM).
 * Błędy są łapane wyżej w pętli agenta — tu rzucamy Error.
 */

import fs from "fs";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import { fileURLToPath } from "url";
import { d1Query, r2ListFiles, r2ReadFile, r2WriteFile } from "../core/cf-remote.js";

const execFileAsync = promisify(execFile);

// Katalog główny projektu ZENO Browser
const PROJECT_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);

// Pliki i katalogi CHRONIONE — write_file odmówi
const PROTECTED_PATTERNS = [
  /src-electron[\\/]main\.ts$/,
  /src-electron[\\/]preload\.ts$/,
  /src-electron[\\/]app[\\/]/,
  /src[\\/]shared[\\/]ipc[\\/]/,
  /src[\\/]main\.tsx$/,
  /src[\\/]App\.tsx$/,
  /package\.json$/,
  /package-lock\.json$/,
  /vite\.config/,
  /tsconfig/,
  /electron-builder/,
  /\.github[\\/]/,
  /\.cloudflare[\\/]/,
];

// Komendy dozwolone (prefix allowlist)
const ALLOWED_CMD_PREFIXES = [
  "npx ", "npm run", "npm test", "npm install",
  "git status", "git log", "git diff", "git branch",
  "tsc", "dir", "ls", "cat ", "type ",
  "grep ", "find ", "echo ", "node ",
];

function resolvePath(p: string): string {
  if (path.isAbsolute(p)) return p;
  return path.resolve(PROJECT_ROOT, p);
}

function isProtected(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, "/");
  return PROTECTED_PATTERNS.some((re) => re.test(normalized));
}

function isSafeCommand(cmd: string): boolean {
  const lower = cmd.trim().toLowerCase();
  return ALLOWED_CMD_PREFIXES.some((prefix) => lower.startsWith(prefix.toLowerCase()));
}

// ── NARZĘDZIA ──────────────────────────────────────────────────────

export async function executeTool(
  name: string,
  args: Record<string, unknown>,
): Promise<string> {
  switch (name) {
    // ── LOCAL ────────────────────────────────────────────────────
    case "read_file": {
      const filePath = resolvePath(String(args.path ?? ""));
      const content = fs.readFileSync(filePath, "utf-8");
      const truncated = content.length > 8000
        ? content.slice(0, 8000) + `\n…(skrócono, całość: ${content.length} znaków)`
        : content;
      return truncated;
    }

    case "write_file": {
      const filePath = resolvePath(String(args.path ?? ""));
      if (isProtected(filePath)) {
        throw new Error(`CHRONIONY plik — odmowa zapisu: ${filePath}`);
      }
      const content = String(args.content ?? "");
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, content, "utf-8");
      return `Zapisano: ${filePath} (${content.length} znaków)`;
    }

    case "list_dir": {
      const dirPath = resolvePath(String(args.path ?? "."));
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      const lines = entries.slice(0, 100).map((e) => {
        const type = e.isDirectory() ? "📁" : "📄";
        const size = e.isFile()
          ? ` (${fs.statSync(path.join(dirPath, e.name)).size}B)`
          : "";
        return `${type} ${e.name}${size}`;
      });
      if (entries.length > 100) lines.push(`…i ${entries.length - 100} więcej`);
      return lines.join("\n");
    }

    case "run_command": {
      const cmd = String(args.command ?? "").trim();
      if (!isSafeCommand(cmd)) {
        throw new Error(
          `Komenda zablokowana ze względów bezpieczeństwa: "${cmd}". Dozwolone: npx, npm, git status/log/diff, tsc, dir, ls, grep, cat, find, echo, node.`,
        );
      }
      const cwd = args.cwd ? resolvePath(String(args.cwd)) : PROJECT_ROOT;
      const parts = cmd.split(/\s+/);
      const { stdout, stderr } = await execFileAsync(parts[0], parts.slice(1), {
        cwd,
        timeout: 30_000,
        maxBuffer: 512 * 1024,
      });
      const out = [stdout, stderr].filter(Boolean).join("\n").trim();
      return out || "(brak outputu)";
    }

    case "local_services_status": {
      const checks = await Promise.allSettled([
        fetch("http://localhost:4224/status", { signal: AbortSignal.timeout(2000) })
          .then((r) => r.json() as Promise<{ hub: string; goose?: { available: boolean } }>)
          .then((d) => `HUB :4224 ✓ (goose: ${d.goose?.available ? "✓" : "✗"})`),
        fetch("http://localhost:4111/health", { signal: AbortSignal.timeout(2000) })
          .then(() => "JimboKit :4111 ✓"),
        fetch("http://localhost:8080/search?q=test&format=json", {
          signal: AbortSignal.timeout(2000),
        }).then(() => "SearXNG :8080 ✓"),
      ]);
      return checks
        .map((r, i) => {
          const names = ["JIMBO HUB", "JimboKit", "SearXNG"];
          return r.status === "fulfilled"
            ? r.value
            : `${names[i]} ✗ (niedostępny)`;
        })
        .join("\n");
    }

    // ── HUB ──────────────────────────────────────────────────────
    case "hub_search_skills": {
      const res = await fetch("http://localhost:4224/skills/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: args.query, limit: args.limit ?? 5 }),
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) throw new Error(`HUB skills/search error ${res.status}`);
      const data = (await res.json()) as { results?: { name: string; description: string; score?: number }[] };
      const results = data.results ?? [];
      if (!results.length) return "Brak wyników dla: " + args.query;
      return results
        .map((r, i) => `${i + 1}. **${r.name}** (score: ${r.score?.toFixed(2) ?? "?"}):\n   ${r.description}`)
        .join("\n");
    }

    case "hub_search_memory": {
      const res = await fetch("http://localhost:4224/memory/archival/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: args.query, limit: 5 }),
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) throw new Error(`HUB memory/search error ${res.status}`);
      const data = (await res.json()) as { results?: { content: string; similarity?: number }[] };
      const results = data.results ?? [];
      if (!results.length) return "Brak wspomnień dla: " + args.query;
      return results
        .map((r, i) => `${i + 1}. [${(r.similarity ?? 0).toFixed(2)}] ${r.content.slice(0, 200)}`)
        .join("\n\n");
    }

    case "hub_goose_run": {
      const res = await fetch("http://localhost:4224/agent/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instructions: args.instructions }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) throw new Error(`HUB agent/run error ${res.status}`);
      const data = (await res.json()) as { taskId?: string; status?: string };
      return `Goose task uruchomiony. taskId: ${data.taskId ?? "?"}. Status: ${data.status ?? "running"}. Wynik przyjdzie przez synthesis w BUCH_CHAT.`;
    }

    case "pi_agent_run": {
      const agentId = String(args.agent_id ?? "");
      const res = await fetch(`http://localhost:4224/polaczek/${agentId}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task: args.task, stream: false }),
        signal: AbortSignal.timeout(60_000),
      });
      if (!res.ok) throw new Error(`Pi agent error ${res.status}: ${agentId}`);
      const data = (await res.json()) as { output?: string; result?: string; error?: string };
      if (data.error) throw new Error(data.error);
      return data.output ?? data.result ?? "(brak odpowiedzi)";
    }

    // ── CLOUD ────────────────────────────────────────────────────
    case "d1_query": {
      const result = await d1Query(
        String(args.database_id ?? ""),
        String(args.sql ?? ""),
        (args.params as (string | number | null)[] | undefined) ?? [],
      );
      const rows = result.results ?? [];
      if (!rows.length) return "Query OK — brak wyników (0 wierszy).";
      const header = Object.keys(rows[0]).join(" | ");
      const divider = "-".repeat(header.length);
      const body = rows
        .slice(0, 50)
        .map((r) => Object.values(r).join(" | "))
        .join("\n");
      const suffix = rows.length > 50 ? `\n…i ${rows.length - 50} więcej wierszy` : "";
      return `${header}\n${divider}\n${body}${suffix}\n\n(${rows.length} wierszy, ${result.meta.duration.toFixed(1)}ms)`;
    }

    case "r2_list": {
      const files = await r2ListFiles(
        String(args.bucket ?? ""),
        args.prefix ? String(args.prefix) : undefined,
      );
      if (!files.length) return "Bucket pusty lub brak plików z podanym prefixem.";
      return files
        .slice(0, 100)
        .map((f) => `📄 ${f.key} (${f.size}B, ${new Date(f.uploaded).toLocaleDateString("pl-PL")})`)
        .join("\n");
    }

    case "r2_read": {
      const content = await r2ReadFile(
        String(args.bucket ?? ""),
        String(args.key ?? ""),
      );
      return content.length > 8000
        ? content.slice(0, 8000) + `\n…(skrócono, całość: ${content.length} znaków)`
        : content;
    }

    case "r2_write": {
      await r2WriteFile(
        String(args.bucket ?? ""),
        String(args.key ?? ""),
        String(args.content ?? ""),
        String(args.content_type ?? "text/plain"),
      );
      return `Zapisano do R2: ${args.bucket}/${args.key}`;
    }

    // ── KB (Knowledge Base) ──────────────────────────────────────
    case "kb_search": {
      // Wyszukiwanie semantyczne w lokalnej bazie wiedzy (ChromaDB, port 7071)
      const query = String(args.query ?? "");
      const limit = Math.min(Number(args.limit ?? 8), 20);
      const categories = args.categories as string[] | undefined;

      const endpoint = categories?.length
        ? "http://localhost:7071/api/kb/query"
        : "http://localhost:7071/api/kb/search";

      const body = categories?.length
        ? { query, categories, limit }
        : { query, limit };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) throw new Error(`KB Server error ${res.status} (port 7071). Czy kb_server.py działa?`);

      const data = (await res.json()) as {
        results?: { documents?: string[][]; metadatas?: Array<Array<Record<string, string>>>; distances?: number[][] };
        context?: string;
        warning?: string;
        returned_documents?: number;
      };

      if (data.warning) return `⚠ KB: ${data.warning}`;

      // RAG query zwraca context jako tekst
      if (data.context) {
        return `**RAG Context** (${data.returned_documents ?? "?"} dokumentów):\n\n${data.context.slice(0, 6000)}`;
      }

      // Search zwraca surowe chromadb results
      const docs = data.results?.documents?.[0] ?? [];
      const metas = data.results?.metadatas?.[0] ?? [];
      const dists = data.results?.distances?.[0] ?? [];

      if (!docs.length) return "Brak wyników w KB dla: " + query;

      return docs
        .slice(0, limit)
        .map((doc, i) => {
          const meta = metas[i] ?? {};
          const score = dists[i] ? `(score: ${(1 - dists[i]).toFixed(2)})` : "";
          const cat = meta.category ?? meta.cat ?? "?";
          const title = meta.title ?? meta.file_path?.split(/[\\/]/).pop() ?? `Dokument ${i + 1}`;
          return `**${i + 1}. ${title}** ${score}\n📁 ${cat}\n${doc.slice(0, 300)}`;
        })
        .join("\n\n---\n\n");
    }

    case "kb_categories": {
      const res = await fetch("http://localhost:7071/api/kb/categories", {
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) throw new Error(`KB Server error ${res.status}`);
      const cats = (await res.json()) as Array<{
        id: string; name: string; description: string;
        file_count: number; indexed_documents: number; exists: boolean;
      }>;
      if (!cats.length) return "Brak kategorii w KB.";
      return cats
        .map(c => `**${c.id} — ${c.name}** (${c.indexed_documents} zaind. / ${c.file_count} plików)\n   ${c.description}`)
        .join("\n");
    }

    // ── WEB ──────────────────────────────────────────────────────
    case "web_search": {
      const searxPort = process.env.SEARXNG_PORT ?? "8080";
      const q = encodeURIComponent(String(args.query ?? ""));
      const num = Math.min(Number(args.num_results ?? 5), 10);
      const res = await fetch(
        `http://localhost:${searxPort}/search?q=${q}&format=json&num_results=${num}`,
        { signal: AbortSignal.timeout(8000) },
      );
      if (!res.ok) throw new Error(`SearXNG error ${res.status}`);
      const data = (await res.json()) as {
        results?: { title: string; url: string; content?: string }[];
      };
      const results = data.results?.slice(0, num) ?? [];
      if (!results.length) return "Brak wyników wyszukiwania.";
      return results
        .map(
          (r, i) =>
            `${i + 1}. **${r.title}**\n   ${r.url}\n   ${(r.content ?? "").slice(0, 150)}`,
        )
        .join("\n\n");
    }

    case "http_fetch": {
      const url = String(args.url ?? "");
      const method = String(args.method ?? "GET").toUpperCase();
      const body = args.body ? String(args.body) : undefined;
      const extraHeaders = (args.headers as Record<string, string> | undefined) ?? {};
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...extraHeaders,
        },
        body: body ?? undefined,
        signal: AbortSignal.timeout(15_000),
      });
      const text = await res.text();
      return `HTTP ${res.status} ${res.statusText}\n${text.slice(0, 4000)}`;
    }

    // ── CONTENT ──────────────────────────────────────────────────
    case "blog_post": {
      const blogApi = process.env.BLOG_API_URL ?? "http://localhost:4224/blog/post";
      const res = await fetch(blogApi, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: args.title,
          content: args.content,
          tags: args.tags ?? [],
          status: args.status ?? "draft",
        }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) {
        const err = await res.text().catch(() => "");
        throw new Error(`Blog API error ${res.status}: ${err}`);
      }
      const data = (await res.json()) as { id?: string | number; url?: string };
      return `Wpis stworzony! ID: ${data.id ?? "?"}, URL: ${data.url ?? "(draft)"}`;
    }

    default:
      throw new Error(`Nieznane narzędzie: ${name}`);
  }
}
