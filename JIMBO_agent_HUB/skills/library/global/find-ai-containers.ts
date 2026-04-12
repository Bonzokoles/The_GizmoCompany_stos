// Skill: find-ai-containers
// Namespace: global
// Finds containers related to AI using podman, searching for keywords like 'ai', 'llm', 'model', 'openai', and 'anthropic' in container names and inspection details.
// Tags: podman, containers, ai, inspection

// Auto-extracted skill
// Źródło: Goose task 2026-04-07T21:30:00.527Z

Rozumiem, więc sprawdzam, czy działają dodatkowe (niezależne) kontenery z modelami AI, które mogłyby obsługiwać dane z Sist2 i Mydia.

Ponieważ nie wskazałeś konkretnych obrazów/nazw, przeszukam wszystkie kontenery pod kątem keywordów. Sprawdzę też czy są jakieś nieznane/nieopisane kontenery, które potencjalnie mogłyby pełnić tę rolę.

```goose
podman ps -a --format "table {{.Names}}\t{{.Image}}"
podman ps -a | grep -i "ai\|llm\|model\|openai\|anthropic"
podman inspect $(podman ps -q) | grep -i "ai\|llm\|model\|openai\|anthropic"
```

---
[AUTO-RETRY 1/2] Poprzednia próba oceniona na 0.60/1.0.
Wskazówka do poprawy: Należy poprawić obsługę komentarzy w skryptach shell, aby uniknąć błędów wykonania. Dodatkowo warto dodać mechanizm sprawdzania błędów i ponawiania prób w przypadku drobnych problemów.
Poprzedni output: 
  ▸ shell
    command: 
# List all containers with names and images
podman ps -a --format "table {{.Names}}\t{{.Image}}"

echo "\n--- Searching for AI-related keywords in container listings (names, images, commands, status) ---"
# Search podman ps output for AI-related keywords
podman ps -a | grep -i "ai\|llm\|model\|openai\|anthropic"

echo "\n--- Searching for AI-related keywords in container i
---
Wykonaj zadanie jeszcze raz uwzględniając powyższą wskazówkę.

---
[AUTO-RETRY 2/2] Poprzednia próba oceniona na 0.65/1.0.
Wskazówka do poprawy: Zastosuj pętlę w skrypcie shell, aby iterować po nazwach kontenerów i sprawdzać ich szczegóły. To zredukuje liczbę wywołań `Developer.shell` i przyspieszy działanie.
Poprzedni output: 
  ▸ shell
    command: podman ps -a --format "{{.Names}}"

promptschat-db-1
zeno-umami-db
zeno-searxng-redis
zeno-umami
zeno-meilisearch
zeno-websurfx
zeno-sist2
plausible-db
plausible-events-db
plausible
mydia
  ▸ execute 11 tool calls
    1. Developer.shell Check for AI-related keywords in promptschat-db-1 inspection details
    2. Developer.shell Check for AI-related keywords in zeno-umami-db 
---
Wykonaj zadanie jeszcze raz uwzględniając powyższą wskazówkę.
