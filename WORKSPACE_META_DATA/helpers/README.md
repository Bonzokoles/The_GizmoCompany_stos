# POMOCNICY — System Utrzymania Porządku

Cztery małe agenty AI. Tanie modele, konkretne zadania.
Uruchamiane ręcznie lub przez JIMBO Hub (Goose).

---

## Roster

| Agent | Model | Zadanie | Kiedy |
|-------|-------|---------|-------|
| **Archiwista** | gemini-flash | Przenosi stare/zakończone pliki do `_archiwum/` | Co tydzień lub gdy `logi/` > 20 plików |
| **Indekser** | llama-3.1-8b | Przebudowuje `INDEX.md` — mapa wszystkich .md | Po każdej sesji lub ręcznie |
| **Status Keeper** | deepseek-v3 | Czyta git log + notatki → aktualizuje status.md | Codziennie rano lub po merge |
| **Janitor** | gemini-flash | Usuwa puste pliki, duplikaty, broken links | Co tydzień |

---

## Jak uruchomić

### Przez JIMBO Hub (zalecane)
```
Powiedz JIMBO: "Uruchom Indekser" lub "Odpal Archiwistę"
JIMBO Hub → Goose agent → wykonuje task → raportuje wynik
```

### Bezpośrednio przez skrypt
```bash
node helpers/run-agent.js indekser
node helpers/run-agent.js archiwista
node helpers/run-agent.js status-keeper
node helpers/run-agent.js janitor
```

---

## Reguły dla każdego agenta

Szczegółowe instrukcje w osobnych plikach:
- `helpers/archiwista.md`
- `helpers/indekser.md`
- `helpers/status-keeper.md`
- `helpers/janitor.md`

---

## Zasada: co NIE jest archiwizowane

Archiwista NIGDY nie rusza:
- `README.md`, `step_0*.md` — dokumentacja stała
- `projekty/*/status.md` — zawsze aktualny
- Pliki zmienione w ciągu ostatnich 14 dni
- Pliki z tagiem `<!-- KEEP -->` w treści
