/**
 * ZENO Queue Consumer Worker — Production Logic
 *
 * agent-tasks      → AI routing (DeepSeek → OpenRouter fallback), results stored in D1
 * image-processing → Workers AI (generation, analysis, captioning), stored in R2
 * voice-processing → Workers AI Whisper STT, transcript stored in D1, failures → DLQ
 *
 * Deploy: cd workers/queue-consumer && npx wrangler deploy
 * Secrets: wrangler secret put DEEPSEEK_API_KEY && wrangler secret put OPENROUTER_API_KEY
 */

// ─── Types ──────────────────────────────────────────────────

interface QueueMessage {
  type: string;
  source: string;
  timestamp: string;
  data: Record<string, unknown>;
}

interface Env {
  AI: Ai;
  DB: D1Database;
  MEDIA_BUCKET: R2Bucket;
  VOICE_DLQ: Queue;
  DEEPSEEK_API_KEY?: string;
  OPENROUTER_API_KEY?: string;
}

interface AICompletionResponse {
  choices?: Array<{ message?: { content?: string } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
  model?: string;
}

// ─── Main Worker ────────────────────────────────────────────

export default {
  async queue(batch: MessageBatch<QueueMessage>, env: Env): Promise<void> {
    const queueName = batch.queue;
    console.log(`[${queueName}] Processing ${batch.messages.length} message(s)`);

    for (const msg of batch.messages) {
      try {
        const body = msg.body;
        console.log(`[${queueName}] Message: type=${body.type}, source=${body.source}, ts=${body.timestamp}`);

        switch (queueName) {
          case 'agent-tasks':
            await handleAgentTask(body, env);
            break;
          case 'image-processing-queue':
            await handleImageProcessing(body, env);
            break;
          case 'voice-processing':
            await handleVoiceProcessing(body, env);
            break;
          default:
            console.log(`[${queueName}] Unknown queue, ACK`);
        }

        msg.ack();
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error(`[${queueName}] Error:`, errMsg);
        msg.retry({ delaySeconds: 30 });
      }
    }
  },

  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // GET /results?taskId=xxx — query task results
    if (url.pathname === '/results' && request.method === 'GET') {
      const taskId = url.searchParams.get('taskId');
      if (!taskId) {
        return Response.json({ error: 'Missing taskId param' }, { status: 400 });
      }
      const row = await env.DB.prepare('SELECT * FROM queue_results WHERE task_id = ?').bind(taskId).first();
      if (!row) return Response.json({ error: 'Not found' }, { status: 404 });
      return Response.json(row);
    }

    return Response.json({
      worker: 'zeno-queue-consumer',
      status: 'running',
      version: '2.0.0',
      queues: ['agent-tasks', 'image-processing-queue', 'voice-processing'],
      bindings: {
        ai: !!env.AI,
        db: !!env.DB,
        r2: !!env.MEDIA_BUCKET,
        deepseek: !!env.DEEPSEEK_API_KEY,
        openrouter: !!env.OPENROUTER_API_KEY,
      },
      timestamp: new Date().toISOString(),
    });
  },
};

// ─── Agent Tasks Handler ────────────────────────────────────

