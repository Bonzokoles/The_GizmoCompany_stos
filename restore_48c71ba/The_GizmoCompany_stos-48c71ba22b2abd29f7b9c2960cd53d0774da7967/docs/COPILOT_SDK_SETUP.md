# Copilot SDK w projekcie ZENO Browser

## Cel

Ta integracja ustawia `@github/copilot-sdk` pod architekturę projektu `ZENO Browser` jako **adapter po stronie Electron main process**, a nie w rendererze.

Dzięki temu Copilot SDK działa w kontekście repozytorium, ma dostęp do katalogu roboczego projektu i może korzystać z lokalnych skilli workspace.

## Co zostało ustawione

- serwis: `src-electron/services/copilot-sdk-service.ts`
- IPC main process: `src-electron/main.ts`
- preload bridge: `src-electron/preload.ts`
- smoke test: `scripts/copilot-sdk-smoke-test.mjs`

## Założenia architektoniczne

### Dlaczego Electron main process

`@github/copilot-sdk` steruje CLI Copilota przez JSON-RPC. To jest logika procesowa, nie UI.

Dlatego poprawne miejsce integracji w tym repo to:

- **tak:** `src-electron/services/`
- **nie:** `src/` renderer React
- **nie:** bezpośrednio w komponentach UI

### Kontekst projektu przekazywany do SDK

Adapter ustawia:

- `clientName: zeno-browser-electron`
- `workingDirectory: root workspace`
- `configDir: .workspace_meta/copilot`
- `skillDirectories: .github/skills`

To daje Copilotowi kontekst zgodny z tym repo.

## Wymagania

### 1. Zainstalowany Copilot CLI

SDK wymaga lokalnego CLI `copilot` dostępnego w `PATH` albo wskazanego przez:

- `COPILOT_CLI_PATH`

### 2. Autoryzacja Copilot CLI

CLI musi być zalogowane lokalnie na koncie z dostępem do Copilota.

### 3. Opcjonalne zmienne środowiskowe

Możesz ustawić:

- `COPILOT_CLI_PATH` — jawna ścieżka do binarki CLI
- `COPILOT_CONFIG_DIR` — alternatywny katalog config dla SDK
- `WORKSPACE_ROOT` — root repo, jeśli uruchomienie nie startuje z katalogu projektu

## Dostępne IPC

Bridge renderer → main udostępnia:

- `window.electronAPI.copilot.status()`
- `window.electronAPI.copilot.start()`
- `window.electronAPI.copilot.runPrompt({ prompt, model?, cwd? })`

## Smoke test

Do szybkiej walidacji użyj:

- `node scripts/copilot-sdk-smoke-test.mjs`

Test:

1. uruchamia klienta SDK,
2. pobiera status CLI,
3. wybiera model,
4. tworzy sesję z katalogiem roboczym projektu,
5. wysyła prosty prompt testowy.

## Ograniczenia

- bez poprawnie zainstalowanego i zalogowanego `copilot` CLI SDK nie wystartuje,
- adapter obecnie używa `approveAll`, więc jest to ustawienie developerskie, nie hardened production sandbox,
- integracja jest przygotowana jako warstwa bazowa; UI do sterowania Copilotem w aplikacji nie zostało jeszcze dodane.

## Następny sensowny krok

Jeśli chcesz używać tego z poziomu aplikacji, kolejnym krokiem będzie dodanie panelu developerskiego w UI, który pokaże:

- status CLI,
- listę modeli,
- uruchomienie promptu testowego,
- log odpowiedzi sesji.
