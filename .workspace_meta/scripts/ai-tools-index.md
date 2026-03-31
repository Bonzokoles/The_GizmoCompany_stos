# AI Tools & Functions Index — JIMbo_kit & BUCH_CHAT

> **Stworzono:** 31 marca 2026  
> **Cel:** Kompleksowy indeks wszystkich dostępnych narzędzi i funkcji AI w ZENO Browser

---

## Spis Treści

1. [JIMbo_kit Server](#jimbo_kit-server) — Standalone AI server (port 4111)
2. [BUCH_CHAT System](#buch_chat-system) — Główny asystent w przeglądarce
3. [Jimbo Gateway Worker](#jimbo-gateway-worker) — CF Worker z AI/Storage API
4. [Dostępne Modele AI](#dostępne-modele-ai) — Pełna lista modeli i providerów
5. [Jak Używać Narzędzi](#jak-używać-narzędzi) — Instrukcje dla agentów AI

---

## JIMbo_kit Server

**Lokalizacja:** `JIMbo_kit/server.ts`  
**Port:** 4111  
**Protokół:** HTTP + WebSocket  
**Deploy:** `npm run dev` w katalogu JIMbo_kit  
**GitHub Commit:** `8a22df5` (31 marca 2026)

### Architektura Dwufazowa

#### Phase 1: Tool-Use (Non-Streaming)
- **Model:** `JIMBO_TOOL_MODEL` (domyślnie: `deepseek/deepseek-chat`)
- **Algorytm:** Wykrywa potrzebę narzędzi → wykonuje je synchronicznie → zbiera wyniki
- **Output:** Rezultaty tool-calling przekazywane do Phase 2

#### Phase 2: Streaming Final Answer
- **Model:** `JIMBO_MODEL` (domyślnie: `deepseek/deepseek-r1-0528:free`)
- **Algorytm:** Streaming odpowiedzi przez WebSocket
- **Events:** `chat:stream`, `chat:stream_end`, `chat:message`, `chat:tool_use`

### HTTP Endpoints

| Metoda | Endpoint | Opis |
|--------|----------|------|
| GET | `/health` | Status serwera, liczba sesji, liczba klientów WS |
| GET | `/api/system/info` | Informacje o serwisie (wersja, model, uptime) |
| POST | `/api/chat` | Wyślij wiadomość (zwraca task_id, streaming przez WS) |
| GET | `/api/chat/sessions` | Lista wszystkich sesji chat |
| GET | `/api/chat/sessions/:key` | Historia konkretnej sesji |
| DELETE | `/api/chat/sessions/:key` | Usuń sesję |
| POST | `/api/webgate/fetch` | Fetch URL (dla terminala) |

### WebSocket Endpoint

**URL:** `ws://127.0.0.1:4111/ws`

**Events (server → client):**
- `connected` — Połączenie nawiązane
- `chat:stream` — Token streamingu (delta content)
- `chat:stream_end` — Zakończenie streamingu
- `chat:message` — Pełna wiadomość asystenta
- `chat:thinking` — Model "myśli" (reasoning mode)
- `chat:tool_use` — Model wywołuje narzędzie
- `sessions:updated` — Sesje zostały zaktualizowane

### Dostępne Narzędzia (Tools)

#### 1. web_search
**Opis:** Przeszukaj internet używając SearXNG  
**Kiedy użyć:** Current events, recent data, nieznane fakty  
**Parametry:**
- `query` (string, required) — Zapytanie wyszukiwania

**Implementacja:**
```typescript
{
  name: 'web_search',
  description: 'Search the web using SearXNG. Use for current events, recent data, or unknown facts.',
  parameters: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Search query' }
    },
    required: ['query']
  }
}
```

**Backend:**
- URL: `${SEARXNG_URL}/search?q={query}&format=json`
- Timeout: 8 sekund
- Zwraca: Top 5 wyników z title, URL, content

#### 2. fetch_url
**Opis:** Pobierz i przeczytaj treść strony WWW  
**Kiedy użyć:** Analiza konkretnej strony, scraping treści  
**Parametry:**
- `url` (string, required) — Pełny URL do pobrania

**Implementacja:**
```typescript
{
  name: 'fetch_url',
  description: 'Fetch and read the text content of a URL.',
  parameters: {
    type: 'object',
    properties: {
      url: { type: 'string', description: 'Full URL to fetch' }
    },
    required: ['url']
  }
}
```

**Backend:**
- User-Agent: `ZENO-JimboKit/1.0`
- Timeout: 10 sekund
- Zwraca: Czysty tekst (HTML stripped), max 3000 znaków

#### 3. kb_search
**Opis:** Przeszukaj wewnętrzną bazę wiedzy ZENO (D1 database)  
**Kiedy użyć:** Informacje o projekcie, zapisane dokumenty, biblioteki tematyczne  
**Parametry:**
- `query` (string, required) — Zapytanie wyszukiwania
- `library` (string, optional) — Nazwa biblioteki (np. `local_03_connections`)

**Implementacja:**
```typescript
{
  name: 'kb_search',
  description: 'Search the internal ZENO knowledge base (jimbo_kb in D1) for relevant stored information.',
  parameters: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Search query' },
      library: { type: 'string', description: 'Library name to search in (optional)' }
    },
    required: ['query']
  }
}
```

**Backend:**
- URL: `${JIMBO_GATEWAY_URL}/kb/search`
- Metoda: POST
- Timeout: 8 sekund
- Zwraca: Top 5 wyników z title, content

### Zmienne Środowiskowe

```bash
# Port serwera
JIMBO_PORT=4111

# Modele (OpenRouter)
JIMBO_MODEL=deepseek/deepseek-r1-0528:free          # Phase 2 (streaming answer)
JIMBO_TOOL_MODEL=deepseek/deepseek-chat             # Phase 1 (tool-use)

# API Keys
OPENROUTER_API_KEY=sk-or-v1-...                     # WYMAGANY

# Usługi zewnętrzne
SEARXNG_URL=http://localhost:8888                   # SearXNG instance
JIMBO_GATEWAY_URL=https://jimbo-gateway.stolarnia-ams.workers.dev  # CF Worker
```

### Przykład Użycia (curl)

```bash
# Health check
curl http://localhost:4111/health

# Wyślij wiadomość
curl -X POST http://localhost:4111/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Wyszukaj najnowsze informacje o React 19",
    "session_id": "web:test-session"
  }'

# WebSocket (JavaScript)
const ws = new WebSocket('ws://127.0.0.1:4111/ws');
ws.onmessage = (e) => {
  const { event, data } = JSON.parse(e.data);
  if (event === 'chat:stream') console.log(data.content);
};
```

---

## BUCH_CHAT System

**Lokalizacja:** `src/components/assistant/`  
**Komponenty:**
- `AssistantPage.tsx` — Pełna strona asystenta
- `BuchChatWidget.tsx` — Floating chat button (widget)

**Dostępność:**
- ✅ Web (zenonbrowsers.org) — przez CF Worker `/api/ai/...`
- ✅ Electron — przez AI Gateway + IPC

### Tryby Pracy

| Mode | Opis | Dostępność |
|------|------|------------|
| `chat` | Multi-provider AI chat z session memory | Web + Electron |
| `prompts` | Biblioteka zapisanych promptów | Web + Electron |
| `kb` | Szybka baza wiedzy / notatki | Web + Electron |
| `settings` | Konfiguracja providerów, system prompt | Web + Electron |

### Providery AI (przez Jimbo Gateway)

#### Provider: OpenAI
**Models:**
- Chat: `gpt-4o`, `gpt-4o-mini`, `gpt-4-turbo`, `o3-mini`
- Image: `dall-e-3`, `dall-e-2`
- TTS: `tts-1`, `tts-1-hd`
- STT: `whisper-1`
- Embeddings: `text-embedding-3-small`, `text-embedding-3-large`
- Vision: `gpt-4o-vision`

**Capabilities:** chat, image, tts, stt, embeddings, vision

#### Provider: Anthropic
**Models:**
- Chat: `claude-sonnet-4-20250514`, `claude-3-5-haiku-20241022`, `claude-opus-4-20250514`
- Vision: `claude-sonnet-4-vision`

**Capabilities:** chat, vision

#### Provider: DeepSeek
**Models:**
- Chat: `deepseek-chat`, `deepseek-coder`, `deepseek-reasoner`

**Capabilities:** chat

#### Provider: Gemini
**Models:**
- Chat: `gemini-2.0-flash`, `gemini-2.5-pro`, `gemini-2.5-flash`
- Vision: `gemini-2.0-flash-vision`
- Embeddings: `text-embedding-004`

**Capabilities:** chat, vision, embeddings

#### Provider: OpenRouter
**Models:**
- `anthropic/claude-sonnet-4`
- `openai/gpt-4o`
- `meta-llama/llama-4-maverick`
- `google/gemini-2.5-pro`
- `mistralai/mistral-large`
- `deepseek/deepseek-r1`
- `qwen/qwen3-235b`
- `nvidia/llama-3.1-nemotron-ultra-253b`

**Capabilities:** chat, vision  
**Uwaga:** OpenRouter daje dostęp do 100+ modeli z różnych providerów

#### Provider: Together
**Models:**
- Chat: `meta-llama/Llama-3.3-70B-Instruct-Turbo`, `Qwen/Qwen2.5-72B-Instruct-Turbo`
- Image: `black-forest-labs/FLUX.1-schnell-Free`
- Embeddings: `togethercomputer/m2-bert-80M-8k-retrieval`

**Capabilities:** chat, image, embeddings

#### Provider: Replicate
**Models:**
- Image: `black-forest-labs/flux-1.1-pro`, `stability-ai/sdxl`

**Capabilities:** image

#### Provider: Stability
**Models:**
- Image: `stable-diffusion-xl-1024-v1-0`, `stable-image-ultra`

**Capabilities:** image

#### Provider: ElevenLabs
**Models:**
- TTS: `eleven_multilingual_v2`, `eleven_turbo_v2`, `eleven_monolingual_v1`

**Capabilities:** tts

#### Provider: HuggingFace
**Models:**
- Embeddings: `sentence-transformers/all-MiniLM-L6-v2`, `BAAI/bge-large-en-v1.5`

**Capabilities:** embeddings

#### Provider: Perplexity
**Models:**
- Chat: `llama-3.1-sonar-small-128k-online`, `llama-3.1-sonar-large-128k-online`, `llama-3.1-sonar-huge-128k-online`

**Capabilities:** chat  
**Uwaga:** Modele "online" mają dostęp do internetu

### System Prompt (Default)

```text
Jesteś BUCH_CHAT — asystentem AI projektu ZENO Browser / zenonbrowsers.org.
Projekt: Electron + React + Vite + Cloudflare Workers/Pages.
CI/CD: GitHub Actions → deploy-web.yml → Cloudflare Pages.
Workers: bonzo-media-hub.stolarnia-ams.workers.dev, moa.mybonzo.com.
Używasz /api/ai/chat (Cloudflare Worker) z providerami: DeepSeek R1, OpenRouter, Claude (Anthropic), Workers AI.
Odpowiadaj po polsku, chyba że użytkownik pisze inaczej.
```

### Storage & Persistence

**Backend:** `localStorage` (CF Pages compatible)

**Keys:**
- `buch-assistant-sessions` — Lista sesji chat
- `buch-assistant-cur-session` — ID aktualnej sesji
- `buch-assistant-prompts` — Zapisane prompty
- `buch-assistant-kb` — Notatki z bazy wiedzy
- `buch-assistant-settings` — Ustawienia (provider, model, API keys)

### Default Prompts (8 predefiniowanych)

| ID | Tytuł | Kategoria | Zastosowanie |
|----|-------|-----------|--------------|
| p1 | Wyjaśnij kod | dev | Analiza kodu krok po kroku |
| p2 | Napisz testy | dev | Generowanie testów Vitest/Jest |
| p3 | Popraw błędy | dev | Debugging i fix |
| p4 | Przetłumacz tekst | content | Tłumaczenie PL↔EN |
| p5 | Plan projektu | biznes | Planowanie z goals/risks/resources |
| p6 | Email profesjonalny | content | Pisanie formalnych emaili |
| p7 | Analiza danych | analiza | Analiza i wnioski |
| p8 | Refaktoryzacja | dev | Code cleanup & optimization |

### Brak Tool-Use (TODO)

**Status:** BUCH_CHAT obecnie **NIE** implementuje function calling / tool-use.

**Powód:**
- Endpoint `/api/ai/chat` wysyła proste tekstowe requesty
- Brak obsługi `tools` parameter w OpenRouter/Anthropic API
- Brak obsługi streamingu z tool results

**Jak naprawić (3 opcje):**

1. **Option A: Dodać tool-use do CF Worker**
   - Zaimplementować `tools` array w request do OpenRouter/Anthropic
   - Obsłużyć `tool_calls` w response
   - Wykonać narzędzia i przekazać wyniki

2. **Option B: Użyć JimboKit (już działa w Electron)**
   - JimboKitPanel na porcie 4111
   - CopilotKit Runtime z pełnym tool-calling
   - Dostępne tylko w wersji Electron

3. **Option C: Integracja z MCP Server (port 3847)**
   - MCP Server udostępnia 47 tools przez Model Context Protocol
   - Można podłączyć jako tool provider

---

## Jimbo Gateway Worker

**Lokalizacja:** `workers/jimbo-gateway/src/index.ts`  
**Deploy:** `https://jimbo-gateway.stolarnia-ams.workers.dev`  
**Wrangler:** `cd workers/jimbo-gateway && npx wrangler deploy`

### Główne Endpoints

#### AI Chat
**POST /chat**

Uniwersalne API dla chat completion z multi-provider support.

**Request Body:**
```typescript
{
  provider: 'openai' | 'anthropic' | 'deepseek' | 'gemini' | 'openrouter' | 'together' | 'perplexity',
  model: string,  // np. 'gpt-4o', 'claude-sonnet-4'
  messages: Array<{ role: 'user' | 'assistant' | 'system', content: string }>,
  temperature?: number,
  max_tokens?: number,
  stream?: boolean
}
```

**Response:**
```typescript
{
  content: string,
  usage: { prompt_tokens: number, completion_tokens: number, total_tokens: number },
  provider: string,
  model: string
}
```

#### Image Generation
**POST /images/generate**

**Providers:** OpenAI (DALL-E), Stability AI, Replicate

**Request Body:**
```typescript
{
  provider: 'openai' | 'stability' | 'replicate',
  model: string,
  prompt: string,
  n?: number,          // liczba obrazów (DALL-E)
  size?: string,       // '1024x1024', '1792x1024', etc.
  quality?: 'standard' | 'hd'
}
```

#### Text-to-Speech
**POST /speech/tts**

**Providers:** ElevenLabs, OpenAI TTS

**Request Body:**
```typescript
{
  provider: 'elevenlabs' | 'openai',
  model: string,
  input: string,     // tekst do syntezy
  voice: string      // ID głosu
}
```

**Response:** Audio binary (MP3)

#### Speech-to-Text
**POST /speech/stt**

**Providers:** OpenAI Whisper, Workers AI

**Request Body:** `multipart/form-data` z plikiem audio

**Response:**
```typescript
{
  text: string,  // transkrypcja
  language?: string
}
```

#### Embeddings
**POST /embeddings**

**Providers:** OpenAI, HuggingFace, Workers AI

**Request Body:**
```typescript
{
  provider: 'openai' | 'huggingface' | 'workersai',
  model: string,
  input: string | string[]  // tekst lub array tekstów
}
```

**Response:**
```typescript
{
  embeddings: number[][],  // array of vectors
  model: string
}
```

#### Vision Analysis
**POST /vision**

**Providers:** GPT-4o, Claude Vision, Gemini Vision

**Request Body:**
```typescript
{
  provider: 'openai' | 'anthropic' | 'gemini',
  model: string,
  image: string,      // base64 lub URL
  prompt: string      // pytanie o obraz
}
```

#### KB Search (Knowledge Base)
**POST /kb/search**

Semantic search w D1 database.

**Request Body:**
```typescript
{
  query: string,
  library?: string,  // opcjonalna nazwa biblioteki
  limit?: number     // max wyników (domyślnie 5)
}
```

**Response:**
```typescript
{
  results: Array<{
    id: string,
    title: string,
    content: string,
    library: string,
    score: number
  }>
}
```

#### KB Store
**POST /kb/store**

Zapisz dokument do bazy wiedzy (D1 + KV cache).

**Request Body:**
```typescript
{
  title: string,
  content: string,
  library: string,   // kategoria/biblioteka
  metadata?: object  // dodatkowe metadane
}
```

#### KB List
**GET /kb/list**

Lista wszystkich dokumentów w bazie.

**Query params:**
- `library` (optional) — filtruj po bibliotece

#### KB Libraries
**GET /kb/libraries**

Lista bibliotek tematycznych + statystyki.

**Response:**
```typescript
{
  libraries: Array<{
    name: string,
    count: number,
    topics: string[]
  }>
}
```

#### KB Topics
**GET /kb/topics**

Tematy wykryte w bibliotekach (analiza treści).

#### KB Categories
**GET /kb/categories**

Lista dostępnych kategorii (cached).

#### KB Browse
**GET /kb/browse**

Przeglądanie artykułów z filtrem po temacie.

**Query params:**
- `topic` (optional)
- `offset` (optional)
- `limit` (optional)

#### KB Details
**GET /kb/details/:id**

Szczegóły artykułu (pełna zawartość + metadane).

#### KB Bulk Export
**POST /kb/bulk-export**

Export całej biblioteki do JSON.

#### Datasets
**POST /datasets/create**

Utwórz dataset z biblioteki (snapshot).

**GET /datasets/list**

Lista datasetów.

#### Agents
**POST /agents/create**

Utwórz agenta dziedzinowego.

**Request Body:**
```typescript
{
  name: string,
  type: string,
  prompt: string,
  knowledge_base: string[],  // IDs dokumentów
  tools: string[]            // dostępne narzędzia
}
```

**GET /agents/list**

Lista agentów.

**POST /agents/:id/chat**

Chat z agentem dziedzinowym.

**GET /agents/:id/export**

Eksport konfiguracji agenta do innych aplikacji.

#### Storage (R2)
**GET /storage/list**

Lista plików R2.

**Query params:**
- `prefix` (optional)
- `limit` (optional)

**GET /storage/:key**

Pobierz plik z R2.

**PUT /storage/:key**

Upload pliku do R2.

**Request Body:** Binary data

#### Providers Info
**GET /providers**

Lista dostępnych providerów i ich możliwości.

**Response:**
```typescript
{
  providers: Array<{
    name: string,
    capabilities: ('chat' | 'image' | 'tts' | 'stt' | 'embeddings' | 'vision')[],
    models: Record<string, string>,
    available: boolean  // czy API key jest ustawiony
  }>
}
```

#### Health Check
**GET /health**

Status wszystkich bindingów (AI, D1, R2, KV).

**Response:**
```typescript
{
  status: 'ok',
  bindings: {
    AI: boolean,
    DB: boolean,
    STORAGE: boolean,
    CACHE: boolean
  },
  r2_buckets: string[],
  timestamp: number
}
```

### R2 Buckets (dostępne)

| Bucket | Zastosowanie |
|--------|--------------|
| R2_BONZO_MEDIA_HUB | Media hub główny |
| R2_JIMBO77_COMMUNITY_IMAGES | Community images |
| R2_JIMBO77COM_ASSETS | Assets statyczne |
| R2_MY_PROJECT_OPENNEXT_CACHE | OpenNext cache |
| R2_MYBONZO_AI_MODELS | Modele AI |
| R2_MYBONZO_ANALYTICS | Dane analityczne |
| R2_MYBONZO_BACKUPS | Backupy |
| R2_MYBONZO_BLOG_CONTENT | Treść bloga |
| R2_MYBONZO_FINANSE | Finanse |
| R2_MYBONZO_STORAGE | Storage główny |
| R2_MYBONZO_VIDEOS | Wideo |
| R2_PUMO_RAW_DATA | PUMO raw data |
| R2_VIBESDK_TEMPLATES | VibeSDK templates |
| R2_ZEN_BLOG_IMAGES | ZENO Blog images |
| R2_ZEN_STATIC_ASSETS | ZENO static assets |

### Secrets (wymagane)

```bash
# Provider API Keys
wrangler secret put OPENAI_API_KEY
wrangler secret put ANTHROPIC_API_KEY
wrangler secret put DEEPSEEK_API_KEY
wrangler secret put GEMINI_API_KEY
wrangler secret put OPENROUTER_API_KEY
wrangler secret put TOGETHER_API_KEY
wrangler secret put REPLICATE_API_TOKEN
wrangler secret put STABILITY_API_KEY
wrangler secret put ELEVENLABS_API_KEY
wrangler secret put HUGGINGFACE_API_KEY
wrangler secret put PERPLEXITY_API_KEY

# CF Gateway (optional)
wrangler secret put CF_GATEWAY_BASE
```

---

## Dostępne Modele AI

### Podsumowanie Providerów

| Provider | Chat | Image | TTS | STT | Embeddings | Vision | Models Count |
|----------|------|-------|-----|-----|------------|--------|--------------|
| OpenAI | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 12 |
| Anthropic | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | 4 |
| DeepSeek | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | 3 |
| Gemini | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ | 5 |
| OpenRouter | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | 100+ |
| Together | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | 4 |
| Replicate | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | 2 |
| Stability | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | 2 |
| ElevenLabs | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | 3 |
| HuggingFace | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | 2 |
| Perplexity | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | 3 |

### Rekomendacje Modeli

#### Dla Chat (rozmowa)
1. **DeepSeek R1** — Najtańszy, dobra jakość, reasoning mode
2. **Claude Sonnet 4** — Najwyższa jakość, długie konteksty
3. **GPT-4o** — Universal, multimodal, najszybszy
4. **Gemini 2.5 Pro** — Darmowy, 2M token context window
5. **OpenRouter (dowolny)** — Fallback na 100+ modeli

#### Dla Image Generation
1. **FLUX.1.1 Pro** (Replicate) — Najwyższa jakość
2. **DALL-E 3** (OpenAI) — Najszybszy, dobra jakość
3. **FLUX Schnell** (Together) — Darmowy, bardzo szybki

#### Dla TTS
1. **ElevenLabs** — Najbardziej naturalny głos
2. **OpenAI TTS-1-HD** — Najszybszy, dobra jakość

#### Dla STT
1. **Whisper-1** (OpenAI) — Najlepsza jakość transkrypcji

#### Dla Embeddings
1. **text-embedding-3-small** (OpenAI) — Najszybszy, mały rozmiar
2. **text-embedding-3-large** (OpenAI) — Najwyższa jakość

#### Dla Vision
1. **GPT-4o-vision** — Najszybszy, dobra jakość
2. **Claude Sonnet 4 Vision** — Najlepsze rozumienie obrazów

---

## Jak Używać Narzędzi

### Dla Agentów AI (System Prompt)

Jeśli jesteś agentem AI używającym ZENO Browser ecosystem:

#### 1. Wybierz Właściwą Usługę

**Użyj JIMbo_kit Server (port 4111) gdy:**
- Potrzebujesz tool-calling (web_search, fetch_url, kb_search)
- Chcesz dwufazowego przetwarzania (tool-use → streaming)
- Pracujesz w środowisku Electron (lokalnie)
- Potrzebujesz session management

**Użyj BUCH_CHAT (przez Jimbo Gateway) gdy:**
- Potrzebujesz prostego chat completion
- Pracujesz w środowisku web (zenonbrowsers.org)
- Chcesz dostępu do 100+ modeli przez OpenRouter
- Potrzebujesz image/tts/stt/embeddings/vision

**Użyj Jimbo Gateway bezpośrednio gdy:**
- Potrzebujesz dostępu do KB (knowledge base)
- Chcesz zarządzać datasetami/agentami
- Potrzebujesz R2 storage access
- Chcesz info o dostępnych providerach

#### 2. Przykłady Wywołań

**Wyszukiwanie w internecie (JIMbo_kit):**
```javascript
// Wyślij message do JIMbo_kit
fetch('http://localhost:4111/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: 'Znajdź najnowsze informacje o React 19',
    session_id: 'web:my-session'
  })
});

// JIMbo_kit automatycznie wykryje potrzebę web_search i go wykona
// Wynik dostaniesz przez WebSocket ws://127.0.0.1:4111/ws
```

**Chat completion (BUCH_CHAT przez Gateway):**
```javascript
fetch('https://jimbo-gateway.stolarnia-ams.workers.dev/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    provider: 'deepseek',
    model: 'deepseek-chat',
    messages: [
      { role: 'system', content: 'Jesteś pomocnym asystentem.' },
      { role: 'user', content: 'Wyjaśnij, czym jest React Suspense.' }
    ]
  })
});
```

**Wyszukiwanie w bazie wiedzy:**
```javascript
fetch('https://jimbo-gateway.stolarnia-ams.workers.dev/kb/search', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: 'Cloudflare Workers deployment',
    library: 'local_03_connections',
    limit: 5
  })
});
```

**Generowanie obrazów:**
```javascript
fetch('https://jimbo-gateway.stolarnia-ams.workers.dev/images/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    provider: 'openai',
    model: 'dall-e-3',
    prompt: 'A futuristic browser interface with AI assistant',
    size: '1024x1024',
    quality: 'hd'
  })
});
```

#### 3. Tool-Calling Strategy

##### Kiedy Model Powinien Wywołać web_search:
- Pytanie o current events ("Co się dzieje...?", "Najnowsze...")
- Pytanie o konkretne daty/liczby po 2023 roku
- Pytanie wymagające weryfikacji faktów
- Unknown facts (model nie jest pewien odpowiedzi)

##### Kiedy Model Powinien Wywołać fetch_url:
- "Przeczytaj tę stronę: https://..."
- "Co jest na stronie...?"
- "Podsumuj artykuł z URL..."
- Analiza konkretnej strony WWW

##### Kiedy Model Powinien Wywołać kb_search:
- Pytanie o projekt ZENO Browser
- Pytanie o konfigurację/deployment
- Pytanie o zapisane dokumenty
- "Co wiesz o...?" (w kontekście projektu)

#### 4. Error Handling

**Timeouty:**
- web_search: 8s
- fetch_url: 10s
- kb_search: 8s

**Retry Strategy:**
- Pojedyncze retry przy timeout
- Fallback na inne źródło (np. web_search → fetch_url)
- Informuj użytkownika o błędzie

#### 5. Context Management

**Session Memory (JIMbo_kit):**
- Sesje są per `session_id`
- Historia ostatnich 20 wiadomości
- Automatyczne oczyszczanie starych sesji

**BUCH_CHAT (localStorage):**
- Sesje zapisywane w localStorage
- Nie ma limitu liczby sesji
- Użytkownik może ręcznie usuwać sesje

---

## FAQ dla Agentów AI

### Q: Kiedy użyć JIMbo_kit, a kiedy BUCH_CHAT?

**A:** 
- **JIMbo_kit** — gdy potrzebujesz tool-calling (web_search, fetch_url, kb_search) i pracujesz lokalnie (Electron)
- **BUCH_CHAT** — gdy potrzebujesz prostego chat completion w przeglądarce web lub dostępu do wielu providerów

### Q: Czy BUCH_CHAT ma tool-calling?

**A:** NIE. BUCH_CHAT obecnie nie implementuje function calling. To TODO na przyszłość. Użyj JIMbo_kit jeśli potrzebujesz tools.

### Q: Jak wybrać najlepszy model?

**A:**
- **Rozumowanie:** DeepSeek R1, Claude Sonnet 4
- **Szybkość:** GPT-4o, Gemini 2.0 Flash
- **Koszt:** DeepSeek (najtańszy), Gemini (darmowy)
- **Długi kontekst:** Gemini 2.5 Pro (2M tokens), Claude (200k)

### Q: Co to jest CF Gateway?

**A:** Cloudflare AI Gateway — proxy dla AI API, które:
- Cachuje odpowiedzi (oszczędność kosztów)
- Loguje requesty (monitoring)
- Rate limiting
- Fallback między providerami

### Q: Jak działa failover w Jimbo Gateway?

**A:** Gateway próbuje kolejno:
1. Wybrany provider
2. CF Gateway (jeśli ustawiony)
3. Workers AI (jeśli dostępny)
4. Zwróć błąd 503

### Q: Czy mogę streamować odpowiedzi?

**A:**
- **JIMbo_kit:** TAK (przez WebSocket)
- **BUCH_CHAT:** NIE (TODO)
- **Jimbo Gateway:** TAK (jeśli `stream: true` w request)

### Q: Gdzie są zapisywane API keys?

**A:**
- **JIMbo_kit:** `.env` lub `../.env` w katalogu serwera
- **BUCH_CHAT:** localStorage (niezalecane w produkcji)
- **Jimbo Gateway:** Cloudflare Secrets (bezpieczne)

### Q: Jak dodać nowy tool do JIMbo_kit?

**A:**
1. Dodaj definicję do `TOOLS` array w `server.ts`
2. Dodaj logikę w `executeTool()` function
3. Restart serwera
4. Model automatycznie wykryje nowy tool

---

## Maintenance Notes

**Ostatnia aktualizacja:** 31 marca 2026  
**Maintainer:** ZENO Browser Team  
**Kontakt:** GitHub Issues / zenonbrowsers.org

**Known Issues:**
- BUCH_CHAT nie ma tool-calling (TODO)
- BUCH_CHAT nie ma streamingu (TODO)
- JIMbo_kit działa tylko lokalnie (Electron)
- SearXNG musi być uruchomiony osobno (port 8888)

**Roadmap:**
1. Tool-calling dla BUCH_CHAT (Q2 2026)
2. Streaming w BUCH_CHAT (Q2 2026)
3. MCP Server integration (Q2 2026)
4. Web version JIMbo_kit (Q3 2026)
5. Persistent history w cloud (Q3 2026)

---

**END OF INDEX**
