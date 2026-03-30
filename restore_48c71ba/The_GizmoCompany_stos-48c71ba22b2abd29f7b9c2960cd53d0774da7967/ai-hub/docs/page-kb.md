# Strona: Knowledge Browser (`#page-kb`)

**Zakładka nav:** 📖 Knowledge Browser
**ID strony:** `page-kb`
**Moduł JS:** `js/modules/kb.js`
**Backend:** Cloudflare Worker `jimbo-gateway`

---

## Co robi

Knowledge Browser to główny interfejs do przeglądania i zarządzania bazą wiedzy DEVz HUB. Umożliwia:
1. Przeglądanie bibliotek tematycznych i artykułów
2. Filtrowanie artykułów po tematach
3. Pełnotekstowe wyszukiwanie
4. Czytanie pełnych artykułów w modalu
5. Zaznaczanie artykułów i tworzenie datasetów
6. Eksport całej biblioteki do JSON
7. Ręczne dodawanie artykułów do KB
8. Import plików z lokalnego folderu (DEVz HUB)

---

## Stan aplikacji (`kbState`)

```js
const kbState = {
  currentLib: 'general',      // aktywna biblioteka
  articles: [],               // załadowane artykuły
  selectedIds: new Set(),     // zaznaczone ID artykułów
  selectedArticleId: null,    // ID artykułu otwartego w modalu
};
```

---

## Sekcje UI

### Konfiguracja endpoint (`#kb-endpoint`)

URL gateway — domyślnie `https://jimbo-gateway.stolarnia-ams.workers.dev`.
`oninput` → auto-zapis do `localStorage.setItem('kb_endpoint', this.value)`.
Przy starcie `initKb()` przywraca zapisaną wartość.

### Sidebar — Kategorie (`#kb-categories`)

Przyciski bibliotek tematycznych. Aktywna biblioteka ma podświetlenie kolorem akcentu.
Kliknięcie → `kbSwitchLibrary(lib)`.

### Sidebar — Tematy (`#kb-topics`)

Chip-buttons z tematami (nazwa + liczba artykułów).
Kliknięcie → `kbFilterByTopic(topic)` → ładuje artykuły filtrowane po temacie.

### Statystyki

| ID | Co pokazuje |
|----|-------------|
| `#kb-stats-count` | Liczba załadowanych artykułów |
| `#kb-stats-lib` | Liczba dostępnych bibliotek |
| `#kb-stats-selected` | Liczba zaznaczonych artykułów |

### Grid artykułów (`#kb-articles`)

Karty artykułów z:
- Checkbox do zaznaczania (`onchange="kbToggleSelect(id)"`)
- Tytuł (kliknięcie → `kbShowDetail(id)`)
- Excerpt (skrócony opis)
- Tagi (max 3)
- Przycisk "Przeczytaj" → `kbShowDetail(id)`

### Modal artykułu (`#kb-modal`)

Full-screen overlay z treścią artykułu:
- `#kb-modal-title` — tytuł
- `#kb-modal-meta` — biblioteka, data, źródło
- `#kb-modal-content` — pełna treść (newline → `<br>`)
- Przyciski: "Dodaj do datasetu" i "Utwórz agenta"
- Klik na tło lub `✕` → `kbCloseDetail()`

### Akcje zbiorcze

Po zaznaczeniu artykułów przez checkboxy:
- `#kb-dataset-name` — nazwa nowego datasetu
- `#kb-dataset-topic` — temat datasetu
- Przycisk "Eksportuj bibliotekę" → `kbExportLibrary()`
- Przycisk "Utwórz dataset (zaznaczone)" → `kbBulkCreateDataset()`
- `#kb-action-result` — komunikat wyniku

### Dodaj artykuł manualnie

Formularz:
- `#kb-add-title` — tytuł
- `#kb-add-library` — biblioteka (np. `ai`, `finance`, `devops`)
- `#kb-add-content` — treść (textarea)
- `#kb-add-source` — URL źródła (opcjonalne)
- `#kb-add-tags` — tagi oddzielone przecinkiem (opcjonalne)
- `#kb-add-result` — wynik operacji

### Import lokalny (`#kb-local-panel`)

Panel zawsze widoczny (`display:block`). Stały dostęp do DEVz HUB.

#### Pole biblioteki (`#kb-local-lib`)

Nazwa biblioteki docelowej dla importowanych plików. Domyślnie `devz-hub`.
Persistowane w localStorage (`kb_local_lib`).

#### Skróty DEVz HUB — knowledge_base

21 shortcut-buttons odpowiadających podfolderom:

| Przycisk | `kbSetLib()` argument | Folder |
|----------|-----------------------|--------|
| 01 AI SEO | `01_ai_seo` | knowledge_base/01 |
| 02 WhiteCat | `02_whitecat` | |
| 03 Python | `03_python` | |
| 04 eCommerce | `04_ecommerce` | |
| 05 Agents/RAG | `05_agents_rag` | |
| 06 Finance | `06_finance` | |
| 07 B2B Sales | `07_b2b_sales` | |
| 08 Marketplace | `08_marketplace` | |
| 09 Buy&Sell | `09_buy_sell` | |
| 10 Market | `10_market_analysis` | |
| 13 AI News | `13_ai_news` | |
| 16 Prompts | `16_prompt_library` | |
| 17 Agents KB | `17_agent_knowledge` | |
| 18 MCP Tools | `18_mcp_tools` | |
| 19 Projects | `19_project_plans` | |
| 20 Training | `20_training` | |

