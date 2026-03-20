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
