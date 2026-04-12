// Skill: global-hub-usage
// Namespace: global
// Jak używać JIMBO HUB core — memory (3-tier), Goose agent, skills management, sessions
// Tags: hub, memory, goose, skills, session, core

# JIMBO HUB — core features (memory, Goose, skills)

## Memory System (3-tier)

### 1. Core Memory — trwałe dane agenta (zawsze ładowane do system prompt)

```bash
# Zapisz ważny fakt (zostaje na zawsze)
POST http://localhost:4222/memory/core
{ "key": "project_status", "value": "mybonzo v2 w produkcji od 2026-04-01" }

# Odczyt core memory
GET http://localhost:4222/memory/core

# Usuń wpis
DELETE http://localhost:4222/memory/core/project_status
```

**Kiedy używać:** dane o projekcie, preferencje, ważne konteksty które mają być ZAWSZE dostępne.

### 2. Archival Memory — wektorowa baza wiedzy (semantyczne wyszukiwanie)

```bash
# Zapisz do archiwum
POST http://localhost:4222/memory/archival/save
{
  "content": "Cloudflare D1 ma limit 10GB na bazę danych w planie Workers Paid",
  "category": "cloudflare"
}

# Semantyczne wyszukiwanie
POST http://localhost:4222/memory/archival/search
{ "query": "limity D1 cloudflare", "limit": 5 }

# Lista archiwum
GET http://localhost:4222/memory/archival

DELETE http://localhost:4222/memory/archival/{id}
```

**Kiedy używać:** dokumentacja, notatki z sesji, wiedza techniczna do późniejszego wyszukiwania.

### 3. Recall Memory — historia sesji (FTS5 full-text search)

```bash
# Wyszukaj w historii rozmów
POST http://localhost:4222/memory/recall/search
{ "query": "deploy mybonzo failed", "limit": 10 }

# Ręcznie zapisz wpis
POST http://localhost:4222/memory/recall/save
{ "role": "user", "content": "...", "sessionId": "session-123" }

# Historia (automatycznie zapisywana przy każdym /chat)
GET http://localhost:4222/memory/recall

# Statystyki
GET http://localhost:4222/memory/stats
```

## Goose — autonomiczny agent AI

### Uruchom zadanie

```bash
POST http://localhost:4222/agent/run
{
  "task": "Opis zadania w języku naturalnym. Goose wykona je autonomicznie używając narzędzi (file, terminal, web).",
  "agent": "content-generator"   # opcjonalnie: planner, data-researcher, web-crawler, ml-trainer, code-analyzer
}
# Zwraca: { taskId: "...", status: "running" }
```

### Monitoruj zadanie

```bash
GET http://localhost:4222/agent/tasks           # lista aktywnych
DELETE http://localhost:4222/agent/tasks/{id}   # zatrzymaj
```

### Launchuj Goose Desktop

```bash
POST http://localhost:4222/goose/desktop/launch
GET http://localhost:4222/goose/desktop/status
```

### Wzorzec wywołania Goose z chatu

W wiadomości do BUCH użyj prefiksu:
```
⚡ Wyślij do Goose: [opis zadania]
```

BUCH automatycznie transluje to na `POST /agent/run`.

## Skills Management

### Wyszukaj skill semantycznie

```bash
POST http://localhost:4222/skills/search
{ "query": "jak deployować na cloudflare", "topK": 3, "namespaces": ["devtools", "blog"] }
```

### Zapisz nowy skill

```bash
POST http://localhost:4222/skills/save
{
  "name": "moj-skill",
  "description": "Opis co skill robi",
  "code": "# Treść skilla w markdown...",
  "tags": ["tag1", "tag2"],
  "namespace": "global"
}
```

### Eksport / Import

```bash
GET http://localhost:4222/skills/export           # wszystkie jako JSON
POST http://localhost:4222/skills/import          # importuj z JSON
GET http://localhost:4222/skills/export-skill-md  # eksport jako SKILL.md
GET http://localhost:4222/skills/graph            # graf zależności (visual)
```

### Import sesji Goose jako skill

```bash
GET http://localhost:4222/skills/goose-sessions   # lista plików sesji
POST http://localhost:4222/skills/import-goose-session
{ "file": "session-2026-04-05.json" }
```

## Namespaces — aktywne narzędzia

```bash
GET http://localhost:4222/namespaces             # aktywne namespace'y
POST http://localhost:4222/namespaces/activate   { "namespace": "analytics" }
POST http://localhost:4222/namespaces/deactivate { "namespace": "search" }
```

**Namespace = kontener Podman jest running** — HUB automatycznie wykrywa.

## Session — stan rozmowy

```bash
GET http://localhost:4222/session          # aktualny stan (model, sesja, namespace'y)
POST http://localhost:4222/session/reset   # wyczyść sesję (zachowaj core memory)
```

## Chat — jak działa wstrzykiwanie kontekstu

Przy każdym `POST /chat`, HUB automatycznie:
1. Ładuje `core_memory` → do system prompt (cacheable)
2. Semantycznie szuka `recall` dla query → user prefix
3. Semantycznie szuka `skills` dla query → user prefix (Hermes Pattern)
4. Wysyła do modelu z pełnym kontekstem

```bash
POST http://localhost:4222/chat
{
  "message": "Twoje pytanie",
  "model": "claude-sonnet-4-6",        # opcjonalne (domyślnie haiku)
  "namespaces": ["analytics", "blog"], # które namespace skilli wstrzykiwać
  "stream": true                       # opcjonalnie streaming
}
```

## Przykładowe pytania do BUCH

```
"Zapisz do core memory: 'JIMBO HUB działa na porcie 4222'"
"Wyszukaj w archival memory informacje o limitach D1 cloudflare"
"Pokaż historię rozmów z ostatniej godziny z słowem 'deploy'"
"⚡ Wyślij do Goose: Stwórz plik /tmp/test.md z podsumowaniem projektu ZENO"
"Jakie namespace'y są aktualnie aktywne?"
"Eksportuj wszystkie skille do pliku skills-backup.json"
```
