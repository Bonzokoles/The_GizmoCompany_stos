// Skill: devtools-usage
// Namespace: devtools
// Jak używać CF Pages deploy, D1 queries, GitHub Actions, Podman przez JIMBO HUB
// Tags: devtools, cloudflare, github, deploy, d1, podman, ci-cd

# DevTools — jak używać narzędzi deweloperskich

## Aktywuj namespace

```bash
POST http://localhost:4222/namespaces/activate
{ "namespace": "devtools" }
```

## Cloudflare Pages — deploy i monitoring

### Listuj projekty i statusy
```bash
GET http://localhost:4222/projects/cf/all
# Zwraca: mybonzo-new, jimbo-blog, jimbo77-site, jimbo-org, mybonzoaiblog
```

### Triggeruj deploy
```bash
POST http://localhost:4222/projects/mybonzo-new/deploy
# lub
POST http://localhost:4222/chat
{ "message": "Zadeploy mybonzo.com na Cloudflare Pages", "namespaces": ["devtools"] }
```

### Sprawdź logi buildu
```bash
GET http://localhost:4222/projects/mybonzo-new/logs
GET http://localhost:4222/projects/mybonzo-new/deployments  # historia deploy
```

## D1 — bazy danych Cloudflare

### Zapytania SQL przez HUB

```bash
POST http://localhost:4222/projects/mybonzo-new/d1/query
{ "sql": "SELECT name FROM sqlite_master WHERE type='table'", "params": [] }

POST http://localhost:4222/projects/mybonzo-new/d1/query
{ "sql": "SELECT COUNT(*) as total FROM skills", "params": [] }
```

### Dostępne projekty i ich D1

| Projekt | D1 baza | database_id |
|---------|---------|-------------|
| mybonzo-new | mybonzo | 84f0f3cb-7778-4cc4-a6ba-e823ef52f1f3 |
| mybonzoaiblog | jimbo-rag-db | 08ec6390-7b9f-4177-8e37-d1daed7c67bc |
| mybonzoaiblog | analytics-db | d881af54-3b21-4193-834b-7ac54d5ac44d |

```bash
# Stats D1 dla projektu
GET http://localhost:4222/projects/mybonzo-new/d1
```

### Wrangler (lokalnie)
```bash
npx wrangler d1 execute mybonzo --command="SELECT COUNT(*) FROM faktury"
npx wrangler d1 export mybonzo --output=backup-2026-04-05.sql
```

## GitHub Actions — CI/CD

```bash
# Lista ostatnich workflow runs
GET http://localhost:4222/projects/mybonzo-new/gh/runs

# Triggeruj workflow (np. deploy)
POST http://localhost:4222/chat
{
  "message": "Uruchom GitHub Actions workflow 'deploy' dla repozytorium mybonzo",
  "namespaces": ["devtools"]
}
```

### Przez API bezpośrednio
```bash
POST https://api.github.com/repos/Bonzokoles/luc-de-zen-on/actions/workflows/deploy.yml/dispatches
  -H "Authorization: Bearer {GITHUB_TOKEN}"
{ "ref": "main" }
```

## Podman — kontenery infrastruktury

```bash
# Status wszystkich kontenerów
GET http://localhost:4222/podman/containers

# Start/stop/restart
POST http://localhost:4222/podman/containers/zeno-meilisearch/start
POST http://localhost:4222/podman/containers/zeno-umami/restart
POST http://localhost:4222/podman/containers/zeno-searxng-redis/stop

# Logi
GET http://localhost:4222/podman/containers/zeno-meilisearch/logs?lines=100
```

### Skrypty Podman (U:\WWW_Zen_BRo_wser_org3\scripts\)
```bash
# Dev stack (search + analytics)
bash scripts/podman-dev.sh

# Production stack
bash scripts/podman-prod.sh

# Cleanup
bash scripts/podman-clean.sh
```

## Status hubu i diagnostyka

```bash
# Pełny status
GET http://localhost:4222/status

# Aktywne namespace'y
GET http://localhost:4222/namespaces

# Lista agentów
GET http://localhost:4222/agents/list

# Statystyki skilli
GET http://localhost:4222/skills/list?namespace=devtools
```

## Przykładowe pytania do BUCH (z namespace devtools)

```
"Zadeploy mybonzo.com — triggeruj CF Pages deploy i sprawdź logi"
"Sprawdź status wszystkich kontenerów Podman i uruchom te które nie działają"
"Pokaż historię ostatnich 5 deploymentów dla jimbo-blog"
"Wykonaj zapytanie SQL w D1 mybonzo: SELECT COUNT(*) FROM faktury"
"Uruchom GitHub Actions workflow deploy dla mybonzo"
"Sprawdź czy build na CF Pages przeszedł bez błędów"
"Zrób backup D1 mybonzo do pliku backup-DZIŚ.sql"
```

## Typowe sekwencje DevOps

### Deploy + weryfikacja
```
1. POST /projects/mybonzo-new/deploy
2. GET /projects/mybonzo-new/deployments  → czekaj na status 'success'
3. GET /projects/mybonzo-new/logs         → sprawdź logi
4. POST /projects/mybonzo-new/d1/query { sql: "SELECT 1" }  → weryfikacja DB
```

### Restart serwisów po deployu
```
1. POST /podman/containers/zeno-meilisearch/restart
2. POST /podman/containers/zeno-umami/restart
3. GET /podman/containers  → potwierdź status 'running'
```
