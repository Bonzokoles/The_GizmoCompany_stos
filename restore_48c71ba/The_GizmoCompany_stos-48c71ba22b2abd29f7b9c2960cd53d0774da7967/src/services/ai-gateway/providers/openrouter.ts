/**
 * OpenRouter Provider - Multi-model Aggregator
 */

import axios, { AxiosInstance } from 'axios';
import { AIProvider, AIRequest, AIResponse } from './index';

export class OpenRouterProvider implements AIProvider {
  name: 'openrouter' = 'openrouter';
  displayName = 'OpenRouter';
  enabled = true;
  priority = 2;
  endpoint = 'https://openrouter.io/api/v1';
  apiKey: string;
  models = ['anthropic/claude-3-opus', 'openai/gpt-4-turbo'];
  maxQueueLength = 50;
  rateLimit = { rpm: 100 };
  timeout = 30000;
  capabilities: AIProvider['capabilities'] = ['text-generation', 'code-generation', 'vision'];
  costPerMToken = 0.002;

  private client: AxiosInstance;

  constructor(config: { apiKey: string; priority?: number; enabled?: boolean }) {
    this.apiKey = config.apiKey;
    this.priority = config.priority ?? 2;
    this.enabled = config.enabled ?? true;

    this.client = axios.create({
      baseURL: this.endpoint,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'HTTP-Referer': 'https://zeno-browser.local',
      },
      timeout: this.timeout,
    });
  }

  async execute(request: AIRequest): Promise<AIResponse> {
    const startTime = Date.now();

    try {
      const response = await this.client.post('/chat/completions', {
        model: request.model || this.models[0],
        messages: [{ role: 'user', content: request.prompt }],
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxTokens ?? 2048,
      });

      const latency = Date.now() - startTime;

      return {
        id: `openrouter-${Date.now()}`,
        content: response.data.choices[0].message.content,
        model: response.data.model,
        tokens: {
          input: response.data.usage.prompt_tokens,
          output: response.data.usage.completion_tokens,
          total: response.data.usage.total_tokens,
        },
        latency,
        cached: false,
        provider: 'openrouter',
        timestamp: new Date(),
        cost: (response.data.usage.total_tokens / 1000000) * this.costPerMToken,
      };
    } catch (error: any) {
      throw new Error(`OpenRouter API Error: ${error.message}`);
    }
  }

  getStatus() {
    return { name: this.name, enabled: this.enabled, priority: this.priority };
  }
}