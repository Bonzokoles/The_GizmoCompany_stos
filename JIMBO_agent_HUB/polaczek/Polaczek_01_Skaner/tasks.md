# Polaczek_01_Skaner — Lista Zadań

## Zadania aktywne

### T-001: Skanowanie dokumentów projektowych
- Wejście: ścieżka do pliku obrazu lub folderu ze skanami
- Wyekstrahuj tekst, zachowaj strukturę (nagłówki, listy)
- Wynik: `polaczek/catalog/scans/YYYY-MM-DD_nazwa.md`

### T-002: Ekstrakcja danych z faktur/rachunków
- Wejście: obraz faktury
- Wyciągnij: data, numer, sprzedawca, pozycje, kwoty, NIP
- Wynik: JSON `{ date, number, vendor, items:[], total, tax_id }`

### T-003: Czytanie zrzutów ekranu błędów
- Wejście: screenshot z błędem (terminal, przeglądarka, IDE)
- Wyciągnij: treść błędu, stack trace, kontekst
- Wynik: czysty tekst gotowy do wklejenia do debuggera

### T-004: Katalogowanie zeskanowanych notatek
- Skanuj folder z obrazami notatek
- Dla każdego: wyciągnij tekst + przypisz temat
- Wynik: `polaczek/catalog/notatki_index.json`

### T-005: Ekstrakcja tabel z dokumentów
- Wejście: obraz z tabelą (raport, arkusz, screenshot)
- Wynik: CSV lub Markdown table

### T-006: Analiza logów ze zrzutów
- Wejście: screenshot logu serwera / konsoli
- Wyciągnij: poziom logów (ERROR/WARN/INFO), timestampy, komunikaty
- Wynik: filtrowane logi jako tekst

## Integracja z Bibliotekarzem
Skaner → tekst → Bibliotekarz → kataloguje i taguje
Pipeline: `T-001 (Skaner)` → `T-003 (Bibliotekarz)` → wpis w KB

## Format wyniku
```
[SKANER] ✅ T-XXX
Typ: faktura/notatka/log/tabela/zrzut
Język: PL/EN/mieszany
Strony/fragmenty: N
Wynik: <ścieżka lub inline JSON/tekst>
```
