/**
 * blog-seed.ts
 * Seeduje skills blogowe (namespace: blog) do JIMBO HUB skill-manager.
 * Uczy BUCH jak generować artykuły używając narzędzi MOA/HUB.
 *
 * Uruchamiaj: npx tsx skills/blog-seed.ts
 */

import { SkillManager } from './skill-manager.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const skills = new SkillManager();

function loadSkill(relPath: string): string {
  const full = join(__dirname, relPath);
  const raw = readFileSync(full, 'utf-8');
  // Usuń linie komentarzy nagłówkowych (// ...)
  return raw.split('\n').filter(l => !l.startsWith('//')).join('\n').trim();
}

const BLOG_SKILLS = [
  {
    name: 'blog-generate-workflow',
    description: 'Pełny workflow generowania artykułu blogowego — research, generacja, zapis do D1, deploy',
    namespace: 'blog',
    tags: ['blog', 'generate', 'workflow', 'article', 'mybonzoai', 'jimbo-org'],
    code: loadSkill('library/blog/blog-generate-workflow.ts'),
  },
  {
    name: 'blog-moa-tools-usage',
    description: 'Jak używać narzędzi MOA/JIMBO (agenci, pipeline, endpoints) do zadań blogowych',
    namespace: 'blog',
    tags: ['blog', 'moa', 'tools', 'agents', 'hub', 'pipeline'],
    code: loadSkill('library/blog/blog-moa-tools-usage.ts'),
  },
  {
    name: 'blog-mybonzoai-stack',
    description: 'Stack mybonzoai blog — Astro + CF Pages + D1 (jimbo-rag-db + analytics)',
    namespace: 'blog',
    tags: ['mybonzoai', 'astro', 'cloudflare-pages', 'd1', 'rag'],
    code: loadSkill('library/blog/blog-mybonzoai-stack.ts'),
  },
  {
    name: 'blog-jimbo-org-stack',
    description: 'Stack jimbo.org — Vite/React + Vercel, AI Social Club blog',
    namespace: 'blog',
    tags: ['jimbo-org', 'vite', 'react', 'vercel', 'blog'],
    code: loadSkill('library/blog/blog-jimbo-org-stack.ts'),
  },
  {
    name: 'blog-jimbo77-stack',
    description: 'Stack jimbo77 blog',
    namespace: 'blog',
    tags: ['jimbo77', 'blog'],
    code: loadSkill('library/blog/blog-jimbo77-stack.ts'),
  },
];

async function seed() {
  console.log('[blog-seed] Seedowanie skills blogowych...\n');
  let added = 0;
  let skipped = 0;
  let updated = 0;

  for (const s of BLOG_SKILLS) {
    try {
      const existing = skills.list(s.namespace).find(e => e.name === s.name);
      if (existing) {
        // Usuń stary i dodaj nowy (brak metody update w SkillManager)
        skills.delete(existing.id);
        await skills.save(s);
        console.log(`  ↻  Zaktualizowano: ${s.name} [${s.namespace}]`);
        updated++;
      } else {
        await skills.save(s);
        console.log(`  ✓  Dodano: ${s.name} [${s.namespace}]`);
        added++;
      }
    } catch (e) {
      console.error(`  ✗  Błąd przy ${s.name}:`, e);
    }
  }

  console.log(`\n[blog-seed] Gotowe: ${added} dodanych, ${updated} zaktualizowanych, ${skipped} pominiętych`);
  console.log(`[blog-seed] Łącznie w bazie: ${skills.count()} skills`);
  process.exit(0);
}

seed().catch(e => { console.error(e); process.exit(1); });
