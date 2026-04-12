# MOA (Multi-Option Architecture) w ZENO Browser — jak działa?

MOA (Multi-Option Architecture) to innowacyjne podejście do budowy rozproszonych systemów agentowych w ramach ZENO Browser. Architektura ta łączy zalety Electron, React 19 i Vite, tworząc skalowalną platformę dla inteligentnych asystentów.

## Jak działa MOA?

Podstawą MOA jest trójwarstwowy system agentów:
1. **Warstwa interfejsu** (Electron + React) — zapewnia natywne środowisko desktopowe z reaktywnym UI
2. **Warstwa logiki** (Vite + TypeScript) — oferuje błyskawiczny hot-reload i silne typowanie
3. **Warstwa agentów** (Goose + Cloudflare Workers) — umożliwia równoległe wykonywanie zadań przez specjalizowane asystenty

## Połączenie z Electron/React/Vite

MOA wykorzystuje Electron jako szkielet aplikacji desktopowej, React 19 dla komponentów interfejsu, a Vite jako bundler i dev server. Dzięki Vite otrzymujemy:
- Natychmiastowy hot-reload zmian w kodzie
- Optymalizację pakietów produkcyjnych
- Wsparcie dla TypeScript out-of-the-box
- Plugin system dla rozszerzeń

## Zalety MOA

### 1. Skalowanie agentów
System pozwala na równoczesne uruchamianie wielu agentów o różnych specjalizacjach (np. analiza kodu, zarządzanie pamięcią, komunikacja z LLM). Każdy agent działa w izolowanym środowisku, co eliminuje konflikty.

### 2. Routing requestów
Architektura implementuje inteligentny router żądań, który kieruje zadania do najbardziej kompetentnego agenta na podstawie:
- Typu zadania (analiza, generowanie, debugowanie)
- Obciążenia aktualnego agenta
- Specjalizacji (np. skills z bazy wiedzy)

### 3. Failover i odporność
MOA posiada wbudowane mechanizmy odzyskiwania:
- Automatyczne restartowanie zawieszonych agentów
- Replikacja stanu między instancjami
- Backup pamięci w Cloudflare D1
- Health-check endpointy w hub-server.ts

## Przykład użycia

Gdy użytkownik prosi o analizę kodu, system:
1. Routing identyfikuje zapytanie jako "code analysis"
2. Wybiera agenta z odpowiednimi skills (np. analyze, tree, shell)
3. Uruchamia zadanie przez Goose Bridge
4. Wyniki zapisuje w pamięci archival i zwraca użytkownikowi

## Podsumowanie

MOA w ZENO Browser to elastyczna architektura, która łączy natywną wydajność Electron z szybkością React 19 i skalowalnością Cloudflare. Dzięki izolacji agentów, inteligentnemu routingowi i mechanizmom failover, system jest zarówno wydajny, jak i odporny na błędy.