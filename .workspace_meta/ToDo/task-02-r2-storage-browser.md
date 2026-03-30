# TASK-02 — R2 Storage Browser w AI-hub
> **Agent:** `context-architect` | **Priorytet:** 🔴 WYSOKI | **Status:** TODO

## Cel
Przeglądarka R2 bucketów dostępna z AI-hub i zenonbrowsers.org.
Użytkownik klika bucket → widzi listę plików → klika plik → otwiera/pobiera.

## Znane buckety (z CF API — 16 sztuk)
```
bonzo-media-hub, jimbo77-community-images, jimbo77com-assets,
my-project-opennext-cache, mybonzo-ai-models, mybonzo-analytics,
mybonzo-backups, mybonzo-blog-content, mybonzo-finanse, mybonzo-media,
mybonzo-storage, mybonzo-videos, pumo-raw-data, vibesdk-templates,
zen-blog-images, zen-static-assets
```

## Backend — potrzebny Worker
Nowy Cloudflare Worker `zeno-r2-browser` (lub rozszerzenie `zeno-mcp`):
```
GET /api/r2/list                    → lista wszystkich bucketów
GET /api/r2/{bucket}/list           → lista obiektów w buckecie
GET /api/r2/{bucket}/get/{key}      → pobierz/otwórz plik
```
Worker musi mieć R2 bucket bindings dla każdego bucketu.

## Frontend — ai-hub/js/modules/storage.js
```javascript
export function initStorage() {
  // Tab "🗄 STORAGE" w nawigacji
  // Panel z listą bucketów (karty)
  // Kliknięcie → listObjects(bucketName)
  // Lista plików: ikona, nazwa, rozmiar, data, przycisk Otwórz
  // Breadcrumb: STORAGE > bucket-name > folder/
  // Wyszukiwarka w buckecie
}
```

## UI w ai-hub/index.html
- Dodaj tab `🗄 STORAGE` obok istniejących
- `<div id="storage-tab" class="tab-content hidden">`
- Import `initStorage` w `js/main.js`

## Ikony per typ pliku
| Rozszerzenie | Ikona |
|---|---|
| .mp4, .mov, .avi | 🎬 |
| .jpg, .png, .gif, .webp | 🖼 |
| .pdf | 📄 |
| .json, .js, .ts | 📝 |
| .zip, .tar, .gz | 📦 |
| folder/ | 📁 |
| inne | 📄 |

## Priorytet bucketów do pokazania
1. `bonzo-media-hub` — filmy (powiązany z Media Hub)
2. `zen-static-assets` + `zen-blog-images` — ZENO assety
3. `mybonzo-media` + `mybonzo-videos` — media
4. Pozostałe po rozwinięciu "Pokaż wszystkie"

## Uwaga bezpieczeństwa
- Worker musi walidować bucket name (whitelist z hardkodowanej listy)
- Brak możliwości write/delete przez UI (read-only)
- Opcjonalnie: Basic Auth lub sprawdzanie nagłówka X-API-Key
