# Analytics — Agent Context

## Cel / Purpose
Analityka stron - Plausible CE + CF Analytics Engine

## Pliki modulu
- Hook:      `useAnalytics.ts`
- Component: `AnalyticsTab.tsx`
- Types:     `types.ts`
- Context:   `AGENT_CONTEXT.md` (ten plik)
- Index:     `index.ts`

## Stan aktualny
Podstawowa funkcjonalnosc z apiFetch() do CF Pages Functions.
BRAK integracji: JIMbo_KIT / JIMBO_HUB / JIMBO_gateway.

## Docelowe integracje

### JIMbo_KIT (ws://localhost:3701)
POST /chat: 'Przeanalizuj dane analytics: {data}. Podaj wnioski i rekomendacje po polsku.'

### JIMBO_HUB REST (http://localhost:4223)
POST /agent/run: 'Wygeneruj raport analityczny za ostatnie 30 dni'

### JIMBO_gateway CF Worker
https://jimbo-gateway.stolarnia-ams.workers.dev
GET /api/analytics/stats?period={p}&site={s}; GET /api/analytics/realtime

### BuchChatWidget
Przycisk 'Analizuj z AI' po zaladowaniu danych -> JIMbo interpretuje

## Offline Fallback
apiFetch('/api/analytics/{source}') bezposrednio

## Stan i handlery (po TASK-04)
```
analyticsInsights:string; analysisLoading:boolean; handleAiAnalysis()
```

## Jak uzywac z zewnatrz (Cline, Goose, BuchChat)
Prompt dla BuchChat/JIMbo:
> "Otwórz zakładkę analytics i przycisk 'analizuj z ai' po zaladowaniu danych -> jimbo interpretuje"

Goose agent task:
> "Sprawdz i uruchom task dla zakladki Analytics"

## Powiazany task
TASK-04: src/components/landing/tabs/analytics/ — implementacja integracji
Prerequisite: TASK-00 (shared/jimboClient.ts)
