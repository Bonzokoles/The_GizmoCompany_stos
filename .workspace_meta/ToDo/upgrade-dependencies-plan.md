

```markdown
# ZENO Browser — Implementation Plan: Upgrade & Refactor

> **Wygenerowano:** 2026-03-19
> **Format:** TASK-{NNN} | Atomowe zmiany z weryfikacją
> **Bazuje na:** context-map + refactor-plan z sesji 2026-03-19

---

## LEGENDA

- **Blocked-by:** TASK-{NNN} musi być ukończone PRZED tym taskiem
- **Verify:** Komenda do sprawdzenia po wykonaniu
- **Files:** Pełne ścieżki plików do modyfikacji
- **Status:** `[ ]` TODO | `[-]` IN PROGRESS | `[x]` DONE

---

## EPIC-0: PRE-UPGRADE BUGFIXY

> **Completion Criteria:** `npx tsc --noEmit` = 0 nowych błędów, `npm run build` = OK
> **Blocked-by:** nic — start tutaj

### TASK-001: Przenieś browser-sandbox.ts do src-electron/
- **Status:** `[ ]`
- **Files:**
  - MOVE: `src/services/security/browser-sandbox.ts` → `src-electron/services/security-sandbox.ts`
- **Opis:** Plik importuje `ipcMain`, `contextBridge` z Electron — to kod main procesu, NIE renderer
- **Blocked-by:** —
- **Verify:**
  ```bash
  test -f src-electron/services/security-sandbox.ts && echo "OK" || echo "FAIL"
  test ! -f src/services/security/browser-sandbox.ts && echo "OK" || echo "FAIL"
  npx tsc --noEmit
  ```

### TASK-002: Zamień require() → dynamic import() w gateway.ts
- **Status:** `[ ]`
- **Files:**
  - EDIT: `src/services/ai-gateway/gateway.ts` L55-62
- **Opis:** Zamień synchroniczny `require('./providers/deepseek')` na `await import('./providers/deepseek')` — umożliwi tree-shaking i ESM compatibility
- **Zmiana:**
  ```typescript
  // PRZED (L55-62):
  const providerMap: Record<AIProviderType, any> = {
    deepseek: require('./providers/deepseek').DeepSeekProvider,
    openrouter: require('./providers/openrouter').OpenRouterProvider,
    edenai: require('./providers/edenai').EdenAIProvider,
    openai: require('./providers/openai').OpenAIProvider,
    anthropic: require('./providers/anthropic').AnthropicProvider,
    local: require('./providers/local').LocalProvider,
  };

  // PO:
  const providerImports: Partial<Record<AIProviderType, () => Promise<any>>> = {
    deepseek: () => import('./providers/deepseek').then(m => m.DeepSeekProvider),
    openrouter: () => import('./providers/openrouter').then(m => m.OpenRouterProvider),
    edenai: () => import('./providers/edenai').then(m => m.EdenAIProvider),
  };
  ```
- **Blocked-by:** —
- **Verify:**
  ```bash
  grep -c "require(" src/services/ai-gateway/gateway.ts  # powinno = 0
  npx tsc --noEmit
  ```

### TASK-003: Usuń phantom providers z gateway.ts
- **Status:** `[ ]`
- **Files:**
  - EDIT: `src/services/ai-gateway/gateway.ts` L57-60
  - EDIT: `src/services/ai-gateway/providers/index.ts` L7 (AIProviderType)
- **Opis:** Usuń `openai`, `anthropic`, `local` z providerMap — pliki nie istnieją
- **Zmiana (providers/index.ts):**
  ```typescript
  // PRZED:
  export type AIProviderType = 'deepseek' | 'openrouter' | 'edenai' | 'openai' | 'anthropic' | 'local';
  // PO:
  export type AIProviderType = 'deepseek' | 'openrouter' | 'edenai';
  ```
- **Blocked-by:** TASK-002
- **Verify:**
  ```bash
  grep -c "openai\|anthropic\|local" src/services/ai-gateway/gateway.ts  # = 0
  npx tsc --noEmit
  ```

### TASK-004: Usuń Zustand z dependencies
- **Status:** `[ ]`
- **Files:**
  - EDIT: `package.json` — usunąć `"zustand"` z dependencies
- **Opis:** Zustand ^4.4.1 jest zainstalowany ale 0 stores w projekcie. Usunąć dead dependency.
- **Blocked-by:** —
- **Verify:**
  ```bash
  npm uninstall zustand
  grep -c "zustand" package.json  # = 0
  npm run build
  ```

### TASK-005: Utwórz typed electronAPI (global.d.ts)
- **Status:** `[ ]`
- **Files:**
  - CREATE: `src/types/electron.d.ts`
- **Opis:** Zdefiniuj typy dla `window.electronAPI` zamiast `(window as any).electronAPI`
- **Treść nowego pliku:**
  ```typescript
  // src/types/electron.d.ts
  export interface ElectronAPI {
    browser: {
      getTabs(): Promise<Tab[]>;
      newTab(): Promise<Tab>;
      closeTab(tabId: string): Promise<void>;
      navigate(tabId: string, url: string): Promise<void>;
    };
    ai: {
      execute(request: { prompt: string; maxTokens?: number; temperature?: number }): Promise<{ success: boolean; data?: { content: string }; error?: string }>;
      getProviders(): Promise<Array<{ name: string; displayName: string; enabled: boolean; priority: number }>>;
    };
    security: {
      getAuditLogs(): Promise<Array<{ type: string; timestamp: Date; tabId?: string }>>;
    };
    tunnel: {
      status(): Promise<TunnelStatus[]>;
      metrics(): Promise<TunnelMetrics>;
      reconnect(): Promise<void>;
    };
    updater: {
      checkForUpdates(): Promise<{ isUpdateAvailable: boolean; version?: string }>;
      installUpdate(): Promise<void>;
    };
    plugin: {
      install(pluginId: string): Promise<void>;
      getInstalled(): Promise<InstalledPlugin[]>;
      enable(pluginId: string): Promise<void>;
      disable(pluginId: string): Promise<void>;
      uninstall(pluginId: string): Promise<void>;
      update(pluginId: string): Promise<void>;
    };
    on(channel: string, callback: (...args: any[]) => void): () => void;
  }

  declare global {
    interface Window {
      electronAPI: ElectronAPI;
    }
  }
  ```
- **Blocked-by:** —
- **Verify:**
  ```bash
  test -f src/types/electron.d.ts && echo "OK"
  npx tsc --noEmit
  ```

---

## EPIC-1: UPGRADE-TS (TypeScript 5.3 → 5.9)

> **Completion Criteria:** `npx tsc --noEmit --strict` = 0 errors
> **Blocked-by:** EPIC-0

### TASK-006: Upgrade TypeScript
- **Status:** `[ ]`
- **Files:**
  - EDIT: `package.json` — `"typescript": "^5.9.3"`
- **Blocked-by:** TASK-005
- **Verify:**
  ```bash
  npm install typescript@^5.9.3 -D
  npx tsc --version  # 5.9.x
  ```

### TASK-007: Włącz strict mode
- **Status:** `[ ]`
- **Files:**
  - EDIT: `tsconfig.json` — dodaj `"strict": true`
  - EDIT: `tsconfig.electron.json` — dodaj `"strict": true`
- **Blocked-by:** TASK-006
- **Verify:**
  ```bash
  grep '"strict": true' tsconfig.json tsconfig.electron.json  # 2 matches
  ```

### TASK-008: Zamień (window as any).electronAPI na typed API
- **Status:** `[ ]`
- **Files:**
  - EDIT: `src/components/AIPanel.tsx` L19 — usuń `(window as any)`, użyj `window.electronAPI`
  - EDIT: `src/components/BrowserUI.tsx` L30 — j.w.
  - EDIT: `src/components/SecurityMonitor.tsx` L13 — j.w.
  - EDIT: `src/components/CloudflareTunnelPanel.tsx` L30 — j.w.
  - EDIT: `src/components/UpdateNotification.tsx` L16 — j.w.
  - EDIT: `src/components/PluginManager.tsx` L28 — j.w.
  - EDIT: `src/components/PluginInstaller.tsx` L28 — j.w.
- **Opis:** 7 komponentów — zamień `const electronAPI = (window as any).electronAPI;` na `const { electronAPI } = window;`
- **Blocked-by:** TASK-005, TASK-007
- **Verify:**
  ```bash
  grep -r "(window as any)" src/components/  # = 0 matches
  npx tsc --noEmit --strict
  ```

### TASK-009: Napraw strict type errors w services
- **Status:** `[ ]`
- **Files:**
  - EDIT: `src/services/ai-gateway/gateway.ts` — `catch (error: unknown)` + type guards
  - EDIT: `src/services/ai-gateway/providers/deepseek.ts` — `catch (error: unknown)`
  - EDIT: `src/services/ai-gateway/providers/openrouter.ts` — `catch (error: unknown)`
  - EDIT: `src/services/ai-gateway/providers/edenai.ts` — `catch (error: unknown)`
- **Blocked-by:** TASK-007
- **Verify:**
  ```bash
  npx tsc --noEmit --strict  # 0 errors in services/
  ```

### TASK-010: Napraw strict type errors w plugin-system
- **Status:** `[ ]`
- **Files:**
  - EDIT: `src/plugin-system/core/plugin-manager.ts` — type guards w catch blocks
  - EDIT: `src/plugin-system/core/plugin-loader.ts` — type guards
  - EDIT: `src/plugin-system/marketplace/marketplace-service.ts` — type guards
  - EDIT: `src/plugin-system/marketplace/auto-updater.ts` — type guards
- **Blocked-by:** TASK-007
- **Verify:**
  ```bash
  npx tsc --noEmit --strict  # 0 errors
  npm run build
  ```

---

## EPIC-2: UPGRADE-VITE (Vite 5 → 8)

> **Completion Criteria:** `npm run dev` starts OK, `npm run build` produces correct output
> **Blocked-by:** EPIC-1

### TASK-011: Upgrade Vite + plugins
- **Status:** `[ ]`
- **Files:**
  - EDIT: `package.json` — `"vite": "^8.0.0"`
- **Blocked-by:** TASK-010
- **Verify:**
  ```bash
  npm install vite@^8.0.0 -D
  npx vite --version  # 8.x.x
  ```

### TASK-012: Upgrade @vitejs/plugin-react
- **Status:** `[ ]`
- **Files:**
  - EDIT: `package.json` — `"@vitejs/plugin-react": "^5.0.0"` (lub latest)
- **Blocked-by:** TASK-011
- **Verify:**
  ```bash
  npm install @vitejs/plugin-react@latest -D
  npm ls @vitejs/plugin-react
  ```

### TASK-013: Migruj vite.config.ts na Vite 8 API
- **Status:** `[ ]`
- **Files:**
  - EDIT: `vite.config.ts` (root)
- **Opis:** Vite 8 Environment API, nowy resolver, ESM-only config. Sprawdź `define`, `resolve.alias`, `build.rollupOptions`.
- **Blocked-by:** TASK-011, TASK-012
- **Verify:**
  ```bash
  npm run dev    # dev server starts
  npm run build  # production build OK
  ```

### TASK-014: Sprawdź/update vite-plugin-electron
- **Status:** `[ ]`
- **Files:**
  - EDIT: `package.json` — update vite-plugin-electron do wersji compatible z Vite 8
  - EDIT: `vite.config.ts` — ewentualne zmiany w konfiguracji pluginu
- **Blocked-by:** TASK-013
- **Verify:**
  ```bash
  npm run build
  npm start  # Electron app launches
  ```

### TASK-015: Verify import.meta.env usage
- **Status:** `[ ]`
- **Files:**
  - CHECK: `src/services/ai-gateway/index.ts` — `process.env.*`
  - CHECK: `src/plugin-system/marketplace/marketplace-service.ts` — `process.env.REACT_APP_MARKETPLACE_URL`
- **Opis:** Vite 8 może zmienić semantykę `define`. Upewnij się, że env vars działają.
- **Blocked-by:** TASK-013
- **Verify:**
  ```bash
  grep -r "process\.env\." src/  # lista do review
  npm run dev  # test z env vars
  ```

---

## EPIC-3: UPGRADE-REACT (React 18 → 19)

> **Completion Criteria:** Wszystkie 10 komponentów renderuje się poprawnie, `npx tsc --noEmit` = 0
> **Blocked-by:** EPIC-1 (typy)

### TASK-016: Upgrade React + ReactDOM
- **Status:** `[ ]`
- **Files:**
  - EDIT: `package.json` — `"react": "^19.0.0"`, `"react-dom": "^19.0.0"`
- **Blocked-by:** TASK-010
- **Verify:**
  ```bash
  npm install react@^19 react-dom@^19
  npm ls react  # 19.x.x
  ```

### TASK-017: Upgrade @types/react
- **Status:** `[ ]`
- **Files:**
  - EDIT: `package.json` — `"@types/react": "^19.0.0"`, `"@types/react-dom": "^19.0.0"`
- **Blocked-by:** TASK-016
- **Verify:**
  ```bash
  npm install @types/react@^19 @types/react-dom@^19 -D
  npx tsc --noEmit
  ```

### TASK-018: Migruj BrowserUI na React 19
- **Status:** `[ ]`
- **Files:**
  - EDIT: `src/components/BrowserUI.tsx`
- **Opis:**
  - Dodaj `React.lazy()` dla AIPanel, SecurityMonitor, CloudflareTunnelPanel
  - Wrap lazy panels w `<Suspense>`
  - Zamień `loadTabs` na `use()` hook (jeśli applicable)
- **Blocked-by:** TASK-017
- **Verify:**
  ```bash
  npx tsc --noEmit
  npm run dev  # UI renders, panels load lazily
  ```

### TASK-019: Migruj AIPanel na useActionState
- **Status:** `[ ]`
- **Files:**
  - EDIT: `src/components/AIPanel.tsx`
- **Opis:**
  ```tsx
  // Zamień useState+async handler na:
  const [state, submitAction, isPending] = useActionState(async (prev, formData) => {
    return await window.electronAPI.ai.execute({ prompt: formData.get('prompt') as string });
  }, null);
  ```
- **Blocked-by:** TASK-017
- **Verify:**
  ```bash
  npx tsc --noEmit
  npm run dev  # AI panel submit works
  ```

### TASK-020: Migruj AddressBar na useOptimistic
- **Status:** `[ ]`
- **Files:**
  - EDIT: `src/components/AddressBar.tsx`
- **Opis:** `useOptimistic` dla instant URL display podczas nawigacji
- **Blocked-by:** TASK-017
- **Verify:**
  ```bash
  npx tsc --noEmit
  npm run dev  # URL updates immediately on submit
  ```

### TASK-021: Migruj PluginExplorer — przenieś marketplace do IPC
- **Status:** `[ ]`
- **Files:**
  - EDIT: `src/components/PluginExplorer.tsx` — zamień bezpośredni import `marketplaceService` na `window.electronAPI.marketplace.*`
  - EDIT: `src/types/electron.d.ts` — dodaj `marketplace` namespace
  - EDIT: `src-electron/services/plugin-ipc-bridge.ts` — dodaj IPC handlers dla marketplace
- **Opis:** PluginExplorer importuje `marketplaceService` bezpośrednio (obchodzi IPC boundary). Przenieś do proper IPC.
- **Blocked-by:** TASK-017, TASK-005
- **Verify:**
  ```bash
  grep -c "from.*marketplace-service" src/components/PluginExplorer.tsx  # = 0
  npx tsc --noEmit
  ```

### TASK-022: Verify TabBar, PluginInstaller, PluginManager, SecurityMonitor, CloudflareTunnelPanel, UpdateNotification
- **Status:** `[ ]`
- **Files:**
  - CHECK: `src/components/TabBar.tsx` — stateless, powinien działać bez zmian
  - CHECK: `src/components/PluginInstaller.tsx` — verify props
  - CHECK: `src/components/PluginManager.tsx` — verify optional chaining
  - CHECK: `src/components/SecurityMonitor.tsx` — verify
  - CHECK: `src/components/CloudflareTunnelPanel.tsx` — verify
  - CHECK: `src/components/UpdateNotification.tsx` — verify event listener cleanup
- **Blocked-by:** TASK-017
- **Verify:**
  ```bash
  npx tsc --noEmit
  npm run dev  # all panels render OK
  ```

---

## EPIC-4: UPGRADE-ELECTRON (27 → 41)

> **Completion Criteria:** `npm start` launches app, all IPC channels work, tabs render
> **Blocked-by:** EPIC-2 (build), EPIC-3 (React)
> **Strategy:** Stepwise: 27→30→35→41

### TASK-023: Upgrade Electron 27 → 30
- **Status:** `[ ]`
- **Files:**
  - EDIT: `package.json` — `"electron": "^30.0.0"`
- **Blocked-by:** TASK-015, TASK-022
- **Verify:**
  ```bash
  npm install electron@^30 -D
  npm run build && npm start  # app launches
  ```

### TASK-024: BrowserView → WebContentsView migration
- **Status:** `[ ]`
- **Files:**
  - EDIT: `src-electron/services/browser-manager.ts`
- **Opis:** `BrowserView` deprecated od Electron 29. Zamień na `WebContentsView`.
- **Blocked-by:** TASK-023
- **Verify:**
  ```bash
  grep -c "BrowserView" src-electron/services/browser-manager.ts  # = 0
  npm run build && npm start  # tabs work
  ```

### TASK-025: ESM w main process
- **Status:** `[ ]`
- **Files:**
  - EDIT: `src-electron/main.ts` — zamień `require()` → `import`
  - EDIT: `tsconfig.electron.json` — `"module": "ESNext"`
- **Blocked-by:** TASK-024
- **Verify:**
  ```bash
  grep -c "require(" src-electron/main.ts  # = 0
  npm run build && npm start
  ```

### TASK-026: Upgrade Electron 30 → 35
- **Status:** `[ ]`
- **Files:**
  - EDIT: `package.json` — `"electron": "^35.0.0"`
- **Blocked-by:** TASK-025
- **Verify:**
  ```bash
  npm install electron@^35 -D
  npm run build && npm start
  ```

### TASK-027: Sandbox default adjustments
- **Status:** `[ ]`
- **Files:**
  - EDIT: `src-electron/main.ts` — verify `webPreferences.sandbox`
  - EDIT: `src-electron/preload.ts` — verify `contextBridge` still works
  - EDIT: `src-electron/services/security-sandbox.ts` — align z nowymi defaults
- **Blocked-by:** TASK-026
- **Verify:**
  ```bash
  npm run build && npm start
  # Test: AI panel, tunnel panel, plugin manager — all IPC works
  ```

### TASK-028: Upgrade Electron 35 → 41 (final)
- **Status:** `[ ]`
- **Files:**
  - EDIT: `package.json` — `"electron": "^41.0.3"`
- **Blocked-by:** TASK-027
- **Verify:**
  ```bash
  npm install electron@^41 -D
  npm run build && npm start
  ```

### TASK-029: Update electron-builder compatibility
- **Status:** `[ ]`
- **Files:**
  - EDIT: `electron-builder.config.js` — verify/update for Electron 41
  - EDIT: `package.json` — update `electron-builder` if needed
- **Blocked-by:** TASK-028
- **Verify:**
  ```bash
  npm run build
  npx electron-builder --dir  # produces unpacked app
  ```

### TASK-030: Update electron-updater
- **Status:** `[ ]`
- **Files:**
  - EDIT: `src-electron/services/auto-updater.ts`
  - EDIT: `package.json` — update `electron-updater`
- **Blocked-by:** TASK-028
- **Verify:**
  ```bash
  npm run build && npm start
  # Test: update check doesn't crash
  ```

---

## EPIC-5: UPGRADE-TOOLING + TESTS

> **Completion Criteria:** `npm test` = all pass, `npm run lint` = 0 errors, `npm run build` = OK
> **Blocked-by:** EPIC-4

### TASK-031: ESLint 8 → 10 (flat config)
- **Status:** `[ ]`
- **Files:**
  - DELETE: `.eslintrc.*` (old config)
  - CREATE: `eslint.config.js` (flat config)
  - EDIT: `package.json` — `"eslint": "^10.0.0"`
- **Blocked-by:** TASK-030
- **Verify:**
  ```bash
  npm install eslint@^10 -D
  npx eslint src/ src-electron/  # 0 config errors
  ```

### TASK-032: Playwright upgrade 1.40 → 1.58
- **Status:** `[ ]`
- **Files:**
  - EDIT: `package.json` — `"@playwright/test": "^1.58.0"`
- **Blocked-by:** TASK-030
- **Verify:**
  ```bash
  npm install @playwright/test@^1.58 -D
  npx playwright --version  # 1.58.x
  ```

### TASK-033: Test — BrowserUI component
- **Status:** `[ ]`
- **Files:**
  - CREATE: `src/__tests__/components/BrowserUI.test.tsx`
- **Opis:** Test: renderowanie, tab management, panel toggles, navigation
- **Blocked-by:** TASK-022
- **Verify:**
  ```bash
  npx jest src/__tests__/components/BrowserUI.test.tsx
  ```

### TASK-034: Test — AI Gateway
- **Status:** `[ ]`
- **Files:**
  - CREATE: `src/__tests__/services/gateway.test.ts`
- **Opis:** Test: provider selection, fallback, cache hit/miss, rate limiting
- **Blocked-by:** TASK-010
- **Verify:**
  ```bash
  npx jest src/__tests__/services/gateway.test.ts
  ```

### TASK-035: Test — Plugin Manager
- **Status:** `[ ]`
- **Files:**
  - CREATE: `src/__tests__/plugin-system/plugin-manager.test.ts`
- **Opis:** Test: load, enable, disable, unload lifecycle
- **Blocked-by:** TASK-010
- **Verify:**
  ```bash
  npx jest src/__tests__/plugin-system/plugin-manager.test.ts
  ```

### TASK-036: Test — Preload IPC channels
- **Status:** `[ ]`
- **Files:**
  - CREATE: `src-electron/__tests__/preload.test.ts`
- **Opis:** Test: all electronAPI channels are exposed correctly
- **Blocked-by:** TASK-028
- **Verify:**
  ```bash
  npx jest src-electron/__tests__/preload.test.ts
  ```

### TASK-037: Integracja MeiliSearch — history + autocomplete
- **Status:** `[ ]`
- **Files:**
  - CREATE: `src/services/search/meilisearch-client.ts`
  - CREATE: `src-electron/services/meilisearch-service.ts`
  - EDIT: `src/components/AddressBar.tsx` — autocomplete dropdown
  - EDIT: `src/types/electron.d.ts` — dodaj `search` namespace
  - EDIT: `docker-compose.yml` — dodaj MeiliSearch container
- **Blocked-by:** TASK-020 (AddressBar React 19)
- **Verify:**
  ```bash
  docker compose up meilisearch -d
  npm run dev  # AddressBar autocomplete shows history results
  ```

### TASK-038: Integracja SearXNG — private meta-search
- **Status:** `[ ]`
- **Files:**
  - EDIT: `docker-compose.yml` — dodaj SearXNG container
  - CREATE: `src-electron/services/searxng-service.ts`
  - EDIT: `src/components/AddressBar.tsx` — search queries route to SearXNG
- **Blocked-by:** TASK-037
- **Verify:**
  ```bash
  docker compose up searxng -d
  npm run dev  # search queries go through SearXNG
  ```

### TASK-039: Integracja Glance — new-tab dashboard
- **Status:** `[ ]`
- **Files:**
  - CREATE: `src/components/NewTabDashboard.tsx`
  - EDIT: `src/components/BrowserUI.tsx` — show dashboard on new tab
  - EDIT: `docker-compose.yml` — opcjonalny Glance container
- **Opis:** Inspiracja z Glance (self-hosted dashboard) — widgets: bookmarks, weather, news, recent history
- **Blocked-by:** TASK-018 (BrowserUI React 19)
- **Verify:**
  ```bash
  npm run dev  # new tab shows dashboard instead of blank
  ```

---

## DEPENDENCY GRAPH (Task-level)

```
EPIC-0 (PRE-UPGRADE)
  TASK-001 ──────────────────────────────────────┐
  TASK-002 → TASK-003                            │
  TASK-004                                       │
  TASK-005 ──────────────────────────────┐       │
                                         │       │
