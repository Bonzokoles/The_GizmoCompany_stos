import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const logPath = path.join(root, 'ai-hub', 'js', 'data', 'crawler-log.json');
const pendingDir = path.join(root, 'ai-hub', 'js', 'data', 'pending');
const outputPath = path.join(root, 'ai-hub', 'crawler-dashboard', 'raport-crawler.html');

const today = new Date().toISOString().slice(0, 10);

const readJson = async (file) => JSON.parse(await fs.readFile(file, 'utf8'));

const escapeHtml = (value = '') => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

const domainFromUrl = (url = '') => {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return 'nieznane'; }
};

const formatDate = (iso) => {
  try {
    const d = new Date(iso);
    return d.toLocaleString('pl-PL', { dateStyle: 'short', timeStyle: 'medium' });
  } catch {
    return iso || '-';
  }
};

const topN = (mapObj, n = 10) => Object.entries(mapObj)
  .sort((a, b) => b[1] - a[1])
  .slice(0, n);

async function main() {
  const log = await readJson(logPath);
  const runs = Array.isArray(log.runs) ? log.runs : [];
  const daily = log?.stats?.daily?.[today] ?? null;
  const totals = log?.stats ?? {};

  const pendingFiles = (await fs.readdir(pendingDir))
    .filter((name) => name.startsWith('batch-') && name.endsWith('.json'))
    .sort();

  const sourceCounter = {};
  const domainCounter = {};
  let pendingItemsCount = 0;
  let lastBatchItems = [];
  let lastBatchName = pendingFiles.at(-1) || null;

  for (const fileName of pendingFiles) {
    const batch = await readJson(path.join(pendingDir, fileName));
    const items = Array.isArray(batch?.items) ? batch.items : [];
    pendingItemsCount += items.length;

    for (const item of items) {
      const source = item?.source || 'nieznane';
      sourceCounter[source] = (sourceCounter[source] || 0) + 1;

      const domain = domainFromUrl(item?.url);
      domainCounter[domain] = (domainCounter[domain] || 0) + 1;
    }

    if (fileName === lastBatchName) {
      lastBatchItems = items.slice(0, 25);
    }
  }

  const topSources = topN(sourceCounter, 8);
  const topDomains = topN(domainCounter, 12);
  const recentRuns = runs.slice(0, 20);

  const html = `<!doctype html>
<html lang="pl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Raport Crawlera</title>
  <style>
    :root { color-scheme: dark; --bg:#0b1020; --card:#121a33; --text:#e9eefb; --muted:#99a7c4; --accent:#35d5ff; --ok:#35d07f; --warn:#ffcc66; }
    * { box-sizing: border-box; }
    body { margin:0; font-family: Inter, Segoe UI, Arial, sans-serif; background:linear-gradient(180deg,#090e1b,#0f1730); color:var(--text); }
    .wrap { max-width:1200px; margin:0 auto; padding:24px; }
    h1,h2 { margin:0 0 12px; }
    .muted { color:var(--muted); }
    .grid { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:12px; margin:16px 0 24px; }
    .card { background:rgba(18,26,51,.75); border:1px solid rgba(90,110,160,.25); border-radius:14px; padding:14px; backdrop-filter: blur(4px); }
    .k { font-size:12px; color:var(--muted); }
    .v { font-size:24px; font-weight:700; margin-top:6px; }
    table { width:100%; border-collapse:collapse; }
    th,td { text-align:left; padding:10px 8px; border-bottom:1px solid rgba(120,140,180,.2); vertical-align:top; }
    th { color:#b7c7eb; font-size:13px; position:sticky; top:0; background:#121a33; }
    .tbl { max-height:420px; overflow:auto; border:1px solid rgba(90,110,160,.25); border-radius:12px; }
    a { color:var(--accent); text-decoration:none; }
    a:hover { text-decoration:underline; }
    .badge { display:inline-block; padding:2px 8px; border-radius:999px; background:rgba(53,213,255,.15); color:#a8eefe; font-size:12px; }
    @media (max-width: 900px) { .grid { grid-template-columns:repeat(2,minmax(0,1fr)); } }
    @media (max-width: 560px) { .grid { grid-template-columns:1fr; } }
  </style>
</head>
<body>
  <div class="wrap">
    <h1>📊 Raport Crawlera — ${escapeHtml(today)}</h1>
    <p class="muted">Wygenerowano: ${escapeHtml(formatDate(new Date().toISOString()))} | Plik: <code>ai-hub/crawler-dashboard/raport-crawler.html</code></p>

    <div class="grid">
      <div class="card"><div class="k">Rundy dziś</div><div class="v">${daily?.runs ?? 0}</div></div>
      <div class="card"><div class="k">Tavily dziś</div><div class="v">${daily?.tavily ?? 0}/80</div></div>
      <div class="card"><div class="k">Brave dziś</div><div class="v">${daily?.brave ?? 0}/400</div></div>
      <div class="card"><div class="k">Pending dziś</div><div class="v">${daily?.pending ?? 0}</div></div>
      <div class="card"><div class="k">Wszystkie rundy</div><div class="v">${totals?.total_runs ?? 0}</div></div>
      <div class="card"><div class="k">Wszystkie znalezione</div><div class="v">${totals?.total_found ?? 0}</div></div>
      <div class="card"><div class="k">Auto-approved</div><div class="v">${totals?.total_auto_approved ?? 0}</div></div>
      <div class="card"><div class="k">Pending (z plików)</div><div class="v">${pendingItemsCount}</div></div>
    </div>

    <h2>🧭 Top źródła</h2>
    <div class="tbl card"><table><thead><tr><th>Źródło</th><th>Liczba</th></tr></thead><tbody>
      ${topSources.map(([name, count]) => `<tr><td>${escapeHtml(name)}</td><td>${count}</td></tr>`).join('') || '<tr><td colspan="2" class="muted">Brak danych</td></tr>'}
    </tbody></table></div>

    <h2 style="margin-top:20px;">🌐 Top domeny</h2>
    <div class="tbl card"><table><thead><tr><th>Domena</th><th>Liczba</th></tr></thead><tbody>
      ${topDomains.map(([name, count]) => `<tr><td>${escapeHtml(name)}</td><td>${count}</td></tr>`).join('') || '<tr><td colspan="2" class="muted">Brak danych</td></tr>'}
    </tbody></table></div>

    <h2 style="margin-top:20px;">🕒 Ostatnie rundy</h2>
    <div class="tbl card"><table><thead><tr><th>Czas</th><th>Slot</th><th>Znalezione</th><th>Pending</th><th>Plik</th></tr></thead><tbody>
      ${recentRuns.map((r) => `<tr>
        <td>${escapeHtml(formatDate(r.timestamp))}</td>
        <td><span class="badge">${escapeHtml(r.slot_name || '-')}</span></td>
        <td>${r?.results?.found ?? 0}</td>
        <td>${r?.results?.pending ?? 0}</td>
        <td>${escapeHtml(r?.files?.pending || '-')}</td>
      </tr>`).join('') || '<tr><td colspan="5" class="muted">Brak danych</td></tr>'}
    </tbody></table></div>

    <h2 style="margin-top:20px;">📦 Ostatni batch: ${escapeHtml(lastBatchName || 'brak')}</h2>
    <div class="tbl card"><table><thead><tr><th>Tytuł</th><th>Źródło</th><th>Score</th><th>URL</th></tr></thead><tbody>
      ${lastBatchItems.map((item) => `<tr>
        <td>${escapeHtml(item.title || '-')}</td>
        <td>${escapeHtml(item.source || '-')}</td>
        <td>${item.ai_score ?? '-'}</td>
        <td><a href="${escapeHtml(item.url || '#')}" target="_blank" rel="noreferrer">otwórz</a></td>
      </tr>`).join('') || '<tr><td colspan="4" class="muted">Brak danych</td></tr>'}
    </tbody></table></div>

    <p class="muted" style="margin-top:16px;">Tip: odśwież raport po kolejnych rundach uruchamiając ponownie <code>node scripts/generate-crawler-report.mjs</code>.</p>
  </div>
</body>
</html>`;

  await fs.writeFile(outputPath, html, 'utf8');
  console.log(`Raport zapisany: ${outputPath}`);
}

main().catch((err) => {
  console.error('Błąd generowania raportu:', err);
  process.exit(1);
});
