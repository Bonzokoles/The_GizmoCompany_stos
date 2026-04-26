# 🧪 Plan Testów — ZENO Browser + 3D Architecture Map

**Data:** 25 kwietnia 2026  
**Wersja:** 1.0  
**Zakres:** Testowanie aplikacji ZENO Browser i nowej wizualizacji 3D

---

## 📋 Spis Testów

### 🎨 A. Testy Wizualizacji 3D (NOWA)
### 🖥️ B. Testy Aplikacji Głównej ZENO Browser
### 🔄 C. Testy Architektury Multi-Layer
### 🔌 D. Testy Komunikacji
### 🧩 E. Testy Integracyjne E2E
### 📊 F. Testy Wydajnościowe

---

## 🎨 A. Testy Wizualizacji 3D

### A1. Test Ładowania Sceny

**Cel:** Sprawdzić czy scena 3D ładuje się poprawnie

**Kroki:**
1. Otwórz http://localhost:3000/mapa_architektury_3d_enhanced.html
2. Sprawdź czy widoczne są:
   - Canvas z renderem Three.js
   - Legenda po lewej stronie (10 grup)
   - Hint po prawej stronie (instrukcje)
   - Tytuł "ZENO Browser — Enhanced 3D Architecture Map"

**Oczekiwany rezultat:**
- ✅ Scena załadowana w <3 sekundy
- ✅ Wszystkie elementy UI widoczne
- ✅ Brak błędów CORS w konsoli

**Warunek sukcesu:** Wszystkie elementy renderują się poprawnie

---

### A2. Test Komponentów (50+ Nodes)

**Cel:** Sprawdzić czy wszystkie komponenty architektury są wyrenderowane

**Kroki:**
1. Zrotuj scenę 360° wokół osi Y
2. Zlicz widoczne kostki 3D
3. Sprawdź czy są pogrupowane według głębokości (z-axis):
   - **Layer 3** (Claude) → tył sceny (z=-100)
   - **Layer 2** (BUCH/Goose) → środek (z=0)
   - **Layer 1** (JIMBO/Pi) → przód-środek (z=+50)
   - **Frontend** → przód (z=+100)

**Oczekiwany rezultat:**
- ✅ 50+ kolorowych kostek widocznych
- ✅ Rozmiary kostek różnią się według typu:
  - Layer 3 agents: 5.0x5.0x5.0
  - Layer 1/2 agents: 4.0x4.0x4.0
  - Main UI/Backend: 3.5x3.5x3.5
  - Communication: 3.2x1.2x3.2 (płaskie)
  - IPC Contracts: 2.0x0.4x2.0 (bardzo płaskie)
- ✅ Komponenty rozłożone przestrzennie (nie nakładają się)

**Warunek sukcesu:** Wszystkie komponenty widoczne i prawidłowo umiejscowione

---

### A3. Test Animacji

**Cel:** Sprawdzić czy animacje działają płynnie

**Kroki:**
1. Obserwuj scenę przez 10 sekund
2. Sprawdź następujące animacje:
   - **Rotacja kostek** (każda oś Y z różną prędkością)
   - **Vertical bobbing** (sinus 1.9 amplitude)
   - **Emissive pulse** (świecenie materiałów)
   - **Wireframe pulse** (opacity 0.18-0.43)
   - **Accent lights pulse** (5 świateł: intensity 2.8 ± 1.6)

**Oczekiwany rezultat:**
- ✅ FPS ≥ 60 (sprawdź DevTools → Performance)
- ✅ Płynne animacje bez jittera
- ✅ CPU usage < 30%

**Warunek sukcesu:** Animacje płynne, brak spadków FPS

---

### A4. Test Interakcji OrbitControls

**Cel:** Sprawdzić czy kamera reaguje na input użytkownika

**Kroki:**
1. **Rotacja:**
   - LPM + przeciągnij → obróć scenę 360°
   - Sprawdź czy rotacja jest płynna
