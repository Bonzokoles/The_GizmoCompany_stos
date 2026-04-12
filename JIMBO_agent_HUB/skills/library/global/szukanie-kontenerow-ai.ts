// Skill: szukanie-kontenerow-ai
// Namespace: global
// Przeszukuje kontenery podman w poszukiwaniu kontenerow powiazanych z AI po nazwach, obrazach i konfiguracji.
// Tags: podman, ai, kontenery, docker, llm

// Auto-extracted skill
// Źródło: Goose task 2026-04-07T21:28:11.420Z

Rozumiem, więc sprawdzam, czy działają dodatkowe (niezależne) kontenery z modelami AI, które mogłyby obsługiwać dane z Sist2 i Mydia.

Ponieważ nie wskazałeś konkretnych obrazów/nazw, przeszukam wszystkie kontenery pod kątem keywordów. Sprawdzę też czy są jakieś nieznane/nieopisane kontenery, które potencjalnie mogłyby pełnić tę rolę.

```goose
podman ps -a --format "table {{.Names}}\t{{.Image}}"
podman ps -a | grep -i "ai\|llm\|model\|openai\|anthropic"
podman inspect $(podman ps -q) | grep -i "ai\|llm\|model\|openai\|anthropic"
```
