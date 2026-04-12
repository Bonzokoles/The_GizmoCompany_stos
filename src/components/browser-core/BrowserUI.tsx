/**
 * BrowserUI.tsx — Main Browser Shell
 *
 * React 19 · lazy panels via panel-registry · ErrorBoundary · typed API · real webview
 *
 * Panels are registered in panel-registry.tsx — add a new panel there, not here.
 */

import { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { TabBar } from './TabBar';
import { AddressBar } from './AddressBar';
import { WebViewPanel } from './WebViewPanel';
import { StartPage } from '../navigation/StartPage';
import { SidebarOverlay } from '../navigation/SidebarOverlay';
import { PanelHost } from './PanelHost';
import { PANEL_REGISTRY } from './panel-registry';
import type { WebViewPanelHandle } from './WebViewPanel';
import type { Tab } from '../../types/electron';
import type { PanelId, PanelContext } from './shell.types';

const UpdateNotification = lazy(() =>
  import('../common/UpdateNotification').then(m => ({ default: m.UpdateNotification })),
);

/** Check if running inside Electron (electronAPI available) */
const isElectron = typeof window !== 'undefined' && !!window.electronAPI;

/** Normalize URL — add https:// if missing, detect search queries */
function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed || trimmed === 'about:blank') return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}/.test(trimmed)) return `https://${trimmed}`;
  return `https://www.google.com/search?q=${encodeURIComponent(trimmed)}`;
}

