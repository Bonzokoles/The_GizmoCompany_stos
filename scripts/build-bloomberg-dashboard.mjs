const BASE = 'http://localhost:8088';

async function call(token, path, method = 'GET', body = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  const text = await res.text();
  try { return JSON.parse(text); } catch { return { _raw: text }; }
}

async function getToken() {
  const r = await call(null, '/api/v1/security/login', 'POST', {
    username: 'admin', password: 'admin123', provider: 'db', refresh: true,
  });
  return r.access_token;
}

function qc(dsId, queries) {
  return JSON.stringify({ datasource: { id: dsId, type: 'table' }, force: false, queries, result_format: 'json', result_type: 'full' });
}

function met(col, agg, label) {
  return { aggregate: agg, column: { column_name: col }, expressionType: 'SIMPLE', label };
}

// ── NAV HTML injected as Markdown chart ──────────────────────────
const NAV_PUMO = `
<div style="background:#111827;border-bottom:2px solid #00D9FF;padding:10px 20px;display:flex;gap:12px;align-items:center;font-family:monospace">
  <span style="color:#00D9FF;font-weight:700;font-size:16px">⬛ ZENO ANALYTICS</span>
  <a href="/superset/dashboard/meblepumo-analytics/?standalone=true"
     style="background:#00D9FF;color:#000;padding:5px 14px;border-radius:4px;text-decoration:none;font-weight:700;font-size:13px">
    📦 MEBLEPUMO
  </a>
  <a href="/superset/dashboard/bloomberg-finance/?standalone=true"
     style="background:#1f2937;color:#9ca3af;padding:5px 14px;border-radius:4px;text-decoration:none;font-size:13px;border:1px solid #374151">
    📈 Bloomberg Finance
  </a>
</div>`;

const NAV_BLOOMBERG = `
<div style="background:#111827;border-bottom:2px solid #00D9FF;padding:10px 20px;display:flex;gap:12px;align-items:center;font-family:monospace">
  <span style="color:#00D9FF;font-weight:700;font-size:16px">⬛ ZENO ANALYTICS</span>
  <a href="/superset/dashboard/meblepumo-analytics/?standalone=true"
     style="background:#1f2937;color:#9ca3af;padding:5px 14px;border-radius:4px;text-decoration:none;font-size:13px;border:1px solid #374151">
    📦 MEBLEPUMO
  </a>
  <a href="/superset/dashboard/bloomberg-finance/?standalone=true"
     style="background:#00D9FF;color:#000;padding:5px 14px;border-radius:4px;text-decoration:none;font-weight:700;font-size:13px">
    📈 Bloomberg Finance
  </a>
</div>`;

