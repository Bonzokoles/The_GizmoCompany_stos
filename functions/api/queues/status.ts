/**
 * GET /api/queues/status
 * Sprawdza dostępność wszystkich Queue bindings i opcjonalnie
 * pobiera metryki z Cloudflare REST API (CF_API_TOKEN + CF_ACCOUNT_ID).
 */
import type { Env } from '../../types';

const QUEUE_BINDINGS = [
  { name: 'agent-tasks',          binding: 'AGENT_TASKS_QUEUE'  },
  { name: 'image-generation',     binding: 'IMAGE_GEN_QUEUE'    },
  { name: 'image-processing',     binding: 'IMAGE_PROC_QUEUE'   },
  { name: 'voice-processing',     binding: 'VOICE_QUEUE'        },
] as const;

type BindingKey = typeof QUEUE_BINDINGS[number]['binding'];

interface QueueMetric {
  queue_id:           string;
  queue_name:         string;
  consumers_total:    number;
  messages_ready:     number;
  messages_delayed:   number;
  bytes_ready:        number;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const env = context.env;

  // ── 1. Sprawdź dostępność bindings ──────────────────────────────
  const bindings: Record<string, { available: boolean; binding: string }> = {};
  const availableQueues: string[] = [];

  for (const q of QUEUE_BINDINGS) {
    const available = !!(env[q.binding as BindingKey]);
    bindings[q.name] = { binding: q.binding, available };
    if (available) availableQueues.push(q.name);
  }

  // ── 2. Opcjonalne metryki z CF REST API ─────────────────────────
  let metrics: QueueMetric[] | null = null;
  let metricsError: string | null = null;

  if (env.CF_API_TOKEN && env.CF_ACCOUNT_ID) {
    try {
      const res = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/queues`,
        {
          headers: {
            Authorization: `Bearer ${env.CF_API_TOKEN}`,
            'Content-Type': 'application/json',
          },
          signal: AbortSignal.timeout(5000),
        }
      );

      if (res.ok) {
        const data = await res.json() as { result?: QueueMetric[]; success?: boolean };
        if (data.success && Array.isArray(data.result)) {
          // Filtruj tylko nasze kolejki
          const ourNames = new Set(QUEUE_BINDINGS.map(q => q.name));
          metrics = data.result.filter(m =>
            ourNames.has(m.queue_name) ||
            QUEUE_BINDINGS.some(q => m.queue_name.includes(q.name.replace(/-/g, '')))
          );
        }
      } else {
        metricsError = `CF API ${res.status}: ${res.statusText}`;
      }
    } catch (e) {
      metricsError = e instanceof Error ? e.message : 'CF API timeout';
    }
  }

  // ── 3. Odpowiedź ─────────────────────────────────────────────────
  return Response.json({
    ok:      availableQueues.length > 0,
    queues:  availableQueues,
    total:   QUEUE_BINDINGS.length,
    bindings,
    metrics: metrics ?? [],
    metricsError,
    cfApiConfigured: !!(env.CF_API_TOKEN && env.CF_ACCOUNT_ID),
    timestamp: new Date().toISOString(),
  }, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-store',
    },
  });
};

export const onRequestOptions: PagesFunction = async () =>
  new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
