/**
 * AI Gateway - Core Implementation
 */

import { LRUCache } from 'lru-cache';
import { AIRequest, AIResponse, AIProvider, AIProviderType } from './providers/index';
import { DeepSeekProvider } from './providers/deepseek';
import { OpenRouterProvider } from './providers/openrouter';
import { EdenAIProvider } from './providers/edenai';

interface AIGatewayConfig {
  providers: {
    [key in AIProviderType]?: {
      apiKey: string;
      enabled?: boolean;
      priority?: number;
    };
  };
  cacheConfig?: {
    enabled?: boolean;
    maxSize?: number;
    ttl?: number;
  };
  monitoring?: {
    enabled?: boolean;
    metricsInterval?: number;
  };
}

export class AIGateway {
  private providers: Map<string, AIProvider> = new Map();
  private cache: LRUCache<string, AIResponse>;
  private rateLimiters: Map<string, RateLimiter> = new Map();
  private metrics = {
    totalRequests: 0,
    cacheHits: 0,
    totalCost: 0,
    providerErrors: new Map<string, number>(),
    avgLatency: 0,
  };

  constructor(config: AIGatewayConfig) {
    this.initializeProviders(config);
    this.cache = new LRUCache({
      max: config.cacheConfig?.maxSize ?? 5000,
      ttl: (config.cacheConfig?.ttl ?? 3600) * 1000,
    });
    this.setupMonitoring(config.monitoring);
  }

  private initializeProviders(config: AIGatewayConfig) {
    const providerMap: Partial<Record<AIProviderType, new (...args: any[]) => AIProvider>> = {
      deepseek: DeepSeekProvider,
      openrouter: OpenRouterProvider,
      edenai: EdenAIProvider,
    };

    for (const [key, providerConfig] of Object.entries(config.providers)) {
      if (providerConfig?.enabled && providerConfig.apiKey) {
        const ProviderClass = providerMap[key as AIProviderType];
        if (ProviderClass) {
          const provider = new ProviderClass({
            apiKey: providerConfig.apiKey,
            priority: providerConfig.priority,
            enabled: true,
          });

          this.providers.set(key, provider);
          this.rateLimiters.set(key, new RateLimiter(provider.rateLimit.rpm));

          console.log(`✅ ${key} provider initialized (priority: ${providerConfig.priority})`);
        }
      }
    }
  }

  async execute(request: AIRequest): Promise<AIResponse> {
    const cacheKey = this.generateCacheKey(request);

    // 1. Check cache
    const cached = this.cache.get(cacheKey);
    if (cached) {
      this.metrics.cacheHits++;
      return { ...cached, cached: true };
    }

    // 2. Select best provider
    const provider = await this.selectProvider(request);
    if (!provider) {
      throw new Error('No available AI providers configured');
    }

    // 3. Check rate limit
    const limiter = this.rateLimiters.get(provider.name);
    if (limiter && !limiter.canMakeRequest()) {
      console.warn(`⚠️ Rate limit exceeded for ${provider.name}, trying fallback...`);
      return this.fallbackToNextProvider(request, provider.name);
    }

    // 4. Execute
    try {
      const response = await provider.execute(request);

      // 5. Cache result
      this.cache.set(cacheKey, response);

      // 6. Update metrics
      this.metrics.totalRequests++;
      this.metrics.totalCost += response.cost ?? 0;
      this.updateLatencyMetrics(response.latency);

      console.log(
        `✅ Response from ${provider.name} (${response.latency}ms, cost: $${response.cost?.toFixed(4)})`
      );

      return response;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`❌ ${provider.name} error: ${msg}`);
      this.recordError(provider.name);
      return this.fallbackToNextProvider(request, provider.name);
    }
  }

  private async selectProvider(request: AIRequest): Promise<AIProvider | null> {
    const sorted = Array.from(this.providers.values())
      .filter((p) => p.enabled)
      .sort((a, b) => a.priority - b.priority);

    for (const provider of sorted) {
      const limiter = this.rateLimiters.get(provider.name);
      if (!limiter || limiter.canMakeRequest()) {
        return provider;
      }
    }

    return null;
  }

  private async fallbackToNextProvider(
    request: AIRequest,
    skipProvider: string
  ): Promise<AIResponse> {
    const sorted = Array.from(this.providers.values())
      .filter((p) => p.enabled && p.name !== skipProvider)
      .sort((a, b) => a.priority - b.priority);

    for (const provider of sorted) {
      try {
        const response = await provider.execute(request);
        return response;
      } catch (error) {
        continue;
      }
    }

    throw new Error('All AI providers failed');
  }

  private generateCacheKey(request: AIRequest): string {
    const promptHash = Buffer.from(request.prompt).toString('base64').substring(0, 20);
    return `${request.model || 'default'}:${promptHash}:${request.temperature ?? 0.7}`;
  }

  private recordError(providerName: string) {
    this.metrics.providerErrors.set(
      providerName,
      (this.metrics.providerErrors.get(providerName) ?? 0) + 1
    );
  }

  private updateLatencyMetrics(latency: number) {
    this.metrics.avgLatency =
      (this.metrics.avgLatency * (this.metrics.totalRequests - 1) + latency) /
      this.metrics.totalRequests;
  }

  private setupMonitoring(config?: any) {
    if (!config?.enabled) return;

    setInterval(() => {
      console.log('\n📊 AI Gateway Metrics:');
      console.log(`  Total Requests: ${this.metrics.totalRequests}`);
      console.log(`  Cache Hits: ${this.metrics.cacheHits} (${((this.metrics.cacheHits / this.metrics.totalRequests) * 100).toFixed(1)}%)`);
      console.log(`  Avg Latency: ${this.metrics.avgLatency.toFixed(0)}ms`);
      console.log(`  Total Cost: $${this.metrics.totalCost.toFixed(2)}`);
      console.log(`  Errors: ${this.metrics.providerErrors.size > 0 ? JSON.stringify(Object.fromEntries(this.metrics.providerErrors)) : 'none'}`);
      console.log('');
    }, config?.metricsInterval ?? 60000);
  }

  getMetrics() {
    return {
      ...this.metrics,
      providers: Array.from(this.providers.values()).map((p) => ({
        name: p.name,
        enabled: p.enabled,
        priority: p.priority,
      })),
      cacheSize: this.cache.size,
    };
  }

  clearCache() {
    this.cache.clear();
    console.log('✅ Cache cleared');
  }
}

// Rate Limiter
class RateLimiter {
  private requests: number[] = [];
  private rpm: number;
  private windowSize = 60000;

  constructor(rpm: number) {
    this.rpm = rpm;
  }

  canMakeRequest(): boolean {
    const now = Date.now();
    const cutoff = now - this.windowSize;

    this.requests = this.requests.filter((t) => t > cutoff);

    if (this.requests.length < this.rpm) {
      this.requests.push(now);
      return true;
    }

    return false;
  }
}

export type { AIGatewayConfig };