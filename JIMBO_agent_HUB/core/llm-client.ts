/**
 * LLM Client — obsługuje Anthropic / OpenRouter / OpenAI
 *
 * Ustaw LLM_PROVIDER w .env:
 *   anthropic  → claude-haiku-4-5-20251001  (domyślny, tani, świetny tool-use)
 *   openrouter → google/gemini-2.0-flash-001
 *   openai     → gpt-4o-mini
 */

import OpenAI from "openai";

// Domyślny model HUBa — zmień w .env: OPENROUTER_MODEL=<model-id>
// Zsynchronizowane z config/openrouter-models.ts :: HUB_DEFAULT_MODEL
const HUB_DEFAULT_MODEL = "google/gemini-2.0-flash-001";

export type Message = OpenAI.Chat.Completions.ChatCompletionMessageParam;
export type ToolDefinition = OpenAI.Chat.Completions.ChatCompletionTool;

const PROVIDERS = {
  anthropic: {
    baseURL: "https://api.anthropic.com/v1",
    keyEnv: "ANTHROPIC_API_KEY",
  },
  openrouter: {
    baseURL: "https://openrouter.ai/api/v1",
    keyEnv: "OPENROUTER_API_KEY",
  },
  openai: { baseURL: "https://api.openai.com/v1", keyEnv: "OPENAI_API_KEY" },
} as const;

type Provider = keyof typeof PROVIDERS;

export function getProvider(): Provider {
  const p = (process.env.LLM_PROVIDER ?? "anthropic").toLowerCase();
  return (p in PROVIDERS ? p : "anthropic") as Provider;
}

export function defaultModel(): string {
  const provider = getProvider();
  if (provider === "anthropic")
    return process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5-20251001";
  if (provider === "openrouter")
    return process.env.OPENROUTER_MODEL ?? HUB_DEFAULT_MODEL;
  if (provider === "openai") return process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  return HUB_DEFAULT_MODEL;
}

export function createLLMClient(): OpenAI {
  const provider = getProvider();
  const { baseURL, keyEnv } = PROVIDERS[provider];
  const apiKey = process.env[keyEnv];

  if (!apiKey) {
    console.warn(`[LLM] UWAGA: Brak ${keyEnv} w .env`);
  }

  const headers: Record<string, string> = {
    "HTTP-Referer": "http://localhost:4222",
    "X-Title": "JIMBO-agent-hub",
  };

  // Anthropic wymaga dodatkowego nagłówka wersji API
  if (provider === "anthropic") {
    headers["anthropic-version"] = "2023-06-01";
  }

  console.log(`[LLM] Provider: ${provider} | Model: ${defaultModel()}`);

  return new OpenAI({
    apiKey: apiKey ?? "missing",
    baseURL,
    defaultHeaders: headers,
  });
}

export async function chat(
  client: OpenAI,
  messages: Message[],
  tools?: ToolDefinition[],
  model?: string,
): Promise<OpenAI.Chat.Completions.ChatCompletion> {
  return client.chat.completions.create({
    model: model ?? defaultModel(),
    messages,
    tools: tools?.length ? tools : undefined,
    tool_choice: tools?.length ? "auto" : undefined,
  });
}

export async function chatStream(
  client: OpenAI,
  messages: Message[],
  onChunk: (text: string) => void,
  model?: string,
): Promise<string> {
  const stream = await client.chat.completions.create({
    model: model ?? defaultModel(),
    messages,
    stream: true,
  });

  let full = "";
  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content ?? "";
    if (text) {
      full += text;
      onChunk(text);
    }
  }
  return full;
}
