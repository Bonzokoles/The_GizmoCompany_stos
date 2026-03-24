#!/usr/bin/env node
/**
 * TAVILY RESEARCH CRAWLER — Business Intelligence Pipeline
 * 
 * Uses Tavily Search API + Gemini for AI-powered research
 * Saves structured datasets to knowledge_base + R2
 * 
 * Usage: node scripts/tavily-research-crawler.mjs
 * Budget: ~200 credits from 1000 allocation
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

// ─── CONFIG ──────────────────────────────────────────────
const SECRETS_PATH = '.workspace_meta/secrets/.env';
const OUTPUT_DIR = 'U:/The_DEVz_HUB_of_work/knowledge_base';
const LOCAL_OUTPUT = 'ai-hub/js/data/datasets';

function loadEnv() {
  const raw = readFileSync(SECRETS_PATH, 'utf-8');
  const env = {};
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.+)$/);
    if (m) env[m[1]] = m[2].trim();
  }
  return env;
}

const ENV = loadEnv();
const TAVILY_KEY = ENV.TAVILY_API_KEY;
const GEMINI_KEY = ENV.GEMINI_API_KEY;

if (!TAVILY_KEY) { console.error('Missing TAVILY_API_KEY'); process.exit(1); }
if (!GEMINI_KEY) { console.error('Missing GEMINI_API_KEY'); process.exit(1); }

// ─── RESEARCH TOPICS (5 categories × ~20 queries = ~100 searches) ──
const RESEARCH_TOPICS = {
  'business-trends-2026': {
    category: '10_MARKET_ANALYSIS',
    queries: [
      'top business trends 2026 predictions',
      'emerging industries 2026 growth opportunities',
      'small business trends digital transformation 2026',
      'B2B SaaS market trends 2026',
      'subscription economy trends 2026',
      'remote work business models 2026',
      'creator economy business trends 2026',
      'green business sustainability trends 2026',
      'cross-border ecommerce trends 2026',
      'micro-SaaS profitable niches 2026',
    ],
    summary_prompt: 'Summarize the key business trends for 2026. Focus on actionable opportunities for small tech companies and solopreneurs. Structure as: trend name, description, opportunity, risk level, estimated market size.',
  },
  'ai-in-business': {
    category: '13_AI_NEWS',
    queries: [
      'AI automation small business use cases 2026',
      'best AI tools for business productivity 2026',
      'AI agents for business workflows real examples',
      'AI customer service chatbot ROI statistics',
      'AI content generation business results case studies',
      'AI pricing optimization ecommerce results',
      'AI predictive analytics business applications',
      'open source AI tools for startups 2026',
      'AI coding assistants business impact statistics',
      'AI voice agents business phone automation',
    ],
    summary_prompt: 'Compile a comprehensive guide on AI tools and applications for business in 2026. For each tool/use case: name, category, pricing, ROI metrics, implementation difficulty (1-5), best for whom.',
  },
  'financial-analytics': {
    category: '06_FINANCE',
    queries: [
      'financial analytics tools for small business 2026',
      'cash flow forecasting AI tools',
      'revenue prediction models SaaS metrics',
      'fintech trends Poland Europe 2026',
      'cryptocurrency business payments adoption 2026',
      'automated bookkeeping AI tools comparison',
      'financial KPIs dashboard best practices',
      'invoice automation AI tools comparison',
      'tax optimization strategies tech companies Europe',
      'venture capital AI startups funding trends 2026',
    ],
    summary_prompt: 'Create a financial analytics toolkit guide. For each tool/strategy: name, cost, features, best use case, integration options. Include KPI formulas and benchmarks.',
  },
  'ecommerce-growth': {
    category: '04_ECOMMERCE_SHOPS',
    queries: [
      'ecommerce growth strategies 2026',
      'AI personalization ecommerce conversion rates',
      'headless commerce platforms comparison 2026',
      'social commerce trends TikTok Instagram 2026',
      'ecommerce automation tools best 2026',
      'dropshipping vs private label profitability 2026',
      'ecommerce SEO AI optimization strategies',
      'buy now pay later BNPL ecommerce impact',
      'product recommendation engines comparison',
      'ecommerce analytics tools free and paid 2026',
    ],
    summary_prompt: 'Build an ecommerce growth playbook for 2026. Structure: strategy name, description, expected impact (%), implementation cost, tools needed, timeline.',
  },
  'market-opportunities': {
    category: '11_OPPORTUNITIES',
    queries: [
      'most profitable online businesses to start 2026',
      'AI agency business model profitable niches',
      'white label software business opportunities',
      'API-first business model examples success',
      'platform business model opportunities 2026',
      'marketplace business model niches underserved',
      'data monetization business opportunities',
      'AI consulting business how to start',
      'profitable side projects for developers 2026',
      'digital products passive income 2026 proven models',
    ],
    summary_prompt: 'Rank market opportunities for tech-savvy entrepreneurs. For each: opportunity name, market size, competition level (low/mid/high), startup cost, time to first revenue, scalability score (1-10).',
  },
};

let totalCreditsUsed = 0;
const MAX_CREDITS = 600; // safety cap — leave 400 buffer

// ─── TAVILY SEARCH ──────────────────────────────────────
async function tavilySearch(query, options = {}) {
  if (totalCreditsUsed >= MAX_CREDITS) {
    console.log(`  ⚠️  Credit limit reached (${totalCreditsUsed}/${MAX_CREDITS}), skipping: ${query}`);
    return null;
  }

  const body = {
    query,
    api_key: TAVILY_KEY,
    search_depth: options.depth || 'basic',  // basic=1 credit, advanced=2
    include_answer: true,
    include_raw_content: false,
    max_results: options.maxResults || 8,
    topic: options.topic || 'general',
  };

  try {
    const r = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!r.ok) {
      const err = await r.text();
      console.error(`  ❌ Tavily error for "${query}": ${r.status} ${err}`);
      return null;
    }

    totalCreditsUsed += (options.depth === 'advanced' ? 2 : 1);
    const data = await r.json();
    console.log(`  ✅ "${query}" → ${data.results?.length || 0} results (credits: ${totalCreditsUsed})`);
    return data;
  } catch (e) {
    console.error(`  ❌ Fetch error: ${e.message}`);
    return null;
  }
}

// ─── GEMINI SUMMARIZE ───────────────────────────────────
async function geminiSummarize(text, systemPrompt) {
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${systemPrompt}\n\n--- RAW RESEARCH DATA ---\n${text}` }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 4000 },
      }),
    });

    if (!r.ok) {
      console.error(`  ❌ Gemini error: ${r.status}`);
      return null;
    }

    const data = await r.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch (e) {
    console.error(`  ❌ Gemini fetch error: ${e.message}`);
    return null;
  }
}

// ─── MAIN PIPELINE ──────────────────────────────────────
async function runResearch() {
  console.log('🚀 TAVILY RESEARCH CRAWLER — Business Intelligence');
  console.log(`📊 Budget: ${MAX_CREDITS} credits (of 1000)\n`);

  const allResults = {};
  const timestamp = new Date().toISOString().slice(0, 10);

  for (const [topicId, config] of Object.entries(RESEARCH_TOPICS)) {
    console.log(`\n═══ ${topicId.toUpperCase()} ═══`);
    const topicResults = [];

    // Run all searches for this topic
    for (const query of config.queries) {
      const result = await tavilySearch(query);
      if (result) {
        topicResults.push({
          query,
          answer: result.answer || '',
          results: (result.results || []).map(r => ({
            title: r.title,
            url: r.url,
            content: r.content?.slice(0, 500) || '',
            score: r.score,
          })),
        });
      }
      // Small delay to be nice to API
      await new Promise(ok => setTimeout(ok, 300));
    }

    if (topicResults.length === 0) {
      console.log(`  ⚠️  No results for ${topicId}, skipping...`);
      continue;
    }

    // Compile raw text for Gemini
    const rawText = topicResults.map(t =>
      `QUERY: ${t.query}\nANSWER: ${t.answer}\nSOURCES:\n${t.results.map(r => `- ${r.title}: ${r.content}`).join('\n')}`
    ).join('\n\n---\n\n');

    console.log(`  🤖 Summarizing with Gemini...`);
    const summary = await geminiSummarize(rawText, config.summary_prompt);

    const dataset = {
      id: topicId,
      category: config.category,
      generated: timestamp,
      source: 'Tavily Search API + Gemini 2.0 Flash',
      queries_count: topicResults.length,
      credits_used: topicResults.length,
      summary: summary || 'Summary generation failed',
      raw_searches: topicResults,
      sources: [...new Set(topicResults.flatMap(t => t.results.map(r => r.url)))],
    };

    allResults[topicId] = dataset;

    // Save to knowledge_base
    const kbDir = join(OUTPUT_DIR, config.category);
    if (existsSync(kbDir)) {
      const kbFile = join(kbDir, `${topicId}-${timestamp}.json`);
      writeFileSync(kbFile, JSON.stringify(dataset, null, 2));
      console.log(`  💾 Saved: ${kbFile}`);
    }

    // Save to local datasets dir
    const localFile = join(LOCAL_OUTPUT, `${topicId}.json`);
    writeFileSync(localFile, JSON.stringify(dataset, null, 2));
    console.log(`  💾 Local: ${localFile}`);
  }

  // Save master index
  const indexFile = join(LOCAL_OUTPUT, 'research-index.json');
  const index = {
    generated: timestamp,
    total_credits: totalCreditsUsed,
    topics: Object.entries(allResults).map(([id, d]) => ({
      id,
      category: d.category,
      queries: d.queries_count,
      sources: d.sources.length,
      has_summary: !!d.summary,
    })),
  };
  writeFileSync(indexFile, JSON.stringify(index, null, 2));

  console.log(`\n${'═'.repeat(50)}`);
  console.log(`✅ RESEARCH COMPLETE`);
  console.log(`📊 Credits used: ${totalCreditsUsed} / ${MAX_CREDITS}`);
  console.log(`📁 Topics: ${Object.keys(allResults).length}`);
  console.log(`🔗 Total sources: ${Object.values(allResults).reduce((a, d) => a + d.sources.length, 0)}`);
  console.log(`📄 Files: ${LOCAL_OUTPUT}/`);
  console.log(`\nNext: upload to R2 with:`);
  console.log(`  node scripts/upload-research-to-r2.mjs`);
}

runResearch().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
