// Skill: analytics-usage
// Namespace: analytics
// Jak używać narzędzi analitycznych (Umami, Plausible, Superset, goAccess) przez JIMBO HUB
// Tags: analytics, umami, plausible, superset, podman

# Analytics — jak używać narzędzi analitycznych

## Dostępne kontenery (namespace: analytics)

| Kontener | Opis | Port |
|----------|------|------|
| `zeno-umami` | Web analytics (open source GA alternative) | 3001 |
| `plausible` | Privacy-first analytics | 8000 |
| `zeno-superset` | BI/dashboarding (Apache Superset) | 8088 |
| `goAccess` | Log analytics (Nginx/CF logs) | 7890 |

## Krok 1: Sprawdź czy kontenery działają

```bash
GET http://localhost:4222/podman/containers
```
Szukaj statusu `running` dla kontenerów z namespace `analytics`.

```bash
# Uruchom kontener jeśli nie działa
POST http://localhost:4222/podman/containers/zeno-umami/start

# Logi kontenera
GET http://localhost:4222/podman/containers/zeno-umami/logs?lines=50
```

## Krok 2: Aktywuj namespace

```bash
POST http://localhost:4222/namespaces/activate
{ "namespace": "analytics" }
```
Po aktywacji HUB automatycznie wstrzykuje skille z namespace `analytics` do chatu.

## Umami — Web Analytics

### Sprawdź stats strony
```
POST http://localhost:4222/chat
{
  "message": "Pokaż statystyki odwiedzin mybonzo.com z ostatnich 7 dni z Umami",
  "namespaces": ["analytics"]
}
```

### Umami API (bezpośrednie)
```bash
# Auth
POST http://localhost:3001/api/auth/login
{ "username": "admin", "password": "..." }

# Stats
GET http://localhost:3001/api/websites/{websiteId}/stats?startAt=...&endAt=...
GET http://localhost:3001/api/websites/{websiteId}/pageviews
GET http://localhost:3001/api/websites/{websiteId}/events
```

## Plausible — Privacy Analytics

```bash
# Stats API
GET http://localhost:8000/api/v1/stats/summary?site_id=mybonzo.com&period=7d
  -H "Authorization: Bearer {API_KEY}"

# Breakdown po source
GET http://localhost:8000/api/v1/stats/breakdown?site_id=mybonzo.com&property=visit:source
```

## Apache Superset — BI Dashboards

```bash
# UI: http://localhost:8088
# Login: admin/admin (domyślnie)

# API — pobierz charty
GET http://localhost:8088/api/v1/chart/
  -H "Authorization: Bearer {token}"

# Eksport danych z dashboardu
GET http://localhost:8088/api/v1/dashboard/{id}/export
```

## goAccess — Log Analytics

```bash
# UI: http://localhost:7890
# Analizuje logi Nginx/Cloudflare w czasie rzeczywistym
# Kontener czyta logi z /var/log/nginx/

GET http://localhost:4222/podman/containers/goAccess/logs?lines=100
```

## Przykładowe pytania do BUCH (z aktywnym namespace analytics)

```
"Ile unikalnych użytkowników miał mybonzo.com w tym tygodniu?"
"Które strony mybonzo.com mają największy bounce rate?"
"Pokaż top 5 krajów skąd przychodzą użytkownicy"
"Stwórz dashboard Superset z danymi sprzedaży z D1"
"Sprawdź czy kontenery analityczne działają"
```
