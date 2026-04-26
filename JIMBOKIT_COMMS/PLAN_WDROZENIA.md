# JIMBOKIT_COMMS - Plan Wdrożenia

**Cel:** Ujednolicić komunikację JIMBO_KIT ↔ AGENT_PI przez JIMBOKIT_COMMS bez psujia UI

**Status:** 70% architektury już pasuje, 30% wymaga uporządkowania

---

## FAZA 0: STRUKTURA FOLDERÓW (1 godzina)

### Task 0.1: Stwórz strukturę katalogów
**Priorytet:** P0  
**Czas:** 15 min  
**Ryzyko:** Brak (tylko tworzenie folderów)

```
JIMBOKIT_COMMS/
├── README.md              # Już istnieje
├── PLAN_WDROZENIA.md      # Ten plik
├── tasks/                 # Zadania dla AGENT_PI (wejście)
│   └── .gitkeep
├── results/               # Wyniki od AGENT_PI (wyjście)
│   └── .gitkeep
├── archive/               # Wykonane taski (opcjonalne, na przyszłość)
│   └── .gitkeep
└── schemas/               # Schematy JSON (dokumentacja)
    ├── task.schema.json
    └── result.schema.json
```

**Akcja:**
- Stwórz foldery: `tasks/`, `results/`, `archive/`, `schemas/`
- Dodaj `.gitkeep` do każdego
- Nie ruszaj istniejących plików

---

## FAZA 1: KONTRAKT JSON (2 godziny)

### Task 1.1: Zdefiniuj schemat task.json
**Priorytet:** P0  
**Czas:** 30 min  
**Ryzyko:** Brak

**Schemat `schemas/task.schema.json`:**
```json
{
  "id": "uuid",
  "type": "data_cleanup | analysis | document_processing | ...",
  "source": "jimbo_kit | agent_pi | buch_chat",
  "priority": "low | medium | high",
  "payload": {
    "instruction": "string - co ma zrobić AGENT_PI",
    "files": ["ścieżki do plików wejściowych"],
    "context": "dodatkowy kontekst dla zadania"
  },
  "timestamp": "ISO 8601"
}
```

### Task 1.2: Zdefiniuj schemat result.json
**Priorytet:** P0  
**Czas:** 30 min  
**Ryzyko:** Brak

**Schemat `schemas/result.schema.json`:**
```json
{
  "taskId": "uuid zadania",
  "status": "completed | failed | processing",
  "result": {
    "summary": "krótkie podsumowanie",
    "files": ["ścieżki do plików wyjściowych"],
    "data": "główny wynik (obiekt lub string)"
  },
  "error": "jeśli status=failed",
  "timestamp": "ISO 8601"
}
```

### Task 1.3: Napisz helper do walidacji
**Priorytet:** P1  
**Czas:** 1 godz  
**Ryzyko:** Niskie

**Plik:** `JIMBO_agent_HUB/core/comms-validator.ts`
- Waliduje czy JSON pasuje do schematu
- Zwraca błędy jeśli nie pasuje
- Używany przez HUB przed zapisem/odczytem

---

## FAZA 2: KOMPATYBILNOŚĆ WSTECZNA (3 godziny)

### Task 2.1: Rozszerz HUB endpointy
**Priorytet:** P0  
**Czas:** 1.5 godz  
**Ryzyko:** Średnie (nie ruszamy starego kodu, tylko dodajemy nowy)

**Modyfikacje w `hub-server.ts`:**

1. **GET `/jimbokit-comms/pending`** - NIE RUSZAMY, działa z korzenia
2. **Dodaj nowy:** GET `/jimbokit-comms/tasks` - czyta z `tasks/`
3. **POST `/jimbokit-comms/result`** - zapisuje do `results/`
4. **POST `/jimbokit-comms/task`** - zapisuje do `tasks/` (nowy)

**Kompatybilność:**
- Stare `/pending` nadal czyta wszystkie `*.task.json` z root
- Nowe `/tasks` czyta tylko z `tasks/`
- Oba działają równolegle przez 2 tygodnie
- Potem stopniowo wyłączamy stary endpoint

### Task 2.2: Aktualizuj PiBridge
**Priorytet:** P0  
**Czas:** 1 godz  
**Ryzyko:** Niskie (tylko ścieżki)

**Zmiany w `pi-bridge.ts`:**
```typescript
// Było:
const taskPath = path.join(JIMBOKIT_COMMS_PATH, `${task.id}.task.json`);
// Będzie:
const taskPath = path.join(JIMBOKIT_COMMS_PATH, 'tasks', `${task.id}.task.json`);

// Było:
const resultPath = path.join(JIMBOKIT_COMMS_PATH, `${taskId}.result.json`);
// Będzie:
const resultPath = path.join(JIMBOKIT_COMMS_PATH, 'results', `${taskId}.result.json`);
```

