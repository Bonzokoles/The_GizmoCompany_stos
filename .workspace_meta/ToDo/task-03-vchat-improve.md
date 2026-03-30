# TASK-03 — vchat: selector providera + historia wiadomości
> **Agent:** `context-architect` | **Priorytet:** 🟠 | **Status:** TODO

## Problem
vchat.js (AI-hub inline chat) ma hardkodowany provider `workers-ai`.
Brak wyboru modelu, brak historii między sesjami.

## Zmiany w ai-hub/js/modules/vchat.js

### 1. Selector providera
Dodaj do UI (obok przycisku 🎤):
```html
<select id="vchatProvider">
  <option value="workers-ai">Workers AI (szybki)</option>
  <option value="deepseek">DeepSeek R1</option>
  <option value="openrouter">OpenRouter</option>
  <option value="anthropic">Claude</option>
</select>
```
Użyj wartości z selectora zamiast hardkodowanego `'workers-ai'`.
Zapisz wybrany provider w `localStorage('vchat-provider')`.

### 2. Historia wiadomości
- Przechowuj ostatnie 20 wiadomości w `localStorage('vchat-history')`
- Przy otwarciu chatu załaduj historię i wyrenderuj
- Przycisk "🗑 Wyczyść" czyści historię

### 3. Licznik tokenów
- Gdy API zwraca `usage.total_tokens` → pokaż pod odpowiedzią (szary tekst, 11px)

### 4. Ulepszenia UX
- Enter = wyślij (już jest), Shift+Enter = nowa linia
- Typing indicator `▋` podczas oczekiwania
- Auto-focus na input przy otwarciu (już jest)
- Scroll to bottom po nowej wiadomości

## Pliki do edycji
- `ai-hub/js/modules/vchat.js` — cały moduł
- `ai-hub/index.html` — jeśli trzeba dodać CSS dla selectora
