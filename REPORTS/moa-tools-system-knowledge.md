# MOA Tools & Configuration Report - ZENO Browser

## 📋 Informacje ogólne
- **Data generacji:** 5.04.2026 10:11:24
- **Timestamp:** 2026-04-05T08:11:24.001Z
- **Projekt:** ZENO Browser (WWW_Zen_BRo_wser_org3)
- **Środowisko:** JIMBO Agent HUB + MOA Pipeline

## 📖 Spis treści
1. [Przegląd architektury](#przegląd-architektury)
2. [Lista narzędzi](#lista-narzędzi)
3. [Mapowanie narzędzi do agentów](#mapowanie-narzędzi-do-agentów)
4. [Konfiguracja serwera](#konfiguracja-serwera)
5. [Przepływ danych](#przepływ-danych)
6. [Best practices](#best-practices)

## 🔍 Przegląd architektury

System ZENO Browser składa się z trzech głównych komponentów narzędziowych:

### 1. JIMBO Agent HUB
- **Port:** 4222 (domyślnie)
- **Rola:** Centralny serwer API dla agentów AI
- **Funkcje:** Zarządzanie agentami, skills, memory, integracja z Cloudflare

### 2. MOA Pipeline (Mixture of Agents)
- **Plik:** `scripts/moa-pipeline.mjs`
- **Rola:** Budowa bazy wiedzy poprzez 4-agentowy pipeline
- **Agenci:** ANALYZER → TRANSLATOR → HTML WRITER → EMBEDDER

### 3. Agent Configuration
- **Plik:** `agents.config.ts`
- **Rola:** Definicja 6 specjalistycznych agentów
- **Narzędzia:** Podstawowe operacje plikowe i webowe

## 🛠️ Lista narzędzi

### 🔧 Podstawowe toolIds (z agents.config.ts)
W systemie zdefiniowano **5 unikalnych toolIds**:

| Tool ID | Opis | Używany przez |
|---------|------|---------------|
| `file_read` | Odczyt plików | 5 agentów |
| `file_write` | Zapis plików | 6 agentów |
| `terminal` | Wykonywanie komend terminala | 3 agentów |
| `web_search` | Wyszukiwanie w internecie | 2 agentów |
| `code_gen` | Generowanie kodu | 1 agent |

### ⚙️ Funkcje MOA Pipeline
Pipeline zawiera **21 funkcji**, w tym **4 eksportowane**:

| Kategoria | Funkcje | Opis |
|-----------|---------|------|
| **Eksportowane** | searchKB, searchKBKeyword, listCategories, getByCategory | Publiczne API bazy wiedzy |
| **Agent funkcje** | runAnalyzer, runTranslator, runHTMLWriter, runEmbedder | Główne funkcje agentów MOA |
| **Pomocnicze** | loadEnv, sleep, postJSON, callLLM, createEmbedding | Funkcje utility |
| **Embedding** | tfidfEmbedding, cosineSimilarity | Przetwarzanie wektorowe |
| **Wyszukiwanie** | searchKB, searchKBKeyword | Semantyczne i keyword search |

### 🌐 Endpointy API (JIMBO Agent HUB)
Serwer hub udostępnia REST API z następującymi kategoriami:

- **Status:** `GET /status` - status huba i Goose
- **Chat:** `POST /chat` - LLM chat z tool-use
- **Agent:** `POST /agent/run` - uruchomienie taska przez Goose
- **Skills:** `GET /skills/list`, `POST /skills/search` - zarządzanie skills
- **Memory:** `GET /memory/core`, `POST /memory/archival/save` - 3-tier memory
- **Projects:** `GET /projects/cf/all` - zarządzanie projektami Cloudflare
- **ZENO:** `GET /zeno/agents`, `POST /zeno/agents/deploy` - integracja z web API

## 👥 Mapowanie narzędzi do agentów

### Agenci z agents.config.ts

#### 🤖 **planner** (2 narzędzi, 5 możliwości)
- **Rola:** planner
- **Narzędzia:** `file_read`, `file_write`
- **Możliwości:** `task-decomposition`, `step-by-step-planning`, `resource-allocation`, `timeline-estimation`, `risk-assessment`

#### 🤖 **ml-trainer** (3 narzędzi, 4 możliwości)
- **Rola:** ml-trainer
- **Narzędzia:** `file_read`, `file_write`, `terminal`
- **Możliwości:** `llm-finetuning`, `vision-training`, `model-evaluation`, `experiment-tracking`

#### 🤖 **data-researcher** (3 narzędzi, 4 możliwości)
- **Rola:** data-researcher
- **Narzędzia:** `file_read`, `file_write`, `web_search`
- **Możliwości:** `dataset-exploration`, `paper-research`, `gradio-demos`, `data-analysis`

#### 🤖 **web-crawler** (3 narzędzi, 5 możliwości)
- **Rola:** web-crawler
- **Narzędzia:** `web_search`, `file_read`, `file_write`
- **Możliwości:** `web-crawling`, `content-extraction`, `web-search`, `url-mapping`, `site-structure-analysis`

#### 🤖 **content-generator** (3 narzędzi, 5 możliwości)
- **Rola:** content-generator
- **Narzędzia:** `file_write`, `file_read`, `code_gen`
- **Możliwości:** `content-generation`, `code-generation`, `documentation-writing`, `demo-creation`, `template-generation`

#### 🤖 **code-analyzer** (3 narzędzi, 5 możliwości)
- **Rola:** code-analyzer
- **Narzędzia:** `file_read`, `file_write`, `terminal`
- **Możliwości:** `code-review`, `performance-analysis`, `security-audit`, `refactoring`, `bug-detection`

### Agenci MOA Pipeline
Pipeline wykorzystuje 4 specjalistycznych agentów:

1. **ANALYZER** - Grupowanie rekordów wg tematu, deduplikacja, ocena jakości
2. **TRANSLATOR** - Tłumaczenie na polski + generowanie podsumowań per temat (OpenRouter)
3. **HTML WRITER** - Generowanie polskiej bazy wiedzy HTML (dark theme)
4. **EMBEDDER** - Tworzenie embeddingów OpenAI → wektorowa baza wiedzy

## ⚙️ Konfiguracja serwera

### Porty i adresy
- **JIMBO Agent HUB:** port 4222
- **ZENO Web API:** https://zenbrowsers.org/api/
- **Cloudflare Pages:** Automatyczne deploy

### Modele AI
System wykorzystuje multiple modele w zależności od zadania:

- **Chat (BUCH):** `claude-sonnet-4-6`
- **Hub domyślny:** `claude-haiku-4-5-20251001` (Anthropic)
- **OpenRouter fallback:** `google/gemini-2.0-flash-001`
- **MOA Pipeline:** `deepseek-chat` (OpenRouter)

### Zmienne środowiskowe
Wymagane zmienne `.env`:
- `LLM_PROVIDER` (anthropic/openrouter)
- `ANTHROPIC_MODEL`, `ANTHROPIC_API_KEY`
- `OPENROUTER_MODEL`, `OPENROUTER_API_KEY`
- `HUB_PORT` (4222)
- `GOOSE_PATH` (ścieżka do goose.exe)
- `ADMIN_USER`, `ADMIN_PASS` (Basic auth dla ZENO Admin API)

## 🔄 Przepływ danych

### Sekwencja MOA Pipeline
```
RAW DATA → [ANALYZER] → Grupowanie tematyczne
         → [TRANSLATOR] → Tłumaczenie PL + podsumowania
         → [HTML WRITER] → Generacja HTML bazy wiedzy
         → [EMBEDDER] → Wektoryzacja + search module
         → FINAL OUTPUT: HTML + embeddings + search API
```

### Integracja z JIMBO Agent HUB
1. **Pomysł agenta** → BUCH_CHAT zapisuje do D1 (`status:'idea'`)
2. **Pull** → Hub pobiera agentów: `GET /zeno/agents`
3. **Test** → Goose testuje agenta (3 symulowane rozmowy, ocena 1-10)
4. **Deploy** → `POST /zeno/agents/deploy` → `status:'deployed'`

### Skill System (Hermes Pattern)
Skills są wstrzykiwane jako **user message prefix**, nie system prompt:
```
[Relevant skills from knowledge base:
## skill-name
Opis skilla
``kod``
]
{oryginalna wiadomość użytkownika}
```

## 📚 Best practices & uwagi

### 🔐 Bezpieczeństwo
1. **Permissions:** Każdy tool ma zdefiniowane uprawnienia (read/write/execute)
2. **Timeouts:** Domyślny timeout 30s, configurable per tool
3. **Cost monitoring:** Narzędzia z dostępem do API mają tracking kosztów
4. **Rate limiting:** Endpointy API mają wbudowane rate limiting

### ⚡ Optymalizacja
1. **Prompt caching:** Skills jako user prefix (nie system) → Anthropic prompt caching
2. **Model selection:** Haiku dla prostych zadań, Sonnet dla złożonych
3. **Parallel processing:** Agenci MOA mogą działać równolegle w wybranych stage'ach
4. **Batch processing:** Przetwarzanie danych w batchach dla efektywności

### 🚨 Rozwiązywanie problemów
1. **Diagnostyka:** `GET /status` pokazuje stan huba + Goose
2. **Logging:** Szczegółowe logi każdego etapu pipeline
3. **Fallback:** Multiple modele AI jako backup
4. **Monitoring:** Cloudflare Analytics dla web API

### 🔄 Rozszerzanie systemu
1. **Nowe narzędzia:** Dodawać przez `agents.config.ts` + odpowiednie permissions
2. **Nowi agenci:** Template w `agents/` folderze + rejestracja w hub
3. **Skills:** System auto-zapisu po Goose done (`evalAndSave()`)
4. **Integracje:** Cloudflare Workers AI, D1, R2, Analytics Engine

---
*Raport wygenerowany automatycznie przez Goose AI Agent*
*Data: 5.04.2026 10:11:24*
