# ZENO Browser - Custom Agents

Niestandardowi agenci dodani dla ZENO Browser aplikacji.

## Agenci

### 1. Web Crawler (`web-crawler`)

**Rola:** Web Research & Crawler  
**Wersja:** 1.0.0  
**Model:** Gemini 1.5 Pro  

**Opis:**
Specjalista do przeglądania i analizy stron internetowych. Crawluje DOM, ekstraktuje zawartość, mapuje strukturę serwisów, przeprowadza research w oparciu o web.

**Narzędzia:**
- `web_search` - wyszukiwanie w sieci
- `file_read` - odczyt plików lokalnych
- `file_write` - zapis wyników

**Umiejętności:**
- web-crawling
- content-extraction
- web-search
- url-mapping
- site-structure-analysis

**Skills użyte:**
- `tavily-crawl` - crawlowanie witryn
- `tavily-extract` - ekstrakcja zawartości
- `tavily-search` - wyszukiwanie webowe
- `tavily-map` - mapowanie URL'ów
- `tavily-research` - deep research

---

### 2. Content Generator (`content-generator`)

**Rola:** Content & Code Generator  
**Wersja:** 1.0.0  
**Model:** Gemini 1.5 Pro  

**Opis:**
Specjalista do generowania treści, kodu i dokumentacji. Tworzy wysokiej jakości teksty, snippety kodu, tutoriale i interaktywne dema z użyciem najlepszych praktyk.

**Narzędzia:**
- `file_write` - zapis zawartości
- `file_read` - odczyt szablonów
- `code_gen` - generowanie kodu

**Umiejętności:**
- content-generation
- code-generation
- documentation-writing
- demo-creation
- template-generation

**Skills użyte:**
- `transformers-js` - ML modele w JavaScript
- `huggingface-gradio` - interaktywne UI
- `tavily-search` - research do kontekstu

---

### 3. Code Analyzer (`code-analyzer`)

**Rola:** Code Analysis & Optimization Specialist  
**Wersja:** 1.0.0  
**Model:** Gemini 1.5 Pro  

**Opis:**
Specjalista do analizy, audytu i optymalizacji kodu. Sprawdza jakość, wydajność, bezpieczeństwo, identyfikuje błędy i sugeruje refactoring.

**Narzędzia:**
- `file_read` - odczyt kodu
- `file_write` - generowanie propozycji zmian
- `terminal` - uruchamianie narzędzi analitycznych

**Umiejętności:**
- code-review
- performance-analysis
- security-audit
- refactoring
- bug-detection

**Skills użyte:**
- `web-perf` - analiza wydajności
- `workers-best-practices` - best practices
- `tavily-search` - research Best Practices

---

## Integracja

### 1. W `agents.config.ts`
Wszyscy agenci mają już zdefiniowaną konfigurację z modelami, toolami i skillami.

### 2. Uruchomienie
```bash
npm run dev
```

### 3. Aktywacja Skillów
Każdy skill jest automatycznie załadowany z `.agents/skills/` folderu.

---

## Kolejne Kroki

- [ ] Przetestować agentów w aplikacji
- [ ] Dodać więcej custom skillów
- [ ] Zintegrować z GitHub API
- [ ] Skonfigurować MCP Server