**Dodaj fallback:**
- Jeśli nie ma w `tasks/`, sprawdź root (kompatybilność wsteczna)
- Przez pierwsze 2 tygodnie obsługuj obie lokalizacje

### Task 2.3: Test integracyjny
**Priorytet:** P0  
**Czas:** 30 min  
**Ryzyko:** Brak

**Akcja:**
1. Napisz task do `tasks/test-001.task.json`
2. PiBridge powinien go odczytać
3. Napisz result do `results/test-001.result.json`
4. HUB powinien go odebrać
5. Sprawdź czy UI widzi pending task

---

## FAZA 3: STOPNIOWA MIGRACJA UI (4 godziny)

### Task 3.1: Nowy helper dla AgentWorkspacePanel
**Priorytet:** P1  
**Czas:** 2 godz  
**Ryzyko:** Średnie (ale nie ruszamy starego kodu)

**Plik:** `src/utils/comms-helper.ts`

**Funkcje:**
```typescript
// Nowy sposób - przez HUB API
export async function writeTaskViaHub(task: CommsTask): Promise<string>
export async function writeTaskViaElectron(task: CommsTask): Promise<string>

// Kompatybilność
export async function writeTask(task: CommsTask, method: 'hub' | 'electron' = 'hub')
```

**Zalety:**
- AgentWorkspacePanel nie musi się zmieniać od razu
- Możemy testować oba sposoby
- Stopniowo przełączamy z `electron` na `hub`

### Task 3.2: Feature flag w AgentWorkspacePanel
**Priorytet:** P1  
**Czas:** 1 godz  
**Ryzyko:** Niskie

**Dodaj w komponencie:**
```typescript
const USE_HUB_API = true; // Feature flag - łatwo wyłączyć jeśli coś nie działa

const writeToComms = useCallback(async (agentName: string, content: string) => {
  if (USE_HUB_API) {
    // Nowy sposób przez HUB
    await writeTaskViaHub({ ... });
  } else {
    // Stary sposób przez Electron file API
    await window.electronAPI?.file?.write(...);
  }
}, []);
```

**Zalety:**
- Jeśli coś nie działa, zmień flagę na `false`
- Nie tracisz 3 dni na debugowanie
- Łatwy rollback

### Task 3.3: Test z UI
**Priorytet:** P1  
**Czas:** 1 godz  
**Ryzyko:** Niskie

**Akcja:**
1. Uruchom aplikację Electron
2. Otwórz AgentWorkspacePanel
3. Zapisz zadanie przez przycisk "JIMBOKIT_COMMS"
4. Sprawdź czy plik pojawia się w `tasks/`
5. Sprawdź czy HUB widzi pending task
6. Jeśli NIE działa → zmień flagę na `false`, użyj starego sposobu

---

## FAZA 4: INTEGRACJA JIMBO_KIT (2 godziny)

### Task 4.1: JIMBO_KIT jako router
**Priorytet:** P2  
**Czas:** 2 godz  
**Ryzyko:** Średnie

**Obecnie:** JIMBO_KIT nie wie o AGENT_PI  
**Docelowo:** JIMBO_KIT zarządza delegacją do AGENT_PI

**Nowy endpoint w JIMbo_kit/server.ts:**
```typescript
// POST /delegate-to-pi
app.post('/delegate-to-pi', async (req, res) => {
  const { instruction, files, priority } = req.body;
  
  // 1. Stwórz task
  const task = {
    id: uuid(),
    type: 'data_processing',
    source: 'jimbo_kit',
    priority: priority || 'medium',
    payload: { instruction, files },
    timestamp: new Date().toISOString()
  };
  
  // 2. Zapisz do HUB
  await fetch('http://localhost:4224/jimbokit-comms/task', {
    method: 'POST',
    body: JSON.stringify(task)
  });
  
  // 3. Zwróć taskId
  res.json({ taskId: task.id, status: 'queued' });
});
```

**NIE RUSZAMY:**
- Obecnych narzędzi JIMBO_KIT
- Innych endpointów
- UI paneli

---

## FAZA 5: CZYSZCZENIE I DOKUMENTACJA (1 godzina)

### Task 5.1: Dokumentacja
**Priorytet:** P2  
**Czas:** 30 min

**Aktualizuj `JIMBOKIT_COMMS/README.md`:**
- Opisz nową strukturę folderów
- Dodaj przykłady task.json i result.json
- Dodaj diagram przepływu

### Task 5.2: Cleanup po 2 tygodniach
**Priorytet:** P3  
**Czas:** 30 min

**Gdy wszystko działa:**
- Usuń stare endpointy kompatybilności wstecznej
- Usuń feature flagi
- Usuń fallbacki do root folder

---

## RYZYKA I MITYGACJE

