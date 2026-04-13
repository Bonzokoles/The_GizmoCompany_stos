# Content — Agent Context

## Cel / Purpose
CMS - tworzenie, edycja, publikacja artykulow (Ghost CMS / headless)

## Pliki modulu
- Hook:      `useContent.ts`
- Component: `ContentTab.tsx`
- Types:     `types.ts`
- Context:   `AGENT_CONTEXT.md` (ten plik)
- Index:     `index.ts`

## Stan aktualny
Podstawowa funkcjonalnosc z apiFetch() do CF Pages Functions.
BRAK integracji: JIMbo_KIT / JIMBO_HUB / JIMBO_gateway.

## Docelowe integracje

### JIMbo_KIT (ws://localhost:3701)
WS streaming do artykuolu: 'Napisz {type} po {lang} na temat: {topic}. Ton: {tone}' -> streamuje bezposrednio do edytora

### JIMBO_HUB REST (http://localhost:4223)
POST /agent/run: 'Napisz i opublikuj artykul SEO o {topic}'

### JIMBO_gateway CF Worker
https://jimbo-gateway.stolarnia-ams.workers.dev
POST /api/ghost/posts; POST /api/ghost/publish/{id}; GET /api/ghost/posts

### BuchChatWidget
Przycisk 'Generuj z JIMbo' -> WS streaming do articleContent state

## Offline Fallback
Reczny edytor z apiFetch('/api/content/generate')

## Stan i handlery (po TASK-03)
```
jimboStreaming:boolean; jimboStreamContent:string; handleJimboGenerate()
```

## Jak uzywac z zewnatrz (Cline, Goose, BuchChat)
Prompt dla BuchChat/JIMbo:
> "Otwórz zakładkę content i przycisk 'generuj z jimbo' -> ws streaming do articlecontent state"

Goose agent task:
> "Sprawdz i uruchom task dla zakladki Content"

## Powiazany task
TASK-03: src/components/landing/tabs/content/ — implementacja integracji
Prerequisite: TASK-00 (shared/jimboClient.ts)
