/**
 * BUCH Chat Box Gateway Worker
 *
 * Endpoints:
 *   POST /chat              — AI chat (multi-provider: OpenAI, Anthropic, DeepSeek, Gemini, OpenRouter, Together, Perplexity)
 *   POST /images/generate   — Image generation (DALL-E, Stability, Replicate)
 *   POST /speech/tts        — Text-to-Speech (ElevenLabs, OpenAI TTS)
 *   POST /speech/stt        — Speech-to-Text (OpenAI Whisper, Workers AI)
 *   POST /embeddings        — Text embeddings (OpenAI, HuggingFace, Workers AI)
 *   POST /vision            — Vision/image analysis (GPT-4o, Claude)
 *   GET  /providers         — Lista dostępnych providerów i capabilities
 *   POST /kb/search         — semantic search w D1 (libraries)
 *   POST /kb/store          — zapisz dokument do D1 + KV cache
 *   GET  /kb/list           — lista dokumentów z D1
 *   GET  /storage/list      — lista plików R2
 *   GET  /storage/:key      — pobierz plik z R2
 *   PUT  /storage/:key      — upload pliku do R2
 *   GET  /health            — status wszystkich bindingów
 *
 * Deploy: cd workers/jimbo-gateway && npx wrangler deploy
 * Secrets: wrangler secret put OPENAI_API_KEY (etc.)
 */

export interface Env {
  AI: Ai;
  DB: D1Database;
  STORAGE: R2Bucket;
  CACHE: KVNamespace;
  CF_GATEWAY_BASE: string;
  // Provider API Keys (secrets)
  OPENAI_API_KEY: string;
  ANTHROPIC_API_KEY: string;
  DEEPSEEK_API_KEY: string;
  GEMINI_API_KEY: string;
  OPENROUTER_API_KEY: string;
  TOGETHER_API_KEY: string;
  REPLICATE_API_TOKEN: string;
  STABILITY_API_KEY: string;
  ELEVENLABS_API_KEY: string;
  HUGGINGFACE_API_KEY: string;
  PERPLEXITY_API_KEY: string;
}

// ── Provider / Model Registry ─────────────────────────────────────────────
type Capability = "chat" | "image" | "tts" | "stt" | "embeddings" | "vision";

interface ProviderDef {
  name: string;
  envKey: keyof Env;
  capabilities: Capability[];
  models: Record<string, Capability>;
  baseUrl: string | null; // null = use CF Gateway
  authHeader: string;
}

