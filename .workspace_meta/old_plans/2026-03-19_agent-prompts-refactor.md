# ZENO Browser — Prompty dla Agentów z Skills

> **Data:** 2026-03-19
> **Projekt:** ZENO Browser (Electron + React + Vite)
> **Cel:** Refaktoryzacja, upgrade zależności, plan rozwoju
> **PRZENIESIONY DO old_plans:** 2026-03-30 — zastąpiony przez 2026-03-30_zeno-master-orchestration.md

---

## KOLEJNOŚĆ URUCHAMIANIA

Wykonuj prompty w podanej kolejności. Każdy krok buduje na poprzednim.

---

## KROK 1 — Context Map (mapowanie zależności)

**Agent:** `@context-architect`
**Skill:** `context-map`

```
@context-map

Zmapuj pełną strukturę zależności projektu ZENO Browser.

Zakres analizy:
- src/components/ (10 plików TSX): AddressBar, AIPanel, BrowserUI, TabBar, PluginExplorer, PluginInstaller, PluginManager, SecurityMonitor, CloudflareTunnelPanel, UpdateNotification
- src/services/ (ai-gateway/, security/)
- src/plugin-system/ (core/, marketplace/)
- src-electron/ (main.ts, preload.ts, services/)

Dla każdego pliku określ:
1. Importy (od czego zależy)
2. Exporty (kto z niego korzysta)
3. Shared state (Zustand stores)
4. IPC channels (Electron main ↔ renderer)

Output:
- Tabela zależności: | Plik | Importuje z | Eksportuje do | IPC channels |
- Dependency graph (Mermaid format)
- Lista circular dependencies (jeśli są)
- Pliki bez testów
- Pliki z największą ilością zależności (hotspoty)
```

---

## KROK 2 — Refactor Plan (plan refaktoryzacji)

**Agent:** `@principal-software-engineer`
**Skill:** `refactor-plan`

```
@refactor-plan

Zaplanuj 5-fazową refaktoryzację ZENO Browser na podstawie context-map z Kroku 1.

AKTUALNY STAN ZALEŻNOŚCI:
| Pakiet        | Mamy    | Najnowsza | Breaking? |
|---------------|---------|-----------|-----------|
| Vite          | ^5.0.7  | 8.0.0     | TAK (3 major) |
| React         | ^18.2.0 | 19.2.4    | TAK (1 major) |
| Electron      | ^27.0.0 | 41.0.3    | TAK (14 major!) |
| TypeScript    | ^5.3.3  | 5.9.3     | NIE (minor) |
| ESLint        | ^8.55.0 | 10.0.3    | TAK (flat config) |
| Zustand       | ^4.4.1  | 5.0.12    | TAK (1 major) |
| Playwright    | ^1.40.1 | 1.58.2    | NIE (minor) |

WYMAGANIA:
- Faza 1: TypeScript 5.3→5.9 + strict mode (bezpieczne, brak breaking)
- Faza 2: Vite 5→8 (nowy vite.config.ts, zmiana plugin API)
- Faza 3: React 18→19 (nowe hooki: use, useActionState, useOptimistic)
- Faza 4: Electron 27→41 (migracja deprecated API, security model)
- Faza 5: ESLint 8→10 (flat config) + Zustand 4→5 + Playwright update

Dla każdej fazy:
1. Lista plików do modyfikacji
2. Kolejność zmian (types → implementations → tests)
3. Weryfikacja po fazie (npm run type-check && npm test)
4. Rollback plan jeśli faza się nie powiedzie
5. Szacowany wpływ na działające features

Output: Markdown z tabelami, fazami i checklistą.
```

---

## KROK 3 — Implementation Plan (szczegółowy plan wykonania)

**Agent:** `@context-architect`
**Skill:** `create-implementation-plan`

```
@create-implementation-plan

Cel: Upgrade zależności i refaktoryzacja ZENO Browser.

Na podstawie refactor-plan z Kroku 2, wygeneruj deterministyczny, maszynowo-czytelny plan wykonania.

WYMAGANIA:
- Każda faza = osobny Epic z measurable completion criteria
- Każdy task = atomowa zmiana w konkretnym pliku z konkretną linią
- Zależności między taskami jawnie zadeklarowane
- Każdy task ma verification step (komenda do sprawdzenia)

FAZY:
1. UPGRADE-TS: TypeScript strict + nowe typy
2. UPGRADE-VITE: Vite 8 config + plugin migration
3. UPGRADE-REACT: React 19 hooks + concurrent features
4. UPGRADE-ELECTRON: Electron 41 API migration
5. UPGRADE-TOOLING: ESLint 10 + Zustand 5 + Playwright

DODATKOWE INTEGRACJE (z LINKS.md):
- MeiliSearch → historia przeglądania + autocomplete AddressBar
- SearXNG → prywatna meta-wyszukiwarka jako default search engine
- Glance → inspiracja new-tab dashboard

Output: Zapisz plan w `.workspace_meta/ToDo/` jako `upgrade-dependencies-plan.md`
Format: TASK-001, TASK-002... z pełnymi ścieżkami plików i komendami.
```

---

## KROK 4 — Breakdown na GitHub Issues

**Agent:** `@principal-software-engineer`
**Skill:** `breakdown-plan`

---

## KROK 5 — Code Review obecnego kodu

**Agent:** `@se-security-reviewer` + `@expert-react-frontend-engineer`
**Skill:** `review-and-refactor`

---

## KROK 6 — Web UI Refactor

**Agent:** `@expert-react-frontend-engineer`
**Skill:** `web-coder`
