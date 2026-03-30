# ZENO Browser  Notatki Projektu

> **Ostatnia aktualizacja:** 2026-03-27
> **Typ:** Electron Desktop Browser z AI
> **Stack:** TypeScript, React 18, Electron 27, Vite 5, Zustand, Jest, Playwright

---

## Opis projektu

**ZENO Browser** to przeglądarka internetowa oparta na Electron z wbudowanym panelem AI, systemem pluginów, monitorem bezpieczeństwa i wsparciem Cloudflare Tunnel.

### Kluczowe komponenty

| Komponent | Lokalizacja | Opis |
| ----------- | ------------- | ------ |
| BrowserUI | src/components/BrowserUI.tsx | Główny interfejs przeglądarki |
| AddressBar | src/components/AddressBar.tsx | Pasek adresu |
| TabBar | src/components/TabBar.tsx | System zakładek |
| AIPanel | src/components/AIPanel.tsx | Panel AI (Gemini, OpenRouter, Claude) |
| PluginManager | src/components/PluginManager.tsx | ~~Zarządzanie pluginami~~ → zastąpiony przez PluginHub |
| **PluginHub** | src/components/PluginHub.tsx | **Centrum Wtyczek** (konsolidacja 3 komponentów) |
| SecurityMonitor | src/components/SecurityMonitor.tsx | Monitor bezpieczeństwa |
| CloudflareTunnel | src/components/CloudflareTunnelPanel.tsx | Cloudflare Tunnel |
| Electron Main | src-electron/main.ts | Główny proces Electron |
| AI Gateway | src-electron/services/ai-gateway-service.ts | Service routingu AI |
| Browser Manager | src-electron/services/browser-manager.ts | Zarządzanie oknami |
| Plugin System | src/plugin-system/ | Core engine + marketplace |

### Modele AI

**API (główna praca):**

- Gemini  działający
- OpenRouter  8 modeli, działający
- Claude  planowany

**Kontenery (terminal support only):**

- Gemma 2B  port 11434
- Phi Nano 0.5B  port 11435

### Konteneryzacja

- Podman v5.7.1 (zamiast Docker)
- docker-compose.yml  produkcja (port 3000) + dev (port 5173)
- podman-compose.yml  alternatywna konfiguracja

### Web Dashboard (zenbrowsers.org)

- **11 tabów:** Overview, Workers, Content, Analytics, Pipelines, Crawlers, Storage, Databases, Images, MOA, Render
- **14 API Workers:** webgate, ai, search, sites, workers, content, analytics, storage, db, moa, images, crawlers, pipelines, render
- **Pipelines (LinkedOut-style):** Event Source → CF Worker → D1 → R2 Data Catalog (Iceberg) → R2 SQL
  - 7 pipeline configs: page-analytics, worker-metrics, content-pipeline, crawler-events, ecommerce-events, ai-usage, search-events
- **Weft AI Board:** Osobna instancja na `weft.mybonzo.com` (docs: `docs/WEFT_SETUP.md`)

---

## Odkrycia

### 2026-03-20: Migracja React 19

- **Nowe pliki:** `src/types/electron.d.ts`, `src/components/ErrorBoundary.tsx`, `src/components/PluginHub.tsx`, `src/components/PluginHub.css`
- **Zmodyfikowane:** AddressBar, AIPanel, TabBar, SecurityMonitor, CloudflareTunnelPanel, BrowserUI, UpdateNotification
- **Security fixes:** CR-006 (sanitizeUrl w AddressBar), CR-009 (typed API), CR-015 (useRef dla interwałów), CR-017 (inline confirm zamiast `confirm()`), CR-024 (ARIA), CR-027 (usunięto unused state)
- **Do usunięcia:** PluginManager.tsx, PluginExplorer.tsx, PluginInstaller.tsx (zastąpione PluginHub)
- **Remaining critical:** CR-001 (URL validation w main process), CR-003 (eval() w plugin-loader), CR-005 (brak CSP)
- **Problem:** Brak `@types/react` w devDeps — wpływa na typowanie (pre-existing)
- **Problem:** tsconfig targets ES5 — niezgodne z React 19 patterns

---

## Znane problemy

<!-- Dodawaj znane problemy poniżej -->
