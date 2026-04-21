# Polaczek_01_Analityk — Lista zadań

## Zadania cykliczne

### 1. Analiza logów ZENO/HUB
Sprawdź pliki logów w `JIMBO_agent_HUB/logs/`:
- Zlicz błędy i ostrzeżenia z ostatnich 24h
- Zidentyfikuj najczęstsze typy błędów
- Wykryj wzorce czasowe (kiedy najwięcej błędów)

### 2. Statystyki bazy wiedzy
Odpytaj SQLite w `JIMBO_agent_HUB/hub_knowledge.db`:
- Liczba rekordów w każdej tabeli
- Najstarsza i najnowsza aktualizacja
- Wpisy bez tagów lub z pustymi treściami

### 3. Analiza skills graph
Sprawdź `JIMBO_agent_HUB/skills.db`:
- Liczba skills, relacji, klastrów
- Skills bez żadnych połączeń (izolowane węzły)
- Najczęściej używane skills

### 4. Raport pipeline Polaczek
Po zakończeniu pełnego pipeline (Bibliotekarz → Skaner → Porządkowy):
- Podsumuj co każdy agent znalazł
- Podaj liczby: pliki przeskanowane, zduplikowane, zarchiwizowane
- Zaznacz wszelkie konflikty lub niespójności

### 5. Przetwarzanie feed-ów
Dla przekazanych URL-i RSS lub JSON API:
- Pobierz dane, wyciągnij kluczowe pola
- Pogrupuj według kategorii/tagów
- Zwróć top-N pozycji z krótkim opisem każdej

## Zadania jednorazowe / na żądanie
- `analizuj <plik>` — dowolny plik danych (CSV/JSON/SQLite/XML)
- `statystyki <tabela> <db>` — szczegółowe statystyki pojedynczej tabeli
- `outliers <plik>` — znajdź anomalie i wartości odstające
- `porównaj <plik1> <plik2>` — diff strukturalny dwóch plików danych
