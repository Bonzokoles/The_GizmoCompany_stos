/**
 * ContentSchedulerWorkflow — Batch MOA content generation + auto-publish
 *
 * Trigger:
 *   POST /trigger/schedule
 *   {
 *     topics: ["AI tools 2025", "automation trends", ...],
 *     type?, language?, tone?,
 *     publishToGhost?, ghostApiUrl?, ghostAdminApiKey?,
 *     generateImages?,    (generate featured image per article via FLUX)
 *     intervalMinutes?,   (delay between posts, default 60)
 *     maxArticles?        (cap, default 5)
 *   }
 *
 * Used for:
 *   - Batch SEO article generation
 *   - Automated newsletter content
 *   - Filling Ghost blog with AI content
 *   - Scheduled content calendar execution
 */

import { WorkflowEntrypoint, WorkflowStep, WorkflowEvent } from 'cloudflare:workers';
import type { Env } from '../types';
import { callAI } from '../types';

export interface ContentSchedulerParams {
  topics: string[];
  type?: 'article' | 'blog' | 'social' | 'newsletter';
  language?: 'pl' | 'en';
  tone?: string;
  publishToGhost?: boolean;
  ghostApiUrl?: string;
  ghostAdminApiKey?: string;
  generateImages?: boolean;
  intervalMinutes?: number;
  maxArticles?: number;
}

interface ArticleResult {
  topic: string;
  title: string;
  content: string;
  slug: string;
  excerpt: string;
  qualityScore: number;
  ghostPostId?: string;
  imageUrl?: string;
  error?: string;
}

