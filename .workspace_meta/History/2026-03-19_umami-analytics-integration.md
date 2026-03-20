# Umami Analytics Integration — ZENO Browser
priority: high
created: 2026-03-18T18:00:00
completed: 2026-03-19T20:00:00

## Zakres prac

### 1. Badanie i wybór narzędzia Analytics
- Przeanalizowano: Umami, Plausible, PostHog, Ackee, GoAccess, EDA
- **GoAccess** → ODRZUCONY (log-parser, nie dashboard)
- **EDA (Edalitics)** → kompatybilny jako opcjonalny addon (Angular, AGPL-3.0)
- **Umami** → WYBRANY (self-hosted, lekki, privacy-focused, REST API)

### 2. Instalacja kontenerów
- `podman-compose.yml` — dodano 2 serwisy:
  - `zeno-umami` (ghcr.io/umami-software/umami:postgresql-latest, port 5183:3000)
  - `zeno-umami-db` (postgres:16-alpine, volume umami-db-data)
- Image zmieniony z `docker.umami.is` → `ghcr.io` (DNS resolution fix)
- Container runtime: Docker Desktop (`docker-compose.exe`)

### 3. Backend (Electron main process)
- **Nowy plik:** `src-electron/services/umami-service.ts` (~180 lines)
  - UmamiService class z JWT auth, auto-refresh (23h expiry)
  - 10 IPC handlers: status, login, get-websites, get-stats, get-pageviews, get-metrics, get-realtime, get-config, set-config, create-website
  - apiGet() generic authenticated GET
  - createWebsite() POST /api/websites
  - Defaults: http://localhost:5183, Jimbo77, Haos1977
- **Zmodyfikowany:** `src-electron/main.ts` — import + inicjalizacja UmamiService
- **Zmodyfikowany:** `src-electron/preload.ts` — namespace `umami:` z 10 metodami bridge

### 4. Frontend (React)
- **Nowy plik:** `src/components/AnalyticsPanel.tsx` (~430 lines)
  - 4 zakładki: Przegląd, Strony, Źródła, Konfiguracja
  - Panel component (absolute right, 440px, dark theme #0f172a)
  - StatCard (pageviews/visitors/visits/bounces z % change)
  - MetricList (bar chart rows)
  - Canvas chart dla pageviews timeline
  - SettingsTab: konfiguracja URL/user/pass + formularz "Dodaj stronę"
  - Tracking snippet display z dynamicznym baseUrl
- **Zmodyfikowany:** `src/components/BrowserUI.tsx` — lazy import, 📊 toolbar button, ErrorBoundary
- **Zmodyfikowany:** `src/components/SidebarOverlay.tsx` — "📊 Analytics (Umami)" quick link

### 5. Konfiguracja użytkownika
- Port zmieniony: 3001 → 5183
- User `Jimbo77` utworzony (admin role) via Umami REST API
- Hasło admina zmienione na Haos1977
- Login zweryfikowany: JWT token OK

### 6. Formularz Dodawania Stron
- SettingsTab: formularz "➕ Dodaj stronę" (nazwa + domena)
- IPC handler `umami:create-website` → POST /api/websites
- Preload bridge: `createWebsite(name, domain)`

## Pliki utworzone
- `src-electron/services/umami-service.ts`
- `src/components/AnalyticsPanel.tsx`

## Pliki zmodyfikowane
- `podman-compose.yml`
- `src-electron/main.ts`
- `src-electron/preload.ts`
- `src/components/BrowserUI.tsx`
- `src/components/SidebarOverlay.tsx`

## Status: ✅ KOMPLETNE
- TypeScript: 0 errors
- Kontenery: running (umami + umami-db)
- Heartbeat: OK na port 5183
- Panel: renderuje poprawnie w ZENO Browser
- Dodawanie stron: działa przez panel
