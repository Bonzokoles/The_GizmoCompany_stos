# Step 02 — Codzienna Praca z JIMBO

## Jak prowadzić sesję AI

### Start sesji

1. Powiedz JIMBO co chcesz zrobić (konkretnie, bez owijania w bawełnę)
2. JIMBO sprawdza `Bonzo_diary` i `WORKSPACE_META_DATA` dla kontekstu
3. Działamy — minimum pytań, maksimum roboty

### Zasady sesji

| Zasada | Co to znaczy w praktyce |
|--------|------------------------|
| ZERO zgadywania | Jeśli JIMBO nie jest pewny → pyta, nie zakłada |
| ZERO owijania | Wynik w 1-3 zdaniach, potem szczegóły na żądanie |
| Błąd = komunikat | Coś nie poszło → JIMBO mówi wprost co i dlaczego |
| kb_search ZAWSZE przed web_search | Dla pytań o projekt/ZENO/Bonzo — najpierw lokalna baza wiedzy |

---

## Standardowy przepływ zadania

```
1. Bonzo opisuje zadanie
       ↓
2. JIMBO sprawdza kb_search (projekt/ZENO/BUCH context)
       ↓
3. JIMBO dobiera narzędzie (web_search / fetch_url / read_local_file / list_local_dir)
       ↓
4. JIMBO wykonuje — raportuje tylko wynik lub problem
       ↓
5. Wynik strukturalny → save_to_d1 (rekordy) lub save_to_r2 (duże dokumenty)
       ↓
6. Aktualizacja status.md w projekty/<NazwaProjektu>/
```

---

## Kiedy używać którego AI

| Pytanie/zadanie | Gdzie kierować |
|----------------|---------------|
| Lokalny FS, kod projektu, web search | **JIMBOKit** (:3701) — panel JimboKit w ZENO |
| Zapis do D1/R2, cloud query | **BUCH** (:5180) — panel BuchChat w ZENO |
| Orkiestracja agentów, skills, złożone pipeline | **JIMBO Hub** (:4224) — terminal lub hub_chat |
| Eksperymenty, jednorazowe pytania | Dowolny — ale log wynik do `raporty/` |

---

## Debug — co zrobić gdy coś nie działa

```
1. Sprawdź logi serwisu:
   - JIMBOKit: konsola gdzie startował start_zeno.bat
   - BUCH:     konsola start_zeno_hub.bat
   - JIMBO Hub: JIMBO_agent_HUB/logs/ (jeśli istnieje)

2. Sprawdź health endpoint:
   curl http://127.0.0.1:3701/health
   curl http://127.0.0.1:5180/health

3. Jeśli serwis nie odpowiada → restart bat'a

4. Zapisz symptom do logi/ z datą:
   logi/2026-04-17_problem_X.md
```

---

## Po sesji — co zaktualizować

- `projekty/<NazwaProjektu>/status.md` — co zrobiono, co zostało
- `logi/` — jeśli był błąd lub nieoczekiwane zachowanie
- `raporty/` — jeśli JIMBO wygenerował coś wartościowego do zachowania
