# AiHub — Agent Context

## Cel / Purpose
Centrum AI - chat z prowiderami DeepSeek/OR/Anthropic/Workers AI + streaming + tools

## Pliki modulu
- Hook:      `useAiHub.ts`
- Component: `AiHubTab.tsx`
- Types:     `types.ts`
- Context:   `AGENT_CONTEXT.md` (ten plik)
- Index:     `index.ts`

## Stan aktualny
Podstawowa funkcjonalnosc z apiFetch() do CF Pages Functions.
BRAK integracji: JIMbo_KIT / JIMBO_HUB / JIMBO_gateway.

## Docelowe integracje

### JIMbo_KIT (ws://localhost:3701)
PRIMARY: pelny WS streaming; onTool->wyswietl 'Szukam: {q}' / 'Poberam: {url}'; tools wlaczone zawsze

### JIMBO_HUB REST (http://localhost:4223)
POST /skills/search - pokaz dostepne skills dla kontekstu; POST /skills/save - zapisz wyniki

### JIMBO_gateway CF Worker
https://jimbo-gateway.stolarnia-ams.workers.dev
Fallback: JIMBO_gateway POST /api/ai/chat (Workers AI Gemma 7b-it) gdy JIMbo offline

### BuchChatWidget
AiHub IS rozszerzona wersja BuchChat - moze otworzyc BuchChatWidget lub byc sam dla siebie

## Offline Fallback
apiFetch('/api/ai/workers-ai', {prompt}) - CF Workers AI

## Stan i handlery (po TASK-13)
```
streamContent:string; toolEvents:{tool,result}[]; sessionId:string; handleStreamChat(prompt)
```

## Jak uzywac z zewnatrz (Cline, Goose, BuchChat)
Prompt dla BuchChat/JIMbo:
> "Otwórz zakładkę aihub i aihub is rozszerzona wersja buchchat - moze otworzyc buchchatwidget lub byc sam dla siebie"

Goose agent task:
> "Sprawdz i uruchom task dla zakladki AiHub"

## Powiazany task
TASK-13: src/components/landing/tabs/aihub/ — implementacja integracji
Prerequisite: TASK-00 (shared/jimboClient.ts)