2. **Zoom:**
   - Scroll w górę → zbliż kamerę do komponentów
   - Scroll w dół → oddalaj kamerę
   - Sprawdź limity (minDistance/maxDistance)
3. **Pan:**
   - PPM + przeciągnij → przesuń scenę w lewo/prawo/górę/dół
   - Sprawdź czy grid przesuwa się razem z kamerą

**Oczekiwany rezultat:**
- ✅ Rotacja: smooth, bez opóźnień
- ✅ Zoom: działa w obu kierunkach, nie przechodzi przez obiekty
- ✅ Pan: przesuwa scenę, nie resetuje pozycji

**Warunek sukcesu:** Wszystkie kontrolery działają intuicyjnie

---

### A5. Test Tooltipów (6-Field Display)

**Cel:** Sprawdzić czy hover wyświetla szczegóły komponentów

**Kroki:**
1. Najedź kursorem na **Layer 3 — Claude Super Analityk**
   - Sprawdź czy tooltip pokazuje:
     - Label: "Claude Super Analityk"
     - Type: "layer3_agent"
     - Group: "Layer 3"
     - Purpose: "Hardest tasks..."
     - Location: "src-electron/services/claudeService.ts:45-180"
     - Functions: ["analyzeCode", "generateSolution"]
     - Tech: ["Claude API", "Anthropic SDK"]
