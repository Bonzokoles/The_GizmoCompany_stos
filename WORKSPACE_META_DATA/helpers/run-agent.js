#!/usr/bin/env node
/**
 * helpers/run-agent.js
 * Uruchamia pomocnika WORKSPACE_META_DATA przez OpenRouter API
 *
 * Użycie: node helpers/run-agent.js <nazwa>
 * Nazwy: indekser | archiwista | status-keeper | janitor
 */

import { readFileSync, readdirSync, statSync, existsSync, writeFileSync, mkdirSync, renameSync } from "fs";
import { resolve, join, relative, dirname as pathDirname, basename } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { execSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

// ── Config ───────────────────────────────────────────────────────────────────

const AGENT_MODELS = {
  indekser:        "meta-llama/llama-3.1-8b-instruct",
  archiwista:      "google/gemini-flash-1.5",
  "status-keeper": "deepseek/deepseek-chat-v3-0324",
  janitor:         "google/gemini-flash-1.5",
};

const PROJECT_REPOS = {
  ZENO_Browser: "u:/WWW_Zen_BRo_wser_org3",
  JIMBO_HUB:    "u:/WWW_Zen_BRo_wser_org3/JIMBO_agent_HUB",
  BUCH:         "u:/The_DEVz_HUB_of_work/BUCH_DEVz_CHat_box",
};

const OPENROUTER_KEY =
  process.env.OPENROUTER_API_KEY ||
  (() => {
    const envFile = resolve(ROOT, "..", ".env");
    if (existsSync(envFile)) {
      const match = readFileSync(envFile, "utf-8").match(/OPENROUTER_API_KEY=(.+)/);
      return match ? match[1].trim() : null;
    }
    return null;
  })();

// ── Utils ────────────────────────────────────────────────────────────────────

function scanMdFiles(dir, ignore = ["_archiwum", "node_modules", ".github"]) {
  const results = [];
  for (const entry of readdirSync(dir)) {
    if (ignore.some((i) => entry.startsWith(i))) continue;
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      results.push(...scanMdFiles(full, ignore));
    } else if (entry.endsWith(".md")) {
      results.push({ path: full, rel: relative(ROOT, full).replace(/\\/g, "/"), mtime: stat.mtime });
    }
  }
  return results;
}

async function llm(model, system, user) {
  if (!OPENROUTER_KEY) throw new Error("Brak OPENROUTER_API_KEY");
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      max_tokens: 2048,
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(`OpenRouter error: ${data.error.message}`);
  return data.choices?.[0]?.message?.content ?? "";
}

