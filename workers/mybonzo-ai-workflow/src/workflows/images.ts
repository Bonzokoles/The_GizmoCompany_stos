/**
 * ImageGenWorkflow — Image generation via Cloudflare Workers AI
 *
 * Trigger:
 *   POST /trigger/image
 *   { prompt, style?, width?, height?, model?, saveToR2?, filename? }
 *
 * Available CF AI models:
 *   @cf/stabilityai/stable-diffusion-xl-base-1.0  (default)
 *   @cf/bytedance/stable-diffusion-xl-lightning    (faster)
 *   @cf/lykon/dreamshaper-8-lcm                   (artistic)
 *
 * Steps:
 *   1. validate + enrich prompt (AI adds style details)
 *   2. generate image via CF Workers AI
 *   3. save to R2 (optional)
 *   4. return URL or base64
 */

import { WorkflowEntrypoint, WorkflowStep, WorkflowEvent } from 'cloudflare:workers';
import type { Env } from '../types';
import { callAI } from '../types';

export interface ImageGenParams {
  prompt: string;
  style?: string;
  width?: number;
  height?: number;
  model?: string;
  saveToR2?: boolean;
  filename?: string;
  enhancePrompt?: boolean;
}

const CF_MODELS: Record<string, string> = {
  default: '@cf/stabilityai/stable-diffusion-xl-base-1.0',
  fast: '@cf/bytedance/stable-diffusion-xl-lightning',
  artistic: '@cf/lykon/dreamshaper-8-lcm',
  xl: '@cf/stabilityai/stable-diffusion-xl-base-1.0',
};

export class ImageGenWorkflow extends WorkflowEntrypoint<Env, ImageGenParams> {
  async run(event: WorkflowEvent<ImageGenParams>, step: WorkflowStep) {
    const params = event.payload ?? {};

    // ─── Step 1: Prepare Prompt ───────────────────────────
    const prepared = await step.do('prepare-prompt', async () => {
      const basePrompt = params.prompt?.trim() || 'a beautiful landscape, photorealistic';
      const style = params.style?.trim();
      const width = Math.min(params.width || 1024, 2048);
      const height = Math.min(params.height || 1024, 2048);
      const modelKey = params.model || 'default';
      const cfModel = CF_MODELS[modelKey] || params.model || CF_MODELS.default;

      let finalPrompt = style ? `${basePrompt}, ${style} style` : basePrompt;

      // Enhance prompt with AI if requested
      if (params.enhancePrompt) {
        try {
          const enhanced = await callAI(
            'You are an expert image prompt engineer. Enhance the given prompt with artistic details, lighting, composition. Return ONLY the enhanced prompt, max 200 characters.',
            finalPrompt,
            this.env,
            undefined,
            200
          );
          finalPrompt = enhanced.trim();
        } catch {
          // keep original prompt
        }
      }

      return { prompt: finalPrompt, width, height, cfModel, style };
    });

    // ─── Step 2: Generate Image ────────────────────────────
    const generated = await step.do(
      'generate-image',
      { retries: { limit: 2, delay: '10 seconds', backoff: 'linear' }, timeout: '5 minutes' },
      async () => {
        const cfAccountId = this.env.CF_ACCOUNT_ID;
        const cfToken = this.env.CF_API_TOKEN;
        const timestamp = new Date().toISOString();

        // Try CF API (account-level, better quota)
        if (cfAccountId && cfToken) {
          const res = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/ai/run/${prepared.cfModel}`,
            {
              method: 'POST',
              headers: { Authorization: `Bearer ${cfToken}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ prompt: prepared.prompt, width: prepared.width, height: prepared.height }),
              signal: AbortSignal.timeout(120000),
            }
          );

          if (res.ok) {
            const imageBuffer = await res.arrayBuffer();
            return {
              imageBuffer,
              format: 'png',
              provider: 'cf-api',
              model: prepared.cfModel,
              timestamp,
              bytes: imageBuffer.byteLength,
            };
          }
        }

        // Fallback: Workers AI binding (built-in)
        const res: any = await this.env.AI.run(prepared.cfModel as any, {
          prompt: prepared.prompt,
          width: prepared.width,
          height: prepared.height,
        });

        const imageBuffer = res instanceof ArrayBuffer ? res : (res as any).data;
        return {
          imageBuffer,
          format: 'png',
          provider: 'cf-binding',
          model: prepared.cfModel,
          timestamp,
          bytes: imageBuffer?.byteLength || 0,
        };
      }
    );

    // ─── Step 3: Save to R2 (optional) ────────────────────
    let r2Url: string | null = null;
    if (params.saveToR2 !== false && generated.imageBuffer) {
      r2Url = await step.do('save-to-r2', async () => {
        const filename = params.filename || `generated-${Date.now()}.png`;
        const key = `ai-images/${filename}`;

        await this.env.MEDIA_BUCKET.put(key, generated.imageBuffer, {
          httpMetadata: { contentType: 'image/png' },
          customMetadata: {
            prompt: prepared.prompt,
            model: prepared.cfModel,
            generated: generated.timestamp,
          },
        });

        return `https://mybonzo-media.r2.dev/${key}`;
      });
    }

    return {
      success: true,
      prompt: prepared.prompt,
      model: prepared.cfModel,
      provider: generated.provider,
      dimensions: { width: prepared.width, height: prepared.height },
      bytes: generated.bytes,
      r2Url,
      timestamp: generated.timestamp,
      note: r2Url ? 'Image saved to R2' : 'Image generated in-memory (no R2 save)',
    };
  }
}
