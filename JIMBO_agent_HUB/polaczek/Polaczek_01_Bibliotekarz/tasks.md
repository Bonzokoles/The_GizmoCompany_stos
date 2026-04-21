# Polaczek_01_Bibliotekarz — Lista Zadań

## Zadania aktywne

### T-001: Katalog modeli AI (Ollama + lokalne)
- Zeskanuj `C:\Users\Bonzo2\.ollama\models\` + `U:\The_DEVz_HUB_of_work\`
- Dla każdego modelu: nazwa, rozmiar, format, ostatnie użycie
- Wynik: `JIMBO_agent_HUB/polaczek/catalog/models_catalog.json`

### T-002: Audyt bibliotek npm
- Sprawdź `package.json` w `U:\WWW_Zen_BRo_wser_org3\` i `U:\WWW_Zen_BRo_wser_tool\`
- Wykryj: nieużywane paczki, duplikaty, przestarzałe (>1 rok major lag)
- Wynik: tabela z rekomendacjami

### T-003: Indeks skills i agentów
- Zeskanuj `JIMBO_agent_HUB/skills/library/`
- Utwórz mapę: skill_id → tags → namespace → plik
- Wynik: `polaczek/catalog/skills_index.json`

### T-004: Katalog wiedzy ChromaDB
- Odpytaj `kb_categories` i `kb_libraries` przez JIMbo_kit `/api/chat`
- Podsumuj co jest w bazie wiedzy
- Wynik: `polaczek/catalog/kb_summary.md`

### T-005: Schematron-3B → Ollama
- Sprawdź `U:\The_DEVz_HUB_of_work\Schematron-3B\config.json`
- Przygotuj Modelfile dla Ollama (wymaga GGUF — oznacz jako TODO konwersja)
- Wynik: `Polaczek_01_Bibliotekarz/Modelfile.schematron`

## Zadania planowane

### T-010: Auto-tagging plików projektowych
- Skanuj `U:\WWW_Zen_BRo_wser_org3\` rekurencyjnie
- Przypisz tagi na podstawie zawartości i nazwy
- Zapisz do `WORKSPACE_META_DATA/file_tags.json`

### T-011: Deduplikacja bazy wiedzy
- Porównaj wpisy w ChromaDB i skills.db
- Wykryj semantyczne duplikaty (cosine similarity > 0.92)
- Zaproponuj które usunąć

## Format wyniku zadań
```
[T-XXX] Bibliotekarz ✅
Przetworzono: N elementów
Znaleziono: X duplikatów / Y przestarzałych / Z nowych
Plik: <ścieżka do wyniku>
```
