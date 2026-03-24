# Strona: JIMBO Studio (`#page-jimbo`)

**Zakładka nav:** 💬 JIMBO Studio
**ID strony:** `page-jimbo`
**Moduł JS:** `js/modules/jimbo.js`
**Backend:** Cloudflare Worker `jimbo-gateway`

---

## Co robi

JIMBO Studio to panel zarządzania zasobami bazy wiedzy — przeglądanie bibliotek tematycznych, generowanie datasetów i tworzenie agentów dziedzinowych. Pozwala na:
1. Przeglądanie dostępnych bibliotek KB z liczbą dokumentów
2. Przeglądanie najczęstszych tematów w KB
3. Tworzenie datasetów z artykułów KB
4. Tworzenie agentów dziedzinowych gotowych do eksportu
5. Eksport konfiguracji agenta do schowka (JSON)

---

## Połączenie z backendem

### Endpoint input (`#jimbo-endpoint`)

Domyślnie: `https://jimbo-gateway.stolarnia-ams.workers.dev`

Użytkownik może zmienić URL. Brak persystencji w localStorage (dla jimbo — w przeciwieństwie do KB endpoint, który zapisuje do localStorage).

### Funkcja `jimboFetch(path, opts)`

Wrapper na `fetch()` — dokłada base URL z `#jimbo-endpoint`, obsługuje błędy HTTP.

---

## Sekcje

### Biblioteki tematyczne (`#jimbo-libraries`)

Każda biblioteka wyświetlana jako wiersz: `nazwa — X docs`.

Dane z: `GET /kb/libraries`

### Najczęstsze tematy (`#jimbo-topics`)

Chip-buttons z tematami i liczbą artykułów. Kliknięcie tematu automatycznie wpisuje go w pola `#jimbo-ds-topic` i `#jimbo-agent-topic`.

Dane z: `GET /kb/topics?library=all&limit=24`

### Utwórz dataset (`#jimbo-ds-*`)

Formularz:
- `#jimbo-ds-name` — nazwa datasetu (np. `Finanse-PL-KB`)
- `#jimbo-ds-topic` — temat (np. `współczesne finanse`)
- `#jimbo-ds-library` — biblioteka (np. `finance` lub `all`), domyślnie `finance`
- `#jimbo-ds-query` — opcjonalne zapytanie seed
- Wynik w `#jimbo-ds-result`

Po sukcesie: `✅ Dataset utworzony: #ID (X items)`

### Utwórz agenta (`#jimbo-agent-*`)

Formularz:
- `#jimbo-agent-name` — nazwa agenta (np. `Agent Finansowy`)
- `#jimbo-agent-topic` — temat specjalizacji
- `#jimbo-agent-library` — biblioteka wiedzy, domyślnie `finance`
- `#jimbo-agent-model` — model do użycia, domyślnie `deepseek-chat`
- Wynik w `#jimbo-agent-result`

Po sukcesie: `✅ Agent utworzony: #ID`

### Lista agentów (`#jimbo-agents`)

Każdy agent z przyciskiem **Eksport** → wywołuje `jimboExportAgent(id)` — pobiera JSON konfiguracji i kopiuje do schowka.

### Lista datasetów (`#jimbo-datasets`)

Każdy dataset: nazwa, temat, biblioteka, liczba items.

---

## Funkcje JS

### `jimboReloadAll()` — `jimbo.js:16`

Pobiera równolegle (Promise.all):
- `/kb/libraries` → `#jimbo-libraries`
- `/kb/topics?library=all&limit=24` → `#jimbo-topics`
- `/datasets/list` → `#jimbo-datasets`
- `/agents/list` → `#jimbo-agents`

Wywołanie: przycisk "Odśwież dane" lub automatycznie przy pierwszym wejściu na zakładkę (lazy init).

### `jimboCreateDataset()` — `jimbo.js:64`

Odczytuje wartości z formularza, wysyła `POST /datasets/create`, pokazuje wynik w `#jimbo-ds-result`. Po sukcesie wywołuje `jimboReloadAll()`.

### `jimboCreateAgent()` — `jimbo.js:81`

Analogicznie: `POST /agents/create`. Model domyślny: `deepseek-chat`.

### `jimboExportAgent(id)` — `jimbo.js:98`

Pobiera `GET /agents/{id}/export`, kopiuje JSON do `navigator.clipboard`. Wyświetla `alert()` z potwierdzeniem.

---

## Inicjalizacja (lazy)

Dane ładowane tylko przy pierwszym wejściu na zakładkę:

```js
// router.js
if (id === 'jimbo' && !jimboInitialized) {
  jimboInitialized = true;
  jimboReloadAll();
}
```

---

## Uwagi

- `jimboExportAgent` używa `navigator.clipboard` — wymaga HTTPS lub localhost
- Tworzenie datasetów/agentów operuje na backendzie KB — wymaga aktywnego gateway
- Pole modelu agenta (`deepseek-chat`) to domyślna wartość — użytkownik może zmienić na dowolny model obsługiwany przez gateway
- Kliknięcie tematu w `#jimbo-topics` automatycznie wypełnia pola topic w obu formularzach
