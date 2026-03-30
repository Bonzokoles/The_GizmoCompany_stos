# ZENO Browser — Cloudflare Services Map

> Zaktualizowano: 2026-03-30
> Zrodla: wrangler.toml, docs/CLOUDFLARE_SECRETS_SETUP.md, docs/AI_GATEWAY_SETUP.md, Cloudflare API (pelne dane)

---

## Konta Cloudflare (2 konta)

| # | Email                         | Account ID                         | Zalozono              |
|---|-------------------------------|------------------------------------|-----------------------|
| 1 | `Stolarnia.ams@gmail.com`     | `7f490d58a478c6baccb0ae01ea1d87c3` | 2025-06-01            |
| 2 | `Lissonkarol.msa@gmail.com`   | `b15500841302bd1bf5842672c42b2f1b` | 2025-03-14 (glowne)   |

---

## Cloudflare Pages

| Projekt | URL | Opis |
|---------|-----|------|
| `zeno-browser-web` | zenonbrowsers.org | ZENO Browser — wersja web (WebLanding + BUCH_CHAT) |

**Deployment:** GitHub Actions → `deploy-web.yml` → `wrangler pages deploy`
**Build command:** `npm run build:web`
**Output dir:** `dist/`

### Zmienne runtime (ustawiaj w CF Pages → Settings → Variables):
- `OPENROUTER_API_KEY`
- `DEEPSEEK_API_KEY`
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `GEMINI_API_KEY`
- `TOGETHER_API_KEY`
- `PERPLEXITY_API_KEY`
- `TMDB_API_KEY` / `TMDB_READ_TOKEN`
- `ADMIN_TOKEN`
- `WEBGATE_SECRET`
- `UMAMI_SITE_ID`

---

## Cloudflare Workers (45 workerow)

### Powiazane z ZENO / glownym projektem

| Worker | Ostatnia modyfikacja | Rola |
| ------ | -------------------- | ---- |
| `bonzo-media-hub` | 2026-03-30 | BONZO Media Hub — glowny worker (66 filmow + TMDB) |
| `bonzo-media-hub-proxy` | 2026-03-29 | Proxy dla Media Hub |
| `zeno-mcp` | 2026-03-27 | ZENO MCP server (47 narzedzi) |
| `zeno-queue-consumer` | 2026-03-20 | Consumer kolejki ZENO |
| `zeno-browser-bridge-production` | 2026-02-09 | Bridge przegladarka ↔ CF |
| `zeno-bielik-agents` | 2025-11-12 | Agenci Bielik |
| `zeno-iframe-proxy` | 2025-11-05 | Proxy iframe |

### Jimbo / Community

| Worker | Ostatnia modyfikacja | Rola |
| ------ | -------------------- | ---- |
| `jimbo-gateway` | 2026-03-24 | Gateway AI |
| `jimbo77-community` | 2026-03-13 | Community |
| `jimbo77-social-club-api` | 2026-03-12 | Social API |
| `jimbo77-agents-orchestrator` | 2026-02-09 | Orchestrator agentow |
| `the-jimbo77com-nxt` | 2026-03-20 | Next.js strona jimbo77.com |

### AI / MOA / Content

| Worker | Ostatnia modyfikacja | Rola |
| ------ | -------------------- | ---- |
| `moa-orchestrator` | 2026-02-19 | MOA Pipeline orchestrator (moa.mybonzo.com) |
| `mybonzo-ai-workflow` | 2026-03-23 | AI Workflow |
| `zen-deepseek-gateway` | 2026-02-02 | DeepSeek gateway |
| `ai-content-creator` | 2026-02-19 | Generator tresci |
| `mybonzo-main-chat` | 2025-09-10 | Glowny chat mybonzo |
| `voice-ai-worker` | 2025-09-21 | Voice AI |
| `agent-zero-bridge-production` | 2026-02-09 | Bridge agenta |

### Endpointy aplikacji (Pages Functions / Worker routes)

