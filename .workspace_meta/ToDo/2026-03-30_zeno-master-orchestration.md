# ZENO Browser — Master Orchestration Prompt

> **Data:** 2026-03-30
> **Projekt:** ZENO Browser (Electron + React + Vite)
> **Agent startowy:** `context-architect` (orkiestruje cały przepływ)
> **Status:** TODO

---

## URUCHOMIENIE

Wklej poniższy prompt do Claude Code z agentem **`context-architect`**:

```
@context-architect

Jesteś orchestratorem całego planu naprawy i upgrade'u ZENO Browser.
Uruchom poniższe zadania SEKWENCYJNIE — każde następne dopiero po zakończeniu poprzedniego.
Po każdym zadaniu zapisz postęp w `.workspace_meta/ToDo/2026-03-30_zeno-master-orchestration.md`
(zmień status `[ ]` → `[x]` przy ukończonym zadaniu).

Projekt: `U:\WWW_Zen_BRo_wser_org3\`
Główny kod: `src/`, `src-electron/`

KOLEJNOŚĆ ZADAŃ — uruchamiaj agentów po kolei:

1. Wywołaj agenta `se-security-reviewer` → TASK-SEC (Critical security fixes)
2. Wywołaj agenta `debug` → TASK-DEBUG (High severity bugs)
3. Wywołaj agenta `context-architect` → TASK-MAP (Dependency context map)
4. Wywołaj agenta `principal-software-engineer` → TASK-PLAN (Refactor plan 5 faz)
5. Wywołaj agenta `expert-react-frontend-engineer` → TASK-REACT (React 19 upgrade)
6. Wywołaj agenta `tdd-refactor` → TASK-TDD (Cleanup & quality pass)

Zacznij od TASK-SEC.
```

---

## TASK-SEC — Critical Security Fixes
**Agent:** `se-security-reviewer`
**Status:** `[x]` ✅ COMPLETED 2026-03-30
**Blocked-by:** nic — zacznij tutaj

```
@se-security-reviewer

Napraw KRYTYCZNE issues z Code_fix_plan.md w projekcie ZENO Browser.

ZAKRES — napraw w tej kolejności:

**CR-001** (CRITICAL): Dodaj walidację URL w `browser:navigate` IPC handler
- Plik: `src-electron/services/browser-manager.ts` metoda `navigate()`
- Fix: whitelist protokołów `['http:', 'https:', 'about:']`, blokuj `javascript:`, `data:`, `file:`

**CR-006** (CRITICAL): Walidacja URL w AddressBar.tsx
- Plik: `src/components/AddressBar.tsx` funkcja `handleSubmit`
- Fix: `/^(javascript|data|vbscript|file):/i.test(finalUrl)` → return, potem `new URL()` validation

**CR-005** (CRITICAL): Dodaj CSP headers
- Plik: `src-electron/main.ts` po `mainWindow.loadURL()`
- Fix: `webRequest.onHeadersReceived` z `Content-Security-Policy`

**CR-004** (CRITICAL): Usuń browser-sandbox.ts z renderer
- Plik: `src/services/security/browser-sandbox.ts`
- Fix: usuń plik (logika jest już w `src-electron/services/security-sandbox.ts`)

**CR-002 + CR-003** (CRITICAL): Plugin loader — eval() i arbitrary source
- Plik: `src-electron/services/plugin-ipc-bridge.ts`, `src/plugin-system/core/plugin-loader.ts`
- Fix CR-002: whitelist sourceDirs — akceptuj tylko ścieżki w `app.getPath('userData')/plugins/`
- Fix CR-003: zamień `new Function(code)` i `eval(code)` na `vm.runInNewContext(code, sandbox)` z Node.js

Po każdym fixie uruchom: `npx tsc --noEmit`

Po zakończeniu: zapisz raport w `.workspace_meta/ToDo/History/sec-fixes-$(date +%Y%m%d).md`
Następny agent: `debug` → TASK-DEBUG
```

---

## TASK-DEBUG — High Severity Bugs
**Agent:** `debug`
**Status:** `[x]` ✅ COMPLETED 2026-03-30
**Blocked-by:** TASK-SEC

```
@debug

Napraw HIGH severity bugs z Code_fix_plan.md w ZENO Browser.

**CR-007**: API keys — `process.env.KEY || ''` → `enabled: !!process.env.KEY?.trim()`
- Plik: `src/services/ai-gateway/index.ts` L12-33

**CR-008**: Phantom providers — `require('./providers/openai')` na plik który nie istnieje
- Plik: `src/services/ai-gateway/gateway.ts` L55-62
- Fix: usuń openai/anthropic/local z providerMap LUB utwórz stub pliki

**CR-011**: `ipcMain.emit('update-progress')` → NIE dociera do renderera
- Plik: `src-electron/services/auto-updater.ts` L440
- Fix: `mainWindow.webContents.send('update-progress', progress)`

**CR-021**: `RateLimiter` referenced but not defined
- Plik: `src/services/ai-gateway/gateway.ts` L37
- Fix: zaimplementuj prostą klasę RateLimiter lub usuń z Map

**CR-022**: `require('electron-log')` → static import
- Plik: `src-electron/services/auto-updater.ts`
- Fix: `import log from 'electron-log'`

Po każdym fixie: `npx tsc --noEmit`
Po zakończeniu: Następny agent: `context-architect` → TASK-MAP
```

---

## TASK-MAP — Dependency Context Map
**Agent:** `context-architect`
**Status:** `[x]` ✅
**Blocked-by:** TASK-DEBUG

