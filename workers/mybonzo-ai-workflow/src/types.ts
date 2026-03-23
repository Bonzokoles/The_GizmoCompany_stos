/**
 * mybonzo-ai-workflow — Shared Types & Helpers
 */

export interface Env {
  // Workflows
  AI_CHAT_WORKFLOW: Workflow;
  IMAGE_GEN_WORKFLOW: Workflow;
  MOA_PUBLISHER_WORKFLOW: Workflow;
  REPLICATE_WORKFLOW: Workflow;
  CONTENT_SCHEDULER_WORKFLOW: Workflow;

  // Bindings
  AI: Ai;
  DB: D1Database;
  MEDIA_BUCKET: R2Bucket;
  AGENT_TASKS_QUEUE: Queue;
  IMAGE_GEN_QUEUE: Queue;

  // Secrets
  DEEPSEEK_API_KEY?: string;
  OPENROUTER_API_KEY?: string;
  OPENAI_API_KEY?: string;
  REPLICATE_API_TOKEN?: string;
  CF_ACCOUNT_ID?: string;
  CF_API_TOKEN?: string;
  GHOST_API_URL?: string;
  GHOST_ADMIN_API_KEY?: string;

  // Vars
  ENVIRONMENT?: string;
}

// ─── AI Helper (DeepSeek → OpenRouter fallback) ──────────────

export async function callAI(
  systemPrompt: string,
  userPrompt: string,
  env: Env,
  model?: string,
  maxTokens = 2000
): Promise<string> {
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];

  // 1. DeepSeek (cheapest, great quality)
  if (env.DEEPSEEK_API_KEY) {
    try {
      const res = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.DEEPSEEK_API_KEY}` },
        body: JSON.stringify({ model: model || 'deepseek-chat', messages, max_tokens: maxTokens, temperature: 0.7 }),
        signal: AbortSignal.timeout(45000),
      });
      if (res.ok) {
        const data: any = await res.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) return content;
      }
    } catch {}
  }

  // 2. OpenRouter fallback
  if (env.OPENROUTER_API_KEY) {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'https://mybonzoaiblog.com',
          'X-Title': 'mybonzo-ai-workflow',
        },
        body: JSON.stringify({
          model: 'deepseek/deepseek-chat',
          messages,
          max_tokens: maxTokens,
        }),
        signal: AbortSignal.timeout(45000),
      });
      if (res.ok) {
        const data: any = await res.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) return content;
      }
    } catch {}
  }

  // 3. Workers AI fallback (free, built-in)
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res: any = await (env.AI as any).run('@cf/deepseek-ai/deepseek-r1-distill-qwen-7b', {
      messages,
      max_tokens: Math.min(maxTokens, 1024),
    });
    const content = res?.response || res?.result?.response;
    if (content) return content;
  } catch {}

  throw new Error('All AI providers unavailable');
}

// ─── JSON Response ───────────────────────────────────────────

export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

export function errorResponse(message: string, status = 500): Response {
  return jsonResponse({ error: message, timestamp: new Date().toISOString() }, status);
}

export function corsHeaders(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
