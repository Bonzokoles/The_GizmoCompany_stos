
# ZENO Browser — Upgrade Dependencies: Kolejne Kroki

> Skopiowano z ToDo/ jako referencia. Data: 2026-03-30
> Oryginalny plan: wygenerowany przez principal-software-engineer na podstawie context-map-20260330.md

---

## Status faz

| Faza | Pakiet | Obecna | Cel | Breaking | Status |
|------|--------|--------|-----|----------|--------|
| 1 | TypeScript | ^5.3.3 | 5.9.x | NIE | GOTOWA do uruchomienia |
| 2 | Vite | ^5.0.7 | 8.x | TAK | Wymaga FAZY 1 |
| 3 | React + Zustand | ^18.2.0 / ^4.4.1 | 19.2.x / 5.x | TAK | Wymaga FAZY 2 |
| 4 | Electron | ^27.0.0 | 41.x | TAK | Wymaga FAZY 3 |
| 5 | ESLint | ^8.55.0 | 10.x | TAK | Wymaga FAZY 4 |

---

## FAZA 1 — TypeScript 5.3 → 5.9 (Niskie ryzyko)

**Effort:** S (1-2 dni)
**Blokuje:** Faze 2+

### Komendy

```bash
npm install --save-dev typescript@^5.9.6
npx tsc --noEmit
npm run type-check:electron
npm run build
```

### Zmiany w plikach

**tsconfig.json** — dodaj:
```json
{
  "compilerOptions": {
    "moduleResolution": "bundler",
    "noEmit": true,
    "isolatedModules": true
  }
}
```

**tsconfig.electron.json** — zostaw `"moduleResolution": "node16"`

### Rollback
```bash
git checkout package.json package-lock.json tsconfig.json
npm install
```

---

## FAZA 2 — Vite 5 → 8 (Srednie ryzyko)

**Effort:** M (2-3 dni)
**Blokuje:** Faze 3+

### Komendy

```bash
npm install --save-dev vite@^8.0.0 @vitejs/plugin-react@^5.0.0
npm install --save-dev vite-plugin-electron@^0.31.0 vite-plugin-electron-renderer@^0.14.8
npm run dev
npm run build
npm run build:electron
```

### Kluczowa zmiana: vite.config.mts

Rollup 4 zmienil API dla `manualChunks` — musi byc funkcja:

```typescript
// PRZED (Rollup 3):
manualChunks: { 'react-vendor': ['react', 'react-dom'] }

// PO (Rollup 4):
manualChunks(id) {
  if (id.includes('node_modules/react')) return 'react-vendor';
  return undefined;
}
```

---

## FAZA 3 — React 18 → 19 + Zustand 4 → 5 (Wysokie ryzyko)

**Effort:** L (5-7 dni)
**Blokuje:** Faze 4+

### Komendy

```bash
npm install react@^19.2.0 react-dom@^19.2.0 zustand@^5.0.0
npm install --save-dev @types/react@^19.2.0 @types/react-dom@^19.2.0
npx tsc --noEmit
```

### Pliki Zustand (5 plikow)

- `src/store/chatBotStore.ts`
- `src/store/browserStore.ts`
- `src/store/pluginStore.ts`
- `src/hooks/useJimboKitStore.ts`
- `src/store/settingsStore.ts` (jesli istnieje)

Migracja Zustand 4 → 5:
```typescript
// PRZED: import create from 'zustand';
// PO: import { create } from 'zustand';
// Usunieto podwojne nawiasy: create<State>()((set) => ...) → create<State>((set) => ...)
```

### Nowe React 19 patterns (juz czesc zastosowana w TASK-REACT)

- `useOptimistic` — AddressBar (URL display)
- `useActionState` — AIPanel (streaming)
- `useDeferredValue` — TabBar, AddressBar autocomplete
- `useSyncExternalStore` — SecurityMonitor

---

## FAZA 4 — Electron 27 → 41 (Bardzo wysokie ryzyko)

**Effort:** XL (2+ tygodnie)
**Node.js:** 27 uzywa Node 18, 41 uzywa Node 22

### Komendy

```bash
npm install --save-dev electron@^41.0.0 electron-builder@^25.0.0
npx tsc --noEmit
npm run build:electron
```

### Krytyczne zmiany Electron 27→41

1. `contextIsolation: true` jest juz domyslne — sprawdz preload.ts
2. `nodeIntegration: false` domyslne — upewnij sie ze electron-preload-only API
3. `webSecurity: true` — moze blokowac localhost podczas dev
4. Nowe API IPC: `ipcMain.handle` dziala tak samo, ale sprawdz deprecated `ipcMain.on` z async callbacks
5. `electron-updater` wersja kompatybilna z Electron 41

### Pliki do sprawdzenia

- `src-electron/main.ts` — BrowserWindow options, security flags
- `src-electron/preload.ts` — contextBridge API (moze byc strikter)
- `src-electron/services/auto-updater.ts` — electron-updater wersja

---

## FAZA 5 — ESLint 8 → 10 (Flat config)

**Effort:** S (1-2 dni)

### Komendy

```bash
npm install --save-dev eslint@^10.0.0 @typescript-eslint/eslint-plugin@^8.0.0
npx eslint --fix src/ src-electron/
```

### Migracja konfiguracji

```bash
npx @eslint/migrate-config .eslintrc.json
```

Tworzy `eslint.config.mjs` zamiast `.eslintrc.*`.

---

## Priorytety na teraz (2026-03-30)

1. **FAZA 1** — TypeScript 5.9 (bezpieczne, brak breaking) — zacznij od razu
2. **FAZA 2** — Vite 8 (po Fazie 1, ~2-3 dni pracy)
3. Fazy 3-5 — po stabilizacji Fazy 2

## Weryfikacja po kazdej fazie

```bash
npx tsc --noEmit          # 0 errorow
npm run dev               # aplikacja startuje
npm run build             # build OK
npm run build:electron    # electron build OK
```
