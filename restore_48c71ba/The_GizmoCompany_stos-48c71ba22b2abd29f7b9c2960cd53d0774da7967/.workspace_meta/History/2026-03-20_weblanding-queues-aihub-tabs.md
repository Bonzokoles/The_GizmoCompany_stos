# WebLanding Dashboard — Queues + AI Hub Tabs
priority: medium
created: 2026-03-20T06:00:00
completed: 2026-03-20T10:00:00

## Resolution Notes

Dodano 2 nowe zakładki do Operations Dashboard (`src/components/WebLanding.tsx`): Queues i AI Hub Tools.

## Zakładka Queues
- Lista 5 kolejek Cloudflare z statusem
- Formularz testowy do wysyłania wiadomości do kolejek
- Wyświetlanie wyników z D1 `queue_results`
- Przycisk "Test Queue" z wyborem kolejki

## Zakładka AI Hub Tools
- Przegląd dostępnych modeli AI
- Linki do standalone `/ai-hub/` aplikacji
- Status providerów (DeepSeek, OpenRouter, Anthropic)

## WebLanding.tsx
- ~1992 linii po zmianach
- 13 zakładek łącznie (Ops, Analytics, AI, Terminal, Security, Tunnel, Search, Catalog, Queues, AI Hub, ...)
- Glassmorphism dark theme, responsive

## Commit
- `705b96b` — feat: add Queues + AI Hub tabs to Operations Dashboard
