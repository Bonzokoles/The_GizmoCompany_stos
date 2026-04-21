# JIMBO Agent HUB — Project Knowledge (auto-loaded by Goose)

## Project Overview

**ZENO Browser** — Electron + React 19 + Vite + TypeScript + Cloudflare Pages/Workers.
- Katalog: `U:\WWW_Zen_BRo_wser_org3`
- Hub port: **4224** (env: `HUB_PORT`)
- Web: `https://zenbrowsers.org`

## Hub Architecture

```
JIMBO_agent_HUB/
├── hub-server.ts          # Główny serwer Express (port 4224)
├── core/
│   ├── llm-client.ts      # Anthropic / OpenRouter / OpenAI client
│   ├── goose-bridge.ts    # Goose CLI process management
│   ├── agent-loader.ts    # Ładuje agentów z agents/ folder
│   └── podman-bridge.ts   # Podman container bridge
├── agents/
│   ├── skill-agent.ts     # SkillAgent: buildUserPrefix() + evalAndSave()
│   └── goose-session-importer.ts
├── skills/
│   └── skill-manager.ts   # SQLite FTS5 + vector search dla skills
└── AGENTS.md              # Ten plik — auto-ładowany przez Goose
```

## Hub API Endpoints

| Method | Path | Opis |
|--------|------|------|
| GET | `/status` | Status huba + Goose |
| POST | `/chat` | LLM chat `{messages, stream, model, agent}` |
| POST | `/agent/run` | Uruchom task przez Goose `{instructions, timeout}` |
| GET | `/agent/tasks` | Lista aktywnych tasków |
| DELETE | `/agent/tasks/:id` | Zatrzymaj task |
| POST | `/skills/search` | Szukaj skills `{query, limit, threshold}` |
| POST | `/skills/save` | Zapisz skill `{name, description, code, tags, namespace}` |
| GET | `/skills/list` | Lista wszystkich skills |
| GET | `/skills/export-skill-md` | Eksport skills do SKILL.md (Goose-native) `?namespace=&limit=100&save=true` |
| GET | `/skills/:id` | Pobierz skill z kodem |
| DELETE | `/skills/:id` | Usuń skill |
| GET | `/memory/core` | Core memory (tier 1) — wpisy zawsze w system prompt |
| POST | `/memory/core` | Zapisz wpis `{key, value}` |
| GET | `/memory/archival` | Archival memory (tier 2) — lista `?limit=50` |
| POST | `/memory/archival/save` | Zapisz `{content, source?, tags?}` |
| POST | `/memory/archival/search` | Szukaj semantycznie `{query, limit?, threshold?}` |
| GET | `/memory/recall` | Recall memory (tier 3) — historia `?limit=20&sessionId=` |
| POST | `/memory/recall/search` | FTS5 keyword search `{query, limit?}` |
| GET | `/memory/stats` | Statystyki wszystkich tierów |
| GET | `/zeno/agents` | Pobierz agentów z D1 (zenbrowsers.org) |
| POST | `/zeno/agents/deploy` | Wdróż agenta (status: idea → deployed) |

## ZENO Web API (Cloudflare Pages)

| Method | Path | Opis |
|--------|------|------|
| POST | `/api/ai/chat` | BUCH_CHAT z tool-use (claude-sonnet-4-6) |
| POST | `/api/ai/v1/chat/completions` | OpenAI-compat endpoint (page-agent) |
| GET/POST | `/api/admin/agents` | CRUD agentów w D1 (Basic Auth) |
| GET | `/api/storage/list/:bucket` | Lista plików R2 |
| GET | `/api/storage/file/:bucket/:key` | Pobierz plik z R2 |
| GET | `/api/analytics/sites` | Statystyki odwiedzin |

## Skill System (Hermes Pattern)

Skills są wstrzykiwane jako **user message prefix** (nie system prompt) → umożliwia Anthropic prompt caching:

```
[Relevant skills from knowledge base:
## skill-name
Opis skilla
```kod```
]

{oryginalna wiadomość użytkownika}
```