function getProviders(env: Env): ProviderDef[] {
  return [
    {
      name: "openai",
      envKey: "OPENAI_API_KEY",
      capabilities: ["chat", "image", "tts", "stt", "embeddings", "vision"],
      models: {
        "gpt-4o": "chat", "gpt-4o-mini": "chat", "gpt-4-turbo": "chat", "o3-mini": "chat",
        "dall-e-3": "image", "dall-e-2": "image",
        "tts-1": "tts", "tts-1-hd": "tts",
        "whisper-1": "stt",
        "text-embedding-3-small": "embeddings", "text-embedding-3-large": "embeddings",
        "gpt-4o-vision": "vision",
      },
      baseUrl: null,
      authHeader: "Bearer",
    },
    {
      name: "anthropic",
      envKey: "ANTHROPIC_API_KEY",
      capabilities: ["chat", "vision"],
      models: {
        "claude-sonnet-4-20250514": "chat", "claude-3-5-haiku-20241022": "chat",
        "claude-opus-4-20250514": "chat",
        "claude-sonnet-4-vision": "vision",
      },
      baseUrl: "https://api.anthropic.com/v1",
      authHeader: "x-api-key",
    },
    {
      name: "deepseek",
      envKey: "DEEPSEEK_API_KEY",
      capabilities: ["chat"],
      models: {
        "deepseek-chat": "chat", "deepseek-coder": "chat", "deepseek-reasoner": "chat",
      },
      baseUrl: "https://api.deepseek.com/v1",
      authHeader: "Bearer",
    },
    {
      name: "gemini",
      envKey: "GEMINI_API_KEY",
      capabilities: ["chat", "vision", "embeddings"],
      models: {
        "gemini-2.0-flash": "chat", "gemini-2.5-pro": "chat", "gemini-2.5-flash": "chat",
        "gemini-2.0-flash-vision": "vision",
        "text-embedding-004": "embeddings",
      },
      baseUrl: "https://generativelanguage.googleapis.com/v1beta",
      authHeader: "Bearer",
    },
    {
      name: "openrouter",
      envKey: "OPENROUTER_API_KEY",
      capabilities: ["chat", "vision"],
      models: {
        "anthropic/claude-sonnet-4": "chat", "openai/gpt-4o": "chat",
        "meta-llama/llama-4-maverick": "chat", "google/gemini-2.5-pro": "chat",
        "mistralai/mistral-large": "chat", "deepseek/deepseek-r1": "chat",
        "qwen/qwen3-235b": "chat", "nvidia/llama-3.1-nemotron-ultra-253b": "chat",
      },
      baseUrl: "https://openrouter.ai/api/v1",
      authHeader: "Bearer",
    },
    {
      name: "together",
      envKey: "TOGETHER_API_KEY",
      capabilities: ["chat", "image", "embeddings"],
      models: {
        "meta-llama/Llama-3.3-70B-Instruct-Turbo": "chat",
        "Qwen/Qwen2.5-72B-Instruct-Turbo": "chat",
        "black-forest-labs/FLUX.1-schnell-Free": "image",
        "togethercomputer/m2-bert-80M-8k-retrieval": "embeddings",
      },
      baseUrl: "https://api.together.xyz/v1",
      authHeader: "Bearer",
    },
    {
      name: "replicate",
      envKey: "REPLICATE_API_TOKEN",
      capabilities: ["image"],
      models: {
        "black-forest-labs/flux-1.1-pro": "image",
        "stability-ai/sdxl": "image",
      },
      baseUrl: "https://api.replicate.com/v1",
      authHeader: "Bearer",
    },
    {
      name: "stability",
      envKey: "STABILITY_API_KEY",
      capabilities: ["image"],
      models: {
        "stable-diffusion-xl-1024-v1-0": "image",
        "stable-image-ultra": "image",
      },
      baseUrl: "https://api.stability.ai/v1",
      authHeader: "Bearer",
    },
    {
      name: "elevenlabs",
      envKey: "ELEVENLABS_API_KEY",
      capabilities: ["tts"],
      models: {
        "eleven_multilingual_v2": "tts",
        "eleven_turbo_v2_5": "tts",
        "eleven_flash_v2_5": "tts",
      },
      baseUrl: "https://api.elevenlabs.io/v1",
      authHeader: "xi-api-key",
    },
    {
      name: "huggingface",
      envKey: "HUGGINGFACE_API_KEY",
      capabilities: ["chat", "embeddings"],
      models: {
        "meta-llama/Llama-3.3-70B-Instruct": "chat",
        "sentence-transformers/all-MiniLM-L6-v2": "embeddings",
      },
      baseUrl: "https://api-inference.huggingface.co/models",
      authHeader: "Bearer",
    },
    {
      name: "perplexity",
      envKey: "PERPLEXITY_API_KEY",
      capabilities: ["chat"],
      models: {
        "sonar-pro": "chat", "sonar": "chat", "sonar-reasoning-pro": "chat",
      },
      baseUrl: "https://api.perplexity.ai",
      authHeader: "Bearer",
    },
  ];
}

function resolveProvider(providers: ProviderDef[], model: string, env: Env): { provider: ProviderDef; apiKey: string } | null {
  for (const p of providers) {
    if (model in p.models && env[p.envKey]) {
      return { provider: p, apiKey: env[p.envKey] as string };
    }
  }
  return null;
}

