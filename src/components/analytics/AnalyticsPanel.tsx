/**
 * AnalyticsPanel — Umami Analytics dashboard embedded in ZENO Browser
 * Shows website stats, pageviews chart, top pages, referrers, and realtime visitors
 */

import { useState, useCallback, useEffect, useRef } from 'react';

interface AnalyticsPanelProps {
  onClose: () => void;
}

interface Website {
  id: string;
  name: string;
  domain: string;
}

interface Stats {
  pageviews: { value: number; prev: number };
  visitors: { value: number; prev: number };
  visits: { value: number; prev: number };
  bounces: { value: number; prev: number };
  totaltime: { value: number; prev: number };
}

interface PageviewPoint {
  x: string;
  y: number;
}

interface Metric {
  x: string;
  y: number;
}

type TimeRange = '24h' | '7d' | '30d' | '90d';

const TIME_RANGES: { key: TimeRange; label: string }[] = [
  { key: '24h', label: '24h' },
  { key: '7d', label: '7 dni' },
  { key: '30d', label: '30 dni' },
  { key: '90d', label: '90 dni' },
];

function getDateRange(range: TimeRange): { startAt: string; endAt: string; unit: string } {
  const now = Date.now();
  const ms: Record<TimeRange, number> = {
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
    '90d': 90 * 24 * 60 * 60 * 1000,
  };
  const units: Record<TimeRange, string> = {
    '24h': 'hour',
    '7d': 'day',
    '30d': 'day',
    '90d': 'month',
  };
  return {
    startAt: String(now - ms[range]),
    endAt: String(now),
    unit: units[range],
  };
}