| Sciezka | Opis |
|---------|------|
| `zenonbrowsers.org/api/ai/chat` | BUCH_CHAT — DeepSeek, OpenRouter, Claude, Workers AI |
| `/api/storage/*` | Zarzadzanie storage (wymaga CF_API_TOKEN) |
| `/api/db/*` | Operacje bazodanowe |
| `/api/crawlers/history` | Historia crawlerow |
| `/api/render/*` | Renderowanie |
| `/api/images/*` | Generowanie obrazow |

---

## D1 Databases (8 baz)

| Baza | Rozmiar | Rola |
| ---- | ------- | ---- |
| `bonzo-media-hub-db` | 60 KB | Media Hub — filmy |
| **`zeno-browser-db`** | **11 MB** | ZENO Browser — glowna baza aplikacji |
| `jimbo77-community-db` | 77 KB | Community |
| `jimbo77-social-db` | 148 KB | Social club |
| `mybonzo` | 2.3 MB | Mybonzo glowna |
| **`pumo-db`** | **54 MB** | Pumo — najwieksza baza |
| `pumo_products` | 11 MB | Pumo — produkty |
| `jimbo-rag-db` | 2.2 MB | RAG baza wiedzy |

Binding w wrangler.toml: `DB` → `zeno-browser-db`
Operacje przez `/api/db/*` endpointy.

---

## R2 Buckets (16 bucketow)

| Bucket | Utworzony | Cel |
| ------ | --------- | --- |
| `bonzo-media-hub` | 2026-03-28 | Media Hub — filmy, plakaty |
| `jimbo77-community-images` | 2026-03-10 | Jimbo77 — obrazy community |
| `jimbo77com-assets` | 2026-03-13 | Jimbo77 — statyczne assety |
| `my-project-opennext-cache` | 2026-03-27 | OpenNext cache |
| `mybonzo-ai-models` | 2025-09-04 | Modele AI |
| `mybonzo-analytics` | 2026-03-12 | Dane analityczne |
| `mybonzo-backups` | 2025-09-04 | Backupy |
| `mybonzo-blog-content` | 2025-10-26 | Tresci bloga |
| `mybonzo-finanse` | 2026-03-03 | Dane finansowe |
| `mybonzo-media` | 2025-10-28 | Media ogolne |
| `mybonzo-storage` | 2025-09-11 | Ogolne storage |
| `mybonzo-videos` | 2025-10-25 | Wideo |
| `pumo-raw-data` | 2026-01-10 | Pumo — surowe dane |
| `vibesdk-templates` | 2025-10-10 | VibeSdk — szablony |
| `zen-blog-images` | 2026-02-03 | ZENO — obrazy bloga |
| `zen-static-assets` | 2026-02-02 | ZENO — statyczne assety |

Binding w wrangler.toml: `STATIC_ASSETS` → `zen-static-assets`
Operacje przez `/api/storage/*` endpointy.

---

## KV Namespaces (20)

| Namespace | Rola |
| --------- | ---- |
| `SESSION` / `SESSION_preview` | Sesje uzytkownikow |
| `AGENTS` | Stan agentow |
| `MYBONZO_SESSIONS` | Sesje mybonzo |
| `EDGE_CACHE` / `CACHE_preview` | Cache na edge |
| `ai-models` | Modele AI |
| `IMAGES` | Obrazy |
| `MYBONZO_SECURITY_LOGS` | Logi bezpieczenstwa |
| `zenonvibesdk` / `vibesdk_mybonzo` | VibeSdk |
| `polaczek-knowledge-base` | Baza wiedzy |

---

## Queues

| Binding | Opis | Status |
|---------|------|--------|
| `AGENT_TASKS_QUEUE` | Kolejka zadan agentow AI | Aktywna |
| `IMAGE_GEN_QUEUE` | Kolejka generowania obrazow | Aktywna |
| `IMAGE_PROC_QUEUE` | Kolejka przetwarzania obrazow | Aktywna |
| `VOICE_QUEUE` | Kolejka syntezy mowy | Aktywna |

