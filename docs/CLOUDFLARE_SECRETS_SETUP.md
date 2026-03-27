# Cloudflare secrets i bindingi — ZENO Browser

## GitHub Actions

Do workflowu `deploy-web.yml` wymagane są tylko te sekrety repozytorium:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

Służą wyłącznie do autoryzacji CLI `wrangler` w CI.

## Cloudflare Pages / dashboard runtime

Sekrety runtime ustawiaj w projekcie Pages `zeno-browser-web` w:
`Workers & Pages -> zeno-browser-web -> Settings -> Variables and Secrets`

### Najczęściej używane sekrety runtime

- `OPENROUTER_API_KEY`
- `DEEPSEEK_API_KEY`
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `GEMINI_API_KEY`
- `TOGETHER_API_KEY`
- `PERPLEXITY_API_KEY`
- `TMDB_API_KEY`
- `TMDB_READ_TOKEN`
- `ADMIN_TOKEN`
- `WEBGATE_SECRET`
- `UMAMI_SITE_ID`

## Bindingi produkcyjne zadeklarowane w `wrangler.toml`

- `DB` — D1
- `STATIC_ASSETS` — R2
- `AI` — Workers AI
- `AGENT_TASKS_QUEUE`
- `IMAGE_GEN_QUEUE`
- `IMAGE_PROC_QUEUE`
- `VOICE_QUEUE`

## Endpointy wymagające tokenów zarządzających Cloudflare

Poniższe endpointy nadal korzystają z Cloudflare Management API i wymagają:

- `CF_API_TOKEN`
- `CF_ACCOUNT_ID`

Dotyczy to głównie funkcji administracyjnych / cross-resource:

- `/api/storage/*`
- `/api/db/*`
- `/api/crawlers/history`
- `/api/render/*`
- część fallbacków w `/api/images/*`

## Lokalny workflow

### Dla aplikacji lokalnej

Używaj `.env`.

### Dla `wrangler pages dev`

Używaj `.dev.vars`.

### Synchronizacja z `.workspace_meta/secrets/api-keys.md`

Skrypt:

- `scripts/sync-env.ps1`

Generuje:

- `.env` — szerszy zestaw kluczy dla lokalnych narzędzi
- `.dev.vars` — zawężony zestaw sekretów runtime dla Cloudflare Pages Functions

To ogranicza przypadkowe ładowanie nadmiarowych sekretów do lokalnego runtime Workers.
