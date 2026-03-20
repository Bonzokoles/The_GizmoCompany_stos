# Project Snapshots  ZENO Browser

> Generuj snapshot co ~2h aktywnej pracy.
> Format: data + czas  co zrobiono  co dalej  blokady

---

## Template

### [YYYY-MM-DD HH:MM] Snapshot

**Zrobiono:**

- punkt 1

**Następne kroki:**

- krok 1

**Blokady:** brak | opis

---

### [2026-03-20 10:00] Snapshot — Migracja React 19, kontynuacja

**Zrobiono:**

- ✅ Weryfikacja kompletności PluginHub.tsx (500 linii — 3 zakładki, inline install, inline uninstall, useTransition)
- ✅ Utworzono `src/components/PluginHub.css` — ciemny motyw konsystentny z floating-panel, 350+ linii CSS
- ✅ Zintegrowano PluginHub z BrowserUI.tsx — lazy import, przycisk 🔌, ErrorBoundary wrapping
- ✅ Utworzono brakujący `tsconfig.json` (root) — ES2020, React JSX, bundler resolution, isolatedModules
- ✅ ADR-005 dodany do decisions.md — dokumentacja migracji React 19
- ✅ Zaktualizowano project-notes.md — odkrycia, nowe pliki, security fixes
- ✅ Naprawiono 2 błędy TS w AIPanel.tsx i PluginHub.tsx — `startTransition` async wrapper (React 18 types)
- ✅ npm install + pełny `tsc --noEmit` — 0 błędów w naszych komponentach

**Pliki sesji (nowe):** tsconfig.json, src/components/PluginHub.css
**Pliki sesji (zmodyfikowane):** BrowserUI.tsx, AIPanel.tsx, PluginHub.tsx, decisions.md, project-notes.md

**Następne kroki:**

- Usunięcie starych plików: PluginManager.tsx, PluginExplorer.tsx, PluginInstaller.tsx
- Naprawienie 8 pre-existing TS errors (auto-updater, gateway, edenai, openrouter, browser-sandbox)
- CR-001: URL validation w main process (browser-manager.ts)
- CR-003: Usunięcie eval() z plugin-loader.ts
- CR-005: Dodanie Content Security Policy w main.ts
- Upgrade @types/react do 19.x gdy projekt przejdzie na React 19

**Blokady:** Brak. Pre-existing TS errors nie blokują naszych komponentów.

---

<!-- Dodawaj nowe snapshoty poniżej -->

### [2026-03-19 00:00] Snapshot  Inicjalizacja workspace

**Zrobiono:**

- Skopiowano .workspace_meta z WORKSPACE_META_TEMPLATE
- Dostosowano workspace.spec.json do projektu ZENO Browser
- Zaktualizowano decisions.md z 4 ADR-ami specyficznymi dla projektu
- Zaktualizowano project-notes.md z pełnym opisem komponentów i architektury
- Utworzono .gitignore z regułami bezpieczeństwa
- Dodano agentów domenowych do .github/agents/

**Następne kroki:**

- Weryfikacja kompilacji i testów (npm run type-check, npm test)
- Uzupełnienie brakujących konfiguracji MCP
- Analiza TODO w kodzie źródłowym

**Blokady:** brak
