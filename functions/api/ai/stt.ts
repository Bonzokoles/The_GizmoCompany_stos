/**
 * ZENO Browser — Speech-to-Text (STT) Endpoint
 * Uses CF Workers AI Whisper Large V3 Turbo for Polish speech recognition
 *
 * POST /api/ai/stt
 * Body: { audio: "<base64 audio>" } or raw audio binary
 * Returns: { text, language, duration, words? }
 */

import type { Env } from '../../types';
import { jsonResponse, errorResponse, corsHeaders } from '../../types';

const MAX_AUDIO_SIZE = 25 * 1024 * 1024; // 25 MB

export const onRequest: PagesFunction<Env> = async (context) => {
  if (context.request.method === 'OPTIONS') return corsHeaders();
  if (context.request.method !== 'POST') return errorResponse('POST required', 405);

  try {
    const contentType = context.request.headers.get('content-type') || '';
    let audioBytes: number[];

    if (contentType.includes('application/json')) {
      const body = await context.request.json() as { audio?: string; language?: string };
      if (!body.audio || typeof body.audio !== 'string') {
        return errorResponse('Missing "audio" field (base64 encoded)', 400);
      }
      if (body.audio.length > MAX_AUDIO_SIZE * 1.37) {
        return errorResponse('Audio too large (max 25MB)', 413);
      }
      // Decode base64 to raw bytes
      const binaryStr = atob(body.audio);
      const u8 = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        u8[i] = binaryStr.charCodeAt(i);
      }
      audioBytes = [...u8];
    } else {
      // Raw binary audio — use directly, no base64 round-trip
      const buffer = await context.request.arrayBuffer();
      if (buffer.byteLength === 0) {
        return errorResponse('Empty audio data', 400);
      }
      if (buffer.byteLength > MAX_AUDIO_SIZE) {
        return errorResponse('Audio too large (max 25MB)', 413);
      }
      audioBytes = [...new Uint8Array(buffer)];
    }

    if (audioBytes.length === 0) {
      return errorResponse('Empty audio data', 400);
    }

    const result = await context.env.AI.run('@cf/openai/whisper-large-v3-turbo' as any, {
      audio: audioBytes,
      language: 'pl',
      vad_filter: true,
    });

    return jsonResponse({
      text: result.text || '',
      language: (result as any).transcription_info?.language || 'pl',
      duration: (result as any).transcription_info?.duration || 0,
      words: (result as any).segments?.[0]?.words || [],
      word_count: (result as any).word_count || 0,
    });
  } catch (err: any) {
    return errorResponse(`STT failed: ${err.message}`, 500);
  }
};
