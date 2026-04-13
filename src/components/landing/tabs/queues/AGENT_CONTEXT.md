# Queues — Agent Context

## Cel / Purpose
CF Queues - wysylanie wiadomosci, monitoring, batch processing

## Pliki modulu
- Hook:      `useQueues.ts`
- Component: `QueuesTab.tsx`
- Types:     `types.ts`
- Context:   `AGENT_CONTEXT.md` (ten plik)
- Index:     `index.ts`

## Stan aktualny
Podstawowa funkcjonalnosc z apiFetch() do CF Pages Functions.
BRAK integracji: JIMbo_KIT / JIMBO_HUB / JIMBO_gateway.

## Docelowe integracje

### JIMbo_KIT (ws://localhost:3701)
POST /chat: 'Zbuduj payload JSON dla kolejki {name}: {description_pl}' - pomoc w konstruowaniu

### JIMBO_HUB REST (http://localhost:4223)
POST /agent/run: 'Monitoruj kolejke {name} i raportuj anomalie'

### JIMBO_gateway CF Worker
https://jimbo-gateway.stolarnia-ams.workers.dev
GET /api/queues/list; POST /api/queues/{name}/send; GET /api/queues/{name}/stats

### BuchChatWidget
Przycisk 'Pomoc z payloadem' -> BuchChat generuje JSON struktury

## Offline Fallback
Manual JSON editor z apiFetch('/api/queues/send')

## Stan i handlery (po TASK-12)
```
queueList:any[]; messagePayload:string; handleSendMessage(q,p); handleQueueStats(q)
```

## Jak uzywac z zewnatrz (Cline, Goose, BuchChat)
Prompt dla BuchChat/JIMbo:
> "Otwórz zakładkę queues i przycisk 'pomoc z payloadem' -> buchchat generuje json struktury"

Goose agent task:
> "Sprawdz i uruchom task dla zakladki Queues"

## Powiazany task
TASK-12: src/components/landing/tabs/queues/ — implementacja integracji
Prerequisite: TASK-00 (shared/jimboClient.ts)
