# Refaktoryzacja i Plan Rozwoju ZENO Browser

**priority:** high
**created:** 2026-03-19T01:30:00
**scope:** full-stack refactoring + dependency upgrade + feature integration

---

## Cel

Przeprowadzić pełną refaktoryzację projektu ZENO Browser:
1. Upgrade zależności (Vite 5→8, React 18→19, Electron 27→41, TypeScript 5.3→5.9, ESLint 8→10)
2. Analiza i poprawa architektury komponentów
3. Integracja wybranych narzędzi z LINKS.md
4. Plan wykonania w fazach z weryfikacją po każdej fazie

## Skills do aktywacji

| Skill | Cel |
|-------|-----|
| `refactor-plan` | Zaplanowanie sekwencji zmian |
| `create-implementation-plan` | Szczegółowy plan wykonalny przez AI/człowieka |
| `breakdown-plan` | Podział na Epic > Feature > Story |
| `context-map` | Mapa zależności między plikami |
| `review-and-refactor` | Code review istniejącego kodu |
| `web-coder` | Implementacja zmian UI/komponentów |

## Agenci

| Agent | Rola |
|-------|------|
| `context-architect` | Analiza zależności, sekwencja zmian |
| `expert-react-frontend-engineer` | Upgrade React 18→19, nowe hooki |
| `principal-software-engineer` | Przegląd architektury, decyzje techniczne |
| `se-security-reviewer` | Audyt bezpieczeństwa po upgrade |

## Pliki do modyfikacji

| Plik | Zmiana |
|------|--------|
| package.json | Upgrade zależności |
| src/components/*.tsx | React 19 patterns, performance |
| src/services/ai-gateway/ | Refaktor providerów |
| src-electron/main.ts | Electron 41 API changes |
| src/plugin-system/ | Architektura pluginów |
| vite.config.ts | Vite 8 config (nowy plik) |
| tsconfig*.json | TypeScript 5.9 strict mode |

## Integracje z LINKS.md

| Narzędzie | Zastosowanie w ZENO |
|-----------|---------------------|
| MeiliSearch | Wyszukiwanie w historii przeglądania |
| Glance dashboard | Dashboard przeglądarki/statystyk |
| awesome-cloudflare | Rozszerzenie CloudflareTunnel |
| PostHog/Plausible | Analytics użytkowania |
| SearXNG | Meta-wyszukiwarka prywatna |
| awesome-tor | Moduł prywatności/anonimowości |
