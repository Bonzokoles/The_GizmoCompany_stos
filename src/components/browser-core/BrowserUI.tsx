/**
 * Browser UI — Main React Component
 * React 19 + lazy panels + ErrorBoundary + typed API + real webview
 */

import { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { TabBar } from './TabBar';
import { AddressBar } from './AddressBar';
import { WebViewPanel } from './WebViewPanel';
import { StartPage } from '../navigation/StartPage';
import { SidebarOverlay } from '../navigation/SidebarOverlay';
import { useBrowserCopilotActions } from '../../hooks/useBrowserCopilotActions';
import type { WebViewPanelHandle } from './WebViewPanel';
import type { Tab } from '../../types/electron';

const AIPanel = lazy(() => import('../ai/AIPanel').then(m => ({ default: m.AIPanel })));
const SecurityMonitor = lazy(() => import('../analytics/SecurityMonitor').then(m => ({ default: m.SecurityMonitor })));
const CloudflareTunnelPanel = lazy(() => import('../cloudflare/CloudflareTunnelPanel').then(m => ({ default: m.CloudflareTunnelPanel })));
const PluginHub = lazy(() => import('../plugins/PluginHub').then(m => ({ default: m.PluginHub })));
const ToolsPanel = lazy(() => import('../tools/ToolsPanel').then(m => ({ default: m.ToolsPanel })));
const AIGatewayPanel = lazy(() => import('../ai/AIGatewayPanel').then(m => ({ default: m.AIGatewayPanel })));
const TerminalPanel = lazy(() => import('../tools/TerminalPanel').then(m => ({ default: m.TerminalPanel })));
const AnalyticsPanel = lazy(() => import('../analytics/AnalyticsPanel').then(m => ({ default: m.AnalyticsPanel })));
const UpdateNotification = lazy(() => import('../common/UpdateNotification').then(m => ({ default: m.UpdateNotification })));
const SearchPanel = lazy(() => import('../navigation/SearchPanel').then(m => ({ default: m.SearchPanel })));
const CatalogBrowser = lazy(() => import('../tools/CatalogBrowser').then(m => ({ default: m.CatalogBrowser })));
const KnowledgeHubPanel = lazy(() => import('../knowledge-hub/KnowledgeHubPanel').then(m => ({ default: m.KnowledgeHubPanel })));
const AgentsCreatorPanel = lazy(() => import('../agents-creator/AgentsCreatorPanel').then(m => ({ default: m.AgentsCreatorPanel })));
const CopilotDevPanel = lazy(() => import('../ai/CopilotDevPanel').then(m => ({ default: m.CopilotDevPanel })));
const JimboKitPanel = lazy(() => import('../assistant/JimboKitPanel').then(m => ({ default: m.JimboKitPanel })));

function PanelFallback() {
  return <div className="panel-loading">Ładowanie panelu...</div>;
}

/** Check if running inside Electron (electronAPI available) */
const isElectron = typeof window !== 'undefined' && !!window.electronAPI;

/** Normalize URL — add https:// if missing, detect search queries */
function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed || trimmed === 'about:blank') return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}/.test(trimmed)) return `https://${trimmed}`;
  // Treat as search query
  return `https://www.google.com/search?q=${encodeURIComponent(trimmed)}`;
}

