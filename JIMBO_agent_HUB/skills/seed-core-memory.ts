/**
 * Seed: Core Memory + Archival + Agent Skills
 *
 * Uruchom: npx tsx skills/seed-core-memory.ts
 *
 * Aktualizuje core_memory do wersji operacyjnej,
 * dodaje praktyczną wiedzę do archival memory
 * i seeduje named agent skills.
 */

import { MemoryManager } from './memory-manager.js';
import { SkillManager } from './skill-manager.js';

const memory = new MemoryManager();
const skills = new SkillManager();

// ─────────────────────────────────────────────────────────────────────────────
// TIER 1 — CORE MEMORY (zawsze w kontekście, trzymaj krótko)
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n📌 Aktualizacja core_memory...\n');

// Zasady działania — kiedy odpowiadać samemu a kiedy Goose
memory.setCoreEntry('persona',
`Jesteś JIMBO/BUCH — asystent AI w ZENO Browser.

KIEDY GOOSE (blok \`\`\`goose): pliki, terminal, git, npm, Podman, długie zadania
KIEDY SAM: pytania, wyjaśnienia, analiza kodu, krótkie odpowiedzi
NIGDY: nie wysyłaj testów, hello-world, jednorazowych eksperymentów do Goose

STYL: zwięzły, techniczny, po polsku. Zawsze gotowe rozwiązanie, nie "można by".`
);

memory.setCoreEntry('project',
`PROJEKTY ZENO (katalog główny: U:\\WWW_Zen_BRo_wser_org3):
• ZENO Browser — Electron + React 19 + Vite + CF Pages/Workers/D1
  Hub: localhost:4224 | Web: zenbrowsers.org
• mybonzo.com — Astro 5 SSR + CF Pages + D1(mybonzo) + R2
  ERP/CRM dla MŚP: finanse, CRM, magazyn, AI Doradca (6 ról)
• mybonzoai blog — Astro + CF Pages + D1(jimbo-rag-db)
• jimbo77.com — Next.js + CF Workers
• jimbo.org — Vite/React + Vercel
Stos: TypeScript, Node.js, SQLite/D1, Cloudflare, Goose v1.29.1`
);

memory.setCoreEntry('human',
`Właściciel: Bonzo. Język: polski (lub angielski zależnie od pytania).
Zaawansowany użytkownik — nie tłumacz podstaw, idź od razu do rozwiązania.
Pracuje na Windows 11, Electron + Vite dev workflow.`
);

memory.setCoreEntry('goals',
`Aktualny etap: JIMBO Hub stabilizacja + ReflexionEngine aktywny.
Następne: Etap C — BizTools API + blog skills + multi-agent routing.
Długoterminowe: OpenEvolve skill optimizer, EvoAgentX multi-agent.`
);

// Katalog narzędzi — oddzielny wpis bo zmienia się rzadziej
memory.setCoreEntry('tools_catalog',
`HUB API (localhost:4224):
  POST /agent/run      { instructions, workdir? } → uruchom Goose
  GET  /agent/tasks    → aktywne taski
  POST /skills/search  { query, namespace? } → szukaj skills
  GET  /skills/list    → wszystkie skills
  POST /memory/archival { content, source, tags[] } → zapisz wiedzę
  GET  /reflexion/stats → oceny jakości zadań

KONTENERY (gdy aktywne):
  Meilisearch:localhost:7700 | Umami:3001 | Sist2:4002 | Mydia:8096`
);

console.log('  ✅ core_memory zaktualizowana (5 wpisów)');

// ─────────────────────────────────────────────────────────────────────────────
// TIER 2 — ARCHIVAL MEMORY (semantic search, injected per-query)
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n📚 Seedowanie archival memory...\n');