async function handleAgentTask(body: QueueMessage, env: Env): Promise<void> {
  const task = String(body.data?.task ?? 'unknown');
  const input = String(body.data?.input ?? body.data?.prompt ?? body.data?.url ?? '');
  const model = String(body.data?.model ?? '');
  const language = String(body.data?.language ?? 'pl');
  const taskId = `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  console.log(`[agent-tasks] Task: ${task}, input length: ${input.length}, taskId: ${taskId}`);

  const systemPrompts: Record<string, string> = {
    summarize: `You are a summarization expert. Provide a clear, concise summary in ${language === 'pl' ? 'Polish' : 'English'}.`,
    translate: `You are a professional translator. Translate to ${language === 'pl' ? 'Polish' : 'English'}. Return ONLY the translation.`,
    analyze: `You are an analytical expert. Provide a thorough analysis in ${language === 'pl' ? 'Polish' : 'English'}.`,
    generate: `You are a creative content writer. Write high-quality content in ${language === 'pl' ? 'Polish' : 'English'}.`,
    'code-review': 'You are a senior code reviewer. Analyze the code for bugs, security issues, performance, and best practices.',
  };

  const systemPrompt = systemPrompts[task] ?? `You are a helpful assistant. Perform the task: ${task}`;
  const userPrompt = task === 'summarize' ? `Summarize the following:\n\n${input}` :
                     task === 'translate' ? `Translate:\n\n${input}` :
                     task === 'analyze' ? `Analyze:\n\n${input}` :
                     task === 'code-review' ? `Review this code:\n\n${input}` :
                     input || `Perform task: ${task}`;

  let result: string;
  let providerUsed: string;
  let tokensUsed = 0;

  // Try DeepSeek first (cheapest), then OpenRouter
  const aiResult = await callExternalAI(systemPrompt, userPrompt, env, model);
  result = aiResult.content;
  providerUsed = aiResult.provider;
  tokensUsed = aiResult.tokens;

  console.log(`[agent-tasks] Completed via ${providerUsed}, tokens: ${tokensUsed}, result length: ${result.length}`);

  // Store in D1
  await storeResult(env.DB, {
    taskId,
    queue: 'agent-tasks',
    taskType: task,
    provider: providerUsed,
    tokens: tokensUsed,
    resultLength: result.length,
    result: result.slice(0, 10000), // cap at 10k chars for D1
    status: 'completed',
  });

  console.log(`[agent-tasks] Result stored: ${taskId}`);
}

// ─── Image Processing Handler ───────────────────────────────

async function handleImageProcessing(body: QueueMessage, env: Env): Promise<void> {
  const action = String(body.data?.action ?? 'analyze');
  const imageUrl = String(body.data?.url ?? body.data?.imageUrl ?? '');
  const prompt = String(body.data?.prompt ?? body.data?.description ?? '');
  const taskId = `img-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  console.log(`[image-processing] Action: ${action}, taskId: ${taskId}`);

  let result: string;
  let r2Key: string | null = null;

  switch (action) {
    case 'generate': {
      // Workers AI: text-to-image
      console.log(`[image-processing] Generating image: "${prompt.slice(0, 80)}..."`);
      const aiResult = await env.AI.run('@cf/bytedance/stable-diffusion-xl-lightning', {
        prompt: prompt || 'A beautiful landscape',
      });

      // Workers AI text-to-image returns ReadableStream
      const stream = aiResult as unknown as ReadableStream<Uint8Array>;
      const reader = stream.getReader();
      const chunks: Uint8Array[] = [];
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) chunks.push(value);
      }
      const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
      const imageData = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        imageData.set(chunk, offset);
        offset += chunk.length;
      }

      // Store to R2
      r2Key = `queue/generated/${taskId}.png`;
      await env.MEDIA_BUCKET.put(r2Key, imageData, {
        httpMetadata: { contentType: 'image/png' },
        customMetadata: { prompt, taskId, generatedAt: new Date().toISOString() },
      });

      result = `Image generated and stored: ${r2Key} (${imageData.length} bytes)`;
      console.log(`[image-processing] ${result}`);
      break;
    }

    case 'caption':
    case 'analyze': {
      // Workers AI: image-to-text
      if (!imageUrl) throw new Error('No image URL provided for analysis');

      console.log(`[image-processing] Analyzing: ${imageUrl.slice(0, 100)}`);
      const imgResp = await fetch(imageUrl, { signal: AbortSignal.timeout(15000) });
      if (!imgResp.ok) throw new Error(`Failed to fetch image: ${imgResp.status}`);

      const imageBytes = new Uint8Array(await imgResp.arrayBuffer());

      const caption = await env.AI.run('@cf/meta/llama-3.2-11b-vision-instruct', {
        messages: [{
          role: 'user',
          content: prompt || 'Describe this image in detail. Include colors, objects, mood, and composition.',
        }],
        image: [...imageBytes],
      }) as { response?: string };

      result = caption.response ?? 'No caption generated';
      console.log(`[image-processing] Caption: ${result.slice(0, 200)}`);
      break;
    }

    default:
      result = `Unknown action: ${action}`;
      console.log(`[image-processing] ${result}`);
  }

  await storeResult(env.DB, {
    taskId,
    queue: 'image-processing-queue',
    taskType: action,
    provider: 'workers-ai',
    tokens: 0,
    resultLength: result.length,
    result: result.slice(0, 10000),
    r2Key,
    status: 'completed',
  });
}

// ─── Voice Processing Handler ───────────────────────────────