function gitLog(repoPath, since = "3 days ago") {
  try {
    return execSync(`git -C "${repoPath}" log --oneline --since="${since}"`, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
  } catch {
    return "(brak dostępu do repo)";
  }
}

function ensureDir(dir) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

// ── Agenty ───────────────────────────────────────────────────────────────────

async function runIndekser() {
  const model = AGENT_MODELS.indekser;
  const files = scanMdFiles(ROOT);
  const system = `Dostajesz: ścieżkę pliku + pierwsze 3 linie jego treści.
Odpowiedz TYLKO jednym zdaniem po polsku opisującym co to za plik.
Maksymalnie 80 znaków. Bez kropki na końcu.`;

  console.log(`[Indekser] Skanowanie ${files.length} plików...`);

  const groups = {};
  for (const f of files) {
    const lines = readFileSync(f.path, "utf-8").split("\n").slice(0, 3).join(" ");
    const desc = await llm(model, system, `Plik: ${f.rel}\nTreść: ${lines}`);
    const folder = f.rel.split("/").slice(0, -1).join("/") || ".";
    if (!groups[folder]) groups[folder] = [];
    groups[folder].push(`- \`${f.rel}\` — ${desc.trim()} (${f.mtime.toISOString().slice(0, 10)})`);
    process.stdout.write(".");
  }

  let index = `# INDEX — WORKSPACE_META_DATA\nWygenerowano: ${today()} | Pliki: ${files.length}\n\n`;
  for (const [folder, lines] of Object.entries(groups).sort()) {
    index += `## ${folder}/\n${lines.join("\n")}\n\n`;
  }

  writeFileSync(join(ROOT, "INDEX.md"), index, "utf-8");
  console.log(`\n[Indekser] Gotowe → INDEX.md (${files.length} plików)`);
}

async function runArchiwista() {
  const model = AGENT_MODELS.archiwista;
  const files = scanMdFiles(ROOT);
  const now = Date.now();
  const ARCHIVE_AGE_DAYS = 14;

  const PROTECTED = new Set(["README.md", "INDEX.md", "step_01.md", "step_02.md", "step_03.md", "step_04.md"]);

  const candidates = [];
  for (const f of files) {
    const name = basename(f.path);
    const ageDays = (now - f.mtime.getTime()) / 86400000;

    if (PROTECTED.has(name)) continue;
    if (f.rel.startsWith("helpers/")) continue;
    if (f.rel.includes("status.md")) continue;

    const content = readFileSync(f.path, "utf-8");
    if (content.includes("<!-- KEEP -->")) continue;
    if (ageDays < ARCHIVE_AGE_DAYS) continue;

    const isResolved =
      content.includes("Status: RESOLVED") ||
      content.includes("Status: DONE") ||
      content.includes("STATUS: RESOLVED") ||
      content.includes("STATUS: DONE");
    const isLog = f.rel.startsWith("logi/");
    const isReport = f.rel.startsWith("raporty/");

    if (isResolved || isLog || isReport) {
      candidates.push({
        path: f.path,
        rel: f.rel,
        ageDays: Math.round(ageDays),
        isResolved,
        isLog,
        isReport,
        preview: content.split("\n").slice(0, 5).join(" "),
      });
    }
  }

  if (candidates.length === 0) {
    console.log("[Archiwista] Brak kandydatów do archiwizacji.");
    ensureDir(join(ROOT, "raporty"));
    writeFileSync(
      join(ROOT, "raporty", `${today()}_archiwista.md`),
      `# Raport Archiwiesty — ${today()}\n\n- Brak plików do archiwizacji — wszystko aktualne\n`,
      "utf-8"
    );
    return;
  }

  const system = `Jesteś Archiwistą. Twoje jedyne zadanie: porządkowanie plików markdown.
Dostajesz listę plików z datami modyfikacji i treścią pierwszych 5 linii.
Decydujesz które przenieść do _archiwum/ według podanych reguł:
- Przenoś: stare logi (logi/), stare raporty (raporty/), pliki ze statusem RESOLVED/DONE
- NIE przenoś: status.md projektów, README.md, step_0*.md, pliki z <!-- KEEP -->
Odpowiadaj TYLKO listą JSON: [{"from": "rel/path.md", "to": "_archiwum/rel/path.md", "reason": "powód"}]
Nie komentuj, nie pytaj, nie elaboruj.`;

  const userMsg = candidates
    .map((c) => `Plik: ${c.rel}\nWiek: ${c.ageDays}d | resolved=${c.isResolved} log=${c.isLog} report=${c.isReport}\nTreść: ${c.preview}`)
    .join("\n\n---\n\n");

  console.log(`[Archiwista] Analizuję ${candidates.length} kandydatów...`);
  const raw = await llm(model, system, userMsg);

  let decisions = [];
  try {
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (jsonMatch) decisions = JSON.parse(jsonMatch[0]);
  } catch {
    decisions = candidates.map((c) => ({
      from: c.rel,
      to: `_archiwum/${c.rel}`,
      reason: "auto (fallback — model nie zwrócił JSON)",
    }));
  }

  const moved = [];
  const errors = [];
  for (const d of decisions) {
    const srcPath = join(ROOT, d.from);
    const dstPath = join(ROOT, d.to);
    if (!existsSync(srcPath)) { errors.push(`NIE ISTNIEJE: ${d.from}`); continue; }
    try {
      ensureDir(pathDirname(dstPath));
      renameSync(srcPath, dstPath);
      moved.push(`- \`${d.from}\` → \`${d.to}\` (${d.reason})`);
      console.log(`  ✓ ${d.from}`);
    } catch (e) {
      errors.push(`BŁĄD (${d.from}): ${e.message}`);
    }
  }

  ensureDir(join(ROOT, "raporty"));
  const reportLines = [
    `# Raport Archiwiesty — ${today()}`, "",
    `## Przeniesiono (${moved.length})`, moved.length ? moved.join("\n") : "- Brak", "",
  ];
  if (errors.length) reportLines.push(`## Błędy`, errors.map((e) => `- ${e}`).join("\n"), "");
  writeFileSync(join(ROOT, "raporty", `${today()}_archiwista.md`), reportLines.join("\n"), "utf-8");
  console.log(`[Archiwista] Gotowe → przeniesiono: ${moved.length} | błędy: ${errors.length}`);
}

async function runStatusKeeper() {
  const model = AGENT_MODELS["status-keeper"];
  const projektyDir = join(ROOT, "projekty");
  const logiDir = join(ROOT, "logi");

  const system = `Masz: aktualny status.md + lista commitów z ostatnich 3 dni + nowe wpisy z logi/.
Zadanie: zaktualizuj sekcje "Aktywne zadania", "Ostatnie zmiany", "Następny krok".
Zachowaj format pliku (markdown, ## nagłówki). Nie usuwaj sekcji "Blokery" jeśli ma treść.
Dodaj nagłówek: "Ostatnia aktualizacja: YYYY-MM-DD" (zastąp datę dzisiejszą).
Odpowiedz TYLKO pełną treścią nowego status.md. Bez żadnych dodatkowych komentarzy.`;

  const updated = [];
  const skipped = [];

  for (const [projectName, repoPath] of Object.entries(PROJECT_REPOS)) {
    const statusPath = join(projektyDir, projectName, "status.md");
    if (!existsSync(statusPath)) { skipped.push(`${projectName} (brak status.md)`); continue; }

    const currentStatus = readFileSync(statusPath, "utf-8");
    const commits = gitLog(repoPath, "3 days ago");

    let logiContext = "";
    if (existsSync(logiDir)) {
      const logiFiles = readdirSync(logiDir)
        .filter((f) => f.endsWith(".md"))
        .filter((f) =>
          readFileSync(join(logiDir, f), "utf-8")
            .toLowerCase()
            .includes(projectName.toLowerCase().replace("_", " "))
        )
        .slice(-3);
      for (const lf of logiFiles) {
        logiContext += `\n### ${lf}\n${readFileSync(join(logiDir, lf), "utf-8").split("\n").slice(0, 10).join("\n")}\n`;
      }
    }

    const userMsg = [
      `## Projekt: ${projectName}`,
      `\n### Aktualny status.md:\n${currentStatus}`,
      `\n### Commity z ostatnich 3 dni (${repoPath}):\n${commits || "(brak commitów)"}`,
      `\n### Powiązane wpisy z logi/:\n${logiContext || "(brak)"}`,
    ].join("\n");

    console.log(`[StatusKeeper] Aktualizuję: ${projectName}...`);
    try {
      const newStatus = await llm(model, system, userMsg);
      if (newStatus && newStatus.length > 50) {
        writeFileSync(statusPath, newStatus.trim() + "\n", "utf-8");
        updated.push(projectName);
        console.log(`  ✓ ${projectName}`);
      } else {
        skipped.push(`${projectName} (model zwrócił pusty wynik)`);
      }
    } catch (e) {
      skipped.push(`${projectName} (błąd: ${e.message})`);
    }
  }

  ensureDir(join(ROOT, "raporty"));
  const report = [
    `# Raport StatusKeeper — ${today()}`, "",
    `## Zaktualizowano (${updated.length})`, updated.length ? updated.map((p) => `- ${p}`).join("\n") : "- Brak", "",
    `## Pominięto (${skipped.length})`, skipped.length ? skipped.map((p) => `- ${p}`).join("\n") : "- Brak", "",
  ].join("\n");
  writeFileSync(join(ROOT, "raporty", `${today()}_status-keeper.md`), report, "utf-8");
  console.log(`[StatusKeeper] Gotowe → zaktualizowano: ${updated.length} projektów`);
}

async function runJanitor() {
  const files = scanMdFiles(ROOT);
  const report = [];
  const now = Date.now();

  for (const f of files) {
    const content = readFileSync(f.path, "utf-8");
    const lines = content.split("\n").filter((l) => l.trim()).length;
    const ageDays = (now - f.mtime.getTime()) / 86400000;

    if (lines < 5 && ageDays > 7 && !content.includes("<!-- KEEP -->")) {
      report.push(`PUSTY (${lines} linii, ${Math.round(ageDays)}d): ${f.rel}`);
    }

    if (f.rel.startsWith("logi/") && !content.includes("Status:")) {
      writeFileSync(f.path, content.trimEnd() + "\n\n**Status:** OPEN\n", "utf-8");
      report.push(`DODANO Status:OPEN: ${f.rel}`);
    }
  }

  const projektyDir = join(ROOT, "projekty");
  if (existsSync(projektyDir)) {
    for (const proj of readdirSync(projektyDir)) {
      const projDir = join(projektyDir, proj);
      if (!statSync(projDir).isDirectory()) continue;
      const statusFile = join(projDir, "status.md");
      if (!existsSync(statusFile)) {
        const template = `# Status: ${proj}\nOstatnia aktualizacja: ${today()}\n\n## Aktywne zadania\n-\n\n## Blokery\n-\n\n## Ostatnie zmiany\n-\n\n## Następny krok\n-\n`;
        writeFileSync(statusFile, template, "utf-8");
        report.push(`UTWORZONO status.md: projekty/${proj}/`);
      }
    }
  }

  const indexPath = join(ROOT, "INDEX.md");
  if (existsSync(indexPath)) {
    const indexedCount = (readFileSync(indexPath, "utf-8").match(/^- `/gm) || []).length;
    const diff = Math.abs(files.length - indexedCount);
    if (diff > 5) {
      report.push(`INDEX.md rozbieżność: ${diff} plików (faktycznie: ${files.length}, w indeksie: ${indexedCount}) → wywołaj indeksera`);
    }
  } else {
    report.push("BRAK INDEX.md — wywołaj indeksera");
  }

  ensureDir(join(ROOT, "raporty"));
  const reportContent = `# Raport Janitora — ${today()}\n\n${report.map((r) => `- ${r}`).join("\n") || "- Brak akcji — wszystko czyste"}\n`;
  const reportPath = join(ROOT, "raporty", `${today()}_janitor.md`);
  writeFileSync(reportPath, reportContent, "utf-8");
  console.log(`[Janitor] Gotowe → ${reportPath}`);
  console.log(reportContent);
}

// ── Main ─────────────────────────────────────────────────────────────────────

const agent = process.argv[2];
if (!agent || !AGENT_MODELS[agent]) {
  console.error(`Użycie: node helpers/run-agent.js <nazwa>\nDostępne: ${Object.keys(AGENT_MODELS).join(", ")}`);
  process.exit(1);
}

console.log(`[helpers] Uruchamiam: ${agent} (model: ${AGENT_MODELS[agent]})`);

if (agent === "indekser")       await runIndekser();
else if (agent === "archiwista") await runArchiwista();
else if (agent === "status-keeper") await runStatusKeeper();
else if (agent === "janitor")   await runJanitor();
