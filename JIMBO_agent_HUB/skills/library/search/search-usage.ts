// Skill: search-usage
// Namespace: search
// Jak używać narzędzi wyszukiwania (Meilisearch, SearXNG, sist2, websurfx) przez JIMBO HUB
// Tags: search, meilisearch, searxng, sist2, fulltext

# Search — jak używać narzędzi wyszukiwania

## Dostępne kontenery (namespace: search)

| Kontener | Opis | Port |
|----------|------|------|
| `zeno-meilisearch` | Full-text search engine (typo-tolerant) | 7700 |
| `zeno-searxng-redis` | Metasearch (agreguje Google/Bing/DDG) | 8080 |
| `zeno-websurfx` | Privacy metasearch engine | 8888 |
| `zeno-sist2` | Lokalny search po plikach desktop | 4090 |

## Sprawdź status kontenerów

```bash
GET http://localhost:4222/podman/containers
# Filtruj kontenery z namespace 'search'

POST http://localhost:4222/podman/containers/zeno-meilisearch/start
```

## Aktywuj namespace search

```bash
POST http://localhost:4222/namespaces/activate
{ "namespace": "search" }
```

## Meilisearch — Full-text search

Indeksuj dane (np. artykuły blogu, produkty) i przeszukuj z typo-tolerance.

### Indeksowanie dokumentów
```bash
POST http://localhost:7700/indexes/articles/documents
  -H "Authorization: Bearer {MASTER_KEY}"
  -H "Content-Type: application/json"
[
  { "id": 1, "title": "Artykuł o AI", "content": "...", "tags": ["ai"] },
  { "id": 2, "title": "DevOps guide", "content": "..." }
]
```

### Wyszukiwanie
```bash
POST http://localhost:7700/indexes/articles/search
  -H "Authorization: Bearer {MASTER_KEY}"
{ "q": "artykuł ai", "limit": 10, "attributesToHighlight": ["title","content"] }
```

### Przez JIMBO HUB /chat
```
POST http://localhost:4222/chat
{
  "message": "Przeszukaj indeks 'articles' w Meilisearch dla zapytania 'cloudflare workers'",
  "namespaces": ["search"]
}
```

## SearXNG — Privacy Metasearch

```bash
# Wyszukiwanie przez API
GET http://localhost:8080/search?q=cloudflare+workers+ai&format=json&categories=general

# Wyniki JSON zawierają: title, url, content, engine (skąd pochodzi)
```

### Przez JIMBO HUB — web research
```
POST http://localhost:4222/chat
{
  "message": "Wyszukaj przez SearXNG informacje o 'Astro 5 SSR performance 2025'",
  "namespaces": ["search"]
}
```

## sist2 — Desktop File Search

Indeksuje i przeszukuje pliki na dysku lokalnym.

```bash
# UI: http://localhost:4090
# Przeszukuje U:\ i inne skonfigurowane ścieżki

# API
GET http://localhost:4090/search?query=hub-server&path=/WWW_Zen_BRo_wser_org3
```

## websurfx — Privacy Metasearch (alternatywa)

```bash
# UI: http://localhost:8888
# Agreguje wyniki z wielu wyszukiwarek bez trackingu
GET http://localhost:8888/search?q=ai+agents&format=json
```

## Przykładowe pytania do BUCH (z namespace search)

```
"Zindeksuj w Meilisearch wszystkie artykuły z mybonzoai blog z D1"
"Wyszukaj przez SearXNG najnowsze artykuły o Letta memory system"
"Znajdź lokalny plik konfiguracyjny dotyczący JIMBO HUB przez sist2"
"Przeszukaj Meilisearch index 'skills' dla zapytania 'cloudflare deployment'"
"Sprawdź status wszystkich kontenerów search i uruchom te które nie działają"
```

## Meilisearch — typowe indeksy w projekcie

| Indeks | Zawartość | Klucz |
|--------|-----------|-------|
| `skills` | Skille JIMBO HUB | id |
| `articles` | Artykuły blog | slug |
| `docs` | Dokumentacja CF/Astro | url |
| `products` | Produkty mybonzo | sku |
