# AGENT WORKSPACE — Przewodnik konfiguracji i orkiestracji
## Struktura plików

```
src/components/agents/
├── AgentWorkspacePanel.tsx        ← GŁÓWNY PANEL — agregator slotów, nie edytuj tu logiki terminali
├── AGENT_Pi_01/
│   └── index.tsx                  ← SLOT 01 — AgentTerminal_01 (edytuj tutaj providers/modele/funkcje)
├── AGENT_Pi_02/
│   └── index.tsx                  ← SLOT 02 — AgentTerminal_02
└── AGENT_Pi_03/
    └── index.tsx                  ← SLOT 03 — AgentTerminal_03

AGENT_LIBRARY/agents/              ← Definicje agentów (komendy startowe, kolory, systemPrompt)
├── pi.json
├── goose.json
├── claude.json
├── codex.json
└── gemini.json
```

---

## 1. Jak dodać lub zmienić dostawcę API (providera)

Edytuj stałą `PROVIDER_DEFAULTS` w pliku `AGENT_Pi_0X/index.tsx`.

### Przykład — plik `AGENT_Pi_01/index.tsx`, linia ~50:

```ts
const PROVIDER_DEFAULTS: Record<string, { model: string; envKey: string; placeholder: string }> = {
  // ── Istniejący dostawcy ──
  google:     { model: "gemini-2.5-flash",           envKey: "GOOGLE_API_KEY",      placeholder: "AIza..." },
  anthropic:  { model: "claude-3-5-haiku-20241022",  envKey: "ANTHROPIC_API_KEY",   placeholder: "sk-ant-..." },
  openrouter: { model: "anthropic/claude-3.5-haiku", envKey: "OPENROUTER_API_KEY",  placeholder: "sk-or-..." },
  openai:     { model: "gpt-4o-mini",                envKey: "OPENAI_API_KEY",      placeholder: "sk-proj-..." },

  // ── Dodaj nowego dostawcę ──
  mistral:    { model: "mistral-large-latest",       envKey: "MISTRAL_API_KEY",     placeholder: "..." },
  groq:       { model: "llama-3.1-70b-versatile",    envKey: "GROQ_API_KEY",        placeholder: "gsk_..." },
  cohere:     { model: "command-r-plus",             envKey: "COHERE_API_KEY",      placeholder: "..." },
};
```

Klucz API wczytywany jest automatycznie z pliku `.env` (ścieżka: `U:/WWW_Zen_BRo_wser_org3/.env`).  
Format `.env`:
```
GOOGLE_API_KEY=AIza...
ANTHROPIC_API_KEY=sk-ant-...
MISTRAL_API_KEY=...
```

### Zmiana modelu w locie
W UI każdego terminala jest pole tekstowe "model" — możesz wpisać tam dowolną nazwę modelu bez edytowania kodu.

---

## 2. Jak zmienić domyślnego dostawcę/model dla agenta

Edytuj plik JSON agenta w `AGENT_LIBRARY/agents/`:

```json
// AGENT_LIBRARY/agents/pi.json
{
  "name": "pi",
  "icon": "π",
  "command": "npx",
  "args": ["pi"],
  "desc": "Pi coding agent (Orchestrator)",
  "color": "#00ffcc",
  "defaultProvider": "google",        // ← zmień tutaj
  "defaultModel": "gemini-2.5-pro",   // ← zmień tutaj
  "systemPromptOverride": "..."
}
```

---

## 3. Jak dodać 4. terminal (SLOT 04)

1. Skopiuj folder:
   ```
   AGENT_Pi_01/  →  AGENT_Pi_04/
   ```

2. W `AGENT_Pi_04/index.tsx` zamień wszystkie wystąpienia:
   - `AgentTerminal_01` → `AgentTerminal_04`
   - `AgentTerminal_01_Props` → `AgentTerminal_04_Props`
   - `[SLOT 01]` → `[SLOT 04]`

3. W `AgentWorkspacePanel.tsx` dodaj import:
   ```ts
   import { AgentTerminal_04, type AgentTerminal_04_Props } from "./AGENT_Pi_04";
   ```

4. W funkcji `renderSlot()` dodaj case:
   ```ts
   case 3:
     return <AgentTerminal_04 {...(sharedProps as AgentTerminal_04_Props)} />;
   ```

5. Zmień limit z `sessions.length < 3` na `< 4` (linia ~230 w AgentWorkspacePanel.tsx).

