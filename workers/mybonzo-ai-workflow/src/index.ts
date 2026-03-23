/**
 * mybonzo-ai-workflow — Main Worker Entry Point
 *
 * HTTP API (used by Trigger button or external callers):
 *
 *   GET  /                         → Lista workflowów + status
 *   POST /trigger/chat             → Start AiChatWorkflow
 *   POST /trigger/image            → Start ImageGenWorkflow
 *   POST /trigger/moa              → Start MoaPublisherWorkflow
 *   POST /trigger/replicate        → Start ReplicateWorkflow
 *   POST /trigger/schedule         → Start ContentSchedulerWorkflow
 *   GET  /status/:workflowId       → Status konkretnej instancji
 *
 * Trigger button w CF Dashboard: startuje instancję z pustym payload {}
 * Aby przekazać dane — użyj POST z JSON body.
 *
 * Deploy: cd workers/mybonzo-ai-workflow && npx wrangler deploy
 */

import { WorkflowEntrypoint, WorkflowStep, WorkflowEvent } from 'cloudflare:workers';
import type { Env } from './types';
import { jsonResponse, errorResponse, corsHeaders } from './types';

// ─── Re-export all workflow classes ─────────────────────────
export { AiChatWorkflow } from './workflows/chat';
export { ImageGenWorkflow } from './workflows/images';
export { MoaPublisherWorkflow } from './workflows/moa-publisher';
export { ReplicateWorkflow } from './workflows/replicate';
export { ContentSchedulerWorkflow } from './workflows/content-scheduler';

// ─── HTTP Handler ────────────────────────────────────────────

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') return corsHeaders();

    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';

    // ── Root: list workflows ──────────────────────────────
    if (path === '/' && request.method === 'GET') {
      return jsonResponse({
        name: 'mybonzo-ai-workflow',
        version: '1.0.0',
        workflows: [
          {
            id: 'ai-chat-workflow',
            class: 'AiChatWorkflow',
            trigger: '/trigger/chat',
            description: 'AI chat processing with DeepSeek/OpenRouter/CF AI',
            examplePayload: { message: 'Napisz artykuł o AI', model: 'deepseek-chat', language: 'pl' },
          },
          {
            id: 'image-gen-workflow',
            class: 'ImageGenWorkflow',
            trigger: '/trigger/image',
            description: 'Image generation via Cloudflare Workers AI',
            examplePayload: { prompt: 'a futuristic city at sunset', style: 'photorealistic', width: 1024, height: 1024 },
          },
          {
            id: 'moa-publisher-workflow',
            class: 'MoaPublisherWorkflow',
            trigger: '/trigger/moa',
            description: 'MOA multi-agent content pipeline → Ghost CMS publish',
            examplePayload: { topic: 'AI automation in 2025', type: 'blog', language: 'pl', publishToGhost: false },
          },
          {
            id: 'replicate-workflow',
            class: 'ReplicateWorkflow',
            trigger: '/trigger/replicate',
            description: 'Image generation via Replicate.com (FLUX, SDXL, etc.)',
            examplePayload: { prompt: 'a beautiful landscape painting', model: 'black-forest-labs/flux-schnell', width: 1024, height: 1024 },
          },
          {
            id: 'content-scheduler-workflow',
            class: 'ContentSchedulerWorkflow',
            trigger: '/trigger/schedule',
            description: 'Batch content generation and scheduled publishing',
            examplePayload: { topics: ['AI tools', 'automation'], type: 'blog', language: 'pl', intervalMinutes: 60 },
          },
        ],
        tip: 'Trigger button w CF Dashboard uruchamia workflow z payloadem {}. Użyj POST /trigger/<name> z JSON body aby przekazać parametry.',
        timestamp: new Date().toISOString(),
      });
    }

    // ── POST /trigger/:name ───────────────────────────────
    if (path.startsWith('/trigger/') && request.method === 'POST') {
      const workflowName = path.replace('/trigger/', '');

      let payload: Record<string, unknown> = {};
      try {
        const text = await request.text();
        if (text) payload = JSON.parse(text);
      } catch {
        // empty body is fine — Dashboard Trigger sends {}
      }

      const workflowMap: Record<string, keyof Env> = {
        chat: 'AI_CHAT_WORKFLOW',
        image: 'IMAGE_GEN_WORKFLOW',
        moa: 'MOA_PUBLISHER_WORKFLOW',
        replicate: 'REPLICATE_WORKFLOW',
        schedule: 'CONTENT_SCHEDULER_WORKFLOW',
      };

      const binding = workflowMap[workflowName];
      if (!binding) {
        return errorResponse(`Unknown workflow: ${workflowName}. Available: ${Object.keys(workflowMap).join(', ')}`, 404);
      }

      try {
        const instance = await (env[binding] as Workflow).create({ params: payload });
        return jsonResponse({
          success: true,
          workflowId: instance.id,
          workflow: workflowName,
          payload,
          statusUrl: `/status/${instance.id}`,
          message: `Workflow started. Check CF Dashboard → Workflows → ${workflowName} for live status.`,
        });
      } catch (e: any) {
        return errorResponse(`Failed to start workflow: ${e.message}`, 500);
      }
    }

    // ── GET /status/:workflowId ──────────────────────────
    const statusMatch = path.match(/^\/status\/(.+)$/);
    if (statusMatch && request.method === 'GET') {
      const workflowId = statusMatch[1];
      // Try each workflow binding to find the instance
      const bindings = [
        env.AI_CHAT_WORKFLOW,
        env.IMAGE_GEN_WORKFLOW,
        env.MOA_PUBLISHER_WORKFLOW,
        env.REPLICATE_WORKFLOW,
        env.CONTENT_SCHEDULER_WORKFLOW,
      ];

      for (const wf of bindings) {
        try {
          const instance = await wf.get(workflowId);
          const status = await instance.status();
          return jsonResponse({ workflowId, ...status });
        } catch {}
      }

      return errorResponse(`Workflow instance not found: ${workflowId}`, 404);
    }

    return errorResponse('Not found. GET / for list of workflows.', 404);
  },
};
