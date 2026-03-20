/**
 * SearchPanel — Unified 3-layer search UI
 * Tabs: 🌐 Web (SearXNG) | 🧠 Deep Search (AI) | 📚 Biblioteka (local)
 */

import { useState, useCallback } from 'react';
import type {
  WebSearchResult,
  DeepSearchReport,
  LocalSearchResult,
  ComparisonResult,
} from '../types/electron';

const isElectron = typeof window !== 'undefined' && !!window.electronAPI;

type SearchTab = 'web' | 'deep' | 'local' | 'compare';

interface Props {
  onClose: () => void;
  onNavigate?: (url: string) => void;
}

export function SearchPanel({ onClose, onNavigate }: Props) {
  const [activeTab, setActiveTab] = useState<SearchTab>('web');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Results
  const [webResults, setWebResults] = useState<WebSearchResult[]>([]);
  const [deepReport, setDeepReport] = useState<DeepSearchReport | null>(null);
  const [localResults, setLocalResults] = useState<LocalSearchResult[]>([]);
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);

  const handleSearch = useCallback(async () => {
    if (!query.trim() || !isElectron) return;
    setLoading(true);
    setError(null);

    try {
      switch (activeTab) {
        case 'web': {
          const res = await window.electronAPI.search.webSearch(query);
          if (res.success && res.data) setWebResults(res.data);
          else setError(res.error ?? 'Brak wyników');
          break;
        }
        case 'deep': {
          const res = await window.electronAPI.search.deepSearch(query);
          if (res.success && res.data) setDeepReport(res.data);
          else setError(res.error ?? 'Analiza niedostępna');
          break;
        }
        case 'local': {
          const res = await window.electronAPI.search.localSearch(query);
          if (res.success && res.data) setLocalResults(res.data);
          else setError(res.error ?? 'Brak wyników lokalnych');
          break;
        }
        case 'compare': {
          const res = await window.electronAPI.search.compare(query);
          if (res.success && res.data) setComparison(res.data);
          else setError(res.error ?? 'Porównanie niedostępne');
          break;
        }
      }
    } catch (err: any) {
      setError(err.message ?? 'Błąd wyszukiwania');
    } finally {
      setLoading(false);
    }
  }, [query, activeTab]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  return (
    <div style={panelStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <span style={{ fontWeight: 'bold', fontSize: '16px' }}>🔍 Wyszukiwarka ZENO</span>
        <button onClick={onClose} style={closeBtnStyle}>✕</button>
      </div>

      {/* Tabs */}
      <div style={tabBarStyle}>
        {([
          ['web', '🌐 Web'],
          ['deep', '🧠 Deep Search'],
          ['local', '📚 Biblioteka'],
          ['compare', '⚖️ Porównanie'],
        ] as [SearchTab, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            style={{
              ...tabBtnStyle,
              borderBottom: activeTab === key ? '2px solid #64ffda' : '2px solid transparent',
              color: activeTab === key ? '#64ffda' : '#8892b0',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Search Input */}
      <div style={{ display: 'flex', gap: '8px', padding: '8px 12px' }}>
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Wpisz zapytanie..."
          style={inputStyle}
          autoFocus
        />
        <button onClick={handleSearch} disabled={loading || !query.trim()} style={searchBtnStyle}>
          {loading ? '⏳' : '🔍'}
        </button>
      </div>

      {/* Error */}
      {error && <div style={errorStyle}>⚠ {error}</div>}

      {/* Results */}
      <div style={resultsStyle}>
        {activeTab === 'web' && <WebResults results={webResults} onNavigate={onNavigate} />}
        {activeTab === 'deep' && <DeepResults report={deepReport} />}
        {activeTab === 'local' && <LocalResults results={localResults} />}
        {activeTab === 'compare' && <CompareResults result={comparison} onNavigate={onNavigate} />}
      </div>
    </div>
  );
}

// ── Web Results ────────────────────────────────────────────────

function WebResults({ results, onNavigate }: { results: WebSearchResult[]; onNavigate?: (url: string) => void }) {
  if (!results.length) return <div style={emptyStyle}>Wyszukaj w internecie za pomocą SearXNG</div>;
  return (
    <div>
      {results.map((r, i) => (
        <div key={i} style={resultCardStyle}>
          <a
            href="#"
            onClick={e => { e.preventDefault(); onNavigate?.(r.url); }}
            style={linkStyle}
          >
            {r.title}
          </a>
          <div style={urlStyle}>{r.url}</div>
          <div style={snippetStyle}>{r.snippet}</div>
          <div style={metaStyle}>
            <span>🔧 {r.engine}</span>
            {r.score !== undefined && <span>⭐ {r.score.toFixed(2)}</span>}
            {r.publishedDate && <span>📅 {r.publishedDate}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Deep Search Results ────────────────────────────────────────

function DeepResults({ report }: { report: DeepSearchReport | null }) {
  if (!report) return <div style={emptyStyle}>Deep Search: AI analizuje wyniki SearXNG i generuje raport</div>;
  return (
    <div>
      <div style={{ ...resultCardStyle, borderLeft: '3px solid #64ffda' }}>
        <h3 style={{ margin: '0 0 8px', color: '#ccd6f6' }}>📋 Podsumowanie</h3>
        <p style={{ margin: 0, color: '#a8b2d1', lineHeight: 1.5 }}>{report.summary}</p>
      </div>

      {report.keyFindings.length > 0 && (
        <div style={resultCardStyle}>
          <h3 style={{ margin: '0 0 8px', color: '#ccd6f6' }}>🔑 Kluczowe ustalenia</h3>
          <ul style={{ margin: 0, paddingLeft: '20px' }}>
            {report.keyFindings.map((f, i) => (
              <li key={i} style={{ color: '#a8b2d1', marginBottom: '4px' }}>{f}</li>
            ))}
          </ul>
        </div>
      )}

      {report.sources.length > 0 && (
        <div style={resultCardStyle}>
          <h3 style={{ margin: '0 0 8px', color: '#ccd6f6' }}>📎 Źródła</h3>
          {report.sources.map((s, i) => (
            <div key={i} style={{ marginBottom: '6px' }}>
              <span style={{ color: '#64ffda' }}>{s.title}</span>
              <div style={{ fontSize: '11px', color: '#8892b0' }}>{s.url}</div>
              <div style={{ fontSize: '12px', color: '#a8b2d1' }}>{s.relevance}</div>
            </div>
          ))}
        </div>
      )}

      <div style={metaStyle}>
        <span>🤖 {report.provider}/{report.model}</span>
        <span>⚡ {report.latency}ms</span>
        {report.cost !== undefined && <span>💰 ${report.cost.toFixed(4)}</span>}
      </div>
    </div>
  );
}

// ── Local Results ──────────────────────────────────────────────

function LocalResults({ results }: { results: LocalSearchResult[] }) {
  if (!results.length) return <div style={emptyStyle}>Wyszukaj w lokalnych bibliotekach (SQLite FTS5)</div>;
  return (
    <div>
      {results.map((r, i) => (
        <div key={i} style={resultCardStyle}>
          <div style={{ color: '#64ffda', fontWeight: 'bold' }}>📄 {r.fileName}</div>
          <div style={urlStyle}>{r.filePath}</div>
          <div
            style={snippetStyle}
            dangerouslySetInnerHTML={{ __html: r.snippet }}
          />
        </div>
      ))}
    </div>
  );
}

// ── Comparison Results ─────────────────────────────────────────

function CompareResults({ result, onNavigate }: { result: ComparisonResult | null; onNavigate?: (url: string) => void }) {
  if (!result) return <div style={emptyStyle}>Porównaj wyniki online z lokalnymi danymi</div>;
  return (
    <div>
      <div style={{ ...resultCardStyle, borderLeft: '3px solid #ff6b6b' }}>
        <h3 style={{ margin: '0 0 8px', color: '#ccd6f6' }}>⚖️ Analiza porównawcza</h3>
        <p style={{ margin: 0, color: '#a8b2d1', lineHeight: 1.5 }}>{result.comparison}</p>
        {result.model && <div style={{ ...metaStyle, marginTop: '6px' }}>🤖 {result.model}</div>}
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        <div style={{ flex: 1 }}>
          <h4 style={{ color: '#64ffda', margin: '8px 0 4px' }}>🌐 Online ({result.webResults.length})</h4>
          {result.webResults.slice(0, 5).map((r, i) => (
            <div key={i} style={{ ...resultCardStyle, padding: '6px 8px' }}>
              <a href="#" onClick={e => { e.preventDefault(); onNavigate?.(r.url); }} style={linkStyle}>
                {r.title}
              </a>
              <div style={{ fontSize: '11px', color: '#8892b0' }}>{r.snippet?.substring(0, 100)}</div>
            </div>
          ))}
        </div>
        <div style={{ flex: 1 }}>
          <h4 style={{ color: '#ff6b6b', margin: '8px 0 4px' }}>📚 Lokalne ({result.localResults.length})</h4>
          {result.localResults.slice(0, 5).map((r, i) => (
            <div key={i} style={{ ...resultCardStyle, padding: '6px 8px' }}>
              <div style={{ color: '#ccd6f6', fontWeight: 'bold' }}>{r.fileName}</div>
              <div style={{ fontSize: '11px', color: '#8892b0' }} dangerouslySetInnerHTML={{ __html: r.snippet?.substring(0, 100) }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Styles ─────────────────────────────────────────────────────

const panelStyle: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  right: 0,
  width: '520px',
  height: '100%',
  background: '#0a192f',
  borderLeft: '1px solid #233554',
  display: 'flex',
  flexDirection: 'column',
  zIndex: 100,
  color: '#ccd6f6',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '10px 12px',
  borderBottom: '1px solid #233554',
};

const closeBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: '#8892b0',
  cursor: 'pointer',
  fontSize: '18px',
};

const tabBarStyle: React.CSSProperties = {
  display: 'flex',
  gap: '0',
  borderBottom: '1px solid #233554',
};

const tabBtnStyle: React.CSSProperties = {
  flex: 1,
  background: 'transparent',
  border: 'none',
  padding: '8px 4px',
  cursor: 'pointer',
  fontSize: '12px',
  fontWeight: 'bold',
  transition: 'color 0.2s',
};

const inputStyle: React.CSSProperties = {
  flex: 1,
  background: '#112240',
  border: '1px solid #233554',
  borderRadius: '6px',
  color: '#ccd6f6',
  padding: '8px 12px',
  fontSize: '14px',
  outline: 'none',
};

const searchBtnStyle: React.CSSProperties = {
  background: '#1a365d',
  border: '1px solid #233554',
  borderRadius: '6px',
  color: '#64ffda',
  cursor: 'pointer',
  padding: '8px 14px',
  fontSize: '16px',
};

const resultsStyle: React.CSSProperties = {
  flex: 1,
  overflow: 'auto',
  padding: '8px 12px',
};

const resultCardStyle: React.CSSProperties = {
  background: '#112240',
  borderRadius: '6px',
  padding: '10px 12px',
  marginBottom: '8px',
};

const linkStyle: React.CSSProperties = {
  color: '#64ffda',
  textDecoration: 'none',
  fontWeight: 'bold',
  fontSize: '14px',
  cursor: 'pointer',
};

const urlStyle: React.CSSProperties = {
  fontSize: '11px',
  color: '#4a5568',
  marginTop: '2px',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const snippetStyle: React.CSSProperties = {
  fontSize: '13px',
  color: '#a8b2d1',
  marginTop: '4px',
  lineHeight: 1.4,
};

const metaStyle: React.CSSProperties = {
  display: 'flex',
  gap: '12px',
  fontSize: '11px',
  color: '#8892b0',
  marginTop: '6px',
};

const emptyStyle: React.CSSProperties = {
  textAlign: 'center',
  padding: '40px 20px',
  color: '#8892b0',
  fontSize: '14px',
};

const errorStyle: React.CSSProperties = {
  padding: '8px 12px',
  color: '#ff6b6b',
  fontSize: '13px',
};
