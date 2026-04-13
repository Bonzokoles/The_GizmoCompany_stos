# Databases — Agent Context

## Cel / Purpose
Zarzadzanie bazami D1 - SQL query, schema explorer, natural language queries

## Pliki modulu
- Hook:      `useDatabases.ts`
- Component: `DatabasesTab.tsx`
- Types:     `types.ts`
- Context:   `AGENT_CONTEXT.md` (ten plik)
- Index:     `index.ts`

## Stan aktualny
Podstawowa funkcjonalnosc z apiFetch() do CF Pages Functions.
BRAK integracji: JIMbo_KIT / JIMBO_HUB / JIMBO_gateway.

## Docelowe integracje

### JIMbo_KIT (ws://localhost:3701)
NL->SQL: 'Przetlumacz na SQL dla D1 SQLite: {query_pl}' - zwraca gotowe zapytanie

### JIMBO_HUB REST (http://localhost:4223)
POST /agent/run: 'Przeanalizuj schemat bazy {dbId} i zaproponuj optymalizacje'

### JIMBO_gateway CF Worker
https://jimbo-gateway.stolarnia-ams.workers.dev
POST /api/d1/{dbId}/query {sql}; GET /api/d1/{dbId}/tables; GET /api/d1/{dbId}/schema

### BuchChatWidget
Przycisk 'Zapytaj po polsku' -> NL->JIMbo->SQL->execute

## Offline Fallback
Tylko reczny SQL przez apiFetch('/api/db/query')

## Stan i handlery (po TASK-08)
```
nlQuery:string; generatedSql:string; handleNlToSql(nl); handleExecuteSql(sql,dbId)
```

## Jak uzywac z zewnatrz (Cline, Goose, BuchChat)
Prompt dla BuchChat/JIMbo:
> "Otwórz zakładkę databases i przycisk 'zapytaj po polsku' -> nl->jimbo->sql->execute"

Goose agent task:
> "Sprawdz i uruchom task dla zakladki Databases"

## Powiazany task
TASK-08: src/components/landing/tabs/databases/ — implementacja integracji
Prerequisite: TASK-00 (shared/jimboClient.ts)
