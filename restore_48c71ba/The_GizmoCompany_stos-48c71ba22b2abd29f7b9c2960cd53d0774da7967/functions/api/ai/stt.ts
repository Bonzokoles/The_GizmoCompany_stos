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
    let audioBase64: string;

    if (contentType.includes('application/json')) {
      const body = await context.request.json() as { audio?: string; language?: string };
      if (!body.audio || typeof body.audio !== 'string') {
        return errorResponse('Missing "audio" field (base64 encoded)', 400);
      }
      if (body.audio.length > MAX_AUDIO_SIZE * 1.37) {
        return errorResponse('Audio too large (max 25MB)', 413);
      }
      audioBase64 = body.audio;
    } else {
      // Raw binary audio — convert to base64 string (Whisper expects base64)
      const buffer = await context.request.arrayBuffer();
      if (buffer.byteLength === 0) {
        return errorResponse('Empty audio data', 400);
      }
      if (buffer.byteLength > MAX_AUDIO_SIZE) {
        return errorResponse('Audio too large (max 25MB)', 413);
      }
      const bytes = new Uint8Array(buffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      audioBase64 = btoa(binary);
    }

    if (!audioBase64) {
      return errorResponse('Empty audio data', 400);
    }

    // Whisper expects audio as base64-encoded string
    const result = await context.env.AI.run('@cf/openai/whisper-large-v3-turbo' as any, {
      audio: audioBase64,
      language: 'pl',
      vad_filter: true,
    });

    const text = (result.text || '').trim();

    // If whisper returned nothing, try again without VAD filter (might be filtering real speech)
    if (!text) {
      const retry = await context.env.AI.run('@cf/openai/whisper-large-v3-turbo' as any, {
        audio: audioBase64,
        language: 'pl',
        vad_filter: false,
      });

      const retryText = (retry.text || '').trim();
      return jsonResponse({
        text: retryText,
        language: (retry as any).transcription_info?.language || 'pl',
        duration: (retry as any).transcription_info?.duration || 0,
        words: (retry as any).segments?.[0]?.words || [],
        word_count: (retry as any).word_count || 0,
        retried: true,
      });
    }

    return jsonResponse({
      text,
      language: (result as any).transcription_info?.language || 'pl',
      duration: (result as any).transcription_info?.duration || 0,
      words: (result as any).segments?.[0]?.words || [],
      word_count: (result as any).word_count || 0,
    });
  } catch (err: any) {
    return errorResponse(`STT failed: ${err.message}`, 500);
  }
};
