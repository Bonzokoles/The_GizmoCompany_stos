# JIMBOKIT_COMMS/data/ — ZENO Suffix Protocol

## Przeznaczenie

Folder dla plików danych używających **Protokołu Sufiksów ZENO** — deterministycznego systemu handoff między agentami.

---

## Protokół Sufiksów

| Sufiks | Stan | Odpowiedzialny | Narzędzia |
|--------|------|---------------|-----------|
| `_00.csv/json` | Surowe dane | ETL Prep | `CAY_FEED_conventer` |
| `_01.json` | Duże dane (>10MB) | Pi Agent | `I_Do_INDexer` |
| `_02.json` | **Tabularis Ready** | Analityk (Czytający) | `sqlite_query` |
| `_03.json` | Insights extracted | Analityk (Wnioskujący) | Cognitive analysis |
| `_04.json` | **UI Package** | Goose (Layer 2) | Dashboard render |
| `_05.json` | Raport końcowy | Pi Agent | Business report |
| `_ERR.json` | Error state | Debug Skill | Log parser |

---

## Przepływ Typowy (E-commerce Analysis)

```
1. sprzedaz_00.csv     ← User upload
   ↓ (ETL Prep Agent)
2. sprzedaz_02.json    ← Tabularis Ready
   ↓ (Czytający Agent)
3. sprzedaz_04.json    ← UI Package (z dashboard_hints)
   ↓ (Goose)
4. Dashboard.html      ← Rendered UI
```

---

## Integracja z JIMBOKIT_COMMS

**Zadania (tasks/):**
```json
{
  "id": "uuid-123",
  "type": "data_analysis",
  "payload": {
    "instruction": "Analyze sales data",
    "input_file": "data/sprzedaz_02.json",  // ← Ścieżka do pliku
    "output_file": "data/sprzedaz_04.json",
    "role": "Wnioskujący"
  }
}
```

**Wyniki (results/):**
```json
{
  "taskId": "uuid-123",
  "status": "completed",
  "result": {
    "output_file": "data/sprzedaz_04.json",
    "rows_processed": 247,
    "insights_generated": 5
  }
}
```

---

## Zasady

1. **Atomowe transformacje** — jeden agent = jedna transformacja = jeden sufiks
2. **Zero halucynacji** — sufiks determinuje narzędzie i akcję
3. **Self-documenting** — nazwa pliku = metadata o stanie
4. **Immutable history** — nie nadpisuj, twórz nowe pliki z kolejnym sufiksem
5. **Error handling** — błąd = plik `_ERR.json` + task failed

---

## Przykład Kompletny

### Plik: `sales_q1_00.csv`
```csv
id,product,price,qty
101,Krzesło,250,45
102,Biurko,600,2
```

### Po ETL → `sales_q1_02.json`
```json
{
  "metadata": {"status": "Tabularis_Ready", "rows": 2},
  "tabularis_data": [
    {"id": 101, "nazwa": "Krzesło", "cena": 250, "sprzedano": 45},
    {"id": 102, "nazwa": "Biurko", "cena": 600, "sprzedano": 2}
  ]
}
```

### Po analizie → `sales_q1_04.json`
```json
{
  "report_id": "REP-001",
  "status": "Ready_for_Goose_UI",
  "business_insights": {
    "bestsellers": [{"id": 101, "insight": "High rotation"}],
    "dead_stock": [{"id": 102, "insight": "No sales - reduce price"}]
  },
  "dashboard_hints": {
    "layout_type": "ecommerce_alert",
    "widgets": [
      {"type": "bar_chart", "x": "nazwa", "y": "sprzedano"}
    ]
  }
}
```

---

## Narzędzia

| Narzędzie | Kiedy | Input | Output |
|-----------|-------|-------|--------|
| `CAY_FEED_conventer` | _00 → _02 | CSV/XML | JSON |
| `I_Do_INDexer` | Plik >10MB | _00 | _01 |
| `sqlite_query` | Analiza _02 | SQL | Facts |
| `json_parser` | Czytanie _02/_04 | JSON | Objects |

---

## Status Dokumentu

**Wersja:** 1.0  
**Data:** 2026-04-26  
**Standard:** ZENO Suffix Protocol  
**Kompatybilność:** JIMBOKIT_COMMS JSON Schema ✅  
**Autor:** Bonzo + JIMBO System

---

## Referencje

- `WORKSPACE_META_DATA/pomoce_mapy_projekt/SUPER_ANALITYK_e_comerce/ZENO_PROTOKOL_HANDOFF.md`
- `WORKSPACE_META_DATA/pomoce_mapy_projekt/SUPER_ANALITYK_e_comerce/workflow_zeno.md`
- `JIMBOKIT_COMMS/PLAN_WDROZENIA.md` (FAZA 0-3)
