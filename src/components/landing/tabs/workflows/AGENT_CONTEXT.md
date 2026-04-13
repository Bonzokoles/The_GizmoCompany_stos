# Workflows — Agent Context

## Cel / Purpose
GitHub Actions management - trigger, status, historia runow, analiza bledow

## Pliki modulu
- Hook:      `useWorkflows.ts`
- Component: `WorkflowsTab.tsx`
- Types:     `types.ts`
- Context:   `AGENT_CONTEXT.md` (ten plik)
- Index:     `index.ts`

## Stan aktualny
Podstawowa funkcjonalnosc z apiFetch() do CF Pages Functions.
BRAK integracji: JIMbo_KIT / JIMBO_HUB / JIMBO_gateway.

## Docelowe integracje

### JIMbo_KIT (ws://localhost:3701)
POST /chat: 'Przeanalizuj blad workflow: {error}. Zaproponuj fix.'

### JIMBO_HUB REST (http://localhost:4223)
POST /agent/run: 'Sprawdz status GH Actions dla {repo}'; hub-server.ts juz importuje triggerGHWorkflow!

### JIMBO_gateway CF Worker
https://jimbo-gateway.stolarnia-ams.workers.dev
GET /api/github/workflows?repo={r}; POST /api/github/workflows/{id}/dispatch; GET /api/github/runs?repo={r}

### BuchChatWidget
Przycisk 'Analizuj fail' -> log workflow -> diagnoza JIMbo

## Offline Fallback
Link do GitHub Actions bezposrednio

## Stan i handlery (po TASK-15)
```
workflowRuns:any[]; dispatchLoading:boolean; handleDispatch(repo,id,inputs); handleAnalyzeError(log)
```

## Jak uzywac z zewnatrz (Cline, Goose, BuchChat)
Prompt dla BuchChat/JIMbo:
> "Otwórz zakładkę workflows i przycisk 'analizuj fail' -> log workflow -> diagnoza jimbo"

Goose agent task:
> "Sprawdz i uruchom task dla zakladki Workflows"

## Powiazany task
TASK-15: src/components/landing/tabs/workflows/ — implementacja integracji
Prerequisite: TASK-00 (shared/jimboClient.ts)
