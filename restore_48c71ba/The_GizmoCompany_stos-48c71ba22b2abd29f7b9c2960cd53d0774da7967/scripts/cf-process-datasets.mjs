/**
 * CF AI Dataset Processor
 * - Ekstrahuje linki/URL z wszystkich 36 dataset plików
 * - Używa CF Workers AI (llama-3.1-8b-instruct) do:
 *   1. Tłumaczenia angielskich opisów na polski
 *   2. Wydobycia nazw narzędzi z contentu
 * - Zapisuje wynik do ai-hub/js/data/datasets/tools-and-links.json
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';

const CF_ACCOUNT_ID = '7f490d58a478c6baccb0ae01ea1d87c3';
const CF_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN || readEnvToken();
const CF_MODEL = '@cf/meta/llama-3.1-8b-instruct';
const DATASETS_DIR = 'ai-hub/js/data/datasets';
const OUTPUT_FILE = join(DATASETS_DIR, 'tools-and-links.json');

function readEnvToken() {
  try {
    const envContent = readFileSync('.env', 'utf8');
    const match = envContent.match(/CLOUDFLARE_API_TOKEN=([^\r\n]+)/);
    return match ? match[1].trim() : '';
  } catch { return ''; }
}

async function callCFAI(userPrompt, maxTokens = 1500) {
  const systemPrompt = `You are a data extraction assistant. Extract information accurately in JSON format. 
Always respond with valid JSON only, no markdown, no explanation outside JSON.`;

  const resp = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/ai/run/${CF_MODEL}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CF_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: maxTokens,
        stream: false
      })
    }
  );

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`CF AI HTTP ${resp.status}: ${err.slice(0, 200)}`);
  }

  const data = await resp.json();
  if (!data.success) throw new Error(`CF AI error: ${JSON.stringify(data.errors)}`);
  return data.result.response;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// Wydobywa URL ze wszystkich zagłębionych struktur JSON
function extractUrlsFromObject(obj, urls = []) {
  if (typeof obj === 'string') {
    const matches = obj.match(/https?:\/\/[^\s"',)\]>]+/g) || [];
    urls.push(...matches.map(u => u.replace(/[.,;:]+$/, '')));
    return;
  }
  if (Array.isArray(obj)) { obj.forEach(i => extractUrlsFromObject(i, urls)); return; }
  if (obj && typeof obj === 'object') {
    for (const v of Object.values(obj)) extractUrlsFromObject(v, urls);
  }
}

function isEnglish(text) {
  if (!text || text.length < 30) return false;
  // Polskie znaki diakrytyczne → po polsku
  const polishChars = (text.match(/[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/g) || []).length;
  const polishDensity = polishChars / text.length;
  return polishDensity < 0.005; // mniej niż 0.5% polskich znaków = angielski
}

async function extractToolsFromContent(content, category, sourceFile) {
  const prompt = `Extract all software tools, platforms, websites, and services mentioned in the text below.
For each tool extract: name, URL (if mentioned), category, pricing (free/paid/freemium), short description in Polish.

Text:
${content.slice(0, 3000)}

Respond with JSON array:
[{"name":"Tool Name","url":"https://...or null","category":"${category}","pricing":"free|paid|freemium","desc_pl":"Polish description max 100 chars"}]`;

  try {
    const raw = await callCFAI(prompt, 1200);
    // Wytnij JSON z odpowiedzi (czasem model dodaje trochę tekstu)
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) { console.warn(`  ⚠️  Brak JSON w odpowiedzi dla ${sourceFile}`); return []; }
    const tools = JSON.parse(jsonMatch[0]);
    return tools.map(t => ({ ...t, source: sourceFile }));
  } catch (e) {
    console.warn(`  ⚠️  extractTools error (${sourceFile}): ${e.message.slice(0, 100)}`);
    return [];
  }
}

async function translateToPolish(text, sourceFile) {
  const prompt = `Translate the following English text to Polish. Return only the translated text, no additional explanation.

Text: ${text.slice(0, 1500)}`;

  try {
    const translated = await callCFAI(prompt, 800);
    return translated.trim();
  } catch (e) {
    console.warn(`  ⚠️  translate error (${sourceFile}): ${e.message.slice(0, 100)}`);
    return null;
  }
}

// ─── MAIN ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🚀 CF AI Dataset Processor');
  console.log(`   Account: ${CF_ACCOUNT_ID}`);
  console.log(`   Model: ${CF_MODEL}`);
  console.log(`   Token: ${CF_API_TOKEN ? CF_API_TOKEN.slice(0, 8) + '...' : '❌ BRAK!'}\n`);

  if (!CF_API_TOKEN) {
    console.error('❌ Brak CLOUDFLARE_API_TOKEN! Sprawdź .env');
    process.exit(1);
  }

  const files = readdirSync(DATASETS_DIR).filter(f => f.endsWith('.json') && f !== 'tools-and-links.json');
  console.log(`📁 Pliki do przetworzenia: ${files.length}\n`);

  const allTools = [];
  const allLinks = [];
  const translations = {};

  // Wczytaj istniejący output (merge — nie trać poprzednich danych)
  let existingOutput = null;
  try {
    existingOutput = JSON.parse(readFileSync(OUTPUT_FILE, 'utf8'));
    Object.assign(translations, existingOutput.translations || {});
    console.log(`📂 Wczytano istniejący output: ${Object.keys(translations).length} tłumaczeń, ${existingOutput.all_tools?.length || 0} narzędzi\n`);
  } catch { console.log('📂 Brak istniejącego pliku — tworzę od zera\n'); }

  // Kategorie per plik (z ALL_CLOUD_DATASETS)
  const fileCategoryMap = {
    'seo-analytics-poland-free-tools.json': 'analytics',
    'website-analytics-free-tools.json': 'analytics',
    '_raw_analytics_tools.json': 'analytics',
    '_raw_seo_pl.json': 'analytics',
    'research-index.json': 'analytics',
    'financial-analytics.json': 'finanse',
    'financial-sentiment.json': 'finanse',
    'financial-tweets-sentiment.json': 'finanse',
    'finance-forecasting-ai.json': 'finanse',
    'financial-analysis-company-checklist.json': 'finanse',
    '_raw_finance_forecasting.json': 'finanse',
    'ai-business-models-saas.json': 'business',
    'ai-competitive-landscape.json': 'business',
    'ai-in-business.json': 'business',
    'business-trends-2026.json': 'business',
    'market-opportunities.json': 'business',
    'ai-monetization-online-income.json': 'business',
    'ai-market-trends-statistics.json': 'business',
    'ai-ethics-safety.json': 'business',
    'ai-funding-valuations.json': 'business',
    'ai-genai-tools-comparison.json': 'business',
    'ai-implementation-case-studies.json': 'business',
    'ai-regulation-compliance.json': 'business',
    'ai-talent-market.json': 'business',
    'online-business-growth-tools.json': 'business',
    'ai-on-android-apps.json': 'business',
    '_raw_ai_monetization.json': 'business',
    '_raw_online_business.json': 'business',
    'ecommerce-growth.json': 'ecommerce',
    'b2b-sales-data.json': 'ecommerce',
    'ecommerce-chatbot-training.json': 'ecommerce',
    'ecommerce-support-qa.json': 'ecommerce',
    'midjourney-detailed-prompts.json': 'art',
    'midjourney-prompts.json': 'art',
    'sd-prompts.json': 'art',
    'sdxl-prompts.json': 'art',
  };

  // Pliki gdzie warto wydobywać narzędzia (zawierają opisy narzędzi)
  const toolFiles = new Set([
    '_raw_analytics_tools.json',
    'seo-analytics-poland-free-tools.json',
    'website-analytics-free-tools.json',
    '_raw_seo_pl.json',
    'ai-genai-tools-comparison.json',
    'online-business-growth-tools.json',
    '_raw_online_business.json',
    '_raw_ai_monetization.json',
    'ai-on-android-apps.json',
    'ai-in-business.json',
    'ai-business-models-saas.json',
    'ai-competitive-landscape.json',
    'ai-funding-valuations.json',
    'market-opportunities.json',
    'ecommerce-growth.json',
    'ecommerce-chatbot-training.json',
    // ← dodane brakujące
    'business-trends-2026.json',
    'financial-analytics.json',
    '_raw_finance_forecasting.json',
    'ai-monetization-online-income.json',
    'ai-market-trends-statistics.json',
    'ai-talent-market.json',
    'ai-regulation-compliance.json',
    'ai-ethics-safety.json',
    'ai-implementation-case-studies.json',
    'finance-forecasting-ai.json',
    'financial-analysis-company-checklist.json',
  ]);

  for (let i = 0; i < files.length; i++) {
    const fname = files[i];
    const fpath = join(DATASETS_DIR, fname);
    const cat = fileCategoryMap[fname] || 'other';

    process.stdout.write(`[${i + 1}/${files.length}] ${fname} (${cat}) ... `);

    let data;
    try {
      const raw = readFileSync(fpath, 'utf8').replace(/^\uFEFF/, '');
      data = JSON.parse(raw);
    } catch (e) {
      console.log(`❌ JSON parse error: ${e.message}`);
      continue;
    }

    // ── 1. Ekstrakcja URL ────────────────────────────────
    const rawUrls = [];
    extractUrlsFromObject(data, rawUrls);
    const uniqueUrls = [...new Set(rawUrls)].filter(u =>
      !u.includes('localhost') && !u.startsWith('https://api.') &&
      u.length > 15 && u.length < 300
    );

    if (uniqueUrls.length > 0) {
      // Dla Tavily files, zbierz URL z results (z tytułami)
      const resultsWithMeta = [];
      const resultsArr = data.results || data.raw_searches?.flatMap(s => s.results || []) || [];
      resultsArr.forEach(r => {
        if (r?.url) resultsWithMeta.push({ url: r.url, title: r.title || '', score: r.score || 0, source: fname, cat });
      });

      if (resultsWithMeta.length > 0) {
        allLinks.push(...resultsWithMeta);
      } else {
        uniqueUrls.slice(0, 20).forEach(u => allLinks.push({ url: u, title: '', score: 0, source: fname, cat }));
      }
      console.log(`🔗 ${uniqueUrls.length} URL`);
    } else {
      console.log('(brak URL)');
    }

    // ── 2. Wydobycie narzędzi + tłumaczenie (tylko wybrane pliki) ──
    if (toolFiles.has(fname)) {
      await sleep(300); // rate limit

      // Pobierz treść do analizy
      let textContent = '';
      if (data.answer) textContent += data.answer + '\n\n';
      if (data.summary) textContent += data.summary + '\n\n';
      if (data.raw_searches) {
        data.raw_searches.forEach(s => {
          if (s.answer) textContent += s.answer + '\n';
          s.results?.slice(0, 2).forEach(r => { if (r.content) textContent += r.content.slice(0, 500) + '\n'; });
        });
      }
      if (data.results) {
        data.results.slice(0, 3).forEach(r => { if (r.content) textContent += r.content.slice(0, 500) + '\n'; });
      }

      if (textContent.length > 100) {
        process.stdout.write(`  🤖 AI tools extraction ... `);
        const tools = await extractToolsFromContent(textContent, cat, fname.replace('.json', ''));
        if (tools.length > 0) {
          allTools.push(...tools);
          console.log(`✅ ${tools.length} narzędzi`);
        } else {
          console.log('0 narzędzi');
        }

        // Tłumaczenie angielskich answers
        const answerToTranslate = data.answer || (data.raw_searches?.[0]?.answer) || '';
        const transKey = fname.replace('.json', '');
        if (answerToTranslate && isEnglish(answerToTranslate) && !translations[transKey]) {
          await sleep(300);
          process.stdout.write(`  🌍 Tłumaczenie ... `);
          const pl = await translateToPolish(answerToTranslate, fname);
          if (pl) {
            translations[transKey] = { original_en: answerToTranslate.slice(0, 200) + '...', translated_pl: pl };
            console.log(`✅ ${pl.length} znaków`);
          } else { console.log('skip'); }
        }
      }
    }
  }

  // ── Deduplikacja narzędzi ──────────────────────────────────────
  const toolsByName = new Map();
  allTools.forEach(t => {
    const key = t.name?.toLowerCase().replace(/\s+/g, '-');
    if (!key) return;
    if (!toolsByName.has(key) || (t.url && !toolsByName.get(key).url)) {
      toolsByName.set(key, t);
    }
  });
  const dedupedTools = [...toolsByName.values()].sort((a, b) => a.category?.localeCompare(b.category) || a.name?.localeCompare(b.name));

  // ── Deduplikacja linków ────────────────────────────────────────
  const linksByUrl = new Map();
  allLinks.forEach(l => {
    if (!linksByUrl.has(l.url) || l.score > (linksByUrl.get(l.url)?.score || 0)) {
      linksByUrl.set(l.url, l);
    }
  });
  const dedupedLinks = [...linksByUrl.values()].sort((a, b) => (b.score || 0) - (a.score || 0));

  // ── Zapis wyniku ───────────────────────────────────────────────
  const output = {
    generated: new Date().toISOString().slice(0, 10),
    model: CF_MODEL,
    stats: {
      tools_total: dedupedTools.length,
      links_total: dedupedLinks.length,
      translations_total: Object.keys(translations).length,
      files_processed: files.length
    },
    tools_by_category: {
      analytics: dedupedTools.filter(t => t.category === 'analytics'),
      finanse: dedupedTools.filter(t => t.category === 'finanse'),
      business: dedupedTools.filter(t => t.category === 'business'),
      ecommerce: dedupedTools.filter(t => t.category === 'ecommerce'),
      art: dedupedTools.filter(t => t.category === 'art'),
      other: dedupedTools.filter(t => !['analytics','finanse','business','ecommerce','art'].includes(t.category))
    },
    all_tools: dedupedTools,
    top_links: dedupedLinks.slice(0, 200),
    all_links: dedupedLinks,
    translations
  };

  writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), 'utf8');

  console.log('\n' + '═'.repeat(60));
  console.log('✅ GOTOWE');
  console.log(`   Narzędzia: ${dedupedTools.length} (po deduplikacji)`);
  console.log(`   Linki: ${dedupedLinks.length} (po deduplikacji)`);
  console.log(`   Tłumaczenia: ${Object.keys(translations).length}`);
  console.log(`   Output: ${OUTPUT_FILE}`);
  console.log('═'.repeat(60));
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
