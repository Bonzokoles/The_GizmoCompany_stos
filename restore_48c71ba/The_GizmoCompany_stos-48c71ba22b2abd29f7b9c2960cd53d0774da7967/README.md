# ZENO Browser

> AI-powered web browser built with Electron, React and Cloudflare

[![Tests](https://img.shields.io/github/actions/workflow/status/Bonzokoles/The_GizmoCompany_stos/test.yml?label=tests)](https://github.com/Bonzokoles/The_GizmoCompany_stos/actions/workflows/test.yml)
[![Version](https://img.shields.io/badge/version-0.1.0-blue)](package.json)
[![License](https://img.shields.io/badge/license-MIT-green)](#licencja)

ZENO Browser to nowoczesna przeglądarka desktopowa (Electron) z wbudowanym asystentem AI, obsługą protokołu MCP (Model Context Protocol), tunelami Cloudflare, pełnotekstowym wyszukiwaniem i systemem pluginów.

---

## Spis treści

- [Funkcje](#funkcje)
- [Stack technologiczny](#stack-technologiczny)
- [Szybki start](#szybki-start)
- [Zmienne środowiskowe](#zmienne-środowiskowe)
- [Tryby uruchomienia](#tryby-uruchomienia)
- [Skrypty npm](#skrypty-npm)
- [Struktura projektu](#struktura-projektu)
- [Testowanie](#testowanie)
- [Kontenery (Podman/Docker)](#kontenery-podmandocker)
- [Deploy na Cloudflare Pages](#deploy-na-cloudflare-pages)
- [Architektura AI](#architektura-ai)

---

## Funkcje

| Funkcja | Opis |
|---------|------|
| **AI Chat** | Wbudowany asystent AI — rozmowy, analizy stron, automatyzacja |
| **Multi-provider AI** | Gateway z fallbackiem: DeepSeek → OpenRouter → EdenAI → OpenAI/Anthropic |
| **MCP Server** | Wbudowany serwer Model Context Protocol — integracja z Claude Desktop, VS Code Copilot i innymi klientami AI |
| **Cloudflare Tunnel** | Ekspozycja lokalnego serwera przez tunel Cloudflare bez portforward |
| **Full-text Search** | MeiliSearch + Websurfx meta-search engine (historia, zakładki, dokumenty) |
| **System pluginów** | Instalacja, zarządzanie i tworzenie własnych rozszerzeń |
| **Wbudowany terminal** | Terminal dostępny bezpośrednio z interfejsu przeglądarki |
| **Analityka** | Self-hosted: Umami + Plausible (bez śledzenia/cookies) |
| **Security Sandbox** | Izolacja WebContent — oddzielne konteksty dla niezaufanych stron |
| **Auto-aktualizacje** | electron-updater — powiadomienia i one-click update |
| **Dual-mode iframe** | Normalny i sandbox mode dla embeddowanych stron |
| **Indeksowanie dokumentów** | sist2 — pełnotekstowy indeks plików lokalnych i archiwów |

---

## Stack technologiczny

### Frontend
- **React 19** + TypeScript 5.3
- **Vite 5** (bundler + dev server)
- **Zustand 4** (zarządzanie stanem)

### Desktop
- **Electron 27** (main process)
- **electron-builder 24** (instalatory: NSIS/Windows, DMG/macOS, AppImage/Linux)
- **electron-updater 6** (auto-aktualizacje)
- **better-sqlite3** (lokalna baza danych)

### AI & Integracje
- **`@modelcontextprotocol/sdk`** — wbudowany MCP Server
- **`agents` (Cloudflare Agents SDK)** — agenty AI
- **`@cloudflare/tanstack-ai`** — Cloudflare AI bridge
- **`workers-ai-provider`** — Cloudflare Workers AI
- **AI Gateway** z obsługą providerów: DeepSeek, OpenRouter, EdenAI, OpenAI, Anthropic

### Testowanie
- **Jest 29** + **@testing-library/react** (unit testy)
- **Playwright 1.40** (E2E testy)

### Infrastruktura
- **Podman** / Docker Compose (lokalna orkiestracja kontenerów)
- **Cloudflare Pages + Workers + Wrangler** (deploy webowy)
- **MeiliSearch** (full-text search)
- **Umami + Plausible** (self-hosted analityka)

---

## Szybki start

### Wymagania

- **Node.js 20+**
- **npm 10+**
- **Git**
- Opcjonalnie: **Podman** v5+ lub Docker (dla kontenerów)

### Instalacja

```bash
# Sklonuj repo
git clone https://github.com/Bonzokoles/The_GizmoCompany_stos.git
cd The_GizmoCompany_stos

# Zainstaluj zależności
npm install

# Utwórz plik zmiennych środowiskowych
cp .env.example .env.local   # lub utwórz ręcznie (patrz sekcja niżej)
```

### Uruchomienie w trybie dev

```bash
npm run dev
```

Uruchamia Vite (port `5173`) i Electron jednocześnie.

---

## Zmienne środowiskowe

Utwórz plik `.env.local` w katalogu głównym projektu:

```env
# === AI Providers (wymagane) ===
DEEPSEEK_API_KEY=sk-...
OPENROUTER_API_KEY=sk-or-...

# === AI Providers (opcjonalne) ===
EDENAI_API_KEY=...
OPENAI_API_KEY=sk-...        # tylko gdy USE_CLASSIC_AI=true
ANTHROPIC_API_KEY=sk-ant-... # tylko gdy USE_CLASSIC_AI=true

# === Cloudflare (opcjonalne) ===
CF_TUNNEL_TOKEN=...

# === Flagi ===
USE_CLASSIC_AI=false  # true = włącza OpenAI i Anthropic jako providery
```

**Minimalna konfiguracja** do działania AI: `DEEPSEEK_API_KEY` lub `OPENROUTER_API_KEY`.

---

## Tryby uruchomienia

### 1. Tryb Electron (desktopowy)

```bash
npm run dev         # dev (hot-reload)
npm run build       # build produkcyjny
npm run dist        # build + pakowanie instalatora
```

### 2. Tryb webowy (Cloudflare Pages)

```bash
npm run dev:web     # lokalny dev na porcie 8788
npm run deploy:web  # deploy na Cloudflare Pages
```

### 3. Kontenery (Podman/Docker)

```bash
# Development
podman-compose -f podman-compose.yml up zeno-browser-dev

# Produkcja + wszystkie serwisy
podman-compose -f podman-compose.yml up
```

---

## Skrypty npm

| Skrypt | Opis |
|--------|------|
| `dev` | Dev: Vite + Electron razem |
| `dev:vite` | Tylko frontend (port 5173) |
| `dev:electron` | Tylko Electron |
| `dev:web` | Wrangler Pages local dev (port 8788) |
| `build` | Full build (Vite + TypeScript Electron) |
| `build:vite` | Tylko build frontendu |
| `build:web` | Build wersji webowej |
| `deploy:web` | Build + deploy na Cloudflare Pages |
| `dist` | Build + pakowanie instalatorów |
| `studio` | Localflare — lokalny dashboard D1/KV/R2/DO |
| `type-check` | TypeScript — sprawdzenie typów |
| `lint` / `lint:fix` | ESLint |
| `format` | Prettier |
| `test` | Wszystkie testy |
| `test:unit` | Jest (unit testy + coverage) |
| `test:e2e` | Playwright (E2E) |
| `test:watch` | Jest w trybie watch |
| `clean` | Usuwa `dist/`, `dist-electron/`, `coverage/` |

---

## Struktura projektu

```
zeno-browser/
├── src/                          # React frontend
│   ├── components/               # Komponenty UI
│   │   ├── AddressBar.tsx        # Pasek adresu URL
│   │   ├── AIPanel.tsx           # Panel asystenta AI
│   │   ├── BrowserUI.tsx         # Główny layout przeglądarki
│   │   ├── TabBar.tsx            # Pasek zakładek
│   │   ├── SearchPanel.tsx       # Wyszukiwarka (MeiliSearch + Websurfx)
│   │   ├── PluginManager.tsx     # Zarządzanie pluginami
│   │   ├── SecurityMonitor.tsx   # Monitor bezpieczeństwa
│   │   ├── CloudflareTunnelPanel # Konfiguracja tunelu CF
│   │   ├── TerminalPanel.tsx     # Wbudowany terminal
│   │   └── ...                   # 20+ komponentów
│   ├── services/
│   │   └── ai-gateway/           # Multi-provider AI Gateway
│   │       ├── gateway.ts        # Router z fallbackiem
│   │       └── providers/        # DeepSeek, OpenRouter, EdenAI
│   └── plugin-system/            # System pluginów (core + marketplace)
│
├── src-electron/                 # Electron main process
│   ├── main.ts                   # Entry point Electron + MCP Server
│   ├── preload.ts                # Preload script (IPC bridge)
│   └── services/                 # Serwisy głównego procesu
│       ├── ai-gateway-service.ts # AI routing
│       ├── browser-manager.ts    # Zarządzanie oknami
│       ├── meilisearch-service.ts# Full-text search
│       ├── cloudflare-tunnel.ts  # CF Tunnel
│       ├── security-sandbox.ts   # Izolacja WebContent
│       ├── workflow-engine.ts    # Automatyzacja AI
│       └── ...                   # 18+ serwisów
│
├── test/
│   └── e2e/
│       └── app.spec.ts           # Playwright E2E tests
│
├── .github/
│   └── workflows/
│       └── test.yml              # CI: testy + lint + security
│
├── config/
│   └── ai-gateway.yml            # Konfiguracja AI Gateway
│
├── docs/                         # Dokumentacja
│   ├── ELECTRON_SETUP.md
│   ├── PLUGIN_SYSTEM.md
│   ├── AI_GATEWAY_SETUP.md
│   └── CLOUDFLARE_TUNNEL_SETUP.md
│
├── scripts/                      # Skrypty pomocnicze
├── website/                      # Strona dokumentacyjna (Docusaurus)
├── docker-compose.yml            # Docker Compose
├── podman-compose.yml            # Podman Compose (zalecany)
├── playwright.config.ts          # Konfiguracja E2E
└── vite.config.ts                # Konfiguracja Vite
```

---

## Testowanie

### Unit testy (Jest)

```bash
npm run test:unit       # uruchom raz
npm run test:watch      # tryb watch
npm run test:coverage   # z raportem pokrycia
```

### E2E testy (Playwright)

```bash
npm run build:vite      # zbuduj frontend
npm run test:e2e        # uruchom testy (automatycznie startuje vite preview)
```

Raporty HTML: `playwright-report/index.html`

### CI Pipeline

Każdy push na `main`/`develop` uruchamia:
- **test** — type-check, lint, unit testy, coverage (ubuntu-latest)
- **e2e** — Playwright na Chromium (ubuntu-22.04, z webServer)
- **security** — `npm audit` + Snyk

---

## Kontenery (Podman/Docker)

Projekt zawiera pełen stack kontenerowy do lokalnego developmentu.

### Dostępne serwisy

| Serwis | Port | Opis |
|--------|------|------|
| `zeno-browser` | 3000 | Aplikacja (produkcja) |
| `zeno-browser-dev` | 5173 | Aplikacja (dev + hot-reload) |
| `meilisearch` | 7700 | Full-text search |
| `websurfx` | 8888 | Meta search engine |
| `sist2` | 4090, 8085 | Indekser dokumentów |
| `umami` | 5183 | Analityka webowa |
| `plausible` | 8100 | Privacy-friendly analityka |

### Uruchomienie

```bash
# Wszystkie serwisy
podman-compose up

# Tylko dev z hot-reload
podman-compose up zeno-browser-dev

# Tylko serwisy pomocnicze (bez przeglądarki)
podman-compose up meilisearch websurfx umami
```

---

## Deploy na Cloudflare Pages

```bash
# Zaloguj się do Cloudflare
npx wrangler login

# Deploy
npm run deploy:web
```

Aplikacja webowa (bez Electron) jest dostępna jako Cloudflare Pages.  
Wbudowany MCP Server i AI Gateway działają jako Cloudflare Workers.

---

## Architektura AI

ZENO Browser używa wielopoziomowego AI Gateway z automatycznym fallbackiem:

```
Zapytanie użytkownika
        │
        ▼
  AI Gateway Router
        │
        ├─► DeepSeek (priorytet 1, najszybszy)
        │
        ├─► OpenRouter (priorytet 2, 8+ modeli)
        │      ├─ Meta Llama 3.1 70B
        │      ├─ Mistral 7B
        │      ├─ Qwen 2.5 72B
        │      └─ ...
        │
        ├─► EdenAI (priorytet 3, multi-modal)
        │
        └─► OpenAI / Anthropic (opcjonalne, gdy USE_CLASSIC_AI=true)
```

### MCP Server (Model Context Protocol)

Wbudowany serwer MCP uruchamiany w procesie Electron pozwala zewnętrznym klientom AI połączyć się z przeglądarką:

- **Claude Desktop** — bezpośrednie sterowanie przeglądarką
- **VS Code GitHub Copilot** — narzędzia webowe z poziomu edytora
- **Inne klienty MCP** — przez standardowy protokół SSE/stdio

---

## Licencja

MIT — szczegóły w pliku [LICENSE](LICENSE).
