// Add query_context to all PUMO dashboard charts so they render correctly
const BASE = 'http://localhost:8088';

async function call(token, path, method = 'GET', body = null) {
  const opts = { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  return res.json();
}

async function getToken() {
  const r = await call(null, '/api/v1/security/login', 'POST', {
    username: 'admin', password: 'admin123', provider: 'db', refresh: true,
  });
  return r.access_token;
}

function makeQC(dsId, queries) {
  return JSON.stringify({
    datasource: { id: dsId, type: 'table' },
    force: false,
    queries,
    result_format: 'json',
    result_type: 'full',
  });
}

function aggMetric(col, agg, label) {
  return { aggregate: agg, column: { column_name: col }, expressionType: 'SIMPLE', label };
}

async function run() {
  const token = await getToken();
  console.log('Token OK');

  // chart 4: Marza PLN bar (ds=5 analiza_producenci)
  const qcA = makeQC(5, [{
    filters: [], groupby: ['producent'], row_limit: 11, order_desc: true,
    metrics: [aggMetric('sr_marza_kwotowa', 'AVG', 'Marza PLN/szt')],
    orderby: [[aggMetric('sr_marza_kwotowa', 'AVG', 'Marza PLN/szt'), false]],
    time_range: 'No filter',
  }]);
  let r = await call(token, '/api/v1/chart/4', 'PUT', { query_context: qcA, query_context_generation: false });
  console.log('Chart 4 updated:', r.id || r.message);

  // chart 5: Marza % bar (ds=5)
  const qcB = makeQC(5, [{
    filters: [], groupby: ['producent'], row_limit: 11, order_desc: true,
    metrics: [aggMetric('sr_marza_procent', 'AVG', 'Marza %')],
    orderby: [[aggMetric('sr_marza_procent', 'AVG', 'Marza %'), false]],
    time_range: 'No filter',
  }]);
  r = await call(token, '/api/v1/chart/5', 'PUT', { query_context: qcB, query_context_generation: false });
  console.log('Chart 5 updated:', r.id || r.message);

  // chart 6: Pie ceny (ds=2 price_ranges)
  const qcC = makeQC(2, [{
    filters: [], groupby: ['price_range'], row_limit: 10,
    metrics: [aggMetric('products', 'SUM', 'Produktow')],
    time_range: 'No filter',
  }]);
  r = await call(token, '/api/v1/chart/6', 'PUT', { query_context: qcC, query_context_generation: false });
  console.log('Chart 6 updated:', r.id || r.message);

  // chart 7: Donut kategorie (ds=3 product_categories)
  const qcD = makeQC(3, [{
    filters: [], groupby: ['category'], row_limit: 8,
    metrics: [aggMetric('products', 'SUM', 'Produktow')],
    time_range: 'No filter',
  }]);
  r = await call(token, '/api/v1/chart/7', 'PUT', { query_context: qcD, query_context_generation: false });
  console.log('Chart 7 updated:', r.id || r.message);

  // chart 8: Table logistyka (ds=7 analiza_marza_logistyka)
  const cols8 = ['scenariusz','sprzedazy_mies','sr_marza_kwotowa_pln','laczna_marza_mies_pln','koszt_logistyki_mies_pln','logistyka_vs_marza_procent','oplaca_sie'];
  const qcE = makeQC(7, [{
    filters: [], groupby: [], row_limit: 10, metrics: [],
    columns: cols8, time_range: 'No filter',
  }]);
  r = await call(token, '/api/v1/chart/8', 'PUT', { query_context: qcE, query_context_generation: false });
  console.log('Chart 8 updated:', r.id || r.message);

  // chart 9: Table rekomendacje (ds=8 raport_podsumowanie)
  const cols9 = ['obszar','wskaznik','wartosc','ocena','priorytet','rekomendacja'];
  const qcF = makeQC(8, [{
    filters: [], groupby: [], row_limit: 30, metrics: [],
    columns: cols9, time_range: 'No filter',
  }]);
  r = await call(token, '/api/v1/chart/9', 'PUT', { query_context: qcF, query_context_generation: false });
  console.log('Chart 9 updated:', r.id || r.message);

  // chart 10: Scatter (ds=5)
  const qcG = makeQC(5, [{
    filters: [], groupby: ['producent'], row_limit: 20,
    metrics: [aggMetric('sr_marza_procent', 'AVG', 'Marza %'), aggMetric('sr_marza_kwotowa', 'AVG', 'Marza PLN')],
    time_range: 'No filter',
  }]);
  r = await call(token, '/api/v1/chart/10', 'PUT', { query_context: qcG, query_context_generation: false });
  console.log('Chart 10 updated:', r.id || r.message);

  // Verify chart 4 now returns data
  console.log('\n--- Verifying chart 4 data ---');
  const verify = await call(token, '/api/v1/chart/4/data/?force=true');
  const q = verify.result?.[0];
  if (q) {
    console.log('status:', q.status, '| rows:', q.data?.length, '| error:', q.error || 'none');
    if (q.data?.[0]) console.log('row[0]:', JSON.stringify(q.data[0]));
  } else {
    console.log(JSON.stringify(verify).slice(0, 300));
  }

  console.log('\nDone. Dashboard: http://localhost:8088/superset/dashboard/1/?standalone=true');
}

run().catch(console.error);
