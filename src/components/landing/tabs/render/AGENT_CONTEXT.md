# Render — Agent Context

## Cel / Purpose
CF Pages deploy status, triggery webhook, historia deploymentow, analiza bledow build

## Pliki modulu
- Hook:      `useRender.ts`
- Component: `RenderTab.tsx`
- Types:     `types.ts`
- Context:   `AGENT_CONTEXT.md` (ten plik)
- Index:     `index.ts`

## Stan aktualny
Podstawowa funkcjonalnosc z apiFetch() do CF Pages Functions.
BRAK integracji: JIMbo_KIT / JIMBO_HUB / JIMBO_gateway.

## Docelowe integracje

### JIMbo_KIT (ws://localhost:3701)
POST /chat: 'Przeanalizuj blad deploy: {error_log}. Co poszlo nie tak i jak naprawic?'

### JIMBO_HUB REST (http://localhost:4223)
POST /agent/run: 'Sprawdz najnowszy deployment CF Pages i zglos status'; uzywa triggerGHWorkflow

### JIMBO_gateway CF Worker
https://jimbo-gateway.stolarnia-ams.workers.dev
GET /api/pages/deployments?project={name}; POST /api/pages/deploy; GET /api/pages/deploy/{id}/logs

### BuchChatWidget
Przycisk 'Analizuj blad' -> log deploy -> BuchChat diagnozuje

## Offline Fallback
Link do CF Dashboard bezposrednio

## Stan i handlery (po TASK-11)
```
deployments:any[]; deployLog:string; handleTriggerDeploy(p); handleAnalyzeDeployError(log)
```

## Jak uzywac z zewnatrz (Cline, Goose, BuchChat)
Prompt dla BuchChat/JIMbo:
> "Otwórz zakładkę render i przycisk 'analizuj blad' -> log deploy -> buchchat diagnozuje"

Goose agent task:
> "Sprawdz i uruchom task dla zakladki Render"

## Powiazany task
TASK-11: src/components/landing/tabs/render/ — implementacja integracji
Prerequisite: TASK-00 (shared/jimboClient.ts)
