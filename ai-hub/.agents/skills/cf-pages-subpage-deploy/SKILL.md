---
name: cf-pages-subpage-deploy
description: Użyj, gdy trzeba wdrożyć podstronę na Cloudflare Pages (np. /ai-hub, /BONZO_media_HUB), ustawić kopiowanie katalogów do dist i zweryfikować publiczne URL-e po deployu.
---

# CF Pages Subpage Deploy

## Kiedy używać

- Gdy aplikacja ma działać jako podstrona (`/ai-hub/`, `/BONZO_media_HUB/`)
- Gdy po deployu pojawiają się 404 na podstronach statycznych
- Gdy pipeline CI/CD nie kopiuje katalogów pomocniczych do `dist/`

## Checklist

1. Zidentyfikuj katalogi podstron do publikacji (np. `ai-hub/`, `BONZO_media_HUB/`).
2. Dodaj kopiowanie katalogów do artefaktu deploy (`dist/`).
3. Upewnij się, że workflow CI/CD robi to samo, co lokalny skrypt deploy.
4. Wdróż do Pages i sprawdź kody HTTP (200) dla docelowych URL.
5. Zaktualizuj linki w UI, jeśli wcześniej wskazywały niedziałający endpoint.

## Minimalny standard jakości

- Zero hardcodowanych niedziałających URL-i (`workers.dev`/stare domeny)
- Te same kroki copy w `package.json` i w `.github/workflows/deploy-web.yml`
- Potwierdzona dostępność URL po deployu

## Typowe pułapki

- Build działa lokalnie, ale brak podstrony na produkcji (nie skopiowano katalogu do `dist`)
- Linki w UI wskazują stary host
- Workflow CI pomija zmiany, bo brakuje ścieżki w `on.push.paths`
