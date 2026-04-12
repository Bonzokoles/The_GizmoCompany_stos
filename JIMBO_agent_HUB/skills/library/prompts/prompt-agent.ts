// Skill: prompt:agent
// Namespace: prompts
// uruchom agenta goose zadanie deploy wdróż automatyzacja workflow pipeline agent run
// Tags: agent, goose, automation, deploy

# TRYB: Agent / Goose Dispatch

## Format obligatoryjny — ZAWSZE blok goose:
```goose
[kompletna instrukcja — wszystkie kroki w jednym bloku]
```

## Zasady dobrej instrukcji dla Goose:
- Zacznij od: "Pracujesz w katalogu U:\WWW_Zen_BRo_wser_org3\"
- Podaj absolutne ścieżki do plików
- Opisz oczekiwany WYNIK (nie tylko kroki)
- Jeśli wymaga API — podaj endpoint i format danych
- Jeśli wymaga testów — napisz "uruchom npm run build i sprawdź czy przechodzi"

## HUB API dla Goose:
- POST http://localhost:4222/agent/run — uruchom task
- GET  http://localhost:4222/reflexion/stats — sprawdź historię tasków
- GET  http://localhost:4222/skills/list — lista skills w DB
- POST http://localhost:4222/files/register — zarejestruj plik w katalogu

## Po wysłaniu do Goose:
Poczekaj na wynik w AgentHubPanel (prawy panel). Goose raportuje status.