async function run() {
  const token = await getToken();
  console.log('Token OK');

  // ── 1. Register Bloomberg datasets ─────────────────────────────
  const tables = ['finance_stocks', 'finance_history', 'finance_crypto'];
  const dsIds = {};
  for (const t of tables) {
    const r = await call(token, '/api/v1/dataset/', 'POST', { database: 1, table_name: t, schema: '' });
    if (r.id) {
      dsIds[t] = r.id;
      console.log(`Dataset ${t}: id=${r.id}`);
    } else {
      // might already exist — list and find
      const list = await call(token, '/api/v1/dataset/?q=(filters:!((col:table_name,opr:eq,value:' + t + ')))');
      dsIds[t] = list.result?.[0]?.id;
      console.log(`Dataset ${t}: existing id=${dsIds[t]}`);
    }
  }

  // ── 2. Create Bloomberg charts ──────────────────────────────────
  const makeChart = (name, viz, dsId, params, queryContext) =>
    call(token, '/api/v1/chart/', 'POST', {
      slice_name: name,
      viz_type: viz,
      datasource_id: dsId,
      datasource_type: 'table',
      params: JSON.stringify(params),
      query_context: queryContext || '',
    });

  const dsS = dsIds['finance_stocks'];
  const dsH = dsIds['finance_history'];
  const dsC = dsIds['finance_crypto'];

  // Nav switcher (Markdown/HTML)
  const navChart = await call(token, '/api/v1/chart/', 'POST', {
    slice_name: '── Navigation ──',
    viz_type: 'markup',
    datasource_id: dsS,
    datasource_type: 'table',
    params: JSON.stringify({ markup_type: 'html', code: NAV_BLOOMBERG }),
    query_context: '',
  });
  console.log('Nav chart:', navChart.id);

  // Table: Stock fundamentals comparison
  const tblStocks = await makeChart('E-Commerce Stock Comparison', 'table', dsS, {
    metrics: [], groupby: [],
    all_columns: ['ticker', 'name', 'price', 'currency', 'market_cap', 'pe_ratio',
      'forward_pe', 'profit_margin', 'operating_margin', 'revenue_growth', 'recommendation'],
    row_limit: 20,
    table_font_size: 12,
    column_config: {
      profit_margin: { d3NumberFormat: '.1%' },
      operating_margin: { d3NumberFormat: '.1%' },
      revenue_growth: { d3NumberFormat: '.1%' },
    },
  },
  qc(dsS, [{ filters: [], groupby: [], metrics: [],
    columns: ['ticker','name','price','currency','market_cap','pe_ratio','forward_pe',
               'profit_margin','operating_margin','revenue_growth','recommendation'],
    row_limit: 20, time_range: 'No filter' }]));
  console.log('Chart tblStocks:', tblStocks.id);

  // Bar: P/E Ratio comparison
  const barPE = await makeChart('P/E Ratio — E-Commerce Peers', 'echarts_bar', dsS, {
    metrics: [met('pe_ratio', 'AVG', 'P/E Ratio')],
    groupby: ['ticker'], row_limit: 10, order_desc: true,
    x_axis: 'ticker', color_scheme: 'supersetDark', show_legend: false,
    y_axis_format: '.1f',
  }, qc(dsS, [{ filters: [], groupby: ['ticker'],
    metrics: [met('pe_ratio', 'AVG', 'P/E Ratio')],
    orderby: [[met('pe_ratio', 'AVG', 'P/E Ratio'), false]],
    row_limit: 10, time_range: 'No filter' }]));
  console.log('Chart barPE:', barPE.id);

  // Bar: Revenue Growth %
  const barRevGrowth = await makeChart('Revenue Growth % — Peers', 'echarts_bar', dsS, {
    metrics: [met('revenue_growth', 'AVG', 'Revenue Growth')],
    groupby: ['ticker'], row_limit: 10, order_desc: true,
    x_axis: 'ticker', color_scheme: 'supersetDark', show_legend: false,
    y_axis_format: '.1%',
  }, qc(dsS, [{ filters: [], groupby: ['ticker'],
    metrics: [met('revenue_growth', 'AVG', 'Revenue Growth')],
    orderby: [[met('revenue_growth', 'AVG', 'Revenue Growth'), false]],
    row_limit: 10, time_range: 'No filter' }]));
  console.log('Chart barRevGrowth:', barRevGrowth.id);

  // Bar: Profit Margin %
  const barMargin = await makeChart('Profit Margin % — Peers', 'echarts_bar', dsS, {
    metrics: [met('profit_margin', 'AVG', 'Profit Margin')],
    groupby: ['ticker'], row_limit: 10, order_desc: true,
    x_axis: 'ticker', color_scheme: 'supersetDark', show_legend: false,
  }, qc(dsS, [{ filters: [], groupby: ['ticker'],
    metrics: [met('profit_margin', 'AVG', 'Profit Margin')],
    orderby: [[met('profit_margin', 'AVG', 'Profit Margin'), false]],
    row_limit: 10, time_range: 'No filter' }]));
  console.log('Chart barMargin:', barMargin.id);

  // Line: AMZN 3mo price history
  const lineAMZN = await makeChart('AMZN — 3 Month Price', 'echarts_timeseries_line', dsH, {
    metrics: [met('close', 'AVG', 'Close Price')],
    groupby: [],
    x_axis: 'date',
    adhoc_filters: [{ clause: 'WHERE', expressionType: 'SIMPLE', comparator: 'AMZN',
      operator: '==', subject: 'ticker' }],
    row_limit: 100, color_scheme: 'supersetDark', show_legend: false,
    x_axis_time_format: '%Y-%m-%d',
  }, qc(dsH, [{ filters: [{ col: 'ticker', op: '==', val: 'AMZN' }],
    groupby: [], metrics: [met('close', 'AVG', 'Close')],
    columns: ['date'], orderby: [['date', true]],
    row_limit: 100, time_range: 'No filter' }]));
  console.log('Chart lineAMZN:', lineAMZN.id);

  // Line: SHOP 3mo price
  const lineSHOP = await makeChart('SHOP — 3 Month Price', 'echarts_timeseries_line', dsH, {
    metrics: [met('close', 'AVG', 'Close Price')],
    groupby: [],
    x_axis: 'date',
    adhoc_filters: [{ clause: 'WHERE', expressionType: 'SIMPLE', comparator: 'SHOP',
      operator: '==', subject: 'ticker' }],
    row_limit: 100, color_scheme: 'supersetDark', show_legend: false,
  }, qc(dsH, [{ filters: [{ col: 'ticker', op: '==', val: 'SHOP' }],
    groupby: [], metrics: [met('close', 'AVG', 'Close')],
    columns: ['date'], orderby: [['date', true]],
    row_limit: 100, time_range: 'No filter' }]));
  console.log('Chart lineSHOP:', lineSHOP.id);

  // Table: Crypto snapshot
  const tblCrypto = await makeChart('Crypto Snapshot (BTC/ETH/SOL)', 'table', dsC, {
    metrics: [], groupby: [],
    all_columns: ['symbol', 'name', 'price', 'market_cap', 'volume_24h', 'week52_high', 'week52_low', 'fetched_at'],
    row_limit: 10, table_font_size: 13,
  }, qc(dsC, [{ filters: [], groupby: [], metrics: [],
    columns: ['symbol','name','price','market_cap','volume_24h','week52_high','week52_low','fetched_at'],
    row_limit: 10, time_range: 'No filter' }]));
  console.log('Chart tblCrypto:', tblCrypto.id);

  // ── 3. Build Dashboard 2 layout ─────────────────────────────────
  const allChartIds = [navChart.id, tblStocks.id, barPE.id, barRevGrowth.id,
                       barMargin.id, lineAMZN.id, lineSHOP.id, tblCrypto.id];
  const [nId, tsId, peId, rgId, pmId, laId, lsId, tcId] = allChartIds;

  const P = {
    GRID_ID: { type:'GRID', id:'GRID_ID', children:['ROW-NAV','ROW-1','ROW-2','ROW-3','ROW-4'], parents:['ROOT_ID'] },
    ROOT_ID: { type:'ROOT', id:'ROOT_ID', children:['GRID_ID'] },
    // Nav bar row
    'ROW-NAV': { type:'ROW', id:'ROW-NAV', children:[`CHART-${nId}`], parents:['GRID_ID'], meta:{background:'BACKGROUND_TRANSPARENT'} },
    [`CHART-${nId}`]: { type:'CHART', id:`CHART-${nId}`, children:[], parents:['GRID_ID','ROW-NAV'], meta:{chartId:nId, width:12, height:10, sliceName:'── Navigation ──'} },
    // Row 1: stock table (full width)
    'ROW-1': { type:'ROW', id:'ROW-1', children:[`CHART-${tsId}`], parents:['GRID_ID'], meta:{background:'BACKGROUND_TRANSPARENT'} },
    [`CHART-${tsId}`]: { type:'CHART', id:`CHART-${tsId}`, children:[], parents:['GRID_ID','ROW-1'], meta:{chartId:tsId, width:12, height:55, sliceName:'E-Commerce Stock Comparison'} },
    // Row 2: 3 bars
    'ROW-2': { type:'ROW', id:'ROW-2', children:[`CHART-${peId}`,`CHART-${rgId}`,`CHART-${pmId}`], parents:['GRID_ID'], meta:{background:'BACKGROUND_TRANSPARENT'} },
    [`CHART-${peId}`]:  { type:'CHART', id:`CHART-${peId}`,  children:[], parents:['GRID_ID','ROW-2'], meta:{chartId:peId,  width:4, height:50, sliceName:'P/E Ratio'} },
    [`CHART-${rgId}`]:  { type:'CHART', id:`CHART-${rgId}`,  children:[], parents:['GRID_ID','ROW-2'], meta:{chartId:rgId,  width:4, height:50, sliceName:'Revenue Growth'} },
    [`CHART-${pmId}`]:  { type:'CHART', id:`CHART-${pmId}`,  children:[], parents:['GRID_ID','ROW-2'], meta:{chartId:pmId,  width:4, height:50, sliceName:'Profit Margin'} },
    // Row 3: price lines
    'ROW-3': { type:'ROW', id:'ROW-3', children:[`CHART-${laId}`,`CHART-${lsId}`], parents:['GRID_ID'], meta:{background:'BACKGROUND_TRANSPARENT'} },
    [`CHART-${laId}`]:  { type:'CHART', id:`CHART-${laId}`,  children:[], parents:['GRID_ID','ROW-3'], meta:{chartId:laId,  width:6, height:50, sliceName:'AMZN 3M'} },
    [`CHART-${lsId}`]:  { type:'CHART', id:`CHART-${lsId}`,  children:[], parents:['GRID_ID','ROW-3'], meta:{chartId:lsId,  width:6, height:50, sliceName:'SHOP 3M'} },
    // Row 4: crypto
    'ROW-4': { type:'ROW', id:'ROW-4', children:[`CHART-${tcId}`], parents:['GRID_ID'], meta:{background:'BACKGROUND_TRANSPARENT'} },
    [`CHART-${tcId}`]:  { type:'CHART', id:`CHART-${tcId}`,  children:[], parents:['GRID_ID','ROW-4'], meta:{chartId:tcId,  width:12, height:45, sliceName:'Crypto Snapshot'} },
  };

  const dash2 = await call(token, '/api/v1/dashboard/', 'POST', {
    dashboard_title: 'Bloomberg Finance Terminal',
    slug: 'bloomberg-finance',
    published: true,
    position_json: JSON.stringify(P),
    json_metadata: JSON.stringify({ color_scheme: 'supersetDark', description: 'Live E-Commerce + Crypto data via yfinance/CoinGecko' }),
  });
  console.log('Dashboard 2 created:', dash2.id, 'slug: bloomberg-finance');

  // ── 4. Add Nav switcher to Dashboard 1 (MEBLEPUMO) ─────────────
  // Create nav chart for dashboard 1
  const navPumo = await call(token, '/api/v1/chart/', 'POST', {
    slice_name: '── Navigation ──',
    viz_type: 'markup',
    datasource_id: dsIds['finance_stocks'] || dsS,
    datasource_type: 'table',
    params: JSON.stringify({ markup_type: 'html', code: NAV_PUMO }),
    query_context: '',
  });
  console.log('Nav PUMO chart:', navPumo.id);

  // Get current dashboard 1 position
  const dash1 = await call(token, '/api/v1/dashboard/1');
  let pos1 = {};
  try { pos1 = JSON.parse(dash1.result?.position_json || '{}'); } catch {}

  // Prepend nav row
  const navRowId = 'ROW-NAV-PUMO';
  pos1['ROOT_ID'] = pos1['ROOT_ID'] || { type:'ROOT', id:'ROOT_ID', children:['GRID_ID'] };
  if (!pos1['GRID_ID']) pos1['GRID_ID'] = { type:'GRID', id:'GRID_ID', children:[], parents:['ROOT_ID'] };
  pos1['GRID_ID'].children = [navRowId, ...(pos1['GRID_ID'].children || []).filter(c => c !== navRowId)];
  pos1[navRowId] = { type:'ROW', id:navRowId, children:[`CHART-${navPumo.id}`], parents:['GRID_ID'], meta:{background:'BACKGROUND_TRANSPARENT'} };
  pos1[`CHART-${navPumo.id}`] = { type:'CHART', id:`CHART-${navPumo.id}`, children:[], parents:['GRID_ID', navRowId], meta:{chartId:navPumo.id, width:12, height:10, sliceName:'── Navigation ──'} };

  const upd1 = await call(token, '/api/v1/dashboard/1', 'PUT', {
    position_json: JSON.stringify(pos1),
  });
  console.log('Dashboard 1 updated with nav:', upd1.id);

  console.log('\n✓ DONE');
  console.log('  MEBLEPUMO : http://localhost:8088/superset/dashboard/meblepumo-analytics/?standalone=true');
  console.log('  Bloomberg  : http://localhost:8088/superset/dashboard/bloomberg-finance/?standalone=true');
}

run().catch(console.error);
