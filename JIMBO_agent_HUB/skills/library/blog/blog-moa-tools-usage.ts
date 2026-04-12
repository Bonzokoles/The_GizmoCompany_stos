// Skill: blog-moa-tools-usage
// Namespace: blog
// Jak używać narzędzi MOA/JIMBO (agenci, pipeline, endpoints) do zadań blogowych
// Tags: blog, moa, tools, agents, hub, pipeline

# Narzędzia systemu MOA — użycie w zadaniach blogowych

## Dostępne agenci i ich zastosowanie do bloga

| Agent | Rola blogowa | Jak wywołać |
|-------|-------------|-------------|
| `data-researcher` | Research tematu, szukanie źródeł | `web_search` + `file_write` |
| `web-crawler` | Scraping treści, zbieranie danych | `web_search` + `file_write` |
| `content-generator` | Pisanie artykułów, szablony | `code_gen` + `file_write` |
| `planner` | Plan artykułu, outline | `file_read` + `file_write` |

## Wywołanie agenta przez HUB API

```bash
# POST http://localhost:4222/agent/run
{
  "task": "...",
  "agent": "content-generator"  # lub data-researcher, web-crawler
}
```

## Wyszukiwanie skilli (Hermes Pattern)

Przed generowaniem artykułu HUB automatycznie wstrzykuje relevantne skille:
```
POST http://localhost:4222/skills/search
{ "query": "blog generate article", "namespace": "blog", "limit": 3 }
```

Wynik jest wstrzykiwany jako **user message prefix** (NIE system prompt):
```
[Relevant skills from knowledge base:
## blog-generate-workflow
...treść skilla...
]
{oryginalna prośba użytkownika}
```

## MOA Pipeline do generowania treści blogowych

Pipeline 4-etapowy (`scripts/moa-pipeline.mjs`):
```
RAW SOURCES → ANALYZER (grupowanie tematyczne)
            → TRANSLATOR (tłumaczenie na PL + podsumowania)
            → HTML WRITER (generacja HTML — dark theme)
            → EMBEDDER (wektoryzacja → search API)
```

Używaj gdy: masz wiele źródeł i chcesz zbudować serię artykułów z jednego tematu.

## Endpoint do publikacji

```bash
# Lista projektów Cloudflare (w tym blogów)
GET http://localhost:4222/projects/cf/all

# Status huba (sprawdź czy działa)
GET http://localhost:4222/status
```

## Przykładowe prompty do generowania artykułów

### Artykuł techniczny:
```
"Napisz artykuł po polsku dla deweloperów na temat [TEMAT].
Format: markdown, 800-1000 słów, sekcje H2/H3, przykłady kodu w blokach ```.
Styl: praktyczny, bez zbędnego filler content."
```

### Post o AI/narzędziach:
```
"Napisz krótki post blogowy (400-500 słów) po polsku o [NARZĘDZIE/TEMAT].
Struktura: co to jest → jak działa → kiedy używać → przykład użycia.
Dodaj TL;DR na początku."
```

### Seria postów:
```
"Zaplanuj serię 5 artykułów o [TEMAT]. Dla każdego podaj:
tytuł, 3-zdaniowe streszczenie, główne punkty (bullet), target czytelnik."
```

## Zapis artykułu do pliku

```typescript
{
  "task": "Zapisz artykuł do pliku /articles/2026-04-05-[slug].md",
  "agent": "content-generator"
}
```
