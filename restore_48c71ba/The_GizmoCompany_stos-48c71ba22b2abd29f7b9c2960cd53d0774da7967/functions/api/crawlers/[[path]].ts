/**
 * ZENO Browser — Crawlers & Bots Monitor
 * Tracks crawlers visiting zenbrowsers.org using CF Analytics GraphQL API
 */
import type { Env } from '../../types';

/* ─── Known Crawler Patterns ─────────────────────── */

interface CrawlerProfile {
  name: string;
  pattern: string;
  type: 'search-engine' | 'social' | 'monitoring' | 'ai' | 'seo' | 'feed' | 'other';
  description: string;
}

const KNOWN_CRAWLERS: CrawlerProfile[] = [
  // Search Engines
  { name: 'Googlebot', pattern: 'Googlebot', type: 'search-engine', description: 'Google Search crawler' },
  { name: 'Googlebot-Image', pattern: 'Googlebot-Image', type: 'search-engine', description: 'Google Image crawler' },
  { name: 'Google-InspectionTool', pattern: 'Google-InspectionTool', type: 'search-engine', description: 'Google URL Inspection' },
  { name: 'Bingbot', pattern: 'bingbot', type: 'search-engine', description: 'Microsoft Bing crawler' },
  { name: 'YandexBot', pattern: 'YandexBot', type: 'search-engine', description: 'Yandex Search crawler' },
  { name: 'Baiduspider', pattern: 'Baiduspider', type: 'search-engine', description: 'Baidu Search crawler' },
  { name: 'DuckDuckBot', pattern: 'DuckDuckBot', type: 'search-engine', description: 'DuckDuckGo crawler' },
  { name: 'Sogou', pattern: 'Sogou', type: 'search-engine', description: 'Sogou Search crawler' },
  { name: 'Applebot', pattern: 'Applebot', type: 'search-engine', description: 'Apple Siri/Spotlight crawler' },

  // Social Media
  { name: 'Twitterbot', pattern: 'Twitterbot', type: 'social', description: 'Twitter/X link preview' },
  { name: 'facebookexternalhit', pattern: 'facebookexternalhit', type: 'social', description: 'Facebook link preview' },
  { name: 'LinkedInBot', pattern: 'LinkedInBot', type: 'social', description: 'LinkedIn link preview' },
  { name: 'Slackbot', pattern: 'Slackbot', type: 'social', description: 'Slack link unfurling' },
  { name: 'TelegramBot', pattern: 'TelegramBot', type: 'social', description: 'Telegram link preview' },
  { name: 'WhatsApp', pattern: 'WhatsApp', type: 'social', description: 'WhatsApp link preview' },
  { name: 'Discordbot', pattern: 'Discordbot', type: 'social', description: 'Discord link embed' },

  // AI Crawlers
  { name: 'GPTBot', pattern: 'GPTBot', type: 'ai', description: 'OpenAI GPT crawler' },
  { name: 'ChatGPT-User', pattern: 'ChatGPT-User', type: 'ai', description: 'ChatGPT browsing feature' },
  { name: 'Claude-Web', pattern: 'Claude-Web', type: 'ai', description: 'Anthropic Claude crawler' },
  { name: 'ClaudeBot', pattern: 'ClaudeBot', type: 'ai', description: 'Anthropic ClaudeBot' },
  { name: 'Bytespider', pattern: 'Bytespider', type: 'ai', description: 'ByteDance AI crawler' },
  { name: 'CCBot', pattern: 'CCBot', type: 'ai', description: 'Common Crawl bot' },
  { name: 'PerplexityBot', pattern: 'PerplexityBot', type: 'ai', description: 'Perplexity AI crawler' },
  { name: 'Diffbot', pattern: 'Diffbot', type: 'ai', description: 'Diffbot web data extraction' },
  { name: 'cohere-ai', pattern: 'cohere-ai', type: 'ai', description: 'Cohere AI crawler' },
  { name: 'Google-Extended', pattern: 'Google-Extended', type: 'ai', description: 'Google AI training crawler' },

  // SEO Tools
  { name: 'AhrefsBot', pattern: 'AhrefsBot', type: 'seo', description: 'Ahrefs SEO crawler' },
  { name: 'SemrushBot', pattern: 'SemrushBot', type: 'seo', description: 'SEMrush SEO crawler' },
  { name: 'MJ12bot', pattern: 'MJ12bot', type: 'seo', description: 'Majestic SEO crawler' },
  { name: 'DotBot', pattern: 'DotBot', type: 'seo', description: 'Moz SEO crawler' },
  { name: 'Screaming Frog', pattern: 'Screaming Frog', type: 'seo', description: 'Screaming Frog SEO spider' },

  // Monitoring
  { name: 'UptimeRobot', pattern: 'UptimeRobot', type: 'monitoring', description: 'UptimeRobot monitoring' },
  { name: 'Pingdom', pattern: 'Pingdom', type: 'monitoring', description: 'Pingdom monitoring' },
  { name: 'StatusCake', pattern: 'StatusCake', type: 'monitoring', description: 'StatusCake monitoring' },
  { name: 'Site24x7', pattern: 'Site24x7', type: 'monitoring', description: 'Site24x7 monitoring' },

  // Feed
  { name: 'Feedfetcher', pattern: 'Feedfetcher', type: 'feed', description: 'Google Feed fetcher' },
  { name: 'Feedly', pattern: 'Feedly', type: 'feed', description: 'Feedly RSS reader' },

  // Other
  { name: 'curl', pattern: 'curl/', type: 'other', description: 'cURL command line' },
  { name: 'wget', pattern: 'Wget', type: 'other', description: 'GNU Wget' },
  { name: 'Python-urllib', pattern: 'Python-urllib', type: 'other', description: 'Python urllib' },
  { name: 'python-requests', pattern: 'python-requests', type: 'other', description: 'Python requests library' },
  { name: 'Go-http-client', pattern: 'Go-http-client', type: 'other', description: 'Go HTTP client' },
  { name: 'Java/', pattern: 'Java/', type: 'other', description: 'Java HTTP client' },
];

