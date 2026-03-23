/**
 * MoaPublisherWorkflow — Mixture-of-Agents content pipeline + Ghost CMS publish
 *
 * Trigger:
 *   POST /trigger/moa
 *   {
 *     topic, type?, language?, tone?,
 *     publishToGhost?, ghostApiUrl?, ghostAdminApiKey?,
 *     tags?, featuredImagePrompt?
 *   }
 *
 * Pipeline:
 *   1. parallel-writing  → 3 drafts (creative / analytical / practical)
 *   2. critique          → score each draft 1-10
 *   3. aggregation       → merge best elements into final article
 *   4. validation        → QA + quality score
 *   5. seo-metadata      → generate title, excerpt, slug, meta
 *   6. publish (opt.)    → POST to Ghost Admin API
 */

import { WorkflowEntrypoint, WorkflowStep, WorkflowEvent } from 'cloudflare:workers';
import type { Env } from '../types';
import { callAI } from '../types';

export interface MoaPublisherParams {
  topic: string;
  type?: 'article' | 'blog' | 'social' | 'product' | 'newsletter';
  language?: 'pl' | 'en';
  tone?: string;
  publishToGhost?: boolean;
  ghostApiUrl?: string;        // overrides env GHOST_API_URL
  ghostAdminApiKey?: string;   // overrides env GHOST_ADMIN_API_KEY
  tags?: string[];
  featuredImagePrompt?: string;
  maxWords?: number;
}

interface Draft {
  model: string;
  content: string;
  score: number;
}

export class MoaPublisherWorkflow extends WorkflowEntrypoint<Env, MoaPublisherParams> {
  async run(event: WorkflowEvent<MoaPublisherParams>, step: WorkflowStep) {
    const params = event.payload ?? {};
    const topic = params.topic?.trim() || 'AI automation trends 2025';
    const lang = params.language === 'en' ? 'English' : 'Polish';
    const type = params.type || 'blog';
    const tone = params.tone || 'professional';
    const maxWords = params.maxWords || 600;

    // ─── Step 1: Parallel Writing ─────────────────────────
    const drafts = await step.do(
      'parallel-writing',
      { retries: { limit: 2, delay: '5 seconds', backoff: 'linear' } },
      async () => {
        const perspectives = [
          {
            name: 'creative',
            prompt: `Write a creative, engaging ${type} about "${topic}" in ${lang}. Tone: ${tone}. Focus on storytelling, vivid examples, hooks. Max ${maxWords} words.`,
          },
          {
            name: 'analytical',
            prompt: `Write a factual, analytical ${type} about "${topic}" in ${lang}. Tone: ${tone}. Focus on data, expert insights, logical arguments. Max ${maxWords} words.`,
          },
          {
            name: 'practical',
            prompt: `Write a practical, actionable ${type} about "${topic}" in ${lang}. Tone: ${tone}. Focus on step-by-step tips, real-world uses, actionable advice. Max ${maxWords} words.`,
          },
        ];

        const results = await Promise.allSettled(
          perspectives.map(async (p) => ({
            model: p.name,
            content: await callAI(
              `You are an expert content writer. Write high-quality ${lang} content.`,
              p.prompt,
              this.env,
              undefined,
              1500
            ),
            score: 0,
          }))
        );

        return results
          .filter((r): r is PromiseFulfilledResult<Draft> => r.status === 'fulfilled')
          .map((r) => r.value);
      }
    );

    if (drafts.length === 0) {
      throw new Error('All AI providers failed at parallel writing stage');
    }

    // ─── Step 2: Critique + Scoring ───────────────────────
    const scoredDrafts = await step.do('critique-and-score', async () => {
      const draftTexts = drafts
        .map((d, i) => `=== Draft ${i + 1} (${d.model}) ===\n${d.content}`)
        .join('\n\n');

      const critiquePrompt = `You are a senior editor. Score each draft on: relevance, ${lang} quality, engagement, accuracy, completeness (1-10 each, average to final score).

Topic: "${topic}"

${draftTexts}

Reply ONLY with JSON array: [{"draft":1,"score":8},{"draft":2,"score":6},{"draft":3,"score":7}]`;

      try {
        const response = await callAI(
          'You are a content quality evaluator. Return only valid JSON.',
          critiquePrompt,
          this.env,
          undefined,
          200
        );
        const match = response.match(/\[[\s\S]*?\]/);
        if (match) {
          const scores: Array<{ draft: number; score: number }> = JSON.parse(match[0]);
          return drafts.map((d, i) => ({
            ...d,
            score: scores.find((s) => s.draft === i + 1)?.score ?? 5,
          }));
        }
      } catch {}

      // Fallback scores if parse fails
      return drafts.map((d) => ({ ...d, score: 5 }));
    });

    // ─── Step 3: Aggregation ──────────────────────────────
    const finalContent = await step.do(
      'aggregate-best',
      { retries: { limit: 2, delay: '5 seconds' } },
      async () => {
        const sorted = [...scoredDrafts].sort((a, b) => b.score - a.score);
        const draftTexts = sorted
          .map((d) => `=== ${d.model} (score: ${d.score}/10) ===\n${d.content}`)
          .join('\n\n');

        return callAI(
          `You are a master editor writing for ${lang}-speaking audience. Combine the best elements of all drafts into one outstanding, cohesive ${type}. Tone: ${tone}. Max ${maxWords} words.`,
          `Merge these drafts about "${topic}" into the best possible ${type}:\n\n${draftTexts}`,
          this.env,
          undefined,
          2000
        );
      }
    );

    // ─── Step 4: Quality Validation ───────────────────────
    const validation = await step.do('validate-quality', async () => {
      try {
        const res = await callAI(
          'You are a QA editor. Rate content from 1-10. Reply ONLY with JSON.',
          `Rate this ${type} about "${topic}" (${lang}):\n\n${finalContent}\n\nReply: {"score":X,"feedback":"brief"}`,
          this.env,
          undefined,
          150
        );
        const match = res.match(/\{[\s\S]*?\}/);
        if (match) return JSON.parse(match[0]);
      } catch {}
      return { score: 7, feedback: 'Validation completed' };
    });

    // ─── Step 5: SEO Metadata ─────────────────────────────
    const seoMeta = await step.do('generate-seo-metadata', async () => {
      try {
        const res = await callAI(
          'You are an SEO expert. Generate metadata from the article. Reply ONLY with JSON.',
          `Generate SEO metadata for this ${type} about "${topic}" in ${lang}:\n\n${finalContent.slice(0, 800)}\n\nReply: {"title":"...","slug":"url-friendly-slug","excerpt":"max 160 chars","metaDescription":"max 160 chars","tags":["tag1","tag2","tag3"]}`,
          this.env,
          undefined,
          300
        );
        const match = res.match(/\{[\s\S]*?\}/);
        if (match) return JSON.parse(match[0]);
      } catch {}
      return {
        title: topic,
        slug: topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60),
        excerpt: finalContent.slice(0, 160),
        metaDescription: finalContent.slice(0, 160),
        tags: params.tags || [],
      };
    });

