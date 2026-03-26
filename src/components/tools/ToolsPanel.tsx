/**
 * ToolsPanel — Unified panel for Network, Crawler, and Workflow tools
 * Exposes B2-B5 backend services through a tabbed UI
 */

import { useState, useCallback, useEffect } from 'react';

interface ToolsPanelProps {
  onClose: () => void;
}

type ActiveTab = 'network' | 'crawler' | 'workflow';

// ── Inline styles (matching floating-panel theme) ─────────────

const panelStyle: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  right: 0,
  width: 420,
  height: '100%',
  background: '#0f172a',
  color: '#e2e8f0',
  borderLeft: '1px solid #1e293b',
  display: 'flex',
  flexDirection: 'column',
  zIndex: 50,
  fontSize: 13,
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '8px 12px',
  background: '#1e293b',
  borderBottom: '1px solid #334155',
};

const tabBarStyle: React.CSSProperties = {
  display: 'flex',
  gap: 0,
  borderBottom: '1px solid #334155',
};

const contentStyle: React.CSSProperties = {
  flex: 1,
  overflow: 'auto',
  padding: 12,
};

const btnClose: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: '#94a3b8',
  fontSize: 18,
  cursor: 'pointer',
};

const btnSmall: React.CSSProperties = {
  background: '#334155',
  border: '1px solid #475569',
  color: '#e2e8f0',
  padding: '4px 12px',
  borderRadius: 4,
  cursor: 'pointer',
  fontSize: 12,
};

const btnPrimary: React.CSSProperties = {
  ...btnSmall,
  background: '#3b82f6',
  borderColor: '#2563eb',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '6px 8px',
  background: '#1e293b',
  border: '1px solid #334155',
  borderRadius: 4,
  color: '#e2e8f0',
  fontSize: 13,
  boxSizing: 'border-box',
};

