# WORKSPACE_META_DATA — Główny Mózg Projektu

Centralny system wiedzy i dokumentacji dla ekosystemu ZENO Browser / JIMBO / BUCH.
Czytaj ten plik jako pierwszy. Reszta dokumentacji rozgałęzia się stąd.

---

## Architektura systemu

```
WORKSPACE_META_DATA/
│
├── README.md               ← TEN PLIK — start tutaj
├── step_01.md              ← Inicjalizacja i setup nowego projektu
├── step_02.md              ← Codzienna praca z JIMBO (jak prowadzić sesję AI)
├── step_03.md              ← Zarządzanie projektami (folder projekty/)
├── step_04.md              ← Prompty i narzędzia (folder prompty/, addons/)
│
├── projekty/               ← Jeden podfolder na projekt
│   ├── ZENO_Browser/       — notatki, status, decyzje dla ZENO
│   ├── JIMBO_HUB/          — notatki dla JIMBO agent HUB
│   └── BUCH/               — notatki dla BUCH (Cloudflare D1/R2 layer)
│
├── pomoce/                 ← Cheatsheets, quick-ref, komendy do kopiowania
│
├── addons/                 ← Integracje, konfiguracje MCP, wtyczki, narzędzia zewnętrzne
│
├── prompty/                ← Szablony promptów dla różnych scenariuszy
│   ├── jimbo/              — prompty specyficzne dla JIMBOKit (:3701)
│   └── buch/               — prompty dla BUCH (:5180, Cloudflare)
│
├── raporty/                ← Raporty i analizy generowane przez AI
│
├── logi/                   ← Logi błędów, debug notes, historia akcji AI
│
├── .github/
│   ├── agents/             — definicje agentów Claude Code
│   └── skills/             — skill-sety (commit, plan, spec...)
│
└── .workspace_meta/        ← Katalog narzędzi (GIT_HOOB), dashboard, history
    ├── tools-catalog.html  — otwórz w przeglądarce
    ├── project-dashboard.html
    ├── scripts/
    ├── History/
    ├── ToDo/
    └── notes/
```

---

## Warstwy systemu AI

| Warstwa | Serwis | Port | Odpowiada za |
|---------|--------|------|-------------|
| Lokalna | JIMBOKit | 3701 | FS, web_search, kb_search, read/list pliki |
| Cloud | BUCH | 5180 | Cloudflare D1, R2 — zapis/odczyt danych |
| Hub | JIMBO_agent_HUB | 4224 | Orkiestracja agentów, skills, sessions |
| Browser | ZENO Electron | 5173 | UI, panels, preload IPC |

---

## Szybki start

1. Przeczytaj `step_01.md` — pierwsze uruchomienie
2. Przeczytaj `step_02.md` — jak pracować z JIMBO dzień po dniu
3. Przy nowym projekcie → `projekty/<NazwaProjektu>/`
4. Nowy prompt → `prompty/jimbo/` lub `prompty/buch/`
5. Coś nie działa → `logi/` + `step_02.md` sekcja Debug

---

## Zasady prowadzenia dokumentacji

- **Jeden folder na projekt** w `projekty/` — status.md, notatki, decyzje
- **Raporty AI** lądują w `raporty/` z datą w nazwie: `2026-04-17_analiza_ZENO.md`
- **Logi błędów** w `logi/` — krótko: data, symptom, fix lub otwarty problem
- **Prompty** w `prompty/` — każdy plik = jeden scenariusz użycia
- **Addons** w `addons/` — każda integracja ma swój podfolder z README

---

*WORKSPACE_META_DATA v1.0 | Bonzo + JIMBO System | 2026*

---

## 🆕 Ostatnie Aktualizacje

### 2026-04-26: JIMBOKIT_COMMS Refactoring ✅

**Problem:** API connection między JIMbo_kit a Backend, format inconsistency (markdown vs JSON).

**Rozwiązanie:** Zrefaktorowano system komunikacji agent-agent:
- ✅ **Struktura folderów:** `JIMBOKIT_COMMS/` → `tasks/`, `results/`, `archive/`, `schemas/`
- ✅ **Format:** Markdown → JSON Schema (ajv validation)
- ✅ **API:** Dodano REST endpoints w JIMBO_agent_HUB (port 4224)
- ✅ **Komponenty:**
  - `comms-validator.ts` — JSON Schema validation
  - `comms-helper.ts` — UI helpers
  - PiBridge — zaktualizowany do nowej struktury
- ✅ **Bezpieczeństwo:** Feature flag (`USE_HUB_API`) dla instant rollback
- ✅ **Kompatybilność:** 2-tygodniowy fallback do starego systemu

**Status:** FAZA 0-3 done (10h/13h), testowanie w toku

**Testy:**
- Validator: 7/7 ✅
- Integracja (HUB + PiBridge): 6/6 ✅
- UI Manual: ⏳ Do wykonania

**Commits:**
- `03dc2b0` — FAZA 0: Struktura + schemas
- `e3f7f18` — FAZA 1: Validator
- `bbaaa49` — FAZA 2: HUB API + PiBridge
- `7c96072` — FAZA 3: UI feature flag
- `a693337` — Dokumentacja

**Dokumentacja zaktualizowana:**
- `JIMBOKIT_COMMS/IMPLEMENTACJA_PODSUMOWANIE.md`
- `JIMBOKIT_COMMS/PLAN_WDROZENIA.md`
- `WORKSPACE_META_DATA/pomoce_mapy_projekt/01_architektura_warstw.md`
- `WORKSPACE_META_DATA/pomoce_mapy_projekt/02_komunikacja_agentow.md`
- `WORKSPACE_META_DATA/pomoce_mapy_projekt/04_flow_zadan.md`
- `WORKSPACE_META_DATA/pomoce_mapy_projekt/ANALIZA_PRZEPŁYWU_DANYCH.md`

**Następne kroki:**
1. FAZA 4 (opcjonalna, ~1-2 tygodnie): Delegacja w JIMBO_KIT → endpoint `/delegate-to-pi`
2. FAZA 5 (za 2 tygodnie): Cleanup fallbacków, finalizacja

---

**Aktualne priorytety projektu:**
1. 🟢 **JIMBOKIT_COMMS** — testowanie nowego systemu
2. 🔵 **Workspace cleanup** — archiwizacja niepotrzebnych plików
3. ⚪ **React 18→19** — w kolejce (za React 19 stabilizacja)
4. ⚪ **Vite 5→8** — w kolejce