| Ryzyko | Prawdopodobieństwo | Mitygacja |
|--------|-------------------|-----------|
| UI przestaje działać | Średnie | Feature flagi + rollback w 1 linijkę |
| Nowy format nie działa | Niskie | Kompatybilność wsteczna przez 2 tygodnie |
| HUB nie widzi tasków | Niskie | Testuj po każdym kroku, nie rób wszystkiego naraz |
| AGENT_PI nie odbiera | Średnie | Fallback do starej ścieżki przez 2 tygodnie |

---

## TIMELINE

| Faza | Czas | Kumulatywnie |
|------|------|--------------|
| FAZA 0: Struktura | 1h | 1h |
| FAZA 1: Kontrakt JSON | 2h | 3h |
| FAZA 2: Kompatybilność | 3h | 6h |
| FAZA 3: Migracja UI | 4h | 10h |
| FAZA 4: JIMBO_KIT | 2h | 12h |
| FAZA 5: Cleanup | 1h | 13h |

**Łącznie:** 13 godzin pracy, rozłożone na 3-4 dni robocze

---

## KOLEJNOŚĆ WYKONANIA (BEZPIECZNA)

**Dzień 1 (4h):**
- FAZA 0: Struktura folderów
- FAZA 1: Kontrakt JSON
- FAZA 2: Task 2.1 (rozszerz HUB)

**Dzień 2 (4h):**
- FAZA 2: Task 2.2-2.3 (PiBridge + test)
- FAZA 3: Task 3.1 (helper)

**Dzień 3 (3h):**
- FAZA 3: Task 3.2-3.3 (feature flag + test UI)
- Jeśli działa → kontynuuj
- Jeśli NIE działa → rollback, debug, popraw

**Dzień 4 (2h):**
- FAZA 4: JIMBO_KIT router (tylko jeśli Dzień 3 poszedł OK)
- FAZA 5: Dokumentacja

---

## CHECKLISTY PO KAŻDYM KROKU

### Po FAZY 0:
- [ ] Foldery istnieją
- [ ] `.gitkeep` w każdym folderze
- [ ] Git commit: "feat: JIMBOKIT_COMMS folder structure"

### Po FAZY 1:
- [ ] Schematy JSON napisane
- [ ] Validator działa
- [ ] Testy validatora przechodzą
- [ ] Git commit: "feat: JIMBOKIT_COMMS JSON schemas"

### Po FAZY 2:
- [ ] HUB endpointy działają
- [ ] PiBridge zapisuje do `tasks/`
- [ ] Test integracyjny przechodzi
- [ ] Stare endpointy NADAL działają
- [ ] Git commit: "feat: JIMBOKIT_COMMS backward compat"

### Po FAZY 3:
- [ ] Helper działa
- [ ] Feature flag włączony
- [ ] UI zapisuje przez HUB
- [ ] Można wyłączyć flagę i wrócić do starego
- [ ] Git commit: "feat: JIMBOKIT_COMMS UI migration"

### Po FAZY 4:
- [ ] JIMBO_KIT ma endpoint `/delegate-to-pi`
- [ ] Endpoint działa z curl/Postman
- [ ] Task pojawia się w `tasks/`
- [ ] Git commit: "feat: JIMBO_KIT Pi delegation"

### Po FAZY 5:
- [ ] README zaktualizowany
- [ ] Dokumentacja kompletna
- [ ] Wszystko działa stabilnie przez 2 tygodnie
- [ ] Git commit: "docs: JIMBOKIT_COMMS final documentation"

---

## ZASADY BEZPIECZEŃSTWA

1. **NIE USUWAJ** starych plików i endpointów od razu
2. **ZAWSZE** rób git commit po każdej fazie
3. **TESTUJ** po każdym task, nie zostawiaj testów na koniec
4. **ROLLBACK** jest łatwy przez feature flagi
5. **JEŚLI** coś nie działa, ZATRZYMAJ SIĘ i debuguj, nie idź dalej
6. **NIE RUSZAJ** UI, które działa dobrze
7. **DODAWAJ** nowe, nie zamieniaj stare

---

## KRYTERIA SUKCESU

✅ JIMBOKIT_COMMS ma strukturę folderów  
✅ Format JSON jest jednolity  
✅ UI AgentWorkspacePanel działa bez zmian  
✅ PiBridge zapisuje do `tasks/` i czyta z `results/`  
✅ HUB widzi pending tasks  
✅ Można łatwo rollback jeśli coś nie działa  
✅ JIMBO_KIT może delegować do AGENT_PI  
✅ Stara funkcjonalność nadal działa  
✅ Nie tracisz 3 dni na naprawianie  

---

**Następny krok:** Zacznij od FAZY 0 - stworzenie struktury folderów (15 minut pracy, zero ryzyka)
