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
