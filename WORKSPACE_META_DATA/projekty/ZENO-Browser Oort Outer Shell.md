# ZENO-Browser Oort Outer Shell: Architektura i warstwy przeglądarki przyszłości

## Wstęp

ZENO-Browser, znany w środowisku jako Oort Outer Shell, to koncepcyjna architektura przeglądarki zbudowana wokół trzech zasadniczych warstw: interfejsu użytkownika (Shell), warstwy preload (dostęp do domenowych API bezpośrednich) oraz głównego procesu aplikacji, który koordynuje całą ekosystemową orkiestrę. Celem tej architektury jest zapewnienie elastyczności, izolacji komponentów, wysokiej wydajności i silnych zabezpieczeń, jednocześnie umożliwiając łatwe rozszerzanie funkcjonalności przez modułowe API oraz agentów. W artykule podsumuję zebrane informacje z dostępnych plików konfiguracyjnych i dokumentów, a następnie przedstawię szczegółowy opis warstw, omówię aspekty bezpieczeństwa i wydajności, a także zaproponuję plany na przyszłe kierunki rozwoju i praktyczne zastosowania (np. testy, prototypy, grafiki promocyjne).

## 1) Ogólne spojrzenie na architekturę ZENO-Browser

ZENO-Browser opisuje system z warstwowym podziałem funkcjonalności, co ma zapewnić odseparowanie logiki prezentacyjnej od logiki biznesowej i od warstw niskopoziomowych. W praktyce architektura rozkłada się na trzy kluczowe warstwy:

- Warstwa interfejsu użytkownika (Shell)
- Warstwa Preload Split (moduły domenowe i dostęp do API)
- Warstwa Głównego Procesu (Main Process) z mechanizmami IPC i bezpieczeństwem

W dokumentacji odnalezionej w repozytorium ZENO wskazują one na konkretne pliki i lokalizacje, które z kolei tworzą spójną całość ekosystemu:

- Warstwa UI (Shell): BrowserShellLayout.tsx, WorkspaceHost.tsx, PanelGroups, PanelFallback, BrowserUI, AppFolderPanel; motyw Deep Dark. Kluczową rolą jest opakowanie UI, zarządzanie закладками i organizacja paneli oraz wyglądu aplikacji.
- Warstwa Preload Split: moduły domenowe – browser-api.ts, ai-api.ts, agent-hub-api.ts, network-api.ts, search-api.ts, catalog-api.ts, system-api.ts, plugin-api.ts; oraz src-electron/preload.ts, który pełni rolę cienkiego agregatora i wystawia API w kontekście renderowanego środowiska za pomocą contextBridge.
- Warstwa Głównego Procesu (Main Process): main.ts jako orkiestrator; moduły app/ (load-env.ts, create-window.ts, service-container.ts, start-jimbo-hub.ts) i ipc/ (rejestracja różnych API), z zachowaniem wymogów bezpieczeństwa (nodeIntegration: false, contextIsolation: true, sandbox, CSP, uprawnienia). W dokumentacji podkreślono także, że GPU fix został utrzymany (app.disableHardwareAcceleration()).

## 2) Szczegółowy opis Warstwy Interfejsu Użytkownika (Shell)

Najważniejszym elementem Warstwy UI jest układ, który tworzy warstwę prezentacyjną i jednocześnie pozostawia miejsce na integracje z predefiniowanymi modułami. Kluczowe komponenty:

- BrowserShellLayout.tsx: pełni rolę głównego wrappera interfejsu, łączącego treść z bocznym paskiem (sidebar) i slotem statusu. Nie zawiera logiki IPC ani bezpośrednich odwołań do Electron/Node, co oznacza, że jest silnie zorientowany na warstwę widoku i strukturę DOM.
- WorkspaceHost.tsx: host zakładek i workspace’u, przechowuje lokalny stan aktywnej zakładki i ewentualny callback do zmiany aktywnej zakładki.
- PanelGroups: zdefiniowane stałe grup paneli – PRIMARY, SECONDARY, OVERLAY – które pomagają w organizacji interfejsu i zarządzaniu rozmieszczeniem elementów UI.
- PanelFallback.tsx: prosty komponent wyświetlany jako fallback w razie błędów paneli (panelId, error, onRetry).
- BrowserUI.tsx: komponent właściwy renderujący UI przeglądarki; BrowserShellLayout został opakowany przez ten komponent jako zewnętrzny wrapper, co wskazuje na separację logiki UI od logiki shellowej.
- PANEL_REGISTRY: mechanizm rejestrujący i zarządzający panelami, kluczowy dla możliwości dynamicznego dodawania zakładek i paneli.
- AppFolderPanel i Deep Dark: AppFolderPanel jako panel eksploratora katalogów, z ciemnym motywem (Deep Dark) z nową paletą i efektami (dot-grid, vignette, glow). To wzmacnia wizualną spójność i użyteczność.

