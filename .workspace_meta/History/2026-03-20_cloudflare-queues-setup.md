# Cloudflare Queues — Infrastructure + Consumer Worker
priority: high
created: 2026-03-20T08:00:00
completed: 2026-03-20T12:00:00

## Resolution Notes

Pełna infrastruktura Cloudflare Queues z 5 kolejkami, producer bindings w CF Pages i dedykowanym consumer Worker.

## Kolejki (5)

| Queue | Przeznaczenie |
|---|---|
| `zeno-analytics-queue` | Zdarzenia analityczne (page views, events) |
| `zeno-ai-queue` | Zadania AI (generowanie, przetwarzanie) |
| `zeno-content-queue` | Operacje na treści (CRUD, moderacja) |
| `zeno-notification-queue` | Powiadomienia (email, push, in-app) |
| `zeno-task-queue` | Zadania ogólne (cron, cleanup, batch) |

## Consumer Worker
- **Nazwa:** `zeno-queue-consumer`
- **URL:** `https://zeno-queue-consumer.stolarnia-ams.workers.dev`
- **Plik:** `workers/queue-consumer/src/index.ts` (~420 linii)
- **3 handlery:** analytics, AI (Gemma 7b-it), content
- **D1 baza:** `queue_results` tabela do logowania wyników
- **AI binding:** Gemma 7b-it do przetwarzania AI queue

## Producer Bindings (w wrangler.toml)
```toml
[[queues.producers]]
binding = "ANALYTICS_QUEUE"
queue = "zeno-analytics-queue"

[[queues.producers]]
binding = "AI_QUEUE"
queue = "zeno-ai-queue"

[[queues.producers]]
binding = "CONTENT_QUEUE"
queue = "zeno-content-queue"

[[queues.producers]]
binding = "NOTIFICATION_QUEUE"
queue = "zeno-notification-queue"
```

## Test endpoint
- `functions/api/queues/test.ts` — POST do testowania wysyłania wiadomości do kolejek

## Zmodyfikowane pliki
- `workers/queue-consumer/src/index.ts` — pełny consumer z 3 handlerami
- `workers/queue-consumer/wrangler.toml` — konfiguracja consumer bindings
- `wrangler.toml` — producer bindings w głównym projekcie
- `functions/api/queues/test.ts` — test endpoint
- `functions/types.ts` — typy dla queue bindings

## Commity
- W ramach commitów z sesji WebLanding dashboard