export function BrowserUI() {
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
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [showSecurityPanel, setShowSecurityPanel] = useState(false);
  const [showTunnelPanel, setShowTunnelPanel] = useState(false);
  const [showPluginHub, setShowPluginHub] = useState(false);
  const [showToolsPanel, setShowToolsPanel] = useState(false);
  const [showAIGateway, setShowAIGateway] = useState(false);
  const [showTerminal, setShowTerminal] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showSearchPanel, setShowSearchPanel] = useState(false);
  const [showCatalogBrowser, setShowCatalogBrowser] = useState(false);
  const [showKnowledgeHub, setShowKnowledgeHub] = useState(false);
  const [showAgentsCreator, setShowAgentsCreator] = useState(false);
  const [showCopilotDev, setShowCopilotDev] = useState(false);
  const [showJimboKit, setShowJimboKit] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showUpdateNotification, setShowUpdateNotification] = useState(true);
  const [loading, setLoading] = useState(false);

  // URL that the webview should navigate to (set from address bar)
  const [webviewUrl, setWebviewUrl] = useState('about:blank');

  const webviewRef = useRef<WebViewPanelHandle>(null);
  const tabCounter = useRef(1);

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
        // Don't close last tab, reset it
        return [{
          id: 'tab-1',
          title: 'Nowa karta',
          url: 'about:blank',
          isActive: true,
          createdAt: new Date(),
          lastAccessedAt: new Date(),
        }];
      }
      // If we closed the active tab, activate the last one
      const closedWasActive = prev.find(t => t.id === tabId)?.isActive;
      if (closedWasActive && remaining.length > 0) {
        remaining[remaining.length - 1].isActive = true;
        const active = remaining[remaining.length - 1];
        setCurrentUrl(active.url);
        setWebviewUrl(active.url);
      }
      return remaining;
    });
  }, []);

  const handleNavigate = useCallback((input: string) => {
    const url = normalizeUrl(input);
    if (!url || url === 'about:blank') return;

    setCurrentUrl(url);
    setWebviewUrl(url);
    setTabs(prev => prev.map(t =>
      t.isActive ? { ...t, url, lastAccessedAt: new Date() } : t
    ));
  }, []);

  // Called by webview when it navigates (e.g. clicking a link)
  const handleWebviewNavigate = useCallback((url: string) => {
    setCurrentUrl(url);
    setTabs(prev => prev.map(t =>
      t.isActive ? { ...t, url, lastAccessedAt: new Date() } : t
    ));
  }, []);

  const handleTitleChange = useCallback((title: string) => {
    setTabs(prev => prev.map(t =>
      t.isActive ? { ...t, title } : t
    ));
  }, []);

  const handleFaviconChange = useCallback((favicons: string[]) => {
    if (favicons.length > 0) {
      setTabs(prev => prev.map(t =>
        t.isActive ? { ...t, favicon: favicons[0] } : t
      ));
    }
  }, []);

  const handleGoBack = useCallback(() => {
    webviewRef.current?.goBack();
  }, []);

  const handleGoForward = useCallback(() => {
    webviewRef.current?.goForward();
  }, []);

  const handleReload = useCallback(() => {
    webviewRef.current?.reload();
  }, []);

  // Listen for main-process navigation commands (IPC path for extensions/plugins)
  useEffect(() => {
    if (!isElectron) return;
    const unsubBack = window.electronAPI.on('browser:navigate-back', () => {
      webviewRef.current?.goBack();
    });
    const unsubForward = window.electronAPI.on('browser:navigate-forward', () => {
      webviewRef.current?.goForward();
    });
    const unsubMcpNav = window.electronAPI.on('mcp:navigate', (...args: unknown[]) => {
      const url = typeof args[1] === 'string' ? args[1] : typeof args[0] === 'string' ? args[0] : '';
      if (url) handleNavigate(url);
    });
    return () => { unsubBack(); unsubForward(); unsubMcpNav(); };
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

  // ── CopilotKit Actions ───────────────────────────────────────────────────
  useBrowserCopilotActions({
    navigate:   handleNavigate,
    newTab:     handleNewTab,
    closeTab:   handleCloseTab,
    goBack:     handleGoBack,
    goForward:  handleGoForward,
    reload:     handleReload,
    currentUrl,
    tabs,
    setPanels: {
      ai:           setShowAIPanel,
      security:     setShowSecurityPanel,
      tunnel:       setShowTunnelPanel,
      plugins:      setShowPluginHub,
      tools:        setShowToolsPanel,
      gateway:      setShowAIGateway,
      terminal:     setShowTerminal,
      analytics:    setShowAnalytics,
      search:       setShowSearchPanel,
      catalog:      setShowCatalogBrowser,
      knowledgeHub: setShowKnowledgeHub,
      agents:       setShowAgentsCreator,
      copilotDev:   setShowCopilotDev,
      sidebar:      setShowSidebar,
    },
  });

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

        {/* Header */}
        <header className="browser-header" style={{ display: 'flex', alignItems: 'center', padding: '4px 8px', gap: '4px', background: '#1a1a2e', color: '#fff' }}>
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
            <button
              className="btn-icon"
              onClick={handleGoBack}
              aria-label="Wstecz"
              style={navBtnStyle}
            >
              ←
            </button>
            <button
              className="btn-icon"
              onClick={handleGoForward}
              aria-label="Dalej"
              style={navBtnStyle}
            >
              →
            </button>
            <button className="btn-icon" onClick={handleReload} aria-label="Odśwież" style={navBtnStyle}>
              ⟳
            </button>
          </div>

          <AddressBar
            url={currentUrl}
            onNavigate={handleNavigate}
            loading={loading}
          />

          <div className="header-controls" style={{ display: 'flex', gap: '2px' }}>
            <button
              className="btn-icon"
              onClick={() => setShowAIPanel(v => !v)}
              title="Asystent AI"
              aria-pressed={showAIPanel}
              style={navBtnStyle}
            >
              🤖
            </button>
            <button
              className="btn-icon"
              onClick={() => setShowSecurityPanel(v => !v)}
              title="Bezpieczeństwo"
              aria-pressed={showSecurityPanel}
              style={navBtnStyle}
            >
              🔒
            </button>
            <button
              className="btn-icon"
              onClick={() => setShowTunnelPanel(v => !v)}
              title="Cloudflare Tunnel"
              aria-pressed={showTunnelPanel}
              style={navBtnStyle}
            >
              🌐
            </button>
            <button
              className="btn-icon"
              onClick={() => setShowPluginHub(v => !v)}
              title="Wtyczki"
              aria-pressed={showPluginHub}
              style={navBtnStyle}
            >
              🔌
            </button>
            <button
              className="btn-icon"
              onClick={() => setShowToolsPanel(v => !v)}
              title="Narzędzia"
              aria-pressed={showToolsPanel}
              style={navBtnStyle}
            >
              🛠
            </button>
            <button
              className="btn-icon"
              onClick={() => setShowAIGateway(v => !v)}
              title="AI Gateway"
              aria-pressed={showAIGateway}
              style={navBtnStyle}
            >
              🧠
            </button>
            <button
              className="btn-icon"
              onClick={() => setShowTerminal(v => !v)}
              title="Terminal"
              aria-pressed={showTerminal}
              style={navBtnStyle}
            >
              ⌨
            </button>
            <button
              className="btn-icon"
              onClick={() => setShowAnalytics(v => !v)}
              title="Analytics (Umami)"
              aria-pressed={showAnalytics}
              style={navBtnStyle}
            >
              📊
            </button>
            <button
              className="btn-icon"
              onClick={() => setShowSearchPanel(v => !v)}
              title="Wyszukiwarka"
              aria-pressed={showSearchPanel}
              style={navBtnStyle}
            >
              🔍
            </button>
            <button
              className="btn-icon"
              onClick={() => setShowCatalogBrowser(v => !v)}
              title="Biblioteka lokalna"
              aria-pressed={showCatalogBrowser}
              style={navBtnStyle}
            >
              📚
            </button>
            <button
              className="btn-icon"
              onClick={() => setShowKnowledgeHub(v => !v)}
              title="Knowledge Hub — bazy wiedzy i agenci"
              aria-pressed={showKnowledgeHub}
              style={navBtnStyle}
            >
              📇
            </button>
            <button
              className="btn-icon"
              onClick={() => setShowAgentsCreator(v => !v)}
              title="Agents Creator — tworzenie agentów z bazami wiedzy"
              aria-pressed={showAgentsCreator}
              style={navBtnStyle}
            >
              🧑‍💻
            </button>
            <button
              className="btn-icon"
              onClick={() => setShowCopilotDev(v => !v)}
              title="Copilot Dev — @github/copilot-sdk panel"
              aria-pressed={showCopilotDev}
              style={navBtnStyle}
            >
              🪁
            </button>
            <button
              className="btn-icon"
              onClick={() => setShowJimboKit(v => !v)}
              title="Jimbo_kit — Agent AI z terminalem"
              aria-pressed={showJimboKit}
              style={navBtnStyle}
            >
              🦾
            </button>
            <button className="btn-icon" onClick={handleNewTab} title="Nowa karta" style={navBtnStyle}>
              +
            </button>
          </div>
        </header>

        {/* Quick Nav Bar — skróty między stronami */}
        {(() => {
          const navBtn = (url: string, label: string, title: string) => (
            <button
              key={url}
              onClick={() => handleNavigate(url)}
              title={title}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'transparent', border: '1px solid #0f3460', color: '#64ffda', cursor: 'pointer', padding: '3px 12px', fontSize: '12px', borderRadius: '4px', whiteSpace: 'nowrap', lineHeight: '1.5', transition: 'background 0.15s, border-color 0.15s', flexShrink: 0 }}
              onMouseEnter={e => { e.currentTarget.style.background = '#0f3460'; e.currentTarget.style.borderColor = '#64ffda33'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = '#0f3460'; }}
            >{label}</button>
          );
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 14px', background: '#16213e', borderBottom: '1px solid #0f3460', overflowX: 'auto' }}>
              {navBtn('https://zenbrowsers.org/',                        '🌐 ZenBrowsers.org',    'ZENO Browser – strona oficjalna')}
              {navBtn('https://zenbrowsers.org/ai-hub/',                 '🤖 AI Org Hub',         'AI Hub — centrum narzędzi AI')}
              {navBtn('https://bonzo-media-hub.stolarnia-ams.workers.dev/', '♫ BONZO Media Hub',    'BONZO Media Hub — osobna aplikacja Cloudflare')}
              {navBtn('https://jimbo77.com',                             '👤 jimbo77.com',        'Jimbo77 — strona główna')}
              {navBtn('https://jimbo77.org',                             '🔗 jimbo77.org',        'Jimbo77 — org')}
              {navBtn('https://mybonzoaiblog.com',                       '📝 MyBonzoAI Blog',     'MyBonzo AI Blog')}
              {navBtn('https://mybonzo.com',                             '🤖 mybonzo.com',        'MyBonzo — strona główna')}
            </div>
          );
        })()}

        {/* Tab Bar */}
        <TabBar
          tabs={tabs}
          onTabClick={handleTabClick}
          onTabClose={handleCloseTab}
          onNewTab={handleNewTab}
        />

        {/* Main Content — Webview + floating panels */}
        <main className="browser-main" style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          {/* Start Page overlay for new tabs */}
          {(currentUrl === 'about:blank' || !currentUrl) && (
            <div style={{ position: 'absolute', inset: 0, zIndex: 10 }}>
              <StartPage onNavigate={handleNavigate} />
            </div>
          )}

          {/* Sidebar overlay — available on any page */}
          {showSidebar && (
            <SidebarOverlay
              onNavigate={handleNavigate}
              onClose={() => setShowSidebar(false)}
            />
          )}

          {/* Real web page rendering — webview in Electron, iframe fallback otherwise */}
          <WebViewPanel
            ref={webviewRef}
            url={webviewUrl}
            onNavigate={handleWebviewNavigate}
            onTitleChange={handleTitleChange}
            onLoadStart={() => setLoading(true)}
            onLoadStop={() => setLoading(false)}
            onFaviconChange={handleFaviconChange}
          />

          {/* Lazy-loaded floating panels */}
          <Suspense fallback={<PanelFallback />}>
            {showAIPanel && (
              <ErrorBoundary>
                <AIPanel onClose={() => setShowAIPanel(false)} />
              </ErrorBoundary>
            )}
            {showSecurityPanel && (
              <ErrorBoundary>
                <SecurityMonitor onClose={() => setShowSecurityPanel(false)} />
              </ErrorBoundary>
            )}
            {showTunnelPanel && (
              <ErrorBoundary>
                <CloudflareTunnelPanel onClose={() => setShowTunnelPanel(false)} />
              </ErrorBoundary>
            )}
            {showPluginHub && (
              <ErrorBoundary>
                <PluginHub onClose={() => setShowPluginHub(false)} />
              </ErrorBoundary>
            )}
            {showToolsPanel && (
              <ErrorBoundary>
                <ToolsPanel onClose={() => setShowToolsPanel(false)} />
              </ErrorBoundary>
            )}
            {showAIGateway && (
              <ErrorBoundary>
                <AIGatewayPanel onClose={() => setShowAIGateway(false)} />
              </ErrorBoundary>
            )}
            {showTerminal && (
              <ErrorBoundary>
                <TerminalPanel onClose={() => setShowTerminal(false)} onNavigate={handleNavigate} />
              </ErrorBoundary>
            )}
            {showAnalytics && (
              <ErrorBoundary>
                <AnalyticsPanel onClose={() => setShowAnalytics(false)} />
              </ErrorBoundary>
            )}
            {showSearchPanel && (
              <ErrorBoundary>
                <SearchPanel onClose={() => setShowSearchPanel(false)} onNavigate={handleNavigate} />
              </ErrorBoundary>
            )}
            {showCatalogBrowser && (
              <ErrorBoundary>
                <CatalogBrowser onClose={() => setShowCatalogBrowser(false)} />
              </ErrorBoundary>
            )}
            {showKnowledgeHub && (
              <ErrorBoundary>
                <KnowledgeHubPanel onClose={() => setShowKnowledgeHub(false)} />
              </ErrorBoundary>
            )}
            {showAgentsCreator && (
              <ErrorBoundary>
                <AgentsCreatorPanel onClose={() => setShowAgentsCreator(false)} />
              </ErrorBoundary>
            )}
            {showCopilotDev && (
              <ErrorBoundary>
                <CopilotDevPanel onClose={() => setShowCopilotDev(false)} />
              </ErrorBoundary>
            )}
            {showJimboKit && (
              <ErrorBoundary>
                <JimboKitPanel
                  onClose={() => setShowJimboKit(false)}
                  onNavigate={handleNavigate}
                  onNewTab={handleNewTab}
                  onBack={handleGoBack}
                  onForward={handleGoForward}
                  onReload={handleReload}
                  currentUrl={currentUrl}
                  floating
                />
              </ErrorBoundary>
            )}
          </Suspense>
        </main>

        {/* Status Bar */}
        <footer className="browser-footer" style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 8px', background: '#16213e', color: '#8892b0', fontSize: '12px' }}>
          <span>{loading ? 'Ładowanie...' : 'Gotowy'}</span>
          <span>{tabs.length} kart(a/y)</span>
        </footer>
      </div>
    </ErrorBoundary>
  );
}

const navBtnStyle: React.CSSProperties = {
  border: 'none',
  color: '#e0e0e0',
  cursor: 'pointer',
  padding: '4px 8px',
  fontSize: '16px',
  borderRadius: '4px',
  transition: 'background 150ms ease-out, transform 150ms ease-out',
};