Z perspektywy architektury, Shell odpowiada za UX, a nie za logikę biznesową. IPC i logika pozostają w warstwie preload/main process.

## 3) Szczegóły Warstwy Preload Split

Warstwa Preload Split rozbija monolityczną warstwę preload na moduły domenowe, aby zapewnić lepszą separację odpowiedzialności:

- browser-api.ts: API dla interakcji przeglądarkowych, zasadniczo obsługujące czynności pod kątem UI i przeglądarki.
- ai-api.ts: API dla modułów sztucznej inteligencji, asocjowanych z MOA/instancji analitycznych lub asystentów.
- agent-hub-api.ts: API koordynujące agentów, zarządzanie agent hubem i ich aktywnością.
- network-api.ts: API odpowiedzialne za operacje sieciowe, zarządzanie połączeniami i zapytaniami, a także zabezpieczenia komunikacyjne.
- search-api.ts: API wyszukiwania (lokalne/online) oraz integracje z RAG.
- catalog-api.ts: API katalogów i zasobów.
- system-api.ts: API systemowe – zarządzanie środowiskiem i zasobami.
- plugin-api.ts: API pluginów, które mogą rozszerzać funkcjonalność aplikacji.

Src-electron/preload.ts działa jako cienki agregator, który importuje moduły domenowe i wystawia w głównym świecie kontekst z exposure, z użyciem konwencji contextBridge. Komunikacja IPC w całej architekturze opiera się о stałe CH (Channel) i invoke, co pozwala na jasno zdefiniowaną wymianę danych między rendererem a procesem głównym.

## 4) Warstwa Głównego Procesu (Main Process)

Główne procesy to orkiestrator, który koordynuje całym środowiskiem:

- main.ts: centralny plik koordynujący procesy i cykle życia aplikacji. Jego rola to delegowanie odpowiedzialności do modułów w app/ i ipc/.

- app/:
  - load-env.ts: ładowanie zmiennych środowiskowych i konfiguracji.
  - create-window.ts: tworzenie okna aplikacji, konfiguracja okna z bezpiecznymi ustawieniami (np. nodeIntegration: false, contextIsolation: true, sandbox, CSP).
  - service-container.ts: kontener usług, które są inicjowane i zarządzane przez system.
  - start-jimbo-hub.ts: uruchamianie hubu JIMBO, który może pełnić rolę orkiestratora zadań i integracji agentów.

- ipc/: zestaw rejestrów IPC, które umożliwiają komunikację między rendererem a main process:
  - register-browser.ts
  - register-ai.ts
  - register-network.ts
  - register-workflow.ts
  - register-crawler.ts
  - register-terminal.ts
  - register-mcp.ts
  - register-search.ts
  - register-hub.ts
  - register-window.ts
  - register-dialog.ts
  - register-plugin.ts
  - index.ts (registerAllIpc)

- Wymogi bezpieczeństwa:
  - NodeIntegration wyłączone, ContextIsolation włączone, Sandbox włączony, CSP, uprawnienia – wszystkie te elementy mają na celu ograniczenie potencjalnych zagrożeń.
- GPU fix: pozostaje na poziomie głównym, co oznacza, że akceleracja sprzętowa została wyłączona na starcie, a potem zarządzana zgodnie z politykami systemu.

## 5) Bezpieczeństwo i zgodność z CSP

W architekturze ZENO-Browser bezpieczeństwo odgrywa kluczową rolę i to odzwierciedlają decyzje projektowe:

- nodeIntegration: false – renderer nie ma bezpośredniego dostępu do Node.js, co ogranicza możliwość wykonywania operacji systemowych w kontekście przeglądarki.
- contextIsolation: true – zapewnia odseparowanie kontekstu renderera od kontekstu globalnego, co utrudnia ataki typu cross-site scripting.
- sandbox: true – ogranicza środowisko wykonania renderera i unika bezpiecznych operacji w stylu untrusted code.
- CSP (Content Security Policy): polityka ograniczająca możliwość wstrzykiwania niebezpiecznych zasobów i wykonywalnych treści.
- Permissions: mechanizmy żądań uprawnień i ich kontrola, aby minimalizować możliwość wykorzystania nieuprawnionych zasobów.

## 6) Wydajność i optymalizacje

W dokumentacji pojawiają się dwie kluczowe optymalizacje, które mają wpływ na wydajność przeglądarki:

