# MediaHub — Agent Context

## Cel / Purpose
Zarzadzanie mediami - BONZO_media_HUB, audio, video, obrazy, metadane

## Pliki modulu
- Hook:      `useMediaHub.ts`
- Component: `MediaHubTab.tsx`
- Types:     `types.ts`
- Context:   `AGENT_CONTEXT.md` (ten plik)
- Index:     `index.ts`

## Stan aktualny
Podstawowa funkcjonalnosc z apiFetch() do CF Pages Functions.
BRAK integracji: JIMbo_KIT / JIMBO_HUB / JIMBO_gateway.

## Docelowe integracje

### JIMbo_KIT (ws://localhost:3701)
POST /chat: 'Wygeneruj metadane (title, description, tags) dla pliku: {filename}'

### JIMBO_HUB REST (http://localhost:4223)
POST /agent/run: 'Zaktualizuj metadane mediow bez opisu w R2'

### JIMBO_gateway CF Worker
https://jimbo-gateway.stolarnia-ams.workers.dev
GET /api/r2/media/list?type={t}; DELETE /api/r2/media/{key}; POST /api/media/transcode

### BuchChatWidget
Przycisk 'Opisz media' -> JIMbo generuje opisy i tagi

## Offline Fallback
Lista statyczna z public/media lub BONZO_media_HUB/

## Stan i handlery (po TASK-16)
```
Stworz useMediaHub.ts: mediaList:any[]; selectedMedia:any; handleLoadMedia(type); handleGenerateMetadata(key)
```

## Jak uzywac z zewnatrz (Cline, Goose, BuchChat)
Prompt dla BuchChat/JIMbo:
> "Otwórz zakładkę mediahub i przycisk 'opisz media' -> jimbo generuje opisy i tagi"

Goose agent task:
> "Sprawdz i uruchom task dla zakladki MediaHub"

## Powiazany task
TASK-16: src/components/landing/tabs/mediahub/ — implementacja integracji
Prerequisite: TASK-00 (shared/jimboClient.ts)
