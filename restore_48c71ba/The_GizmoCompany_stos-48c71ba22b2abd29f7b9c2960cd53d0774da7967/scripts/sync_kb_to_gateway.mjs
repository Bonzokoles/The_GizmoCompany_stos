#!/usr/bin/env node
/**
 * sync_kb_to_gateway.mjs
 * Scans U:\The_DEVz_HUB_of_work\knowledge_base (and LOCAL_LIBRARIES)
 * and pushes .md/.txt/.json files to jimbo-gateway /kb/store
 *
 * Usage:
 *   node scripts/sync_kb_to_gateway.mjs
 *   node scripts/sync_kb_to_gateway.mjs --dry-run
 *   node scripts/sync_kb_to_gateway.mjs --library 01_AI_SEO
 *   node scripts/sync_kb_to_gateway.mjs --limit 50
 */

import fs from 'fs';
import path from 'path';

// ── Config ────────────────────────────────────────────────────────────────
const GATEWAY = process.env.GATEWAY_URL || 'https://jimbo-gateway.stolarnia-ams.workers.dev';
const SCAN_ROOTS = [
  { root: 'U:\\The_DEVz_HUB_of_work\\knowledge_base', prefix: '' },
  { root: 'U:\\The_DEVz_HUB_of_work\\LOCAL_LIBRARIES', prefix: 'LOCAL_' },
];
const EXTENSIONS = new Set(['.md', '.txt', '.json', '.yaml', '.yml']);
const MAX_FILE_SIZE = 300_000; // 300 KB
const CONCURRENCY = 3;
const DELAY_MS = 150; // throttle between requests

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const LIMIT = (() => { const i = args.indexOf('--limit'); return i >= 0 ? parseInt(args[i + 1]) : Infinity; })();
const ONLY_LIB = (() => { const i = args.indexOf('--library'); return i >= 0 ? args[i + 1] : null; })();

// ── Helpers ───────────────────────────────────────────────────────────────
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function* walkDir(dir) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) yield* walkDir(full);
    else if (e.isFile() && EXTENSIONS.has(path.extname(e.name).toLowerCase())) yield full;
  }
}

function buildLibraryName(root, prefix, filePath) {
  const rel = path.relative(root, filePath);
  const parts = rel.split(path.sep);
  // skip root-level files (no subfolder)
  if (parts.length < 2) return null;
  // top-level folder = library name
  return (prefix + parts[0]).toLowerCase().replace(/\s+/g, '_');
}

function buildTitle(filePath) {
  return path.basename(filePath, path.extname(filePath))
    .replace(/[_-]+/g, ' ')
    .replace(/_\d{8}_\d{6}$/, '')   // strip timestamp suffixes
    .trim()
    .slice(0, 200);
}

async function storeDoc({ title, content, library, source }) {
  if (DRY_RUN) return { id: 'dry-run' };
  const res = await fetch(`${GATEWAY}/kb/store`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, content, library, source }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 120)}`);
  return await res.json();
}

// ── Collect all files ─────────────────────────────────────────────────────
const queue = [];
for (const { root, prefix } of SCAN_ROOTS) {
  if (!fs.existsSync(root)) { console.warn(`⚠️  Folder nie istnieje: ${root}`); continue; }
  for (const filePath of walkDir(root)) {
    const library = buildLibraryName(root, prefix, filePath);
    if (!library) continue;
    if (ONLY_LIB && library !== ONLY_LIB.toLowerCase()) continue;
    queue.push({ filePath, library, root });
  }
}

console.log(`\n📚 Znaleziono ${queue.length} plików do syncowania`);
if (ONLY_LIB) console.log(`   Filtrowanie: tylko biblioteka "${ONLY_LIB}"`);
if (DRY_RUN)  console.log(`   TRYB DRY-RUN — brak zapisu do gateway`);
if (LIMIT < Infinity) console.log(`   Limit: ${LIMIT} plików`);
console.log(`   Gateway: ${GATEWAY}\n`);

// ── Show library summary ──────────────────────────────────────────────────
const libCounts = {};
for (const { library } of queue) libCounts[library] = (libCounts[library] || 0) + 1;
console.log('📂 Biblioteki:');
for (const [lib, cnt] of Object.entries(libCounts).sort()) {
  console.log(`   ${lib.padEnd(35)} ${cnt} plików`);
}
console.log('');

// ── Process ───────────────────────────────────────────────────────────────
let ok = 0, skip = 0, fail = 0, processed = 0;
const toProcess = queue.slice(0, LIMIT);

async function processFile({ filePath, library }) {
  let stat;
  try { stat = fs.statSync(filePath); } catch { skip++; return; }
  if (stat.size > MAX_FILE_SIZE) { skip++; return; }
  if (stat.size === 0) { skip++; return; }

  let content;
  try { content = fs.readFileSync(filePath, 'utf8'); } catch { skip++; return; }

  const title = buildTitle(filePath);
  const source = filePath.replace(/\\/g, '/');

  try {
    await storeDoc({ title, content, library, source });
    ok++;
    process.stdout.write(`\r✅ ${ok} ok  ❌ ${fail} błędów  ⏭  ${skip} pominięto  [${processed}/${toProcess.length}]   `);
  } catch (e) {
    fail++;
    if (fail <= 5) console.error(`\n   ❌ ${path.basename(filePath)}: ${e.message}`);
  }
  processed++;
}

// Process with limited concurrency
for (let i = 0; i < toProcess.length; i += CONCURRENCY) {
  const batch = toProcess.slice(i, i + CONCURRENCY);
  await Promise.all(batch.map(processFile));
  await sleep(DELAY_MS);
}

console.log(`\n\n✅ Sync zakończony: ${ok} wgranych, ${skip} pominiętych, ${fail} błędów`);
console.log(`   Biblioteki wgrane: ${Object.keys(libCounts).length}`);
if (!DRY_RUN && ok > 0) {
  console.log(`\n🔄 Odśwież Knowledge Browser → "Załaduj biblioteki"`);
}
