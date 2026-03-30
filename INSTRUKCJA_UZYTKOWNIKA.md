# ZENO Browser — Instrukcja Uzytkownika

> Zaktualizowano: 2026-03-30

---

## Czym jest ZENO Browser?

ZENO Browser to **centrum dowodzenia** dla ekosystemu aplikacji na Cloudflare. Wystepuje w dwoch wersjach:

- **Wersja Electron** (lokalna, pelna) — przeglądarka z terminalem, pluginami, Copilot SDK, security sandbox i pelnym AI Gateway
- **Wersja Web** (zenonbrowsers.org) — lzejsza wersja do analizy i monitoringu, z BUCH_CHAT asystentem

---

## Architektura systemu

```text
ZENO Browser
├── Wersja Electron (lokalna)
│   ├── src-electron/ — main process (Node.js, IPC, serwisy)
│   ├── src/ — renderer (React 19, Vite)
│   └── Porty: Vite:5173, MCP:3847, JimboKit:4111
│
└── Wersja Web (zenonbrowsers.org)
    ├── Cloudflare Pages (GitHub Actions deploy)
    └── /api/ai/chat → Cloudflare Worker
```

---

## Powiazane aplikacje (ekosystem Cloudflare)

| Aplikacja | URL | Opis |
| --------- | --- | ---- |
| ZENO Browser Web | zenonbrowsers.org | BUCH_CHAT, WebLanding, AI-Hub |
| BONZO Media Hub | bonzo-media-hub.stolarnia-ams.workers.dev | 66 filmow + recenzje TMDB |
| MOA Pipeline | moa.mybonzo.com | Mixture-of-Agents — orkiestracja wielu LLM |
| AI-Hub | zenonbrowsers.org/ai-hub/ | Standalone dashboard ekosystemu |

---

## Uruchomienie

### Wersja Electron (pelna)

```bash
npm install
npm run dev
```

Uruchamia Vite dev server (port 5173) i okno Electron z hot reload.

### Wersja web-only

```bash
npm run dev:web
# lub: npx vite
```

Otwiera `http://localhost:5173` — wyswietla WebLanding zamiast BrowserUI.

### Plik `.env.local` (wymagany)

Utwórz w katalogu glownym projektu:

```env
# AI Gateway (wybierz przynajmniej jeden)
DEEPSEEK_API_KEY=sk-XXXX
OPENROUTER_API_KEY=sk-or-XXXX
EDENAI_API_KEY=XXXX

# Wersja web (BUCH_CHAT)
VITE_OPENROUTER_API_KEY=sk-or-XXXX

# Cloudflare Tunnel (opcjonalnie)
CF_TUNNEL_TOKEN=XXXX

# Copilot SDK (opcjonalnie)
COPILOT_CLI_PATH=/usr/local/bin/copilot
```

---

## Interfejs Electron — elementy

### Pasek nawigacji

| Przycisk | Funkcja |
| -------- | ------- |
| Wstecz | Cofnij w historii |
| Dalej | Naprzod w historii |
| Odswiez | Przeladuj strone |
| + | Nowa karta |

### Pasek adresu

- Wpisz **URL** (np. `google.com`) — automatycznie doda `https://`
- Wpisz **tekst** (np. `pogoda Warszawa`) — wyszuka w Google
- Niebezpieczne protokoly (`javascript:`, `data:`, `file:`, `vbscript:`) sa blokowane

### Karty (TabBar)

- Kliknij karte aby sie przelaczac
- `x` zamyka karte (ostatnia karta resetuje sie zamiast zamykac)

---

## BUCH_CHAT — Asystent AI

BUCH_CHAT to wbudowany asystent AI. Zastapil CopilotKit jako glowny interfejs.

### Wersja web (zenonbrowsers.org)

- Floating widget w prawym dolnym rogu
- Pelny widok: `/assistant` (AssistantPage)
- Requesty do `/api/ai/chat` Cloudflare Worker

### Wersja Electron