const archivalSeeds = [
  {
    source: 'knowledge:goose-patterns',
    tags: ['goose', 'patterns', 'instrukcje'],
    content: `SPRAWDZONE WZORCE INSTRUKCJI GOOSE:

✅ Tworzenie/edycja pliku:
"Otwórz plik U:\\WWW_Zen_BRo_wser_org3\\JIMBO_agent_HUB\\hub-server.ts.
Znajdź funkcję X i zmień Y na Z. Zapisz plik."

✅ Instalacja i import:
"W katalogu U:\\WWW_Zen_BRo_wser_org3\\JIMBO_agent_HUB uruchom:
npm install [pakiet]
Następnie w pliku [plik.ts] dodaj import: import { X } from '[pakiet]'."

✅ Git commit:
"W katalogu U:\\WWW_Zen_BRo_wser_org3 wykonaj:
git add -A
git commit -m 'feat: [opis zmiany]'"

✅ Sprawdzenie kontenerów Podman:
"Sprawdź status kontenerów: podman ps -a
Uruchom te które są stopped: podman start [nazwa]
Sprawdź logi jeśli coś nie działa: podman logs [nazwa]"

✅ Sprawdzenie API endpoint:
"Wyślij request: curl -s http://localhost:4224/status | python -m json.tool
Sprawdź odpowiedź i zraportuj status."

❌ UNIKAJ:
- "Napraw wszystko" — za ogólne
- Łączenia 5 niezależnych zadań w jedno — Goose może się zgubić
- Pytań do Goose o wyjaśnienie — Goose wykonuje, nie dyskutuje`,
  },
  {
    source: 'knowledge:zeno-architecture',
    tags: ['architektura', 'zeno', 'pliki', 'struktura'],
    content: `ARCHITEKTURA ZENO BROWSER (kluczowe pliki):

ELECTRON (src-electron/):
  main.ts         — główny proces, IPC handlers, CSP, autostart
  preload.ts      — bridge renderer ↔ main

REACT (src/components/):
  browser-core/BrowserUI.tsx     — główny UI przeglądarki
  assistant/AgentHubPanel.tsx    — panel agenta (TASKS, BUCH, Goose)
  assistant/BuchChatWidget.tsx   — floating chat widget
  navigation/StartPage.tsx       — strona startowa

JIMBO HUB (JIMBO_agent_HUB/):
  hub-server.ts                  — Express + WebSocket, główny serwer
  core/llm-client.ts             — OpenAI-compatible client
  core/goose-bridge.ts           — subprocess Goose
  core/reflexion-engine.ts       — ocena jakości zadań (NOWE)
  skills/skill-manager.ts        — SQLite skills DB
  skills/memory-manager.ts       — 3-tier memory (Letta pattern)
  agents/skill-agent.ts          — skill injection + eval

CLOUDFLARE (functions/):
  api/ai/chat.ts         — proxy do LLM
  api/ai/chat/tools.ts   — tool-use endpoint
  api/ai/chat/stream.ts  — SSE streaming

BAZA DANYCH:
  skills/db/skills.db    — skills + reflexion_log
  skills/db/memory.db    — core/archival/recall memory`,
  },
  {
    source: 'knowledge:cloudflare-tools',
    tags: ['cloudflare', 'wrangler', 'deploy', 'workers', 'd1'],
    content: `CLOUDFLARE WORKFLOW (ZENO Browser):

DEPLOY:
  npm run deploy          — build + wrangler deploy (CF Pages)
  wrangler deploy         — tylko Workers
  wrangler d1 execute     — migracje D1

D1 DATABASES:
  mybonzo-db              — mybonzo.com (ERP/CRM dane)
  jimbo-rag-db            — blog AI context
  zeno-db                 — ZENO Browser dane (agenty, ustawienia)

KV NAMESPACES:
  CACHE_KV                — cache dla CF Functions

R2 BUCKETS:
  mybonzo-media           — media mybonzo.com

WORKERS:
  zeno-mcp-worker         — MCP server dla ZENO
  mybonzo-api             — API mybonzo.com

LOKALNE TESTOWANIE:
  wrangler dev --local    — lokalny emulator
  curl localhost:8788/... — testuj CF Functions lokalnie`,
  },
  {
    source: 'knowledge:podman-containers',
    tags: ['podman', 'kontenery', 'docker', 'serwisy'],
    content: `PODMAN KONTENERY (ZENO Browser stack):

ANALYTICS:
  zeno-umami       localhost:3001  — Umami analytics (własny)
  plausible        localhost:8000  — Plausible analytics
  zeno-superset    localhost:8088  — Apache Superset dashboards

SEARCH:
  zeno-meilisearch localhost:7700  — Meilisearch (fast search)
  searxng          localhost:4001  — metawyszukiwarka
  zeno-sist2       localhost:4002  — indekser plików

MEDIA:
  mydia            localhost:8096  — Jellyfin (media server)

ZARZĄDZANIE:
  podman ps -a                     — wszystkie kontenery
  podman start [nazwa]             — uruchom
  podman stop [nazwa]              — zatrzymaj
  podman logs --tail 50 [nazwa]   — ostatnie logi
  podman stats                     — zużycie zasobów

AUTOSTART: skonfigurowany przez systemd user units lub startup task`,
  },
  {
    source: 'knowledge:skills-system',
    tags: ['skills', 'namespace', 'hermes', 'kontekst'],
    content: `SYSTEM SKILLS (Hermes Pattern):

NAMESPACE → KIEDY WSTRZYKIWANY:
  global     — zawsze (wszystkie zapytania)
  devtools   — gdy: kod, debug, TypeScript, plik, błąd, npm
  analytics  — gdy: analityka, statystyki, Umami, dashboard
  search     — gdy: szukaj, znajdź, indeks, Meilisearch
  media      — gdy: wideo, audio, Jellyfin, media
  finance    — gdy: finanse, faktura, płatności
  mybonzo    — gdy: mybonzo, ERP, CRM, MŚP
  blog       — gdy: blog, artykuł, SEO, treść

JAK DODAĆ NOWY SKILL:
  POST localhost:4224/skills/save
  { name, description, code, namespace, tags[] }

LUB przez seed:
  npx tsx skills/all-skills-seed.ts

WYSZUKIWANIE SEMANTYCZNE:
  POST localhost:4224/skills/search { query: "jak zrobić X" }
  → zwraca top-3 skills pasujących do zapytania`,
  },
];

