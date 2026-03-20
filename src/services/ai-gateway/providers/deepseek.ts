/**
 * DeepSeek Provider - Primary for Deep Research
 */

import axios, { AxiosInstance } from 'axios';
import { AIProvider, AIRequest, AIResponse, AICapability } from './index';

export class DeepSeekProvider implements AIProvider {
  name: 'deepseek' = 'deepseek';
  displayName = 'DeepSeek';
  enabled = true;
  priority = 1;
  endpoint = 'https://api.deepseek.com/v1';
  apiKey: string;
  models = ['deepseek-chat', 'deepseek-coder'];
  maxQueueLength = 50;
  rateLimit = { rpm: 60, tokensPerMinute: 1000000 };
  timeout = 60000;
  capabilities: AICapability[] = ['text-generation', 'reasoning', 'code-generation'];
  costPerMToken = 0.0014;

  private client: AxiosInstance;

  constructor(config: { apiKey: string; priority?: number; enabled?: boolean }) {
    this.apiKey = config.apiKey;
    this.priority = config.priority ?? 1;
    this.enabled = config.enabled ?? true;

    this.client = axios.create({
      baseURL: this.endpoint,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: this.timeout,
    });
  }

  async execute(request: AIRequest): Promise<AIResponse> {
    const startTime = Date.now();

    try {
      const response = await this.client.post('/chat/completions', {
        model: request.model || 'deepseek-chat',
        messages: [{ role: 'user', content: request.prompt }],
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxTokens ?? 2048,
      });

      const latency = Date.now() - startTime;

      return {
        id: `deepseek-${Date.now()}`,
        content: response.data.choices[0].message.content,
        model: response.data.model,
        tokens: {
          input: response.data.usage.prompt_tokens,
          output: response.data.usage.completion_tokens,
          total: response.data.usage.total_tokens,
        },
        latency,
        cached: false,
        provider: 'deepseek',
        timestamp: new Date(),
        cost: (response.data.usage.total_tokens / 1000000) * this.costPerMToken,
      };
    } catch (error: any) {
      throw new Error(`DeepSeek API Error: ${error.message}`);
    }
  }

  getStatus() {
    return { name: this.name, enabled: this.enabled, priority: this.priority };
  }
}