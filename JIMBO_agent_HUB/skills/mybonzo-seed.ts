/**
 * mybonzo-seed.ts
 * Seeduje skills biznesowe dla mybonzo.com (namespace: mybonzo)
 * do JIMBO HUB skill-manager.
 *
 * Uruchamiaj: npx tsx skills/mybonzo-seed.ts
 * (lub przez hub: POST /skills/save dla każdego)
 */

import { SkillManager } from './skill-manager.js';

const skills = new SkillManager();

const MYBONZO_SKILLS = [
  {
    name: 'mybonzo-stack',
    description: 'Stack technologiczny mybonzo.com — Astro 5 SSR + CF Pages + D1 + R2',
    namespace: 'mybonzo',
    tags: ['astro', 'cloudflare', 'architecture', 'mybonzo'],
    code: `# mybonzo.com — ZENON Biznes HUB

## Stack
- **Frontend**: Astro 5 SSR + React 18 + Tailwind CSS 3
- **Deploy**: Cloudflare Pages → wrangler pages deploy dist --project-name=mybonzo-new
- **Repo**: github.com/Bonzokoles/luc-de-zen-on (branch: main)

## Cloudflare Bindings
- D1: \`mybonzo\` (database_id: 84f0f3cb-7778-4cc4-a6ba-e823ef52f1f3)
- R2: \`mybonzo-finanse\` (dokumenty finansowe)
- Workers AI: Gemma/Llama/Mistral (fallback)

## AI Providers
- Primary: OpenAI gpt-4o
- Fallback 1: Google Gemini 2.0 Flash
- Fallback 2: CF Workers AI (llama-3.1-8b, gemma-7b, mistral-7b)

## Dev
- Port: 4321 (astro dev)
- SSR env: \`locals.runtime?.env?.KEY\` (NIE process.env)
- Secrets: npx wrangler pages secret put NAZWA --project-name mybonzo-new

## Deploy
\`\`\`bash
npm run deploy   # astro build + git push → CF auto-deploy
\`\`\``,
  },

  {
    name: 'mybonzo-features',
    description: 'Lista funkcji ERP/CRM mybonzo.com — moduły i strony',
    namespace: 'mybonzo',
    tags: ['erp', 'crm', 'features', 'mybonzo'],
    code: `# mybonzo.com — Moduły ERP/CRM

## Zaimplementowane strony (src/pages/)
- \`/\` — dashboard główny
- \`/finanse\` — Finanse Pro (faktury, VAT, ryzyko AI przez Gemini)
- \`/crm-klienci\` — CRM (kontakty, pipeline sprzedaży)
- \`/magazyn\` — Magazyn (stany, zamówienia)
- \`/projekty\` — Zarządzanie projektami
- \`/dziennik\` — Dziennik Firmowy (wpisy, eksport)
- \`/ai-biznes-erp\` — AI Doradca (6 ról)
- \`/analityka-raporty\` — Analityka i raporty
- \`/asystent-ai\` — Asystent AI (chat)
- \`/seo-analityka\` — SEO + Analityka
- \`/narzedzia\` — Narzędzia hub
- \`/unified-ops\` — Operacje zjednoczone
- \`/bi-dashboard\` — BI Dashboard (visx charts)
- \`/wizualizacje\` — Wizualizacje (XYFlow/React Flow)
- \`/mcp\` — MCP panel
- \`/chuck-jimbo\` — Chuck/Jimbo chat

## Tenant
- tenantId: \`meblepumo\` (domyślny klient testowy)`,
  },

  {
    name: 'mybonzo-ai-roles',
    description: '6 ról AI Doradcy w mybonzo.com — prompty i zakres kompetencji',
    namespace: 'mybonzo',
    tags: ['ai', 'doradca', 'roles', 'mybonzo', 'business'],
    code: `# AI Doradca mybonzo.com — 6 Ról

## Rola 1: Księgowy AI
**Zakres**: Faktury VAT, koszty uzyskania przychodów, przychody, bilans, deklaracje
**Prompt prefix**: "Jesteś doświadczonym polskim księgowym specjalizującym się w MŚP..."
**Narzędzia**: Analiza dokumentów (Gemini Vision), kalkulator VAT, export do D1

## Rola 2: Prawnik Biznesowy AI
**Zakres**: Umowy, regulaminy, RODO, prawo pracy, spory z kontrahentami
**Prompt prefix**: "Jesteś prawnikiem specjalizującym się w prawie gospodarczym w Polsce..."
**Zastrzeżenie**: Informacje ogólne, nie zastępują porady prawnej

## Rola 3: HR Doradca AI
**Zakres**: Rekrutacja, umowy o pracę, zwolnienia, urlopy, wynagrodzenia
**Prompt prefix**: "Jesteś specjalistą HR z doświadczeniem w polskich firmach MŚP..."

## Rola 4: Analityk Finansowy AI
**Zakres**: Analiza płynności, rentowności, EBITDA, prognozowanie, ryzyko
**Prompt prefix**: "Jesteś analitykiem finansowym specjalizującym się w MŚP..."
**Model**: gpt-4o (złożone obliczenia), Gemini Flash (szybkie pytania)

## Rola 5: Doradca CRM/Sprzedaż AI
**Zakres**: Pipeline sprzedaży, lead scoring, follow-up, strategie cenowe
**Prompt prefix**: "Jesteś ekspertem sprzedaży B2B dla polskich firm..."

## Rola 6: Doradca Operacyjny AI
**Zakres**: Procesy, optymalizacja magazynu, logistyka, dostawcy, KPI
**Prompt prefix**: "Jesteś ekspertem operacyjnym specjalizującym się w optymalizacji MŚP..."`,
  },

  {
    name: 'mybonzo-d1-schema',
    description: 'Schemat bazy D1 mybonzo — tabele, kolumny, typowe zapytania',
    namespace: 'mybonzo',
    tags: ['d1', 'database', 'schema', 'mybonzo', 'sqlite'],
    code: `# mybonzo D1 — Schemat bazy danych

## Binding: \`mybonzo\` (database_id: 84f0f3cb-7778-4cc4-a6ba-e823ef52f1f3)
## Dostęp w Astro SSR: \`locals.runtime.env.DB\`

## Kluczowe tabele

### admin_storage (key-value store)
\`\`\`sql
CREATE TABLE admin_storage (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TEXT DEFAULT (datetime('now'))
);
\`\`\`

### Typowe zapytania CF Worker/Astro
\`\`\`typescript
// Odczyt
const result = await env.DB.prepare('SELECT value FROM admin_storage WHERE key = ?')
  .bind(key).first<{value: string}>();

// Zapis
await env.DB.prepare('INSERT OR REPLACE INTO admin_storage (key, value) VALUES (?, ?)')
  .bind(key, JSON.stringify(data)).run();
\`\`\`

## R2: mybonzo-finanse
- Pliki finansowe (faktury PDF, dokumenty)
- Dostęp: \`locals.runtime.env.R2_FINANSE\`
\`\`\`typescript
const obj = await env.R2_FINANSE.get(key);
await env.R2_FINANSE.put(key, body, { httpMetadata: { contentType } });
\`\`\``,
  },

  {
    name: 'mybonzo-api-patterns',
    description: 'Wzorce API Astro SSR dla mybonzo.com — endpointy, auth, error handling',
    namespace: 'mybonzo',
    tags: ['api', 'astro', 'patterns', 'mybonzo', 'cloudflare'],
    code: `# mybonzo.com — Wzorce API Astro SSR

## Plik API w src/pages/api/

\`\`\`typescript
import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request, locals }) => {
  // Dostęp do env (SSR — NIE process.env!)
  const env = locals.runtime?.env;
  const apiKey = env?.OPENAI_API_KEY;

  try {
    const body = await request.json() as { query: string };

    // AI call
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: \`Bearer \${apiKey}\`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: body.query }]
      })
    });

    return new Response(JSON.stringify(await response.json()), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
};
\`\`\`

## Secrets (dodaj przez Wrangler)
\`\`\`bash
npx wrangler pages secret put OPENAI_API_KEY --project-name mybonzo-new
npx wrangler pages secret put ANTHROPIC_API_KEY --project-name mybonzo-new
npx wrangler pages secret put GOOGLE_API_KEY --project-name mybonzo-new
\`\`\`

## Lokalne testy
\`\`\`bash
npx wrangler pages dev dist --compatibility-flag=nodejs_compat
\`\`\``,
  },

  {
    name: 'blog-jimbo-org-stack',
    description: 'Stack jimbo.org — Vite/React + Vercel, AI Social Club blog',
    namespace: 'blog',
    tags: ['jimbo-org', 'vite', 'react', 'vercel', 'blog'],
    code: `# jimbo.org — AI Social Club Blog

## Stack
- Vite + React (JSX) + Tailwind
- Deploy: Vercel (vercel.json)
- Package: \`jimbo77-ai-social-club\`

## Features
- Polski hub technologiczny AI & DevOps
- Skills system: \`skills/\` folder + \`skills-lock.json\` (11 skill packages z CF/Vercel)
- Sklonowane skills: agents-sdk, ai-sdk, building-ai-agent-on-cloudflare, durable-objects, workers-best-practices

## Struktura src/
- Publisher: \`publisher/\` — narzędzia do publikowania
- Templates: \`templates/\` — szablony postów

## Integracja z JIMBO HUB
- skills-lock.json można importować do hub skill-manager
- Namespace: \`blog\``,
  },

  {
    name: 'blog-jimbo77-stack',
    description: 'Stack jimbo77.com — Next.js + CF Workers, R2 assets',
    namespace: 'blog',
    tags: ['jimbo77', 'nextjs', 'cloudflare-workers', 'opennext'],
    code: `# jimbo77.com — Blog/Community

## Stack
- Next.js + OpenNext (CF Workers adapter)
- Deploy: Cloudflare Workers (wrangler deploy)
- Name: \`the-jimbo77com-nxt\`

## Bindings
- R2: \`jimbo77com-assets\` (media, zdjęcia)
- Admin: ADMIN_KEY=Haos1977

## Deploy
\`\`\`bash
npx opennextjs-cloudflare build
wrangler deploy
\`\`\`

## Dostęp do R2 w Next.js (CF Workers)
\`\`\`typescript
// W API Route (app/api/...)
export const runtime = 'edge';
// env przez process.env lub getRequestContext
\`\`\``,
  },

  {
    name: 'blog-mybonzoai-stack',
    description: 'Stack mybonzoai blog — Astro + CF Pages + D1 (jimbo-rag-db + analytics)',
    namespace: 'blog',
    tags: ['mybonzoai', 'astro', 'cloudflare-pages', 'd1', 'rag'],
    code: `# mybonzoai blog — Astro + CF Pages

## Stack
- Astro + CF Pages
- Name: \`mybonzoaiblog\`

## Cloudflare Bindings
- D1: \`jimbo-rag-db\` (database_id: 08ec6390-7b9f-4177-8e37-d1daed7c67bc)
- D1: \`analytics-db\` (database_id: d881af54-3b21-4193-834b-7ac54d5ac44d)

## Klucze
- OPENAI_API_KEY, ANTHROPIC_API_KEY, HUGGINGFACE_API_KEY
- PERPLEXITY_API_KEY, DEEPSEEK_API_KEY, OPENROUTER_API_KEY

## Deploy
\`\`\`bash
astro build
wrangler pages deploy dist --project-name mybonzoaiblog
\`\`\`

## Lokalna replika DB
- \`jimbo_rag_db_replica.sql\` — lokalna kopia D1`,
  },
];

async function seed() {
  console.log('[mybonzo-seed] Seedowanie skills biznesowych...\n');
  let added = 0;
  let skipped = 0;

  for (const s of MYBONZO_SKILLS) {
    try {
      const existing = skills.list(s.namespace).find(e => e.name === s.name);
      if (existing) {
        console.log(`  ⏭  Już istnieje: ${s.name} [${s.namespace}]`);
        skipped++;
        continue;
      }
      await skills.save(s);
      console.log(`  ✓  Dodano: ${s.name} [${s.namespace}]`);
      added++;
    } catch (e) {
      console.error(`  ✗  Błąd przy ${s.name}:`, e);
    }
  }

  console.log(`\n[mybonzo-seed] Gotowe: ${added} dodanych, ${skipped} pominiętych`);
  console.log(`[mybonzo-seed] Łącznie w bazie: ${skills.count()} skills`);
  process.exit(0);
}

seed().catch(e => { console.error(e); process.exit(1); });
