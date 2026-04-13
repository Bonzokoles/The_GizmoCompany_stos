# Overview — Agent Context

## Cel / Purpose
Wyszukiwanie web (SearXNG), quick AI query, status systemu

## Pliki modulu
- Hook:      `useOverview.ts`
- Component: `OverviewTab.tsx`
- Types:     `types.ts`
- Context:   `AGENT_CONTEXT.md` (ten plik)
- Index:     `index.ts`

## Stan aktualny
Podstawowa funkcjonalnosc z apiFetch() do CF Pages Functions.
BRAK integracji: JIMbo_KIT / JIMBO_HUB / JIMBO_gateway.

## Docelowe integracje

### JIMbo_KIT (ws://localhost:3701)
web_search tool: message='Wyszukaj: {query}'; fetch_url: 'Pobierz i podsumuj: {url}'; WS streaming

### JIMBO_HUB REST (http://localhost:4223)
GET /status at mount; POST /agent/run task='Wyszukaj i podsumuj: {q}'

### JIMBO_gateway CF Worker
https://jimbo-gateway.stolarnia-ams.workers.dev
GET /api/workers/status; GET /api/analytics/summary

### BuchChatWidget
Klik 'AI Gate Ask' -> BuchChat z promptem z pola aiPrompt

## Offline Fallback
apiFetch('/api/search/query') bezposrednio

## Stan i handlery (po TASK-01)
```
jimboOnline:boolean; handleJimboSearch(query); handleJimboAsk(prompt)
```

## Jak uzywac z zewnatrz (Cline, Goose, BuchChat)
Prompt dla BuchChat/JIMbo:
> "Otwórz zakładkę overview i klik 'ai gate ask' -> buchchat z promptem z pola aiprompt"

Goose agent task:
> "Sprawdz i uruchom task dla zakladki Overview"

## Powiazany task
TASK-01: src/components/landing/tabs/overview/ — implementacja integracji
Prerequisite: TASK-00 (shared/jimboClient.ts)
