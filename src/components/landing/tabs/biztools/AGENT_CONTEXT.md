# BizTools — Agent Context

## Cel / Purpose
Narzedzia biznesowe AI - analiza konkurencji, brief contentowy, raport rynkowy, strategia

## Pliki modulu
- Hook:      `useBizTools.ts`
- Component: `BizToolsTab.tsx`
- Types:     `types.ts`
- Context:   `AGENT_CONTEXT.md` (ten plik)
- Index:     `index.ts`

## Stan aktualny
Podstawowa funkcjonalnosc z apiFetch() do CF Pages Functions.
BRAK integracji: JIMbo_KIT / JIMBO_HUB / JIMBO_gateway.

## Docelowe integracje

### JIMbo_KIT (ws://localhost:3701)
Kazde narzedzie ma dedykowany prompt template; streaming WS dla dlugich analiz; przyklady: analiza_konkurencji / brief_seo / raport_rynkowy

### JIMBO_HUB REST (http://localhost:4223)
POST /agent/run: 'Przeprowadz pelny research rynkowy dla {topic}' (Goose z web_search)

### JIMBO_gateway CF Worker
https://jimbo-gateway.stolarnia-ams.workers.dev
POST /api/biz/analyze; POST /api/biz/research; uzywa AI Gate

### BuchChatWidget
Kazde narzedzie: przycisk 'Uruchom w BuchChat' z kontekstem

## Offline Fallback
apiFetch('/api/ai/biz/{tool}') bezposrednio

## Stan i handlery (po TASK-14)
```
activeTool:string; toolResult:string; toolHistory:any[]; handleRunTool(id,params)
```

## Jak uzywac z zewnatrz (Cline, Goose, BuchChat)
Prompt dla BuchChat/JIMbo:
> "Otwórz zakładkę biztools i kazde narzedzie: przycisk 'uruchom w buchchat' z kontekstem"

Goose agent task:
> "Sprawdz i uruchom task dla zakladki BizTools"

## Powiazany task
TASK-14: src/components/landing/tabs/biztools/ — implementacja integracji
Prerequisite: TASK-00 (shared/jimboClient.ts)