- Remux (przekonwertowanie kontenerów i strumieni na bardziej kompatybilne/efektywne pod kątem odtwarzania w przeglądarkach). W projekcie pojawiły się prace nad optymalizacją remuxingu, co jest szczególnie ważne dla MKV i złożonych zestawów kontenerów.
- Client-side capability detection (detekcja zdolności klienta po stronie użytkownika). Ta funkcja jest planowana jako krok w przyszłości, który umożliwi dynamiczne dopasowywanie kodeków i kontenerów na podstawie możliwości przeglądarki użytkownika.

Dla praktycznych zastosowań, implementacja opiera się na wykorzystywanych warstwach i modułach, które umożliwiają dynamiczne podejście do optymalizacji i adaptacji w czasie rzeczywistym. W realnym środowisku detekcja możliwości przeglądarki (canPlayType, MSE) mogłaby być wykorzystana do wyboru najlepszego strumienia (np. Direct Play, Remux, transkodowanie).

## 7) Przyszłe kierunki rozwoju

- Runtime capability detection: dynamiczne wykrywanie możliwości przeglądarki i dopasowywanie ścieżki dostarczania kontentu (bezpośrednie odtwarzanie vs. remux vs. transkodowanie).
- Inteligentne warstwy strumieniowania: adaptacyjne podejście do kodeków i kontenerów w zależności od możliwości użytkownika.
- Dalsza optymalizacja modułów preload i IPC: usprawnienie komunikacji między warstwami i minimalizacja narzutów.
- Bezpieczeństwo i audyt: jeszcze silniejsze mechanizmy ograniczające i audyty bezpieczeństwa w czasie rzeczywistym.

## 8) Testy i case studies

- Testy kompatybilności przeglądarek: sprawdzić, które formaty i kodeki są obsługiwane przez różne przeglądarki (H.264, VP9, AV1, AAC, Opus, Vorbis) i jakie kontenery (MP4, WebM, MKV) są akceptowalne. W dokumencie BROWSER_COMPATIBILITY.md wskazano, że MKV nie jest wspierany do bezpośredniego strumieniowania w 2025 roku, a Safari HEVC ma ograniczone wsparcie.
- Testy bezpieczeństwa: weryfikacja polityk CSP i ograniczeń (nodeIntegration, contextIsolation, sandbox) w kontekście uruchamiania różnych modułów IPC.
- Testy wydajności: pomiar czasów ładowania, opóźnień IPC, czasu startu hubu MOA (jeśli byłyby zastosowania) i potencjalnych korzyści z optymalizacji remux.

## 9) Słownik terminów

- ZENO: architektura memory i moduły, z których czerpie architekturę.
- BrowserShellLayout: wrapper UI dla Shell, który prowadzi layout aplikacji.
- AppFolderPanel: UI panel eksploratora folderów w trybie ciemnym (Deep Dark).
- Deep Dark: ciemny motyw interfejsu z nową paletą kolorów i efektami wizualnymi.
- Preload Split: podział warstwy preload na wiele modułów domenowych, każdy z własnym API.
- CH: kanały IPC używane do komunikacji między preload, rendererem i main process.
- CSP: Content Security Policy – polityka bezpieczeństwa treści.

## 10) Propozycje grafik i prompty (4–5)

- Diagram architektury ZENO-Browser: trzy warstwy Shell, Preload, Main z wyraźnym przebiegiem IPC i contextBridge.
- Zawiązanie motywu Deep Dark i AppFolderPanel w UI.
- Schemat modułów Preload: browser-api.ts, ai-api.ts, agent-hub-api.ts, network-api.ts, itp.
- Diagram bezpieczeństwa: CSP, wyłączone nodeIntegration, contextIsolation i sandbox.
- Grafika koncepcyjna „Oort Outer Shell” jako futurystyczny interfejs przeglądarkowy.

## 11) Prywatność danych i architektura warstw analizy

Kluczową zasadą architektury ZENO-Browser jest pełna lokalność przetwarzania danych:

- **Żadne dane nie opuszczają lokalnego komputera.** Wszelkie surowe dane — pliki, zapytania, zasoby systemowe, dane użytkownika — są przetwarzane wyłącznie na urządzeniu lokalnym.
- **Warstwa pierwsza (Preload / IPC)** analizuje surowe dane w izolowanym kontekście lokalnym. Żadne wrażliwe dane źródłowe nie są przekazywane dalej ani na zewnątrz.
- **Warstwa druga (Main Process / Agenci)** otrzymuje wyłącznie wyniki analizy z warstwy pierwszej — nie przetwarza bezpośrednio wrażliwych danych wejściowych.
- **Żadne wrażliwe dane firmy** nie opuszczają systemu lokalnego ani nie są wysyłane do zewnętrznych usług.
- **Nasze narzędzia umożliwiają zapytanie o cokolwiek** — użytkownik może pytać o dowolne informacje, a odpowiedzi są generowane lokalnie na podstawie lokalnych danych i lokalnych modeli.
- **Wyniki są przekazywane do kolejnych warstw** — każda warstwa przetwarza tylko wyniki poprzedniej, zachowując zasadę minimalnych uprawnień i pełnej lokalności danych.