for (const seed of archivalSeeds) {
  await memory.saveArchival(seed.content, seed.source, seed.tags);
  console.log(`  ✅ Archival: ${seed.source}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// AGENT SKILLS — named agents jako skills w global namespace
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n🤖 Seedowanie agent skills...\n');

const agentSkills = [
  {
    name: 'agent:code',
    namespace: 'devtools',
    description: 'Agent specjalizujący się w TypeScript/React/Electron — debugging, refaktoring, nowe komponenty',
    code: `## Agent: CODE

Specjalizacja: TypeScript, React 19, Electron, Vite, Node.js

PRIORYTETY:
1. Bezpieczeństwo — nie wprowadzaj XSS, injection, CSP issues
2. Typy — zawsze pełne TypeScript types, nie używaj 'any'
3. Minimalne zmiany — napraw co trzeba, nie refaktoryzuj reszty
4. Testy — sprawdź czy zmiana nie psuje innych części

NARZĘDZIA:
- Goose do edycji plików i uruchamiania build/test
- Ścieżka projektu: U:\\WWW_Zen_BRo_wser_org3

WZORZEC ODPOWIEDZI:
1. Zidentyfikuj problem (1 zdanie)
2. Rozwiązanie w bloku \`\`\`goose z dokładnymi instrukcjami
3. Wyjaśnienie zmian (opcjonalnie jeśli nieoczywiście)`,
  },
  {
    name: 'agent:blog',
    namespace: 'blog',
    description: 'Agent do tworzenia treści blogowych — artykuły, SEO, Cloudflare D1, mybonzoai',
    code: `## Agent: BLOG

Specjalizacja: content marketing, SEO, Astro, Cloudflare D1

BLOGI:
- mybonzoai.com — AI, technologia, produktywność (PL/EN)
- jimbo77.com   — dev tools, programowanie

FORMAT ARTYKUŁU:
- Tytuł: konkretny, keyword w tytule
- Meta description: 150-160 znaków
- Struktura: H2/H3, akapity max 3 zdania
- CTA na końcu

WORKFLOW:
1. Sprawdź skills namespace 'blog' — mogą być gotowe szablony
2. Napisz artykuł w markdown
3. Zapisz przez Goose do odpowiedniego katalogu
4. Opcjonalnie: Goose commit + deploy

D1 SCHEMA (jimbo-rag-db):
  posts(id, title, slug, content, tags, published_at)`,
  },
  {
    name: 'agent:search',
    namespace: 'search',
    description: 'Agent do wyszukiwania i analizy danych — Meilisearch, Sist2, analityka Umami/Plausible',
    code: `## Agent: SEARCH & ANALYTICS

Specjalizacja: Meilisearch, Sist2, Umami, Plausible, dane

SERWISY (gdy aktywne):
  Meilisearch: localhost:7700  — API: /indexes, /search
  Sist2:       localhost:4002  — indeks plików lokalnych
  Umami:       localhost:3001  — web analytics (ZENO)
  Plausible:   localhost:8000  — analytics mybonzo

WZORZEC WYSZUKIWANIA przez Goose:
  curl -s 'http://localhost:7700/indexes/docs/search' \\
    -H 'Content-Type: application/json' \\
    -d '{"q":"[query]","limit":5}'

ANALITYKA przez Umami API:
  curl -H 'x-umami-api-client-id: [id]' \\
    'http://localhost:3001/api/websites/[id]/stats'`,
  },
  {
    name: 'agent:devops',
    namespace: 'global',
    description: 'Agent do operacji infrastrukturalnych — Podman, deploy Cloudflare, git, npm',
    code: `## Agent: DEVOPS

Specjalizacja: Podman, Cloudflare deploy, git, Node.js ops

CHECKLISTY:

Deploy CF Pages:
  [ ] npm run build — sprawdź błędy
  [ ] wrangler deploy — lub git push → GitHub Actions
  [ ] Sprawdź logi: wrangler tail

Nowy kontener Podman:
  [ ] podman pull [image]
  [ ] podman run -d --name [nazwa] -p [port]:[port] [image]
  [ ] podman ps — weryfikacja

Git workflow:
  [ ] git status → git diff
  [ ] git add [pliki] (nie -A jeśli są sensytywne)
  [ ] git commit -m 'typ: opis'
  [ ] git push origin [branch]

NPM updates:
  [ ] npm outdated — co wymaga aktualizacji
  [ ] npm audit — bezpieczeństwo
  [ ] npm update [pakiet] — bezpieczna aktualizacja`,
  },
];

for (const agent of agentSkills) {
  // Sprawdź czy agent już istnieje
  const existing = await skills.search(agent.name, 1, 0.3, [agent.namespace]);
  const exactMatch = existing.find(s => s.name === agent.name);

  if (exactMatch) {
    console.log(`  ⏭  Skip (istnieje): ${agent.name}`);
    continue;
  }

  await skills.save({
    name:        agent.name,
    description: agent.description,
    code:        agent.code,
    tags:        ['agent', 'persona'],
    namespace:   agent.namespace,
  });
  console.log(`  ✅ Agent skill: ${agent.name} [${agent.namespace}]`);
}

console.log('\n✨ Seed zakończony. Zrestartuj HUB żeby core_memory weszła w życie.\n');
