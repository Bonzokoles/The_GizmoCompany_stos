
# ZENO Browser — 5-Phase Upgrade Plan

> **Generated:** 2026-03-30  
> **Based on:** context-map-20260330.md  
> **Agent:** principal-software-engineer  
> **Strategy:** Incremental, tested phases with rollback capability

---

## Target Versions

| Package | Current | Target | Breaking? | Priority |
|---------|---------|--------|-----------|----------|
| **TypeScript** | ^5.3.3 | 5.9.x | ❌ NO | Phase 1 |
| **Vite** | ^5.0.7 | 8.x | ⚠️ YES (Rollup 3→4) | Phase 2 |
| **React** | ^18.2.0 | 19.2.x | ⚠️ YES | Phase 3 |
| **Electron** | ^27.0.0 | 41.x | ⚠️ YES (Node 20) | Phase 4 |
| **ESLint** | ^8.55.0 | 10.x | ⚠️ YES | Phase 5 |
| **Zustand** | ^4.4.1 | 5.x | ⚠️ YES | Phase 3 |

---

## PHASE 1: TypeScript 5.3 → 5.9 (Non-Breaking)

**Effort:** S (Small — 1-2 days)  
**Risk:** Low (no breaking changes)  
**Blocked-by:** None

### Files to Modify

#### 1.1 Update package.json
```json
{
  "devDependencies": {
    "typescript": "^5.9.6"
  }
}
```

#### 1.2 Update tsconfig.json — enable new features
**File:** `tsconfig.json`
```json
{
  "compilerOptions": {
    "moduleResolution": "bundler",  // New in 5.4
    "noEmit": true,
    "isolatedModules": true
  }
}
```

#### 1.3 Update tsconfig.electron.json
**File:** `tsconfig.electron.json`
```json
{
  "compilerOptions": {
    "moduleResolution": "node16"  // Electron still uses Node.js
  }
}
```

### Affected Files (Type Errors Expected — 0)
- ✅ All `src/**/*.ts`, `src/**/*.tsx` (syntax compatible)
- ✅ All `src-electron/**/*.ts` (syntax compatible)

### Verification
```bash
npm install
npx tsc --noEmit
npm run type-check:electron
npm run build
```

### Rollback Plan
```bash
git checkout package.json package-lock.json
npm install
```

---

## PHASE 2: Vite 5 → 8 (Breaking — Rollup 3 → 4)

**Effort:** M (Medium — 2-3 days)  
**Risk:** Medium (build output changes, plugin API updates)  
**Blocked-by:** PHASE 1

### Files to Modify

#### 2.1 Update package.json
```json
{
  "devDependencies": {
    "vite": "^8.0.0",
    "@vitejs/plugin-react": "^5.0.0",
    "vite-plugin-electron": "^0.31.0",
    "vite-plugin-electron-renderer": "^0.14.8"
  }
}
```

#### 2.2 Update vite.config.mts
**File:** `vite.config.mts` (lines 1-87)

**Changes:**
1. **Rollup 4 config updates** (lines 20-40)
   - `output.manualChunks` → requires function signature change
   - `onwarn` handler → updated API
2. **Plugin API** (lines 50-80)
   - `vite-plugin-electron` → updated `entry` syntax
   - `vite-plugin-electron-renderer` → updated `preload` config

**Before:**
```typescript
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
        }
      }
    }
  }
})
```

**After:**
```typescript
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react')) return 'react-vendor';
          return undefined;
        }
      }
    }
  }
})
```

#### 2.3 Update index.html (if needed)
**File:** `index.html`, `ai-hub/index.html`
- Verify HMR script injection still works
- Check `<script type="module" src="/src/main.tsx">` path

### Affected Files (58 files — NO code changes needed)
- ✅ All components (Vite handles bundling)
- ⚠️ `vite.config.mts` (manual update required)
- ⚠️ Build scripts: `scripts/build-*.js` (if they reference Rollup APIs)

