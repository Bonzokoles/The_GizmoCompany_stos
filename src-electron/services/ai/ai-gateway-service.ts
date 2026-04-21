/**
 * AI Gateway Service - Direct provider calls (no external backend)
 * Supports: DeepSeek, OpenRouter, Anthropic
 */

import axios, { AxiosInstance } from 'axios';

export interface AIRequest {
  prompt: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  metadata?: any;
}

export interface AIResponse {
  id: string;
  content: string;
  model: string;
  latency: number;
  provider: string;
  cost?: number;
  tokens?: { input: number; output: number; total: number };
}

interface ProviderConfig {
  name: string;
  displayName: string;
  enabled: boolean;
  priority: number;
  apiKey: string;
  endpoint: string;
  defaultModel: string;
  costPerMToken: number;
  client: AxiosInstance;
}

export class AIGatewayService {
  private providers: ProviderConfig[] = [];
  private isReady = false;
  private metrics = {
    totalRequests: 0,
    totalCost: 0,
    avgLatency: 0,
    providerErrors: {} as Record<string, number>,
  };

  constructor() {}

  async initialize(): Promise<void> {
    this.providers = [];

    // DeepSeek — priority 1 (cheapest, good quality)
    const deepseekKey = process.env.DEEPSEEK_API_KEY;
    if (deepseekKey) {
      this.providers.push({
        name: 'deepseek',
        displayName: 'DeepSeek',
        enabled: true,
        priority: 1,
        apiKey: deepseekKey,
        endpoint: 'https://api.deepseek.com/v1',
        defaultModel: 'deepseek-chat',
        costPerMToken: 0.0014,
        client: axios.create({
          baseURL: 'https://api.deepseek.com/v1',
          headers: { 'Authorization': `Bearer ${deepseekKey}`, 'Content-Type': 'application/json' },
          timeout: 60000,
        }),
      });
    }

    // OpenRouter — priority 2 (multi-model)
    const openrouterKey = process.env.OPENROUTER_API_KEY;
    if (openrouterKey) {
      this.providers.push({
        name: 'openrouter',
        displayName: 'OpenRouter',
        enabled: true,
        priority: 2,
        apiKey: openrouterKey,
        endpoint: 'https://openrouter.ai/api/v1',
        defaultModel: 'anthropic/claude-sonnet-4',
        costPerMToken: 0.003,
        client: axios.create({
          baseURL: 'https://openrouter.ai/api/v1',
          headers: {
            'Authorization': `Bearer ${openrouterKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://zeno-browser.local',
          },
          timeout: 60000,
        }),
      });
    }

    // Anthropic — priority 3 (direct, premium)
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (anthropicKey) {
      this.providers.push({
        name: 'anthropic',
        displayName: 'Anthropic',
        enabled: true,
        priority: 3,
        apiKey: anthropicKey,
        endpoint: 'https://api.anthropic.com/v1',
        defaultModel: 'claude-sonnet-4-20250514',
        costPerMToken: 0.015,
        client: axios.create({
          baseURL: 'https://api.anthropic.com/v1',
          headers: {
            'x-api-key': anthropicKey,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json',
          },
          timeout: 60000,
        }),
      });
    }

    this.providers.sort((a, b) => a.priority - b.priority);

    if (this.providers.length > 0) {
      this.isReady = true;
      const names = this.providers.map(p => p.displayName).join(', ');
      console.log(`✅ AI Gateway ready — ${this.providers.length} providers: ${names}`);
    } else {
      console.warn('⚠️ AI Gateway: no API keys configured');
      this.isReady = false;
    }
  }

  async execute(request: AIRequest): Promise<AIResponse> {
    if (!this.isReady || this.providers.length === 0) {
      throw new Error('No AI providers available. Check API keys in .env');
    }

    // If model contains '/' it's likely an OpenRouter model path
    const targetProvider = request.model?.includes('/')
      ? this.providers.find(p => p.name === 'openrouter')
      : undefined;

    // If model starts with 'claude' use Anthropic directly
    const isAnthropicModel = request.model?.startsWith('claude');
    const anthropicProvider = isAnthropicModel
      ? this.providers.find(p => p.name === 'anthropic')
      : undefined;

    const ordered = targetProvider
      ? [targetProvider, ...this.providers.filter(p => p !== targetProvider)]
      : anthropicProvider
        ? [anthropicProvider, ...this.providers.filter(p => p !== anthropicProvider)]
        : this.providers;

    for (const provider of ordered) {
      if (!provider.enabled) continue;
      try {
        const response = await this.callProvider(provider, request);
        this.metrics.totalRequests++;
        this.metrics.totalCost += response.cost ?? 0;
        this.metrics.avgLatency = this.metrics.totalRequests === 1
          ? response.latency
          : (this.metrics.avgLatency * (this.metrics.totalRequests - 1) + response.latency) / this.metrics.totalRequests;
        return response;
      } catch (error: any) {
        console.warn(`⚠️ ${provider.displayName} failed: ${error.message}`);
        this.metrics.providerErrors[provider.name] = (this.metrics.providerErrors[provider.name] ?? 0) + 1;
      }
    }

    throw new Error('All AI providers failed');
  }

  private async callProvider(provider: ProviderConfig, request: AIRequest): Promise<AIResponse> {
    const startTime = Date.now();
    const model = request.model || provider.defaultModel;

    if (provider.name === 'anthropic') {
      return this.callAnthropic(provider, request, model, startTime);
    }

    // OpenAI-compatible API (DeepSeek, OpenRouter)
    const response = await provider.client.post('/chat/completions', {
      model,
      messages: [{ role: 'user', content: request.prompt }],
      temperature: request.temperature ?? 0.7,
      max_tokens: request.maxTokens ?? 4096,
    });

    const latency = Date.now() - startTime;
    const usage = response.data.usage ?? {};

    return {
      id: `${provider.name}-${Date.now()}`,
      content: response.data.choices?.[0]?.message?.content ?? '',
      model: response.data.model ?? model,
      latency,
      provider: provider.name,
      cost: ((usage.total_tokens ?? 0) / 1_000_000) * provider.costPerMToken,
      tokens: {
        input: usage.prompt_tokens ?? 0,
        output: usage.completion_tokens ?? 0,
        total: usage.total_tokens ?? 0,
      },
    };
  }

  private async callAnthropic(
    provider: ProviderConfig,
    request: AIRequest,
    model: string,
    startTime: number
  ): Promise<AIResponse> {
    const response = await provider.client.post('/messages', {
      model,
      max_tokens: request.maxTokens ?? 4096,
      messages: [{ role: 'user', content: request.prompt }],
      temperature: request.temperature ?? 0.7,
    });

    const latency = Date.now() - startTime;
    const usage = response.data.usage ?? {};
    const content = response.data.content
      ?.map((block: any) => block.text ?? '')
      .join('') ?? '';

    return {
      id: response.data.id ?? `anthropic-${Date.now()}`,
      content,
      model: response.data.model ?? model,
      latency,
      provider: 'anthropic',
      cost: ((usage.input_tokens + usage.output_tokens) / 1_000_000) * provider.costPerMToken,
      tokens: {
        input: usage.input_tokens ?? 0,
        output: usage.output_tokens ?? 0,
        total: (usage.input_tokens ?? 0) + (usage.output_tokens ?? 0),
      },
    };
  }

  async getProviderStatus() {
    return this.providers.map(p => ({
      name: p.name,
      displayName: p.displayName,
      enabled: p.enabled,
      priority: p.priority,
      defaultModel: p.defaultModel,
    }));
  }

  async getMetrics() {
    return {
      ...this.metrics,
      providers: this.providers.map(p => ({
        name: p.name,
        displayName: p.displayName,
        enabled: p.enabled,
        priority: p.priority,
      })),
    };
  }

  isAvailable(): boolean {
    return this.isReady;
  }
}