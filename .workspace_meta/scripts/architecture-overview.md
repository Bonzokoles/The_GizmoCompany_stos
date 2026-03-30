# ZENO Browser — Architektura (2026-03-30)

> Wygenerowano na podstawie: context-map-20260330.md, src/ i src-electron/
> Autor: Execution Architect session 2026-03-30

---

## Przeglad

ZENO Browser to **centrum dowodzenia** dla ekosystemu aplikacji na Cloudflare.

- **Wersja Electron** (lokalna, pelna): pelne mozliwosci, terminal, plugins, Copilot SDK, security sandbox
- **Wersja Web** (zenonbrowsers.org, Cloudflare Pages): lzejsza, analiza i monitoring powiazanych aplikacji

---

## Wersja Electron (lokalna)

```
src-electron/
├── main.ts                      — IPC handlers (120+), window management, serwisy
├── preload.ts                   — contextBridge, ekspozycja window.electronAPI (300+ metod)
├── mcp-server.ts                — MCP Protocol HTTP/SSE (port 3847, 47 tools)
└── services/
    ├── browser-manager.ts       — tabs, nawigacja, URL validation (CR-001 fixed)
    ├── copilot-sdk-service.ts   — @github/copilot-sdk adapter
    ├── copilot-runtime-server.ts — CopilotKit Runtime HTTP (port 4111)
    ├── ai-gateway-service.ts    — deleguje do src/services/ai-gateway/
    ├── security-sandbox.ts      — plugin sandboxing (vm.runInNewContext)
    ├── auto-updater.ts          — electron-updater + electron-log
    ├── plugin-ipc-bridge.ts     — mostek IPC dla plugin systemu
    ├── network-monitor.ts       — statystyki sieci
    ├── network-manager.ts       — proxy, konfiguracja
    ├── crawler-service.ts       — web scraping
    ├── workflow-engine.ts       — automatyzacja zadan
    ├── sync-service.ts          — better-sqlite3, CMS, synchronizacja
    ├── catalog-service.ts       — lokalna biblioteka
    ├── knowledge-hub-service.ts — baza wiedzy
    ├── agents-creator-service.ts — kreator agentow
    ├── search-service.ts        — wyszukiwanie
    ├── meilisearch-service.ts   — MeiliSearch (indeks)
    ├── searxng-service.ts       — SearXNG meta-wyszukiwarka
    ├── websurfx-service.ts      — Websurfx
    ├── sist2-service.ts         — sist2 file indexer
    ├── tab-communication.ts     — komunikacja miedzy kartami
    └── umami-service.ts         — analytics (Umami)

src/
├── App.tsx                      — router: wykrywa window.electronAPI → BrowserUI | WebLanding
├── main.tsx                     — entry point React
├── components/
│   ├── browser-core/
│   │   ├── BrowserUI.tsx        — glowny layout (18 lazy imports, hotspot!)
│   │   ├── AddressBar.tsx       — pasek adresu (URL validation, useOptimistic)
│   │   ├── TabBar.tsx           — karty (React.memo, useDeferredValue)
│   │   ├── WebViewPanel.tsx     — WebView/iframe renderer
│   │   └── StartPage.tsx        — strona startowa nowej karty
│   ├── assistant/
│   │   ├── AssistantPage.tsx    — pelny BUCH_CHAT (system prompt, providers)
│   │   ├── BuchChatWidget.tsx   — floating chat widget
│   │   ├── JimboKitPanel.tsx    — REST+WebSocket → port 4111
│   │   └── JimboKitTerminal.tsx — terminal z komendami (/navigate, /search, etc.)
│   ├── ai/
│   │   ├── AIPanel.tsx          — prosty chat AI (useActionState streaming)
│   │   ├── AIGatewayPanel.tsx   — zaawansowany panel z metrykami
│   │   └── CopilotDevPanel.tsx  — UI dla Copilot SDK (wymaga @github/copilot CLI)
│   ├── plugins/
│   │   ├── PluginHub.tsx        — kontener dla Manager/Explorer/Installer
│   │   ├── PluginExplorer.tsx   — marketplace browser
│   │   ├── PluginInstaller.tsx  — instalacja wtyczek
│   │   └── PluginManager.tsx    — zarzadzanie zainstalowanymi
│   ├── analytics/
│   │   ├── AnalyticsPanel.tsx   — statystyki
│   │   └── SecurityMonitor.tsx  — real-time security (useSyncExternalStore)
│   ├── cloudflare/
│   │   └── CloudflareTunnelPanel.tsx — CF Tunnel management
│   ├── agents-creator/
│   │   └── AgentsCreatorPanel.tsx — kreator agentow AI
│   ├── knowledge-hub/
│   │   └── KnowledgeHubPanel.tsx — baza wiedzy
│   ├── tools/
│   │   └── CatalogBrowser.tsx   — przeglądarka biblioteki lokalnej
│   ├── common/
│   │   └── UpdateNotification.tsx — powiadomienie o aktualizacji
│   └── landing/
│       └── WebLanding.tsx       — strona glowna wersji web
├── services/
│   └── ai-gateway/
│       ├── index.ts             — glowny eksport (enabled: !!key?.trim())
│       ├── gateway.ts           — orchestrator z LRU cache i RateLimiter
│       └── providers/
│           ├── deepseek.ts      — DeepSeek API
│           ├── openrouter.ts    — OpenRouter API
│           └── edenai.ts        — EdenAI API
├── plugin-system/
│   ├── core/
│   │   ├── plugin-api.ts        — typy i interfejsy
│   │   ├── plugin-manager.ts    — orchestrator pluginow
│   │   ├── plugin-loader.ts     — ladowanie kodu (vm.runInNewContext — CR-003 fixed)
│   │   └── plugin-registry.ts  — rejestr
│   └── marketplace/
│       ├── marketplace-service.ts — HTTP axios client
│       └── auto-updater.ts      — autoupdate pluginow
├── hooks/
│   └── useJimboKitStore.ts      — Zustand store + WebSocket/REST fallback (port 4111)
├── store/                       — Zustand stores (chatBotStore, browserStore, pluginStore)
└── types/
    └── electron.d.ts            — typy window.electronAPI
```

