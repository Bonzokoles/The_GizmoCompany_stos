const BASE = 'http://localhost:8088';

async function call(token, path, method = 'GET', body = null) {
  const opts = { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } };
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

async function run() {
  const token = await getToken();
  console.log('Token OK');

  // 1. Delete old charts
  for (const id of [1, 2, 3]) {
    const r = await call(token, `/api/v1/chart/${id}`, 'DELETE');
    console.log(`Delete chart ${id}:`, r.message || 'ok');
  }

  // 2. Register richer datasets
  const richTables = ['analiza_producenci', 'analiza_kategorie', 'analiza_marza_logistyka', 'raport_podsumowanie'];
  const dsIds = {};
  for (const t of richTables) {
    const r = await call(token, '/api/v1/dataset/', 'POST', { database: 1, table_name: t, schema: '' });
    dsIds[t] = r.id;
    console.log(`Dataset ${t}: id=${r.id}`);
  }

  // Refresh simple datasets
  for (const id of [1, 2, 3, 4]) {
    await call(token, `/api/v1/dataset/${id}/refresh`, 'PUT');
  }
  console.log('Simple datasets refreshed');

  // 3. Create charts
  const makeChart = (name, viz, dsId, params) =>
    call(token, '/api/v1/chart/', 'POST', {
      slice_name: name,
      viz_type: viz,
      datasource_id: dsId,
      datasource_type: 'table',
      params: JSON.stringify(params),
    });

  const dsP = dsIds['analiza_producenci'];
  const dsL = dsIds['analiza_marza_logistyka'];
  const dsR = dsIds['raport_podsumowanie'];

  const cA = await makeChart('Marza PLN/szt — Top Producenci', 'echarts_bar', dsP, {
    metrics: [{ aggregate: 'AVG', column: { column_name: 'sr_marza_kwotowa' }, expressionType: 'SIMPLE', label: 'Marza PLN/szt' }],
    groupby: ['producent'], row_limit: 11, order_desc: true, color_scheme: 'supersetDark', show_legend: false,
  });
  console.log('ChartA (bar producenci PLN):', cA.id);

  const cB = await makeChart('Marza % — Producenci', 'echarts_bar', dsP, {
    metrics: [{ aggregate: 'AVG', column: { column_name: 'sr_marza_procent' }, expressionType: 'SIMPLE', label: 'Marza %' }],
    groupby: ['producent'], row_limit: 11, order_desc: true, color_scheme: 'supersetDark', show_legend: false,
  });
  console.log('ChartB (bar producenci %):', cB.id);

  const cC = await makeChart('Produkty wg Przedzialu Cenowego', 'pie', 2, {
    metric: { aggregate: 'SUM', column: { column_name: 'products' }, expressionType: 'SIMPLE', label: 'Produktow' },
    groupby: ['price_range'], row_limit: 10, color_scheme: 'supersetDark', donut: false, show_legend: true,
  });
  console.log('ChartC (pie ceny):', cC.id);

  const cD = await makeChart('Top Kategorie Produktow', 'pie', 3, {
    metric: { aggregate: 'SUM', column: { column_name: 'products' }, expressionType: 'SIMPLE', label: 'Produktow' },
    groupby: ['category'], row_limit: 8, color_scheme: 'supersetDark', donut: true, show_legend: true,
  });
  console.log('ChartD (donut kategorie):', cD.id);

  const cE = await makeChart('Analiza Kosztow Logistyki', 'table', dsL, {
    metrics: [], groupby: [],
    all_columns: ['scenariusz', 'sprzedazy_mies', 'sr_marza_kwotowa_pln', 'laczna_marza_mies_pln',
      'koszt_logistyki_mies_pln', 'logistyka_vs_marza_procent', 'oplaca_sie'],
    row_limit: 10, table_font_size: 12,
  });
  console.log('ChartE (table logistyka):', cE.id);

  const cF = await makeChart('Rekomendacje i KPI', 'table', dsR, {
    metrics: [], groupby: [],
    all_columns: ['obszar', 'wskaznik', 'wartosc', 'ocena', 'priorytet', 'rekomendacja'],
    row_limit: 30, table_font_size: 11,
  });
  console.log('ChartF (table rekomendacje):', cF.id);

  const cG = await makeChart('Segmentacja Producentow (Marza% vs PLN)', 'echarts_scatter', dsP, {
    x: { aggregate: 'AVG', column: { column_name: 'sr_marza_procent' }, expressionType: 'SIMPLE', label: 'Marza %' },
    y: { aggregate: 'AVG', column: { column_name: 'sr_marza_kwotowa' }, expressionType: 'SIMPLE', label: 'Marza PLN' },
    entity: 'producent', row_limit: 20, color_scheme: 'supersetDark', show_legend: true,
  });
  console.log('ChartG (scatter segment):', cG.id);

  const ids = [cA.id, cB.id, cC.id, cD.id, cE.id, cF.id, cG.id];
  console.log('All IDs:', ids);

  // 4. Build position_json
  const [idA, idB, idC, idD, idE, idF, idG] = ids;
  const P = {
    GRID_ID:  { type:'GRID',  id:'GRID_ID',  children:['ROW-1','ROW-2','ROW-3','ROW-4'], parents:['ROOT_ID'] },
    ROOT_ID:  { type:'ROOT',  id:'ROOT_ID',  children:['GRID_ID'] },
    'ROW-1':  { type:'ROW',   id:'ROW-1',   children:[`CHART-${idA}`,`CHART-${idB}`],          parents:['GRID_ID'], meta:{background:'BACKGROUND_TRANSPARENT'} },
    'ROW-2':  { type:'ROW',   id:'ROW-2',   children:[`CHART-${idC}`,`CHART-${idD}`,`CHART-${idG}`], parents:['GRID_ID'], meta:{background:'BACKGROUND_TRANSPARENT'} },
    'ROW-3':  { type:'ROW',   id:'ROW-3',   children:[`CHART-${idE}`],                          parents:['GRID_ID'], meta:{background:'BACKGROUND_TRANSPARENT'} },
    'ROW-4':  { type:'ROW',   id:'ROW-4',   children:[`CHART-${idF}`],                          parents:['GRID_ID'], meta:{background:'BACKGROUND_TRANSPARENT'} },
    [`CHART-${idA}`]: { type:'CHART', id:`CHART-${idA}`, children:[], parents:['GRID_ID','ROW-1'], meta:{chartId:idA, width:6,  height:50, sliceName:'Marza PLN/szt — Top Producenci'} },
    [`CHART-${idB}`]: { type:'CHART', id:`CHART-${idB}`, children:[], parents:['GRID_ID','ROW-1'], meta:{chartId:idB, width:6,  height:50, sliceName:'Marza % — Producenci'} },
    [`CHART-${idC}`]: { type:'CHART', id:`CHART-${idC}`, children:[], parents:['GRID_ID','ROW-2'], meta:{chartId:idC, width:4,  height:50, sliceName:'Produkty wg Przedzialu Cenowego'} },
    [`CHART-${idD}`]: { type:'CHART', id:`CHART-${idD}`, children:[], parents:['GRID_ID','ROW-2'], meta:{chartId:idD, width:4,  height:50, sliceName:'Top Kategorie Produktow'} },
    [`CHART-${idG}`]: { type:'CHART', id:`CHART-${idG}`, children:[], parents:['GRID_ID','ROW-2'], meta:{chartId:idG, width:4,  height:50, sliceName:'Segmentacja Producentow'} },
    [`CHART-${idE}`]: { type:'CHART', id:`CHART-${idE}`, children:[], parents:['GRID_ID','ROW-3'], meta:{chartId:idE, width:12, height:60, sliceName:'Analiza Kosztow Logistyki'} },
    [`CHART-${idF}`]: { type:'CHART', id:`CHART-${idF}`, children:[], parents:['GRID_ID','ROW-4'], meta:{chartId:idF, width:12, height:80, sliceName:'Rekomendacje i KPI'} },
  };

  const dashRes = await call(token, '/api/v1/dashboard/1', 'PUT', {
    position_json: JSON.stringify(P),
    published: true,
    dashboard_title: 'MEBLEPUMO Analytics',
  });
  console.log('Dashboard updated:', dashRes.id);
  console.log('Open: http://localhost:8088/superset/dashboard/1/?standalone=true');
}

run().catch(console.error);