- Dostep przez panel w naglowku aplikacji
- AssistantPage z pelnym kontekstem systemowym
- Dostep do JimboKitPanel (CopilotKit Runtime, port 4111)

### Dostepne providery

| Provider | Modele |
| -------- | ------ |
| DeepSeek | deepseek-chat, deepseek-reasoner |
| OpenRouter | claude-3.5-sonnet, gpt-4o, mistral-large i 100+ innych |
| EdenAI | rozne modele (tylko Electron) |
| Workers AI | llama-3.1-8b i inne (tylko wersja web CF) |

Konfiguracja: klucze API w `.env.local` (Electron) lub CF Pages secrets (web).

---

## JimboKit Panel (tylko Electron)

JimboKit to agent uruchomiony na porcie 4111 (CopilotKit Runtime).

### Komendy terminala

| Komenda | Opis |
| ------- | ---- |
| `/navigate <url>` | Nawiguj w przegladarce |
| `/search <query>` | Wyszukaj w sieci |
| `/fetch <url>` | Pobierz tresc strony |
| `/screenshot` | Zrzut ekranu aktualnej strony |
| `/tabs` | Lista otwartych kart |

Komunikacja przez REST + WebSocket streaming (nie przez Electron IPC).

---

## AI Gateway (panele AI w Electron)

### AIPanel (prosty chat)

- Streaming odpowiedzi (useActionState)
- Error boundary

### AIGatewayPanel (zaawansowany)

- Podglad dostepnych providerow
- Metryki uzycia (koszty, requesty)
- Konfiguracja failover

### Kolejnosc failover

DeepSeek → OpenRouter → EdenAI

LRU cache aktywny (unikanie duplikatow requestow), rate limiting wbudowany.

---

## Copilot Dev Panel (tylko Electron)

Panel dla deweloperow do sterowania GitHub Copilot CLI.

**Wymaga:** zainstalowanego i zalogowanego `@github/copilot` CLI.

### Instalacja Copilot CLI

```bash
# Sprawdz czy masz dostep
copilot --version

# Autoryzacja (GitHub account z Copilot subscription)
copilot auth login
```

### Dostepne akcje

- Status CLI
- Lista modeli
- Uruchomienie promptu testowego
- Log odpowiedzi sesji

Jesli Copilot CLI nie jest zainstalowany — panel pokazuje status `unavailable`, ale reszta aplikacji dziala normalnie.

---

## Monitor Bezpieczenstwa

Analiza bezpieczenstwa odwiedzanych stron:

- Status HTTPS/SSL
- Audit logi zdarzen bezpieczenstwa
- Real-time updates przez `useSyncExternalStore`

Panel: SecurityMonitor.tsx (lazy loaded przez BrowserUI).

---

## Cloudflare Tunnel

Udostepnianie lokalnych uslug przez tunel CF:

