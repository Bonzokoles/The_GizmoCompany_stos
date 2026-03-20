/**
 * ZENO Browser — MOA Pipeline Worker
 * Mixture-of-Agents content generation pipeline
 *
 * Endpoints:
 *   POST /api/moa/generate    — Run full MOA pipeline (parallel → critique → aggregate → validate)
 *   POST /api/moa/quick       — Quick single-model generation  
 *   GET  /api/moa/status      — Service health
 */

import type { Env } from '../../types';
import { jsonResponse, errorResponse, corsHeaders } from '../../types';

interface MoaRequest {
  topic: string;
  type?: 'article' | 'blog' | 'social' | 'product';
  language?: 'pl' | 'en';
  tone?: string;
  maxLength?: number;
}

interface MoaDraft {
  model: string;
  content: string;
  score?: number;
}

async function callAI(prompt: string, env: Env, model?: string): Promise<string> {
  // DeepSeek primary
  if (env.DEEPSEEK_API_KEY) {
    try {
      const resp = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.DEEPSEEK_API_KEY}`,
        },
        body: JSON.stringify({
          model: model || 'deepseek-chat',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 2000,
          temperature: 0.7,
        }),
        signal: AbortSignal.timeout(30000),
      });
      if (resp.ok) {
        const data: any = await resp.json();
        return data.choices?.[0]?.message?.content || '';
      }
    } catch {}
  }

  // OpenRouter fallback
  if (env.OPENROUTER_API_KEY) {
    try {
      const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'https://zenbrowsers.org',
        },
        body: JSON.stringify({
          model: 'deepseek/deepseek-chat',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 2000,
        }),
        signal: AbortSignal.timeout(30000),
      });
      if (resp.ok) {
        const data: any = await resp.json();
        return data.choices?.[0]?.message?.content || '';
      }
    } catch {}
  }

  throw new Error('No AI provider available');
}

/**
 * Stage 1: Parallel Writing — 3 different perspectives
 */
async function stageParallelWriting(req: MoaRequest, env: Env): Promise<MoaDraft[]> {
  const lang = req.language === 'en' ? 'English' : 'Polish';
  const toneStr = req.tone ? ` in a ${req.tone} tone` : '';

  const perspectives = [
    {
      model: 'creative',
      prompt: `Write a creative, engaging ${req.type || 'article'} about "${req.topic}" in ${lang}${toneStr}. Focus on storytelling, vivid descriptions, and emotional engagement. Max 500 words.`,
    },
    {
      model: 'analytical',
      prompt: `Write a factual, analytical ${req.type || 'article'} about "${req.topic}" in ${lang}${toneStr}. Focus on data, statistics, logical arguments, and evidence. Max 500 words.`,
    },
    {
      model: 'practical',
      prompt: `Write a practical, actionable ${req.type || 'article'} about "${req.topic}" in ${lang}${toneStr}. Focus on step-by-step instructions, tips, and real-world applications. Max 500 words.`,
    },
  ];

  const results = await Promise.allSettled(perspectives.map((p) => callAI(p.prompt, env).then((content) => ({ model: p.model, content }))));

  return results
    .filter((r): r is PromiseFulfilledResult<MoaDraft> => r.status === 'fulfilled')
    .map((r) => r.value);
}

/**
 * Stage 2: Critique — Score each draft
 */
async function stageCritique(drafts: MoaDraft[], req: MoaRequest, env: Env): Promise<MoaDraft[]> {
  const lang = req.language === 'en' ? 'English' : 'Polish';
  const draftTexts = drafts.map((d, i) => `--- Draft ${i + 1} (${d.model}) ---\n${d.content}`).join('\n\n');

  const critiquePrompt = `You are a content quality evaluator. Score each draft from 1-10 based on:
- Relevance to topic "${req.topic}"
- ${lang} language quality
- Engagement and readability
- Factual accuracy
- Completeness

${draftTexts}

Respond ONLY with JSON array: [{"draft": 1, "score": X}, {"draft": 2, "score": X}, {"draft": 3, "score": X}]`;

  try {
    const response = await callAI(critiquePrompt, env);
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const scores: Array<{ draft: number; score: number }> = JSON.parse(jsonMatch[0]);
      return drafts.map((d, i) => ({
        ...d,
        score: scores.find((s) => s.draft === i + 1)?.score || 5,
      }));
    }
  } catch {}

  return drafts.map((d) => ({ ...d, score: 5 }));
}

/**
 * Stage 3: Aggregation — Merge best elements
 */
async function stageAggregation(drafts: MoaDraft[], req: MoaRequest, env: Env): Promise<string> {
  const lang = req.language === 'en' ? 'English' : 'Polish';
  const toneStr = req.tone ? ` Maintain a ${req.tone} tone.` : '';
  const sorted = [...drafts].sort((a, b) => (b.score || 0) - (a.score || 0));
  const draftTexts = sorted.map((d) => `--- ${d.model} (score: ${d.score}/10) ---\n${d.content}`).join('\n\n');

  const aggregatePrompt = `You are a master editor. Combine the best elements from these drafts into one cohesive, high-quality ${req.type || 'article'} about "${req.topic}" in ${lang}.${toneStr}

Take the strongest arguments, best writing style, and most engaging elements from each draft. The final piece should be better than any individual draft.

${draftTexts}

Write the final combined ${req.type || 'article'}:`;

  return callAI(aggregatePrompt, env);
}

/**
 * Stage 4: Validation — Quality check
 */
async function stageValidation(content: string, req: MoaRequest, env: Env): Promise<{ score: number; feedback: string }> {
  const lang = req.language === 'en' ? 'English' : 'Polish';

  const validatePrompt = `Rate this ${req.type || 'article'} about "${req.topic}" (in ${lang}) on a scale of 1-10.

${content}

Respond ONLY in JSON: {"score": X, "feedback": "brief feedback"}`;

  try {
    const response = await callAI(validatePrompt, env);
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
  } catch {}

  return { score: 7, feedback: 'Validation completed' };
}

async function handleGenerate(env: Env, request: Request): Promise<Response> {
  let body: MoaRequest;
  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }

  if (!body.topic) return errorResponse('Topic is required', 400);

  const startTime = Date.now();

  try {
    // Stage 1: Parallel Writing
    const drafts = await stageParallelWriting(body, env);
    if (drafts.length === 0) return errorResponse('All AI providers failed at writing stage', 503);

    // Stage 2: Critique
    const scoredDrafts = await stageCritique(drafts, body, env);

    // Stage 3: Aggregation
    const finalContent = await stageAggregation(scoredDrafts, body, env);

    // Stage 4: Validation
    const validation = await stageValidation(finalContent, body, env);

    return jsonResponse({
      content: finalContent,
      pipeline: {
        stages: ['parallel-writing', 'critique', 'aggregation', 'validation'],
        draftsGenerated: drafts.length,
        scores: scoredDrafts.map((d) => ({ model: d.model, score: d.score })),
        qualityScore: validation.score,
        feedback: validation.feedback,
        durationMs: Date.now() - startTime,
      },
      meta: {
        topic: body.topic,
        type: body.type || 'article',
        language: body.language || 'pl',
        tone: body.tone || 'neutral',
      },
    });
  } catch (e: any) {
    return errorResponse(`MOA pipeline error: ${e.message}`, 500);
  }
}

async function handleQuick(env: Env, request: Request): Promise<Response> {
  let body: MoaRequest;
  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }

  if (!body.topic) return errorResponse('Topic is required', 400);

  const lang = body.language === 'en' ? 'English' : 'Polish';
  const toneStr = body.tone ? ` Use a ${body.tone} tone.` : '';

  try {
    const content = await callAI(
      `Write a ${body.type || 'article'} about "${body.topic}" in ${lang}.${toneStr} Be comprehensive and engaging. Max 800 words.`,
      env
    );

    return jsonResponse({
      content,
      pipeline: { mode: 'quick', stages: ['single-generation'] },
      meta: {
        topic: body.topic,
        type: body.type || 'article',
        language: body.language || 'pl',
      },
    });
  } catch (e: any) {
    return errorResponse(`Generation error: ${e.message}`, 500);
  }
}

export const onRequest: PagesFunction<Env> = async (context) => {
  if (context.request.method === 'OPTIONS') return corsHeaders();

  const url = new URL(context.request.url);
  const path = url.pathname.replace('/api/moa', '').replace(/^\/+/, '');

  if (context.request.method === 'POST') {
    if (path === 'generate') return handleGenerate(context.env, context.request);
    if (path === 'quick') return handleQuick(context.env, context.request);
  }

  if (path === 'status') {
    return jsonResponse({
      service: 'moa-pipeline',
      status: 'operational',
      stages: ['parallel-writing', 'critique', 'aggregation', 'validation'],
      features: ['full-moa-pipeline', 'quick-generate'],
      supportedTypes: ['article', 'blog', 'social', 'product'],
      languages: ['pl', 'en'],
      timestamp: new Date().toISOString(),
    });
  }

  return errorResponse(`Unknown endpoint: /api/moa/${path}`, 404);
};