export function BrowserUI() {
  // ── Tab state ────────────────────────────────────────────────────────────
  const [tabs, setTabs] = useState<Tab[]>([
    {
      id: 'tab-1',
      title: 'Nowa karta',
      url: 'about:blank',
      isActive: true,
      createdAt: new Date(),
      lastAccessedAt: new Date(),
    },
  ]);
  const [currentUrl, setCurrentUrl] = useState('about:blank');
  const [webviewUrl, setWebviewUrl] = useState('about:blank');
  const [loading, setLoading] = useState(false);

  // ── Shell state ──────────────────────────────────────────────────────────
  /** Currently open floating panel (null = none) */
  const [activePanel, setActivePanel] = useState<PanelId | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showUpdateNotification, setShowUpdateNotification] = useState(true);

  const webviewRef = useRef<WebViewPanelHandle>(null);
  const tabCounter = useRef(1);

  // ── Toggle panel — same button opens / closes ────────────────────────────
  const togglePanel = useCallback((id: PanelId) => {
    setActivePanel(prev => (prev === id ? null : id));
  }, []);

  // ── Tab handlers ─────────────────────────────────────────────────────────
  const handleNewTab = useCallback(() => {
    tabCounter.current += 1;
    const newTab: Tab = {
      id: `tab-${tabCounter.current}`,
      title: 'Nowa karta',
      url: 'about:blank',
      isActive: true,
      createdAt: new Date(),
      lastAccessedAt: new Date(),
    };
    setTabs(prev => prev.map(t => ({ ...t, isActive: false })).concat(newTab));
    setCurrentUrl('about:blank');
    setWebviewUrl('about:blank');
  }, []);

  const handleCloseTab = useCallback((tabId: string) => {
    setTabs(prev => {
      const remaining = prev.filter(t => t.id !== tabId);
      if (remaining.length === 0) {
        return [{
          id: 'tab-1',
          title: 'Nowa karta',
          url: 'about:blank',
          isActive: true,
          createdAt: new Date(),
          lastAccessedAt: new Date(),
        }];
      }
      const closedWasActive = prev.find(t => t.id === tabId)?.isActive;
      if (closedWasActive) {
        const next = remaining[remaining.length - 1];
        next.isActive = true;
        setCurrentUrl(next.url);
        setWebviewUrl(next.url);
      }
      return remaining;
    });
  }, []);

  const handleTabClick = useCallback((tabId: string) => {
    setTabs(prev => {
      const tab = prev.find(t => t.id === tabId);
      if (tab) {
        setCurrentUrl(tab.url);
        setWebviewUrl(tab.url);
      }
      return prev.map(t => ({ ...t, isActive: t.id === tabId }));
    });
  }, []);

  // ── Navigation handlers ──────────────────────────────────────────────────
  const handleNavigate = useCallback((input: string) => {
    const url = normalizeUrl(input);
    if (!url || url === 'about:blank') return;
    setCurrentUrl(url);
    setWebviewUrl(url);
    setTabs(prev =>
      prev.map(t => (t.isActive ? { ...t, url, lastAccessedAt: new Date() } : t)),
    );
  }, []);

  const handleWebviewNavigate = useCallback((url: string) => {
    setCurrentUrl(url);
    setTabs(prev =>
      prev.map(t => (t.isActive ? { ...t, url, lastAccessedAt: new Date() } : t)),
    );
  }, []);

  const handleTitleChange = useCallback((title: string) => {
    setTabs(prev => prev.map(t => (t.isActive ? { ...t, title } : t)));
  }, []);

  const handleFaviconChange = useCallback((favicons: string[]) => {
    if (favicons.length > 0) {
      setTabs(prev =>
        prev.map(t => (t.isActive ? { ...t, favicon: favicons[0] } : t)),
      );
    }
  }, []);

  const handleGoBack    = useCallback(() => webviewRef.current?.goBack(),    []);
  const handleGoForward = useCallback(() => webviewRef.current?.goForward(), []);
  const handleReload    = useCallback(() => webviewRef.current?.reload(),    []);

  // ── IPC — main-process navigation commands ───────────────────────────────
  useEffect(() => {
    if (!isElectron) return;
    const unsubBack    = window.electronAPI.on('browser:navigate-back',    () => webviewRef.current?.goBack());
    const unsubForward = window.electronAPI.on('browser:navigate-forward', () => webviewRef.current?.goForward());
    const unsubMcpNav  = window.electronAPI.on('mcp:navigate', (...args: unknown[]) => {
      const url = typeof args[1] === 'string' ? args[1] : typeof args[0] === 'string' ? args[0] : '';
      if (url) handleNavigate(url);
    });
    return () => { unsubBack(); unsubForward(); unsubMcpNav(); };
  }, []);

  // ── Panel context (memoised shape) ───────────────────────────────────────
  const panelCtx: PanelContext = {
    onClose:    () => setActivePanel(null),
    onNavigate: handleNavigate,
    onNewTab:   handleNewTab,
    onBack:     handleGoBack,
    onForward:  handleGoForward,
    onReload:   handleReload,
    currentUrl,
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <ErrorBoundary>
      <div className="browser-container" style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>

        {/* Update Notification */}
        {isElectron && showUpdateNotification && (
          <Suspense fallback={null}>
            <ErrorBoundary>
              <UpdateNotification onDismiss={() => setShowUpdateNotification(false)} />
            </ErrorBoundary>
          </Suspense>
        )}

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <header
          className="browser-header"
          style={{ display: 'flex', alignItems: 'center', padding: '4px 8px', gap: '4px', background: '#1a1a2e', color: '#fff' }}
        >
          {/* Nav controls */}
          <div className="controls" style={{ display: 'flex', gap: '2px' }}>
            <button
              className="btn-icon"
              onClick={() => setShowSidebar(v => !v)}
              title="Menu boczne"
              aria-pressed={showSidebar}
              style={{ ...navBtnStyle, fontSize: '18px', marginRight: '4px' }}
            >
              ☰
            </button>
            <button className="btn-icon" onClick={handleGoBack}    aria-label="Wstecz" style={navBtnStyle}>←</button>
            <button className="btn-icon" onClick={handleGoForward} aria-label="Dalej"  style={navBtnStyle}>→</button>
            <button className="btn-icon" onClick={handleReload}    aria-label="Odśwież" style={navBtnStyle}>⟳</button>
          </div>

          <AddressBar url={currentUrl} onNavigate={handleNavigate} loading={loading} />

          {/* Panel toggle buttons — generated from registry */}
          <div className="header-controls" style={{ display: 'flex', gap: '2px' }}>
            {PANEL_REGISTRY.map(entry => (
              <button
                key={entry.id}
                className="btn-icon"
                onClick={() => togglePanel(entry.id)}
                title={entry.title}
                aria-pressed={activePanel === entry.id}
                style={navBtnStyle}
              >
                {entry.icon}
              </button>
            ))}
            <button className="btn-icon" onClick={handleNewTab} title="Nowa karta" style={navBtnStyle}>
              +
            </button>
          </div>
        </header>

        {/* ── Quick Nav Bar ───────────────────────────────────────────────── */}
        <QuickNavBar onNavigate={handleNavigate} />

        {/* ── Tab Bar ─────────────────────────────────────────────────────── */}
        <TabBar
          tabs={tabs}
          onTabClick={handleTabClick}
          onTabClose={handleCloseTab}
          onNewTab={handleNewTab}
        />

        {/* ── Main Content ─────────────────────────────────────────────────── */}
        <main className="browser-main" style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>

          {/* Start Page overlay for new tabs */}
          {(currentUrl === 'about:blank' || !currentUrl) && (
            <div style={{ position: 'absolute', inset: 0, zIndex: 10 }}>
              <StartPage onNavigate={handleNavigate} />
            </div>
          )}

          {/* Sidebar */}
          {showSidebar && (
            <SidebarOverlay onNavigate={handleNavigate} onClose={() => setShowSidebar(false)} />
          )}

          {/* WebView */}
          <WebViewPanel
            ref={webviewRef}
            url={webviewUrl}
            onNavigate={handleWebviewNavigate}
            onTitleChange={handleTitleChange}
            onLoadStart={() => setLoading(true)}
            onLoadStop={() => setLoading(false)}
            onFaviconChange={handleFaviconChange}
          />

          {/* Active floating panel */}
          <PanelHost activePanel={activePanel} ctx={panelCtx} />
        </main>

        {/* ── Status Bar ──────────────────────────────────────────────────── */}
        <footer
          className="browser-footer"
          style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 8px', background: '#16213e', color: '#8892b0', fontSize: '12px' }}
        >
          <span>{loading ? 'Ładowanie...' : 'Gotowy'}</span>
          <span>{tabs.length} kart(a/y)</span>
        </footer>
      </div>
    </ErrorBoundary>
  );
}

