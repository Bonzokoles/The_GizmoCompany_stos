/**
 * all-skills-seed.ts
 * Seeduje WSZYSTKIE skille użycia narzędzi do JIMBO HUB skills.db
 * Pokrywa namespace'y: analytics, search, media, finance, devtools, global, mybonzo, blog
 *
 * Uruchamiaj: npx tsx skills/all-skills-seed.ts
 */

import { SkillManager } from './skill-manager.js';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const skills = new SkillManager();

function loadSkill(relPath: string): string {
  const full = join(__dirname, relPath);
  if (!existsSync(full)) { console.warn(`  ⚠  Plik nie istnieje: ${relPath}`); return ''; }
  return readFileSync(full, 'utf-8').split('\n').filter(l => !l.startsWith('//')).join('\n').trim();
}

const ALL_SKILLS = [
  // ── ANALYTICS ─────────────────────────────────────────────────────────────
  {
    name: 'analytics-usage',
    description: 'Jak używać narzędzi analitycznych (Umami, Plausible, Superset, goAccess) przez JIMBO HUB',
    namespace: 'analytics',
    tags: ['analytics', 'umami', 'plausible', 'superset', 'podman'],
    code: loadSkill('library/analytics/analytics-usage.ts'),
  },

  // ── SEARCH ────────────────────────────────────────────────────────────────
  {
    name: 'search-usage',
    description: 'Jak używać narzędzi wyszukiwania (Meilisearch, SearXNG, sist2, websurfx) przez JIMBO HUB',
    namespace: 'search',
    tags: ['search', 'meilisearch', 'searxng', 'sist2', 'fulltext'],
    code: loadSkill('library/search/search-usage.ts'),
  },

  // ── MEDIA ─────────────────────────────────────────────────────────────────
  {
    name: 'media-usage',
    description: 'Jak używać mydia (media processing), CF Images i R2 do obsługi mediów',
    namespace: 'media',
    tags: ['media', 'mydia', 'images', 'r2', 'cloudflare'],
    code: loadSkill('library/media/media-usage.ts'),
  },

  // ── FINANCE ───────────────────────────────────────────────────────────────
  {
    name: 'finance-usage',
    description: 'Jak używać modułów finansowych mybonzo.com (faktury, VAT, D1, AI Doradca) przez JIMBO HUB',
    namespace: 'finance',
    tags: ['finance', 'faktury', 'vat', 'd1', 'mybonzo', 'ai-doradca'],
    code: loadSkill('library/finance/finance-usage.ts'),
  },

  // ── DEVTOOLS ──────────────────────────────────────────────────────────────
  {
    name: 'devtools-usage',
    description: 'Jak używać CF Pages deploy, D1 queries, GitHub Actions, Podman przez JIMBO HUB',
    namespace: 'devtools',
    tags: ['devtools', 'cloudflare', 'github', 'deploy', 'd1', 'podman', 'ci-cd'],
    code: loadSkill('library/devtools/devtools-usage.ts'),
  },

  // ── GLOBAL ────────────────────────────────────────────────────────────────
  {
    name: 'global-hub-usage',
    description: 'Jak używać JIMBO HUB core — memory (3-tier), Goose agent, skills management, sessions',
    namespace: 'global',
    tags: ['hub', 'memory', 'goose', 'skills', 'session', 'core'],
    code: loadSkill('library/global/global-hub-usage.ts'),
  },

  // ── MYBONZO ───────────────────────────────────────────────────────────────
  {
    name: 'mybonzo-usage',
    description: 'Jak używać mybonzo.com ERP/CRM przez JIMBO HUB — finanse, CRM, projekty, AI Doradca',
    namespace: 'mybonzo',
    tags: ['mybonzo', 'erp', 'crm', 'usage', 'ai-doradca', 'workflow'],
    code: loadSkill('library/mybonzo/mybonzo-usage.ts'),
  },

  // ── BLOG (nowe skille z poprzedniej sesji) ────────────────────────────────
  {
    name: 'blog-generate-workflow',
    description: 'Pełny workflow generowania artykułu blogowego — research, generacja, zapis do D1, deploy',
    namespace: 'blog',
    tags: ['blog', 'generate', 'workflow', 'article', 'mybonzoai'],
    code: loadSkill('library/blog/blog-generate-workflow.ts'),
  },
  {
    name: 'blog-moa-tools-usage',
    description: 'Jak używać narzędzi MOA/JIMBO (agenci, pipeline, endpoints) do zadań blogowych',
    namespace: 'blog',
    tags: ['blog', 'moa', 'tools', 'agents', 'hub', 'pipeline'],
    code: loadSkill('library/blog/blog-moa-tools-usage.ts'),
  },
];

async function seed() {
  console.log('[all-skills-seed] Seedowanie wszystkich skills użycia narzędzi...\n');
  const stats = { added: 0, updated: 0, skipped: 0, error: 0 };

  for (const s of ALL_SKILLS) {
    if (!s.code) { stats.skipped++; continue; }
    try {
      const existing = skills.list(s.namespace).find(e => e.name === s.name);
      if (existing) {
        skills.delete(existing.id);
        await skills.save(s);
        console.log(`  ↻  Zaktualizowano: ${s.name} [${s.namespace}]`);
        stats.updated++;
      } else {
        await skills.save(s);
        console.log(`  ✓  Dodano: ${s.name} [${s.namespace}]`);
        stats.added++;
      }
    } catch (e) {
      console.error(`  ✗  Błąd przy ${s.name}:`, e);
      stats.error++;
    }
  }

  console.log('\n[all-skills-seed] ═══════════════════════════════════');
  console.log(`  Dodano:        ${stats.added}`);
  console.log(`  Zaktualizowano: ${stats.updated}`);
  console.log(`  Pominięto:     ${stats.skipped}`);
  console.log(`  Błędy:         ${stats.error}`);
  console.log(`  Łącznie w DB:  ${skills.count()} skills`);
  console.log('\n  Namespacey w bazie:');
  const byNs = skills.countByNamespace();
  for (const [ns, count] of Object.entries(byNs)) {
    console.log(`    ${ns.padEnd(12)} → ${count} skills`);
  }
  process.exit(stats.error > 0 ? 1 : 0);
}

seed().catch(e => { console.error(e); process.exit(1); });
