---
title: ZENO Web Integration Skill
description: Integration patterns for web crawling, API interactions, and data processing in ZENO Browser
location: .agents/skills/zeno-web-integration
---

# ZENO Web Integration Skill

Kompleksowy skill dla integracji web'owych w ZENO Browser. Obejmuje crawlowanie, API interactions i przetwarzanie danych.

## Kiedy Użyć

- Integracja z zewnętrznymi API'ami
- Crawlowanie i ekstrakcja zawartości
- Przetwarzanie web scraping'u
- Data enrichment z zewnętrznych źródeł
- RSS feeds i monitoring treści

## Klucze Koncepty

### 1. Crawlowanie Etyczne
```typescript
// ✅ POPRAWNIE - respectful crawling
const crawlOptions = {
  respectRobotsTxt: true,
  userAgent: 'ZENO-Browser/1.0',
  delay: 1000, // 1s między requestami
  timeout: 5000,
};

// ❌ ŹRÓDŁO - aggressive crawling
const badOptions = {
  concurrent: 100, // za dużo parallelnych requestów
  delay: 0,        // bez opóźnień
};
```

### 2. API Rate Limiting
```typescript
// Implementacja простой queue'a z rate limitingiem
class APIRateLimiter {
  constructor(private requestsPerSecond: number) {}
  
  async execute(fn: () => Promise<any>) {
    // Wait for rate limit window
    await new Promise(resolve => setTimeout(resolve, 1000 / this.requestsPerSecond));
    return fn();
  }
}

const limiter = new APIRateLimiter(3); // 3 req/sec
await limiter.execute(() => fetch(url));
```

### 3. Error Handling & Retries
```typescript
// Exponential backoff retry strategy
async function fetchWithRetry(url: string, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response;
    } catch (error) {
      const delay = Math.pow(2, i) * 1000; // 1s, 2s, 4s
      if (i === maxRetries - 1) throw error;
      console.warn(`Retry ${i + 1}/${maxRetries} after ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
```

## Paterns: Data Pipeline

```
┌─────────────────────┐
│  Fetch Data         │
│  (API/Web)          │
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│  Transform &        │
│  Validate           │
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│  Enrich & Analyze   │
│  (ML/AI)            │
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│  Store/Cache        │
│  (KV/DB)            │
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│  Serve Results      │
│  (API/UI)           │
└─────────────────────┘
```

## Bezpieczeństwo

**NIGDY nie:**
- Hardcoduj API keys → używaj env vars
- Loguuj sensitive data → maskuj tokenami
- Trustuj niezwalidowanego input'u → zawsze sanitize
- Wysyłaj danych bez HTTPS → wymagaj szyfrowania

**ZAWSZE:**
- Waliduj nagłówki Content-Type
- Limituj rozmiar response'ów
- Ustaw timeout'y
- Loguj errors ale nie credentials

## Best Practices

1. **Caching** - używaj cache'u dla frequently accessed danych
2. **Rate Limiting** - respektuj limity API'ów
3. **Timeouts** - zawsze ustaw reasonable timeouty
4. **Monitoring** - śledź erfolg/failure ratesów
5. **Documentation** - dokumentuj publiczne API'e

## Przykład: Integracja z Web API

```typescript
class ZenoWebClient {
  private cache = new Map();
  private rateLimiter: APIRateLimiter;

  constructor(baseUrl: string) {
    this.rateLimiter = new APIRateLimiter(5);
  }

  async fetchWithCache(endpoint: string) {
    // Check cache first
    const cached = this.cache.get(endpoint);
    if (cached && Date.now() - cached.timestamp < 3600000) {
      return cached.data;
    }

    // Fetch with rate limit
    const data = await this.rateLimiter.execute(() =>
      fetch(`${this.baseUrl}${endpoint}`).then(r => r.json())
    );

    // Store in cache
    this.cache.set(endpoint, { data, timestamp: Date.now() });
    return data;
  }
}
```

## Tools & Resources

- **Tavily CLI** - web crawling & search
- **Wrangler** - Cloudflare Workers deployment
- **Node.js fetch API** - HTTP requests
- **Transformers.js** - ML inference

