# Crawlers — Agent Context

## Cel / Purpose
Crawlowanie URL, ekstrakcja tresci, budowanie Knowledge Base (D1 jimbo_kb)

## Pliki modulu
- Hook:      `useCrawlers.ts`
- Component: `CrawlersTab.tsx`
- Types:     `types.ts`
- Context:   `AGENT_CONTEXT.md` (ten plik)
- Index:     `index.ts`

## Stan aktualny
Podstawowa funkcjonalnosc z apiFetch() do CF Pages Functions.
BRAK integracji: JIMbo_KIT / JIMBO_HUB / JIMBO_gateway.

## Docelowe integracje

### JIMbo_KIT (ws://localhost:3701)
fetch_url tool: 'Pobierz i podsumuj: {url}'; kb_search: 'Znajdz w KB: {query}'; WS streaming

### JIMBO_HUB REST (http://localhost:4223)
POST /agent/run: 'Zindeksuj cala strone {url} i zapisz do KB'

### JIMBO_gateway CF Worker
https://jimbo-gateway.stolarnia-ams.workers.dev
POST /api/kb/save; GET /api/kb/search?q={q}; GET /api/kb/list

### BuchChatWidget
Przycisk 'Crawluj URL' -> JIMbo fetch_url -> podsumowanie -> opcja Save to KB

## Offline Fallback
apiFetch('/api/crawl/single') bezposrednio

## Stan i handlery (po TASK-06)
```
crawlUrl:string; crawlResult:any; kbItems:any[]; handleJimboCrawl(url); handleKbSave(doc)
```

## Jak uzywac z zewnatrz (Cline, Goose, BuchChat)
Prompt dla BuchChat/JIMbo:
> "Otwórz zakładkę crawlers i przycisk 'crawluj url' -> jimbo fetch_url -> podsumowanie -> opcja save to kb"

Goose agent task:
> "Sprawdz i uruchom task dla zakladki Crawlers"

## Powiazany task
TASK-06: src/components/landing/tabs/crawlers/ — implementacja integracji
Prerequisite: TASK-00 (shared/jimboClient.ts)
