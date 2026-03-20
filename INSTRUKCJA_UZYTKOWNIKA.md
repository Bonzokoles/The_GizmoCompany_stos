# ZENO Browser — Instrukcja Użytkownika

## Czym jest ZENO Browser?

ZENO Browser to przeglądarka internetowa oparta na Electron z wbudowanymi narzędziami AI, systemem wtyczek, terminalem i monitoringiem bezpieczeństwa.

---

## Uruchomienie

### Szybki start (BAT)

Uruchom plik `start_zeno.bat` z katalogu projektu — automatycznie skompiluje i wystartuje aplikację.

### Ręczne uruchomienie

```bash
npm run dev
```

Aplikacja uruchomi się na `http://localhost:5173` (Vite) i otworzy okno Electron.

---

## Interfejs — Elementy

### Pasek nawigacji

| Przycisk | Funkcja |
|----------|---------|
| `←` | Wstecz |
| `→` | Dalej |
| `⟳` | Odśwież stronę |
| `+` | Nowa karta |

### Pasek adresu

- Wpisz **adres URL** (np. `google.com`) — automatycznie doda `https://`
- Wpisz **tekst** (np. `pogoda Warszawa`) — wyszuka w Google
- `Enter` zatwierdza nawigację

### Karty (TabBar)

- Kliknij kartę, aby się na nią przełączyć
- `×` zamyka kartę (ostatnia karta się resetuje zamiast zamykać)

---

## Panele boczne

Wszystkie panele otwierasz/zamykasz przyciskami w prawej części nagłówka:

### 🤖 Asystent AI

Panel czatu z AI. Obsługiwane modele:

- **Gemini** — API Google
- **OpenRouter** — 8+ modeli (GPT, Claude, Mistral i inne)

Konfiguracja:

1. Otwórz panel AI (🤖)
2. Dodaj klucz API w ustawieniach
3. Zacznij rozmowę

### 🔒 Monitor Bezpieczeństwa

Analiza bezpieczeństwa odwiedzanych stron:

- Status HTTPS/SSL
- Wykrywanie zagrożeń
- Statystyki sieciowe

### 🌐 Cloudflare Tunnel

Tunel Cloudflare do udostępniania lokalnych usług:

1. Pobierz token z [dash.cloudflare.com](https://dash.cloudflare.com/)
2. Ustaw w pliku `.env.local`: `CF_TUNNEL_TOKEN=twój_token`
3. Zarządzaj tunelem z panelu

### 🔌 Hub Wtyczek (PluginHub)

Marketplace wtyczek ZENO:

- Przeglądaj dostępne wtyczki
- Instaluj jednym kliknięciem
- Zarządzaj zainstalowanymi wtyczkami

### 🛠 Narzędzia (ToolsPanel)

Panel z zakładkami:

- **Network** — statystyki sieci, połączenia, konfiguracja proxy
- **Crawler** — web scraping i ekstrakcja danych
- **Workflow** — automatyzacja zadań

### 🧠 AI Gateway

Zaawansowane zarządzanie modelami AI:

- Podgląd dostępnych modeli
- Konfiguracja endpointów
- Statystyki użycia

### ⌨ Terminal

Wbudowany terminal do interakcji z systemem i lokalnym AI.

---

## MCP Server (Model Context Protocol)

ZENO ma wbudowany serwer MCP z 17 narzędziami:

| Narzędzie | Opis |
|-----------|------|
| `browser_navigate` | Nawigacja do URL |
| `browser_new_tab` | Otwórz nową kartę |
| `browser_close_tab` | Zamknij kartę |
| `browser_get_tabs` | Lista otwartych kart |
| `browser_go_back` | Cofnij |
| `browser_go_forward` | Dalej |
| `browser_screenshot` | Zrzut ekranu strony |
| `web_search` | Wyszukiwanie w sieci |
| `site_search` | Wyszukiwanie w obrębie strony |
| `extract_links` | Ekstrakcja linków ze strony |
| `extract_text` | Ekstrakcja tekstu |
| `extract_table` | Ekstrakcja tabel |
| `extract_metadata` | Metadane strony |
| `wait` | Oczekiwanie |
| `click_element` | Kliknięcie elementu |
| `type_text` | Wpisanie tekstu |
| `execute_script` | Wykonanie JavaScriptu |

MCP pozwala na sterowanie przeglądarką z poziomu zewnętrznych agentów AI.

---

## Strona Startowa

Przy otwieraniu nowej karty wyświetla się strona startowa z:

- Polem wyszukiwania
- Skrótami do popularnych stron

---

## Skróty klawiszowe

| Skrót | Akcja |
|-------|-------|
| `Enter` (w pasku adresu) | Nawiguj / Szukaj |

---

## Konfiguracja

### Plik `.env.local`

Utwórz plik `.env.local` w katalogu głównym projektu:

```env
# Klucze API
VITE_GEMINI_API_KEY=twój_klucz_gemini
VITE_OPENROUTER_API_KEY=twój_klucz_openrouter

# Cloudflare Tunnel (opcjonalnie)
CF_TUNNEL_TOKEN=twój_token_cloudflare
```

### Konteneryzacja (opcjonalnie)

ZENO obsługuje lokalne modele AI przez Podman/Docker:

```bash
# Uruchom kontenery z modelami AI
docker-compose up -d
```

Dostępne kontenery:

- **Gemma 2B** (port 11434) — lekki model Google
- **Phi Nano 0.5B** (port 11435) — ultra-lekki model Microsoft

---

## Budowanie

```bash
# Pełny build
npm run build

# Instalatory
npm run dist           # wszystkie platformy
```

---

## Rozwiązywanie problemów

| Problem | Rozwiązanie |
|---------|-------------|
| Port 5173 zajęty | Zamknij inne procesy Vite lub zmień port |
| Błędy GPU process | Normalne ostrzeżenia Chromium — ignoruj |
| API nie działa | Sprawdź klucze w `.env.local` |
| Pusta strona | Odśwież (`⟳`) lub otwórz nową kartę (`+`) |
