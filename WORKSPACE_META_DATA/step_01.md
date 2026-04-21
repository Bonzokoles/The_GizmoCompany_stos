# Step 01 — Inicjalizacja i Setup

## Co to jest WORKSPACE_META_DATA?

Centralny rejestr wiedzy projektu. Nie kod — dokumentacja, decyzje, historia, prompty.
JIMBO i BUCH czytają stąd kontekst przed zadaniami. Bonzo ma tu wszystko w jednym miejscu.

---

## Pierwsze uruchomienie

### 1. Zweryfikuj ścieżki

| Co | Gdzie |
|----|-------|
| WORKSPACE_META_DATA | `u:/WWW_Zen_BRo_wser_org3/WORKSPACE_META_DATA/` |
| BUCH WORKSPACE_META | `u:/The_DEVz_HUB_of_work/BUCH_DEVz_CHat_box/WORKSPACE_META/` |
| JIMBOKit server.ts | `u:/WWW_Zen_BRo_wser_org3/JIMbo_kit/server.ts` |
| System prompt JIMBO | `u:/WWW_Zen_BRo_wser_org3/JIMbo_kit/lib/system-prompt.md` |
| JIMBO HUB | `u:/WWW_Zen_BRo_wser_org3/JIMBO_agent_HUB/` |
| BUCH backend | `u:/The_DEVz_HUB_of_work/BUCH_DEVz_CHat_box/backend/` |

### 2. Zainicjalizuj nowy projekt

```
projekty/<NazwaProjektu>/
├── status.md       ← aktualny stan prac (aktualizuj po każdej sesji)
├── decyzje.md      ← architektoniczne i techniczne decyzje z uzasadnieniem
├── notatki.md      ← luźne notatki robocze
└── todo.md         ← lista zadań (nie zastępuje Issues w repo)
```

Utwórz ręcznie lub powiedz JIMBO: *„Zainicjalizuj projekt X"*.

### 3. Uruchom serwisy

```bash
# ZENO Browser + JIMBOKit (port 3701)
start_zeno.bat

# JIMBO Hub + BUCH (port 4224 + 5180)
start_zeno_hub.bat
```

### 4. Sprawdź czy działa

- JIMBOKit: `http://127.0.0.1:3701/health`
- BUCH: `http://127.0.0.1:5180/health`
- JIMBO Hub: `http://127.0.0.1:4224/api/status`

---

## Struktura pliku status.md (wzorzec)

```markdown
# Status: NazwaProjektu
Ostatnia aktualizacja: 2026-04-17

## Co działa
- ...

## W toku
- ...

## Blokery
- ...

## Następny krok
- ...
```

---

## Co tu NIE trafia

- Kod źródłowy → repo git
- Dane produkcyjne → Cloudflare D1/R2 przez BUCH
- Duże binarki → R2
- Sekrety / klucze API → `.env` plik (nigdy tutaj)
