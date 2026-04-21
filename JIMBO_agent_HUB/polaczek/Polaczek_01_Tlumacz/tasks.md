# Polaczek_01_Tlumacz — Lista zadań

## Zadania cykliczne

### 1. Tłumaczenie nowych commit message
Sprawdź ostatnie 10 commit-ów w repozytoriach ZENO/HUB:
- Przetłumacz komunikaty z EN na PL do dziennika zmian
- Format: `YYYY-MM-DD | <oryginał EN> → <tłumaczenie PL>`

### 2. Lokalizacja nowych komunikatów UI
Sprawdź czy w `src/` pojawiły się nowe angielskie stringi:
- Znajdź hardcoded EN text w .tsx/.ts plikach (nie w komentarzach)
- Zaproponuj polskie odpowiedniki
- Wygeneruj listę do ręcznej zamiany

### 3. Streszczenie raportów Polaczek
Po zakończeniu pipeline (wynik z Analityka):
- Napisz streszczenie wyników po polsku (max 5 zdań)
- Styl: zrozumiały dla użytkownika technicznego
- Bez nadmiernych szczegółów — tylko co ważne

### 4. Tłumaczenie dokumentacji modeli AI
Dla nowo dodanych modeli Ollama:
- Przetłumacz opis modelu (EN→PL)
- Dodaj do `registry.json` pole `description_pl`
- Max 2 zdania na model

## Zadania jednorazowe / na żądanie
- `tlumacz <tekst>` — tłumaczenie dowolnego fragmentu EN↔PL
- `streszcz <plik>` — streszczenie pliku .md, .txt, .json
- `redaguj <plik>` — korekta polskiego tekstu
- `komentarze <plik.ts>` — przetłumacz komentarze EN→PL w pliku kodu

## Status
Model `SpeakLeash/bielik-4.5b-v3.0-instruct:Q8_0` — wymaga pobrania (5.1GB).
Fallback: `qwen3.5:2b` — dobry multilingualnie, akceptowalny dla tłumaczeń.
