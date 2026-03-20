/**
 * ZENO Queue Consumer Worker
 * Obsługuje wiadomości z queue: agent-tasks, image-processing, voice-processing
 * Deploy: cd workers/queue-consumer && npx wrangler deploy
 */

interface QueueMessage {
  type: string;
  source: string;
  timestamp: string;
  data: Record<string, unknown>;
}

interface Env {
  VOICE_DLQ: Queue;
}

export default {
  /**
   * agent-tasks consumer
   * Loguje task i zwraca ACK (w przyszłości: routing do AI agentów)
   */
  async queue(batch: MessageBatch<QueueMessage>, env: Env): Promise<void> {
    const queueName = batch.queue;
    console.log(`[${queueName}] Processing ${batch.messages.length} message(s)`);

    for (const msg of batch.messages) {
      try {
        const body = msg.body;
        console.log(`[${queueName}] Message: type=${body.type}, source=${body.source}, ts=${body.timestamp}`);

        switch (queueName) {
          case 'agent-tasks':
            await handleAgentTask(body);
            break;
          case 'image-processing-queue':
            await handleImageProcessing(body);
            break;
          case 'voice-processing':
            await handleVoiceProcessing(body, env);
            break;
          default:
            console.log(`[${queueName}] Unknown queue, ACK anyway`);
        }

        msg.ack();
      } catch (err) {
        console.error(`[${queueName}] Error processing message:`, err);
        msg.retry({ delaySeconds: 30 });
      }
    }
  },

  /**
   * Health-check HTTP endpoint
   */
  async fetch(): Promise<Response> {
    return Response.json({
      worker: 'zeno-queue-consumer',
      status: 'running',
      queues: ['agent-tasks', 'image-processing-queue', 'voice-processing'],
      timestamp: new Date().toISOString(),
    });
  },
};

async function handleAgentTask(body: QueueMessage): Promise<void> {
  const task = body.data?.task ?? 'unknown';
  console.log(`[agent-tasks] Executing task: ${task}`);
  // TODO: Route to AI agent (Gemini, OpenRouter, Claude)
  // Placeholder — log and ACK
  console.log(`[agent-tasks] Task "${task}" completed (stub)`);
}

async function handleImageProcessing(body: QueueMessage): Promise<void> {
  const url = body.data?.url ?? 'no-url';
  console.log(`[image-processing] Processing image: ${url}`);
  // TODO: Resize, optimize, store to R2
  console.log(`[image-processing] Image processed (stub)`);
}

async function handleVoiceProcessing(body: QueueMessage, env: Env): Promise<void> {
  const format = body.data?.format ?? 'unknown';
  console.log(`[voice-processing] Processing audio format: ${format}`);
  // TODO: STT transcription, store result
  // On permanent failure, send to DLQ
  console.log(`[voice-processing] Audio processed (stub)`);
}
