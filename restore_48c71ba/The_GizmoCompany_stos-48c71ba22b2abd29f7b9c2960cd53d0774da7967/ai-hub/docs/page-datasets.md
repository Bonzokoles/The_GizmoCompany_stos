# Strona: Datasety HuggingFace (`#page-datasets`)

**Zakładka nav:** 📚 Datasety
**ID strony:** `page-datasets`
**Moduł JS:** `js/modules/datasets.js`
**Dane:** Na żywo z HuggingFace Hub API

---

## Co robi

Wyszukiwarka i przeglądarka datasetów z HuggingFace Hub (200 000+ zbiorów danych). Pobiera dane na żywo przez publiczne API HuggingFace. Obsługuje:
- Preset queries (kategorie pill-buttons)
- Wyszukiwanie tekstowe z debouncingiem
- Cache wyników (session-level, nie localStorage)
- Kliknięcie karty → otwiera dataset na HuggingFace.co

---

## API HuggingFace

**URL:** `https://huggingface.co/api/datasets`

**Parametry:**
- `limit=24` — max 24 datasety na zapytanie
- `sort=downloads` — sortowanie po popularności
- `search=query` — opcjonalne słowo kluczowe

**Brak autoryzacji** — publiczne API, bez tokena (anonimowe, mogą być rate limity).

---

## Preset queries (kategorie)

Pill-buttons w `#ds-pills`:

| `data-ds` | Query do API | Co szuka |
|-----------|-------------|----------|
| `trending` | `''` (pusty) | Najpopularniejsze datasety |
| `polish` | `'polish'` | Datasety polskie |
| `nlp` | `'text-classification'` | Klasyfikacja tekstu |
| `code` | `'code'` | Datasety kodu |
| `vision` | `'image-classification'` | Klasyfikacja obrazów |
| `audio` | `'automatic-speech-recognition'` | ASR/STT |

---

## Wyszukiwarka (`#ds-search`)

- Debouncing 500ms — szuka po min. 2 znakach
- Szuka po nazwie i opisie datasetu
- Cache: wyniki dla danego query przechowywane w `dsCache{}` (w pamięci, resetuje się przy odświeżeniu strony)

---

## Inicjalizacja (lazy)

Strona datasets jest **lazy-loaded** — dane pobierane dopiero przy pierwszym wejściu na zakładkę:

```js
// router.js
if (id === 'datasets' && !dsInitialized) {
  dsInitialized = true;
  searchDatasets('');  // pobierz trending
}
```

`initDatasets()` podpina tylko event listenery (search + pills) — bez pobierania danych.

---

## Stany UI

| Stan | Elementy |
|------|---------|
| Ładowanie | `#ds-loading` widoczny, grid ukryty |
| Wyniki | `#ds-grid` z kartami, loading ukryty |
| Brak wyników | `#ds-empty` widoczny |
| Błąd | Karta błędu w `#ds-grid` |

---

## Karta datasetu

Każda karta zawiera:
- Nazwa datasetu (bez prefiksu organizacji)
- Organizacja (z ID datasetu)
- Badge `HF`
- Opis (max 2 linie, clamp)
- Tagi (max 4)
- Statystyki: ⬇️ downloads, ❤️ likes (formatowane: 1.2K, 3.4M)

Kliknięcie → `window.open('https://huggingface.co/datasets/{id}', '_blank')`.

---

## Funkcje JS

### `searchDatasets(query)` — `datasets.js:11`

Async. Sprawdza cache, jeśli brak — pobiera z HF API. Wywołuje `renderDatasets()`.

### `renderDatasets(datasets)` — `datasets.js:35`

Renderuje karty do `#ds-grid`. Obsługuje stany: brak wyników, błąd.

### `initDatasets()` — `datasets.js:76`

Podpina debounced search + pill clicks.

---

## Uwagi

- Dane są **live** z zewnętrznego API — zależne od dostępności HuggingFace.
- Brak paginacji — zawsze max 24 wyniki.
- Cache istnieje tylko w pamięci JS — nie przeżywa odświeżenia strony.
- Zmieniając query presets: edytuj `DS_PRESET_QUERIES` w `datasets.js`.
