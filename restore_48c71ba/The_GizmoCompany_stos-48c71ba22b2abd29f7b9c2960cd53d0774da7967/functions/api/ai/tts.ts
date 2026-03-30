/**
 * ZENO Browser — Text-to-Speech (TTS) Endpoint
 * Uses OpenAI TTS API for Polish voice synthesis
 *
 * POST /api/ai/tts
 * Body: { text: "...", voice?: "nova"|"alloy"|"echo"|"fable"|"onyx"|"shimmer", speed?: 1.0 }
 * Returns: audio/mpeg binary stream
 */

import type { Env } from '../../types';
import { errorResponse, corsHeaders } from '../../types';

const OPENAI_TTS_URL = 'https://api.openai.com/v1/audio/speech';
const MAX_TEXT_LENGTH = 4096;
const VALID_VOICES = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'] as const;

interface TTSRequest {
  text: string;
  voice?: string;
  speed?: number;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  if (context.request.method === 'OPTIONS') return corsHeaders();
  if (context.request.method !== 'POST') return errorResponse('POST required', 405);

  const apiKey = context.env.OPENAI_API_KEY;
  if (!apiKey) {
    return errorResponse('OpenAI API key not configured', 503);
  }

  try {
    const body = await context.request.json() as TTSRequest;

    if (!body.text || typeof body.text !== 'string' || body.text.trim().length === 0) {
      return errorResponse('Missing or empty "text" field', 400);
    }
    if (body.text.length > MAX_TEXT_LENGTH) {
      return errorResponse(`Text too long (max ${MAX_TEXT_LENGTH} chars)`, 413);
    }

    const voice = VALID_VOICES.includes(body.voice as any) ? body.voice : 'nova';
    const speed = typeof body.speed === 'number' ? Math.max(0.25, Math.min(4.0, body.speed)) : 1.0;

    const response = await fetch(OPENAI_TTS_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: body.text,
        voice,
        speed,
        response_format: 'mp3',
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return errorResponse(`OpenAI TTS error ${response.status}: ${errText.slice(0, 300)}`, 502);
    }

    return new Response(response.body, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (err: any) {
    return errorResponse(`TTS failed: ${err.message}`, 500);
  }
};