Ta zasada gwarantuje, że ZENO-Browser może być używany w środowiskach biznesowych bez ryzyka wycieku danych firmowych poza infrastrukturę lokalną.

## 12) Narzedzia Warstwy 1 -- przeglad wszystkich modulow

Warstwa 1 (Lokalny Agent MCP) dysponuje 14 modulami narzędziowymi. Każde narzędzie działa wyłącznie lokalnie — żadne surowe dane nie są wysyłane poza komputer.

### 1. fs-tools -- system plikow

Operacje na lokalnym systemie plików: fffs_read_file, fffs_list_dir, fffs_search_files, fffs_file_info, fffs_write_file. Agent może przeszukiwać i analizować pliki projektów bezpośrednio na dysku.

### 2. web-search-tools -- przeszukiwanie internetu

Narzędzie web_search (via Tavily API) oraz zestaw Firecrawl do scrapowania stron. Jedyne narzędzie komunikujące się z zewnętrzem — wyłącznie w celu pobierania publicznych danych.

### 3. rag-tools -- lokalna baza wiedzy

kb_search, kb_categories, kb_libraries — zapytania do lokalnej bazy ChromaDB. Wektorowe wyszukiwanie semantyczne po własnych dokumentach bez wysyłania treści na zewnątrz.

### 4. sys-tools -- informacje o systemie

sys_info, proc_list, proc_find — dane o systemie operacyjnym, listowanie i wyszukiwanie procesów.

### 5. net-tools -- siec lokalna

nnnet_ports, nnnet_kill_port, nnnet_dns_flush, nnnet_wifi_info, nnnet_connections — diagnostyka sieci, zarządzanie portami, informacje o połączeniach.

### 6. git-tools -- kontrola wersji

git_status, git_log, git_diff, git_branches — analiza repozytoriów Git bez konieczności wychodzenia poza terminal.

### 7. data-tools -- analiza danych

csv_preview, csv_query, data_stats, json_analyze — podgląd i zapytania do plików CSV/JSON, statystyki lokalne.

### 8. sqlite-tools -- bazy SQLite

sqlite_query, sqlite_tables, sqlite_schema, sqlite_info, sqlite_open_gui — pełen dostęp do lokalnych baz SQLite, możliwość otwierania GUI.

### 9. pipeline-tools -- pipeline danych

pipeline_status, fffile_send_to_buch, fffile_send_to_mybonzo, fffile_prepare — zarządzanie przepływem danych między komponentami systemu ZENO.

### 10. podman-tools -- kontenery

podman_list, podman_logs, podman_stats, podman_inspect — monitorowanie i diagnostyka kontenerów Podman uruchomionych lokalnie.

### 11. analytics-tools -- analityka biznesowa

Odczyt z lokalnej bazy danych klienta, synchronizacja wyłącznie zagregowanych (anonimowych) wyników do Cloudflare D1. Surowe dane nigdy nie opuszczają urządzenia.

### 12. jupyter-tools -- notatniki Jupyter

jupyter_run, jupyter_execute, jupyter_list — uruchamianie i zarządzanie notatnikami Jupyter na lokalnym serwerze.

### 13. feed-tools -- przetwarzanie feedow

fffeed_convert, fffeed_split, fffeed_fetch, fffeed_xml_analyze, fffeed_to_sqlite, fffeed_clean, fffeed_insights — pobieranie, parsowanie i analiza feedów XML/RSS, konwersja do SQLite.

### 14. db-moa-tools -- pipeline MOA

moa_db_read, moa_db_clean, moa_db_write, moa_db_pipeline — trójstopniowy pipeline MOA (Mixture of Agents): agregacja wyników, czyszczenie, zapis do bazy wynikowej.

## 13) Plan publikacji i zrodla

- Publikacja artykułu w CMS-ie bloga z włączonymi grafikami.
- Źródła wewnętrzne opisane w repo (BROWSER_COMPATIBILITY.md, zeno-architecture.md) oraz odniesienia do dokumentów opartych o architekturę ZENO.
- Wersje promocyjne grafik w sekcji „Grafiki” z linkami do generatora obrazów.

## Podsumowanie

Na podstawie zebranych materiałów z repozytorium i dokumentów dotyczących ZENO-Browser, powstał obszerny artykuł opisujący architekturę i warstwy Oort Outer Shell. Przedstawione sekcje obejmują warstwę interfejsu użytkownika (Shell), warstwę preload oraz warstwę głównego procesu, a także kwestie bezpieczeństwa, wydajności i przyszłych kierunków rozwoju. Do artykułu dołączono także propozycje grafik i prompty do generatorów obrazów.