// ── Quick Nav Bar — extracted to keep BrowserUI lean ─────────────────────────

interface QuickNavBarProps { onNavigate: (url: string) => void }

function QuickNavBar({ onNavigate }: QuickNavBarProps) {
  const links: [string, string, string][] = [
    ['http://localhost:5173/',                               '⚡ localhost',        'ZENO Browser – lokalny dev (z HUB + Asystentem)'],
    ['https://zenbrowsers.org/',                            '🌐 ZenBrowsers.org',  'ZENO Browser – strona oficjalna (CF Pages)'],
    ['https://zenbrowsers.org/ai-hub/',                    '🤖 AI Org Hub',       'AI Hub — centrum narzędzi AI'],
    ['https://bonzo-media-hub.stolarnia-ams.workers.dev/', '♫ BONZO Media Hub',   'BONZO Media Hub — osobna aplikacja Cloudflare'],
    ['https://jimbo77.com',                                '👤 jimbo77.com',      'Jimbo77 — strona główna'],
    ['https://jimbo77.org',                                '🔗 jimbo77.org',      'Jimbo77 — org'],
    ['https://mybonzoaiblog.com',                          '📝 MyBonzoAI Blog',   'MyBonzo AI Blog'],
    ['https://mybonzo.com',                                '🤖 mybonzo.com',      'MyBonzo — strona główna'],
  ];

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 14px', background: '#16213e', borderBottom: '1px solid #0f3460', overflowX: 'auto' }}>
      {links.map(([url, label, title]) => (
        <button
          key={url}
          onClick={() => onNavigate(url)}
          title={title}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'transparent', border: '1px solid #0f3460', color: '#64ffda', cursor: 'pointer', padding: '3px 12px', fontSize: '12px', borderRadius: '4px', whiteSpace: 'nowrap', lineHeight: '1.5', transition: 'background 0.15s, border-color 0.15s', flexShrink: 0 }}
          onMouseEnter={e => { e.currentTarget.style.background = '#0f3460'; e.currentTarget.style.borderColor = '#64ffda33'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = '#0f3460'; }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// ── Shared style for nav/toolbar buttons ─────────────────────────────────────

const navBtnStyle: React.CSSProperties = {
  border: 'none',
  color: '#e0e0e0',
  cursor: 'pointer',
  padding: '4px 8px',
  fontSize: '16px',
  borderRadius: '4px',
  transition: 'background 150ms ease-out, transform 150ms ease-out',
};
