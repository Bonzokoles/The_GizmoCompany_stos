# MOA — Agent Context

## Cel / Purpose
Mixture-of-Agents pipeline - 6 etapow (Parallel Writing->Critique->Aggregation->Validation->SEO)

## Pliki modulu
- Hook:      `useMOA.ts`
- Component: `MOATab.tsx`
- Types:     `types.ts`
- Context:   `AGENT_CONTEXT.md` (ten plik)
- Index:     `index.ts`

## Stan aktualny
Podstawowa funkcjonalnosc z apiFetch() do CF Pages Functions.
BRAK integracji: JIMbo_KIT / JIMBO_HUB / JIMBO_gateway.

## Docelowe integracje

### JIMbo_KIT (ws://localhost:3701)
WS streaming: uruchom MOA lokalnie; sessionId='moa-'+Date.now(); onChunk->podglad na zywo

### JIMBO_HUB REST (http://localhost:4223)
NIE uzywaj JIMBO_HUB - MOA ma wlasny CF Worker

### JIMBO_gateway CF Worker
https://jimbo-gateway.stolarnia-ams.workers.dev
PRIMARY: POST https://mybonzo-ai-workflow.bonzokoles.workers.dev/api/moa/generate {topic,type,language,profile}; JIMbo_KIT jako fallback

### BuchChatWidget
Przycisk 'Uruchom przez JIMbo' -> WS streaming (gdy JIMbo online)

## Offline Fallback
CF Worker URL bezposrednio (dziala zawsze gdy CF online)

## Stan i handlery (po TASK-10)
```
moaProfile:'DEFAULT'|'BLOG'|'DATA_ANALYSIS'|'SOCIAL_MEDIA'|'PRODUCT_COPY'; moaSource:string; moaStreamContent:string; handleMoaStream()
```

## Jak uzywac z zewnatrz (Cline, Goose, BuchChat)
Prompt dla BuchChat/JIMbo:
> "Otwórz zakładkę moa i przycisk 'uruchom przez jimbo' -> ws streaming (gdy jimbo online)"

Goose agent task:
> "Sprawdz i uruchom task dla zakladki MOA"

## Powiazany task
TASK-10: src/components/landing/tabs/moa/ — implementacja integracji
Prerequisite: TASK-00 (shared/jimboClient.ts)
