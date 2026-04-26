# Integracja: ZENO Suffix Protocol + JIMBOKIT_COMMS

## Status: ✅ ZINTEGROWANE (2026-04-26)

System ZENO Suffix Protocol został zintegrowany z refactoringiem JIMBOKIT_COMMS (FAZA 0-3).

---

## Co się zmieniło?

### PRZED (tylko ZENO):
```
JIMBOKIT_COMMS/
├── sales_00.csv        ← surowe
├── sales_02.json       ← przetworzone
├── sales_04.json       ← UI ready
└── result_*.md         ← markdown wyniki
```

### PO (ZENO + JSON Schema):
```
JIMBOKIT_COMMS/
├── tasks/
│   └── {uuid}.task.json       ← JSON Schema zadanie
├── results/
│   └── {uuid}.result.json     ← JSON Schema wynik
├── data/                       ← 🆕 NOWE!
│   ├── sales_02.json          ← Tabularis Ready
│   ├── sales_04.json          ← UI Package
│   └── README.md              ← Dokumentacja protokołu
└── schemas/
    ├── task.schema.json
    └── result.schema.json
```

---

## Przepływ End-to-End

### 1. User Request → Pi Agent
```
Bonzo: "Przeanalizuj sprzedaż Q1"
```

### 2. Pi Agent → Creates Task
**Plik:** `JIMBOKIT_COMMS/tasks/550e8400-e29b-41d4-a716-446655440000.task.json`

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "type": "data_analysis",
  "source": "pi",
  "priority": "high",
  "payload": {
    "instruction": "Analyze Q1 sales data",
    "input_file": "data/sales_q1_02.json",
    "output_file": "data/sales_q1_04.json",
    "role": "Wnioskujący",
    "workflow": "ZENO_SUPER_ANALYST"
  },
  "timestamp": "2026-04-26T04:30:00Z"
}
```

**Validation:** ✅ JSON Schema (ajv)  
**API:** `POST http://localhost:4224/jimbokit-comms/task`

### 3. PiBridge → Reads Task
```typescript
// JIMBO_agent_HUB/core/pi-bridge.ts
const task = await receiveTask(taskId);
// task zawiera: input_file = "data/sales_q1_02.json"
```

### 4. AGENT_PI → Processes Data

**Input:** `JIMBOKIT_COMMS/data/sales_q1_02.json` (Tabularis Ready)

**Agent wykonuje:**
1. Odczytuje plik z sufiksem `_02` → wie że to Tabularis
2. Używa `sqlite_query` lub JSON parser
3. Wyciąga insights (bestsellers, dead stock)
4. Tworzy `dashboard_hints` dla Goose'a

**Output:** `JIMBOKIT_COMMS/data/sales_q1_04.json` (UI Package)

### 5. AGENT_PI → Returns Result
**Plik:** `JIMBOKIT_COMMS/results/550e8400-e29b-41d4-a716-446655440000.result.json`

```json
{
  "taskId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "result": {
    "output_file": "data/sales_q1_04.json",
    "insights_generated": 5,
    "bestsellers": ["Lampa LED Smart", "Krzesło Dębowe"],
    "dead_stock": ["Fotel Gaming RGB"],
    "dashboard_ready": true
  },
  "timestamp": "2026-04-26T04:35:00Z"
}
```

**Validation:** ✅ JSON Schema (ajv)  
**API:** `POST http://localhost:4224/jimbokit-comms/result`

### 6. Goose (Layer 2) → Renders UI

**Trigger:** Wykrywa plik `sales_q1_04.json` w `data/`

**Reads:** Sekcja `dashboard_hints` z pliku:
```json
{
  "dashboard_hints": {
    "layout_type": "ecommerce_alert_dashboard",
    "widgets": [
      {"type": "bar_chart", "x": "nazwa", "y": "marza_procent"},
      {"type": "action_card", "urgency": "high", "text": "..."}
    ]
  }
}
```

**Output:** Dashboard HTML renderowany w ZENO Browser

### 7. User → Sees Results
```
Bonzo widzi w przeglądarce:
- Wykres słupkowy marży
- Karty akcji (red alert dla Fotela Gaming)
- KPI summary
- Rekomendacje biznesowe
```

---

## Kluczowe Komponenty

| Komponent | Rola | Input | Output |
|-----------|------|-------|--------|
| **Pi Agent** | Orkiestrator | User request | `tasks/{uuid}.task.json` |
| **HUB API** | Validator | Task JSON | Validated task w `tasks/` |
| **PiBridge** | Bridge | Task z `tasks/` | Task dla AGENT_PI |
| **AGENT_PI** | Worker | `data/*_02.json` | `data/*_04.json` |
| **PiBridge** | Bridge | Result od AGENT_PI | `results/{uuid}.result.json` |
| **Goose** | UI Renderer | `data/*_04.json` | Dashboard HTML |