function pctChange(curr: number, prev: number): string {
  if (prev === 0) return curr > 0 ? '+∞' : '0%';
  const pct = ((curr - prev) / prev) * 100;
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${pct.toFixed(1)}%`;
}

export function AnalyticsPanel({ onClose }: AnalyticsPanelProps) {
  const [status, setStatus] = useState<'loading' | 'offline' | 'auth-error' | 'ready'>('loading');
  const [websites, setWebsites] = useState<Website[]>([]);
  const [selectedSite, setSelectedSite] = useState<string>('');
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [stats, setStats] = useState<Stats | null>(null);
  const [pageviews, setPageviews] = useState<PageviewPoint[]>([]);
  const [topPages, setTopPages] = useState<Metric[]>([]);
  const [referrers, setReferrers] = useState<Metric[]>([]);
  const [activeVisitors, setActiveVisitors] = useState<number>(0);
  const [tab, setTab] = useState<'overview' | 'pages' | 'referrers' | 'settings'>('overview');
  const chartRef = useRef<HTMLCanvasElement>(null);
  const api = (window as any).electronAPI?.umami;

  // Initial connection check
  useEffect(() => {
    if (!api) { setStatus('offline'); return; }
    (async () => {
      const s = await api.status();
      if (!s.online) { setStatus('offline'); return; }
      const login = await api.login();
      if (!login.ok) { setStatus('auth-error'); return; }
      const res = await api.getWebsites();
      const list: Website[] = res?.data || res || [];
      setWebsites(list);
      if (list.length > 0) setSelectedSite(list[0].id);
      setStatus('ready');
    })();
  }, []);

  // Fetch data when site or range changes
  useEffect(() => {
    if (status !== 'ready' || !selectedSite) return;
    const range = getDateRange(timeRange);
    (async () => {
      const [s, pv, tp, ref, rt] = await Promise.all([
        api.getStats(selectedSite, { startAt: range.startAt, endAt: range.endAt }),
        api.getPageviews(selectedSite, { startAt: range.startAt, endAt: range.endAt, unit: range.unit }),
        api.getMetrics(selectedSite, { startAt: range.startAt, endAt: range.endAt, type: 'url' }),
        api.getMetrics(selectedSite, { startAt: range.startAt, endAt: range.endAt, type: 'referrer' }),
        api.getRealtime(selectedSite),
      ]);
      setStats(s);
      setPageviews(pv?.pageviews || pv || []);
      setTopPages((tp || []).slice(0, 10));
      setReferrers((ref || []).slice(0, 10));
      setActiveVisitors(typeof rt === 'number' ? rt : rt?.x || 0);
    })();
  }, [status, selectedSite, timeRange]);

  // Draw simple chart
  useEffect(() => {
    if (!chartRef.current || pageviews.length === 0) return;
    const canvas = chartRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width = canvas.offsetWidth * 2;
    const h = canvas.height = canvas.offsetHeight * 2;
    ctx.scale(2, 2);
    const cw = w / 2, ch = h / 2;
    ctx.clearRect(0, 0, cw, ch);

    const values = pageviews.map(p => p.y);
    const max = Math.max(...values, 1);
    const step = cw / Math.max(values.length - 1, 1);
    const pad = 4;

    // Gradient fill
    const grad = ctx.createLinearGradient(0, 0, 0, ch);
    grad.addColorStop(0, 'rgba(79,142,247,0.3)');
    grad.addColorStop(1, 'rgba(79,142,247,0)');
    ctx.beginPath();
    ctx.moveTo(0, ch);
    values.forEach((v, i) => {
      const x = i * step;
      const y = ch - pad - ((v / max) * (ch - pad * 2));
      if (i === 0) ctx.lineTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.lineTo(cw, ch);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Line
    ctx.beginPath();
    values.forEach((v, i) => {
      const x = i * step;
      const y = ch - pad - ((v / max) * (ch - pad * 2));
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = '#4f8ef7';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }, [pageviews]);

  // ── Render ──

  if (status === 'loading') return <Panel onClose={onClose}><Centered>Łączenie z Umami...</Centered></Panel>;
  if (status === 'offline') return (
    <Panel onClose={onClose}>
      <Centered>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📊</div>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Umami Offline</div>
          <div style={{ color: '#94a3b8', fontSize: 12, marginBottom: 16 }}>
            Uruchom kontener: <code style={codeStyle}>podman-compose up -d umami</code>
          </div>
          <button style={btnPrimary} onClick={() => window.location.reload()}>Odśwież</button>
        </div>
      </Centered>
    </Panel>
  );
  if (status === 'auth-error') return (
    <Panel onClose={onClose}>
      <Centered>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🔑</div>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Błąd logowania</div>
          <div style={{ color: '#94a3b8', fontSize: 12 }}>Sprawdź dane logowania w ustawieniach</div>
        </div>
      </Centered>
    </Panel>
  );

  const site = websites.find(w => w.id === selectedSite);

  return (
    <Panel onClose={onClose}>
      {/* Header bar */}
      <div style={subHeaderStyle}>
        <select
          value={selectedSite}
          onChange={e => setSelectedSite(e.target.value)}
          style={selectStyle}
        >
          {websites.map(w => (
            <option key={w.id} value={w.id}>{w.name} ({w.domain})</option>
          ))}
        </select>
        <div style={{ display: 'flex', gap: 2 }}>
          {TIME_RANGES.map(r => (
            <button
              key={r.key}
              style={{ ...rangeBtnStyle, ...(timeRange === r.key ? rangeBtnActive : {}) }}
              onClick={() => setTimeRange(r.key)}
            >{r.label}</button>
          ))}
        </div>
      </div>

      {/* Realtime badge */}
      <div style={realtimeBadge}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
        <span style={{ marginLeft: 6, fontSize: 12 }}>{activeVisitors} aktywnych teraz</span>
      </div>

      {/* Tab bar */}
      <div style={tabBarStyle}>
        {(['overview', 'pages', 'referrers', 'settings'] as const).map(t => (
          <button
            key={t}
            style={{ ...tabStyle, ...(tab === t ? tabActive : {}) }}
            onClick={() => setTab(t)}
          >
            {t === 'overview' ? '📈 Przegląd' : t === 'pages' ? '📄 Strony' : t === 'referrers' ? '🔗 Źródła' : '⚙️ Konfiguracja'}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: 12 }}>
        {tab === 'overview' && stats && (
          <>
            {/* Stats cards */}
            <div style={statsGrid}>
              <StatCard label="Odsłony" value={stats.pageviews.value} change={pctChange(stats.pageviews.value, stats.pageviews.prev)} />
              <StatCard label="Odwiedzający" value={stats.visitors.value} change={pctChange(stats.visitors.value, stats.visitors.prev)} />
              <StatCard label="Wizyty" value={stats.visits.value} change={pctChange(stats.visits.value, stats.visits.prev)} />
              <StatCard label="Bounce" value={stats.bounces.value} change={pctChange(stats.bounces.value, stats.bounces.prev)} negative />
            </div>
            {/* Chart */}
            <div style={{ marginTop: 16, background: '#1e293b', borderRadius: 8, padding: 12 }}>
              <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>Odsłony — {site?.domain}</div>
              <canvas ref={chartRef} style={{ width: '100%', height: 120 }} />
            </div>
          </>
        )}

        {tab === 'pages' && (
          <MetricList title="Top Strony" items={topPages} />
        )}

        {tab === 'referrers' && (
          <MetricList title="Źródła ruchu" items={referrers} />
        )}

        {tab === 'settings' && (
          <SettingsTab />
        )}
      </div>
    </Panel>
  );
}

// ── Sub-components ──

function Panel({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={panelStyle}>
      <div style={headerStyle}>
        <span style={{ fontWeight: 700, fontSize: 14 }}>📊 Analytics — Umami</span>
        <button onClick={onClose} style={closeBtnStyle}>✕</button>
      </div>
      {children}
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{children}</div>;
}

function StatCard({ label, value, change, negative }: { label: string; value: number; change: string; negative?: boolean }) {
  const isPositive = change.startsWith('+');
  const color = negative ? (isPositive ? '#ef4444' : '#22c55e') : (isPositive ? '#22c55e' : '#ef4444');
  return (
    <div style={statCardStyle}>
      <div style={{ fontSize: 11, color: '#94a3b8' }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700 }}>{value.toLocaleString()}</div>
      <div style={{ fontSize: 11, color }}>{change}</div>
    </div>
  );
}

function MetricList({ title, items }: { title: string; items: Metric[] }) {
  const max = items.length > 0 ? Math.max(...items.map(i => i.y)) : 1;
  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>{title}</div>
      {items.length === 0 && <div style={{ color: '#64748b', fontSize: 12 }}>Brak danych</div>}
      {items.map((item, i) => (
        <div key={i} style={metricRowStyle}>
          <div style={{ flex: 1, position: 'relative', zIndex: 1 }}>
            <div style={{
              position: 'absolute', top: 0, left: 0, bottom: 0,
              width: `${(item.y / max) * 100}%`,
              background: 'rgba(79,142,247,0.1)',
              borderRadius: 4,
              zIndex: 0,
            }} />
            <span style={{ position: 'relative', zIndex: 1, fontSize: 12 }}>
              {item.x || '(bezpośredni)'}
            </span>
          </div>
          <span style={{ fontWeight: 600, fontSize: 12, minWidth: 40, textAlign: 'right' }}>{item.y}</span>
        </div>
      ))}
    </div>
  );
}

function SettingsTab() {
  const api = (window as any).electronAPI?.umami;
  const [baseUrl, setBaseUrl] = useState('http://localhost:5183');
  const [username, setUsername] = useState('Jimbo77');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [newSiteName, setNewSiteName] = useState('');
  const [newSiteDomain, setNewSiteDomain] = useState('');
  const [addingWebsite, setAddingWebsite] = useState(false);

  useEffect(() => {
    api?.getConfig().then((c: any) => {
      if (c?.baseUrl) setBaseUrl(c.baseUrl);
    });
  }, []);

  const save = async () => {
    const cfg: Record<string, string> = { baseUrl };
    if (username) cfg.username = username;
    if (password) cfg.password = password;
    await api?.setConfig(cfg);
    setMsg('Zapisano! Odśwież panel aby zastosować.');
  };

  const addWebsite = async () => {
    if (!newSiteName.trim() || !newSiteDomain.trim()) {
      setMsg('Podaj nazwę i domenę strony.');
      return;
    }
    setAddingWebsite(true);
    setMsg('');
    try {
      const result = await api?.createWebsite(newSiteName.trim(), newSiteDomain.trim());
      if (result?.id) {
        setMsg(`Strona dodana! ID: ${result.id}`);
        setNewSiteName('');
        setNewSiteDomain('');
      } else {
        setMsg('Błąd: ' + (result?.error || 'Nie udało się dodać strony'));
      }
    } catch (err: any) {
      setMsg('Błąd: ' + (err?.message || String(err)));
    }
    setAddingWebsite(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Konfiguracja Umami</div>
      <label style={labelStyle}>
        URL serwera
        <input style={inputStyle} value={baseUrl} onChange={e => setBaseUrl(e.target.value)} />
      </label>
      <label style={labelStyle}>
        Użytkownik
        <input style={inputStyle} value={username} onChange={e => setUsername(e.target.value)} />
      </label>
      <label style={labelStyle}>
        Hasło
        <input style={inputStyle} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="(bez zmian)" />
      </label>
      <button style={btnPrimary} onClick={save}>Zapisz</button>
      {msg && <div style={{ color: '#22c55e', fontSize: 12 }}>{msg}</div>}

      <div style={{ marginTop: 16, borderTop: '1px solid #334155', paddingTop: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>➕ Dodaj stronę</div>
        <label style={labelStyle}>
          Nazwa (np. "Mój blog")
          <input style={inputStyle} value={newSiteName} onChange={e => setNewSiteName(e.target.value)} placeholder="Moja strona" />
        </label>
        <label style={{ ...labelStyle, marginTop: 6 }}>
          Domena (np. "mojastrona.pl")
          <input style={inputStyle} value={newSiteDomain} onChange={e => setNewSiteDomain(e.target.value)} placeholder="mojastrona.pl" />
        </label>
        <button style={{ ...btnPrimary, marginTop: 8 }} onClick={addWebsite} disabled={addingWebsite}>
          {addingWebsite ? 'Dodawanie...' : 'Dodaj stronę'}
        </button>
      </div>

      <div style={{ marginTop: 16, padding: 12, background: '#1e293b', borderRadius: 8, fontSize: 11, color: '#94a3b8' }}>
        <strong>Tracking snippet:</strong><br />
        Dodaj na swoich stronach:<br />
        <code style={codeStyle}>
          {'<script defer src="' + baseUrl + '/script.js" data-website-id="TWOJE_ID"></script>'}
        </code>
      </div>
    </div>
  );
}

// ── Styles ──

const panelStyle: React.CSSProperties = {
  position: 'absolute', top: 0, right: 0, width: 440, height: '100%',
  background: '#0f172a', color: '#e2e8f0', borderLeft: '1px solid #1e293b',
  display: 'flex', flexDirection: 'column', zIndex: 50, fontSize: 13,
};

const headerStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '10px 14px', background: '#1e293b', borderBottom: '1px solid #334155',
};

const closeBtnStyle: React.CSSProperties = {
  background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer',
  fontSize: 16, padding: '2px 6px', borderRadius: 4,
};

const subHeaderStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '8px 12px', borderBottom: '1px solid #1e293b',
};

const selectStyle: React.CSSProperties = {
  background: '#1e293b', color: '#e2e8f0', border: '1px solid #334155',
  borderRadius: 6, padding: '4px 8px', fontSize: 12, maxWidth: 200,
};

const rangeBtnStyle: React.CSSProperties = {
  background: 'transparent', color: '#94a3b8', border: '1px solid transparent',
  borderRadius: 4, padding: '3px 8px', fontSize: 11, cursor: 'pointer',
};

const rangeBtnActive: React.CSSProperties = {
  background: '#4f8ef720', color: '#4f8ef7', borderColor: '#4f8ef7',
};

const realtimeBadge: React.CSSProperties = {
  display: 'flex', alignItems: 'center', padding: '6px 12px',
  background: '#0f172a', borderBottom: '1px solid #1e293b',
};

const tabBarStyle: React.CSSProperties = {
  display: 'flex', gap: 0, borderBottom: '1px solid #1e293b',
};

const tabStyle: React.CSSProperties = {
  flex: 1, padding: '8px 4px', background: 'none', border: 'none',
  color: '#94a3b8', fontSize: 11, cursor: 'pointer', borderBottom: '2px solid transparent',
};

const tabActive: React.CSSProperties = {
  color: '#4f8ef7', borderBottomColor: '#4f8ef7',
};

const statsGrid: React.CSSProperties = {
  display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8,
};

const statCardStyle: React.CSSProperties = {
  background: '#1e293b', borderRadius: 8, padding: '10px 12px',
};

const metricRowStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', padding: '6px 8px',
  borderBottom: '1px solid #1e293b', gap: 8,
};

const codeStyle: React.CSSProperties = {
  background: '#1e293b', padding: '4px 8px', borderRadius: 4, fontSize: 11,
  display: 'inline-block', marginTop: 4, wordBreak: 'break-all',
};

const labelStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: '#94a3b8',
};

const inputStyle: React.CSSProperties = {
  background: '#1e293b', color: '#e2e8f0', border: '1px solid #334155',
  borderRadius: 6, padding: '6px 10px', fontSize: 13,
};

const btnPrimary: React.CSSProperties = {
  background: '#4f8ef7', color: '#fff', border: 'none', borderRadius: 6,
  padding: '8px 16px', fontSize: 13, cursor: 'pointer', fontWeight: 600,
};
