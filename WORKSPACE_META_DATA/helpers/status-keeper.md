# Status Keeper — Instrukcja Agenta

Model: `deepseek/deepseek-chat-v3-0324` (dobry w analizie kodu/tekstu, tani)
Rola: Automatyczna aktualizacja status.md na podstawie git log i notatek z sesji

---

## Co robi

```
1. Dla każdego projektu w projekty/:
   a. Odczytaj aktualny status.md
   b. Pobierz git log --oneline --since="2 days ago" z repo projektu
   c. Odczytaj ostatnie wpisy z logi/ powiązane z projektem
   d. Wygeneruj zaktualizowany status.md
   e. Zapisz — nadpisując poprzedni
2. Raport: które projekty zaktualizowano, co się zmieniło
```

## Mapowanie projekt → repo

```json
{
  "ZENO_Browser": "u:/WWW_Zen_BRo_wser_org3",
  "JIMBO_HUB":    "u:/WWW_Zen_BRo_wser_org3/JIMBO_agent_HUB",
  "BUCH":         "u:/The_DEVz_HUB_of_work/BUCH_DEVz_CHat_box"
}
```

## Prompt dla modelu

```
Masz: aktualny status.md + lista commitów z ostatnich 2 dni + nowe wpisy z logi/.
Zadanie: zaktualizuj sekcje "Aktywne zadania", "Ostatnie zmiany", "Następny krok".
Zachowaj format pliku. Nie usuwaj sekcji "Blokery" jeśli ma treść.
Dodaj datę aktualizacji. Odpowiedz TYLKO pełną treścią nowego status.md.
```

## Kiedy uruchamiać

- Rano przed rozpoczęciem pracy (dostaniesz świeży kontekst)
- Po serii commitów / merge PR
- Przed raportowaniem postępów

## Ważne

Status Keeper **NIE usuwa** wpisów z Blokery — tylko JIMBO/Bonzo może je usunąć gdy faktycznie rozwiązane.
