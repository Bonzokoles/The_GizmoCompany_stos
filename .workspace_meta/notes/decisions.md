# Architecture Decision Records  ZENO Browser

> Dokumentuj tu każdą ważną decyzję techniczną.
> Format: data  kontekst  decyzja  konsekwencje

---

## Template

### ADR-XXX: [Tytuł decyzji]

**Data:** YYYY-MM-DD
**Status:** proposed | accepted | deprecated | superseded
**Kontekst:** Dlaczego ta decyzja jest potrzebna?
**Decyzja:** Co zostało zdecydowane?
**Konsekwencje:** Jakie są skutki tej decyzji?
**Alternatywy:** Co jeszcze było rozważane?

---

<!-- Dodawaj nowe decyzje poniżej -->

---

### ADR-001: Usunięcie Bielik i Ollama z projektu

**Data:** 2026-03-15
**Status:** accepted
**Kontekst:** Bielik (model AI) i Ollama (runtime) nie obsługują polskiego języka w wystarczającym stopniu.
**Decyzja:** Usunięto Bielik i Ollama. Zastąpiono: API  Gemini, OpenRouter (8 modeli), Claude (planowany). Kontenery  Gemma 2B (port 11434), Phi Nano 0.5B (port 11435).
**Konsekwencje:** Lokalne modele (Gemma, Phi) obsługują TYLKO terminal support. Główna praca AI przez modele API. Max 4B parametrów lokalnie.
**Alternatywy:** Dalsze używanie Ollama z fine-tuned modelami  odrzucone z powodu braku PL.

---

### ADR-002: Architektura Electron + Vite + React

**Data:** 2026-03-14
**Status:** accepted
**Kontekst:** Potrzeba desktopowej przeglądarki z wbudowanym AI, pluginami i bezpieczeństwem.
**Decyzja:** Electron 27 jako runtime, Vite 5 jako bundler/dev-server, React 18 jako UI framework, Zustand jako state management. Sandbox: contextIsolation + nodeIntegration:false.
**Konsekwencje:** Cross-platform desktop app. Electron daje dostęp do BrowserView/WebContents. Vite zapewnia szybki HMR.
**Alternatywy:** (1) Tauri  mniejszy rozmiar, ale limitowany API przeglądarki. (2) CEF (C++)  wydajność, ale złożoność developmentu.

---

### ADR-003: Konteneryzacja przez Podman zamiast Docker

**Data:** 2026-03-14
**Status:** accepted
**Kontekst:** Docker wymaga daemona i licencji komercyjnej. Podman jest rootless i kompatybilny z Docker Compose.
**Decyzja:** Podman v5.7.1 jako główny runtime kontenerów. Docker Compose działa przez docker-compose.exe (kompatybilność Podman).
**Konsekwencje:** Brak potrzeby Docker Desktop. Rootless = bezpieczniejszy. Kompatybilny z docker-compose.yml.
**Alternatywy:** Docker  wymaga daemon + licencja. Containerd  zbyt nisko-poziomowy.

---

### ADR-004: System pluginów z marketplace

**Data:** 2026-03-14
**Status:** accepted
**Kontekst:** Przeglądarka potrzebuje możliwości rozszerzania funkcjonalności przez użytkowników.
**Decyzja:** Wbudowany plugin system (src/plugin-system/) z core engine i marketplace. PluginExplorer, PluginInstaller, PluginManager jako komponenty React.
**Konsekwencje:** Modularność, łatwość dodawania nowych funkcji. Wymaga sandbox security dla pluginów.
**Alternatywy:** (1) Chrome Extensions API — wymaga Chromium fork. (2) Brak pluginów — ogranicza użyteczność

---

### ADR-005: Migracja React 18 → 19 + konsolidacja komponentów

**Data:** 2026-03-20
**Status:** accepted
**Kontekst:** Komponenty używały wzorców React 18 (React.FC, untyped window.electronAPI via `(window as any)`, brak ARIA, blokujące `confirm()`). 7 komponentów miało problemy z bezpieczeństwem i dostępnością.
**Decyzja:**