```
@context-architect

Zmapuj pełną strukturę zależności projektu ZENO Browser.

Zakres:
- src/components/ (TSX): AddressBar, AIPanel, BrowserUI, TabBar, PluginExplorer,
  PluginInstaller, PluginManager, SecurityMonitor, CloudflareTunnelPanel, UpdateNotification
- src/services/ (ai-gateway/, security/)
- src/plugin-system/ (core/, marketplace/)
- src-electron/ (main.ts, preload.ts, services/)

Dla każdego pliku:
1. Importy (od czego zależy)
2. Eksporty (kto z niego korzysta)
3. IPC channels (które kanały otwiera/obsługuje)
4. Czy ma testy (tak/nie)

Output — zapisz w `.workspace_meta/ToDo/context-map-$(date +%Y%m%d).md`:
- Tabela: | Plik | Importuje z | Eksportuje do | IPC channels | Ma testy |
- Mermaid dependency graph
- Lista circular dependencies
- Hotspoty (pliki z >5 zależnościami)

Następny agent: `principal-software-engineer` → TASK-PLAN
```

---

## TASK-PLAN — 5-Phase Refactor Plan
**Agent:** `principal-software-engineer`
**Status:** `[x]` ✅
**Blocked-by:** TASK-MAP

```
@principal-software-engineer

Na podstawie context-map z TASK-MAP, zaplanuj 5-fazowy upgrade ZENO Browser.

Aktualne wersje → docelowe:
| Pakiet     | Mamy    | Cel     | Breaking? |
|------------|---------|---------|-----------|
| TypeScript | ^5.3.3  | 5.9.x   | NIE       |
| Vite       | ^5.0.7  | 8.x     | TAK       |
| React      | ^18.2.0 | 19.2.x  | TAK       |
| Electron   | ^27.0.0 | 41.x    | TAK       |
| ESLint     | ^8.55.0 | 10.x    | TAK       |
| Zustand    | ^4.4.1  | 5.x     | TAK       |

Dla każdej fazy:
1. Lista plików do modyfikacji z konkretną zmianą
2. Kolejność: types → implementations → tests
3. Komenda weryfikacji: `npm run type-check && npm test`
4. Rollback plan
5. Szacowany effort (S/M/L/XL)

Zapisz plan w `.workspace_meta/ToDo/upgrade-dependencies-plan.md` (nadpisz istniejący).

Następny agent: `expert-react-frontend-engineer` → TASK-REACT
```

---

## TASK-REACT — React 19 Component Upgrade
**Agent:** `expert-react-frontend-engineer`
**Status:** `[x]` ✅
**Blocked-by:** TASK-PLAN

```
@expert-react-frontend-engineer

Zrefaktoryzuj komponenty React w ZENO Browser na React 19 patterns.
Wykonuj TYLKO Fazę 3 z planu upgrade (React 18→19).

Kolejność komponentów:
1. `src/components/AddressBar.tsx`
   - useOptimistic dla URL display
   - useDeferredValue dla autocomplete
   - Upewnij się że security fixes z CR-006 są zachowane

2. `src/components/AIPanel.tsx`
   - useActionState dla streaming responses
   - Error boundary wrapper
   - lazy() loading

3. `src/components/TabBar.tsx`
   - React.memo na tab items
   - useDeferredValue dla listy tabów

4. `src/components/PluginManager.tsx` + `PluginExplorer.tsx` + `PluginInstaller.tsx`
   - Zastąp window.confirm() modalem
   - Usuń bezpośredni import marketplaceService — użyj window.electronAPI.plugin.searchMarketplace()
   - Zastąp fake setTimeout progress → real IPC progress

5. `src/components/SecurityMonitor.tsx`
   - useSyncExternalStore dla real-time updates
   - Usuń dead state: `report`, `setReport`

Po każdym komponencie: `npx tsc --noEmit`
Następny agent: `tdd-refactor` → TASK-TDD
```

---

## TASK-TDD — Quality & Security Cleanup Pass
**Agent:** `tdd-refactor`
**Status:** `[x]` ✅ COMPLETED 2026-03-30
**Blocked-by:** TASK-REACT

```
@tdd-refactor

Przeprowadź finalny cleanup po wszystkich zmianach w ZENO Browser.

Sprawdź i napraw:
 [x] Deduplikacja logiki walidacji URL — wyciągnij do `src-electron/utils/validate-url.ts`
 [x] Wszystkie IPC handlery mają TypeScript typy (zero `any` w handlerach)
 [x] Każdy `useEffect` ma cleanup function
 [x] Żaden komponent nie ma `window.confirm()`
 [x] Zero dead state variables
 [x] Zero `require()` — tylko `import`
 [x] `npm run type-check` = 0 errors
 [x] `npm test` = wszystkie testy green

Po zakończeniu zapisz podsumowanie w `.workspace_meta/ToDo/History/cleanup-$(date +%Y%m%d).md`

KONIEC ORCHESTRATION — zaktualizuj `.workspace_meta/ToDo/2026-03-30_zeno-master-orchestration.md`
i oznacz wszystkie taski jako `[x]`.
```

---

## POSTĘP

| Task | Agent | Status |
|------|-------|--------|
| TASK-SEC | `se-security-reviewer` | `[x]` |
| TASK-DEBUG | `debug` | `[x]` |
| TASK-MAP | `context-architect` | `[x]` |
| TASK-PLAN | `principal-software-engineer` | `[x]` |
| TASK-REACT | `expert-react-frontend-engineer` | `[x]` |
| TASK-TDD | `tdd-refactor` | `[x]` |

## SZYBKI START

Jeśli chcesz uruchomić tylko jeden konkretny task — skopiuj prompt z odpowiedniej sekcji
i wklej bezpośrednio do Claude Code z odpowiednim agentem.
