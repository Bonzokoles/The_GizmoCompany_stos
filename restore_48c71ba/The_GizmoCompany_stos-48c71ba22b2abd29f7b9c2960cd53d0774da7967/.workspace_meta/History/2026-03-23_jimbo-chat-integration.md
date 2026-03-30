# 2026-03-23 — JIMBO Chat Integration + AI Hub + Libraries

## Co zrobiono

### 1. Library Curation (`curate_libraries.py`)
- Skrypt działa z poziomu `U:\WWW_Zen_BRo_wser_org3` przez `npm run curate`
- Dodano skrypt do `package.json`: `"curate": "node -e \"process.env.PYTHONIOENCODING='utf-8'; const {execSync}=require('child_process'); execSync('python ../The_DEVz_HUB_of_work/knowledge_base/_LIBRARIES/tools/curate_libraries.py', {stdio:'inherit', env:process.env})\""`
- 56 plików, 33 keep, 23 review, 0 archive candidates przy ostatnim uruchomieniu

### 2. Port JIMBO Chat: 8000 → 5180
- `BUCH_DEVz_CHat_box/frontend/index.html`: API URL zmienione na `http://localhost:5180/api`
- `BUCH_DEVz_CHat_box/.env`: `BACKEND_PORT=5180`
- `start_zeno_hub.bat`: port `--port 5180` w obu gałęziach startu
- Brak konfliktu z innymi serwisami (Plausible używa `8100:8000` wewnętrznie)

### 3. JIMBO Chat w AI Hub
- `ai-hub/index.html`: dodana karta "JIMBO DEVz Chat" otwierająca `http://localhost:5180` w nowej karcie (jak Movie Buch App)
- `main.py`: dodano `StaticFiles` mount — frontend serwowany przez FastAPI na `/`
- `main.py`: port zmieniony na `5180` w `uvicorn.run()`

### 4. Libraries API — podłączenie KB
- `api_server.py` działa na porcie **7070** (nie 4200 jak było w `kb_client.py`)
- `kb_client.py` przepisany: poprawne endpointy (`/api/libraries/search`, `/api/libraries/{id}/query`)
- `.env`: `KB_API_URL=http://localhost:7070`
- `start_zeno_hub.bat`: dodany start `api_server.py` jako `LibrariesAPI` (tle, port 7070)
- ChromaDB ma strukturę (5 kolekcji) ale **0 embeddingów** — wymaga uruchomienia indexera

### 5. Zeno Browser — integracja z narzędziami
- Zeno Browser MCP Server działa na porcie **3847** (HTTP/SSE) — brak prostego REST API
- `mcp_tools.py`: dodane 2 nowe narzędzia:
  - `searxng_search` — szuka przez SearXNG (`localhost:8888`) z Zeno Browser
  - `libraries_search` — szuka w _LIBRARIES przez `api_server.py` (`localhost:7070`)
- Razem 17 narzędzi MCP

### 6. CF AI Gateway w providers.py
- `providers.py`: dodany `cf_gateway` z URL `https://gateway.ai.cloudflare.com/v1/7f490d58a478c6baccb0ae01ea1d87c3/bielik_gateway/compat`
- Używa `OPENAI_API_KEY` (OpenAI-compatible endpoint)

### 7. Klucze API — aktualizacja .env
- `OPENAI_API_KEY` → zaktualizowany z `.workspace_meta/secrets/.env`
- `ANTHROPIC_API_KEY` → zaktualizowany z secrets
- `OPENROUTER_API_KEY` → zaktualizowany z secrets (był inny klucz)
- `CLOUDFLARE_API_TOKEN` → poprawiony (był duplikat + zły token)
- Dodane: `EDENAI_API_KEY`, `COMPOSIO_API_KEY`

### 8. Nowi dostawcy AI w providers.py
- `ngrok_gateway` — OpenAI-compat przez Ngrok AI Gateway (`smallish-apocalyptically-candis.ngrok-free.dev/v1`)
- `edenai` — EdenAI z własnym handlerem `_edenai()` (inny format API)
- Łącznie **10 providerów**: CF Gateway, OpenAI, Anthropic, DeepSeek, Gemini, OpenRouter, Perplexity, Together AI, Ngrok Gateway, EdenAI

### 9. start_zeno_hub.bat — nowe fazy
Kolejność po zmianach:
1. Podman Machine
2. Sieci Podman
3. Kontenery (10 serwisów)
4. Node.js + ZENO Build
5. **Library Curation** (tle, `npm run curate`)
6. **Libraries API** (tle, port 7070)
7. **JIMBO Chat Backend** (tle, port 5180, `PYTHONIOENCODING=utf-8`)
8. **DevzHub Sync Loop** (tle, U: → A: co 30 min)
9. MyBonzo Astro Dev (tle, port 4321)
10. Cloudflared Tunnels
11. Watchdog
12. ZENO Browser (foreground, port 5173)

### 10. Fix: PYTHONIOENCODING=utf-8
- Problem: emoji w `print()` powodowały `UnicodeEncodeError` na Windows (cp1250)
- Fix: `set PYTHONIOENCODING=utf-8 &&` przed uruchomieniem uvicorn w `.bat`

### 11. Git commits
| Hash | Opis |
|---|---|
| `9a7633c` | feat: add JIMBO Chat app to AI Hub + CF AI Gateway + jimbo-gateway Worker |
| `b2b2ba8` | fix: set PYTHONIOENCODING=utf-8 for JIMBO Chat startup on Windows |

## Serwisy po wszystkich zmianach

| Serwis | Port | Status |
|---|---|---|
| ZENO Browser (Vite) | 5173 | foreground |
| JIMBO Chat (FastAPI + frontend) | 5180 | tle |
| Libraries API (ChromaDB RAG) | 7070 | tle |
| MyBonzo (Astro) | 4321 | tle |
| SearXNG / Websurfx | 8888 | kontener |
| Meilisearch | 7700 | kontener |
| sist2 | 8085 | kontener |
| Umami | 5183 | kontener |
| Plausible | 8100 | kontener |

## TODO / Do zrobienia
- [ ] Zindeksować ChromaDB — uruchomić indexer dla `_LIBRARIES` (brak `indexer.py`)
- [ ] Deploy `workers/jimbo-gateway` na Cloudflare Workers (npm install w katalogu workera się nie powiódł — problem z Node na dysku U:)
- [ ] Przetestować EdenAI i Ngrok Gateway endpointy