/* ─── Helpers ────────────────────────────────────── */

function corsHeaders(): HeadersInit {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
  });
}

function identifyCrawler(userAgent: string): CrawlerProfile | null {
  const ua = userAgent || '';
  for (const crawler of KNOWN_CRAWLERS) {
    if (ua.includes(crawler.pattern)) return crawler;
  }
  return null;
}

function isLikelyBot(userAgent: string): boolean {
  if (!userAgent) return true;
  const botPatterns = /bot|crawl|spider|slurp|fetch|scrape|archive|monitor|check|scan|index|wget|curl|python|java\/|go-http|headless|phantom|selenium|puppet|playwright/i;
  return botPatterns.test(userAgent);
}

/* ─── CF GraphQL Analytics Query ─────────────────── */

async function fetchCFAnalytics(env: Env, zoneId: string, period: string): Promise<any> {
  const token = env.CF_API_TOKEN;
  if (!token) return null;

  const now = new Date();
  let days: number;
  switch (period) {
    case '7d':  days = 7; break;
    case '30d': days = 30; break;
    default:    days = 1;
  }

  // httpRequestsAdaptiveGroups has a 1-day max range per query on free plan.
  // For longer periods we issue parallel day-by-day requests and merge results.
  const dayChunks: { since: Date; until: Date }[] = [];
  for (let i = 0; i < days; i++) {
    const until = new Date(now.getTime() - i * 86400000);
    const since = new Date(until.getTime() - 86400000);
    dayChunks.push({ since, until });
  }

  const buildQuery = (since: Date, until: Date) => `query {
    viewer {
      zones(filter: { zoneTag: "${zoneId}" }) {
        httpRequestsAdaptiveGroups(
          filter: {
            datetime_gt: "${since.toISOString()}"
            datetime_lt: "${until.toISOString()}"
          }
          limit: 500
          orderBy: [count_DESC]
        ) {
          count
          dimensions {
            userAgent
          }
        }
      }
    }
  }`;

  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  // Fire all day queries in parallel (max 30)
  const results = await Promise.allSettled(
    dayChunks.map(({ since, until }) =>
      fetch('https://api.cloudflare.com/client/v4/graphql', {
        method: 'POST',
        headers,
        body: JSON.stringify({ query: buildQuery(since, until) }),
      }).then(r => r.ok ? r.json() : null)
    )
  );

  // Merge all day results into a single UA→count map
  const uaMap = new Map<string, number>();
  for (const r of results) {
    if (r.status !== 'fulfilled' || !r.value) continue;
    const groups = (r.value as any)?.data?.viewer?.zones?.[0]?.httpRequestsAdaptiveGroups;
    if (!Array.isArray(groups)) continue;
    for (const g of groups) {
      const ua = g.dimensions?.userAgent || '';
      uaMap.set(ua, (uaMap.get(ua) || 0) + (g.count || 0));
    }
  }

  if (uaMap.size === 0) return null;

  // Convert back to the same shape the rest of the code expects
  return Array.from(uaMap.entries())
    .map(([userAgent, count]) => ({ count, dimensions: { userAgent } }))
    .sort((a, b) => b.count - a.count);
}

