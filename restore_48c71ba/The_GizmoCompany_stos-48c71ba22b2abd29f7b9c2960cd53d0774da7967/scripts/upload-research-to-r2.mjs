#!/usr/bin/env node
/**
 * upload-research-to-r2.mjs
 * Wgrywa dane z Tavily Research Crawler do odpowiednich bucketów R2.
 *
 * Buckety:
 *   mybonzo-analytics  → pliki analytics (kategorie: 08_ANALYTICS, _raw_analytics)
 *   mybonzo-finanse     → pliki finansowe (kategorie: 06_FINANCE, finance, financial-*)
 *
 * Użycie:
 *   node scripts/upload-research-to-r2.mjs
 *   node scripts/upload-research-to-r2.mjs --dry-run
 *   node scripts/upload-research-to-r2.mjs --file financial-analytics.json
 */

import { execSync } from 'child_process';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, resolve, basename } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '..');
const DATASETS_DIR = join(ROOT, 'ai-hub', 'js', 'data', 'datasets');

// --- Konfiguracja bucketów ---
const BUCKETS = {
  ANALYTICS: 'mybonzo-analytics',
  FINANSE: 'mybonzo-finanse',
};

// Mapowanie kategorii JSON (pole "category") → bucket + prefiks
const CATEGORY_MAP = {
  '08_ANALYTICS': { bucket: BUCKETS.ANALYTICS, prefix: 'analytics' },
  '06_FINANCE':   { bucket: BUCKETS.FINANSE,   prefix: 'finance' },
  'finance':      { bucket: BUCKETS.FINANSE,   prefix: 'finance' },
};

// Mapowanie wzorców nazw plików (fallback gdy brak/zły category)
const FILENAME_PATTERNS = [
  { pattern: /^_raw_analytics/i,              bucket: BUCKETS.ANALYTICS, prefix: 'raw' },
  { pattern: /^_raw_finance|^_raw_finans/i,   bucket: BUCKETS.FINANSE,   prefix: 'raw' },
  { pattern: /^financial-|^finance-/i,        bucket: BUCKETS.FINANSE,   prefix: 'finance' },
  { pattern: /analytics/i,                    bucket: BUCKETS.ANALYTICS, prefix: 'analytics' },
];

/**
 * Wyznacz cel uploadu dla pliku.
 * Zwraca { bucket, prefix } lub null gdy plik nie pasuje do żadnego bucketu.
 */
function resolveTarget(filePath) {
  const filename = basename(filePath);

  // Spróbuj odczytać pole "category" z JSON
  try {
    const raw = readFileSync(filePath, 'utf8');
    // Tylko pliki z płaską strukturą (nie listy)
    const first = raw.trimStart()[0];
    if (first === '{') {
      const data = JSON.parse(raw);
      if (data.category && typeof data.category === 'string') {
        const mapped = CATEGORY_MAP[data.category];
        if (mapped) return mapped;
      }
    }
  } catch {
    // Ignoruj błędy parsowania, użyj fallbacku
  }

  // Fallback: wzorce nazw plików
  for (const { pattern, bucket, prefix } of FILENAME_PATTERNS) {
    if (pattern.test(filename)) return { bucket, prefix };
  }

  return null;
}

/**
 * Wykonaj upload jednego pliku do R2.
 */
function uploadFile(filePath, bucket, prefix, dryRun) {
  const filename = basename(filePath);
  const objectKey = `${prefix}/${filename}`;
  const cmd = `npx wrangler r2 object put "${bucket}/${objectKey}" --file "${filePath}" --content-type "application/json"`;

  if (dryRun) {
    console.log(`  [DRY-RUN] ${cmd}`);
    return true;
  }

  try {
    execSync(cmd, { cwd: ROOT, stdio: 'pipe' });
    return true;
  } catch (err) {
    console.error(`  BŁĄD: ${err.stderr?.toString() || err.message}`);
    return false;
  }
}

// --- Main ---
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const onlyFile = args.find(a => !a.startsWith('--'));

const allFiles = readdirSync(DATASETS_DIR)
  .filter(f => f.endsWith('.json'))
  .map(f => join(DATASETS_DIR, f));

const targetFiles = onlyFile
  ? allFiles.filter(f => basename(f) === onlyFile || basename(f).includes(onlyFile))
  : allFiles;

if (targetFiles.length === 0) {
  console.error(`Nie znaleziono pliku: ${onlyFile}`);
  process.exit(1);
}

console.log(`\n📦 Upload Research → R2${dryRun ? ' [DRY-RUN]' : ''}`);
console.log(`   Katalog: ${DATASETS_DIR}`);
console.log(`   Pliki:   ${targetFiles.length}\n`);

const results = {
  uploaded: [],
  skipped: [],
  failed: [],
};

for (const filePath of targetFiles) {
  const filename = basename(filePath);
  const target = resolveTarget(filePath);

  if (!target) {
    results.skipped.push(filename);
    console.log(`  ⏭  ${filename} → pomijam (brak mapowania)`);
    continue;
  }

  const { bucket, prefix } = target;
  const sizeKB = Math.round(statSync(filePath).size / 1024 * 10) / 10;
  console.log(`  ⬆  ${filename} → ${bucket}/${prefix}/ (${sizeKB} KB)`);

  const ok = uploadFile(filePath, bucket, prefix, dryRun);
  if (ok) {
    results.uploaded.push(`${bucket}/${prefix}/${filename}`);
  } else {
    results.failed.push(filename);
  }
}

// --- Podsumowanie ---
console.log(`\n${'─'.repeat(55)}`);
console.log(`✅ Wgrano:   ${results.uploaded.length}`);
console.log(`⏭  Pominięto: ${results.skipped.length}`);
if (results.failed.length > 0) {
  console.log(`❌ Błędy:    ${results.failed.length}`);
  results.failed.forEach(f => console.log(`   • ${f}`));
}

if (results.uploaded.length > 0 && !dryRun) {
  console.log('\nWgrane obiekty:');
  results.uploaded.forEach(obj => console.log(`  • ${obj}`));
}

console.log('');
if (results.failed.length > 0) process.exit(1);
