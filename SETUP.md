# ZENO Browser — Instrukcja montażu na nowym komputerze

Kompletny przewodnik instalacji na świeżym Windows, żeby działało jak na maszynie deweloperskiej.

---

## 1. Wymagania wstępne

Zainstaluj w tej kolejności:

### Node.js 22.x LTS

```
https://nodejs.org/en/download/
```

Sprawdź: `node --version` → powinno być `v22.x.x`

### Git

```
https://git-scm.com/download/win
```

Sprawdź: `git --version`

### Python 3.x

Potrzebny do `node-gyp` (kompilacja natywnych addonów).

```
https://python.org/downloads/
```

Sprawdź: `python --version`

### Visual Studio Build Tools (node-gyp / natywne addony)

Wymagane do kompilacji `better-sqlite3` i `node-pty`.

Opcja A — przez npm (najprostsze):

```bash
npm install -g windows-build-tools
```

Opcja B — ręcznie:

- Pobierz Visual Studio Build Tools 2022: <https://visualstudio.microsoft.com/downloads/>
- Zaznacz workload: **"Desktop development with C++"**
- Komponent: MSVC v143, Windows 11 SDK

Sprawdź: `npm config get msvs_version` (powinno być `2022` lub `2019`)

### Podman Desktop

Wymagany do uruchamiania kontenerów (SearXNG, Meilisearch, Superset itd.).

```
https://podman-desktop.io/
```

Zainstaluj i uruchom Podman Desktop przynajmniej raz, żeby zainicjalizować maszynę wirtualną.

Sprawdź: `podman --version`

### VSCode

```
https://code.visualstudio.com/
```

### Goose (AI Agent)

```
https://block.github.io/goose/
```

Lub przez npm: `npm install -g @block/goose-cli`

---

## 2. Klonowanie repozytorium

```bash
git clone --recurse-submodules https://github.com/Bonzokoles/WWW_Zen_BRo_wser_org3.git
cd WWW_Zen_BRo_wser_org3
```

Jeśli klonowałeś bez `--recurse-submodules`, doinstaluj submoduły:

```bash
git submodule update --init --recursive
```

Submoduły w projekcie:

- `.github/cf-skills-tmp` — przykładowe Cloudflare skills
- `pi-mono` — pi coding agent

---

## 3. Pliki środowiskowe (klucze API)

Projekt NIE zawiera plików `.env` — musisz je stworzyć ręcznie.

### 3.1 Główny `.env`

Skopiuj szablon i uzupełnij klucze:

```bash
cp .env.example .env
```

Edytuj `.env` i uzupełnij:

```env
# === AI Providers ===
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
OPENROUTER_API_KEY=sk-or-...
DEEPSEEK_API_KEY=...
GOOGLE_AI_STUDIO_KEY=...           # Gemini
PERPLEXITY_API_KEY=pplx-...
EDENAI_API_KEY=...
TOGETHER_API_KEY=...

# === GitHub ===
GITHUB_TOKEN=ghp_...

# === Search ===
BRAVE_API_KEY=...
TAVILY_API_KEY=tvly-...
SERPER_API_KEY=...

# === Cloudflare ===
CLOUDFLARE_API_TOKEN=...
CLOUDFLARE_ACCOUNT_ID=...
CF_D1_DATABASE_ID=...
CF_R2_BUCKET_NAME=...

# === Lokalne serwisy ===
BUCH_PORT=5180

# === TMDB (opcjonalne) ===
TMDB_API_KEY=...
TMDB_ACCESS_TOKEN=...
```

> **NIGDY nie commituj `.env` do git!** Jest już w `.gitignore`.

### 3.2 Cloudflare Pages Functions — `.dev.vars`

```bash
cp .dev.vars.example .dev.vars
```

Uzupełnij wartości dla lokalnego developmentu Wrangler/Pages Functions.

---

## 4. Instalacja zależności

### 4.1 Root projektu

```bash
npm install
```

Jeśli `better-sqlite3` lub `node-pty` failują, spróbuj z rebuild:

```bash
npm install --build-from-source
```

### 4.2 JIMBO Agent HUB

```bash
cd JIMBO_agent_HUB
npm install
cd ..
```

### 4.3 JIMbo_kit (Tool Server)

```bash
cd JIMbo_kit
npm install
cd ..
```

### 4.4 pi-mono (pi coding agent)

```bash
cd pi-mono
npm install
npm run build
cd ..
```

### 4.5 Przebuduj natywne addony (jeśli trzeba)