async function getZoneId(env: Env): Promise<string | null> {
  const token = env.CF_API_TOKEN;
  if (!token) return null;

  const resp = await fetch('https://api.cloudflare.com/client/v4/zones?name=zenbrowsers.org', {
    headers: { 'Authorization': `Bearer ${token}` },
  });

  if (!resp.ok) return null;
  const data: any = await resp.json();
  return data?.result?.[0]?.id || null;
}

/* ─── Route Handler ──────────────────────────────── */

export const onRequest: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const path = url.pathname.replace('/api/crawlers', '').replace(/^\//, '');

  if (context.request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders() });
  }

  switch (path) {
    case 'live':     return handleLive(context);
    case 'history':  return handleHistory(context);
    case 'profiles': return handleProfiles();
    case 'status':   return handleStatus();
    default:
      return json({ error: 'Unknown endpoint', endpoints: ['live', 'history', 'profiles', 'status'] }, 404);
  }
};

/* ─── Endpoints ──────────────────────────────────── */

/** GET /api/crawlers/live — Analyze current request as bot/human */
async function handleLive(context: EventContext<Env, string, unknown>): Promise<Response> {
  const req = context.request;
  const ua = req.headers.get('User-Agent') || '';
  const ip = req.headers.get('CF-Connecting-IP') || '';
  const country = req.headers.get('CF-IPCountry') || '';
  const cfRay = req.headers.get('CF-Ray') || '';

  const crawler = identifyCrawler(ua);
  const isBot = !!crawler || isLikelyBot(ua);

  return json({
    isBot,
    crawler: crawler ? {
      name: crawler.name,
      type: crawler.type,
      description: crawler.description,
    } : null,
    request: {
      userAgent: ua,
      country,
      cfRay,
    },
    timestamp: new Date().toISOString(),
  });
}

