# Strona: Narzędzia AI (`#page-tools`)

**Zakładka nav:** 🛠️ Narzędzia
**ID strony:** `page-tools`
**Moduł JS:** `js/modules/tools.js`
**Dane:** `js/data/tools.js` — tablica `TOOLS[]`

---

## Co robi

Katalog 24 narzędzi ekosystemu AI — frameworki, platformy, SDK, narzędzia deweloperskie, bazy wektorowe, monitoring. Obsługuje filtrowanie po kategorii i wyszukiwanie.

---

## Dane narzędzi

Każde narzędzie w `TOOLS[]`:

| Pole | Typ | Opis |
|------|-----|------|
| `name` | string | Nazwa narzędzia |
| `icon` | string | Emoji ikony |
| `cat` | string | Kategoria (patrz niżej) |
| `desc` | string | Opis po polsku |

### Kategorie

| Kategoria | Opis | Kolor CSS |
|-----------|------|-----------|
| `framework` | Frameworki LLM (LangChain, LlamaIndex...) | `tag-app` |
| `platform` | Platformy (HuggingFace, Replicate...) | `tag-gen` |
| `sdk` | SDK (Vercel AI SDK, Instructor) | `tag-util` |
| `devtool` | Narzędzia deweloperskie (Cursor, Ollama...) | `tag-data` |
| `database` | Bazy wektorowe (Pinecone, ChromaDB...) | `tag-app` |
| `monitoring` | Monitoring (W&B, Helicone) | `tag-gen` |

### Pełna lista narzędzi (24)

**Frameworks:**
- LiteLLM — proxy do 100+ modeli
- LangChain — chains, agents, RAG, memory
- LlamaIndex — RAG, indeksowanie, query engines
- DSPy — optymalizacja promptów
- Haystack — NLP pipelines, semantic search
- CrewAI — multi-agent, role-based
- AutoGen (Microsoft) — multi-agent, code execution

**Platforms:**
- Hugging Face — Hub, 500k+ modeli
- Replicate — cloud ML, open-source przez API
- LobeChat — open-source ChatGPT UI
- Open WebUI — self-hosted, OpenAI-compatible

**SDKs:**
- Vercel AI SDK — streaming AI, Next.js/React
- Instructor — structured output z Pydantic

**DevTools:**
- Cursor — AI-powered IDE (VS Code fork)
- Continue — VS Code/JetBrains AI extension
- Cody (Sourcegraph) — code search + AI
- Ollama — lokalne uruchamianie LLM
- vLLM — high-throughput serving

**Databases (Vector):**
- Pinecone — serverless vector DB
- ChromaDB — open-source, local-first
- Weaviate — hybrid search, GraphQL
- Qdrant — Rust, filtering

**Monitoring:**
- Weights & Biases — MLOps, experiment tracking
- Helicone — LLM observability, cost tracking

---

## Filtry

### Filter pills (`#tool-pills`)

| `data-tf` | Kategoria |
|-----------|-----------|
| `all` | Wszystkie |
| `framework` | Frameworki |
| `platform` | Platformy |
| `sdk` | SDK |
| `devtool` | DevTools |
| `database` | Bazy danych |
| `monitoring` | Monitoring |

### Wyszukiwarka (`#tool-search`)

Szuka w: `name`, `desc`, `cat`.

---

## Funkcje JS

### `renderTools()` — `tools.js:11`

Filtruje `TOOLS[]` wg `toolFilter` i `toolSearch`, renderuje karty do `#tools-grid`.

Karta zawiera: ikonę, nazwę, opis, badge kategorii z kolorem.

### `initTools()` — `tools.js:32`

Podpina `input` na `#tool-search` i `click` na pills.

---

## Inicjalizacja

```js
renderTools();
initTools();
```

---

## Dodawanie narzędzi

Edytuj `js/data/tools.js`. Nowe narzędzie pojawi się automatycznie w katalogu i będzie filtrowane.
