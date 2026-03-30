# ZENO Browser — Context & Dependency Map

**Date:** 2026-03-30
**Agent:** context-architect
**Status:** COMPLETED — przeniesiony do History 2026-03-30

---

## Executive Summary

ZENO Browser jest zbudowany na **Electron 27 + React 19 + Vite 5**, z TypeScript-strict modularną architektura.
Projekt obejmuje **3 glowne warstwy**, **15+ lazy-loaded paneli**, **47 narzedzi IPC** (MCP Server), **9 backendowych serwisow** i **3 silniki wyszukiwania**.

### Kluczowe statystyki
- **Zmapowane pliki:** 87+
- **Kanaly IPC:** 120+ (browser, AI, network, terminal, crawler, plugins, search, sync)
- **Lazy Components:** 15 (AIPanel, SecurityMonitor, PluginHub, etc.)
- **Hotspoty (>5 deps):** 8 plikow (BrowserUI, main.ts, preload.ts, gateway.ts)
- **Circular Dependencies:** 0
- **Pokrycie testami:** minimalne (Jest/Playwright skonfigurowane, brak plikow testowych)

---

## Architektura (3 warstwy)

```
RENDERER (React 19) → IPC via window.electronAPI → MAIN (Electron) → contextBridge → PRELOAD
```

## Hotspoty

| Plik | Import Count | Ryzyko |
|------|-------------|--------|
| src/components/browser-core/BrowserUI.tsx | 18 | HIGH |
| src-electron/main.ts | 24 services + 120+ IPC | CRITICAL |
| src-electron/preload.ts | 300+ API methods | HIGH |
| src/services/ai-gateway/gateway.ts | 5 | MEDIUM |

## Circular Dependencies

Status: 0 wykrytych

## Rekomendacje

1. Podziel main.ts (1200+ linii) na ipc-registry.ts
2. Odsprzeg BrowserUI (18 zaleznosci) przez panel registry pattern
3. Dodaj testy integracyjne (Playwright E2E dla IPC flows)
4. Dodaj rate limiting dla 120+ kanalow IPC

Pelna tresc w oryginalnym pliku: .workspace_meta/ToDo/History/context-map-20260330.md (ten plik)