EPIC-1 (TypeScript 5.9)                  │       │
  TASK-006 → TASK-007 → TASK-008 ←──────┘       │
                    ↓                            │
              TASK-009                           │
              TASK-010 ─────────────────────┐    │
                                            │    │
EPIC-2 (Vite 8)                             │    │
  TASK-011 → TASK-012 → TASK-013            │    │
                    ↓                       │    │
              TASK-014                      │    │
              TASK-015 ───────────────┐     │    │
                                      │     │    │
EPIC-3 (React 19)                     │     │    │
  TASK-016 → TASK-017 → TASK-018      │     │    │
                    ↓       ↓         │     │    │
              TASK-019  TASK-020      │     │    │
              TASK-021  TASK-022 ─────┤     │    │
                                      │     │    │
EPIC-4 (Electron 41)                  │     │    │
  TASK-023 ←──────────────────────────┘     │    │
       ↓                                   │    │
  TASK-024 → TASK-025 → TASK-026           │    │
                              ↓            │    │
                         TASK-027 → TASK-028    │
                                   ↓    ↓      │
                              TASK-029 TASK-030 │
                                            │   │
EPIC-5 (Tooling + Tests)                    │   │
  TASK-031 ←────────────────────────────────┘   │
  TASK-032                                      │
  TASK-033 ← TASK-022                           │
  TASK-034 ← TASK-010                           │
  TASK-035 ← TASK-010                           │
  TASK-036 ← TASK-028                           │
  TASK-037 ← TASK-020                           │
  TASK-038 ← TASK-037                           │
  TASK-039 ← TASK-018                           │
