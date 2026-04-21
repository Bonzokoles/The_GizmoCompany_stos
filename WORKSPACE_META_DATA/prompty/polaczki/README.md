# Polaczki — Lokalne Agenty Pomocnicze

Folder: `U:\WWW_Zen_BRo_wser_org3\WORKSPACE_META_DATA\prompty\polaczki\`

## Czym są Polaczki?

Polaczki to małe, wyspecjalizowane agenty AI uruchamiane **lokalnie przez Ollama**. Każdy ma wąską specjalizację i działają jako pomocnicy wspierający głównych agentów (BUCH, JIMBO, Goose).

Konwencja nazewnictwa: `Polaczek_[NR]_[ROLA]`

## Aktywne Polaczki

| Agent | Model | Rola |
|-------|-------|------|
| `Polaczek_01_Bibliotekarz` | Schematron-3B (fallback: gemma3:4b) | HTML→JSON extraction, indeksowanie wiedzy |
| `Polaczek_01_Porzadkowy` | gemma3:4b | Organizacja plików, wykrywanie duplikatów |
| `Polaczek_01_Skryba` | bielik-4.5b | Dokumentacja, README, changelogi |
| `Polaczek_01_Kartograf` | gemma3:4b | Mapowanie architektury, diagramy Mermaid |

## Ollama Tool Calling

Ollama **v0.3.0+** obsługuje tool calling przez API:
```bash
curl http://localhost:11434/api/chat -d '{
  "model": "gemma3:4b",
  "messages": [...],
  "tools": [{
    "type": "function",
    "function": {
      "name": "read_file",
      "parameters": {...}
    }
  }]
}'
```
**Modele obsługujące tools w Ollama**: gemma3, qwen2.5, llama3.1/3.2, mistral, bielik (częściowo)

## Schematron-3B → Ollama Konwersja

Model jest w formacie **safetensors** (`U:\The_DEVz_HUB_of_work\Schematron-3B\`).
Żeby uruchomić w Ollama, potrzebna konwersja do GGUF:
```bash
# Wymagania: llama.cpp lub ctransformers
python convert_hf_to_gguf.py U:\The_DEVz_HUB_of_work\Schematron-3B\ --outtype q4_k_m
```
Alternatywnie: pobierz GGUF z HuggingFace jeśli dostępny.

## Rejestracja w Hub

Polaczki komunikują się z JIMBO Hub przez:
- `POST http://localhost:4224/memory/archival/save` — zapis wyników
- `POST http://localhost:4224/skills/save` — zapis skills
- `GET http://localhost:4224/skills/search` — szukanie wiedzy