const sectionStyle: React.CSSProperties = {
  marginBottom: 16,
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: 4,
  color: '#94a3b8',
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const statBox: React.CSSProperties = {
  background: '#1e293b',
  borderRadius: 6,
  padding: '8px 12px',
  marginBottom: 6,
};

const api = typeof window !== 'undefined' ? window.electronAPI : null;

// ═══════════════════════════════════════════════════════════════
// NETWORK TAB
// ═══════════════════════════════════════════════════════════════

function NetworkTab() {
  const [stats, setStats] = useState<any>(null);
  const [config, setConfig] = useState<any>(null);
  const [proxyUrl, setProxyUrl] = useState('');
  const [proxyType, setProxyType] = useState<'http' | 'socks5'>('http');
  const [connections, setConnections] = useState<any[]>([]);

  const refresh = useCallback(async () => {
    if (!api?.network) return;
    try {
      const [s, c, cfg] = await Promise.all([
        api.network.getStats(),
        api.network.getConnections(),
        api.network.getConfig(),
      ]);
      setStats(s);
      setConnections(Array.isArray(c) ? c.slice(-20) : []);
      setConfig(cfg);
    } catch (e) {
      console.error('Network refresh failed:', e);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const handleSetProxy = useCallback(async () => {
    if (!proxyUrl.trim() || !api?.network) return;
    await api.network.setProxy(proxyUrl.trim(), proxyType);
    setProxyUrl('');
    refresh();
  }, [proxyUrl, proxyType, refresh]);

  const handleClearProxy = useCallback(async () => {
    if (!api?.network) return;
    await api.network.clearProxy();
    refresh();
  }, [refresh]);

  return (
    <div>
      {/* Stats */}
      <div style={sectionStyle}>
        <span style={labelStyle}>Statystyki sieci</span>
        {stats ? (
          <div style={statBox}>
            <div>Zapytania: <strong>{stats.total ?? 0}</strong></div>
            {stats.byMethod && (
              <div style={{ marginTop: 4 }}>
                {Object.entries(stats.byMethod).map(([m, c]) => (
                  <span key={m} style={{ marginRight: 8 }}>{m}: {c as number}</span>
                ))}
              </div>
            )}
            {stats.byDomain && Object.keys(stats.byDomain).length > 0 && (
              <div style={{ marginTop: 4, fontSize: 11, color: '#94a3b8' }}>
                Domeny: {Object.keys(stats.byDomain).slice(0, 5).join(', ')}
                {Object.keys(stats.byDomain).length > 5 && ` +${Object.keys(stats.byDomain).length - 5}`}
              </div>
            )}
          </div>
        ) : (
          <div style={statBox}>Brak danych — kliknij Odśwież</div>
        )}
      </div>

      {/* Proxy */}
      <div style={sectionStyle}>
        <span style={labelStyle}>Proxy</span>
        {config?.proxy?.enabled && (
          <div style={{ ...statBox, color: '#22c55e', fontSize: 12 }}>
            ✓ Aktywny: {config.proxy.url} ({config.proxy.type})
          </div>
        )}
        <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
          <input
            style={{ ...inputStyle, flex: 1 }}
            value={proxyUrl}
            onChange={e => setProxyUrl(e.target.value)}
            placeholder="http://proxy:8080"
          />
          <select
            style={{ ...inputStyle, width: 90 }}
            value={proxyType}
            onChange={e => setProxyType(e.target.value as 'http' | 'socks5')}
          >
            <option value="http">HTTP</option>
            <option value="socks5">SOCKS5</option>
          </select>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button style={btnPrimary} onClick={handleSetProxy}>Ustaw proxy</button>
          <button style={btnSmall} onClick={handleClearProxy}>Wyczyść</button>
        </div>
      </div>

      {/* Recent Connections */}
      <div style={sectionStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <span style={labelStyle}>Ostatnie połączenia</span>
          <button style={btnSmall} onClick={refresh}>Odśwież</button>
        </div>
        {connections.length > 0 ? (
          <div style={{ maxHeight: 200, overflow: 'auto' }}>
            {connections.map((c, i) => (
              <div key={i} style={{ fontSize: 11, padding: '2px 0', borderBottom: '1px solid #1e293b', wordBreak: 'break-all' }}>
                <span style={{ color: c.status >= 400 ? '#ef4444' : '#22c55e', marginRight: 4 }}>
                  {c.method || 'GET'}
                </span>
                <span style={{ color: '#94a3b8' }}>{c.url?.slice(0, 60)}</span>
                {c.status && <span style={{ marginLeft: 4, color: '#64748b' }}>[{c.status}]</span>}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ color: '#64748b', fontSize: 12 }}>Brak połączeń</div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// CRAWLER TAB
// ═══════════════════════════════════════════════════════════════

function CrawlerTab() {
  const [startUrl, setStartUrl] = useState('');
  const [maxPages, setMaxPages] = useState(10);
  const [followLinks, setFollowLinks] = useState(true);
  const [crawls, setCrawls] = useState<any[]>([]);
  const [activeCrawl, setActiveCrawl] = useState<any>(null);

  const refreshCrawls = useCallback(async () => {
    if (!api?.crawler) return;
    try {
      const list = await api.crawler.list();
      setCrawls(Array.isArray(list) ? list : []);
    } catch (e) {
      console.error('Crawler list failed:', e);
    }
  }, []);

  useEffect(() => { refreshCrawls(); }, [refreshCrawls]);

  const handleStart = useCallback(async () => {
    if (!startUrl.trim() || !api?.crawler) return;
    try {
      const result = await api.crawler.start({
        startUrls: [startUrl.trim()],
        maxPages,
        followLinks,
        delay: 500,
      });
      setActiveCrawl(result);
      setStartUrl('');
      refreshCrawls();
    } catch (e) {
      console.error('Crawler start failed:', e);
    }
  }, [startUrl, maxPages, followLinks, refreshCrawls]);

  const handleCancel = useCallback(async (crawlId: string) => {
    if (!api?.crawler) return;
    await api.crawler.cancel(crawlId);
    refreshCrawls();
  }, [refreshCrawls]);

  const handleExport = useCallback(async (crawlId: string, format: 'json' | 'csv') => {
    if (!api?.crawler) return;
    try {
      const data = await api.crawler.export(crawlId, format);
      // Download as file
      const blob = new Blob([typeof data === 'string' ? data : JSON.stringify(data, null, 2)], {
        type: format === 'csv' ? 'text/csv' : 'application/json',
      });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `crawl-${crawlId}.${format}`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      console.error('Export failed:', e);
    }
  }, []);

  const handleViewCrawl = useCallback(async (crawlId: string) => {
    if (!api?.crawler) return;
    const data = await api.crawler.get(crawlId);
    setActiveCrawl(data);
  }, []);

  return (
    <div>
      {/* New Crawl */}
      <div style={sectionStyle}>
        <span style={labelStyle}>Nowe crawlowanie</span>
        <input
          style={{ ...inputStyle, marginBottom: 4 }}
          value={startUrl}
          onChange={e => setStartUrl(e.target.value)}
          placeholder="https://example.com"
          onKeyDown={e => e.key === 'Enter' && handleStart()}
        />
        <div style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'center' }}>
          <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
            Max stron:
            <input
              type="number"
              style={{ ...inputStyle, width: 60 }}
              value={maxPages}
              onChange={e => setMaxPages(Number(e.target.value) || 10)}
              min={1}
              max={100}
            />
          </label>
          <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
            <input
              type="checkbox"
              checked={followLinks}
              onChange={e => setFollowLinks(e.target.checked)}
            />
            Podążaj za linkami
          </label>
        </div>
        <button style={btnPrimary} onClick={handleStart} disabled={!startUrl.trim()}>
          Rozpocznij crawlowanie
        </button>
      </div>

      {/* Active Crawl Detail */}
      {activeCrawl && (
        <div style={sectionStyle}>
          <span style={labelStyle}>Szczegóły crawla</span>
          <div style={statBox}>
            <div>ID: <strong>{activeCrawl.id}</strong></div>
            <div>Status: <strong style={{ color: activeCrawl.status === 'running' ? '#f59e0b' : activeCrawl.status === 'completed' ? '#22c55e' : '#94a3b8' }}>
              {activeCrawl.status}
            </strong></div>
            <div>Stron: {activeCrawl.pages?.length ?? activeCrawl.pagesVisited ?? 0}</div>
            {activeCrawl.status === 'running' && (
              <button style={{ ...btnSmall, marginTop: 4, color: '#ef4444', borderColor: '#ef4444' }} onClick={() => handleCancel(activeCrawl.id)}>
                Anuluj
              </button>
            )}
          </div>
        </div>
      )}

      {/* Crawl History */}
      <div style={sectionStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <span style={labelStyle}>Historia crawli</span>
          <button style={btnSmall} onClick={refreshCrawls}>Odśwież</button>
        </div>
        {crawls.length > 0 ? (
          <div>
            {crawls.slice(-10).map((c: any) => (
              <div key={c.id} style={{ ...statBox, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 12 }}>{c.id}</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>
                    {c.status} — {c.pages?.length ?? c.pagesVisited ?? '?'} stron
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button style={btnSmall} onClick={() => handleViewCrawl(c.id)}>Pokaż</button>
                  <button style={btnSmall} onClick={() => handleExport(c.id, 'json')}>JSON</button>
                  <button style={btnSmall} onClick={() => handleExport(c.id, 'csv')}>CSV</button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ color: '#64748b', fontSize: 12 }}>Brak crawli</div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// WORKFLOW TAB
// ═══════════════════════════════════════════════════════════════

function WorkflowTab() {
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [executions, setExecutions] = useState<any[]>([]);
  const [newWorkflowId, setNewWorkflowId] = useState('');
  const [stepUrl, setStepUrl] = useState('');

  const refresh = useCallback(async () => {
    if (!api?.workflow) return;
    try {
      const [wf, ex] = await Promise.all([
        api.workflow.list(),
        api.workflow.listExecutions(),
      ]);
      setWorkflows(Array.isArray(wf) ? wf : []);
      setExecutions(Array.isArray(ex) ? ex : []);
    } catch (e) {
      console.error('Workflow refresh failed:', e);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const handleCreateQuick = useCallback(async () => {
    if (!newWorkflowId.trim() || !stepUrl.trim() || !api?.workflow) return;
    try {
      await api.workflow.create(newWorkflowId.trim(), [
        { type: 'navigate', config: { url: stepUrl.trim() } },
        { type: 'wait', config: { duration: 2000 } },
      ]);
      setNewWorkflowId('');
      setStepUrl('');
      refresh();
    } catch (e) {
      console.error('Workflow create failed:', e);
    }
  }, [newWorkflowId, stepUrl, refresh]);

  const handleExecute = useCallback(async (wfId: string) => {
    if (!api?.workflow) return;
    try {
      await api.workflow.execute(wfId);
      refresh();
    } catch (e) {
      console.error('Workflow execute failed:', e);
    }
  }, [refresh]);

  return (
    <div>
      {/* Quick Create */}
      <div style={sectionStyle}>
        <span style={labelStyle}>Szybki workflow</span>
        <input
          style={{ ...inputStyle, marginBottom: 4 }}
          value={newWorkflowId}
          onChange={e => setNewWorkflowId(e.target.value)}
          placeholder="Nazwa workflow"
        />
        <input
          style={{ ...inputStyle, marginBottom: 4 }}
          value={stepUrl}
          onChange={e => setStepUrl(e.target.value)}
          placeholder="URL do nawigacji"
        />
        <button
          style={btnPrimary}
          onClick={handleCreateQuick}
          disabled={!newWorkflowId.trim() || !stepUrl.trim()}
        >
          Utwórz workflow
        </button>
      </div>

      {/* Workflows */}
      <div style={sectionStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <span style={labelStyle}>Workflow'y</span>
          <button style={btnSmall} onClick={refresh}>Odśwież</button>
        </div>
        {workflows.length > 0 ? (
          <div>
            {workflows.map((wf: any) => (
              <div key={wf.id} style={{ ...statBox, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{wf.id}</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>
                    {wf.steps?.length ?? '?'} kroków
                  </div>
                </div>
                <button style={btnPrimary} onClick={() => handleExecute(wf.id)}>
                  ▶ Uruchom
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ color: '#64748b', fontSize: 12 }}>Brak workflow'ów — utwórz powyżej</div>
        )}
      </div>

      {/* Executions */}
      <div style={sectionStyle}>
        <span style={labelStyle}>Historia wykonań</span>
        {executions.length > 0 ? (
          <div>
            {executions.slice(-10).map((ex: any) => (
              <div key={ex.id} style={statBox}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12 }}>{ex.workflowId}</span>
                  <span style={{
                    fontSize: 11,
                    color: ex.status === 'completed' ? '#22c55e' : ex.status === 'running' ? '#f59e0b' : '#ef4444',
                  }}>
                    {ex.status}
                  </span>
                </div>
                {ex.error && (
                  <div style={{ fontSize: 11, color: '#ef4444', marginTop: 2 }}>{ex.error}</div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ color: '#64748b', fontSize: 12 }}>Brak wykonań</div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN PANEL
// ═══════════════════════════════════════════════════════════════

export function ToolsPanel({ onClose }: ToolsPanelProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('network');

  const tabBtn = (tab: ActiveTab, label: string, icon: string): React.CSSProperties => ({
    flex: 1,
    padding: '8px 4px',
    background: activeTab === tab ? '#0f172a' : '#1e293b',
    border: 'none',
    borderBottom: activeTab === tab ? '2px solid #3b82f6' : '2px solid transparent',
    color: activeTab === tab ? '#e2e8f0' : '#64748b',
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: activeTab === tab ? 600 : 400,
  });

  return (
    <div className="tools-panel floating-panel" style={panelStyle} role="complementary" aria-label="Panel narzędzi">
      {/* Header */}
      <div style={headerStyle}>
        <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>🛠 Narzędzia</h2>
        <button style={btnClose} onClick={onClose} aria-label="Zamknij panel narzędzi">×</button>
      </div>

      {/* Tab Bar */}
      <div style={tabBarStyle}>
        <button style={tabBtn('network', 'Sieć', '📡')} onClick={() => setActiveTab('network')}>
          📡 Sieć
        </button>
        <button style={tabBtn('crawler', 'Crawler', '🕷')} onClick={() => setActiveTab('crawler')}>
          🕷 Crawler
        </button>
        <button style={tabBtn('workflow', 'Workflow', '⚡')} onClick={() => setActiveTab('workflow')}>
          ⚡ Workflow
        </button>
      </div>

      {/* Content */}
      <div style={contentStyle}>
        {activeTab === 'network' && <NetworkTab />}
        {activeTab === 'crawler' && <CrawlerTab />}
        {activeTab === 'workflow' && <WorkflowTab />}
      </div>
    </div>
  );
}