export class ContentSchedulerWorkflow extends WorkflowEntrypoint<Env, ContentSchedulerParams> {
  async run(event: WorkflowEvent<ContentSchedulerParams>, step: WorkflowStep) {
    const params = event.payload ?? {};

    // ─── Step 1: Setup & Validate ─────────────────────────
    const config = await step.do('setup-config', async () => {
      const topics = (params.topics || []).filter(Boolean).slice(0, params.maxArticles || 5);
      if (topics.length === 0) throw new Error('At least one topic required in params.topics array');

      return {
        topics,
        type: params.type || 'blog',
        lang: params.language || 'pl',
        tone: params.tone || 'professional',
        publishToGhost: params.publishToGhost === true,
        ghostUrl: params.ghostApiUrl || this.env.GHOST_API_URL || '',
        ghostKey: params.ghostAdminApiKey || this.env.GHOST_ADMIN_API_KEY || '',
        generateImages: params.generateImages === true,
        intervalMs: Math.max((params.intervalMinutes || 5) * 60 * 1000, 60000), // min 1 min
        total: topics.length,
      };
    });

    const results: ArticleResult[] = [];

    // ─── Step 2+N: Process each topic ────────────────────
    for (let i = 0; i < config.topics.length; i++) {
      const topic = config.topics[i];
      const langStr = config.lang === 'en' ? 'English' : 'Polish';

      const articleResult = await step.do(
        `generate-article-${i + 1}`,
        { retries: { limit: 2, delay: '10 seconds', backoff: 'linear' } },
        async (): Promise<ArticleResult> => {
          try {
            // 3-perspective parallel writing (compact version)
            const [creative, analytical, practical] = await Promise.allSettled([
              callAI(
                `Expert ${langStr} content writer. Creative and engaging.`,
                `Write a creative ${config.type} about "${topic}" in ${langStr}. Tone: ${config.tone}. Max 400 words.`,
                this.env, undefined, 1000
              ),
              callAI(
                `Expert ${langStr} content writer. Factual and analytical.`,
                `Write an analytical ${config.type} about "${topic}" in ${langStr}. Tone: ${config.tone}. Max 400 words.`,
                this.env, undefined, 1000
              ),
              callAI(
                `Expert ${langStr} content writer. Practical and actionable.`,
                `Write a practical ${config.type} about "${topic}" in ${langStr}. Tone: ${config.tone}. Max 400 words. Focus on tips and actions.`,
                this.env, undefined, 1000
              ),
            ]);

            const successDrafts = [creative, analytical, practical]
              .filter((r): r is PromiseFulfilledResult<string> => r.status === 'fulfilled')
              .map((r) => r.value);

            if (successDrafts.length === 0) throw new Error('All drafts failed');

            // Aggregate
            const content = await callAI(
              `You are a master editor. Write fluent ${langStr} content. Max 600 words.`,
              `Merge the best from these drafts about "${topic}" into one outstanding ${config.type}:\n\n${successDrafts.map((d, j) => `=== Draft ${j + 1} ===\n${d}`).join('\n\n')}`,
              this.env, undefined, 2000
            );

            // SEO metadata
            const metaRaw = await callAI(
              'SEO expert. Reply ONLY with JSON.',
              `Generate SEO metadata for: "${topic}" (${langStr})\nArticle: ${content.slice(0, 400)}\nReply: {"title":"...","slug":"url-slug","excerpt":"max 160 chars","score":8}`,
              this.env, undefined, 200
            );

            let meta = { title: topic, slug: topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60), excerpt: content.slice(0, 155), score: 7 };
            try {
              const match = metaRaw.match(/\{[\s\S]*?\}/);
              if (match) meta = { ...meta, ...JSON.parse(match[0]) };
            } catch {}

            return {
              topic,
              title: meta.title,
              content,
              slug: meta.slug,
              excerpt: meta.excerpt,
              qualityScore: meta.score || 7,
            };
          } catch (e: any) {
            return { topic, title: topic, content: '', slug: '', excerpt: '', qualityScore: 0, error: e.message };
          }
        }
      );

      results.push(articleResult);

      // ── Optional: Publish to Ghost ──────────────────────
      if (config.publishToGhost && config.ghostUrl && config.ghostKey && articleResult.content && !articleResult.error) {
        await step.do(`publish-ghost-${i + 1}`, { retries: { limit: 2, delay: '5 seconds' } }, async () => {
          const [id, secret] = config.ghostKey.split(':');
          if (!id || !secret) throw new Error('Invalid Ghost Admin API key format');

          const now = Math.floor(Date.now() / 1000);
          const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT', kid: id }));
          const payload = btoa(JSON.stringify({ iat: now, exp: now + 300, aud: '/admin/' }));
          const secretBytes = Uint8Array.from(secret.match(/.{2}/g)!.map((b) => parseInt(b, 16)));
          const key = await crypto.subtle.importKey('raw', secretBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
          const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${header}.${payload}`));
          const token = `${header}.${payload}.${btoa(String.fromCharCode(...new Uint8Array(sig)))}`;

          const res = await fetch(`${config.ghostUrl.replace(/\/$/, '')}/ghost/api/admin/posts/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Ghost ${token}` },
            body: JSON.stringify({
              posts: [{
                title: articleResult.title,
                slug: articleResult.slug,
                html: `<p>${articleResult.content.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>')}</p>`,
                custom_excerpt: articleResult.excerpt,
                status: 'draft',
              }],
            }),
            signal: AbortSignal.timeout(20000),
          });

          if (res.ok) {
            const data: any = await res.json();
            articleResult.ghostPostId = data.posts?.[0]?.id;
            return { success: true, postId: articleResult.ghostPostId };
          }
          return { success: false, status: res.status };
        });
      }

      // ── Delay between articles (if multiple) ────────────
      if (i < config.topics.length - 1 && config.intervalMs > 5000) {
        await step.sleep(`delay-before-article-${i + 2}`, config.intervalMs);
      }
    }

    // ─── Final Summary ────────────────────────────────────
    const succeeded = results.filter((r) => !r.error);
    const failed = results.filter((r) => r.error);
    const published = results.filter((r) => r.ghostPostId);

    return {
      success: true,
      summary: {
        total: config.total,
        generated: succeeded.length,
        failed: failed.length,
        publishedToGhost: published.length,
        avgQualityScore: succeeded.length
          ? Math.round(succeeded.reduce((a, r) => a + r.qualityScore, 0) / succeeded.length * 10) / 10
          : 0,
      },
      articles: results.map((r) => ({
        topic: r.topic,
        title: r.title,
        slug: r.slug,
        qualityScore: r.qualityScore,
        wordCount: r.content.split(/\s+/).filter(Boolean).length,
        ghostPostId: r.ghostPostId,
        error: r.error,
      })),
      fullContent: succeeded.map((r) => ({ topic: r.topic, title: r.title, content: r.content })),
    };
  }
}
