/**
 * AI Gateway - Main Entry Point
 * Multi-provider router: DeepSeek, OpenRouter, EdenAI
 */

import { AIGateway, AIGatewayConfig } from './gateway';
import { DeepSeekProvider } from './providers/deepseek';
import { OpenRouterProvider } from './providers/openrouter';
import { EdenAIProvider } from './providers/edenai';

// Load configuration from environment
// CR-007: Use .trim() to detect empty/whitespace-only API keys
const gatewayConfig: AIGatewayConfig = {
  providers: {
    deepseek: {
      apiKey: process.env.DEEPSEEK_API_KEY || '',
      enabled: !!process.env.DEEPSEEK_API_KEY?.trim(),
      priority: 1,
    },
    openrouter: {
      apiKey: process.env.OPENROUTER_API_KEY || '',
      enabled: !!process.env.OPENROUTER_API_KEY?.trim(),
      priority: 2,
    },
    edenai: {
      apiKey: process.env.EDENAI_API_KEY || '',
      enabled: !!process.env.EDENAI_API_KEY?.trim(),
      priority: 3,
    },
  },
  cacheConfig: {
    enabled: true,
    maxSize: 5000,
    ttl: 3600,
  },
  monitoring: {
    enabled: true,
    metricsInterval: 60000,
  },
};

// Create and export gateway instance
export const aiGateway = new AIGateway(gatewayConfig);

// Export types
export * from './gateway';
export * from './providers/index';