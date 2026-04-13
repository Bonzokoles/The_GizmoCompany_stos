# Workers — Agent Context

## Cel / Purpose
Monitor CF Workers - health check, deploy trigger, analiza logow

## Pliki modulu
- Hook:      `useWorkers.ts`
- Component: `WorkersTab.tsx`
- Types:     `types.ts`
- Context:   `AGENT_CONTEXT.md` (ten plik)
- Index:     `index.ts`

## Stan aktualny
Podstawowa funkcjonalnosc z apiFetch() do CF Pages Functions.
BRAK integracji: JIMbo_KIT / JIMBO_HUB / JIMBO_gateway.

## Docelowe integracje

### JIMbo_KIT (ws://localhost:3701)
POST /chat: 'Przeanalizuj logi workera {name}: {logs}' - opis bledu + sugestie

### JIMBO_HUB REST (http://localhost:4223)
POST /agent/run: 'Sprawdz status wszystkich CF Workers'; GET /agent/tasks

### JIMBO_gateway CF Worker
https://jimbo-gateway.stolarnia-ams.workers.dev
GET /api/workers/list; POST /api/workers/deploy; GET /api/workers/logs/{name}

### BuchChatWidget
Przycisk 'Ask AI' przy workerze -> BuchChat z kontekstem workera

## Offline Fallback
Cached dane lub 'offline mode' indicator

## Stan i handlery (po TASK-02)
```
workerLogs:Record<string,string>; handleAnalyzeLogs(name); handleDeployWorker(name)
```

## Jak uzywac z zewnatrz (Cline, Goose, BuchChat)
Prompt dla BuchChat/JIMbo:
> "Otwórz zakładkę workers i przycisk 'ask ai' przy workerze -> buchchat z kontekstem workera"

Goose agent task:
> "Sprawdz i uruchom task dla zakladki Workers"

## Powiazany task
TASK-02: src/components/landing/tabs/workers/ — implementacja integracji
Prerequisite: TASK-00 (shared/jimboClient.ts)
