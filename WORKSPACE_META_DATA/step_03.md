# Step 03 — Zarządzanie Projektami

## Folder `projekty/`

Każdy projekt = osobny podfolder. Nie mieszaj projektów w jednym pliku.

```
projekty/
├── ZENO_Browser/     ← główna apka Electron
├── JIMBO_HUB/        ← agent hub + skills system
├── BUCH/             ← Cloudflare D1/R2 layer
└── <NoweProjekt>/    ← tworzysz gdy zaczynasz nowy projekt
```

---

## Struktura folderu projektu

```
projekty/NazwaProjektu/
├── status.md       ← JEDYNE źródło prawdy o aktualnym stanie
├── decyzje.md      ← architektoniczne/techniczne decyzje + DLACZEGO
├── notatki.md      ← scratch pad, linki, cytaty, TODO w toku
└── todo.md         ← lista zadań z priorytetami
```

### status.md — format

```markdown
# Status: NazwaProjektu
Ostatnia aktualizacja: YYYY-MM-DD

## Aktywne zadania
- [ ] Zadanie A — @assignee — deadline
- [x] Zadanie B — DONE

## Blokery
- Brak / lub opis blokera

## Ostatnie zmiany
- 2026-04-17: co zrobiono

## Następny krok
- Konkretna akcja
```

### decyzje.md — format

```markdown
## [YYYY-MM-DD] Tytuł decyzji

**Kontekst:** dlaczego stanęliśmy przed tym wyborem
**Decyzja:** co wybraliśmy
**Dlaczego:** uzasadnienie — fakty, nie opinie
**Alternatywy odrzucone:** co i dlaczego nie
**Skutki:** co ta decyzja zmienia
```

---

## Aktualny stan projektów

### ZENO_Browser
- Repo: `u:/WWW_Zen_BRo_wser_org3/`
- Build: Electron + Vite + React + CF Pages
- Dev: `npm run dev` (port 5173 Vite + Electron)
- CI: GitHub Actions → CF Pages deploy

### JIMBO_HUB
- Lokalizacja: `u:/WWW_Zen_BRo_wser_org3/JIMBO_agent_HUB/`
- Port: 4224
- Skills DB: `JIMBO_agent_HUB/skills/`

### BUCH
- Lokalizacja: `u:/The_DEVz_HUB_of_work/BUCH_DEVz_CHat_box/`
- Port: 5180
- Cloud: Cloudflare D1 (baza) + R2 (pliki)
- WORKSPACE_META: `BUCH_DEVz_CHat_box/WORKSPACE_META/`

---

## Kiedy tworzyć nowy folder projektu?

Gdy zaczynasz pracę nad czymś co:
- Trwa więcej niż 1 sesję
- Ma własne repo lub osobny deployment
- Generuje decyzje techniczne do zapamiętania