---

## 4. Jak Pi Agent orkiestruje terminale

### Mechanizm komunikacji

Agent Pi (SLOT 01 domyślnie) może wysyłać komendy do pozostałych terminali przez współdzielony folder komunikacyjny:

```
U:\WWW_Zen_BRo_wser_org3\JIMBOKIT_COMMS\    ← folder wymiany zadań
```

### Przepływ orkiestracji

```
[Pi Agent — SLOT 01]
    │
    ├─ analizuje zadanie
    ├─ zapisuje podzadania do JIMBOKIT_COMMS/<agent>.task.json
    │
    ├─→ [Claude — SLOT 02]  czyta JIMBOKIT_COMMS/claude.task.json → wykonuje → zapisuje wynik
    ├─→ [Codex  — SLOT 03]  czyta JIMBOKIT_COMMS/codex.task.json  → wykonuje → zapisuje wynik
    │
    └─ zbiera wyniki z JIMBOKIT_COMMS/*.result.json → weryfikuje → przekazuje do Goose (Warstwa 2)
```

### Pipeline — zadanie do wszystkich jednocześnie

W pasku nagłówka panelu jest przycisk **Pipeline**.  
Wpisz zadanie w polu tekstowym i naciśnij Enter — zadanie trafi do wszystkich aktywnych terminali.

Aktualnie Pipeline wpisuje tekst do PTY każdego terminala.  
Aby rozbudować Pipeline o automatyczne routing → edytuj handler `onKeyDown` w sekcji `{/* ── Pasek Pipeline ── */}` w `AgentWorkspacePanel.tsx`.

### systemPromptOverride — instrukcje dla agenta

W pliku JSON każdego agenta pole `systemPromptOverride` definiuje rolę agenta w systemie:

```json
// AGENT_LIBRARY/agents/pi.json
"systemPromptOverride": "Jesteś agentem Pi w PIERWSZEJ WARSTWIE.
  Nadzoruj sub-agentów (Claude, Codex, Gemini).
  Wyniki po weryfikacji zapisuj do JIMBOKIT_COMMS.
  ABSOLUTNY ZAKAZ modyfikacji Drugiej Warstwy."
```

Agent Pi przy starcie (`launch`) dostaje ten prompt jako argument `--system-prompt` (jeśli CLI go obsługuje).

---

## 5. Warstwy systemu agentów

```
WARSTWA 1 (SLOT 01-03)           WARSTWA 2
┌─────────────────────────┐      ┌─────────────────┐
│  Pi (orkiestrator W1)   │      │  Goose          │
│  Claude (sub-agent)     │ ──→  │  (orkiestrator) │
│  Codex  (sub-agent)     │      │  Layer 2        │
│  Gemini (sub-agent)     │      └─────────────────┘
└─────────────────────────┘
         ↕ JIMBOKIT_COMMS
```

- Pi weryfikuje i zatwierdza wyniki sub-agentów z W1
- Zatwierdzone pliki trafiają do `JIMBOKIT_COMMS`
- Goose (W2) odbiera pliki z `JIMBOKIT_COMMS` i kontynuuje pracę

---

## 6. Szybkie odniesienia do plików

| Co chcesz zmienić | Plik |
|---|---|
| Prowiderzy/modele terminala 01 | `AGENT_Pi_01/index.tsx` → `PROVIDER_DEFAULTS` |
| Prowiderzy/modele terminala 02 | `AGENT_Pi_02/index.tsx` → `PROVIDER_DEFAULTS` |
| Prowiderzy/modele terminala 03 | `AGENT_Pi_03/index.tsx` → `PROVIDER_DEFAULTS` |
| Komenda startowa agenta | `AGENT_LIBRARY/agents/<nazwa>.json` → `command` + `args` |
| Domyślny model agenta | `AGENT_LIBRARY/agents/<nazwa>.json` → `defaultModel` |
| Instrukcje systemowe | `AGENT_LIBRARY/agents/<nazwa>.json` → `systemPromptOverride` |
| Przypisanie slotów | `AgentWorkspacePanel.tsx` → funkcja `renderSlot()` |
| Logika Pipeline | `AgentWorkspacePanel.tsx` → sekcja `Pasek Pipeline` |
| Folder komunikacyjny | `U:/WWW_Zen_BRo_wser_org3/JIMBOKIT_COMMS/` |
| Klucze API | `U:/WWW_Zen_BRo_wser_org3/.env` |