---

## Wersja Web (zenonbrowsers.org)

```
Cloudflare Pages deployment
├── WebLanding.tsx               — glowna strona (renderowana gdy brak Electron)
├── AssistantPage.tsx            — pelny BUCH_CHAT
├── BuchChatWidget.tsx           — floating widget
└── /api/ai/chat                 — Cloudflare Worker (DeepSeek, OpenRouter, Claude, Workers AI)
```

---

## AI-Hub (/ai-hub/)

```
ai-hub/
├── index.html                   — standalone HTML (zero zaleznosci npm)
├── js/
│   ├── data/
│   │   ├── apps.js              — lista aplikacji ekosystemu CF
│   │   └── datasets/            — HuggingFace / Tavily datasets
│   └── modules/
│       ├── vchat.js             — inline chat
│       ├── skills.js            — skills system
│       ├── kb.js                — knowledge base
│       ├── jimbo.js             — jimbo agent integration
│       └── storage.js           — localStorage API
└── dataset-viewer/              — HuggingFace datasets viewer
```

---

## Ekosystem Cloudflare

```
zenonbrowsers.org                → Cloudflare Pages (ZENO Browser web)
  └── /api/ai/chat               → CF Worker (BUCH_CHAT endpoint)
  └── /api/storage/*, /api/db/*  → CF Management API (D1, R2, Queues)

bonzo-media-hub.stolarnia-ams.workers.dev → CF Worker (66 filmow + TMDB)

moa.mybonzo.com                  → CF Worker (Mixture-of-Agents pipeline)

Cloudflare Bindings:
  DB              → D1 SQLite database
  STATIC_ASSETS   → R2 Object Storage
  AI              → Workers AI (wbudowane modele LLM)
  AGENT_TASKS_QUEUE, IMAGE_GEN_QUEUE, IMAGE_PROC_QUEUE, VOICE_QUEUE → CF Queues
```

---

## Granice Electron (security model)

```
RENDERER PROCESS (src/)      — React, brak bezposredniego Node.js
         |
   contextBridge              — preload.ts (jedyna brama, 300+ metod)
         |
MAIN PROCESS (src-electron/)  — Node.js, IPC main, serwisy
```

Klucze zasady:
- Renderer NIE ma bezposredniego dostepu do Node.js (`nodeIntegration: false`)
- Komunikacja tylko przez `window.electronAPI.*` (zdefiniowane w preload.ts)
- Pluginy uruchamiane w `vm.runInNewContext` sandbox (nie maja dostepu do `require`)
- URL validation defense-in-depth: AddressBar.tsx + browser-manager.ts

---

## IPC Channels (skrot)

| Kategoria | Ilosc kanalow | Przykladowe |
|-----------|---------------|------------|
| browser:* | 8 | navigate, new-tab, close-tab, go-back |
| ai:* | 3 | execute, get-providers, get-metrics |
| plugin:* | 11 | load, unload, enable, disable, search-marketplace |
| terminal:* | 6 | execute, get-cwd, set-cwd, system-info |
| security:* | 2 | create-context, get-audit-logs |
| tunnel:* | 5 | status, metrics, reconnect |
| updater:* | 3 | check, install, progress |
| copilot:* | 3 | status, start, run-prompt |
| inne | 80+ | catalog, hub, ac, cms, sync, search, umami, theme, window... |
| **Lacznie** | **120+** | |

---

## Hotspoty (pliki wymagajace uwagi przy zmiannach)

| Plik | Ryzyko | Dlaczego |
|------|--------|----------|
| `src-electron/main.ts` | CRITICAL | 24 importy serwisow, 120+ IPC handlers, 1200+ linii |
| `src/components/browser-core/BrowserUI.tsx` | HIGH | 18 lazy importow, centralny hub UI |
| `src-electron/preload.ts` | HIGH | Security boundary, 300+ metod, nie ruszac bez rewizji |
| `src/services/ai-gateway/gateway.ts` | MEDIUM | Orchestrator providerow, cache, rate limiting |
| `src/plugin-system/core/plugin-manager.ts` | MEDIUM | Plugin lifecycle |

---

## Zalecenia (z context-map)

1. Podziel `main.ts` na `ipc-registry.ts` — 1200+ linii jest nieczytelne
2. Odsprzeg `BrowserUI` przez panel registry pattern
3. Dodaj testy integracyjne Playwright dla IPC flows
4. Dodaj rate limiting do 120+ kanalow IPC (obecnie brak)
5. Audit uprawnien pluginow — whitelist sprawdza tylko sciezke, nie capabilities
