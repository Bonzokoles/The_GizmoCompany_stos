# Strona: Dashboard (`#page-dashboard`)

**Zakładka nav:** 📊 Dashboard
**ID strony:** `page-dashboard`
**Domyślnie aktywna:** tak
**Moduł JS:** `js/modules/dashboard.js`

---

## Co robi

Dashboard to główna strona przeglądu całego AI Hub. Pokazuje:
1. **Statystyki** (animowane liczniki) — liczba modeli, providerów, narzędzi, skills, aplikacji
2. **Budżet miesięczny** — panel z wykresem wydatków na AI
3. **Quick Actions** — przyciski do szybkiego przejścia do zakładek
4. **AI Gateway Status** — stan multi-provider gateway
5. **Top Modele** — 6 wybranych modeli w siatce

---

## Sekcje HTML

### Statystyki (`#stat-row`)

Sześć kart ze statystykami. ID liczników:

| ID elementu | Co wyświetla | Skąd pochodzi |
|-------------|--------------|---------------|
| `#s-models` | Liczba modeli AI | `MODELS.length` |
| `#s-providers` | Liczba aktywnych providerów | `PROVIDERS.filter(online).length` |
| `#s-tools` | Liczba narzędzi | `TOOLS.length` |
| `#s-skills` | Liczba skills HF | `SKILLS.length` |
| `#s-apps` | Liczba aplikacji | `APPS.length` |
| `#s-datasets` | Datasety HF | Statyczna wartość `200K+` |

Liczniki animują się przy załadowaniu (`animateCount()`).

### Budżet Miesięczny

Statyczne dane (hardcoded, nie pobierane z API):
- Total: $500/miesiąc
- AI Models: $300 (60%)
- Cloudflare: $100
- Buffer: $100
- Koszt/zapytanie: ~$0.02

Wizualizacja: pasek postępu CSS (`.budget-bar`).

### Quick Actions

8 przycisków — przełączają zakładki (`switchTab()`) lub otwierają zewnętrzne URL-e (`openApp()`):
- Modele, Cennik, Narzędzia, Datasety, Skills, Aplikacje → przełączenie zakładki
- Movie Buch App → `openApp('../movies-app/index.html')`
- JIMBO Chat → `openApp('http://localhost:5180')` (lokalny dev server)

### AI Gateway Status

Statyczny panel pokazujący:
- Gateway: `buch_chat_box` — aktywny
- 11 providerów (OpenAI, Anthropic, DeepSeek, ...)
- Caching: KV / 1h TTL
- Endpointy: chat, images, speech, embeddings, vision

6 kafli z dostępnymi typami żądań: Chat, Grafika, Mowa TTS, Mowa STT, Embeddings, Vision.

### Top Modele (`#dash-top-models`)

Renderuje 6 wybranych modeli z `MODELS[]`. Lista nazw zdefiniowana w `renderDashTopModels()`:
```
Claude Sonnet 4, GPT-4o, Gemini 2.0 Flash, DeepSeek R1 8B, Grok 4, Mistral Large
```
Kliknięcie karty → przełącza na zakładkę Modele AI (`switchTab('models')`).

---

## Funkcje JS

### `updateStats()` — `dashboard.js:20`

Wywołuje `animateCount()` dla każdego licznika statystyki. Uruchamiana w `DOMContentLoaded`.

### `animateCount(el, target)` — `dashboard.js:10`

Animuje licznik od 0 do `target` w ~30 krokach co 30ms.

### `renderDashTopModels()` — `dashboard.js:28`

Filtruje `MODELS[]` po liście 6 nazw, renderuje karty w `#dash-top-models`.

---

## Inicjalizacja

```js
// main.js — DOMContentLoaded
updateStats();          // statystyki z animacją
renderDashTopModels();  // siatka top modeli
```

Nie wymaga lazy init — działa od razu przy załadowaniu strony.

---

## Modyfikacja danych

- **Budżet:** Zmień wartości hardcoded w `index.html` (linia ~55-70)
- **Top modele:** Edytuj tablicę `topNames` w `renderDashTopModels()` w `dashboard.js`
- **Statystyki:** Automatyczne — wynikają z tablic danych w `js/data/`