- `buildUserPrefix(query, namespaces)` → prefix string
- `evalAndSave(instructions, output, exitCode)` → auto-zapis po Goose done
- Namespaces: `global`, `zeno`, `electron`, `react`, `cloudflare`

## Agent Workflow (lokalny)

1. **Pomysł** → BUCH_CHAT na web zapisuje do D1 `status:'idea'`
2. **Pull** → Hub pobiera agentów: `GET /zeno/agents`
3. **Test** → Goose testuje agenta: symuluje 3 rozmowy, ocenia 1-10
4. **Deploy** → `POST /zeno/agents/deploy` → status: `'deployed'`

## LLM Config (.env)

```
LLM_PROVIDER=anthropic
ANTHROPIC_MODEL=claude-haiku-4-5-20251001
OPENROUTER_MODEL=google/gemini-2.0-flash-001
HUB_PORT=4224
GOOSE_PATH=E:\Programs\goose\goose.exe
ADMIN_USER=Jimbo77     # Basic auth do ZENO Admin API
ADMIN_PASS=Haos1977
```

## Goose Integration

- Goose v1.29.1 / goose-server 1.29.1
- Uruchamia Goose CLI jako subprocess (`GooseBridge`)
- WebSocket `/ws` → streaming output z Goose w czasie rzeczywistym
- **AGENTS.md** (ten plik) jest auto-ładowany przez Goose przy starcie sesji

## Cloudflare Stack

- **Pages** + **Functions** (`functions/api/`)
- **D1** baza `ZENO_DB`: tabele `admin_storage` (key-value: agenci, wiedza BUCH)
- **R2** bucket: `zeno-storage` (pliki użytkowników)
- **Workers AI**: opcjonalne embeddingi
- **Analytics Engine**: statystyki odwiedzin

## BUCH_CHAT (web asystent)

- Model: `claude-sonnet-4-6`
- Tools: `fetch_url`, `extract_text`, `web_search`, `r2_read`, `d1_query`, `zeno_api`, `agent_list`, `agent_save`, `buch_learn`
- Wiedza w D1: `buch_knowledge_v1` (auto-seed z `BUCH_SEED_KNOWLEDGE`)
- Nowe wpisy: `buch_learn({key, content, category})`

## Common Goose Tasks

```bash
# Uruchom agenta przez API
curl -X POST http://localhost:4224/agent/run \
  -H "Content-Type: application/json" \
  -d '{"instructions": "Sprawdź status projektu i wylistuj pliki src/", "timeout": 60}'

# Wdróż agenta z pomysłu
curl -X POST http://localhost:4224/zeno/agents/deploy \
  -H "Content-Type: application/json" \
  -d '{"name": "nazwa-agenta"}'

# Szukaj skills
curl -X POST http://localhost:4224/skills/search \
  -H "Content-Type: application/json" \
  -d '{"query": "cloudflare pages deploy", "limit": 3}'
```

## Polaczki — Lokalne Agenty Pomocnicze

Prompt files: `U:\WWW_Zen_BRo_wser_org3\WORKSPACE_META_DATA\prompty\polaczki\`
Uruchamiane przez Ollama lokalnie (nie przez Hub API).

| Agent | Model | Zadanie |
|-------|-------|---------|
| `Polaczek_01_Bibliotekarz` | Schematron-3B / gemma3:4b | HTML→JSON extraction, indeks wiedzy |
| `Polaczek_01_Porzadkowy` | gemma3:4b | Organizacja plików, duplikaty |
| `Polaczek_01_Skryba` | bielik-4.5b | Dokumentacja, README, changelog |
| `Polaczek_01_Kartograf` | gemma3:4b | Mapa architektury, Mermaid diagrams |

Ollama tool calling: **v0.3.0+** — modele gemma3, qwen2.5, llama3.2 obsługują narzędzia.
Schematron-3B wymaga konwersji safetensors→GGUF przed użyciem w Ollama.
