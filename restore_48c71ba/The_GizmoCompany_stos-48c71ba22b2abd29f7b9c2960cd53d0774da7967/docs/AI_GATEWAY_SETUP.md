# AI Gateway Setup Guide

## 1. Environment Variables

Utwórz `.env.local`:

```bash
# DeepSeek (Primary)
DEEPSEEK_API_KEY=your_deepseek_key_here

# OpenRouter (Secondary)
OPENROUTER_API_KEY=your_openrouter_key_here

# EdenAI (Tertiary)
EDENAI_API_KEY=your_edenai_key_here

# Classic (Optional)
OPENAI_API_KEY=your_openai_key_here
ANTHROPIC_API_KEY=your_anthropic_key_here
USE_CLASSIC_AI=false
```

## 2. Installation

```bash
npm install axios lru-cache
npm install --save-dev @types/node
```

## 3. Usage in Application

```typescript
import { aiGateway } from '@/services/ai-gateway';

// Simple request
const response = await aiGateway.execute({
  prompt: 'Explain quantum computing',
  maxTokens: 2048,
  temperature: 0.7,
});

console.log(response.content);
console.log(`Cost: $${response.cost}`);

// Get metrics
const metrics = aiGateway.getMetrics();
console.log(metrics);
```

## 4. Advanced Configuration

Edit `src/services/ai-gateway/index.ts` to customize priorities and enabling/disabling providers.

## 5. Monitoring

Gateway automatically logs metrics every minute (if monitoring enabled).

## 6. Cost Optimization

- Cache is automatically enabled (LRU with TTL)
- Rate limiting prevents API overages
- Automatic failover to next provider on error

---

✅ Gateway is now ready!