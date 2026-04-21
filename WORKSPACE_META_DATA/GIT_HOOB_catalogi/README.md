# 🗄️ GIT_HOOB_catalogi — System Katalogów Narzędzi

> **Dla agentów AI:** Ten katalog zawiera zorganizowane informacje o narzędziach GitHub, MCP Servers i bibliotekach używanych w ekosystemie Bonzo/Jimbo. Każde narzędzie posiada pole `use_cases` i `ai_summary` ułatwiające decyzję KIEDY i DLACZEGO go użyć.

## 📁 Struktura

```
GIT_HOOB_catalogi/
├── system.json              — Master manifest, schemat JSON, lista kategorii
├── README.md                — Ten plik (dla ludzi i AI)
├── index.json               — Płaski indeks wszystkich narzędzi (auto-generowany)
└── categories/
    ├── editor/catalog.json      📝 File Editing
    ├── terminal/catalog.json    ⚡ Terminal / Commands
    ├── search/catalog.json      🔍 Search / Grep
    ├── memory/catalog.json      🧠 Memory / Context
    ├── git/catalog.json         🔀 Git Operations
    ├── ai_llm/catalog.json      🤖 AI / LLM Tools
    ├── build_deploy/catalog.json 🏗️ Build / Deploy
    ├── testing/catalog.json     🧪 Testing / QA
    ├── database/catalog.json    🗄️ Database / Storage
    ├── security/catalog.json    🔐 Security / Auth
    ├── monitoring/catalog.json  📊 Monitoring / Logs
    ├── devops/catalog.json      🐳 DevOps / Infrastructure
    ├── mcp_tools/catalog.json   🔌 MCP Tools / Servers
    ├── ui_frontend/catalog.json 🎨 UI / Frontend
    ├── api_backend/catalog.json 🌐 API / Backend
    ├── data_processing/catalog.json ⚙️ Data Processing
    ├── automation/catalog.json  🤖 Automation / Scraping
    ├── networking/catalog.json  📡 Networking / Proxy
    └── other/catalog.json       🔧 Other Tools
```

## 🤖 Instrukcja dla AI

### Jak znaleźć narzędzie do zadania?

1. Sprawdź `index.json` — zawiera wszystkie narzędzia z polem `use_cases`
2. Filtruj po `cat` (kategorii) lub przeszukaj po `tags`
3. Pole `ai_workflows` pokazuje przykładowe zastosowania w pipeline agentów

### Schemat narzędzia (do czytania przez AI)

```json
{
  "id": 1,
  "cat": "mcp_tools",
  "icon": "🔌",
  "name": "Nazwa narzędzia",
  "desc": "Jednozdaniowy opis techniczny",
  "readme": "Pełny opis z detalami",
  "url": "https://github.com/owner/repo",
  "docs": "https://docs.example.com",
  "tags": ["rust", "selfhosted"],
  "status": "deploy",
  "stars": 3,
  "use_cases": [
    "Automatyczne czytanie plików projektu",
    "Integracja z IDE przez protokół MCP"
  ],
  "ai_summary": "Używaj gdy agent potrzebuje X. Nie używaj gdy Y.",
  "ai_workflows": [
    "Agent → fetchGitHub → detectCategory → saveToCatalog"
  ],
  "gh_stars": 12500,
  "gh_language": "Rust",
  "gh_topics": ["mcp", "llm", "agent"],
  "gh_license": "MIT",
  "fetched_at": "2026-04-15T21:00:00Z"
}
```

## 🔗 Powiązane pliki

- `a:\tools-catalog_empty1.html` — Interfejs webowy do zarządzania katalogiem
- Eksport JSON z interfejsu → można importować do katalogu

---
*System: GIT_HOOB_catalogi v2.0 | Owner: Bonzo/Jimbo | Created: 2026-04-15*
