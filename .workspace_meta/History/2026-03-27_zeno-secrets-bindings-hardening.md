# ZENO — secrets, bindings i .env hardening

## Cel
Uporządkować CI/secrets dla Cloudflare Pages i GitHub Actions, zweryfikować bindingi produkcyjne Functions oraz usprawnić lokalny workflow `.env`.

## Wynik
Zadanie ukończone 2026-03-27.

## Zmiany
- dodano walidację `wrangler check` do workflowu `.github/workflows/deploy-web.yml`
- rozbudowano `scripts/sync-env.ps1`, aby generował zarówno `.env`, jak i `.dev.vars`
- rozszerzono `.gitignore` o `.dev.vars` i `.dev.vars.*`
- dodano pliki `.env.example` oraz `.dev.vars.example`
- dodano dokument `docs/CLOUDFLARE_SECRETS_SETUP.md` opisujący rozdział CI secrets, runtime secrets i bindingów
- poprawiono `functions/api/images/[[path]].ts`, aby preferował binding `AI` i `STATIC_ASSETS`, zostawiając Management API jako fallback
- zaktualizowano notatki projektowe o wynik hardeningu

## Zmodyfikowane pliki
- `.gitignore`
- `.github/workflows/deploy-web.yml`
- `scripts/sync-env.ps1`
- `functions/api/images/[[path]].ts`
- `.workspace_meta/notes/project-notes.md`
- `.env.example`
- `.dev.vars.example`
- `docs/CLOUDFLARE_SECRETS_SETUP.md`

## Weryfikacja
- `get_errors` dla zmienionych plików ✅
- `npm run build:web` ✅
- binding-first flow dla `/api/images/*` potwierdzony w kodzie ✅
