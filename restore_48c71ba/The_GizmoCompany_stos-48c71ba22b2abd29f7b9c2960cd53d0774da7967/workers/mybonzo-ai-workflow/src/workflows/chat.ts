/**
 * AiChatWorkflow — Durable AI chat processing
 *
 * Trigger:
 *   POST /trigger/chat
 *   { message, model?, language?, systemPrompt?, saveToDb? }
 *
 * Steps:
 *   1. validate input
 *   2. select AI model
 *   3. generate response
 *   4. (optional) save result to D1
 *   5. return result
 */

import { WorkflowEntrypoint, WorkflowStep, WorkflowEvent } from 'cloudflare:workers';
import type { Env } from '../types';
import { callAI } from '../types';

export interface ChatParams {
  message: string;
  model?: string;
  language?: 'pl' | 'en';
  systemPrompt?: string;
  saveToDb?: boolean;
  taskId?: string;
}

export class AiChatWorkflow extends WorkflowEntrypoint<Env, ChatParams> {
  async run(event: WorkflowEvent<ChatParams>, step: WorkflowStep) {
    const params = event.payload ?? {};

    // ─── Step 1: Validate ─────────────────────────────────
    const input = await step.do('validate-input', async () => {
      const message = params.message?.trim() || 'Powiedz mi coś ciekawego o AI.';
      const language = params.language || 'pl';
      const model = params.model || 'deepseek-chat';
      const systemPrompt =
        params.systemPrompt ||
        (language === 'pl'
          ? 'Jesteś pomocnym asystentem AI. Odpowiadaj po polsku, zwięźle i konkretnie.'
          : 'You are a helpful AI assistant. Answer clearly and concisely.');

      return { message, language, model, systemPrompt };
    });

    // ─── Step 2: Generate AI Response ─────────────────────
    const result = await step.do('generate-response', { retries: { limit: 3, delay: '5 seconds', backoff: 'exponential' } }, async () => {
      const response = await callAI(input.systemPrompt, input.message, this.env, input.model);
      return {
        response,
        model: input.model,
        language: input.language,
        chars: response.length,
        timestamp: new Date().toISOString(),
      };
    });

    // ─── Step 3: Save to D1 (optional) ───────────────────
    if (params.saveToDb !== false) {
      await step.do('save-to-db', async () => {
        const taskId = params.taskId || `chat-${Date.now()}`;
        try {
          await this.env.DB.prepare(
            `INSERT OR IGNORE INTO workflow_results (task_id, workflow, input, output, created_at)
             VALUES (?, ?, ?, ?, ?)`
          )
            .bind(taskId, 'ai-chat-workflow', input.message, result.response, result.timestamp)
            .run();
          return { saved: true, taskId };
        } catch {
          return { saved: false };
        }
      });
    }

    return {
      success: true,
      ...result,
      inputMessage: input.message,
    };
  }
}
