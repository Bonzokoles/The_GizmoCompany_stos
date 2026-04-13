# Images — Agent Context

## Cel / Purpose
Zarzadzanie obrazkami R2 - upload, galeria, AI alt-text, generowanie

## Pliki modulu
- Hook:      `useImages.ts`
- Component: `ImagesTab.tsx`
- Types:     `types.ts`
- Context:   `AGENT_CONTEXT.md` (ten plik)
- Index:     `index.ts`

## Stan aktualny
Podstawowa funkcjonalnosc z apiFetch() do CF Pages Functions.
BRAK integracji: JIMbo_KIT / JIMBO_HUB / JIMBO_gateway.

## Docelowe integracje

### JIMbo_KIT (ws://localhost:3701)
Alt-text SEO: 'Napisz SEO alt-text (max 125 znakow) dla: {filename} kontekst: {ctx}'

### JIMBO_HUB REST (http://localhost:4223)
POST /agent/run: 'Wygeneruj alt-texty dla obrazkow bez opisu w buckecie images'

### JIMBO_gateway CF Worker
https://jimbo-gateway.stolarnia-ams.workers.dev
GET /api/r2/images/list; POST /api/r2/images/upload; DELETE /api/r2/images/{key}; POST /api/ai/image-gen

### BuchChatWidget
Przycisk 'Generuj opis' przy obrazku -> alt-text przez JIMbo

## Offline Fallback
Reczny upload przez apiFetch('/api/images/upload')

## Stan i handlery (po TASK-09)
```
imageList:any[]; altTextLoading:boolean; handleGenerateAltText(fn,ctx); handleImageUpload(file)
```

## Jak uzywac z zewnatrz (Cline, Goose, BuchChat)
Prompt dla BuchChat/JIMbo:
> "Otwórz zakładkę images i przycisk 'generuj opis' przy obrazku -> alt-text przez jimbo"

Goose agent task:
> "Sprawdz i uruchom task dla zakladki Images"

## Powiazany task
TASK-09: src/components/landing/tabs/images/ — implementacja integracji
Prerequisite: TASK-00 (shared/jimboClient.ts)