2. Najedź na **JIMBOKIT_COMMS/**
   - Sprawdź czy pokazuje:
     - Location: "JIMBOKIT_COMMS/:filesystem"
     - Functions: [".task.json", ".result.json"]
3. Najedź na **BrowserUI**
   - Sprawdź czy pokazuje:
     - Location: "src/BrowserUI.tsx:1-800"
     - Tech: ["React 19", "Electron"]

**Oczekiwany rezultat:**
- ✅ Tooltip pojawia się <200ms po hover
- ✅ Wszystkie 6 pól wyświetlają dane (gdy dostępne)
- ✅ Puste pola są ukryte (display: none)
- ✅ Tooltip podąża za kursorem (nie przysłania komponentu)

**Warunek sukcesu:** Tooltips wyświetlają kompletne dane dla każdego komponentu

---

### A6. Test Hot Links (E2E Flow)

**Cel:** Sprawdzić czy czerwone linie pokazują krytyczny flow

**Kroki:**
1. Znajdź **czerwone linie** (color: #ff2255, opacity: 0.98)
2. Prześledź ścieżkę E2E:
   - **Pi Agent** → **pi-routes** → **pi-bridge** → **JIMBOKIT_COMMS/** → **useJIMBOKitComms** → **BuchChatWidget** → **WebSocket** → **Goose Agent** → **Claude**
3. Porównaj z **niebieskimi liniami** (color: #1e3355, opacity: 0.35)

**Oczekiwany rezultat:**
- ✅ 8 czerwonych linii łączących E2E flow
- ✅ Red links wyraźnie odróżniają się od blue links
- ✅ Hot links tworzą ciągłą ścieżkę (bez luk)

**Warunek sukcesu:** E2E flow wizualnie wyróżniony

---

### A7. Test Efektów Wizualnych

**Cel:** Sprawdzić czy wszystkie efekty renderują się poprawnie

**Kroki:**
1. **Starfield (3 warstwy):**
   - Sprawdź czy widoczne są gwiazdy w tle
   - Zlicz warstwy: 2800 + 6200 + 140 punktów
2. **Grid Floor:**
   - Sprawdź czy siatka 120x120 jest widoczna
   - Kolory: #0a1833 / #1a2844
3. **Scene Fog:**
   - Sprawdź czy obiekty z tyłu są lekko zamazane
   - Fog color: #000814
4. **Accent Lights (5x):**
   - Sprawdź czy widoczne są 5 kolorowych świateł pulsujących

**Oczekiwany rezultat:**
- ✅ Wszystkie efekty widoczne
- ✅ Fog dodaje głębi (tył sceny ciemniejszy)
- ✅ Światła nie oślepiają

**Warunek sukcesu:** Scena estetyczna, efekty dodają immersji

---

### A8. Test Legendy i UI

**Cel:** Sprawdzić czy elementy UI sączytelne

**Kroki:**
1. **Legenda (10 grup):**
   - Sprawdź czy widoczne są kolorowe kwadraty dla każdej grupy
   - Kolory powinny odpowiadać kostkom w scenie
2. **Hint (instrukcje):**
   - Sprawdź czy tekst jest czytelny
   - Polski: "LPM: obracaj", "Scroll: zoom", "PPM: przesuń"
3. **Title:**
   - "ZENO Browser · Enhanced Architecture 3D"

**Oczekiwany rezultat:**
- ✅ Legenda: 10 pozycji z kolorami
- ✅ Hint: czytelny biały tekst
- ✅ Title: widoczny w rogu

**Warunek sukcesu:** UI nie przeszkadza, wszystkie elementy czytelne

---

## 🖥️ B. Testy Aplikacji Głównej ZENO Browser

### B1. Test Uruchomienia Dev Mode

**Cel:** Sprawdzić czy aplikacja Electron startuje poprawnie

**Kroki:**
1. Otwórz terminal w `U:\WWW_Zen_BRo_wser_org3`
2. Uruchom: `npm run dev`
3. Czekaj na komunikat: "Electron started"
4. Sprawdź DevTools → Console (brak błędów)

**Oczekiwany rezultat:**
- ✅ Vite dev server uruchamia się na http://localhost:5173
- ✅ Electron window otwiera się po ~5 sekundach
- ✅ React DevTools wykrywa komponenty
- ✅ Brak czerwonych błędów w konsoli

**Warunek sukcesu:** Aplikacja uruchamia się bez błędów

---

### B2. Test UI Głównych Komponentów

**Cel:** Sprawdzić czy wszystkie główne panele renderują się

**Kroki:**
1. Sprawdź obecność:
   - **AddressBar** (górny panel)
   - **TabBar** (karty przeglądarki)
   - **BrowserUI** (główny widok)
   - **AIPanel** (prawy panel AI)
   - **PluginManager** (panel pluginów)
2. Kliknij każdy panel → sprawdź interakcję

**Oczekiwany rezultat:**
- ✅ Wszystkie panele widoczne
- ✅ Layout responsywny (zmiana rozmiaru okna)
- ✅ Brak artefaktów renderingu

**Warunek sukcesu:** UI kompletny i responsywny

---

### B3. Test Nawigacji (AddressBar)

**Cel:** Sprawdzić czy nawigacja działa

**Kroki:**
1. Wpisz w AddressBar: `https://example.com`
2. Naciśnij Enter
3. Sprawdź czy strona ładuje się w BrowserUI
4. Sprawdź historię (back/forward buttons)

**Oczekiwany rezultat:**
- ✅ URL validuje się poprawnie
- ✅ Strona ładuje się w <3 sekundy
- ✅ Back/forward działają

**Warunek sukcesu:** Nawigacja działa jak w normalnej przeglądarce

---

### B4. Test Kart (TabBar)

**Cel:** Sprawdzić zarządzanie kartami

**Kroki:**
1. Otwórz nową kartę (Ctrl+T lub przycisk +)
2. Otwórz 5 kart z różnymi stronami
3. Przełączaj się między kartami (klik lub Ctrl+Tab)
4. Zamknij kartę (przycisk X lub Ctrl+W)

**Oczekiwany rezultat:**
- ✅ Nowa karta otwiera się <100ms
- ✅ Przełączanie natychmiastowe
- ✅ Zamykanie karty nie crashuje aplikacji
- ✅ Ostatnia karta nie da się zamknąć

**Warunek sukcesu:** Multi-tab działa płynnie

---

## 🔄 C. Testy Architektury Multi-Layer

### C1. Test Layer 1 — JIMBO/Pi (File Operations)

**Cel:** Sprawdzić komunikację JIMBO_kit (BOSS) ↔ Pi Agent (PRACOWNIK)

**Kroki:**
1. Uruchom backend: `cd backend && python -m uvicorn app.main:app --reload --port 3701`
2. Wyślij request do JIMBO:
   ```bash
   curl -X POST http://localhost:3701/api/jimbo/task \
     -H "Content-Type: application/json" \
     -d '{"operation": "list_files", "path": "./"}'
   ```
3. Sprawdź w `JIMBOKIT_COMMS/` czy powstał plik `.task.json`
4. Poczekaj 2 sekundy → sprawdź czy powstał `.result.json`

**Oczekiwany rezultat:**
- ✅ Backend odpowiada 200 OK
- ✅ `.task.json` powstaje z timestamp
- ✅ Pi Agent przetwarza zadanie
- ✅ `.result.json` zawiera listę plików

**Warunek sukcesu:** HTTP Polling działa, file system operations wykonują się

---

### C2. Test Layer 2 — BUCH/Goose (AI Processing)

**Cel:** Sprawdzić komunikację BUCH_CHAT (BOSS) ↔ Goose Agent (PRACOWNIK)

**Kroki:**
1. Uruchom BUCH backend: sprawdź czy port 4224 nasłuchuje
2. Połącz się WebSocketem:
   ```javascript
   const ws = new WebSocket('ws://localhost:4224/ws');
   ws.onopen = () => ws.send(JSON.stringify({
     type: 'ai_task',
     prompt: 'Explain ZENO Browser architecture'
   }));
   ws.onmessage = (e) => console.log('Response:', e.data);
   ```
3. Sprawdź czy BUCH przekazuje do Goose
4. Sprawdź czy response streamuje się z powrotem

**Oczekiwany rezultat:**
- ✅ WebSocket connection established
- ✅ BUCH routuje task do Goose
- ✅ Response streamuje się (chunked)
- ✅ WebSocket nie timeout'uje

**Warunek sukcesu:** WebSocket streaming działa bidirectionally

---

### C3. Test Layer 3 — Claude (Super Analyst)

**Cel:** Sprawdzić eskalację zadań do Claude

**Kroki:**
1. Wyślij bardzo trudne zadanie do BUCH
2. Sprawdź logi BUCH → powinien eskalować do Claude
3. Sprawdź czy `src-electron/services/claudeService.ts` wywołuje się
4. Sprawdź response time

**Oczekiwany rezultat:**
- ✅ BUCH wykrywa trudne zadanie (heurystyka)
- ✅ Eskalacja do Claude następuje
- ✅ ClaudeService wywołuje Anthropic API
- ✅ Response time <10 sekund

**Warunek sukcesu:** Eskalacja działa, Claude odpowiada

---

## 🔌 D. Testy Komunikacji

### D1. Test HTTP Polling (JIMBOKIT_COMMS/)

**Cel:** Sprawdzić mechanizm file-based polling

**Kroki:**
1. Sprawdź czy folder `JIMBOKIT_COMMS/` istnieje
2. Utwórz manualnie: `test_task_123.task.json`
   ```json
   {"id": "123", "operation": "test", "timestamp": 1714000000000}
   ```
3. Sprawdź czy Pi Agent przechwytuje plik (10s timeout)
4. Sprawdź czy powstaje `test_task_123.result.json`

**Oczekiwany rezultat:**
- ✅ Plik `.task.json` znika (Pi przetwarza)
- ✅ Plik `.result.json` powstaje z rezultatem
- ✅ Lifecycle: task → processing → result <10 sekund

**Warunek sukcesu:** File polling działa niezawodnie

---

### D2. Test WebSocket (BUCH ↔ Goose)

**Cel:** Sprawdzić real-time streaming

**Kroki:**
1. Otwórz DevTools → Network → WS
2. Wyślij prompt do AI Panel
3. Sprawdź czy widać connection: `ws://localhost:4224/ws`
4. Sprawdź ramki (frames): request → stream_start → chunk × N → stream_end

**Oczekiwany rezultat:**
- ✅ WebSocket upgrade: 101 Switching Protocols
- ✅ Framki przychodzą co ~100ms (chunked)
- ✅ Brak disconnect podczas streamingu
- ✅ Ping/pong heartbeat działa

**Warunek sukcesu:** WebSocket stabilny, streaming płynny

---

### D3. Test Electron IPC (Renderer ↔ Main)

**Cel:** Sprawdzić komunikację przez IPC contracts

**Kroki:**
1. W React DevTools znajdź komponent używający IPC
2. Wywołaj IPC z renderer process:
   ```typescript
   window.electronAPI.ai.sendPrompt({ prompt: 'Test IPC' });
   ```
3. Sprawdź logi main process (Terminal)
4. Sprawdź czy response wraca do renderer

**Oczekiwany rezultat:**
- ✅ IPC invoke/handle działa
- ✅ ContextBridge nie blokuje
- ✅ Response wraca synchronicznie
- ✅ Brak błędów sandboxingu

**Warunek sukcesu:** IPC działa w obu kierunkach

---

## 🧩 E. Testy Integracyjne E2E

### E1. E2E: User Request → Claude Response

**Cel:** Test pełnej ścieżki użytkownika przez wszystkie 3 layers

**Kroki:**
1. Użytkownik wpisuje prompt w AIPanel: "Explain React 19 hooks"
2. Ścieżka:
   - Frontend → **IPC Contract** → Electron Main
   - Electron Main → **HTTP POST** → Pi Agent (Layer 1)
   - Pi Agent → **pi-routes** → pi-bridge
   - pi-bridge → **JIMBOKIT_COMMS/** (file write)
   - useJIMBOKitComms → **polling** → wykrywa task
   - BuchChatWidget → **WebSocket** → BUCH (Layer 2)
   - BUCH → **escalate** → Claude (Layer 3)
   - Claude → **stream response** → BUCH → WebSocket → Frontend
3. Użytkownik widzi odpowiedź w AIPanel

**Oczekiwany rezultat:**
- ✅ E2E latency: 3-8 sekund
- ✅ Brak error 500/timeout
- ✅ Response streamuje się do UI
- ✅ Wszystkie 3 layers zaangażowane

**Warunek sukcesu:** Pełen flow działa end-to-end

---

### E2. E2E: File Operation Request

**Cel:** Test file operations przez JIMBO/Pi

**Kroki:**
1. Użytkownik: "List files in src/components"
2. Ścieżka:
   - Frontend → IPC → JIMBO
   - JIMBO → JIMBOKIT_COMMS/
   - Pi Agent → file system operation
   - Pi → result.json → useJIMBOKitComms
   - Frontend wyświetla listę plików

**Oczekiwany rezultat:**
- ✅ Latency: <2 sekundy
- ✅ Lista plików poprawna
- ✅ Brak permission errors

**Warunek sukcesu:** File operations działają

---

### E3. E2E: Plugin Loading

**Cel:** Test systemu pluginów

**Kroki:**
1. Otwórz PluginManager
2. Załaduj przykładowy plugin: `example-plugin.js`
3. Sprawdź czy plugin rejestruje się
4. Wywołaj metodę pluginu

**Oczekiwany rezultat:**
- ✅ Plugin ładuje się <1 sekunda
- ✅ Metadata wyświetla się w PluginManager
- ✅ Metody pluginu działają
- ✅ Sandbox izoluje plugin

**Warunek sukcesu:** Plugin system działa, sandbox bezpieczny

---

## 📊 F. Testy Wydajnościowe

### F1. Memory Leak Check

**Cel:** Sprawdzić czy aplikacja nie wycieka pamięci

**Kroki:**
1. Uruchom aplikację
2. Otwórz DevTools → Performance → Memory
3. Take heap snapshot (baseline)
4. Wykonaj 100 operacji (nawigacja, AI prompts, file ops)
5. Take heap snapshot (after)
6. Porównaj: `after - baseline` powinno być <50 MB

**Oczekiwany rezultat:**
- ✅ Memory usage stabilny
- ✅ Brak detached DOM nodes
- ✅ GC wywołuje się regularnie

**Warunek sukcesu:** Brak memory leaks

---

### F2. Rendering Performance (60 FPS)

**Cel:** Sprawdzić czy UI renderuje się płynnie

**Kroki:**
1. Otwórz DevTools → Performance
2. Nagraj 10 sekund: interakcja z 3D mapą + aplikacja
3. Sprawdź FPS chart → powinno być ≥ 60 FPS

**Oczekiwany rezultat:**
- ✅ FPS: 60 (stably)
- ✅ Frame time: <16.67 ms
- ✅ Brak long tasks (>50ms)

**Warunek sukcesu:** 60 FPS maintained

---

### F3. Bundle Size Check

**Cel:** Sprawdzić rozmiar bundle

**Kroki:**
1. Build production: `npm run build`
2. Sprawdź rozmiar: `du -sh dist/`
3. Sprawdź główne chunks: `ls -lh dist/assets/`

**Oczekiwany rezultat:**
- ✅ Total bundle < 5 MB (gzipped)
- ✅ Największy chunk < 1 MB
- ✅ Code splitting działa (wiele chunków)

**Warunek sukcesu:** Bundle zoptymalizowany

---

## 📝 Podsumowanie

### Kategorie Testów

| Kategoria | Liczba Testów | Status |
|-----------|---------------|--------|
| 🎨 Wizualizacja 3D | 8 | 🟡 DO WYKONANIA |
| 🖥️ Aplikacja Główna | 4 | 🟡 DO WYKONANIA |
| 🔄 Architektura Multi-Layer | 3 | 🟡 DO WYKONANIA |
| 🔌 Komunikacja | 3 | 🟡 DO WYKONANIA |
| 🧩 Integracyjne E2E | 3 | 🟡 DO WYKONANIA |
| 📊 Wydajnościowe | 3 | 🟡 DO WYKONANIA |
| **TOTAL** | **24** | **0% DONE** |

---

### Kolejność Wykonania (Priorytet)

1. **🔴 HIGH:** A1, A2, A5, B1, B2 (podstawowe funkcjonalności)
2. **🟡 MEDIUM:** A3, A4, A6, C1, C2, D1, D2, E1 (flow E2E)
3. **🟢 LOW:** A7, A8, C3, D3, E2, E3, F1, F2, F3 (optymalizacje)

---

### Wymagane Serwisy

Aby uruchomić wszystkie testy, potrzebne są:

```bash
# Terminal 1: Vite Dev Server
npm run dev:vite   # Port 5173

# Terminal 2: Electron
npm run dev:electron

# Terminal 3: Backend (JIMBO/BUCH)
cd backend && uvicorn app.main:app --reload --port 3701

# Terminal 4: BUCH WebSocket
python backend/app/buch_routes.py   # Port 4224

# Terminal 5: 3D Map Server
cd WORKSPACE_META_DATA/raporty && npx serve -p 3000

# Terminal 6: Pi Agent (jeśli osobny proces)
cd pi-mono && npm start   # Port 5180
```

---

### Metryki Sukcesu

- ✅ **100% testów A (Wizualizacja 3D)** — kluczowe, nowa funkcjonalność
- ✅ **90% testów B-D** — aplikacja + architektura działają
- ✅ **80% testów E-F** — E2E + wydajność akceptowalna

**Minimalny próg akceptacji:** 85% wszystkich testów PASS

---

## 🚀 Gotowy do Uruchomienia!

**Następne kroki:**
1. ✅ Uruchom wszystkie serwisy (6 terminali)
2. ✅ Wykonaj testy A1-A8 (3D Map)
3. ✅ Wykonaj testy B1-B4 (Aplikacja)
4. ✅ Wykonaj testy C-E (Architektura + E2E)
5. ✅ Raport końcowy → WORKSPACE_META_DATA/raporty/

**Powodzenia! 🎯**
