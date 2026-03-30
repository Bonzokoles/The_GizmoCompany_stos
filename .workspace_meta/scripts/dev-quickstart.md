# ZENO Browser — Dev Quickstart

> Zaktualizowano: 2026-03-30

---

## Prerequisites

| Narzedzie | Wersja | Uwagi |
|-----------|--------|-------|
| Node.js | >= 18.x (zalecane 20.x) | Wymagane przez Electron 27 |
| npm | >= 9.x | Dostarczany z Node |
| Git | dowolna | |
| Windows 10/11 | 64-bit | Electron wymaga x64 |

Opcjonalne:
- `@github/copilot` CLI — do CopilotDevPanel (patrz docs/COPILOT_SDK_SETUP.md)
- Podman/Docker — do lokalnych modeli AI (Gemma 2B, Phi Nano)

---

## Instalacja

```bash
git clone <repo-url> zeno-browser
cd zeno-browser
npm install
```

---

## Zmienne srodowiskowe (.env.local)

Utwórz plik `.env.local` w katalogu glownym projektu:

```env
# AI Gateway — wybierz przynajmniej jeden
DEEPSEEK_API_KEY=sk-XXXX
OPENROUTER_API_KEY=sk-or-XXXX
EDENAI_API_KEY=XXXX

# Opcjonalne providery (klasyczne)
OPENAI_API_KEY=sk-XXXX
ANTHROPIC_API_KEY=sk-ant-XXXX
GEMINI_API_KEY=XXXX

# BUCH_CHAT / web provider
VITE_OPENROUTER_API_KEY=sk-or-XXXX

# Cloudflare Tunnel (opcjonalnie)
CF_TUNNEL_TOKEN=XXXX

# Copilot SDK (opcjonalnie)
COPILOT_CLI_PATH=/usr/local/bin/copilot
WORKSPACE_ROOT=U:/WWW_Zen_BRo_wser_org3
```

Klucze SA przechowywane lokalnie — NIGDY nie commituj `.env.local`.

---

## Uruchomienie: wersja Electron (lokalna, pelna)

```bash
npm run dev
```

Uruchamia rownolegle:
- Vite dev server na `http://localhost:5173`
- Electron main process
- Hot reload dla React i Electron

Okno Electron pojawi sie automatycznie.

### Jezeli okno sie nie pojawia

```bash
# Sprawdz czy port 5173 jest wolny
netstat -an | findstr 5173

# Uruchom Vite osobno zeby zobaczyc bledy
npx vite
```

---

## Uruchomienie: wersja web-only (bez Electron)

```bash
npm run dev:web
```

Lub:
```bash
npx vite
```

Otwiera `http://localhost:5173` w przegladarce. Wyswietla `WebLanding.tsx` zamiast `BrowserUI.tsx`.

Rozroznienie: `App.tsx` sprawdza `window.electronAPI` — jesli nie istnieje, renderuje WebLanding.

---

## Build

```bash
# Pełny build (React + Electron)
npm run build

# Tylko React (web)
npm run build:web

# Tylko Electron
npm run build:electron

# Instalatory platformowe
npm run dist:win    # Windows NSIS installer
npm run dist:mac    # macOS DMG
npm run dist:linux  # Linux AppImage
```

---

## Serwisy uruchamiane przez aplikacje

| Serwis | Port | Opis |
|--------|------|------|
| Vite dev server | 5173 | React UI |
| MCP Server | 3847 | Model Context Protocol (47 tools) |
| CopilotKit Runtime | 4111 | JimboKit REST + WebSocket |

---

## Sprawdzenie TypeScript

```bash
npx tsc --noEmit                    # renderer (src/)
npx tsc --noEmit -p tsconfig.electron.json  # main process (src-electron/)
```

---

## Diagnozowanie problemow

| Problem | Rozwiazanie |
|---------|------------|
| Port 5173 zajety | `netstat -an | findstr 5173` → zamknij proces |
| Electron nie startuje | Sprawdz logi w terminalu, czesto missing build |
| API AI nie dziala | Sprawdz klucze w `.env.local` i `npm run dev` |
| JimboKit nie odpowiada | Sprawdz czy CopilotKit Runtime uruchomil sie na porcie 4111 |
| TypeScript errors | `npx tsc --noEmit` — pokaze wszystkie bledy |
| Pusta strona | Odswierz lub otwórz nowa karte — zwykle Vite HMR reset |

---

## Przydatne komendy developerskie

```bash
# Czyszczenie cache Vite
npx vite --force

# Reinstalacja zaleznosci
rm -rf node_modules && npm install

# Sprawdzenie zainstalowanych wersji
npm list electron react typescript vite

# Copilot SDK smoke test
node scripts/copilot-sdk-smoke-test.mjs
```
