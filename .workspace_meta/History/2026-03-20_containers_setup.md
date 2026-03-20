# Podman Containers Setup — Websurfx, sist2, Full Stack
priority: high
created: 2026-03-20T10:00:00
completed: 2026-03-20T18:00:00

## Resolution Notes

Skonfigurowano i uruchomiono 6 kontenerów Podman dla ZENO Browser. SearXNG zastąpiono websurfx, dodano sist2 jako file indexer.

## Działające kontenery

| Kontener | Obraz | Port zewnętrzny | Opis |
|---|---|---|---|
| zeno-umami-db | postgres:16-alpine | wewnętrzny (5432) | Baza danych Umami |
| zeno-umami | umami:postgresql-latest | localhost:5183 | Analytics |
| zeno-searxng-redis | valkey:8-alpine | wewnętrzny (6379) | Cache Redis (websurfx + ogólny) |
| zeno-meilisearch | meilisearch:v1.12 | localhost:7700 | Wyszukiwarka historii + autouzupełnianie |
| zeno-websurfx | neonmmd/websurfx:latest | localhost:8888 | Meta wyszukiwarka (DuckDuckGo, Brave, Wikipedia) |
| zeno-sist2 | sist2app/sist2:x64-linux | localhost:8085 (admin), 4090 | Indeksowanie archiwów / dokumentów |

## Sieć
- **zeno-net** — bridge network łącząca websurfx z Redis cache
- `podman-compose` NIE działa (named pipe issue z docker-compose.exe) — kontenery uruchamiane bezpośrednio

## Komendy uruchomienia (direct podman run)

### Umami DB
```bash
podman run -d --name zeno-umami-db \
  -e POSTGRES_DB=umami -e POSTGRES_USER=umami -e POSTGRES_PASSWORD=umami \
  -v umami-db-data:/var/lib/postgresql/data \
  --restart unless-stopped \
  docker.io/library/postgres:16-alpine
```

### Umami
```bash
podman run -d --name zeno-umami \
  -p 5183:3000 \
  -e DATABASE_URL=postgresql://umami:umami@zeno-umami-db:5432/umami \
  -e DISABLE_TELEMETRY=1 \
  --restart unless-stopped \
  ghcr.io/umami-software/umami:postgresql-latest
```

### Redis (Valkey)
```bash
podman run -d --name zeno-searxng-redis \
  --network zeno-net \
  -v searxng-redis-data:/data \
  --restart unless-stopped \
  docker.io/valkey/valkey:8-alpine \
  valkey-server --save 30 1 --loglevel warning
```

### Meilisearch
```bash
podman run -d --name zeno-meilisearch \
  -p 7700:7700 \
  -e MEILI_ENV=development -e MEILI_NO_ANALYTICS=true \
  -e MEILI_MASTER_KEY=zeno-meili-master-2026 \
  -v meilisearch-data:/meili_data \
  --restart unless-stopped \
  docker.io/getmeili/meilisearch:v1.12
```

### Websurfx
```bash
podman run -d --name zeno-websurfx \
  --network zeno-net \
  -p 8888:8080 \
  -v U:/WWW_Zen_BRo_wser_org3/config/websurfx:/etc/xdg/websurfx:Z \
  docker.io/neonmmd/websurfx:latest
```
- Wymaga pliku `config/websurfx/config.lua` (binding_ip=0.0.0.0, port=8080)
- Musi być na sieci `zeno-net` razem z Redis
- Obraz jest distroless (brak shella)

### sist2
```bash
podman run -d --name zeno-sist2 \
  -p 4090:4090 -p 8085:8080 \
  -e SIST2_ADMIN=1 \
  --entrypoint python3 \
  docker.io/sist2app/sist2:x64-linux \
  /root/sist2-admin/sist2_admin/app.py
```
- Entrypoint musi być `python3` (nie domyślny sist2 binary)
- Admin UI na porcie 8085 (wewnętrznie 8080)

## Rozwiązane problemy
1. **SearXNG** — permanentne crashe (Permission denied) → zastąpiony websurfx
2. **websurfx crash (Exit 139)** — brak config.lua → podmontowano z repo `config/websurfx/config.lua`
3. **websurfx wisząc na Redis** — brak sieci → utworzono `zeno-net` bridge
4. **sist2 crash (Exit 255)** — zły entrypoint → zmieniono `--entrypoint python3`
5. **Podman Desktop nie widzi kontenerów** — restart `podman machine stop/start` naprawia

## Electron Service Integration
- `src-electron/services/websurfx-service.ts` — WebsurfxService (port 8888)
- `src-electron/services/sist2-service.ts` — Sist2Service (port 4090/8085)
- `src-electron/services/meilisearch-service.ts` — MeilisearchService (port 7700)
- IPC handlery w `src-electron/main.ts`
- Preload bridge w `src-electron/preload.ts`
- Typy w `src/types/electron.d.ts`
