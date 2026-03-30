# Development Guide — AI HUB Tools

Przewodnik dla deweloperów i asystentów AI. Jak rozwijać i modyfikować aplikację.

---

## Uruchomienie lokalne

Aplikacja jest statyczna — działa bez build stepu. Wymaga serwera HTTP (ES Modules nie działają przez `file://`):

```bash
# Python
python -m http.server 8080 -d u:/WWW_Zen_BRo_wser_org3

# Node.js (npx)
npx serve u:/WWW_Zen_BRo_wser_org3

# Bezpośrednio
# Otwórz: http://localhost:8080/ai-hub/
```

---

## Struktura modułów

### Wzorzec: data module

Czyste dane, zero logiki UI:

```js
// js/data/example.js
export const EXAMPLE = [
  { name: 'Item', field: 'value', ... },
];
```

### Wzorzec: feature module

```js
// js/modules/example.js
import { EXAMPLE } from '../data/example.js';

let filter = 'all';   // stan modułu (closure)
let search = '';

export function renderExample() {
  const grid = document.getElementById('example-grid');
  const filtered = EXAMPLE.filter(...);
  grid.innerHTML = filtered.map(item => `<div>...</div>`).join('');
}

export function initExample() {
  document.getElementById('example-search').addEventListener('input', ...);
  document.querySelectorAll('#example-pills .pill').forEach(...);
}
```

### Wzorzec: eksport do window

Wszystkie funkcje wywoływane inline `onclick=` muszą być w `main.js`:

```js
// js/main.js
import { renderExample, initExample, myAction } from './modules/example.js';
Object.assign(window, { myAction });
document.addEventListener('DOMContentLoaded', () => {
  renderExample();
  initExample();
});
```

---

## Dodawanie zakładki (krok po kroku)

1. **Dane** — jeśli statyczne: utwórz `js/data/newpage.js` z tablicą
2. **Moduł** — utwórz `js/modules/newpage.js` z `render*()` i `init*()`
3. **HTML** — w `index.html`:
   - Nav: `<button class="nav-btn" data-tab="newpage">🆕 Nowa</button>`
   - Page: `<div class="page" id="page-newpage">...</div>`
4. **main.js** — importuj, dodaj do `window`, wywołaj w DOMContentLoaded
5. **router.js** — jeśli lazy init: dodaj flagę i warunek w `switchTab()`

---

## Modyfikacja danych

### Nowy model AI
Edytuj `js/data/models.js`:
```js
{ name:'Nowy Model', provider:'Provider', type:'api',
  cats:['text','code'], ctx:'128K',
  input:1.0, output:4.0, tier:'budget',
  desc:'Opis po polsku' }
```
Automatycznie pojawi się w: Modele, Cennik, Dashboard.

### Nowy provider
Edytuj `js/data/providers.js`:
```js
{ name:'Provider', icon:'P', bg:'#color', models:2,
  status:'online', desc:'Opis modeli' }
```

### Nowe narzędzie
Edytuj `js/data/tools.js`:
```js
{ name:'Tool', icon:'🔧', cat:'framework',
  desc:'Opis po polsku' }
```
Kategorie: `framework`, `platform`, `sdk`, `devtool`, `database`, `monitoring`.

### Nowa aplikacja
Edytuj `js/data/apps.js`. Typy URL:
- `url: '../relative/path'` — lokalna strona
- `url: 'https://example.com'` — zewnętrzna
- `url: '#', action: 'tab-id'` — przełącza zakładkę

---

## Backend — zmiany w gateway

Edytuj: `workers/jimbo-gateway/src/index.ts`

Deploy:
```bash
cd workers/jimbo-gateway
npx wrangler deploy
```

Endpoint: `https://jimbo-gateway.stolarnia-ams.workers.dev`

---

## Sync wiedzy do KB

Script: `scripts/sync_kb_to_gateway.mjs`

```bash
# Pełny sync
node scripts/sync_kb_to_gateway.mjs

# Dry run (bez wysyłania)
node scripts/sync_kb_to_gateway.mjs --dry-run

# Tylko jedna biblioteka
node scripts/sync_kb_to_gateway.mjs --library ai

# Limit plików
node scripts/sync_kb_to_gateway.mjs --limit 50
```

Skanuje: `U:\The_DEVz_HUB_of_work\knowledge_base\` i `LOCAL_LIBRARIES\`
Wysyła pliki `.md`, `.txt`, `.json`, `.yaml`, `.yml` do `POST /kb/store`.

---

## Typowe scenariusze

### "Zmień domyślny endpoint gateway"
Edytuj wartość `value=` w `index.html`:
- `#kb-endpoint` (linia ~332)
- `#jimbo-endpoint` (linia ~269)

Lub zmień fallback w `vchat.js:48`.

### "Dodaj nowy shortcut folder w KB"
W `index.html` w sekcji `#kb-local-panel` dodaj:
```html
<button class="kb-shortcut-btn" onclick="kbSetLib('21_new_folder')">21 Nowy</button>
```

### "Zmień domyślny model agenta w JIMBO Studio"
W `index.html` zmień `value="deepseek-chat"` na `#jimbo-agent-model`.

### "Dodaj nowe preset query do Datasets"
W `js/modules/datasets.js` edytuj `DS_PRESET_QUERIES`:
```js
const DS_PRESET_QUERIES = {
  ...existing,
  newcat: 'keyword-for-hf-api',
};
```
I dodaj pill w `index.html`:
```html
<button class="pill" data-ds="newcat">🆕 Nowa</button>
```

### "Zmień głos TTS w vchat"
W `vchat.js:91`: zmień `voice: 'nova'` na inny głos OpenAI (alloy, echo, fable, onyx, nova, shimmer).

---

## Git i deploy

```bash
# Stage zmiany AI Hub
git add ai-hub/

# Commit
git commit -m "feat(ai-hub): opis zmian"

# Push do GitHub
git push
```

Gałąź główna: `main`.