/** GET /api/crawlers/history — Get crawler history from CF Analytics */
async function handleHistory(context: EventContext<Env, string, unknown>): Promise<Response> {
  const url = new URL(context.request.url);
  const period = url.searchParams.get('period') || '24h';
  const env = context.env;

  // Get zone ID
  const zoneId = await getZoneId(env);
  if (!zoneId) {
    // Fallback: return known crawler profiles without analytics
    return json({
      note: 'CF API credentials needed for historical data. Showing known crawler profiles.',
      period,
      crawlerProfiles: KNOWN_CRAWLERS.length,
      crawlersByType: getCrawlersByType(),
      data: null,
      timestamp: new Date().toISOString(),
    });
  }

  // Fetch analytics
  const analytics = await fetchCFAnalytics(env, zoneId, period);
  if (!analytics) {
    return json({
      note: 'Could not fetch analytics data. Check CF_API_TOKEN permissions.',
      period,
      crawlersByType: getCrawlersByType(),
      data: null,
      timestamp: new Date().toISOString(),
    });
  }

  // Process: identify bots from user agent data
  const crawlerVisits: Record<string, { count: number; type: string; description: string; userAgents: string[] }> = {};
  const unknownBots: { userAgent: string; count: number }[] = [];
  let humanRequests = 0;
  let botRequests = 0;

  for (const group of analytics) {
    const ua = group.dimensions?.userAgent || '';
    const count = group.count || 0;
    const crawler = identifyCrawler(ua);

    if (crawler) {
      if (!crawlerVisits[crawler.name]) {
        crawlerVisits[crawler.name] = { count: 0, type: crawler.type, description: crawler.description, userAgents: [] };
      }
      crawlerVisits[crawler.name].count += count;
      if (!crawlerVisits[crawler.name].userAgents.includes(ua) && crawlerVisits[crawler.name].userAgents.length < 3) {
        crawlerVisits[crawler.name].userAgents.push(ua);
      }
      botRequests += count;
    } else if (isLikelyBot(ua)) {
      unknownBots.push({ userAgent: ua.substring(0, 200), count });
      botRequests += count;
    } else {
      humanRequests += count;
    }
  }

  // Sort by visit count
  const sortedCrawlers = Object.entries(crawlerVisits)
    .sort(([, a], [, b]) => b.count - a.count)
    .map(([name, data]) => ({ name, ...data }));

  const sortedUnknown = unknownBots
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  // Aggregate by type
  const byType: Record<string, number> = {};
  for (const c of sortedCrawlers) {
    byType[c.type] = (byType[c.type] || 0) + c.count;
  }

  return json({
    period,
    summary: {
      totalRequests: humanRequests + botRequests,
      humanRequests,
      botRequests,
      botPercentage: ((botRequests / (humanRequests + botRequests || 1)) * 100).toFixed(1),
      uniqueCrawlers: sortedCrawlers.length,
      unknownBots: sortedUnknown.length,
    },
    byType,
    crawlers: sortedCrawlers,
    unknownBots: sortedUnknown,
    timestamp: new Date().toISOString(),
  });
}

/** GET /api/crawlers/profiles — List all known crawler profiles */
function handleProfiles(): Response {
  return json({
    totalProfiles: KNOWN_CRAWLERS.length,
    byType: getCrawlersByType(),
    profiles: KNOWN_CRAWLERS.map((c) => ({
      name: c.name,
      type: c.type,
      description: c.description,
    })),
    timestamp: new Date().toISOString(),
  });
}

/** GET /api/crawlers/status */
function handleStatus(): Response {
  return json({
    service: 'crawlers-monitor',
    status: 'operational',
    knownCrawlerProfiles: KNOWN_CRAWLERS.length,
    crawlerTypes: [...new Set(KNOWN_CRAWLERS.map((c) => c.type))],
    features: ['live-detection', 'history-analytics', 'crawler-profiles'],
    endpoints: [
      'GET /api/crawlers/live — Detect if current request is a bot',
      'GET /api/crawlers/history?period=24h|7d|30d — Crawler history from CF Analytics',
      'GET /api/crawlers/profiles — List all known crawler profiles',
      'GET /api/crawlers/status — Service status',
    ],
    timestamp: new Date().toISOString(),
  });
}

/* ─── Utils ──────────────────────────────────────── */

function getCrawlersByType(): Record<string, number> {
  const byType: Record<string, number> = {};
  for (const c of KNOWN_CRAWLERS) {
    byType[c.type] = (byType[c.type] || 0) + 1;
  }
  return byType;
}
