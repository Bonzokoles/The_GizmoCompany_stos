/**
 * ZENO Queue Test — POST /api/queues/test
 * Wysyła testową wiadomość do wybranej kolejki
 * 
 * Body: { "queue": "agent-tasks" | "image-gen" | "image-proc" | "voice", "data": {...} }
 */
import type { Env } from '../../types';

const QUEUE_MAP = {
  'agent-tasks': 'AGENT_TASKS_QUEUE',
  'image-gen': 'IMAGE_GEN_QUEUE',
  'image-proc': 'IMAGE_PROC_QUEUE',
  'voice': 'VOICE_QUEUE',
} as const;

type QueueName = keyof typeof QUEUE_MAP;

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const body = await context.request.json() as { queue?: string; data?: unknown };
  const queueName = body?.queue as QueueName | undefined;

  if (!queueName || !QUEUE_MAP[queueName]) {
    return Response.json(
      { error: 'Invalid queue. Use: agent-tasks, image-gen, image-proc, voice' },
      { status: 400 }
    );
  }

  const bindingKey = QUEUE_MAP[queueName];
  const queue = context.env[bindingKey];

  if (!queue) {
    return Response.json(
      { error: `Queue binding ${bindingKey} not available` },
      { status: 503 }
    );
  }

  const message = {
    type: 'test',
    source: 'zeno-browser',
    timestamp: new Date().toISOString(),
    data: body.data ?? { message: 'Hello from ZENO!' },
  };

  await queue.send(message);

  return Response.json({
    ok: true,
    queue: queueName,
    message,
  });
};

export const onRequestGet: PagesFunction<Env> = async () => {
  return Response.json({
    endpoint: '/api/queues/test',
    method: 'POST',
    queues: Object.keys(QUEUE_MAP),
    example: {
      queue: 'agent-tasks',
      data: { task: 'summarize', input: 'Hello world' },
    },
  });
};
