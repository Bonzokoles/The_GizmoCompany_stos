/**
 * ReplicateWorkflow — Image generation via Replicate.com
 *
 * Trigger:
 *   POST /trigger/replicate
 *   {
 *     prompt, negativePrompt?,
 *     model?,      (default: "black-forest-labs/flux-schnell")
 *     width?, height?,
 *     steps?,      (inference steps, default 4 for FLUX Schnell)
 *     saveToR2?,
 *     filename?
 *   }
 *
 * Supported models (popular):
 *   black-forest-labs/flux-schnell       (fastest, free tier) ← default
 *   black-forest-labs/flux-dev           (better quality)
 *   black-forest-labs/flux-1.1-pro       (best, paid)
 *   stability-ai/sdxl                    (Stable Diffusion XL)
 *   stability-ai/stable-diffusion-3      (SD3)
 *   lucataco/flux-dev-lora               (FLUX + LoRA)
 *   ideogram-ai/ideogram-v2              (great for text in images)
 *   recraft-ai/recraft-v3                (design-focused)
 *
 * Flow:
 *   1. validate + prepare payload
 *   2. POST to Replicate /predictions → get prediction ID
 *   3. poll until complete (max 5 min)
 *   4. download image → save to R2 (optional)
 */

import { WorkflowEntrypoint, WorkflowStep, WorkflowEvent } from 'cloudflare:workers';
import type { Env } from '../types';

export interface ReplicateParams {
  prompt: string;
  negativePrompt?: string;
  model?: string;
  width?: number;
  height?: number;
  steps?: number;
  guidanceScale?: number;
  seed?: number;
  saveToR2?: boolean;
  filename?: string;
}

interface ReplicatePrediction {
  id: string;
  status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled';
  output?: string | string[];
  error?: string;
  urls?: { get: string; cancel: string };
}

interface PreparedRequest {
  model: string;
  prompt: string;
  input: Record<string, string | number | boolean>;
  apiToken: string;
}

// Model to version mapping (latest stable versions)
const MODEL_VERSIONS: Record<string, string | null> = {
  'black-forest-labs/flux-schnell': null,    // use deployment (no version needed)
  'black-forest-labs/flux-dev': null,
  'black-forest-labs/flux-1.1-pro': null,
  'stability-ai/sdxl': null,
  'ideogram-ai/ideogram-v2': null,
  'recraft-ai/recraft-v3': null,
};

