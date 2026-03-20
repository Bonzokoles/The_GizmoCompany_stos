# ZENO Ops — Instrukcja Działania Systemu

> Dashboard operacyjny dostępny na **zenbrowsers.org**  
> Zarządza Workers, treścią, analityką, bazami danych, storage i AI

---

## Spis treści

1. [Architektura](#architektura)
2. [Zakładki dashboardu](#zakładki-dashboardu)
3. [Instrukcja krok po kroku](#instrukcja-krok-po-kroku)
4. [API — lista endpointów](#api--lista-endpointów)
5. [CMS — pełny workflow](#cms--pełny-workflow)
6. [AI Chatbox Helper](#ai-chatbox-helper)
7. [Konfiguracja i deployment](#konfiguracja-i-deployment)

---

## Architektura

```
┌───────────────────────────────────────────┐
│         zenbrowsers.org (CF Pages)        │
│   React SPA → Operations Dashboard       │
├───────────────────────────────────────────┤
│ functions/api/                            │
│  ├── ai/         → AI Gate (chat)        │
│  ├── analytics/  → Analytics Hub         │
│  ├── content/    → CMS + Generator       │
│  ├── crawlers/   → Bot Monitor           │
│  ├── db/         → D1 Explorer           │
│  ├── images/     → AI Image Gen          │
│  ├── moa/        → MOA Pipeline          │
│  ├── pipelines/  → Event Streaming       │
│  ├── render/     → Browser Rendering     │
│  ├── search/     → Web Search            │
│  ├── sites/      → Sites Monitor         │
│  ├── storage/    → R2 Browser            │
│  ├── webgate/    → CORS Proxy            │
│  └── workers/    → Workers Monitor       │
├───────────────────────────────────────────┤
│ Cloudflare Services                       │
│  D1 Database ─ R2 Storage ─ Workers      │
│  Browser Rendering ─ AI Gateway          │
└───────────────────────────────────────────┘
```

**14 API Services**, **11 zakładek**, **D1 bazy**, **R2 storage**

---

## Zakładki dashboardu

### 1. Overview (📊)
Główny widok z podsumowaniem systemu.

| Element | Co robi | Co wpisać |
|---------|---------|-----------|
| **Search** | Wyszukiwarka web przez ZENO | Wpisz frazę, kliknij Search lub Enter |
| **AI Gate** | Chat z modelem AI | Wpisz pytanie w textarea, kliknij Ask |
| **API Services** | Statusy 14 usług | Automatyczne — zielona/czerwona kropka |
| **Connected Sites** | Podłączone strony | Automatyczne — sprawdza ping |

### 2. Workers (⚙️)
Zarządzanie Cloudflare Workers.

| Element | Opis |
|---------|------|
| **Refresh** | Ładuje listę Workers z CF |
| **Health Check** | Pinguje każdego Workera (mierzy latency) |
| **Filtr kategorii** | core, ai, content, ecommerce, analytics, infrastructure |

Każda karta Workera pokazuje: nazwę, kategorię, opis, route, status, latency.

### 3. Content / CMS (📝)
Pełny system zarządzania treścią z trzema widokami.

**Widok: Artykuły**
- Lista opublikowanych artykułów z D1
- Kliknij artykuł aby otworzyć w edytorze
- Status badge: draft / published / archived

**Widok: Nowy (Edytor)**

| Pole | Opis | Wymagane |
|------|------|----------|
| **Tytuł** | Tytuł artykułu | ✅ TAK |
| **Treść** | Zawartość w formacie Markdown | - |
| **Wstęp / Excerpt** | Krótki opis (widoczny na liście) | - |
| **Kategoria** | np. "Technologia", "AI", "Biznes" | - |
| **Tagi** | Oddzielone przecinkami: `AI, browser, zeno` | - |
| **Język** | Polski (pl) lub English (en) | - |
| **Status** | Szkic / Opublikowany / Archiwum | - |
| **SEO Title** | Tytuł dla wyszukiwarek (rozwiń sekcję SEO) | - |
| **SEO Description** | Meta opis (max ~160 znaków) | - |

**Przyciski:**
- 💾 **Zapisz** — zapisuje jako draft (lub aktualizuje istniejący)
- 🚀 **Opublikuj** — publikuje artykuł (status = published)
- 📦 **Archiwizuj** — zmienia status na archived (widoczny gdy opublikowany)
- ← **Wróć do listy** — powrót bez zapisu

**Widok: Generuj AI**

| Pole | Opis |
|------|------|
| **Temat** | O czym ma być treść |
| **Typ** | Artykuł / Blog / Social Media / Email / Opis produktu |
| **Język** | Polski lub English |
| **Ton** | Profesjonalny / Swobodny / Kreatywny / Techniczny / Perswazyjny |

Po wygenerowaniu kliknij **"Użyj w edytorze"** aby przenieść treść do edytora CMS.

### 4. Analytics (📈)
Statystyki odwiedzin ze wszystkich podłączonych stron.

| Element | Opis |
|---------|------|
| **Okres** | Wybierz: 24h / 7 dni / 30 dni |
| **Refresh** | Pobiera dane analityczne |
| **Karty** | Pageviews, Visitors, Visits + breakdown per strona |

### 5. Pipelines (🔀)
Event streaming — system zbierania i przetwarzania zdarzeń.

**Architektura przepływu:**
```
Sources → CF Worker → D1 Events → R2 Iceberg → R2 SQL
```

**Send Test Event:**

| Pole | Opis | Przykład |
|------|------|---------|
| **Pipeline** | Wybierz z listy | `page-analytics` |
| **Event Type** | Typ zdarzenia | `pageview`, `click`, `purchase` |
| **Payload** | JSON z danymi | `{"page": "/home", "referrer": "google.com"}` |

Dostępne pipeline'y: page-analytics, worker-metrics, content-pipeline, crawler-events, ecommerce-events, ai-usage, search-events.

### 6. Crawlers (🕷️)
Monitor botów i crawlerów odwiedzających strony.

| Element | Opis |
|---------|------|
| **Okres** | 24h / 7d / 30d |
| **Statystyki** | Total Requests, Human vs Bot, % botów, unikalne crawlery |
| **Filtr typów** | search_engine, social, ai_crawler, monitoring, itp. |
| **Nieznane boty** | User-Agent string + ilość requestów |

### 7. Storage (💾)
Przeglądarka R2 bucketów (Object Storage).

- Kliknij bucket aby zobaczyć pliki
- Każdy obiekt: nazwa, rozmiar (KB)
- Kategorie: cdn, data, backup

### 8. Databases (🗄️)
Explorer baz danych D1.

| Element | Opis |
|---------|------|
| **Lista baz** | Kliknij bazę aby zobaczyć tabele |
| **Tabele** | Lista tabel w wybranej bazie |
| **SQL Query** | Wpisz zapytanie SELECT i kliknij Run |

**Przykładowe zapytania:**
```sql
SELECT * FROM articles LIMIT 10
SELECT COUNT(*) FROM pipeline_events
SELECT slug, title, status FROM articles WHERE status = 'published'
```

### 9. Images (🖼️)
Generowanie obrazów przez AI.

| Pole | Opis | Przykład |
|------|------|---------|
| **Prompt** | Opis obrazu (najlepiej po angielsku) | `A futuristic web browser in space` |
| **Style** | Styl wizualny | Photorealistic, Digital Art, Anime, Oil Painting, Watercolor, 3D Render |

### 10. MOA (🧬)
Mixture-of-Agents — wieloetapowy pipeline AI.

**Etapy:** Parallel Writing → Critique → Aggregation → Validation

| Pole | Opis |
|------|------|
| **Topic** | Temat do przetworzenia |
| **Type** | Article / Blog / Social / Product Description |
| **Language** | Polski / English |

Wynik zawiera: liczbę drafty, ocenę jakości (0-10), czas przetwarzania, oceny per model.

### 11. Render (🌐)
Browser Rendering — zrzuty ekranu, PDF, scraping.

| Pole | Opis |
|------|------|
| **URL** | Adres strony do renderowania |
| **Action** | Screenshot / PDF / Scrape / Markdown / AI JSON |

**Dodatkowe pola per akcja:**

| Akcja | Dodatkowe pole | Przykład |
|-------|---------------|---------|
| **Scrape** | CSS Selectors | `h1, h2, p, a, .price` |
| **AI JSON** | AI Prompt | `Extract all products with names and prices` |
| **Screenshot** | — | Zwraca base64 PNG |
| **PDF** | — | Zwraca base64 PDF |
| **Markdown** | — | Konwertuje stronę na Markdown |

---

## Instrukcja krok po kroku

### Jak opublikować artykuł?

1. Przejdź do zakładki **Content** (📝)
2. Kliknij **✏️ Nowy**
3. Wpisz **Tytuł** (wymagany!)
4. Napisz treść w **Markdown**
5. Opcjonalnie: wstęp, kategoria, tagi, SEO
6. Kliknij **🚀 Opublikuj**
7. Artykuł pojawi się na liście

### Jak wygenerować treść AI i opublikować?

1. Zakładka **Content** → **🤖 Generuj AI**
2. Wpisz temat, wybierz typ, język i ton
3. Kliknij **Generuj**
4. Kliknij **Użyj w edytorze**
5. Dopracuj treść w edytorze
6. Kliknij **🚀 Opublikuj**

### Jak zrobić screenshot strony?

1. Zakładka **Render** (🌐)
2. Wpisz URL: `https://example.com`
3. Wybierz **Screenshot**
4. Kliknij **Render**
5. Pobierz PNG przyciskiem Download

### Jak sprawdzić statystyki?

1. Zakładka **Analytics** (📈)
2. Wybierz okres (24h / 7d / 30d)
3. Kliknij **Refresh**
4. Przejrzyj karty ze statystykami

### Jak wysłać test event do pipeline?

1. Zakładka **Pipelines** (🔀)
2. Sekcja "Send Test Event"
3. Wybierz Pipeline z listy
4. Wpisz Event Type (np. `pageview`)
5. Wpisz Payload JSON: `{"page": "/home"}`
6. Kliknij **Send Event**

---

## API — lista endpointów

### Content CMS

| Metoda | Endpoint | Opis |
|--------|---------|------|
| GET | `/api/content/status` | Status usługi |
| GET | `/api/content/articles` | Lista artykułów |
| GET | `/api/content/article/:slug` | Pojedynczy artykuł po slug |
| POST | `/api/content/publish` | Publikuj/aktualizuj artykuł |
| POST | `/api/content/unpublish` | Archiwizuj artykuł |
| POST | `/api/content/upload-image` | Upload zdjęcia (base64) |
| GET | `/api/content/image/:id` | Pobierz zdjęcie |
| POST | `/api/content/generate` | Generuj treść AI |
| POST | `/api/content/seo` | Generuj metadane SEO |
| POST | `/api/content/translate` | Tłumacz treść |
| POST | `/api/content/summarize` | Podsumuj treść |

### Inne API

| Endpoint | Opis |
|---------|------|
| `/api/ai/chat` | Chat z modelem AI |
| `/api/search/query` | Wyszukiwarka web |
| `/api/webgate/fetch` | CORS proxy (fetch) |
| `/api/webgate/scrape` | CORS proxy (scrape) |
| `/api/workers/list` | Lista CF Workers |
| `/api/workers/health` | Health check Workers |
| `/api/analytics/overview` | Dane analityczne |
| `/api/storage/buckets` | Lista R2 bucketów |
| `/api/storage/browse/:bucket` | Pliki w buckecie |
| `/api/db/databases` | Lista D1 baz |
| `/api/db/tables/:dbId` | Tabele w bazie |
| `/api/db/query/:dbId` | Wykonaj SQL |
| `/api/images/generate` | Generuj obraz AI |
| `/api/crawlers/history` | Historia crawlerów |
| `/api/crawlers/profiles` | Profile znanych crawlerów |
| `/api/moa/generate` | MOA pipeline |
| `/api/pipelines/list` | Lista pipeline'ów |
| `/api/pipelines/stats` | Statystyki pipeline'ów |
| `/api/pipelines/events` | Ostatnie eventy |
| `/api/pipelines/ingest` | Wyślij event |
| `/api/render/screenshot` | Screenshot strony |
| `/api/render/pdf` | PDF strony |
| `/api/render/scrape` | Scrape selektorów |
| `/api/render/markdown` | Strona → Markdown |
| `/api/render/json` | AI ekstrakcja JSON |
| `/api/sites/ping` | Ping podłączonych stron |

---

## CMS — pełny workflow

### Payload publikacji (POST /api/content/publish)

```json
{
  "title": "Mój artykuł",
  "slug": "moj-artykul",
  "content": "# Treść\n\nMarkdown...",
  "excerpt": "Krótki opis",
  "category": "Technologia",
  "tags": ["AI", "browser"],
  "language": "pl",
  "seoTitle": "SEO Tytuł | ZENO",
  "seoDescription": "Meta opis do 160 znaków"
}
```

**Odpowiedź (sukces):**
```json
{
  "id": "art_1773995911688_06i560",
  "slug": "moj-artykul",
  "status": "published",
  "publishedAt": "2026-03-20T08:38:31.688Z"
}
```

### Slug
Slug generowany automatycznie z tytułu:
- Polskie znaki → ASCII: ą→a, ć→c, ę→e, ł→l, ń→n, ó→o, ś→s, ź/ż→z
- Spacje → myślniki
- Tylko lowercase a-z, 0-9, myślniki

---

## AI Chatbox Helper

W prawym dolnym rogu dashboardu znajduje się **pływający przycisk 💬**.

- Kliknij aby otworzyć panel czatu
- Asystent AI zna **wszystkie 11 zakładek** i ich funkcje
- Podpowiada co i gdzie wpisać
- Odpowiada po polsku
- Używa endpointu `/api/ai/chat`

**Przykładowe pytania:**
- "Jak opublikować artykuł?"
- "Co wpisać w polu Prompt w Images?"
- "Jak zrobić scraping strony?"
- "Do czego służy MOA pipeline?"
- "Jakie pipeline'y są dostępne?"

---

## Konfiguracja i deployment

### Development
```bash
npm install
npm run dev        # Vite dev server (localhost:5173)
```

### Build i deploy
```bash
npm run build:web                              # Build SPA
npx wrangler pages deploy dist \
  --project-name=zeno-browser-web              # Deploy na CF Pages
```

### Struktura plików
```
src/
  components/WebLanding.tsx  ← Główny komponent (dashboard)
  styles/web-landing.css     ← Style dashboardu
functions/
  api/                       ← CF Workers (API endpointy)
    content/[[path]].ts      ← CMS Worker (publish, articles, images)
    ai/[[path]].ts           ← AI Gate Worker
    render/[[path]].ts       ← Browser Rendering Worker
    ...
```

### Zmienne środowiskowe (Cloudflare)
- `DB` — D1 binding (zeno-browser-db)
- `R2_BUCKET` — R2 binding
- `CF_API_TOKEN` — Cloudflare API token
- `CF_ACCOUNT_ID` — ID konta (7f490d58a478c6baccb0ae01ea1d87c3)

---

*ZENO Ops Dashboard — zenbrowsers.org*