### Verification
```bash
npm install
npm run dev  # Check HMR works
npm run build
npm run preview  # Verify production build
npm run build:electron  # Verify Electron build
```

### Rollback Plan
```bash
git checkout package.json package-lock.json vite.config.mts
npm install
```

---

## PHASE 3: React 18.2 → 19.2 + Zustand 4 → 5 (Breaking)

**Effort:** L (Large — 5-7 days)  
**Risk:** High (component API changes, Zustand state access patterns)  
**Blocked-by:** PHASE 2

### Files to Modify

#### 3.1 Update package.json
```json
{
  "dependencies": {
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "zustand": "^5.0.0"
  },
  "devDependencies": {
    "@types/react": "^19.2.0",
    "@types/react-dom": "^19.2.0"
  }
}
```

#### 3.2 Zustand Migration (5 files)

**React 19 Changes:**
- `use` hook (new for promises)
- `useActionState` replaces `useFormState`
- `useOptimistic` for optimistic UI
- `ref` as callback cleanup instead of `useEffect`

**Zustand 5 Changes:**
- `create` signature change: `create<State>()((set, get) => ({...}))` → `create<State>((set, get) => ({...}))`

**Files:**
1. **`src/store/chatBotStore.ts`** (lines 1-85)
   - Update `create()` syntax
   - Replace `(set, get)` → new signature
2. **`src/store/browserStore.ts`** (lines 1-60)
   - Same Zustand 5 migration
3. **`src/store/pluginStore.ts`** (lines 1-40)
   - Same Zustand 5 migration
4. **`src/hooks/useJimboKitStore.ts`** (lines 1-25)
   - Update `create()` syntax
5. **`src/store/settingsStore.ts`** (if exists)
   - Same Zustand 5 migration

**Example Migration:**

**Before (Zustand 4):**
```typescript
import create from 'zustand';
const useStore = create<State>()((set, get) => ({
  count: 0,
  increment: () => set({ count: get().count + 1 })
}));
```

**After (Zustand 5):**
```typescript
import { create } from 'zustand';
const useStore = create<State>((set, get) => ({
  count: 0,
  increment: () => set({ count: get().count + 1 })
}));
```

#### 3.3 React Component Updates (30 files)

**3.3.1 BrowserUI.tsx (CRITICAL — 18 dependencies)**
**File:** `src/components/browser-core/BrowserUI.tsx` (lines 1-447)

**Changes:**
1. **Lazy imports** (lines 10-25): Verify React 19 compatibility
   ```typescript
   const AIPanel = lazy(() => import('../ai/AIPanel'));
   // No changes needed, but test loading behavior
   ```
2. **IPC event listeners** (lines 100-120): Replace cleanup with ref callback
   ```typescript
   // BEFORE (React 18):
   useEffect(() => {
     const unsubscribe = window.electronAPI.on('browser:navigate-back', handler);
     return () => unsubscribe();
   }, []);

   // AFTER (React 19):
   const unsubscribeRef = useRef<() => void>();
   useEffect(() => {
     unsubscribeRef.current = window.electronAPI.on('browser:navigate-back', handler);
   }, []);
   useEffect(() => () => unsubscribeRef.current?.(), []);
   ```
3. **Panel state** (lines 200-300): No changes (controlled by local state)

**3.3.2 AIPanel.tsx** (lines 1-137)
- **useTransition** already used → verify React 19 compatibility (should work)
- Update IPC calls if needed

**3.3.3 AddressBar.tsx** (lines 1-60)
- ✅ No breaking changes (uses `useState`, `useCallback`)

**3.3.4 TabBar.tsx** (lines 1-56)
- Verify `memo()` still works (React 19 compatible)

