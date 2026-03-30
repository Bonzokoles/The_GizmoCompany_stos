# AI HUB Tools — Dokumentacja Aplikacji

> Pełna dokumentacja dla asystenta AI. Opisuje każdą stronę, funkcję i moduł.

## Spis treści

- [Architektura](#architektura)
- [Strony i zakładki](#strony-i-zakładki)
  - [Dashboard](#dashboard)
  - [Modele AI](#modele-ai)
  - [Cennik](#cennik)
  - [Providerzy](#providerzy)
  - [Narzędzia AI](#narzędzia-ai)
  - [Datasety HuggingFace](#datasety-huggingface)
  - [Skills HuggingFace](#skills-huggingface)
  - [Aplikacje](#aplikacje)
  - [JIMBO Studio](#jimbo-studio)
  - [Knowledge Browser](#knowledge-browser)
- [Komponenty globalne](#komponenty-globalne)
  - [Nawigacja i router](#nawigacja-i-router)
  - [Voice Chat Widget (Jimbo)](#voice-chat-widget-jimbo)
- [Struktura plików](#struktura-plików)
- [Backend / Gateway](#backend--gateway)
- [Dane konfiguracyjne](#dane-konfiguracyjne)

---

## Architektura

**Typ:** Single Page Application (SPA), brak build stepu.

**Technologia:** Vanilla JS + ES Modules (`type="module"`), CSS custom properties, HTML5.

**Routing:** Tab-based SPA. Klasy `.page` i `.page.active` na divach `#page-{id}`. Przełączanie przez `switchTab(id)`.

**Globalny dostęp do funkcji:** Moduły eksportują funkcje, a `main.js` wystawia je przez `Object.assign(window, {...})` — dzięki temu działają inline `onclick=` handlery w HTML.

**Backend:** Cloudflare Worker `jimbo-gateway` na `https://jimbo-gateway.stolarnia-ams.workers.dev`. Obsługuje KB, datasety i agentów.

---

## Strony i zakładki

Szczegółowe opisy każdej strony w oddzielnych plikach:

| Plik | Zakładka |
|------|----------|
| [page-dashboard.md](./page-dashboard.md) | Dashboard — przegląd, statystyki, budżet |
| [page-models.md](./page-models.md) | Modele AI — katalog z filtrowaniem |
| [page-pricing.md](./page-pricing.md) | Cennik — tabela cen per 1M tokenów |
| [page-providers.md](./page-providers.md) | Providerzy — status integracji |
| [page-tools.md](./page-tools.md) | Narzędzia AI — frameworki, SDK, bazy |
| [page-datasets.md](./page-datasets.md) | Datasety HuggingFace — wyszukiwarka |
| [page-skills.md](./page-skills.md) | Skills HuggingFace — 11 modułów |
| [page-apps.md](./page-apps.md) | Aplikacje — mini-apki zintegrowane |
| [page-jimbo.md](./page-jimbo.md) | JIMBO Studio — biblioteki, datasety, agenci |
| [page-kb.md](./page-kb.md) | Knowledge Browser — baza wiedzy DEVz HUB |

---

## Struktura plików

```
ai-hub/
├── index.html              # Thin shell HTML (~450 linii), tylko struktura
├── css/
│   └── main.css            # Wszystkie style (dark theme, glass morphism)
├── js/
│   ├── main.js             # Entry point — importy + window globals + DOMContentLoaded
│   ├── router.js           # switchTab(), initRouter(), zegar
│   ├── data/               # Czyste dane (tablice JS bez logiki)
│   │   ├── models.js       # MODELS[] — 22 modele AI
│   │   ├── providers.js    # PROVIDERS[] — 16 providerów
│   │   ├── tools.js        # TOOLS[] — 24 narzędzia
│   │   ├── skills.js       # SKILLS[] — 11 skills HuggingFace
│   │   └── apps.js         # APPS[] — 6 mini-aplikacji
│   └── modules/            # Logika UI dla każdej zakładki
│       ├── dashboard.js    # updateStats(), renderDashTopModels()
│       ├── models.js       # renderModels(), initModels()
│       ├── pricing.js      # renderPricing(), initPricing()
│       ├── providers.js    # renderProviders()
│       ├── tools.js        # renderTools(), initTools()
│       ├── skills.js       # renderSkills(), initSkills()
│       ├── datasets.js     # searchDatasets(), initDatasets()
│       ├── apps.js         # renderApps(), openApp(), openChatModal()
│       ├── kb.js           # Knowledge Browser — pełny moduł
│       ├── jimbo.js        # JIMBO Studio — biblioteki, datasety, agenci
│       └── vchat.js        # Voice Chat Widget — STT, TTS, chat
└── docs/                   # Ta dokumentacja
```

---

## Backend / Gateway

**URL:** `https://jimbo-gateway.stolarnia-ams.workers.dev`

**Typ:** Cloudflare Worker (TypeScript)

**Endpointy:**

| Method | Path | Opis |
|--------|------|------|
| GET | `/kb/categories` | Lista bibliotek tematycznych z liczbą dokumentów |
| GET | `/kb/browse?library=X&limit=N&topic=Y` | Artykuły z danej biblioteki |
| GET | `/kb/topics?library=X&limit=N` | Najczęstsze tematy w bibliotece |
| GET | `/kb/details/:id` | Pełna treść artykułu |
| POST | `/kb/search` | Wyszukiwanie pełnotekstowe `{query, library?, limit}` |
| POST | `/kb/store` | Zapis artykułu `{title, content, library, source?, tags?}` |
| POST | `/kb/bulk-export` | Eksport biblioteki `{library, limit}` → JSON |
| GET | `/kb/libraries` | Lista bibliotek (używana przez JIMBO Studio) |
| GET | `/kb/topics?library=all&limit=N` | Tematy ze wszystkich bibliotek |
| GET | `/datasets/list` | Lista datasetów w KB |
| POST | `/datasets/create` | Tworzenie datasetu z KB |
| GET | `/agents/list` | Lista agentów |
| POST | `/agents/create` | Tworzenie agenta dziedzinowego |
| GET | `/agents/:id/export` | Eksport konfiguracji agenta (JSON) |

**Endpointy AI (przez Worker, proxy do zewnętrznych API):**

| Method | Path | Opis |
|--------|------|------|
| POST | `/api/ai/chat` | Chat z AI `{prompt, maxTokens, systemPrompt}` |
| POST | `/api/ai/tts` | Text-to-speech `{text, voice}` → audio blob |
| POST | `/api/ai/stt` | Speech-to-text (binary audio) → `{text}` |

---

## Dane konfiguracyjne

**localStorage:**
- `kb_endpoint` — URL gateway (domyślnie `https://jimbo-gateway.stolarnia-ams.workers.dev`)
- `kb_local_lib` — ostatnio wybrana biblioteka importu lokalnego

**Globalne funkcje na `window`:**
```
switchTab, openApp, openChatModal, closeChatModal,
kbSwitchLibrary, kbShowDetail, kbCloseDetail, kbToggleSelect,
kbFilterByTopic, kbSearchArticles, kbAddToDataset, kbCreateAgentFromArticle,
kbBulkCreateDataset, kbExportLibrary, kbAddArticle, kbSetLib, kbLoadLibraries,
jimboReloadAll, jimboCreateDataset, jimboCreateAgent, jimboExportAgent,
searchDatasets
```