async function handleVoiceProcessing(body: QueueMessage, env: Env): Promise<void> {
  const action = String(body.data?.action ?? 'transcribe');
  const audioUrl = String(body.data?.audioUrl ?? body.data?.url ?? '');
  const language = String(body.data?.language ?? body.data?.lang ?? 'pl');
  const taskId = `voice-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  console.log(`[voice-processing] Action: ${action}, lang: ${language}, taskId: ${taskId}`);

  if (!audioUrl) {
    throw new Error('No audio URL provided');
  }

  // Fetch audio
  console.log(`[voice-processing] Fetching audio: ${audioUrl.slice(0, 100)}`);
  const audioResp = await fetch(audioUrl, {
    signal: AbortSignal.timeout(30000),
    headers: { 'User-Agent': 'ZENO-Browser/1.0 (queue-consumer)' },
  });
  if (!audioResp.ok) throw new Error(`Failed to fetch audio: ${audioResp.status}`);
  const audioBytes = new Uint8Array(await audioResp.arrayBuffer());
  console.log(`[voice-processing] Audio size: ${audioBytes.length} bytes`);

  // Workers AI: Whisper STT
  const sttResult = await env.AI.run('@cf/openai/whisper-tiny-en', {
    audio: [...audioBytes],
  }) as { text?: string; vtt?: string };

  const transcript = sttResult.text ?? '';
  console.log(`[voice-processing] Transcript (${transcript.length} chars): ${transcript.slice(0, 200)}`);

  // Optionally translate if language !== 'en'
  let finalText = transcript;
  if (language === 'pl' && transcript.length > 0) {
    try {
      const translated = await callExternalAI(
        'You are a translator. Translate the following English text to Polish. Return ONLY the translation.',
        transcript,
        env,
      );
      finalText = translated.content;
      console.log(`[voice-processing] Translated to PL (${finalText.length} chars)`);
    } catch (e) {
      console.log(`[voice-processing] Translation failed, keeping English transcript`);
    }
  }

  // Store audio to R2 for reference
  const r2Key = `queue/audio/${taskId}.audio`;
  await env.MEDIA_BUCKET.put(r2Key, audioBytes, {
    customMetadata: { taskId, language, sourceUrl: audioUrl },
  });

  await storeResult(env.DB, {
    taskId,
    queue: 'voice-processing',
    taskType: action,
    provider: 'workers-ai/whisper',
    tokens: 0,
    resultLength: finalText.length,
    result: finalText.slice(0, 10000),
    r2Key,
    status: 'completed',
  });

  console.log(`[voice-processing] Done: ${taskId}`);
}

// ─── AI Helper (external providers) ─────────────────────────

async function callExternalAI(
  systemPrompt: string,
  userPrompt: string,
  env: Env,
  model?: string,
): Promise<{ content: string; provider: string; tokens: number }> {

  // 1) DeepSeek — cheapest ($0.0014/MTok)
  if (env.DEEPSEEK_API_KEY) {
    try {
      const resp = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.DEEPSEEK_API_KEY}`,
        },
        body: JSON.stringify({
          model: model || 'deepseek-chat',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: 4096,
          temperature: 0.7,
        }),
        signal: AbortSignal.timeout(45000),
      });

      if (resp.ok) {
        const data = (await resp.json()) as AICompletionResponse;
        return {
          content: data.choices?.[0]?.message?.content ?? '',
          provider: 'deepseek',
          tokens: data.usage?.total_tokens ?? 0,
        };
      }
      console.log(`[ai] DeepSeek failed: ${resp.status}`);
    } catch (e) {
      console.log(`[ai] DeepSeek error: ${e instanceof Error ? e.message : e}`);
    }
  }

  // 2) OpenRouter — multi-model fallback ($0.003/MTok)
  if (env.OPENROUTER_API_KEY) {
    try {
      const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'https://zenbrowsers.org',
          'X-Title': 'ZENO Queue Consumer',
        },
        body: JSON.stringify({
          model: model || 'deepseek/deepseek-chat',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: 4096,
          temperature: 0.7,
        }),
        signal: AbortSignal.timeout(45000),
      });

      if (resp.ok) {
        const data = (await resp.json()) as AICompletionResponse;
        return {
          content: data.choices?.[0]?.message?.content ?? '',
          provider: 'openrouter',
          tokens: data.usage?.total_tokens ?? 0,
        };
      }
      console.log(`[ai] OpenRouter failed: ${resp.status}`);
    } catch (e) {
      console.log(`[ai] OpenRouter error: ${e instanceof Error ? e.message : e}`);
    }
  }

  // 3) Workers AI — free tier fallback
  if (env.AI) {
    try {
      const result = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 2048,
      }) as { response?: string };
      return {
        content: result.response ?? '',
        provider: 'workers-ai/llama-3.1-8b',
        tokens: 0,
      };
    } catch (e) {
      console.log(`[ai] Workers AI error: ${e instanceof Error ? e.message : e}`);
    }
  }

  throw new Error('No AI provider available — set DEEPSEEK_API_KEY or OPENROUTER_API_KEY');
}

// ─── D1 Storage Helper ──────────────────────────────────────

interface ResultRecord {
  taskId: string;
  queue: string;
  taskType: string;
  provider: string;
  tokens: number;
  resultLength: number;
  result: string;
  r2Key?: string | null;
  status: string;
}

async function storeResult(db: D1Database, record: ResultRecord): Promise<void> {
  try {
    await db.prepare(`
      INSERT INTO queue_results (task_id, queue, task_type, provider, tokens, result_length, result, r2_key, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).bind(
      record.taskId,
      record.queue,
      record.taskType,
      record.provider,
      record.tokens,
      record.resultLength,
      record.result,
      record.r2Key ?? null,
      record.status,
    ).run();
  } catch (e) {
    // Log but don't fail the queue message — processing succeeded, storage is secondary
    console.error(`[db] Failed to store result: ${e instanceof Error ? e.message : e}`);
  }
}
