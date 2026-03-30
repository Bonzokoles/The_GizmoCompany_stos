# .workspace_meta — Workspace Intelligence Layer

> **Wersja:** 2.0.0 | **Autor:** Bonzokoles  
> **Utworzono:** 14.02.2026 | **Zaktualizowano:** 11.03.2026  
> **Cel:** Uniwersalny meta-folder dołączany do KAŻDEGO nowego workspace

---

## Co to jest?

`.workspace_meta` to folder-standard który zapewnia każdemu workspace:
1. **Spójną strukturę** — ten sam układ w każdym projekcie
2. **Definition of Done** — interaktywny dashboard (HTML) z 90+ skillami, task listą i awesome-copilot
3. **Specyfikację workspace** — maszynowo-czytelny opis projektu
4. **Konfigurację MCP** — gotowy template serwerów MCP (+ awesome-copilot MCP)
5. **Notes** — ustrukturyzowane miejsce na decyzje i notatki
6. **ToDo / History** — plikowy system tasków (File System Access API)
7. **Secrets** — lokalne klucze API (NIGDY nie commituj!)

## Jak użyć?

### Nowy workspace:
```powershell
# Skopiuj cały folder do roota nowego workspace
Copy-Item -Recurse "C:\WORKSPACE_META_TEMPLATE\.workspace_meta" "ŚCIEŻKA_DO_WORKSPACE\.workspace_meta"
```

### Po skopiowaniu:
1. Otwórz `workspace.spec.json` → wypełnij pola `metadata.*`
2. Otwórz `mcp/config.json` → dodaj swoje serwery MCP
3. Otwórz `Definition_of_done.html` w przeglądarce → gotowy dashboard
4. Zacznij dokumentować decyzje w `notes/decisions.md`
5. Dodaj `.workspace_meta/secrets/` do `.gitignore`

## Struktura

```
.workspace_meta/
├── README.md                    ← ten plik
├── Definition_of_done.html      ← Dashboard v4.0 (90+ skills, ToDo/History, DoD)
├── workspace.spec.json          ← specyfikacja projektu (template)
├── mcp/
│   └── config.json              ← konfiguracja MCP serwerów (+ awesome-copilot)
├── notes/
│   ├── decisions.md             ← ADR — Architecture Decision Records
│   └── snapshots.md             ← snapshoty stanu projektu
├── ToDo/                        ← aktywne taski (.md) — zarządzane przez dashboard
│   └── README.md
├── History/                     ← ukończone taski (.md) — archiwum z notatkami
│   └── README.md
└── secrets/                     ← lokalne klucze API (GITIGNORE!)
    └── README.md
```

## Dashboard — Definition_of_done.html

- **90+ skilli** w 16 kategoriach (6 bazowych + 10 z awesome-copilot ⭐)
- **ToDo / History** — plikowy system tasków z File System Access API
- **DoD checklist** — Definition of Done z walidacją
- **Notes** — notatki projektowe z eksportem do pliku
- **Zero zależności** — standalone HTML, localStorage + opcjonalny filesystem

### Kategorie skilli
| Bazowe | awesome-copilot ⭐ |
|--------|-------------------|
| Architecture | 🌐 Web Dev |
| Business | 🧪 Testing |
| Data & AI | 🔀 Git Workflow |
| Development | 📄 Documentation |
| Infrastructure | 📐 Planning |
| UI/UX | 🔧 Refactoring |
| | 🗄️ Database |
| | 🤖 AI Tools |
| | 🐙 GitHub |
| | ⚙️ Meta |

## Zasady

- **NIE commituj** `.workspace_meta/secrets/` — NIGDY
- **NIE commituj** `mcp/config.json` jeśli zawiera klucze API
- **ZAWSZE** aktualizuj `workspace.spec.json` po zmianie architektury
- **Definition_of_done.html** działa standalone — zero zależności
- **notes/** — generuj snapshot co ~2h aktywnej pracy
- **ToDo/History** — dashboard zarządza plikami, nie edytuj ręcznie

---

## Stan projektu (2026-03-19)

| Komponent | Status | Szczegóły |
|-----------|--------|-----------|
| Struktura folderów | ✅ 100% | notes, ToDo, History, mcp, secrets |
| workspace.spec.json | ✅ Wypełniony | v2.0.0, pełna specyfikacja template |
| Definition_of_done.html | ✅ Gotowy | 90+ skills, 16 kategorii, DoD checklist |
| awesome-copilot | ✅ 1371 plików | 14 kategorii: skills (456), agents (177), instructions (176), plugins (343)... |
| Notes (ADR + snapshots) | ✅ Gotowe | 3 ADR, 1 snapshot inicjalizacyjny |
| MCP config | ✅ Template | GitHub, Supabase, awesome-copilot |
| **Etap ogólny** | **✅ 95%** | **Gotowy do użycia — brak blokujących braków** |

Szczegółowy opis: `notes/project-notes.md`

---

*Template v2.0 managed by Bonzokoles workspace system*
