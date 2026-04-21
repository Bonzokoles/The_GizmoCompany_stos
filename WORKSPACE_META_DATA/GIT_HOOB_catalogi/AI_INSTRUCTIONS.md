# 🤖 AI INSTRUCTIONS — GIT_HOOB_catalogi Status System

> **Dla agentów AI (Jimbo i inne modele):** Ten plik opisuje jak automatycznie aktualizować statusy narzędzi w katalogu projektu. Czytaj go na początku każdej sesji roboczej.

---

## 🔑 Zasada działania

Gdy **używasz, wdrażasz lub decydujesz o narzędziu** w projekcie — zaktualizuj jego status w pliku `ai-status-updates.json`. Katalog wczyta te zmiany automatycznie przy następnym otwarciu.

## 📋 Statusy i ich znaczenie

| Status | Znaczenie | Kiedy ustawiać |
|--------|-----------|----------------|
| `todo` | **W oczekiwaniu** | Narzędzie znane, dodane do katalogu, jeszcze nie użyte |
| `priority` | **Zaplanowane** | Zdecydowano że będzie użyte w tym projekcie / sprincie |
| `deploy` | **Użyte/Wdrożone** | Narzędzie zostało faktycznie użyte lub zainstalowane |
| `reject` | **Odrzucone** | Narzędzie nie pasuje do projektu lub zastąpione innym |

## ✍️ Jak aktualizować status (format JSON)

Edytuj plik `ai-status-updates.json` w folderze projektu. Dodaj wpis do tablicy `"updates"`:

```json
{
  "updates": [
    {
      "tool_name": "github-mcp-server",
      "new_status": "deploy",
      "note": "Użyte do automatycznego tworzenia PR #42. Integracja pełna.",
      "updated_by": "Jimbo-AI",
      "updated_at": "2026-04-15T21:00:00Z"
    },
    {
      "tool_name": "tabularis-mcp",
      "new_status": "priority",
      "note": "Zaplanowane do użycia w module raportowania — sprint 3",
      "updated_by": "Jimbo-AI",
      "updated_at": "2026-04-15T21:05:00Z"
    }
  ]
}
```

## 🔧 Narzędzie do użycia przez AI (PowerShell)

Zamiast ręcznie edytować JSON, możesz wywołać:

```powershell
# Ustawienie statusu narzędzia:
.\update-tool-status.ps1 -ToolName "github-mcp-server" -Status "deploy" -Note "Integracja zakończona" -Agent "Jimbo"
```

## 🗂️ Pliki systemu

| Plik | Rola |
|------|------|
| `workspace.json` | Identyfikator projektu — nazwa, ścieżka, repo |
| `ai-status-updates.json` | Kolejka aktualizacji od AI → czytana przez katalog |
| `index.json` | Płaski indeks wszystkich narzędzi projektu |
| `tools-catalog.html` | Interfejs webowy katalogu |
| `categories/*/catalog.json` | Narzędzia per kategoria |

## 🚀 Workflow agenta

```
1. Na starcie sesji → odczytaj workspace.json (nazwa projektu)
2. Znajdź narzędzie w index.json lub categories/
3. Po użyciu narzędzia → dopisz do ai-status-updates.json
4. Przy dodaniu nowego → utwórz wpis przez Auto-fetch lub ręcznie w JSON
5. Regularnie eksportuj index.json przez przycisk w UI katalogu
```

## ⚡ Szybkie przykłady

```bash
# Wdrożyłeś narzędzie:
tool_name = "react-flow" → new_status = "deploy" → note = "Użyte w edytorze nodów JIMBO v2"

# Planowanie:
tool_name = "playwright" → new_status = "priority" → note = "Potrzebne do testów e2e — sprint 4"

# Odrzucenie:
tool_name = "puppeteer" → new_status = "reject" → note = "Zastąpione przez playwright"
```

---
*GIT_HOOB_catalogi v2.1 | AI Instructions | Bonzo/Jimbo System*