`better-sqlite3` i `node-pty` są natywne — muszą być skompilowane dla konkretnej wersji Node.js i Electron.

Dla Electron (root):

```bash
npx electron-rebuild -f -w better-sqlite3
npx electron-rebuild -f -w node-pty
```

Lub przez npm script (jeśli jest w package.json):

```bash
npm run rebuild
```

---

## 5. Uruchamianie — podział na terminale

Aplikacja składa się z kilku niezależnych procesów. Uruchamiaj każdy w osobnym terminalu.

---

### Terminal 1 — Vite (frontend, port 5173)

```bash
cd u:\WWW_Zen_BRo_wser_org3
npm run dev:vite
```

Czeka aż zobaczysz: `Local: http://localhost:5173/`

---

### Terminal 2 — Electron (po uruchomieniu Vite)

```bash
cd u:\WWW_Zen_BRo_wser_org3
npm run dev:electron
```

Electron czeka automatycznie na `http://localhost:5173` (via `wait-on`) zanim otworzy okno.

> **Electron automatycznie startuje JIMBO Agent HUB** (port 4224) jako subprocess. Nie musisz go uruchamiać ręcznie, chyba że chcesz dev mode z hot-reload.

---

### Terminal 3 — JIMBO Agent HUB (opcjonalnie, dev mode)

Tylko jeśli chcesz ręcznie kontrolować HUB (auto-restart na zmiany kodu):

```bash
cd u:\WWW_Zen_BRo_wser_org3\JIMBO_agent_HUB
npm run dev
```

Port: **4224**

---

### Terminal 4 — JIMbo_kit Tool Server

```bash
cd u:\WWW_Zen_BRo_wser_org3\JIMbo_kit
npm run dev
```

Port: **4111**

24 narzędzia: fs, sys, podman, git, net, RAG.

---

### Terminal 5 — BUCH (Kimi K2 AI backend)

BUCH wymaga osobnej konfiguracji. Sprawdź `JIMBO_agent_HUB/buch-server.ts` lub odpowiedni plik startowy.

```bash
cd u:\WWW_Zen_BRo_wser_org3\JIMBO_agent_HUB
npm run buch
```

Port: **5180**

Wymaga: `OPENROUTER_API_KEY` w `.env` (model `moonshotai/kimi-k2`).

---

### Skrót — uruchom wszystko razem

Zamiast osobnych terminali możesz użyć:

```bash
cd u:\WWW_Zen_BRo_wser_org3
npm run dev
```

To uruchamia Vite + Electron jednocześnie przez `concurrently`.

Dla JIMbo_kit i BUCH potrzebujesz osobnych terminali (nie są w `concurrently`).

---

## 6. Kontenery Podman

Uruchom Podman Desktop, a następnie:

```bash
cd u:\WWW_Zen_BRo_wser_org3
podman-compose up -d
```

### Dostępne serwisy po starcie

| Serwis | Port | URL |
|--------|------|-----|
| SearXNG | 8088* | <http://localhost:8088> |
| Meilisearch | 7700 | <http://localhost:7700> |
| Superset | 8088 | <http://localhost:8088> |
| Umami | — | przez proxy |
| Plausible | — | przez proxy |

> Sprawdź `podman-compose.yml` dla dokładnych portów.

### Tylko wybrane serwisy (oszczędność RAM)

```bash
podman-compose up -d searxng meilisearch
```

---

## 7. Goose Agent

### Konfiguracja

Ustaw klucz API:

```bash
# Windows PowerShell
$env:ANTHROPIC_API_KEY = "sk-ant-..."
```

Lub dodaj do `.env` i załaduj przez `goose env`.

### Uruchomienie z kontekstem ZENO

```bash
cd u:\WWW_Zen_BRo_wser_org3
goose session start
```

Lub przez bat script (jeśli istnieje):

```bash
start_goose_terminal.bat
```

### Konfiguracja Goose dla ZENO

Plik `~/.config/goose/config.yaml` lub `.goose/config.yaml`:

```yaml
provider: anthropic
model: claude-sonnet-4-6
extensions:
  - name: developer
    enabled: true
```

---

## 8. pi coding agent

### Globalna instalacja

```bash
npm install -g @mariozechner/pi-coding-agent
```

### Konfiguracja

Utwórz `~/.pi/settings.json`:

```json
{
  "defaultProvider": "anthropic",
  "defaultModel": "claude-sonnet-4-6",
  "theme": "dark",
  "contextFiles": [".picontext", "AGENTS.md"],
  "maxTokens": 16000,
  "temperature": 0.3
}
```

