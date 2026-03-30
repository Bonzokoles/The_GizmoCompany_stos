---
name: cf-pages-routing-domains
description: Użyj, gdy trzeba skonfigurować routing i domeny dla Cloudflare Pages/Workers (workers.dev, pages.dev, custom domain, fallback i trasy podstron).
---

# CF Pages Routing & Domains

## Kiedy używać

- Gdy podstrony działają na `pages.dev`, ale nie działają na domenie produkcyjnej
- Gdy endpoint `workers.dev` zwraca 404 i trzeba przepiąć ruch na Pages/custom domain
- Gdy trzeba uporządkować route/fallback dla `/ai-hub/`, `/BONZO_media_HUB/` i podobnych ścieżek

## Checklist

1. Sprawdź status HTTP dla `workers.dev`, `pages.dev` i custom domain.
2. Ustal jeden docelowy URL produkcyjny dla UI.
3. Zsynchronizuj linki w aplikacji (HTML, JS data, konfiguracje).
4. Zweryfikuj, że route istnieje i ma poprawne mapowanie w Cloudflare.
5. Potwierdź działanie po deployu (minimum HEAD/GET = 200).

## Dobre praktyki

- Nie mieszaj hostów produkcyjnych (unikaj miksu workers.dev + pages.dev w UI)
- Trzymaj jeden source of truth URL per feature
- Dokumentuj finalny route w notatkach repo

## Najczęstsze problemy

- Brak route dla Workera (`No active routes`)
- Skopiowany build nie zawiera katalogu podstrony
- Linki w panelu wskazują stary host po migracji
