# Komponent: Router i Nawigacja

**Plik JS:** `js/router.js`
**Plik główny:** `js/main.js`

---

## Topbar nawigacja

### Struktura HTML

```html
<div class="topbar">
  <div class="logo">AI HUB Tools</div>
  <nav class="nav" id="nav">
    <!-- przyciski .nav-btn z data-tab="{id}" -->
  </nav>
  <div class="topbar-right">
    <div class="clock" id="clock"></div>
  </div>
</div>
```

### Zakładki (kolejność w nav)

| `data-tab` | ID strony | Label |
|------------|-----------|-------|
| `dashboard` | `#page-dashboard` | 📊 Dashboard (domyślna) |
| `models` | `#page-models` | 🧠 Modele AI |
| `pricing` | `#page-pricing` | 💰 Cennik |
| `providers` | `#page-providers` | 🔌 Providerzy |
| `tools` | `#page-tools` | 🛠️ Narzędzia |
| `datasets` | `#page-datasets` | 📚 Datasety |
| `skills` | `#page-skills` | 🎓 Skills |
| `apps` | `#page-apps` | 📦 Aplikacje |
| `jimbo` | `#page-jimbo` | 💬 JIMBO Studio |
| `kb` | `#page-kb` | 📖 Knowledge Browser |

---

## Funkcje routera

### `switchTab(id)` — `router.js:13`

Główna funkcja przełączania zakładek. Eksportowana i wystawiona na `window`:

```js
export function switchTab(id) {
  currentTab = id;
  // Ukrywa wszystkie strony
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  // Pokazuje wybraną
  document.getElementById('page-' + id)?.classList.add('active');
  // Podświetla aktywny przycisk nav
  document.querySelectorAll('.nav-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.tab === id)
  );
  // Lazy init dla ciężkich zakładek
  if (id === 'datasets' && !dsInitialized) { dsInitialized = true; searchDatasets(''); }
  if (id === 'kb'       && !kbInitialized)  { kbInitialized  = true; kbLoadLibraries(); }
  if (id === 'jimbo'    && !jimboInitialized){ jimboInitialized = true; jimboReloadAll(); }
}
```

### `initRouter()` — `router.js:25`

Podpina `click` event na każdy `.nav-btn` → `switchTab(b.dataset.tab)`.

---

## Lazy init

Trzy zakładki inicjalizują się dopiero przy pierwszym wejściu:

| Zakładka | Flaga | Akcja przy pierwszym wejściu |
|----------|-------|------------------------------|
| `datasets` | `dsInitialized` | `searchDatasets('')` — pobiera trending |
| `kb` | `kbInitialized` | `kbLoadLibraries()` — ładuje biblioteki |
| `jimbo` | `jimboInitialized` | `jimboReloadAll()` — ładuje wszystkie dane |

**Uwaga:** KB ma dodatkowy auto-load w `initKb()` (timeout 800ms) — może załadować się przed wejściem na zakładkę.

---

## Zegar (`#clock`)

```js
function tickClock() {
  const d = new Date();
  const el = document.getElementById('clock');
  if (el) el.textContent = d.toLocaleTimeString('pl-PL', {
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
}
setInterval(tickClock, 1000);
tickClock(); // pierwsze wywołanie od razu
```

Format: `HH:MM:SS` (lokalizacja polska). Aktualizuje się co sekundę.

---

## main.js — Entry Point

### Importy

```js
import { switchTab, initRouter } from './router.js';
import { updateStats, renderDashTopModels } from './modules/dashboard.js';
import { renderModels, initModels } from './modules/models.js';
import { renderPricing, initPricing } from './modules/pricing.js';
import { renderProviders } from './modules/providers.js';
import { renderTools, initTools } from './modules/tools.js';
import { renderSkills, initSkills } from './modules/skills.js';
import { searchDatasets, initDatasets } from './modules/datasets.js';
import { renderApps, openApp, openChatModal, closeChatModal } from './modules/apps.js';
import { kbLoadLibraries, kbSwitchLibrary, ... initKb } from './modules/kb.js';
import { jimboReloadAll, jimboCreateDataset, jimboCreateAgent, jimboExportAgent } from './modules/jimbo.js';
import { initVchat } from './modules/vchat.js';
```

### Window globals

```js
Object.assign(window, {
  switchTab,
  openApp, openChatModal, closeChatModal,
  kbSwitchLibrary, kbShowDetail, kbCloseDetail, kbToggleSelect,
  kbFilterByTopic, kbSearchArticles, kbAddToDataset, kbCreateAgentFromArticle,
  kbBulkCreateDataset, kbExportLibrary, kbAddArticle, kbSetLib, kbLoadLibraries,
  jimboReloadAll, jimboCreateDataset, jimboCreateAgent, jimboExportAgent,
  searchDatasets,
});
```

**Dlaczego?** ES Modules mają własny scope — funkcje nie trafiają automatycznie do `window`. HTML używa inline `onclick="functionName()"` które wymagają dostępu przez `window`.

### DOMContentLoaded

Kolejność inicjalizacji:

```js
document.addEventListener('DOMContentLoaded', () => {
  // 1. Router i nawigacja
  initRouter();

  // 2. Renderowanie statycznych siatek (natychmiast)
  updateStats();
  renderModels();
  renderPricing();
  renderProviders();
  renderTools();
  renderSkills();
  renderApps();
  renderDashTopModels();

  // 3. Podpinanie event listenerów (search, filters)
  initModels();
  initPricing();
  initTools();
  initSkills();
  initDatasets();

  // 4. Komponenty z backendem
  initKb();   // przywraca ustawienia + auto-load po 800ms

  // 5. Voice chat widget
  initVchat();
});
```

---

## CSS — mechanizm zakładek

```css
.page { display: none; }
.page.active { display: block; }
```

Tylko jeden `.page.active` widoczny naraz. `switchTab()` dodaje/usuwa klasę `active`.

---

## Dodawanie nowej zakładki

1. Dodaj `<button class="nav-btn" data-tab="{id}">` w `<nav>` w `index.html`
2. Dodaj `<div class="page" id="page-{id}">` w `index.html`
3. Utwórz moduł `js/modules/{name}.js` z `render*()` i `init*()`
4. Importuj w `main.js` i wywołaj w DOMContentLoaded
5. Jeśli lazy: dodaj flagę i warunek w `switchTab()` w `router.js`