1. Pobierz token z [dash.cloudflare.com](https://dash.cloudflare.com/)
2. Ustaw `CF_TUNNEL_TOKEN=twoj_token` w `.env.local`
3. Zarządzaj z panelu CloudflareTunnelPanel

---

## Hub Wtyczek (PluginHub)

Marketplace wtyczek ZENO (tylko Electron):

- **PluginExplorer** — przeglada marketplace przez IPC
- **PluginInstaller** — instalacja przez `plugin:load` IPC handler
- **PluginManager** — wlaczanie/wylaczanie/odinstalowywanie

Wtyczki uruchamiane w `vm.runInNewContext` sandbox z whitelistingiem sciezki zrodlowej.

---

## MCP Server

ZENO ma wbudowany serwer MCP (Model Context Protocol) na porcie 3847 z 47 narzędziami.

Przykladowe narzedzia:

| Narzedzie | Opis |
| --------- | ---- |
| `browser_navigate` | Nawigacja do URL |
| `browser_screenshot` | Zrzut ekranu strony |
| `web_search` | Wyszukiwanie w sieci |
| `extract_text` | Ekstrakcja tekstu ze strony |
| `execute_script` | Wykonanie JavaScriptu |

MCP pozwala na sterowanie przegladarka z poziomu zewnetrznych agentow AI.

---

## CI/CD — Cloudflare Pages

Wersja web jest automatycznie deployowana przy kazdy push na `main`:

```text
git push origin main
  → GitHub Actions (deploy-web.yml)
  → wrangler pages deploy
  → zenonbrowsers.org
```

Wymagane sekrety w GitHub: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.

---

## Znane ograniczenia

### Wersja web vs Electron

| Feature | Web | Electron |
| ------- | --- | -------- |
| BUCH_CHAT | Tak | Tak |
| JimboKit / CopilotKit | Nie | Tak (port 4111) |
| Terminal | Nie | Tak |
| Plugin system | Nie | Tak |
| MCP Server | Nie | Tak (port 3847) |
| Pliki lokalne | Nie | Tak (IPC) |
| Tool-use w BUCH_CHAT | Nie (todo) | Czesciowo (JimboKit) |

### Znane problemy

| Problem | Rozwiazanie |
| ------- | ----------- |
| Port 5173 zajety | Zamknij inne procesy Vite lub zmien port w vite.config.mts |
| Bledy GPU process | Normalne ostrzezenia Chromium — ignoruj |
| API AI nie dziala | Sprawdz klucze w `.env.local` |
| Pusta strona | Odswiez lub otwórz nowa karte |
| JimboKit offline | CopilotKit Runtime nie uruchomil sie (port 4111 zajety?) |
| Copilot panel error | Zainstaluj i zaloguj `copilot` CLI |

---

## Security fixes (2026-03-30)

W sesji 2026-03-30 naprawiono nastepujace krytyczne issues:

| ID | Opis | Status |
| -- | ---- | ------ |
| CR-001 | Walidacja URL w `browser:navigate` IPC (blokuje `javascript:`, `file:`, `data:`) | FIXED |
| CR-002 | Plugin `source path` whitelist (tylko `userData/plugins/`) | FIXED |
| CR-003 | Plugin loader `eval()` → `vm.runInNewContext()` | FIXED |
| CR-004 | Usunieto `browser-sandbox.ts` z renderer | FIXED |
| CR-005 | Dodano Content Security Policy headers | FIXED |
| CR-006 | Walidacja URL w AddressBar.tsx | FIXED |
| CR-007 | API keys `enabled: !!key?.trim()` zamiast pusty string | FIXED |
| CR-008 | Usunieto phantom providers (openai, anthropic, local) | FIXED |
| CR-011 | `ipcMain.emit` → `webContents.send` dla update-progress | FIXED |

---

## Budowanie

```bash
# Pełny build
npm run build

# Instalatory
npm run dist:win    # Windows
npm run dist:mac    # macOS
npm run dist:linux  # Linux
```

---

## Szybkie komendy

```bash
npm install               # Instalacja zaleznosci
npm run dev               # Uruchom Electron (dev)
npm run dev:web           # Uruchom wersja web (tylko przeglądarka)
npm run build             # Pelny build
npx tsc --noEmit          # Sprawdzenie TypeScript
node scripts/copilot-sdk-smoke-test.mjs  # Test Copilot CLI
```

---

## Wiecej dokumentacji

- `.workspace_meta/scripts/architecture-overview.md` — pełna architektura
- `.workspace_meta/scripts/dev-quickstart.md` — szybki start dla deweloperow
- `.workspace_meta/scripts/cloudflare-services-map.md` — mapa serwisow CF
- `.workspace_meta/scripts/buch-chat-tools.md` — szczegoly BUCH_CHAT
- `.workspace_meta/scripts/upgrade-next-steps.md` — plan upgrade dependencies
- `docs/ELECTRON_SETUP.md` — konfiguracja Electron
- `docs/AI_GATEWAY_SETUP.md` — konfiguracja AI Gateway
- `docs/COPILOT_SDK_SETUP.md` — konfiguracja Copilot SDK
- `docs/CLOUDFLARE_SECRETS_SETUP.md` — sekrety CF
