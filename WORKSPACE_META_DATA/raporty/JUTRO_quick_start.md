# Quick Start — Jutro (2026-04-27)

## 🔥 Start tutaj!

**Przeczytaj:** `2026-04-26_JIMBOKIT_COMMS_i_ZENO_integration.md` (pełny raport)

---

## ⚡ Fast Track — Co robić?

### 1. Manual UI Test (30 min)

```bash
# Uruchom ZENO Browser:
start_zeno_hub.bat

# W aplikacji:
# 1. Otwórz Agent Workspace Panel
# 2. Wyślij: "Test komunikacji z AGENT_PI"
# 3. Sprawdź:
ls JIMBOKIT_COMMS/tasks/     # Powinien być .task.json
ls JIMBOKIT_COMMS/results/   # Po zakończeniu: .result.json
```

**Sprawdź w UI:** Status powinien pokazywać "HUB API" (nie "COMMS/")

---

### 2. ZENO Workflow Test (15 min)

```bash
# Zobacz demo:
cat JIMBOKIT_COMMS/data/demo_sales_02.json
cat JIMBOKIT_COMMS/data/demo_sales_04.json

# W aplikacji wyślij:
"Analyze demo_sales_02.json using ZENO workflow"

# Sprawdź czy powstaje nowy _04 file
```

---

### 3. Jeśli coś nie działa

**Rollback (instant):**
```typescript
// src/components/agents/AgentWorkspacePanel.tsx
const USE_HUB_API = false;  // ← Zmień na false
```
Restart ZENO → działa stary system

**Debug:**
```bash
# Logi HUB:
cat logs/hub-*.log | Select-String "error"

# Logi Pi:
cat .pi/logs/*.log | Select-String "error"

# Status HUB:
curl http://localhost:4224/status
```

---

### 4. Po testach

**Stwórz raport:**
- Co działa ✅
- Co nie działa ❌
- Decyzja: forward czy rollback?

**Zapisz w:**
`WORKSPACE_META_DATA/raporty/2026-04-27_testy_manualne.md`

---

## 📞 Komenda dla Claude

Powiedz: **"Kontynuuj manual testing JIMBOKIT_COMMS"**

Agent przeczyta raport z wczoraj i poprowadzi dalej.

---

## 🎯 Cel

**Success criteria:**
- ✅ Zadanie zapisuje się w tasks/ jako .task.json
- ✅ Status w UI pokazuje "HUB API"
- ✅ AGENT_PI odbiera i przetwarza
- ✅ Wynik zapisuje się w results/ jako .result.json
- ✅ UI aktualizuje status po zakończeniu

**Jeśli wszystko ✅ → System działa! Monitor przez tydzień.**

---

**Czas:** ~45 minut testów  
**Status:** Gotowy do startu! 🚀