#### Skróty LOCAL_LIBRARIES

| Przycisk | `kbSetLib()` argument |
|----------|-----------------------|
| 00 General | `00_general` |
| 01 Dev Notes | `01_dev_notes` |
| 02 Research | `02_research` |
| 03 Snippets | `03_snippets` |
| 04 Archives | `04_archives` |

#### Input pliki

Dwa file inputs:
- `#kb-local-files` — folder (atrybut `webkitdirectory`) — importuje cały podfolder
- `#kb-local-files-single` — pojedyncze pliki (multi-select)

Po wyborze plików → `kbImportFiles(files)`.

---

## Funkcje JS

### `initKb()` — `kb.js:257`

Uruchamiana w `DOMContentLoaded`. Robi:
1. Przywraca `kb_endpoint` z localStorage → wpisuje do `#kb-endpoint` i `#jimbo-endpoint`
2. Przywraca `kb_local_lib` z localStorage → wpisuje do `#kb-local-lib`
3. Aktualizuje podświetlenie shortcut-buttons (`kbUpdateShortcutButtons()`)
4. Podpina `change` events na file inputs
5. Po 800ms → auto-wywołuje `kbLoadLibraries()` w tle

### `kbLoadLibraries()` — `kb.js:24`

Pobiera `GET /kb/categories`. Renderuje kategorie w sidebar. Aktualizuje `#kb-stats-lib`. Wywołuje `kbLoadTopics()`.

### `kbSwitchLibrary(lib)` — `kb.js:39`

Ustawia `kbState.currentLib = lib`. Ładuje tematy + artykuły równolegle. Odświeża listę kategorii (podświetlenie aktywnej).

### `kbLoadTopics()` — `kb.js:45` (private)

Pobiera `GET /kb/topics?library={currentLib}&limit=15`. Renderuje chip-buttons tematów.

### `kbLoadArticles(topic)` — `kb.js:56` (private)

Pobiera `GET /kb/browse?library={lib}&limit=30[&topic=X]`. Zapisuje do `kbState.articles`, renderuje grid.

### `kbShowDetail(id)` — `kb.js:89`

Pobiera `GET /kb/details/{id}`. Wypełnia i pokazuje `#kb-modal`. Zapisuje `kbState.selectedArticleId`.

### `kbCloseDetail()` — `kb.js:107`

Ukrywa `#kb-modal`.

### `kbToggleSelect(id)` — `kb.js:111`

Dodaje/usuwa ID z `kbState.selectedIds`. Aktualizuje licznik `#kb-stats-selected`.

### `kbFilterByTopic(topic)` — `kb.js:117`

Wywołuje `kbLoadArticles(topic)`.

### `kbSearchArticles()` — `kb.js:121`

Wyświetla `prompt()` z pytaniem o query. Wysyła `POST /kb/search {query, library, limit:30}`. Renderuje wyniki.

### `kbBulkCreateDataset()` — `kb.js:162`

Sprawdza `#kb-dataset-name`, `#kb-dataset-topic` i `kbState.selectedIds`. Wysyła `POST /datasets/create` z ID zaznaczonych artykułów.

### `kbExportLibrary()` — `kb.js:181`

Pobiera `POST /kb/bulk-export {library, limit:500}`. Tworzy blob JSON i wymusza download pliku `{lib}-kb-export.json`.

### `kbAddArticle()` — `kb.js:202`

Odczytuje formularz add-article, wysyła `POST /kb/store`. Czyści formularz po sukcesie.

### `kbImportFiles(files)` — `kb.js:218`

Iteruje tablicę plików:
- Obsługiwane rozszerzenia: `md`, `txt`, `json`, `yaml`, `yml`, `html`, `ts`, `tsx`, `js`
- Max rozmiar pliku: 500KB
- Dla każdego pliku: `title` z nazwy pliku (bez ext), `source` z `webkitRelativePath`
- Wysyła `POST /kb/store`
- Aktualizuje progress w `#kb-local-progress`
- Po zakończeniu: `kbLoadLibraries()`

### `kbSetLib(name)` — `kb.js:243`

Ustawia `#kb-local-lib.value = name`. Zapisuje do `localStorage('kb_local_lib')`. Aktualizuje shortcut buttons.

### `kbUpdateShortcutButtons()` — `kb.js:249`

Porównuje aktualną wartość `#kb-local-lib` z atrybutami `onclick` wszystkich `.kb-shortcut-btn`. Aktywny button dostaje klasę `active`.

---

## Inicjalizacja (lazy + auto)

Podwójny mechanizm:

1. **Auto-load w tle** (`initKb()` → `setTimeout 800ms`) — ładuje biblioteki jeszcze zanim user wejdzie na zakładkę
2. **Lazy init przy zakładce** (`router.js`) — jeśli biblioteki nie załadowane przy wejściu na zakładkę

```js
// router.js
if (id === 'kb' && !kbInitialized) {
  kbInitialized = true;
  kbLoadLibraries();
}
```

---

## Uwagi

- `kbSearchArticles()` używa `window.prompt()` — blokuje UI na czas wpisywania
- Import plików wymaga zgody na dostęp do systemu plików (browser file picker)
- Eksport biblioteki pobiera max 500 artykułów
- `kbCreateAgentFromArticle()` to stub — pokazuje alert, pełna implementacja planowana
- `kbAddToDataset()` to stub — pokazuje alert z ID artykułu
