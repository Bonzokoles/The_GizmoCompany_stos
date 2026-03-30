# Strona: Providerzy (`#page-providers`)

**Zakładka nav:** 🔌 Providerzy
**ID strony:** `page-providers`
**Moduł JS:** `js/modules/providers.js`
**Dane:** `js/data/providers.js` — tablica `PROVIDERS[]`

---

## Co robi

Grid kart z listą wszystkich dostawców AI zintegrowanych przez LiteLLM proxy. Pokazuje ikonę, nazwę, listę modeli i status (online/offline).

---

## Dane providerów

Każdy provider w `PROVIDERS[]` ma pola:

| Pole | Typ | Opis |
|------|-----|------|
| `name` | string | Nazwa providera |
| `icon` | string | Emoji lub litera ikony |
| `bg` | string | Kolor tła ikony (hex/rgb) |
| `models` | number | Liczba modeli tego providera w MODELS[] |
| `status` | `'online' \| 'offline'` | Status integracji |
| `desc` | string | Krótki opis z listą kluczowych modeli |

### Aktualna lista (16 providerów)

| Provider | Ikona | Modele | Status |
|----------|-------|--------|--------|
| Anthropic | A | 3 | online |
| OpenAI | ◎ | 5 | online |
| Google | G | 3 | online |
| DeepSeek | D | 1 | online |
| xAI | X | 1 | online |
| Mistral | M | 1 | online |
| Moonshot | 🌙 | 1 | online |
| Alibaba | Q | 1 | online |
| Microsoft | ⊞ | 1 | online |
| Stability | S | 1 | online |
| ElevenLabs | XI | 1 | online |
| Zhipu | Z | 1 | online |
| MiniMax | M² | 1 | online |
| Groq | ⚡ | 0 | online |
| OpenRouter | ↗ | 8 | online |
| Ollama | 🦙 | 0 | offline |

**Uwaga:** Ollama jest oznaczony jako offline (`status: 'offline'`) — usunięty z integracji z powodu braku wsparcia dla języka polskiego.

---

## Wygląd kart

Każda karta (`.provider-card`) zawiera:
1. **Ikona** — kwadrat z kolorem `bg` i literą/emoji
2. **Nazwa** providera
3. **Opis** z listą modeli
4. **Liczba modeli** — `X modeli`
5. **Status dot** — zielona kropka (online) lub szara (offline)

Karty nie mają kliknięcia — są czysto informacyjne.

---

## Funkcje JS

### `renderProviders()` — `providers.js:6`

Renderuje wszystkie karty z `PROVIDERS[]` do `#providers-grid`. Brak filtrowania.

---

## Inicjalizacja

```js
// main.js — DOMContentLoaded
renderProviders();  // jednorazowe renderowanie, brak initProviders()
```

Brak wyszukiwarki ani filtrów — wyświetla wszystkich providerów.

---

## Modyfikacja

Aby dodać providera: edytuj `js/data/providers.js`.
Aby zmienić status na offline: zmień `status: 'offline'` dla danego providera.

**Groq** ma `models: 0` bo nie ma dedykowanych modeli w `MODELS[]` — jest traktowany jako infrastruktura (ultra-fast inference), nie jako dostawca konkretnych modeli.
