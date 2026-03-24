# CSS Design System — `css/main.css`

**Plik:** `css/main.css`
**Motyw:** Dark theme, glass morphism, custom properties

---

## Zmienne CSS (Custom Properties)

```css
:root {
  --bg: #0a0e1a;           /* główne tło */
  --surface: #111827;      /* powierzchnie kart */
  --glass-bg: rgba(255,255,255,0.04);  /* tło "szklane" */
  --glass-border: rgba(255,255,255,0.08);  /* ramka szkła */

  --accent:  #00ffcc;      /* teal — główny akcent */
  --accent2: #a78bfa;      /* fioletowy */
  --accent3: #fbbf24;      /* żółty/amber */
  --accent4: #f472b6;      /* różowy */

  --text: #e2e8f0;         /* główny tekst */
  --text-muted: #94a3b8;   /* przytłumiony */
  --text-dim: #475569;     /* bardzo przytłumiony */

  --success: #34d399;      /* zielony */
  --danger:  #f87171;      /* czerwony */

  --font: 'Inter', sans-serif;
  --mono: 'JetBrains Mono', monospace;
  --transition: all .2s ease;
  --radius: 12px;
}
```

---

## Klasy pomocnicze

### `.glass`
Karta ze szklanym efektem:
```css
background: var(--glass-bg);
border: 1px solid var(--glass-border);
border-radius: var(--radius);
```

### `.page` / `.page.active`
```css
.page { display: none; }
.page.active { display: block; }
```

### `.pill` / `.pill.active`
Filter button. Active: podświetlony kolorem akcentu.

### `.hl`
Highlight tekstu w nagłówkach — kolor `var(--accent)`.

---

## Grid layouty

| Klasa | Kolumny | Użycie |
|-------|---------|--------|
| `.grid-2` | 2 równe | Sekcje 2-kolumnowe |
| `.grid-3` | auto-fill min 280px | Karty modeli, narzędzi |
| `.grid-4` | auto-fill min 220px | Top modele, narzędzia |
| `.stat-row` | 6 równych kolumn | Statystyki dashboard |

---

## Karty modeli (`.model-card`)

```
.model-card
  .model-head
    .model-name
    .model-provider
    .model-badge (.badge-api / .badge-local / .badge-new)
  .model-desc
  .model-meta
    .model-chip    (tag kategorii)
  .model-footer
    .model-price
```

### Badge kolory:
- `.badge-api` — niebieski
- `.badge-local` — zielony
- `.badge-new` — złoty/amber

---

## Karty narzędzi (`.tool-card`)

```
.tool-card
  .tool-icon (emoji)
  .tool-name
  .tool-desc
  .tool-tag (.tag-app / .tag-gen / .tag-util / .tag-data)
```

### Tag kolory:
- `.tag-app` — zielony (framework, database)
- `.tag-gen` — niebieski (platform, monitoring)
- `.tag-util` — szary (sdk, frontend)
- `.tag-data` — pomarańczowy (devtool, data)

---

## Karty providerów (`.provider-card`)

```
.provider-card
  .prov-icon    (kolorowy kwadrat z literą/emoji)
  .prov-info
    .prov-name
    .prov-models
  .prov-status (.prov-online / .prov-offline)
```

---

## Karty aplikacji (`.app-card`)

```
.app-card
  .app-banner  (gradient tło + emoji .bg-icon)
    .app-banner-gradient (fade do czarnego na dole)
  .app-body
    .app-name
    .app-desc
    .app-stats
    .app-open-btn
```

---

## Topbar (`.topbar`)

Stały górny pasek nawigacji. Flexbox: logo | nav | clock.

```
.topbar
  .logo (.logo-icon + tekst)
  .nav
    .nav-btn[data-tab] (.active dla aktywnej)
  .topbar-right
    .clock
```

---

## Tiers — tabela cennika

| Klasa | Kolor |
|-------|-------|
| `.tier-free` | zielony `#34d399` |
| `.tier-budget` | niebieski `#60a5fa` |
| `.tier-premium` | pomarańczowy `#fb923c` |
| `.tier-enterprise` | fioletowy `#c084fc` |

---

## Animacje

```css
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
@keyframes fadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
```

- `spin` — używana dla `⏳` spinner (ładowanie KB)
- `fadeIn` — karty przy renderowaniu

---

## KB Shortcut Buttons (`.kb-shortcut-btn`)

```css
.kb-shortcut-btn {
  padding: .25rem .5rem;
  border-radius: 6px;
  background: rgba(0,255,204,0.08);
  color: var(--accent);
  border: 1px solid rgba(0,255,204,0.2);
  cursor: pointer;
}
.kb-shortcut-btn.active {
  background: rgba(0,255,204,0.2);
  border-color: var(--accent);
}
```

---

## Voice Chat Widget

```
#vchatToggle  (pływający przycisk prawy dół)
#vchatWin     (.open = widoczny)
  #vchatMsgs
    .vchat-msg.user
    .vchat-msg.ai
      span (tekst)
      button.vchat-tts (.playing)
    .vchat-msg.system
  .vchat-input
    #vchatText
    #vchatMic (.recording)
    #vchatSend
```

---

## Budget Bar

```
.budget-bar
  .budget-track
    .budget-fill  (width: %)
  .budget-labels
```

---

## Responsywność

Media queries:
- `@media (max-width: 768px)` — nav collapse, grid 1-kolumnowy
- Topbar na małych ekranach: kolumna zamiast wiersza
