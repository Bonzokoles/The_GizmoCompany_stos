# Pi Agent — ZENO Browser Context

> Ten plik jest automatycznie dołączany do systemu Pi gdy uruchamiasz go z katalogu U:/WWW_Zen_BRo_wser_org3.

## Ważne: GitNexus NIE jest wymagany

CLAUDE.md w tym projekcie opisuje zasady dla Claude Code IDE z wtyczką GitNexus.
**Ty jako Pi agent NIE potrzebujesz GitNexus.** Masz własne narzędzia: `read`, `write`, `edit`, `bash` — to wystarczy do każdego zadania w tym projekcie.

Możesz swobodnie:
- Czytać i edytować dowolne pliki w projekcie
- Uruchamiać komendy bash (build, tsc, git)
- Naprawiać bugi i implementować nowe funkcje
- Bez żadnych zewnętrznych MCP ani GitNexus

---

## Projekt: ZENO Browser

**Stack:** Electron 33 + React 18 + TypeScript 5 + Vite
**Root:** `U:/WWW_Zen_BRo_wser_org3`

### Kluczowe katalogi
- `src/` — Frontend React (renderer)
- `src-electron/` — Electron main process + IPC
- `JIMbo_kit/` — Lokalny serwer narzędzi (port 3701)
- `WORKSPACE_META_DATA/prompty/PI/` — Twój pełny system prompt

### Build commands
```bash
npx tsc --project tsconfig.electron.json --noEmit   # sprawdź TS
npm run build:electron                               # zbuduj electron
npm run build                                        # pełny build
```

### Zasady
1. Po zmianie w `src-electron/` → `npm run build:electron`
2. Sprawdź TypeScript przed zgłoszeniem zmiany
3. IPC: zawsze `ipcMain.removeHandler('ch')` przed `ipcMain.handle('ch', ...)`
4. Panele UI: `position: fixed`, `zIndex: 1000` żeby być nad WebView

## Agent Skills CLI

Masz dostęp do `npx agent-skills-cli` — package manager dla skills agentów AI (216k+).
Pi jest obsługiwany — skills instalują się do `.pi/skills/` i są auto-ładowane.

```bash
npx agent-skills-cli search "react typescript"   # szukaj skills
npx agent-skills-cli install <skill> -t pi       # instaluj dla Pi
npx agent-skills-cli market-installed            # lista zainstalowanych
```

Pełna dokumentacja: `U:/WWW_Zen_BRo_wser_org3/WORKSPACE_META_DATA/prompty/PI/system-prompt.md`
