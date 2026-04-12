// Skill: mybonzo-stack
// Namespace: mybonzo
// Stack technologiczny mybonzo.com — Astro 5 SSR + CF Pages + D1 + R2
// Tags: astro, cloudflare, architecture, mybonzo

# mybonzo.com — ZENON Biznes HUB

## Stack
- **Frontend**: Astro 5 SSR + React 18 + Tailwind CSS 3
- **Deploy**: Cloudflare Pages → wrangler pages deploy dist --project-name=mybonzo-new
- **Repo**: github.com/Bonzokoles/luc-de-zen-on (branch: main)

## Cloudflare Bindings
- D1: `mybonzo` (database_id: 84f0f3cb-7778-4cc4-a6ba-e823ef52f1f3)
- R2: `mybonzo-finanse` (dokumenty finansowe)
- Workers AI: Gemma/Llama/Mistral (fallback)

## AI Providers
- Primary: OpenAI gpt-4o
- Fallback 1: Google Gemini 2.0 Flash
- Fallback 2: CF Workers AI (llama-3.1-8b, gemma-7b, mistral-7b)

## Dev
- Port: 4321 (astro dev)
- SSR env: `locals.runtime?.env?.KEY` (NIE process.env)
- Secrets: npx wrangler pages secret put NAZWA --project-name mybonzo-new

## Deploy
```bash
npm run deploy   # astro build + git push → CF auto-deploy
```