---

## Sufiksy jako Sygnały

| Agent widzi | Wie że | Używa narzędzi |
|-------------|--------|----------------|
| `*_00.csv` | Surowe | `CAY_FEED_conventer` |
| `*_01.json` | Duże (>10MB) | `I_Do_INDexer` |
| `*_02.json` | **Tabularis Ready** | `sqlite_query` |
| `*_04.json` | **UI Package** | Render dashboard |
| `*_ERR.json` | Error | Debug skill |

**Zero halucynacji** — nazwa pliku = deterministyczna akcja!

---

## Przykłady

### Demo 1: Gotowe pliki
```bash
# Zobacz przykładowe pliki:
cat JIMBOKIT_COMMS/data/demo_sales_02.json  # Tabularis
cat JIMBOKIT_COMMS/data/demo_sales_04.json  # UI Package
```

### Demo 2: Testowy workflow
```bash
# 1. Skopiuj demo_sales_02.json jako nowy plik:
cp JIMBOKIT_COMMS/data/demo_sales_02.json \
   JIMBOKIT_COMMS/data/test_run_02.json

# 2. Utwórz task przez HUB API:
curl -X POST http://localhost:4224/jimbokit-comms/task \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test-001",
    "type": "data_analysis",
    "source": "manual_test",
    "priority": "medium",
    "payload": {
      "instruction": "Analyze test_run_02.json",
      "input_file": "data/test_run_02.json",
      "output_file": "data/test_run_04.json",
      "role": "Wnioskujący"
    },
    "timestamp": "2026-04-26T05:00:00Z"
  }'

# 3. Sprawdź tasks/:
ls -la JIMBOKIT_COMMS/tasks/

# 4. (AGENT_PI wykonuje pracę...)

# 5. Sprawdź results/:
ls -la JIMBOKIT_COMMS/results/

# 6. Zobacz output:
cat JIMBOKIT_COMMS/data/test_run_04.json
```

---

## Testowanie

### Test 1: Validator
```bash
cd JIMBO_agent_HUB/core
npx tsx comms-validator.test.ts
# ✅ 7/7 testów
```

### Test 2: Integracja (HUB + PiBridge)
```bash
cd JIMBO_agent_HUB
npx tsx test-faza2-integration.ts
# ✅ 6/6 testów
```

### Test 3: ZENO Suffix (manual)
1. Uruchom ZENO Browser
2. Otwórz Agent Workspace Panel
3. Wyślij zadanie: "Analyze demo_sales_02.json"
4. Sprawdź `data/` folder — powinien być `*_04.json`

---

## Troubleshooting

### Problem: "Task not found"
**Przyczyna:** Plik w złym folderze  
**Fix:** Upewnij się że task jest w `tasks/`, nie w root

### Problem: "Validation failed"
**Przyczyna:** JSON nie pasuje do schema  
**Fix:** Sprawdź `schemas/task.schema.json`, upewnij się że wszystkie required fields są

### Problem: "No _04 file generated"
**Przyczyna:** Agent nie rozpoznał sufiksu `_02`  
**Fix:** Sprawdź czy `input_file` w payload ma dokładnie `_02` w nazwie

### Problem: "Dashboard not rendering"
**Przyczyna:** Brak sekcji `dashboard_hints` w pliku `_04`  
**Fix:** Sprawdź czy plik `*_04.json` ma klucz `dashboard_hints`

---

## Dokumentacja

| Plik | Zawartość |
|------|-----------|
| `data/README.md` | Protokół ZENO Suffix |
| `IMPLEMENTACJA_PODSUMOWANIE.md` | FAZA 0-3 + ZENO |
| `PLAN_WDROZENIA.md` | Plan 13h (5 faz) |
| `WORKSPACE_META_DATA/.../SUPER_ANALITYK_e_comerce/` | Pełny workflow |

---

## FAQ

**Q: Czy mogę używać obu systemów jednocześnie?**  
A: Tak! Możesz mieć zarówno zwykłe zadania JSON Schema jak i ZENO workflow z sufiksami.

**Q: Czy muszę używać wszystkich sufiksów (_00 → _05)?**  
A: Nie. Możesz pominąć kroki. Minimum to: `_02` (Tabularis) → `_04` (UI Package).

**Q: Co jeśli agent nie rozpozna sufiksu?**  
A: Fallback: traktuje jako zwykły JSON i używa instrukcji z `payload.instruction`.

**Q: Jak debugować?**  
A: Sprawdź logi HUB: `logs/hub-*.log` i logi Pi: `.pi/logs/`.

---

**Status:** 🟢 Gotowe do użycia  
**Data:** 2026-04-26  
**Compatibility:** JIMBOKIT_COMMS FAZA 0-3 ✅  
**Next:** Testuj z prawdziwymi danymi!
