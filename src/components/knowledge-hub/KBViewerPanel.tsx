/**
 * KBViewerPanel — Embedded Knowledge Base Viewer
 * Wyświetla lokalny KB Viewer (http://localhost:8765) jako iframe w ZENO Browser.
 * Automatycznie sprawdza czy serwer działa i podaje instrukcję uruchomienia.
 */

import { useState, useEffect, useRef } from 'react';

const KB_VIEWER_URL = 'http://localhost:8765';
const KB_VIEWER_PORT = 8765;

interface KBViewerPanelProps {
  onClose: () => void;
  onSendToJimbo?: (doc: { title: string; url: string; category: string; query: string; content: string; md_path: string }) => void;
}

type ServerStatus = 'checking' | 'online' | 'offline';

export function KBViewerPanel({ onClose, onSendToJimbo }: KBViewerPanelProps) {
  const [status, setStatus] = useState<ServerStatus>('checking');
  const [iframeKey, setIframeKey] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentDocPath, setCurrentDocPath] = useState<string>('');
  const [sendingToJimbo, setSendingToJimbo] = useState(false);
  const checkRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Sprawdź czy serwer KB Viewer działa
  // Używamy no-cors — odpowiedź będzie "opaque" ale brak wyjątku = serwer żyje
  const checkServer = async () => {
    try {
      await fetch(`${KB_VIEWER_URL}/`, {
        method: 'GET',
        mode: 'no-cors',
        signal: AbortSignal.timeout(3000),
      });
      // no-cors nie rzuca wyjątku gdy serwer odpowiada (nawet status 200 jest opaque)
      setStatus('online');
      if (checkRef.current) {
        clearInterval(checkRef.current);
        checkRef.current = null;
      }
    } catch {
      setStatus('offline');
    }
  };

  useEffect(() => {
    checkServer();
    // Jeśli offline — sprawdzaj co 5s
    checkRef.current = setInterval(checkServer, 5000);
    return () => {
      if (checkRef.current) clearInterval(checkRef.current);
    };
  }, []);

  const handleReload = () => {
    setIframeKey(k => k + 1);
    setStatus('checking');
    checkServer();
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setIframeKey(k => k + 1);
    }
  };

  const handleSendToJimbo = async () => {
    if (!currentDocPath || !onSendToJimbo) return;
    setSendingToJimbo(true);
    try {
      const res = await fetch(`http://localhost:8765/api/doc?f=${encodeURIComponent(currentDocPath)}`);
      const doc = await res.json();
      onSendToJimbo(doc);
    } catch (e) {
      console.error('KB→Jimbo error:', e);
    } finally {
      setSendingToJimbo(false);
    }
  };

  const iframeSrc = searchQuery.trim()
    ? `${KB_VIEWER_URL}/?q=${encodeURIComponent(searchQuery)}`
    : `${KB_VIEWER_URL}/`;

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.headerIcon}>📚</span>
          <span style={styles.headerTitle}>KB Viewer</span>
          <span style={{
            ...styles.statusDot,
            background: status === 'online' ? '#10b981' : status === 'checking' ? '#f59e0b' : '#ef4444',
          }} title={status === 'online' ? 'Serwer online' : status === 'checking' ? 'Sprawdzam...' : 'Serwer offline'} />
          <span style={styles.statusText}>
            {status === 'online' ? 'online' : status === 'checking' ? 'łączę...' : 'offline'}
          </span>
        </div>

        {/* Search bar */}
        <form onSubmit={handleSearch} style={styles.searchForm}>
          <input
            type="text"
            placeholder="🔍 Szukaj w bazie wiedzy..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={styles.searchInput}
          />
          <button type="submit" style={styles.searchBtn}>Szukaj</button>
        </form>

        {currentDocPath && onSendToJimbo && (
          <button
            onClick={() => { handleSendToJimbo().catch(console.error); }}
            disabled={sendingToJimbo}
            style={{
              padding: '5px 12px',
              background: sendingToJimbo ? '#334155' : '#7c3aed',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: sendingToJimbo ? 'wait' : 'pointer',
              flexShrink: 0,
            }}
            title="Wyślij ten artykuł do Jimbo_kit — napisz artykuł lub plan integracji"
          >
            {sendingToJimbo ? '⏳ Ładuję...' : '📤 Wyślij do Jimbo'}
          </button>
        )}

        <div style={styles.headerRight}>
          <button onClick={handleReload} style={styles.iconBtn} title="Odśwież">⟳</button>
          <a
            href={KB_VIEWER_URL}
            target="_blank"
            rel="noreferrer"
            style={styles.iconBtn}
            title="Otwórz w nowej karcie"
          >🔗</a>
          <button onClick={onClose} style={styles.closeBtn} title="Zamknij">✕</button>
        </div>
      </div>

      {/* Content */}
      {status === 'offline' ? (
        <div style={styles.offline}>
          <div style={styles.offlineIcon}>📚</div>
          <h2 style={styles.offlineTitle}>KB Viewer nie działa</h2>
          <p style={styles.offlineText}>Serwer na porcie {KB_VIEWER_PORT} jest niedostępny.</p>
          <div style={styles.offlineBox}>
            <p style={styles.offlineLabel}>Uruchom w terminalu:</p>
            <code style={styles.offlineCode}>
              cd U:\The_DEVz_HUB_of_work\knowledge_base{'\n'}
              python kb_viewer.py
            </code>
          </div>
          <p style={styles.offlineHint}>lub dodaj do <code style={styles.inlineCode}>start_zeno_hub.bat</code></p>
          <button onClick={checkServer} style={styles.retryBtn}>
            ↻ Sprawdź ponownie
          </button>
        </div>
      ) : (
        <iframe
          key={iframeKey}
          src={iframeSrc}
          style={styles.iframe}
          title="KB Viewer"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          onLoad={(e) => {
            if (status === 'checking') setStatus('online');
            try {
              const src = (e.target as HTMLIFrameElement).src || '';
              const url = new URL(src);
              const f = url.searchParams.get('f') || '';
              setCurrentDocPath(f);
            } catch { setCurrentDocPath(''); }
          }}
        />
      )}
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    background: '#0f172a',
    color: '#e2e8f0',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    background: '#1e293b',
    borderBottom: '1px solid #334155',
    flexShrink: 0,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    flexShrink: 0,
  },
  headerIcon: { fontSize: '18px' },
  headerTitle: {
    fontSize: '14px',
    fontWeight: 700,
    color: '#e2e8f0',
    whiteSpace: 'nowrap',
  },
  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  statusText: {
    fontSize: '11px',
    color: '#94a3b8',
    whiteSpace: 'nowrap',
  },
  searchForm: {
    display: 'flex',
    gap: '6px',
    flex: 1,
    minWidth: 0,
  },
  searchInput: {
    flex: 1,
    padding: '5px 10px',
    background: '#334155',
    border: '1px solid #475569',
    borderRadius: '6px',
    color: '#e2e8f0',
    fontSize: '13px',
    outline: 'none',
    minWidth: 0,
  },
  searchBtn: {
    padding: '5px 12px',
    background: '#3b82f6',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    flexShrink: 0,
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    flexShrink: 0,
  },
  iconBtn: {
    background: 'transparent',
    border: '1px solid #334155',
    color: '#94a3b8',
    borderRadius: '5px',
    padding: '4px 8px',
    cursor: 'pointer',
    fontSize: '14px',
    textDecoration: 'none',
    display: 'inline-flex',
    alignItems: 'center',
  },
  closeBtn: {
    background: 'transparent',
    border: '1px solid #334155',
    color: '#94a3b8',
    borderRadius: '5px',
    padding: '4px 8px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  iframe: {
    flex: 1,
    border: 'none',
    width: '100%',
    height: '100%',
    background: '#0f172a',
  },
  offline: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
    padding: '40px',
    textAlign: 'center',
  },
  offlineIcon: { fontSize: '48px', opacity: 0.4 },
  offlineTitle: { fontSize: '20px', fontWeight: 700, color: '#e2e8f0' },
  offlineText: { color: '#94a3b8', fontSize: '14px' },
  offlineBox: {
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '10px',
    padding: '16px 24px',
    textAlign: 'left',
  },
  offlineLabel: { color: '#94a3b8', fontSize: '12px', marginBottom: '8px' },
  offlineCode: {
    display: 'block',
    fontFamily: 'monospace',
    fontSize: '13px',
    color: '#64ffda',
    whiteSpace: 'pre',
    lineHeight: 1.8,
  },
  offlineHint: { color: '#64748b', fontSize: '12px' },
  inlineCode: { fontFamily: 'monospace', color: '#94a3b8' },
  retryBtn: {
    padding: '8px 20px',
    background: '#3b82f6',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
  },
};
