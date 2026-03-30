#!/usr/bin/env node
/**
 * PROCESS-PENDING — Przetwarza zatwierdzone pozycje z pending do datasets
 * =========================================================================
 * Wczytuje approval-queue.json (eksport z Crawler Dashboard) i move items
 * do odpowiednich plików datasets.
 *
 * Użycie:
 *   node scripts/process-pending.mjs
 *   node scripts/process-pending.mjs --approve-all   (auto-zatwierdź score≥6)
 *   node scripts/process-pending.mjs --dry-run       (tylko pokaż, nie zapisuj)
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { join, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '..');

const PENDING_DIR  = join(ROOT, 'ai-hub', 'js', 'data', 'pending');
const DATASETS_DIR = join(ROOT, 'ai-hub', 'js', 'data', 'datasets');
const LOG_FILE     = join(ROOT, 'ai-hub', 'js', 'data', 'crawler-log.json');

const DRY_RUN     = process.argv.includes('--dry-run');
const APPROVE_ALL = process.argv.includes('--approve-all');
const MIN_SCORE   = APPROVE_ALL ? 6 : 99; // 99 = tylko z approval-queue.json

const today = new Date().toISOString().slice(0, 10);

console.log('\n🔄 PROCESS-PENDING — Przetwarzanie zatwierdzonych elementów');
console.log(`   Tryb: ${DRY_RUN ? 'DRY-RUN (bez zapisu)' : 'zapis'}`);
console.log(`   Strategia: ${APPROVE_ALL ? `auto-zatwierdź score≥${MIN_SCORE}` : 'tylko approval-queue.json'}\n`);

// ─── WCZYTAJ DANE ────────────────────────────────────────────────────────────
if (!existsSync(PENDING_DIR)) {
  console.error('❌ Brak folderu pending:', PENDING_DIR);
  process.exit(1);
}

let itemsToProcess = [];
let processedCount = 0;
let skippedCount   = 0;

if (APPROVE_ALL) {
  // Przejdź przez wszystkie pliki batch-*.json w pending/
  const files = readdirSync(PENDING_DIR).filter(f => f.startsWith('batch-') && f.endsWith('.json'));
  console.log(`📁 Znaleziono ${files.length} plików batch w pending/`);

  for (const file of files) {
    try {
      const batch = JSON.parse(readFileSync(join(PENDING_DIR, file), 'utf-8'));
      for (const item of (batch.items || [])) {
        if ((item.ai_score || 0) >= MIN_SCORE && item.status !== 'approved' && item.status !== 'rejected') {
          itemsToProcess.push({
            ...item,
            _source_file: file,
            _slot_name: batch.slot_name || '',
            _category: batch.category || '',
          });
        }
      }
    } catch (e) {
      console.warn(`⚠ Pominięto ${file}: ${e.message}`);
    }
  }
  console.log(`📊 Do przetworzenia (score≥${MIN_SCORE}): ${itemsToProcess.length} elementów\n`);
} else {
  // Wczytaj approval-queue.json
  const aqPath = join(PENDING_DIR, 'approval-queue.json');
  if (!existsSync(aqPath)) {
    console.error('❌ Brak pliku approval-queue.json w:', PENDING_DIR);
    console.error('   → Eksportuj zatwierdzone pozycje z Crawler Dashboard i zapisz jako:');
    console.error('   →', aqPath);
    process.exit(1);
  }

  try {
    const queue = JSON.parse(readFileSync(aqPath, 'utf-8'));
    console.log(`📋 approval-queue.json: ${queue.total || 0} elementów, utworzono ${queue.created_at?.slice(0, 16) || 'bd.'}\n`);
    for (const group of (queue.groups || [])) {
      for (const item of (group.items || [])) {
        itemsToProcess.push({
          ...item,
          _slot_name: group.slot_name || '',
          _category: item.category || '',
        });
      }
    }
  } catch (e) {
    console.error('❌ Błąd parsowania approval-queue.json:', e.message);
    process.exit(1);
  }
}

if (!itemsToProcess.length) {
  console.log('✅ Brak elementów do przetworzenia.');
  process.exit(0);
}

// ─── GRUPUJ PO KATEGORII / SLOCIE ────────────────────────────────────────────
const groups = {};
for (const item of itemsToProcess) {
  const slotName = item._slot_name || item.slot_name || 'general';
  if (!groups[slotName]) groups[slotName] = [];
  groups[slotName].push(item);
}

// ─── ZAPISZ DO DATASETS ───────────────────────────────────────────────────────
if (!DRY_RUN) mkdirSync(DATASETS_DIR, { recursive: true });

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

for (const [slotName, items] of Object.entries(groups)) {
  const fileKey = slugify(slotName);
  const outFile = join(DATASETS_DIR, `${fileKey}-${today}.json`);

  // Wczytaj istniejący dataset jeśli jest
  let existing = { items: [] };
  if (existsSync(outFile)) {
    try { existing = JSON.parse(readFileSync(outFile, 'utf-8')); } catch {}
  }

  // Deduplikuj po URL
  const existingUrls = new Set((existing.items || []).map(i => i.url));
  const newItems = items.filter(i => !existingUrls.has(i.url));
  const skipped = items.length - newItems.length;
  skippedCount += skipped;

  if (!newItems.length) {
    console.log(`  ⚡ ${slotName}: wszystkie ${items.length} są duplikatami, pominięto`);
    continue;
  }

  const merged = {
    ...existing,
    slot_name: slotName,
    last_updated: new Date().toISOString(),
    total: (existing.items?.length || 0) + newItems.length,
    items: [
      ...(existing.items || []),
      ...newItems.map(item => ({
        id: item.id,
        title: item.title,
        url: item.url,
        content: item.content,
        source: item.source,
        published_date: item.published_date,
        ai_score: item.ai_score,
        ai_reason: item.ai_reason,
        query: item.query,
        approved_at: new Date().toISOString(),
        approved_by: 'manual',
      })),
    ],
  };

  if (!DRY_RUN) {
    writeFileSync(outFile, JSON.stringify(merged, null, 2));
  }

  processedCount += newItems.length;
  console.log(
    `  ✅ ${slotName}: +${newItems.length} nowych → ${outFile.split('data/')[1]}` +
    (skipped ? ` (${skipped} duplikatów)` : '') +
    (DRY_RUN ? ' [DRY-RUN]' : '')
  );
}

// ─── AKTUALIZUJ LOG ───────────────────────────────────────────────────────────
if (!DRY_RUN && processedCount > 0) {
  try {
    let log = { runs: [], stats: { daily: {} } };
    if (existsSync(LOG_FILE)) log = JSON.parse(readFileSync(LOG_FILE, 'utf-8'));

    if (!log.stats) log.stats = {};
    if (!log.stats.daily) log.stats.daily = {};
    if (!log.stats.daily[today]) log.stats.daily[today] = {};

    log.stats.daily[today].manual_approved = (log.stats.daily[today].manual_approved || 0) + processedCount;
    log.stats.total_manual_approved = (log.stats.total_manual_approved || 0) + processedCount;

    writeFileSync(LOG_FILE, JSON.stringify(log, null, 2));
  } catch (e) {
    console.warn('⚠ Nie zaktualizowano log:', e.message);
  }
}

// ─── USUŃ approval-queue.json PO PRZETWORZENIU ───────────────────────────────
if (!DRY_RUN && !APPROVE_ALL) {
  const aqPath = join(PENDING_DIR, 'approval-queue.json');
  if (existsSync(aqPath)) {
    const { renameSync } = await import('fs');
    const archivePath = join(PENDING_DIR, `approval-queue-processed-${Date.now()}.json`);
    renameSync(aqPath, archivePath);
    console.log(`\n📦 approval-queue.json zarchiwizowano jako: ${archivePath.split('pending/')[1]}`);
  }
}

// ─── PODSUMOWANIE ─────────────────────────────────────────────────────────────
console.log(`\n🎯 Gotowe: ${processedCount} elementów dodano do datasets, ${skippedCount} duplikatów pominięto`);
if (DRY_RUN) console.log('   ℹ Tryb dry-run — żadne zmiany nie zostały zapisane');