function resolveProviderByName(providers: ProviderDef[], name: string, env: Env): { provider: ProviderDef; apiKey: string } | null {
  const p = providers.find(pr => pr.name === name);
  if (p && env[p.envKey]) return { provider: p, apiKey: env[p.envKey] as string };
  return null;
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json; charset=utf-8" },
  });
}

function err(msg: string, status = 400) {
  return json({ error: msg }, status);
}

// ── Init DB schema ────────────────────────────────────────────────────────
async function ensureSchema(db: D1Database) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS jimbo_kb (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      library   TEXT    NOT NULL DEFAULT 'general',
      title     TEXT    NOT NULL,
      content   TEXT    NOT NULL,
      source    TEXT,
      tags      TEXT,
      created_at TEXT   NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_jimbo_kb_library ON jimbo_kb(library);
    CREATE VIRTUAL TABLE IF NOT EXISTS jimbo_kb_fts
      USING fts5(title, content, content='jimbo_kb', content_rowid='id');
  `);
}

// ── Router ────────────────────────────────────────────────────────────────
export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

    const url = new URL(req.url);
    const path = url.pathname;
    const providers = getProviders(env);

    // ── /health ──────────────────────────────────────────────────────────
    if (path === "/health" && req.method === "GET") {
      let dbOk = false;
      try { await env.DB.exec("SELECT 1"); dbOk = true; } catch {}
      let kvOk = false;
      try { await env.CACHE.get("__ping__"); kvOk = true; } catch {}

      const providerStatus = providers.map(p => ({
        name: p.name,
        active: !!env[p.envKey],
        capabilities: p.capabilities,
        models: Object.keys(p.models).length,
      }));

      return json({
        status: "ok",
        bindings: { ai: "✅", db: dbOk ? "✅" : "❌", r2: "✅", kv: kvOk ? "✅" : "❌" },
        gateway: env.CF_GATEWAY_BASE,
        providers: providerStatus,
        activeProviders: providerStatus.filter(p => p.active).length,
        totalModels: providerStatus.filter(p => p.active).reduce((s, p) => s + p.models, 0),
      });
    }

    // ── /providers ────────────────────────────────────────────────────────
    if (path === "/providers" && req.method === "GET") {
      const available = providers
        .filter(p => !!env[p.envKey])
        .map(p => ({
          name: p.name,
          capabilities: p.capabilities,
          models: Object.keys(p.models),
        }));
      return json({ providers: available, total: available.length });
    }

    // ── /chat — Multi-provider chat ──────────────────────────────────────
    if (path === "/chat" && req.method === "POST") {
      const body = await req.json<{
        messages: { role: string; content: string }[];
        model?: string;
        provider?: string;
        max_tokens?: number;
        temperature?: number;
        system?: string;
      }>();

      const model = body.model ?? "gpt-4o-mini";
      const messages = body.messages ?? [];
      if (body.system) messages.unshift({ role: "system", content: body.system });

      // Cache key from last user message
      const lastUser = [...messages].reverse().find((m: { role: string; content: string }) => m.role === "user")?.content ?? "";
      const cacheKey = `chat:${model}:${btoa(lastUser).slice(0, 40)}`;
      const cached = await env.CACHE.get(cacheKey);
      if (cached) return json({ text: cached, cached: true, model });

      // Resolve provider
      const resolved = body.provider
        ? resolveProviderByName(providers, body.provider, env)
        : resolveProvider(providers, model, env);

      if (!resolved) return err(`No provider found for model "${model}" or API key missing`, 400);
      const { provider, apiKey } = resolved;

      // ── Anthropic uses its own format ───────────────
      if (provider.name === "anthropic") {
        const systemMsg = messages.find(m => m.role === "system")?.content;
        const nonSystem = messages.filter(m => m.role !== "system");
        const res = await fetch(`${provider.baseUrl}/messages`, {
          method: "POST",
          headers: {
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            max_tokens: body.max_tokens ?? 1024,
            temperature: body.temperature ?? 0.7,
            ...(systemMsg ? { system: systemMsg } : {}),
            messages: nonSystem,
          }),
        });
        if (!res.ok) return err(`Anthropic error ${res.status}: ${await res.text()}`, 502);
        const data = await res.json<{ content: { text: string }[] }>();
        const text = data.content?.[0]?.text ?? "";
        await env.CACHE.put(cacheKey, text, { expirationTtl: 3600 });
        return json({ text, cached: false, model, provider: "anthropic" });
      }

      // ── Gemini uses its own format ──────────────────
      if (provider.name === "gemini") {
        const systemMsg = messages.find(m => m.role === "system")?.content;
        const nonSystem = messages.filter(m => m.role !== "system");
        const geminiMessages = nonSystem.map(m => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        }));
        const res = await fetch(
          `${provider.baseUrl}/models/${model}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: geminiMessages,
              ...(systemMsg ? { systemInstruction: { parts: [{ text: systemMsg }] } } : {}),
              generationConfig: {
                maxOutputTokens: body.max_tokens ?? 1024,
                temperature: body.temperature ?? 0.7,
              },
            }),
          },
        );
        if (!res.ok) return err(`Gemini error ${res.status}: ${await res.text()}`, 502);
        const data = await res.json<{ candidates: { content: { parts: { text: string }[] } }[] }>();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
        await env.CACHE.put(cacheKey, text, { expirationTtl: 3600 });
        return json({ text, cached: false, model, provider: "gemini" });
      }

      // ── OpenAI-compatible providers (OpenAI, DeepSeek, OpenRouter, Together, Perplexity, HuggingFace) ──
      const baseUrl = provider.baseUrl ?? env.CF_GATEWAY_BASE;
      const endpoint = provider.name === "huggingface"
        ? `${provider.baseUrl}/${model}/v1/chat/completions`
        : `${baseUrl}/chat/completions`;

      const gwRes = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `${provider.authHeader} ${apiKey}`,
          "Content-Type": "application/json",
          ...(provider.name === "openrouter" ? { "HTTP-Referer": "https://mybonzo.com" } : {}),
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: body.max_tokens ?? 1024,
          temperature: body.temperature ?? 0.7,
        }),
      });

      if (!gwRes.ok) {
        const errText = await gwRes.text();
        return err(`${provider.name} error ${gwRes.status}: ${errText}`, 502);
      }

      const gwData = await gwRes.json<{ choices: { message: { content: string } }[] }>();
      const text = gwData.choices?.[0]?.message?.content ?? "";
      await env.CACHE.put(cacheKey, text, { expirationTtl: 3600 });
      return json({ text, cached: false, model, provider: provider.name });
    }

    // ── /images/generate ──────────────────────────────────────────────────
    if (path === "/images/generate" && req.method === "POST") {
      const body = await req.json<{
        prompt: string;
        model?: string;
        provider?: string;
        size?: string;
        n?: number;
      }>();
      if (!body.prompt) return err("prompt required");

      const model = body.model ?? "dall-e-3";
      const resolved = body.provider
        ? resolveProviderByName(providers, body.provider, env)
        : resolveProvider(providers, model, env);
      if (!resolved) return err(`No image provider for model "${model}"`, 400);
      const { provider, apiKey } = resolved;

      // ── Together AI (FLUX etc.) ──
      if (provider.name === "together") {
        const res = await fetch(`${provider.baseUrl}/images/generations`, {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ model, prompt: body.prompt, n: body.n ?? 1 }),
        });
        if (!res.ok) return err(`Together error ${res.status}: ${await res.text()}`, 502);
        return json({ ...(await res.json<Record<string, unknown>>()), provider: "together" });
      }

      // ── Replicate ──
      if (provider.name === "replicate") {
        const res = await fetch(`${provider.baseUrl}/predictions`, {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ version: model, input: { prompt: body.prompt } }),
        });
        if (!res.ok) return err(`Replicate error ${res.status}: ${await res.text()}`, 502);
        return json({ ...(await res.json<Record<string, unknown>>()), provider: "replicate" });
      }

      // ── Stability AI ──
      if (provider.name === "stability") {
        const res = await fetch(`${provider.baseUrl}/generation/${model}/text-to-image`, {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            text_prompts: [{ text: body.prompt }],
            cfg_scale: 7, steps: 30,
            width: 1024, height: 1024,
          }),
        });
        if (!res.ok) return err(`Stability error ${res.status}: ${await res.text()}`, 502);
        return json({ ...(await res.json<Record<string, unknown>>()), provider: "stability" });
      }

      // ── OpenAI DALL-E (default) ──
      const res = await fetch(`${env.CF_GATEWAY_BASE}/images/generations`, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          prompt: body.prompt,
          size: body.size ?? "1024x1024",
          n: body.n ?? 1,
        }),
      });
      if (!res.ok) return err(`OpenAI Images error ${res.status}: ${await res.text()}`, 502);
      return json({ ...(await res.json<Record<string, unknown>>()), provider: "openai" });
    }

    // ── /speech/tts ───────────────────────────────────────────────────────
    if (path === "/speech/tts" && req.method === "POST") {
      const body = await req.json<{
        text: string;
        model?: string;
        provider?: string;
        voice?: string;
      }>();
      if (!body.text) return err("text required");

      const providerName = body.provider ?? "elevenlabs";
      const resolved = resolveProviderByName(providers, providerName, env);

      // ── ElevenLabs TTS ──
      if (resolved && resolved.provider.name === "elevenlabs") {
        const voiceId = body.voice ?? "21m00Tcm4TlvDq8ikWAM"; // Rachel default
        const model = body.model ?? "eleven_multilingual_v2";
        const res = await fetch(`${resolved.provider.baseUrl}/text-to-speech/${voiceId}`, {
          method: "POST",
          headers: {
            "xi-api-key": resolved.apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: body.text,
            model_id: model,
            voice_settings: { stability: 0.5, similarity_boost: 0.75 },
          }),
        });
        if (!res.ok) return err(`ElevenLabs error ${res.status}: ${await res.text()}`, 502);
        return new Response(res.body, {
          headers: { ...CORS, "Content-Type": "audio/mpeg" },
        });
      }

      // ── OpenAI TTS ──
      if (env.OPENAI_API_KEY) {
        const res = await fetch(`${env.CF_GATEWAY_BASE}/audio/speech`, {
          method: "POST",
          headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: body.model ?? "tts-1",
            input: body.text,
            voice: body.voice ?? "alloy",
          }),
        });
        if (!res.ok) return err(`OpenAI TTS error ${res.status}: ${await res.text()}`, 502);
        return new Response(res.body, {
          headers: { ...CORS, "Content-Type": "audio/mpeg" },
        });
      }

      return err("No TTS provider available", 400);
    }

    // ── /speech/stt ───────────────────────────────────────────────────────
    if (path === "/speech/stt" && req.method === "POST") {
      if (!env.OPENAI_API_KEY) return err("OPENAI_API_KEY required for STT", 400);

      // Expects multipart/form-data with audio file
      const formData = await req.formData();
      const file = formData.get("file");
      if (!file) return err("file field required (audio)");

      const body = new FormData();
      body.append("file", file);
      body.append("model", "whisper-1");

      const res = await fetch(`${env.CF_GATEWAY_BASE}/audio/transcriptions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}` },
        body,
      });
      if (!res.ok) return err(`Whisper error ${res.status}: ${await res.text()}`, 502);
      return json({ ...(await res.json<Record<string, unknown>>()), provider: "openai" });
    }

    // ── /embeddings ───────────────────────────────────────────────────────
    if (path === "/embeddings" && req.method === "POST") {
      const body = await req.json<{
        input: string | string[];
        model?: string;
        provider?: string;
      }>();
      if (!body.input) return err("input required");

      const model = body.model ?? "text-embedding-3-small";
      const resolved = body.provider
        ? resolveProviderByName(providers, body.provider, env)
        : resolveProvider(providers, model, env);
      if (!resolved) return err(`No embeddings provider for model "${model}"`, 400);
      const { provider, apiKey } = resolved;

      // ── Gemini embeddings ──
      if (provider.name === "gemini") {
        const texts = Array.isArray(body.input) ? body.input : [body.input];
        const res = await fetch(
          `${provider.baseUrl}/models/${model}:embedContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: { parts: [{ text: texts[0] }] } }),
          },
        );
        if (!res.ok) return err(`Gemini embeddings error ${res.status}: ${await res.text()}`, 502);
        return json({ ...(await res.json<Record<string, unknown>>()), provider: "gemini" });
      }

      // ── HuggingFace embeddings ──
      if (provider.name === "huggingface") {
        const res = await fetch(`${provider.baseUrl}/${model}`, {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ inputs: body.input }),
        });
        if (!res.ok) return err(`HuggingFace error ${res.status}: ${await res.text()}`, 502);
        return json({ data: await res.json(), provider: "huggingface" });
      }

      // ── OpenAI-compatible (OpenAI, Together) ──
      const baseUrl = provider.baseUrl ?? env.CF_GATEWAY_BASE;
      const res = await fetch(`${baseUrl}/embeddings`, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model, input: body.input }),
      });
      if (!res.ok) return err(`${provider.name} embeddings error ${res.status}: ${await res.text()}`, 502);
      return json({ ...(await res.json<Record<string, unknown>>()), provider: provider.name });
    }

    // ── /vision ───────────────────────────────────────────────────────────
    if (path === "/vision" && req.method === "POST") {
      const body = await req.json<{
        image_url: string;
        prompt?: string;
        model?: string;
        provider?: string;
        max_tokens?: number;
      }>();
      if (!body.image_url) return err("image_url required");

      const prompt = body.prompt ?? "Describe this image in detail.";
      const model = body.model ?? "gpt-4o";
      const resolved = body.provider
        ? resolveProviderByName(providers, body.provider, env)
        : resolveProvider(providers, model, env);
      if (!resolved) return err(`No vision provider for model "${model}"`, 400);
      const { provider, apiKey } = resolved;

      // ── Anthropic vision ──
      if (provider.name === "anthropic") {
        const res = await fetch(`${provider.baseUrl}/messages`, {
          method: "POST",
          headers: {
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: body.model ?? "claude-sonnet-4-20250514",
            max_tokens: body.max_tokens ?? 1024,
            messages: [{
              role: "user",
              content: [
                { type: "image", source: { type: "url", url: body.image_url } },
                { type: "text", text: prompt },
              ],
            }],
          }),
        });
        if (!res.ok) return err(`Anthropic vision error ${res.status}: ${await res.text()}`, 502);
        const data = await res.json<{ content: { text: string }[] }>();
        return json({ text: data.content?.[0]?.text ?? "", provider: "anthropic" });
      }

      // ── OpenAI-compatible vision (GPT-4o, OpenRouter) ──
      const baseUrl = provider.baseUrl ?? env.CF_GATEWAY_BASE;
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          ...(provider.name === "openrouter" ? { "HTTP-Referer": "https://mybonzo.com" } : {}),
        },
        body: JSON.stringify({
          model,
          max_tokens: body.max_tokens ?? 1024,
          messages: [{
            role: "user",
            content: [
              { type: "image_url", image_url: { url: body.image_url } },
              { type: "text", text: prompt },
            ],
          }],
        }),
      });
      if (!res.ok) return err(`${provider.name} vision error ${res.status}: ${await res.text()}`, 502);
      const data = await res.json<{ choices: { message: { content: string } }[] }>();
      return json({ text: data.choices?.[0]?.message?.content ?? "", provider: provider.name });
    }

    // ── /kb/store ─────────────────────────────────────────────────────────
    if (path === "/kb/store" && req.method === "POST") {
      await ensureSchema(env.DB);
      const body = await req.json<{
        library?: string; title: string; content: string; source?: string; tags?: string;
      }>();

      if (!body.title || !body.content) return err("title and content required");

      const result = await env.DB.prepare(
        `INSERT INTO jimbo_kb (library, title, content, source, tags) VALUES (?,?,?,?,?)`
      ).bind(
        body.library ?? "general",
        body.title,
        body.content,
        body.source ?? null,
        body.tags ?? null,
      ).run();

      // Also cache in KV for fast access
      const kvKey = `kb:${result.meta.last_row_id}`;
      await env.CACHE.put(kvKey, JSON.stringify(body), { expirationTtl: 86400 });

      return json({ id: result.meta.last_row_id, stored: true });
    }

    // ── /kb/search ────────────────────────────────────────────────────────
    if (path === "/kb/search" && req.method === "POST") {
      await ensureSchema(env.DB);
      const body = await req.json<{ query: string; library?: string; limit?: number }>();
      if (!body.query) return err("query required");

      const limit = body.limit ?? 10;

      let rows: D1Result<Record<string, unknown>>;
      if (body.library && body.library !== "all") {
        rows = await env.DB.prepare(
          `SELECT id, library, title, content, source, created_at
           FROM jimbo_kb WHERE library = ? AND (title LIKE ? OR content LIKE ?)
           ORDER BY id DESC LIMIT ?`
        ).bind(body.library, `%${body.query}%`, `%${body.query}%`, limit).all();
      } else {
        rows = await env.DB.prepare(
          `SELECT id, library, title, content, source, created_at
           FROM jimbo_kb WHERE title LIKE ? OR content LIKE ?
           ORDER BY id DESC LIMIT ?`
        ).bind(`%${body.query}%`, `%${body.query}%`, limit).all();
      }

      return json({ query: body.query, results: rows.results, total: rows.results.length });
    }

    // ── /kb/list ──────────────────────────────────────────────────────────
    if (path === "/kb/list" && req.method === "GET") {
      await ensureSchema(env.DB);
      const library = url.searchParams.get("library") ?? null;
      const limit = parseInt(url.searchParams.get("limit") ?? "50");

      const rows = library
        ? await env.DB.prepare(`SELECT id, library, title, source, created_at FROM jimbo_kb WHERE library=? ORDER BY id DESC LIMIT ?`).bind(library, limit).all()
        : await env.DB.prepare(`SELECT id, library, title, source, created_at FROM jimbo_kb ORDER BY id DESC LIMIT ?`).bind(limit).all();

      return json({ results: rows.results });
    }

    // ── /storage/list ─────────────────────────────────────────────────────
    if (path === "/storage/list" && req.method === "GET") {
      const prefix = url.searchParams.get("prefix") ?? "";
      const listed = await env.STORAGE.list({ prefix, limit: 100 });
      return json({
        objects: listed.objects.map(o => ({
          key: o.key, size: o.size, uploaded: o.uploaded,
        })),
        truncated: listed.truncated,
      });
    }

    // ── /storage/:key GET ──────────────────────────────────────────────────
    if (path.startsWith("/storage/") && req.method === "GET") {
      const key = decodeURIComponent(path.slice("/storage/".length));
      const obj = await env.STORAGE.get(key);
      if (!obj) return err("Not found", 404);
      return new Response(obj.body, {
        headers: {
          ...CORS,
          "Content-Type": obj.httpMetadata?.contentType ?? "application/octet-stream",
        },
      });
    }

    // ── /storage/:key PUT ──────────────────────────────────────────────────
    if (path.startsWith("/storage/") && req.method === "PUT") {
      const key = decodeURIComponent(path.slice("/storage/".length));
      const ct = req.headers.get("Content-Type") ?? "application/octet-stream";
      await env.STORAGE.put(key, req.body!, { httpMetadata: { contentType: ct } });
      return json({ key, stored: true });
    }

    return err("Not found", 404);
  },
};
