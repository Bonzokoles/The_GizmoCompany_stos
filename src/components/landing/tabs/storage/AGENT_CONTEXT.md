# Storage — Agent Context

## Cel / Purpose
Zarzadzanie plikami R2 - lista, upload, delete, presigned URLs

## Pliki modulu
- Hook:      `useStorage.ts`
- Component: `StorageTab.tsx`
- Types:     `types.ts`
- Context:   `AGENT_CONTEXT.md` (ten plik)
- Index:     `index.ts`

## Stan aktualny
Podstawowa funkcjonalnosc z apiFetch() do CF Pages Functions.
BRAK integracji: JIMbo_KIT / JIMBO_HUB / JIMBO_gateway.

## Docelowe integracje

### JIMbo_KIT (ws://localhost:3701)
POST /chat: 'Co jest w buckecie {name}? Opisz zawartosc i zaproponuj organizacje.'

### JIMBO_HUB REST (http://localhost:4223)
POST /agent/run: 'Wyczysc stare pliki z bucketu {name} starsze niz 30 dni'

### JIMBO_gateway CF Worker
https://jimbo-gateway.stolarnia-ams.workers.dev
GET /api/r2/{bucket}/list; POST /api/r2/{bucket}/upload; DELETE /api/r2/{bucket}/{key}; GET /api/r2/{bucket}/presign/{key}

### BuchChatWidget
Przycisk 'Zapytaj o storage' -> kontekst bucketu do BuchChat

## Offline Fallback
Error message z instrukcja recznego dostepu przez CF Dashboard

## Stan i handlery (po TASK-07)
```
selectedBucket:string; bucketFiles:any[]; handleListBucket(name); handleUploadFile(file,bucket); handleDeleteFile(bucket,key)
```

## Jak uzywac z zewnatrz (Cline, Goose, BuchChat)
Prompt dla BuchChat/JIMbo:
> "Otwórz zakładkę storage i przycisk 'zapytaj o storage' -> kontekst bucketu do buchchat"

Goose agent task:
> "Sprawdz i uruchom task dla zakladki Storage"

## Powiazany task
TASK-07: src/components/landing/tabs/storage/ — implementacja integracji
Prerequisite: TASK-00 (shared/jimboClient.ts)