1. Utworzono `src/types/electron.d.ts` — globalne typy dla `window.electronAPI` (eliminacja `as any`)
2. Utworzono `src/components/ErrorBoundary.tsx` — class component z polskim UI
3. Zrefaktoryzowano 7 komponentów na wzorce React 19: function components (nie React.FC), useCallback, useTransition (AIPanel), lazy/Suspense (BrowserUI), memo (TabBar)
4. Skonsolidowano PluginManager + PluginExplorer + PluginInstaller → **PluginHub.tsx** (jedna karta, inline confirm)
5. Dodano ARIA: role, aria-label, aria-pressed, aria-selected, tablist, progressbar
6. Zabezpieczenia: sanitizeUrl() w AddressBar (blokuje javascript:/data:/file:), useRef dla interwałów, typed API
**Konsekwencje:** Eliminacja 3 plików (PluginExplorer, PluginInstaller, PluginManager) na rzecz jednego PluginHub. Wszystkie floating panels lazy-loaded. Typed IPC bridge. Pełna dostępność ARIA.
**Alternatywy:** (1) Czekanie na oficjalne React 19 stable — odrzucone, wzorce są kompatybilne. (2) Zostawienie osobnych komponentów pluginów — odrzucone, powodowało duplikację kodu.

---

### ADR-006: MCP Connection — VS Code + Claude (Anthropic)

**Data:** 2026-03-19
**Status:** accepted
**Kontekst:** Potrzeba integracji MCP między VS Code (Copilot), aplikacją ZENO Browser, i Claude API (Anthropic). Klucze API przechowywane lokalnie w `.workspace_meta/secrets/api-keys.md`.
**Decyzja:**
1. `.vscode/mcp.json` — konfiguracja 5 MCP serwerów (zeno-browser-mcp, github, filesystem, fetch, memory) z referencjami `${env:VAR}`
2. `.env` — lokalne zmienne środowiskowe (gitignored), sync ze secrets via `scripts/sync-env.ps1`
3. `src-electron/mcp-server/tools/ai-tools.ts` — 4 nowe narzędzia MCP: `claude_chat`, `claude_analyze_page`, `claude_translate`, `claude_summarize`
4. `dotenv/config` w `main.ts` — automatyczne ładowanie .env w Electron
5. Zmienne ustawione jako User Environment Variables Windows → dostępne dla VS Code MCP serwerów
**Konsekwencje:** MCP serwery w VS Code mają dostęp do kluczy API. ZENO Browser może wywoływać Claude API przez narzędzia MCP. Klucze nigdy nie są commitowane (`.env` + `.vscode/mcp.json` w .gitignore).
**Alternatywy:** (1) Hardcoded klucze — odrzucone ze względów bezpieczeństwa. (2) Vault/KeyChain — nadmiarowe na tym etapie. (3) Input prompts — odrzucone, użytkownik nie chce wpisywać kluczy manualnie.

---

### ADR-007: Weft Self-Hosted + LinkedOut-style Pipelines

**Data:** 2026-03-27
**Status:** accepted
**Kontekst:** Dashboard potrzebuje rozbudowy analytics o event streaming (pipelines) wzorem LinkedOut CF project. Weft (CF Workers AI task board) przydatny jako osobna instancja do zarządzania agentami.
**Decyzja:**
1. **Weft** — Osobna instancja CF Workers (`weft.mybonzo.com`). Docs: `docs/WEFT_SETUP.md`, automation: `scripts/setup-weft.ps1`. Wymaga DO, Workflows, D1, AI Gateway.
2. **Pipelines** — Nowy Worker `functions/api/pipelines/[[path]].ts` (6 endpoints, 7 pipeline configs). LinkedOut architektura: Event Source → CF Worker → D1 → R2 Data Catalog (Iceberg) → R2 SQL.
3. **Dashboard tab** — 11. tab "Pipelines" w WebLanding.tsx: stats grid, pipeline cards, data flow visualization, events table, ingest form.
**Konsekwencje:** Dashboard ma 11 tabów i 14 API services. Pipelines daje real-time event analytics. Weft jest niezależny od ZENO (osobny deployment).
**Alternatywy:** (1) Umami analytics tylko — za mało granularności. (2) Własny event system od zera — zbyt dużo pracy. (3) Weft jako moduł w ZENO — odrzucone, lepiej osobna instancja.

---

### ADR-008: Oort Outer Shell (O.O.S.) — 7-warstwowa architektura przeglądarki