### Uruchomienie z kontekstem ZENO

```bash
cd u:\WWW_Zen_BRo_wser_org3
pi
```

---

## 9. VSCode — rozszerzenia i ustawienia

### Zalecane rozszerzenia

Zainstaluj przez `Ctrl+Shift+X`:

- **ESLint** (`dbaeumer.vscode-eslint`)
- **Prettier** (`esbenp.prettier-vscode`)
- **TypeScript Vue Plugin** / **Volar** (jeśli używasz Vue)
- **Tailwind CSS IntelliSense** (`bradlc.tailwindcss`)
- **GitLens** (`eamodio.gitlens`)
- **Claude Dev** / **Continue** (AI coding assistant)
- **Electron Debugger** — dla debugowania Electron main process

### Konfiguracja launch.json (Electron debug)

Utwórz `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Electron Main",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "${workspaceFolder}/node_modules/.bin/electron",
      "runtimeArgs": ["--remote-debugging-port=9222", "."],
      "env": {
        "NODE_ENV": "development"
      },
      "cwd": "${workspaceFolder}",
      "console": "integratedTerminal"
    }
  ]
}
```

### Otwórz projekt

```bash
code u:\WWW_Zen_BRo_wser_org3
```

---

## 10. Weryfikacja — checklisty

### Minimalna konfiguracja (Electron + Vite)

- [ ] `node --version` → v22.x.x
- [ ] `.env` wypełniony (przynajmniej `ANTHROPIC_API_KEY`)
- [ ] `npm install` w root — bez błędów
- [ ] Terminal 1: `npm run dev:vite` → port 5173 działa
- [ ] Terminal 2: `npm run dev:electron` → okno Electron otwiera się
- [ ] W konsoli Electron: brak błędów `JIMBO_agent_HUB` (auto-start)

### Pełna konfiguracja

- [ ] `npm install` w `JIMBO_agent_HUB/`, `JIMbo_kit/`
- [ ] Terminal 4: JIMbo_kit na porcie 4111
- [ ] Terminal 5: BUCH na porcie 5180
- [ ] `podman-compose up -d` → kontenery działają
- [ ] Goose: `goose session start` — odpowiada
- [ ] pi: `pi` — REPL otwiera się

---

## 11. Typowe problemy

| Problem | Rozwiązanie |
|---------|-------------|
| `better-sqlite3` build error | Zainstaluj Windows Build Tools, `npx electron-rebuild -f -w better-sqlite3` |
| `node-pty` build error | `npx electron-rebuild -f -w node-pty` |
| Port 5173 zajęty | `npx kill-port 5173` (jest w skrypcie `dev`) |
| Electron nie otwiera okna | Upewnij się że Vite jest uruchomiony, sprawdź `localhost:5173` w przeglądarce |
| JIMBO HUB nie startuje | Sprawdź `JIMBO_agent_HUB/` — `npm install`, klucze w `.env` |
| `ANTHROPIC_API_KEY not set` | Sprawdź `.env` w root projektu |
| Podman containers fail | Uruchom Podman Desktop, poczekaj na inicjalizację VM |
| `git submodule` puste | `git submodule update --init --recursive` |
| `pi` command not found | `npm install -g @mariozechner/pi-coding-agent` |

---

## 12. Struktura katalogów (orientacja)

```
WWW_Zen_BRo_wser_org3/
├── src/                    # React 19 frontend (Vite)
├── src-electron/           # Electron main process
│   └── main.ts             # Entry point, auto-starts JIMBO HUB
├── JIMBO_agent_HUB/        # Agent HUB (port 4224)
│   └── hub-server.ts
├── JIMbo_kit/              # Tool server (port 4111)
│   └── server.ts
├── pi-mono/                # pi coding agent (submodule/local)
├── podman-compose.yml      # Kontenery (SearXNG, Meilisearch, Superset...)
├── .env                    # Klucze API (NIE w git)
├── .dev.vars               # Cloudflare secrets (NIE w git)
├── .env.example            # Szablon — skopiuj do .env
└── .dev.vars.example       # Szablon — skopiuj do .dev.vars
```

---

## Linki

- Repozytorium: <https://github.com/Bonzokoles/WWW_Zen_BRo_wser_org3>
- pi-mono: <https://github.com/Bonzokoles/pi-mono>
- Podman Desktop: <https://podman-desktop.io/>
- Goose: <https://block.github.io/goose/>
- Node.js 22 LTS: <https://nodejs.org/>