**3.3.5 14 Lazy-Loaded Panels**
| File | Lines | Changes Needed |
|------|-------|----------------|
| SecurityMonitor.tsx | 64 | ✅ None |
| CloudflareTunnelPanel.tsx | 118 | Replace `useEffect` cleanup |
| PluginHub.tsx | 80 | ✅ None (composition only) |
| PluginExplorer.tsx | 125 | Replace `useEffect` cleanup (marketplace polling) |
| PluginInstaller.tsx | 85 | ✅ None |
| PluginManager.tsx | 92 | ✅ None |
| UpdateNotification.tsx | 97 | Replace IPC listener cleanup |
| AIGatewayPanel.tsx | 120 | Replace `useEffect` cleanup (metrics polling) |
| TerminalPanel.tsx | 150+ | Replace `useEffect` cleanup (output stream) |
| CatalogBrowser.tsx | 100+ | ✅ None |
| KnowledgeHubPanel.tsx | 170+ | ✅ None |
| AgentsCreatorPanel.tsx | 280+ | Replace `useEffect` cleanup (RAG indexing) |
| CopilotDevPanel.tsx | 100+ | Replace `useEffect` cleanup (SDK status) |
| JimboKitPanel.tsx | 90+ | Replace WebSocket cleanup |

### Verification
```bash
npm install
npx tsc --noEmit  # Check type errors
npm run dev  # Test in dev mode
npm run build
npm run test  # Run component tests (if exist)
```

### Rollback Plan
```bash
git stash  # Save all component changes
git checkout package.json package-lock.json
npm install
git stash pop  # If reverting specific files only
```

---

## PHASE 4: Electron 27 → 41 (Breaking — Node 20, IPC Security)

**Effort:** XL (Extra Large — 7-10 days)  
**Risk:** Critical (IPC security model changed, context isolation strict)  
**Blocked-by:** PHASE 3

### Files to Modify

#### 4.1 Update package.json
```json
{
  "devDependencies": {
    "electron": "^41.0.0",
    "electron-builder": "^25.0.0",
    "vite-plugin-electron": "^0.31.0",
    "vite-plugin-electron-renderer": "^0.14.8"
  }
}
```

#### 4.2 main.ts — Security Hardening (CRITICAL)
**File:** `src-electron/main.ts` (lines 1-1178)

**Changes:**

**4.2.1 BrowserWindow Creation** (lines 80-120)
```typescript
// BEFORE (Electron 27):
const mainWindow = new BrowserWindow({
  webPreferences: {
    contextIsolation: true,  // Already enabled (CR-005)
    nodeIntegration: false,
    preload: path.join(__dirname, 'preload.js')
  }
});

// AFTER (Electron 41 — stricter defaults):
const mainWindow = new BrowserWindow({
  webPreferences: {
    contextIsolation: true,  // Required (throws error if false)
    nodeIntegration: false,  // Required
    sandbox: true,  // NEW — stricter than CR-005
    webSecurity: true,  // Enforce CSP
    allowRunningInsecureContent: false,
    preload: path.join(__dirname, 'preload.js')
  }
});
```

**4.2.2 IPC Handler Validation** (lines 300-1000)

**Problem:** Electron 41 requires explicit IPC channel whitelisting via `ipcMain.handle` **and** sender origin validation.

**Example Fix (apply to all 120+ handlers):**

**Before:**
```typescript
ipcMain.handle('browser:navigate', async (event, url: string) => {
  await browserManager.navigate(url);
});
```

**After:**
```typescript
ipcMain.handle('browser:navigate', async (event, url: string) => {
  // Validate sender origin (防 malicious renderer injection)
  if (!event.senderFrame.url.startsWith('file://')) {
    throw new Error('Unauthorized IPC call');
  }
  await browserManager.navigate(url);
});
```

**Affected Handlers:** 120+ (see context-map IPC Channel Map)
- ✅ Already validated: `browser:*` (CR-001 applied)
- ⚠️ Need validation: `ai:*`, `network:*`, `terminal:*`, `plugin:*`, `catalog:*`, `hub:*`, `ac:*`, `cms:*`, `sync:*`, `umami:*`, `copilot:*`, `mcp:*`, `search:*`, `meili:*`, `websurfx:*`, `sist2:*`, `workflow:*`, `crawler:*`, `tunnel:*`, `updater:*`, `dialog:*`, `file:*`, `theme:*`, `window:*`, `tabs:*`, `security:*`