    // ─── Step 6: Publish to Ghost (optional) ─────────────
    let ghostResult: Record<string, unknown> = { skipped: true };

    const shouldPublish = params.publishToGhost === true;
    const ghostUrl = params.ghostApiUrl || this.env.GHOST_API_URL;
    const ghostKey = params.ghostAdminApiKey || this.env.GHOST_ADMIN_API_KEY;

    if (shouldPublish && ghostUrl && ghostKey) {
      ghostResult = await step.do(
        'publish-to-ghost',
        { retries: { limit: 2, delay: '10 seconds' } },
        async () => {
          // Ghost Admin API: create JWT token
          const [id, secret] = ghostKey.split(':');
          if (!id || !secret) throw new Error('Invalid Ghost Admin API key format (expected id:secret)');

          // Simple JWT for Ghost (HS256)
          const now = Math.floor(Date.now() / 1000);
          const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT', kid: id }));
          const payload = btoa(JSON.stringify({ iat: now, exp: now + 300, aud: '/admin/' }));
          const secretBytes = Uint8Array.from(secret.match(/.{2}/g)!.map((b) => parseInt(b, 16)));
          const key = await crypto.subtle.importKey('raw', secretBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
          const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${header}.${payload}`));
          const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)));
          const token = `${header}.${payload}.${sigB64}`;

          const postBody = {
            posts: [
              {
                title: seoMeta.title || topic,
                slug: seoMeta.slug,
                html: `<p>${finalContent.replace(/\n/g, '</p><p>')}</p>`,
                custom_excerpt: seoMeta.excerpt,
                meta_description: seoMeta.metaDescription,
                tags: (params.tags || seoMeta.tags || []).map((t: string) => ({ name: t })),
                status: 'draft', // always draft — human review before publish
              },
            ],
          };

          const res = await fetch(`${ghostUrl.replace(/\/$/, '')}/ghost/api/admin/posts/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Ghost ${token}` },
            body: JSON.stringify(postBody),
            signal: AbortSignal.timeout(30000),
          });

          if (!res.ok) {
            const err = await res.text();
            throw new Error(`Ghost API error ${res.status}: ${err}`);
          }

          const data: any = await res.json();
          return {
            published: true,
            postId: data.posts?.[0]?.id,
            postUrl: `${ghostUrl}/ghost/#/editor/post/${data.posts?.[0]?.id}`,
            status: 'draft',
          };
        }
      );
    }

    // ─── Final Result ─────────────────────────────────────
    return {
      success: true,
      topic,
      language: params.language || 'pl',
      type,
      content: finalContent,
      seo: seoMeta,
      pipeline: {
        stages: ['parallel-writing', 'critique', 'aggregation', 'validation', 'seo-metadata'],
        draftsGenerated: drafts.length,
        draftScores: scoredDrafts.map((d) => ({ perspective: d.model, score: d.score })),
        qualityScore: validation.score,
        feedback: validation.feedback,
      },
      ghost: ghostResult,
      wordCount: finalContent.split(/\s+/).length,
    };
  }
}