```

---

## METRYKI PLANU

| Metryka | Wartość |
|---------|--------|
| **Łączna liczba tasków** | 39 |
| **Epics** | 6 (0-5) |
| **Pliki do modyfikacji** | ~30 existing |
| **Pliki do utworzenia** | ~10 new |
| **Pliki do usunięcia** | 1 (browser-sandbox.ts stara lokalizacja) |
| **Krytyczna ścieżka** | TASK-005 → 007 → 008 → 017 → 022 → 023 → 028 → 031 |
| **Niezależne ścieżki** | TASK-004, TASK-032, TASK-034/035 mogą iść równolegle |

---

## CHECKPOINT VERIFICATION (po każdym Epic)

```bash
# Po EPIC-0:
npx tsc --noEmit && npm run build && echo "EPIC-0 ✅"

# Po EPIC-1:
npx tsc --noEmit --strict && npm run build && echo "EPIC-1 ✅"

# Po EPIC-2:
npm run dev & sleep 5 && curl -s http://localhost:5173 > /dev/null && echo "EPIC-2 ✅"

# Po EPIC-3:
npx tsc --noEmit --strict && npm run dev && echo "EPIC-3 ✅"

# Po EPIC-4:
npm run build && npm start && echo "EPIC-4 ✅"

# Po EPIC-5:
npm test && npm run lint && npm run build && echo "EPIC-5 ✅ — ALL DONE"
```
```

---

