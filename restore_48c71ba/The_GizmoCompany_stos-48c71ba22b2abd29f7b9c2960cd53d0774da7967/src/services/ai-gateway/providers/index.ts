/**
 * AI Gateway Types & Interfaces
 */

export type AIProviderType = 'deepseek' | 'openrouter' | 'edenai';

export type AICapability =
  | 'text-generation'
  | 'reasoning'
  | 'code-generation'
  | 'web-search'
  | 'vision'
  | 'audio'
  | 'streaming';

export interface AIProvider {
  name: AIProviderType;
  displayName: string;
  enabled: boolean;
  priority: number;
  endpoint: string;
  apiKey: string;
  models: string[];
  maxQueueLength: number;
  rateLimit: { rpm: number; tokensPerMinute?: number };
  timeout: number;
  capabilities: AICapability[];
  costPerMToken?: number;
  execute(request: AIRequest): Promise<AIResponse>;
  getStatus(): any;
}

export interface AIRequest {
  prompt: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  stream?: boolean;
  context?: string[];
  metadata?: Record<string, any>;
}

export interface AIResponse {
  id: string;
  content: string;
  model: string;
  tokens: { input: number; output: number; total: number };
  latency: number;
  cached: boolean;
  provider: AIProviderType;
  timestamp: Date;
  cost?: number;
}