**Data:** 2026-04-07
**Status:** accepted
**Kontekst:**
ZENO Browser rośnie ponad przeglądarkę: ma agentów AI (JIMBO, BUCH), plugin system, lokalne narzędzia (JIMBO_KIT port 4111), chmurę (CF Workers/D1/R2), lokalną bazę wiedzy (ChromaDB) i warstwę bezpieczeństwa. Brakuje modelu mentalnego, który opisuje jak te warstwy ze sobą współpracują i gdzie leżą granice odpowiedzialności. Refaktoryzacja BrowserUI.tsx (545 → 331 linii, Step_02) odsłoniła potrzebę formalnej architektury powłoki.

**Decyzja:**
Przyjęto 7-warstwowy model **Oort Outer Shell**:

```
┌─────────────────────────────────────────────────────┐
│  1. Outer Shell      — BrowserUI (React, Electron)  │
│     Toolbar, PanelHost, QuickNav, TabBar, StatusBar │
├─────────────────────────────────────────────────────┤
│  2. Secure Boundary  — contextIsolation + preload   │
│     sanitizeUrl(), typed electronAPI bridge,         │
│     CSP headers, sandbox per-panel                  │
├─────────────────────────────────────────────────────┤
│  3. Runtime Core     — Electron main process        │
│     WebContents, BrowserView, IPC handlers,          │
│     session/partition, update manager               │
├─────────────────────────────────────────────────────┤
│  4. Agentic Layer    — JIMBO_KIT (port 4111) +      │
│     JIMBO Agent HUB (port 4224) + BUCH              │
│     30 tools, RAG, streaming chat, OpenRouter       │
├─────────────────────────────────────────────────────┤
│  5. Plugin Shell     — PluginHub + plugin-system/   │
│     Marketplace, sandboxed execution, capabilities  │
├─────────────────────────────────────────────────────┤
│  6. Cloud Shell      — CF Workers + D1 + R2 + Pages │
│     zeno-mcp (23 tools), AI Gateway, Pipelines,     │
│     Weft, BONZO Media Hub                           │
├─────────────────────────────────────────────────────┤
│  7. Memory Fabric    — ChromaDB (RAG) + SQLite HUB  │
│     + MeiliSearch + JIMBO memory (core/archival)    │
│     + Cloudflare KV                                 │
└─────────────────────────────────────────────────────┘
```

Każda warstwa komunikuje się tylko z warstwą sąsiednią (lub przez zdefiniowane API pomosty). Warstwa 1 (Outer Shell) jest świadoma wyłącznie `PanelId` i `PanelContext` — nie zna implementacji paneli. Warstwa 4 (Agentic) jest świadoma narzędzi (tools) i modeli, ale nie zna UI. Warstwa 6 (Cloud) jest bezstanowa per-request.

**Implementacja krokowa (zgodna z Step_01–05):**
- ✅ **Step_01** — cleanup CopilotKit, martwy CSS, vendor stuby
- ✅ **Step_02** — Outer Shell refaktor: `shell.types.ts` + `panel-registry.tsx` + `PanelHost.tsx` → BrowserUI 545→331 linii
- 🔜 **Step_03** — Secure Boundary: preload namespaces (3–5 dni, ryzykowne — osobna sesja)
- 🔜 **Step_04** — Runtime Core modularizacja: wydzielenie `main/ipc-handlers.ts`, `main/session-manager.ts`
- 🔜 **Step_05** — Plugin Shell: capabilities API, sandboxed execution, plugin-to-agent bridge

**Konsekwencje:**
- Nowe panele dodaje się wyłącznie w `panel-registry.tsx` (1 wpis)
- Nowe narzędzia AI dodaje się w `tools/` JIMBO_KIT (1 plik)
- Nowe endpointy chmury dodaje się w `functions/api/` CF Workers
- Każda warstwa może być testowana w izolacji
- Step_03 (preload) jest flagowany jako HIGH RISK — wymaga osobnej sesji z pełnym testem IPC

**Alternatywy:**
1. **Monolityczna architektura** — wszystko w BrowserUI.tsx i main.ts — odrzucone, już powodowało 545-liniowe pliki
2. **Micro-frontend (moduły federacyjne)** — zbyt duże narzuty dla Electron app
3. **Bez formalnej architektury** — odrzucone: projekt zbyt duży żeby rozwijać intuicyjnie
