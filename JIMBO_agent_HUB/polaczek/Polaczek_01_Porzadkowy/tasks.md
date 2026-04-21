# Polaczek_01_Porzadkowy — Lista Zadań

## Zadania aktywne

### T-001: Czyszczenie logów JIMbo_kit
- Sprawdź `U:\WWW_Zen_BRo_wser_org3\logs\`
- Logi starsze niż 7 dni → archiwum `.gz`
- Logi starsze niż 30 dni → usuń (po potwierdzeniu)

### T-002: node_modules nieaktywnych projektów
- Sprawdź projekty w `U:\` i `U:\The_DEVz_HUB_of_work\`
- Jeśli `package.json` istnieje ale projekt nie był używany >60 dni → zgłoś do usunięcia `node_modules`
- Wynik: lista z rozmiarami do potwierdzenia

### T-003: Stare branche git
- Dla każdego repo: `git branch --merged main`
- Wypisz branche merged >14 dni temu
- Czekaj na potwierdzenie przed `git branch -d`

### T-004: Temp i cache
- Skanuj: `%TEMP%`, `C:\Users\Bonzo2\AppData\Local\Temp\`
- Pliki starsze niż 3 dni, rozmiar >10MB → raport
- Nie usuwaj bez potwierdzenia

### T-005: Sesje JIMbo_kit (in-memory)
- Przez API: `GET http://localhost:4111/api/chat/sessions`
- Sesje nieaktywne >2h → `DELETE /api/chat/sessions/:key`
- To zadanie można uruchamiać automatycznie

### T-006: Duplikaty plików
- Skanuj `U:\WWW_Zen_BRo_wser_org3\` po hash MD5
- Wypisz grupy duplikatów z ścieżkami
- Wskaż który zostawić (najnowszy w głównym projekcie)

## Zadania cykliczne (cron-style)

| Zadanie | Częstotliwość | Trigger |
|---------|---------------|---------|
| T-001 logi | co 7 dni | manual |
| T-005 sesje | co 2h | auto (gdy serwer aktywny) |
| T-002 node_modules | co miesiąc | manual |

## Format wyniku
```
[DRY-RUN / WYKONANO] Porządkowy ✅
Zbadano: N plików / M katalogów
Do usunięcia: X MB
Zarchiwizowano: Y plików
Czekam na potwierdzenie: TAK/NIE (jeśli dry-run)
```
