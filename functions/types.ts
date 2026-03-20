/**
 * ZENO Browser — Shared Types for Cloudflare Workers
 */

export interface Env {
  DB: D1Database;
  // SESSION: KVNamespace;
  // AI_CACHE: KVNamespace;
  // SITE_REGISTRY: KVNamespace;
  // WEB_CACHE: R2Bucket;
  AI: Ai;

  // Queues
  AGENT_TASKS_QUEUE: Queue;
  IMAGE_GEN_QUEUE: Queue;
  IMAGE_PROC_QUEUE: Queue;
  VOICE_QUEUE: Queue;

  ENVIRONMENT: string;
  SITE_NAME: string;
  SITE_URL: string;

  // Cross-site registry
  SITES_JIMBO77_ORG: string;
  SITES_MYBONZOAI_BLOG: string;
  SITES_MYBONZO_COM: string;
  SITES_JIMBO77_COM: string;

  // Secrets
  DEEPSEEK_API_KEY?: string;
  OPENROUTER_API_KEY?: string;
  ANTHROPIC_API_KEY?: string;
  OPENAI_API_KEY?: string;
  WEBGATE_SECRET?: string;
  UMAMI_SITE_ID?: string;

  // CF Account (for Workers API monitoring)
  CF_ACCOUNT_ID?: string;
  CF_API_TOKEN?: string;
}

// Worker registry for monitoring
export interface WorkerInfo {
  id: string;
  name: string;
  category: 'ai' | 'content' | 'api' | 'proxy' | 'ecommerce' | 'media' | 'seo' | 'other';
  route?: string;
  description: string;
}

export const WORKER_REGISTRY: WorkerInfo[] = [
  { id: 'ai-content-creator', name: 'AI Content Creator', category: 'content', description: 'AI-powered content generation' },
  { id: 'cf-ai-image-gen', name: 'CF AI Image Gen', category: 'media', description: 'Cloudflare AI image generation' },
  { id: 'deepseek-search-worker', name: 'DeepSeek Search', category: 'ai', description: 'DeepSeek-powered search' },
  { id: 'hub-jimbo77', name: 'Hub jimbo77', category: 'api', route: 'hub.jimbo77.com/*', description: 'Hub API for jimbo77.com' },
  { id: 'jimbo77-agents-orchestrator', name: 'Agents Orchestrator', category: 'ai', route: 'orchestrator.jimbo77.com/*', description: 'Multi-agent orchestration' },
  { id: 'jimbo77-api-docs', name: 'API Docs', category: 'api', route: 'jimbo77.org/docs/api/*', description: 'API documentation server' },
  { id: 'jimbo77-community', name: 'Community', category: 'api', description: 'Community platform' },
  { id: 'jimbo77-social-club-api', name: 'Social Club API', category: 'api', description: 'Social club endpoints' },
  { id: 'moa-orchestrator', name: 'MOA Orchestrator', category: 'ai', description: 'Mixture-of-Agents pipeline' },
  { id: 'moe-rag-api', name: 'MoE RAG', category: 'ai', route: 'api.jimbo77.com/api/moe-rag/*', description: 'Mixture of Experts RAG' },
  { id: 'mybonzo-enhanced-ai', name: 'Enhanced AI', category: 'ai', description: 'MyBonzo enhanced AI chat' },
  { id: 'mybonzo-main-chat', name: 'Main Chat', category: 'ai', description: 'MyBonzo main chat engine' },
  { id: 'pumo-rag', name: 'Pumo RAG', category: 'ai', route: 'pumo-api.jimbo77.com/*', description: 'Product RAG search' },
  { id: 'pumo-ai-seo', name: 'Pumo AI SEO', category: 'seo', description: 'AI-powered SEO optimization' },
  { id: 'content-delivery', name: 'Content Delivery', category: 'media', description: 'CDN content delivery' },
  { id: 'video-publisher', name: 'Video Publisher', category: 'media', description: 'Video processing & publishing' },
  { id: 'replicate-image-gen', name: 'Replicate Image Gen', category: 'media', description: 'Replicate.com image generation' },
  { id: 'voice-ai-worker', name: 'Voice AI', category: 'ai', description: 'Voice AI processing' },
  { id: 'whitecat-api', name: 'WhiteCat API', category: 'ecommerce', description: 'E-commerce product API' },
  { id: 'x402-payment', name: 'x402 Payment', category: 'ecommerce', description: 'Micropayment protocol' },
  { id: 'stripe-webhook', name: 'Stripe Webhook', category: 'ecommerce', description: 'Stripe payment webhooks' },
  { id: 'r2-public-mybonzo', name: 'R2 Public', category: 'media', description: 'R2 public file serving' },
  { id: 'mybonzo-proxy-worker', name: 'Proxy Worker', category: 'proxy', description: 'General proxy worker' },
  { id: 'zen-deepseek-gateway', name: 'DeepSeek Gateway', category: 'ai', description: 'DeepSeek AI gateway' },
  { id: 'zen-static-gateway', name: 'Static Gateway', category: 'proxy', description: 'Static assets gateway' },
  { id: 'zeno-browser-bridge-production', name: 'Browser Bridge', category: 'proxy', description: 'Electron-to-web bridge' },
  { id: 'agent-zero-bridge-production', name: 'Agent Zero Bridge', category: 'ai', description: 'Agent Zero framework bridge' },
  { id: 'jimbo-catalog-gateway', name: 'Catalog Gateway', category: 'api', description: 'Product catalog gateway' },
  { id: 'jimbo-like-pumo-api', name: 'Like/Pumo API', category: 'api', description: 'Like system & Pumo integration' },
  { id: 'pumo-chunk-processor', name: 'Chunk Processor', category: 'ai', description: 'RAG chunk processing' },
  { id: 'jimbo77-sitemap-generator', name: 'Sitemap Generator', category: 'seo', description: 'Dynamic sitemap generation' },
  { id: 'mybonzoaiblog', name: 'MyBonzo AI Blog', category: 'content', description: 'AI blog engine' },
  { id: 'image-queue-worker', name: 'Image Queue', category: 'media', description: 'Image processing queue' },
  { id: 'mybonzo-api-v2', name: 'MyBonzo API v2', category: 'api', description: 'MyBonzo REST API v2' },
  { id: 'mybonzo-assistant-production', name: 'MyBonzo Assistant', category: 'ai', description: 'Personal AI assistant' },
  { id: 'zeno-iframe-proxy', name: 'iFrame Proxy', category: 'proxy', description: 'Secure iframe proxy' },
  { id: 'the-jimbo77com-nxt', name: 'jimbo77.com NXT', category: 'api', description: 'Next-gen jimbo77.com' },
  { id: 'zeno-bielik-agents', name: 'Legacy Agents', category: 'other', description: 'Legacy agent system' },
];

export interface SiteInfo {
  name: string;
  url: string;
  status: 'online' | 'offline' | 'unknown';
  lastCheck?: number;
  features?: string[];
}

export interface AIProviderConfig {
  name: string;
  endpoint: string;
  models: string[];
  priority: number;
  costPerMTok: number;
}

export function jsonResponse(data: unknown, status = 200, headers?: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-WebGate-Token',
      ...headers,
    },
  });
}

export function errorResponse(message: string, status = 400): Response {
  return jsonResponse({ error: message, status }, status);
}

export function corsHeaders(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-WebGate-Token',
      'Access-Control-Max-Age': '86400',
    },
  });
}
