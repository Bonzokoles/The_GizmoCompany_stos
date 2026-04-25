# ZENO Architecture Memory

## Shell Components (TASK A)

Data: 2026-04-11

Layer 2 (`src/components/browser-core/`) został uzupełniony o brakujące elementy shell:

- `BrowserShellLayout.tsx` — root layout wrapper dla BrowserUI (content + optional sidebar + status bar slot), bez IPC i bez importów z Electron/Node.
- `WorkspaceHost.tsx` — host zakładek/workspace w warstwie UI z lokalnym stanem aktywnej zakładki i opcjonalnym callbackiem.
- `panel-groups.ts` — stałe grup paneli: `PRIMARY`, `SECONDARY`, `OVERLAY`.
- `PanelFallback.tsx` — fallback UI dla błędów panelu (`panelId`, `error`, `onRetry`).

`BrowserUI.tsx` został owinięty przez `BrowserShellLayout` jako zewnętrzny wrapper, bez zmian logiki `PANEL_REGISTRY`, tab management i IPC.

Dodano alias typu `Tab` w `shell.types.ts` (bazujący na `src/types/electron.d.ts`) dla spójności nowych komponentów shell.

## Preload Split (TASK B)

Data: 2026-04-11

Warstwa preload (`src-electron`) została rozbita z monolitu na moduły domenowe:

- `src-electron/preload/browser-api.ts`
- `src-electron/preload/ai-api.ts`
- `src-electron/preload/agent-hub-api.ts`
- `src-electron/preload/network-api.ts`
- `src-electron/preload/search-api.ts`
- `src-electron/preload/catalog-api.ts`
- `src-electron/preload/system-api.ts`
- `src-electron/preload/plugin-api.ts`

`src-electron/preload.ts` pełni teraz rolę cienkiego agregatora (24 linie), który importuje domain APIs i wykonuje dokładnie jedno `contextBridge.exposeInMainWorld('electronAPI', ...)`.

W każdym module domenowym kanały IPC zostały zapisane jako stałe `CH` i używane przez `ipcRenderer.invoke(CH.X, payload)`.

## Main Process Split (TASK C)

Data: 2026-04-11

`src-electron/main.ts` został zredukowany do roli orkiestratora (52 linie) i deleguje odpowiedzialności do modułów:

- `src-electron/app/`
  - `load-env.ts`
  - `create-window.ts`
  - `service-container.ts`
  - `start-jimbo-hub.ts`
- `src-electron/ipc/`
  - `register-browser.ts`
  - `register-ai.ts`
  - `register-network.ts`
  - `register-workflow.ts`
  - `register-crawler.ts`
  - `register-terminal.ts`
  - `register-mcp.ts`
  - `register-search.ts`
  - `register-hub.ts`
  - `register-window.ts`
  - `register-dialog.ts`
  - `register-plugin.ts`
  - `index.ts` (`registerAllIpc`)

Niezmienne wymagania bezpieczeństwa zachowane w `create-window.ts`:

- `nodeIntegration: false`
- `contextIsolation: true`
- `sandbox: true`
- CSP headers
- permission request handler

GPU fix pozostał aktywny w `main.ts`: `app.disableHardwareAcceleration()` przed cyklem `ready`.

## UI Dark Polish (TASK_UI1)

Data: 2026-04-11

W warstwie renderer (Layer 2) wykonano polish ciemnego motywu:

- `src/styles/global.css`
  - nowa deep-dark paleta (`#050508` jako tło bazowe)
  - dot-grid (`body::before`) + vignette (`body::after`)
  - glow styles dla aktywnych elementów
  - style panelu folderów `.folder-panel*`
- `src/components/browser-core/AppFolderPanel.tsx`
  - nowy panel explorer (mock tree)
- `src/components/browser-core/BrowserUI.tsx`
  - `BrowserShellLayout` otrzymał `sidebar={<AppFolderPanel />}`

Wymagania stylistyczne zachowane: brak dużych zaokrągleń (radius ustawiony na 4px).

## MCP Terminal Tools Split (2026-04-24)

`src-electron/mcp-server/tools/terminal-tools.ts` zastąpiony cienkim agregatorem.
Trzy podfoldery z osobnymi metodami wywołującymi:

- `Terminal_01/index.ts` — `createExecuteTools()` → `terminal_execute` (ping, tracert, nslookup, ipconfig, netstat, arp, route, curl, whoami, hostname, systeminfo)
- `Terminal_02/index.ts` — `createNetworkTools()` → `terminal_ping`, `terminal_dns_lookup`
- `Terminal_03/index.ts` — `createRouteTools()` → `terminal_traceroute`

Agregator: `createTerminalTools()` = `[...createExecuteTools(), ...createNetworkTools(), ...createRouteTools()]`

## AgentWorkspacePanel Refactor (2026-04-24)

Panel agentów rozbity na niezależne terminale per slot:

- `src/components/agents/AGENT_Pi_01/index.tsx` — `AgentTerminal_01` (SLOT 01)
- `src/components/agents/AGENT_Pi_02/index.tsx` — `AgentTerminal_02` (SLOT 02)
- `src/components/agents/AGENT_Pi_03/index.tsx` — `AgentTerminal_03` (SLOT 03)

Każdy terminal: pełny PTY (node-pty) + xterm.js + `PROVIDER_DEFAULTS` (google/anthropic/openrouter/openai) + UI wyboru providera/modelu/klucza.

`AgentWorkspacePanel.tsx` używa `renderSlot(slotIndex)` switch — edytuj tylko `AGENT_Pi_0X/index.tsx` dla zmian per terminal.

Łańcuch wywołania: `PiTerminalPanel` → `onSpawnAgent` → `BrowserUI.workspaceAgents[]` → `panel-registry` → `AgentWorkspacePanel`.

Komunikacja między agentami: `JIMBOKIT_COMMS/` folder + `systemPromptOverride` w JSON agenta.

Dokumentacja: `src/components/agents/AGENT_WORKSPACE_GUIDE.md`, `src/components/WORKFLOW_CARD_GUIDE.md`.