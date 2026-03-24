# Strona: Aplikacje (`#page-apps`)

**Zakładka nav:** 📦 Aplikacje
**ID strony:** `page-apps`
**Moduł JS:** `js/modules/apps.js`
**Dane:** `js/data/apps.js` — tablica `APPS[]`

---

## Co robi

Grid kart z mini-aplikacjami zintegrowanymi z AI Hub. Każda aplikacja ma banner, opis i statystyki. Kliknięcie otwiera aplikację lub przełącza zakładkę.

---

## Dane aplikacji

Każda aplikacja w `APPS[]`:

| Pole | Typ | Opis |
|------|-----|------|
| `id` | string | Unikalny identyfikator |
| `name` | string | Wyświetlana nazwa |
| `desc` | string | Opis |
| `url` | string | URL do otwarcia lub `'#'` |
| `banner_bg` | string | CSS gradient dla bannera |
| `icon` | string | Emoji ikony |
| `stats` | object | Klucz-wartość statystyk |
| `action` | string? | ID zakładki do przełączenia (zamiast URL) |
| `modal` | bool? | Czy otworzyć w iframe modal |

### Aktualne aplikacje (6)

#### 1. 🎬 Movie Buch App
- **URL:** `../movies-app/index.html` (relatywny)
- **Otwiera:** nowa karta
- **Stats:** 66 filmów, 50 recenzji, 5 stylów
- **Opis:** Kolekcja filmów z recenzjami w 5 stylach literackich (akademicki, Bukowski, Thompson, Gombrowicz, Mrożek)

#### 2. 📊 ZENO Ops Dashboard
- **URL:** `../index.html` (główny ZENO dashboard)
- **Otwiera:** nowa karta
- **Stats:** 11 zakładek, 14 workers, 14 API
- **Opis:** Centralny panel operacyjny z Workers, Analytics, Storage, MOA

#### 3. 🧬 MOA Pipeline
- **URL:** `https://moa.mybonzo.com`
- **Otwiera:** nowa karta
- **Stats:** 5 stages, 5 kryteriów
- **Opis:** Mixture-of-Agents content generator — 5-stage pipeline z K.R.A.F.T. Framework

#### 4. 💬 JIMBO DEVz Chat
- **URL:** `http://localhost:5180`
- **Otwiera:** nowa karta
- **Stats:** 8 providerów, 56 bibliotek, RAG ON
- **Opis:** Multi-provider AI chat z dostępem do DEVz HUB przez RAG
- **Uwaga:** Działa tylko lokalnie — wymaga uruchomionego dev servera

#### 5. 🎓 HuggingFace Skills
- **URL:** `'#'`
- **Action:** `'skills'` — przełącza na zakładkę Skills
- **Stats:** 11 skills, 6 kategorii, HF
- **Przycisk:** "Otwórz zakładkę →"

#### 6. 📚 HuggingFace Datasets
- **URL:** `'#'`
- **Action:** `'datasets'` — przełącza na zakładkę Datasets
- **Stats:** 200K+ datasetów, 100+ języków, 50+ zadań
- **Przycisk:** "Otwórz zakładkę →"

---

## Logika otwierania

```js
// Priorytet wyboru akcji:
if (a.action)  → switchTab(a.action)          // przełącz zakładkę
if (a.modal)   → openChatModal(a.url)         // iframe modal
else           → openApp(a.url)               // window.open nowa karta
```

Jeśli `url === '#'` i brak `action` → "Wkrótce" (coming soon).

---

## Funkcje JS

### `renderApps()` — `apps.js:26`

Renderuje karty aplikacji z bannerami, statystykami i przyciskami akcji do `#apps-grid`.

### `openApp(url)` — `apps.js:6`

Otwiera URL w nowej karcie (`window.open(url, '_blank')`). Ignoruje `'#'`.

### `openChatModal(url)` — `apps.js:10`

Pokazuje modal z iframe (`#chat-modal`, `#chat-frame`) i ładuje URL. Blokuje scroll body.

### `closeChatModal()` — `apps.js:18`

Chowa modal, czyści src iframe, odblokuje scroll.

---

## Modal iframe

HTML: `#chat-modal` (div overlay) + `#chat-frame` (iframe)

Używany gdy `a.modal === true` — pozwala na osadzenie aplikacji wewnątrz AI Hub bez otwierania nowej karty. Aktualnie żadna aplikacja nie używa modalu, ale mechanizm jest gotowy.

---

## Inicjalizacja

```js
renderApps();  // jednorazowe renderowanie
// brak initApps() — brak interaktywnych elementów wymagających init
```

---

## Dodawanie aplikacji

Edytuj `js/data/apps.js`. Dodaj obiekt z polami. Typy:
- Lokalna strona: `url: '../app/index.html'`
- Zewnętrzna: `url: 'https://...'`
- Zakładka w hub: `url: '#', action: 'tab-id'`
