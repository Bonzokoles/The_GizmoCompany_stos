# Strona: Modele AI (`#page-models`)

**Zakładka nav:** 🧠 Modele AI
**ID strony:** `page-models`
**Moduł JS:** `js/modules/models.js`
**Dane:** `js/data/models.js` — tablica `MODELS[]`

---

## Co robi

Katalog wszystkich modeli AI — API, lokalnych i konteneryzowanych. Umożliwia:
- Filtrowanie po typie i kategorii (pill-buttons)
- Wyszukiwanie tekstowe (search input)
- Przeglądanie kart z informacjami o każdym modelu

---

## Dane modeli

Każdy model w `MODELS[]` ma pola:

| Pole | Typ | Opis |
|------|-----|------|
| `name` | string | Nazwa modelu |
| `provider` | string | Nazwa dostawcy |
| `type` | `'api' \| 'local'` | Typ dostępu |
| `cats` | string[] | Kategorie: `text`, `code`, `vision`, `image`, `embedding`, `audio` |
| `ctx` | string | Rozmiar okna kontekstu (np. `200K`, `1M`) |
| `input` | number | Cena input per 1M tokenów (USD); 0 = darmowy |
| `output` | number | Cena output per 1M tokenów (USD); 0 = brak/darmowy |
| `tier` | `'free' \| 'budget' \| 'premium' \| 'enterprise'` | Poziom cenowy |
| `desc` | string | Krótki opis po polsku |

### Aktualna lista modeli (22 modeli)

**API — Text/Code:**
- Claude Sonnet 4 (Anthropic) — $3/$15, 200K ctx
- Claude Opus 4.6 (Anthropic) — $15/$75, 200K ctx
- GPT-4o (OpenAI) — $2.5/$10, 128K ctx — multimodal
- GPT-5.3 Codex (OpenAI) — $12/$48, 256K ctx — coding
- Gemini 2.0 Flash (Google) — $0.075/$0.3, 1M ctx
- Gemini 3 Flash (Google) — $0.1/$0.4, 2M ctx
- DeepSeek R1 8B (DeepSeek) — $0.14/$2.19, 128K ctx
- Qwen 2.5 14B (Alibaba) — $0.5/$1.5, 128K ctx
- Grok 4 (xAI) — $3/$15, 256K ctx
- Kimi K2.5 (Moonshot) — $1/$4, 200K ctx
- GLM-5 (Zhipu) — $1/$4, 128K ctx
- MiniMax M2.5 (MiniMax) — $0.5/$2, 128K ctx — text+audio
- Mistral Large (Mistral) — $2/$6, 128K ctx

**Local (darmowe):**
- Gemma 2B (Google) — 8K ctx
- Phi Nano 0.5B (Microsoft) — 4K ctx

**Embedding:**
- text-embedding-3-small (OpenAI) — $0.02, 8K ctx
- text-embedding-3-large (OpenAI) — $0.13, 8K ctx

**Vision/Image:**
- DALL·E 3 (OpenAI) — $40/obraz
- Stable Diffusion XL (Stability) — darmowy
- Claude Vision (Anthropic) — $3/$15, 200K ctx

**Audio:**
- Whisper Large v3 (OpenAI) — $0.006/min, STT
- ElevenLabs TTS (ElevenLabs) — $0.3, TTS

---

## Filtrowanie

### Filter pills (`#model-pills`)

| `data-mf` | Co filtruje |
|-----------|-------------|
| `all` | Wszystkie modele |
| `api` | `type === 'api'` |
| `local` | `type === 'local'` |
| `text` | `cats.includes('text')` |
| `vision` | `cats.includes('vision')` |
| `embedding` | `cats.includes('embedding')` |
| `image` | `cats.includes('image')` |
| `audio` | `cats.includes('audio')` |
| `code` | `cats.includes('code')` |

### Wyszukiwarka (`#model-search`)

Szuka (case-insensitive) w: `name`, `provider`, `cats`.

---

## Funkcje JS

### `renderModels()` — `models.js:9`

Filtruje `MODELS[]` wg `modelFilter` i `modelSearch`, renderuje karty HTML w `#models-grid`.

Karta modelu zawiera:
- Nazwa + provider
- Badge `API`/`LOCAL`
- Opis
- Tagi kategorii + context size
- Cena input/output lub `🆓 Free`
- Badge tieru

### `initModels()` — `models.js:46`

Podpina `input` event na `#model-search` i `click` na każdy pill z `#model-pills`.

---

## Inicjalizacja

```js
// main.js — DOMContentLoaded
renderModels();  // renderuje wszystkie od razu
initModels();    // podpina event listenery
```

Nie wymaga lazy init. Renderuje się natychmiast przy załadowaniu.

---

## Dodawanie nowych modeli

Edytuj tablicę w `js/data/models.js`. Dodaj obiekt z wszystkimi polami. Nowy model pojawi się automatycznie w:
- Katalogu modeli
- Tabeli cennik (jeśli `input > 0`)
- Dashboardzie (jeśli jest w liście `topNames`)