Worker konsumujacy: `zeno-queue-consumer`

---

## Workers AI

| Binding | Opis |
|---------|------|
| `AI` | Workers AI runtime — modele wbudowane w CF edge |

Uzywane jako fallback w `/api/ai/chat` gdy zewnetrzne providery SA niedostepne.

---

## AI-Hub

| Lokalizacja | Opis |
|-------------|------|
| `ai-hub/` | Standalone HTML — zero zaleznosci |
| `ai-hub/index.html` | Glowny dashboard |
| `ai-hub/js/data/apps.js` | Lista aplikacji ekosystemu |
| `ai-hub/js/modules/` | vchat, skills, kb, jimbo, storage |
| `ai-hub/dataset-viewer/` | HuggingFace datasets viewer |

AI-Hub jest deployowane razem z Pages lub jako osobny static site.

---

## Storage Browser — jak przegladac

### Przez ZENO Browser (Electron)

- IPC: `cloudflare/r2_list_objects` → wywolaj z `JimboKitPanel`
- Bezposrednio przez MCP server (`zeno-mcp` worker)

### Przez AI-Hub (web)

- Planowany modul `storage.js` (Task 3 z poprzedniej sesji)
- Wymaga backendu: `GET /api/r2/{bucket}/list`

---

## GitHub Actions / CI/CD

| Workflow | Plik | Opis |
|----------|------|------|
| Deploy Web | `.github/workflows/deploy-web.yml` | Deploy Pages przy pushu na main |

### Sekrety wymagane w repozytorium GitHub:
- `CLOUDFLARE_API_TOKEN` — autoryzacja wrangler CLI
- `CLOUDFLARE_ACCOUNT_ID` — identyfikator konta CF (glowne: `b15500841302bd1bf5842672c42b2f1b`)

---

## Lokalne zmienne / .dev.vars

Do `wrangler pages dev` uzyj `.dev.vars` (generowany przez `scripts/sync-env.ps1`).
Dla lokalnej aplikacji Electron uzyj `.env.local`.

---

## Powiazania miedzy serwisami

```
zenonbrowsers.org (CF Pages: zeno-browser-web)
  └── /api/ai/chat → BUCH_CHAT: DeepSeek, OpenRouter, Claude, Workers AI
  └── WebLanding.tsx → BUCH_CHAT widget (inline vchat)
  └── /ai-hub/ → AI Dashboard (storage, vchat, skills, kb)
  └── D1: zeno-browser-db (11 MB) — glowna baza
  └── R2: zen-static-assets, zen-blog-images

bonzo-media-hub.stolarnia-ams.workers.dev
  └── 66 filmow + recenzje TMDB
  └── D1: bonzo-media-hub-db | R2: bonzo-media-hub
  └── Worker proxy: bonzo-media-hub-proxy

ZENO MCP (zeno-mcp worker)
  └── 47 narzedzi / tools
  └── Lokalna aplikacja Electron → Port 3847

jimbo77.com (the-jimbo77com-nxt)
  └── jimbo-gateway → jimbo77-agents-orchestrator
  └── D1: jimbo77-community-db, jimbo77-social-db, jimbo-rag-db
  └── R2: jimbo77-community-images, jimbo77com-assets

moa.mybonzo.com (moa-orchestrator)
  └── Mixture-of-Agents: orkiestracja modeli LLM
  └── mybonzo-ai-workflow, ai-content-creator
  └── D1: mybonzo (2.3 MB) | R2: mybonzo-*, mybonzo-videos

pumo.* (pumo-raw-data bucket)
  └── D1: pumo-db (54 MB — najwieksza), pumo_products (11 MB)

ZENO Electron (lokalna aplikacja)
  └── Port 4111: CopilotKit Runtime (JimboKit)
  └── Port 3847: MCP Server (47 tools) → zeno-mcp worker
  └── IPC: cloudflare/r2_list_objects → JimboKitPanel
  └── Laczy sie z ww. serwisami przez HTTP/IPC
```