**Automated Fix Strategy:**
```typescript
// util function in main.ts
function validateIPC(event: Electron.IpcMainInvokeEvent): void {
  const allowedProtocols = ['file://', 'app://'];
  const senderURL = event.senderFrame.url;
  if (!allowedProtocols.some(proto => senderURL.startsWith(proto))) {
    throw new Error(`IPC call from unauthorized origin: ${senderURL}`);
  }
}

// Apply to all handlers:
ipcMain.handle('browser:navigate', async (event, url: string) => {
  validateIPC(event);  // ← Add this line
  await browserManager.navigate(url);
});
```

#### 4.3 preload.ts — Context Bridge Hardening
**File:** `src-electron/preload.ts` (lines 1-360)

**Electron 41 Changes:**
1. **`contextBridge.exposeInMainWorld` now throws** if object contains functions with Node.js primitives (Buffer, Stream, etc.)
2. **Must serialize all return values** explicitly

**Before:**
```typescript
contextBridge.exposeInMainWorld('electronAPI', {
  terminal: {
    execute: (command: string) => ipcRenderer.invoke('terminal:execute', command)
    // Returns Promise<{ stdout: Buffer }> ← BREAKS in Electron 41
  }
});
```

**After:**
```typescript
contextBridge.exposeInMainWorld('electronAPI', {
  terminal: {
    execute: async (command: string) => {
      const result = await ipcRenderer.invoke('terminal:execute', command);
      return {
        ...result,
        stdout: result.stdout.toString('utf-8')  // Serialize Buffer → string
      };
    }
  }
});
```

**Affected Namespaces:** 24 (see context-map preload.ts analysis)
- ⚠️ `terminal.*` (returns Buffers)
- ⚠️ `file.*` (returns file descriptors)
- ⚠️ `catalog.readFile()` (returns Buffer)
- ⚠️ `sync.*` (returns SQLite primitives)

#### 4.4 Service Updates (24 files)

All services in `src-electron/services/` must:
1. **Validate IPC sender** (use `validateIPC()` helper)
2. **Remove Node.js primitives** from return types
3. **Update electron-log** (new API in Electron 41)

**Files:**
- ✅ `auto-updater.ts` (CR-022 already applied)
- ⚠️ `browser-manager.ts` (validate sender)
- ⚠️ `ai-gateway-service.ts` (validate sender)
- ⚠️ `network-monitor.ts` (validate sender)
- ⚠️ `security-sandbox.ts` (validate sender)
- ⚠️ `plugin-ipc-bridge.ts` (validate sender + serialize plugin metadata)
- ⚠️ `network-manager.ts` (validate sender)
- ⚠️ `tab-communication.ts` (validate sender)
- ⚠️ `workflow-engine.ts` (validate sender)
- ⚠️ `crawler-service.ts` (validate sender)
- ⚠️ `umami-service.ts` (validate sender + axios response serialization)
- ⚠️ `searxng-service.ts` (validate sender)
- ⚠️ `catalog-service.ts` (validate sender + Buffer → string in readFile)
- ⚠️ `search-service.ts` (validate sender)
- ⚠️ `meilisearch-service.ts` (validate sender)
- ⚠️ `websurfx-service.ts` (validate sender)
- ⚠️ `sist2-service.ts` (validate sender)
- ⚠️ `sync-service.ts` (validate sender + SQLite serialization)
- ⚠️ `knowledge-hub-service.ts` (validate sender)
- ⚠️ `agents-creator-service.ts` (validate sender)
- ⚠️ `copilot-sdk-service.ts` (validate sender)
- ⚠️ `copilot-runtime-server.ts` (HTTP server, no IPC)
- ⚠️ `tunnel-ui-bridge.ts` (validate sender)
- ⚠️ `mcp-server.ts` (HTTP/SSE server, no IPC)

