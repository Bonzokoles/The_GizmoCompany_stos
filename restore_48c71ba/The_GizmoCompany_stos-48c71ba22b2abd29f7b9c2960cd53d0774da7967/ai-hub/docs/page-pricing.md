# Strona: Cennik (`#page-pricing`)

**Zakładka nav:** 💰 Cennik
**ID strony:** `page-pricing`
**Moduł JS:** `js/modules/pricing.js`
**Dane:** `js/data/models.js` — ta sama tablica `MODELS[]` co na stronie Modeli

---

## Co robi

Tabela porównawcza kosztów wszystkich modeli AI — cena input i output per 1 milion tokenów. Umożliwia filtrowanie po poziomie cenowym (tier).

---

## Struktura tabeli

**Tabela:** `#price-table` → `#price-tbody`

Kolumny:
1. **Model** — nazwa modelu
2. **Provider** — dostawca
3. **Input /1M tok** — cena wejścia w USD; `Free` jeśli `input === 0`
4. **Output /1M tok** — cena wyjścia; `—` jeśli `output === 0`
5. **Tier** — poziom cenowy ze stylowaniem kolorami
6. **Kontekst** — rozmiar okna kontekstu

Wiersze sortowane rosnąco po cenie input (`sort((a,b) => a.input - b.input)`).

---

## Filtry tier

Pill-buttons w `#price-pills`:

| `data-pf` | Co pokazuje |
|-----------|-------------|
| `all` | Wszystkie modele |
| `free` | `tier === 'free'` — lokalne, darmowe |
| `budget` | `tier === 'budget'` — tanie API |
| `premium` | `tier === 'premium'` — Claude, GPT-4o, Grok |
| `enterprise` | `tier === 'enterprise'` — Claude Opus, GPT-5.3 |

---

## Style tierów

Klasy CSS na elementach `<span>` w kolumnie Tier:

| Tier | Kolor (CSS class) |
|------|-------------------|
| `free` | zielony — `tier-free` |
| `budget` | niebieski — `tier-budget` |
| `premium` | pomarańczowy — `tier-premium` |
| `enterprise` | fioletowy — `tier-enterprise` |

---

## Funkcje JS

### `renderPricing()` — `pricing.js:8`

Filtruje `MODELS[]` wg `priceFilter`, sortuje po cenie input, renderuje wiersze HTML w `#price-tbody`.

### `initPricing()` — `pricing.js:25`

Podpina `click` event na pill-buttons z `#price-pills`.

---

## Inicjalizacja

```js
// main.js — DOMContentLoaded
renderPricing();  // renderuje tabelę od razu
initPricing();    // podpina filtry
```

---

## Uwagi

- Dane cenowe są **statyczne** — przechowywane w `MODELS[]` w kodzie. Nie pobierane z zewnętrznych API.
- Aby zaktualizować ceny — edytuj `js/data/models.js`.
- Modele lokalne (`type: 'local'`) mają `input: 0, output: 0` i wyświetlają się jako `Free`.
- Modele embeddingowe mają `output: 0` bo płaci się tylko za input.
