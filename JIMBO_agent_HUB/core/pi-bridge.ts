/**
 * Pi Bridge — lokalny agent loop przez Ollama OpenAI-compat API
 *
 * Pi (ollama launch pi) to interaktywna integracja — NIE serwer HTTP.
 * Ten bridge reimplementuje logikę Pi: agent loop + tool calling na modelach Ollama.
 *
 * Ollama API: http://localhost:11434/v1 (OpenAI-compatible)
 * Domyślny model: gemma3:4b lub bielik-4.5b (polskie)
 *
 * Różnica względem Goose:
 *   Goose = subprocess z REST API
 *   Pi Bridge = bezpośrednie wywołania Ollama /v1/chat/completions
 */

import OpenAI from "openai";
import { EventEmitter } from "events";

const OLLAMA_BASE = "http://localhost:11434/v1";
const DEFAULT_MODEL = "gemma3:4b";
const POLISH_MODEL = "SpeakLeash/bielik-4.5b-v3.0-instruct:Q8_0";

export interface PiTask {
  id: string;
  instructions: string;
  workdir?: string;
  model?: string;
  tools?: OpenAI.ChatCompletionTool[];
  system?: string;
}

export interface PiTaskResult {
  id: string;
  status: "done" | "error";
  output: string;
  tool_calls?: number;
  model_used: string;
}

export class PiBridge extends EventEmitter {
  private client: OpenAI;

  constructor() {
    super();
    this.client = new OpenAI({
      baseURL: OLLAMA_BASE,
      apiKey: "ollama",
    });
  }

  async checkOllama(): Promise<boolean> {
    try {
      const res = await fetch("http://localhost:11434/api/tags");
      return res.ok;
    } catch {
      return false;
    }
  }

  async listModels(): Promise<string[]> {
    try {
      const res = await fetch("http://localhost:11434/api/tags");
      const data = await res.json() as { models: Array<{ name: string }> };
      return data.models.map((m) => m.name);
    } catch {
      return [];
    }
  }

  async runTask(task: PiTask): Promise<PiTaskResult> {
    const alive = await this.checkOllama();
    if (!alive) {
      return {
        id: task.id,
        status: "error",
        output: "Ollama nie działa. Uruchom: ollama serve",
        model_used: "",
      };
    }

    const model = task.model ?? DEFAULT_MODEL;
    const systemPrompt = task.system ?? "Jesteś lokalnym agentem AI. Wykonuj zadania zwięźle i precyzyjnie.";

    const messages: OpenAI.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: task.instructions },
    ];

    let toolCallCount = 0;
    const MAX_ROUNDS = 5;

    // Agent loop — max 5 rund tool-calling
    for (let round = 0; round < MAX_ROUNDS; round++) {
      const response = await this.client.chat.completions.create({
        model,
        messages,
        tools: task.tools,
        tool_choice: task.tools ? "auto" : undefined,
        temperature: 0.3,
      });

      const msg = response.choices[0].message;
      messages.push(msg);

      // Brak tool calls → finalna odpowiedź
      if (!msg.tool_calls?.length) {
        return {
          id: task.id,
          status: "done",
          output: msg.content ?? "",
          tool_calls: toolCallCount,
          model_used: model,
        };
      }

      // Obsłuż tool calls (loguj — zewnętrzna obsługa po stronie callera)
      toolCallCount += msg.tool_calls.length;
      this.emit("tool_calls", { task_id: task.id, calls: msg.tool_calls });

      // Placeholder wyników narzędzi — caller powinien obsłużyć przez event
      for (const tc of msg.tool_calls) {
        const fnName = (tc as { id: string; function?: { name: string } }).function?.name ?? tc.id;
        messages.push({
          role: "tool",
          tool_call_id: tc.id,
          content: `[Tool ${fnName} wykonany — wynik przekazany przez caller]`,
        });
      }
    }

    return {
      id: task.id,
      status: "done",
      output: (messages.at(-1) as { content?: string })?.content ?? "Przekroczono limit rund",
      tool_calls: toolCallCount,
      model_used: model,
    };
  }

  // Streaming chat — dla ZENO Browser / JIMBO UI
  async streamChat(
    messages: OpenAI.ChatCompletionMessageParam[],
    model: string = DEFAULT_MODEL,
    onChunk: (text: string) => void
  ): Promise<void> {
    const stream = await this.client.chat.completions.create({
      model,
      messages,
      stream: true,
      temperature: 0.4,
    });

    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content ?? "";
      if (text) onChunk(text);
    }
  }

  getPolishModel(): string {
    return POLISH_MODEL;
  }

  getDefaultModel(): string {
    return DEFAULT_MODEL;
  }
}

// Singleton
export const piBridge = new PiBridge();