### Verification
```bash
npm install
npm run build:electron
npm run start:electron  # Test all IPC flows manually
npm run test:e2e  # Playwright tests (if exist)

# Security audit:
npx electronegativity .
```

### Rollback Plan
```bash
git stash  # Save all Electron changes
git checkout package.json package-lock.json src-electron/
npm install
git stash pop  # If reverting specific files
```

---

## PHASE 5: ESLint 8 → 10 (Breaking — Flat Config)

**Effort:** M (Medium — 2-3 days)  
**Risk:** Low (linting only, no runtime impact)  
**Blocked-by:** PHASE 4

### Files to Modify

#### 5.1 Update package.json
```json
{
  "devDependencies": {
    "eslint": "^10.0.0",
    "@typescript-eslint/eslint-plugin": "^8.0.0",
    "@typescript-eslint/parser": "^8.0.0",
    "eslint-plugin-react": "^7.36.0",
    "eslint-plugin-react-hooks": "^5.0.0"
  }
}
```

#### 5.2 Migrate .eslintrc.cjs → eslint.config.mjs
**Delete:** `.eslintrc.cjs`  
**Create:** `eslint.config.mjs`

**Before (.eslintrc.cjs):**
```javascript
module.exports = {
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended'
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: './tsconfig.json'
  }
};
```

**After (eslint.config.mjs):**
```javascript
import js from '@eslint/js';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import reactPlugin from 'eslint-plugin-react';

export default [
  js.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.json'
      }
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      'react': reactPlugin
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      ...reactPlugin.configs.recommended.rules
    }
  }
];
```

#### 5.3 Update package.json scripts
```json
{
  "scripts": {
    "lint": "eslint .",
    "lint:fix": "eslint . --fix"
  }
}
```

### Verification
```bash
npm install
npm run lint
npm run lint:fix  # Auto-fix issues
```

### Rollback Plan
```bash
git checkout package.json package-lock.json eslint.config.mjs .eslintrc.cjs
npm install
```

---

## Global Rollback Strategy

If **any phase fails catastrophically**:

```bash
# 1. Restore entire workspace
git reset --hard HEAD~1

# 2. Restore dependencies
npm install

# 3. Verify old versions work
npm run dev
npm run build

# 4. Review logs
git log --oneline -5
git diff HEAD~1
```

---

## Testing Checklist (After Each Phase)

- [ ] `npm run type-check` — 0 TypeScript errors
- [ ] `npm run lint` — 0 ESLint errors
- [ ] `npm run build` — success
- [ ] `npm run dev` — HMR works, no console errors
- [ ] `npm run build:electron` — success
- [ ] `npm run start:electron` — app launches, no crashes
- [ ] Manual IPC test: Open all 15 panels, trigger IPC calls (browser nav, AI chat, plugin install, terminal execute, catalog add, etc.)
- [ ] Security audit: `npx electronegativity .` — 0 critical findings

---

## Effort Summary

| Phase | Effort | Days | Risk |
|-------|--------|------|------|
| 1 — TypeScript 5.9 | S | 1-2 | Low |
| 2 — Vite 8 | M | 2-3 | Medium |
| 3 — React 19 + Zustand 5 | L | 5-7 | High |
| 4 — Electron 41 | XL | 7-10 | Critical |
| 5 — ESLint 10 | M | 2-3 | Low |
| **TOTAL** | — | **17-25 days** | — |

---

## Next Steps

1. ✅ **TASK-MAP complete** → Context map created
2. ⏭️ **TASK-REACT** → Use this plan to start React 19 refactor (Phase 3)
3. ⏭️ **TASK-TDD** → Add tests after each phase

**Generated by:** principal-software-engineer (via context-architect agent)  
**Timestamp:** 2026-03-30T15:30:00Z
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

