# ZENO na Cloudflare

## Cel
Przygotować i zweryfikować wdrożenie `ZENO Browser` na Cloudflare Pages.

## Wynik
Zadanie ukończone 2026-03-27.

## Zmiany
- zweryfikowano autoryzację `wrangler` i istnienie projektu `zeno-browser-web`
- wykonano lokalny deploy na Cloudflare Pages
- poprawiono `wrangler.toml`, dodając brakujący binding `[[env.production.r2_buckets]]`
- potwierdzono publiczną dostępność deployment preview i domeny `https://zenbrowsers.org`

## Zmodyfikowane pliki
- `wrangler.toml`
- `.workspace_meta/notes/project-notes.md`

## Weryfikacja
- `npm run build:web` ✅
- `wrangler pages deploy dist --project-name=zeno-browser-web --branch=main` ✅
- HTTP 200 dla preview URL i `zenbrowsers.org` ✅