export class ReplicateWorkflow extends WorkflowEntrypoint<Env, ReplicateParams> {
  async run(event: WorkflowEvent<ReplicateParams>, step: WorkflowStep) {
    const params = event.payload ?? {};

    // ─── Step 1: Prepare ──────────────────────────────────
    const preparedResult = await step.do('prepare-replicate-request', async (): Promise<PreparedRequest> => {
      const apiToken = this.env.REPLICATE_API_TOKEN;
      if (!apiToken) throw new Error('REPLICATE_API_TOKEN secret is not set. Run: wrangler secret put REPLICATE_API_TOKEN');

      const model = params.model || 'black-forest-labs/flux-schnell';
      const prompt = params.prompt?.trim() || 'a beautiful landscape, golden hour, photorealistic';
      const width = Math.min(params.width || 1024, 1440);
      const height = Math.min(params.height || 1024, 1440);
      const steps = params.steps || (model.includes('schnell') ? 4 : 28);

      // Build model-specific input
      let input: Record<string, string | number | boolean> = { prompt, width, height, num_inference_steps: steps };
      if (params.negativePrompt) input.negative_prompt = params.negativePrompt;
      if (params.guidanceScale) input.guidance_scale = params.guidanceScale;
      if (params.seed) input.seed = params.seed;

      // FLUX models use different param names
      if (model.includes('flux')) {
        const fluxInput: Record<string, string | number | boolean> = {
          prompt,
          width,
          height,
          num_inference_steps: steps,
          output_format: 'webp',
          output_quality: 90,
        };
        if (params.seed) fluxInput.seed = params.seed;
        input = fluxInput;
      }

      return { model, prompt, input, apiToken };
    });
    const prepared: PreparedRequest = preparedResult as PreparedRequest;

    // ─── Step 2: Create Prediction ────────────────────────
    const predictionResult = await step.do(
      'create-prediction',
      { retries: { limit: 2, delay: '5 seconds' } },
      async (): Promise<ReplicatePrediction> => {
        const res = await fetch(`https://api.replicate.com/v1/models/${prepared.model}/predictions`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${prepared.apiToken}`,
            'Content-Type': 'application/json',
            Prefer: 'wait=30',
          },
          body: JSON.stringify({ input: prepared.input }),
          signal: AbortSignal.timeout(35000),
        });

        if (!res.ok) {
          const err = await res.text();
          throw new Error(`Replicate API error ${res.status}: ${err}`);
        }

        const data = await res.json();
        return data as ReplicatePrediction;
      }
    );
    const prediction: ReplicatePrediction = predictionResult as ReplicatePrediction;

    // ─── Step 3: Poll for completion (if not done yet) ────
    const completedResult = await step.do(
      'wait-for-completion',
      { timeout: '5 minutes', retries: { limit: 30, delay: '10 seconds' } },
      async (): Promise<ReplicatePrediction> => {
        if (prediction.status === 'succeeded') return prediction;
        if (prediction.status === 'failed' || prediction.status === 'canceled') {
          throw new Error(`Prediction ${prediction.status}: ${prediction.error || 'unknown'}`);
        }

        if (!prediction.urls?.get) throw new Error('No polling URL returned by Replicate');

        let current: ReplicatePrediction = prediction;
        let attempts = 0;
        while (current.status !== 'succeeded' && current.status !== 'failed' && attempts < 30) {
          await new Promise((r) => setTimeout(r, 5000));
          const res = await fetch(current.urls?.get || '', {
            headers: { Authorization: `Bearer ${this.env.REPLICATE_API_TOKEN}` },
            signal: AbortSignal.timeout(15000),
          });
          if (res.ok) {
            current = (await res.json()) as ReplicatePrediction;
          }
          attempts++;
        }

        if (current.status !== 'succeeded') {
          throw new Error(`Replicate generation failed: ${current.error || `status: ${current.status}`}`);
        }
        return current;
      }
    );
    const completed: ReplicatePrediction = completedResult as ReplicatePrediction;

    // Get output URL
    const outputUrl = Array.isArray(completed.output) ? completed.output[0] : completed.output;
    if (!outputUrl) throw new Error('Replicate returned no output URL');

    // ─── Step 4: Download + Save to R2 (optional) ─────────
    let r2Url: string | null = null;
    if (params.saveToR2 !== false) {
      const r2Result = await step.do('save-to-r2', async (): Promise<string> => {
        const imageRes = await fetch(outputUrl, { signal: AbortSignal.timeout(60000) });
        if (!imageRes.ok) throw new Error(`Could not download image from Replicate: ${imageRes.status}`);

        const imageBuffer = await imageRes.arrayBuffer();
        const ext = prepared.model.includes('flux') ? 'webp' : 'png';
        const filename = params.filename || `replicate-${Date.now()}.${ext}`;
        const key = `replicate-images/${filename}`;
        const contentType = ext === 'webp' ? 'image/webp' : 'image/png';

        await this.env.MEDIA_BUCKET.put(key, imageBuffer, {
          httpMetadata: { contentType },
          customMetadata: {
            prompt: prepared.prompt,
            model: prepared.model,
            predictionId: completed.id,
            source: 'replicate',
            generated: new Date().toISOString(),
          },
        });

        return `https://mybonzo-media.r2.dev/${key}`;
      });
      r2Url = r2Result as string;
    }

    const width = (prepared.input.width as number) || 1024;
    const height = (prepared.input.height as number) || 1024;

    return {
      success: true,
      predictionId: completed.id,
      model: prepared.model,
      prompt: prepared.prompt,
      replicateUrl: outputUrl,
      r2Url,
      dimensions: { width, height },
      timestamp: new Date().toISOString(),
    };
  }
}
