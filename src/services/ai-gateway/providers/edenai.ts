/**
 * EdenAI Provider - Multi-provider Aggregation
 */

import axios, { AxiosInstance } from 'axios';
import { AIProvider, AIRequest, AIResponse } from './index';

export class EdenAIProvider implements AIProvider {
  name: 'edenai' = 'edenai';
  displayName = 'EdenAI';
  enabled = true;
  priority = 3;
  endpoint = 'https://api.edenai.run/v1';
  apiKey: string;
  models = ['openai.gpt-4', 'huggingfaceh4.zephyr-7b-beta'];
  maxQueueLength = 50;
  rateLimit = { rpm: 50 };
  timeout = 30000;
  capabilities: AIProvider['capabilities'] = ['text-generation', 'vision'];
  costPerMToken = 0.0015;

  private client: AxiosInstance;

  constructor(config: { apiKey: string; priority?: number; enabled?: boolean }) {
    this.apiKey = config.apiKey;
    this.priority = config.priority ?? 3;
    this.enabled = config.enabled ?? true;

    this.client = axios.create({
      baseURL: this.endpoint,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
      timeout: this.timeout,
    });
  }

  async execute(request: AIRequest): Promise<AIResponse> {
    const startTime = Date.now();

    try {
      const response = await this.client.post('/text/generation', {
        providers: ['openai'],
        text: request.prompt,
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxTokens ?? 2048,
      });

      const latency = Date.now() - startTime;

      return {
        id: `edenai-${Date.now()}`,
        content: response.data.result.generated_text,
        model: request.model || 'edenai-default',
        tokens: { input: 0, output: 0, total: 0 },
        latency,
        cached: false,
        provider: 'edenai',
        timestamp: new Date(),
      };
    } catch (error: any) {
      throw new Error(`EdenAI API Error: ${error.message}`);
    }
  }

  getStatus() {
    return { name: this.name, enabled: this.enabled, priority: this.priority };
  }
}