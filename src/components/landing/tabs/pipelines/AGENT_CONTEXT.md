# Pipelines — Agent Context

## Cel / Purpose
Zarzadzanie pipeline'ami (MOA, crawl, publish, sync) - status + trigger

## Pliki modulu
- Hook:      `usePipelines.ts`
- Component: `PipelinesTab.tsx`
- Types:     `types.ts`
- Context:   `AGENT_CONTEXT.md` (ten plik)
- Index:     `index.ts`

## Stan aktualny
Podstawowa funkcjonalnosc z apiFetch() do CF Pages Functions.
BRAK integracji: JIMbo_KIT / JIMBO_HUB / JIMBO_gateway.

## Docelowe integracje

### JIMbo_KIT (ws://localhost:3701)
WS streaming: monitor statusu pipeline w czasie rzeczywistym; POST /chat: 'Opisz wynik pipeline'

### JIMBO_HUB REST (http://localhost:4223)
POST /agent/run: 'Uruchom pipeline {name} z parametrami {params}'

### JIMBO_gateway CF Worker
https://jimbo-gateway.stolarnia-ams.workers.dev
GET /api/pipelines/list; POST /api/pipelines/run/{name}; GET /api/pipelines/status/{id}

### BuchChatWidget
Przycisk 'Zaplanuj pipeline' -> BuchChat pomaga skonfigurowac

## Offline Fallback
apiFetch('/api/pipelines') lista statyczna

## Stan i handlery (po TASK-05)
```
pipelineStatus:Record<string,string>; handleRunPipeline(name); handleMonitorPipeline(id)
```

## Jak uzywac z zewnatrz (Cline, Goose, BuchChat)
Prompt dla BuchChat/JIMbo:
> "Otwórz zakładkę pipelines i przycisk 'zaplanuj pipeline' -> buchchat pomaga skonfigurowac"

Goose agent task:
> "Sprawdz i uruchom task dla zakladki Pipelines"

## Powiazany task
TASK-05: src/components/landing/tabs/pipelines/ — implementacja integracji
Prerequisite: TASK-00 (shared/jimboClient.ts)
