/**
 * PluginHub — Consolidated plugin management panel
 * Combines: PluginManager, PluginExplorer, PluginInstaller
 */

import { useState, useEffect, useCallback, useTransition } from 'react';
import type { InstalledPlugin } from '../types/electron';
import {
  marketplaceService,
  type MarketplacePlugin,
} from '../plugin-system/marketplace/marketplace-service';
import './PluginHub.css';

// ── Types ──────────────────────────────────────────────────────

type HubTab = 'installed' | 'explore' | 'updates';
type InstallStage = 'idle' | 'installing' | 'complete' | 'error';

interface InstallState {
  pluginId: string | null;
  stage: InstallStage;
  progress: number;
  error: string | null;
}

interface PluginHubProps {
  onClose: () => void;
}

// ── Helpers ────────────────────────────────────────────────────

const INITIAL_INSTALL: InstallState = {
  pluginId: null,
  stage: 'idle',
  progress: 0,
  error: null,
};

// ── Component ──────────────────────────────────────────────────

export function PluginHub({ onClose }: PluginHubProps) {
  const { electronAPI } = window;

  // Tab state
  const [activeTab, setActiveTab] = useState<HubTab>('installed');

  // Installed plugins
  const [installed, setInstalled] = useState<InstalledPlugin[]>([]);
  const [loadingInstalled, setLoadingInstalled] = useState(true);

  // Explore state
  const [featured, setFeatured] = useState<MarketplacePlugin[]>([]);
  const [trending, setTrending] = useState<MarketplacePlugin[]>([]);
  const [searchResults, setSearchResults] = useState<MarketplacePlugin[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [exploreView, setExploreView] = useState<'featured' | 'trending' | 'search'>('featured');
  const [loadingExplore, setLoadingExplore] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Install flow
  const [installState, setInstallState] = useState<InstallState>(INITIAL_INSTALL);

  // Inline uninstall confirmation
  const [confirmUninstall, setConfirmUninstall] = useState<string | null>(null);

  // ── Data Loading ─────────────────────────────────────────────

  const loadInstalled = useCallback(async () => {
    setLoadingInstalled(true);
    try {
      const plugins = await electronAPI.plugin?.getInstalled();
      setInstalled(plugins ?? []);
    } catch (err) {
      console.error('Nie udało się załadować wtyczek:', err);
    } finally {
      setLoadingInstalled(false);
    }
  }, [electronAPI]);

  const loadExplore = useCallback(async () => {
    setLoadingExplore(true);
    try {
      const [feat, trend] = await Promise.all([
        marketplaceService.getFeatured(),
        marketplaceService.getTrending(),
      ]);
      setFeatured(feat);
      setTrending(trend);
    } catch (err) {
      console.error('Nie udało się załadować marketplace:', err);
    } finally {
      setLoadingExplore(false);
    }
  }, []);

  useEffect(() => {
    loadInstalled();
  }, [loadInstalled]);

  useEffect(() => {
    if (activeTab === 'explore' && featured.length === 0 && trending.length === 0) {
      loadExplore();
    }
  }, [activeTab, featured.length, trending.length, loadExplore]);

  // ── Installed Tab Actions ────────────────────────────────────

  const handleToggle = useCallback(
    async (pluginId: string, currentlyEnabled: boolean) => {
      try {
        if (currentlyEnabled) {
          await electronAPI.plugin?.disable(pluginId);
        } else {
          await electronAPI.plugin?.enable(pluginId);
        }
        setInstalled((prev) =>
          prev.map((p) => (p.id === pluginId ? { ...p, enabled: !p.enabled } : p)),
        );
      } catch (err) {
        console.error('Nie udało się przełączyć wtyczki:', err);
      }
    },
    [electronAPI],
  );

  const handleUninstall = useCallback(
    async (pluginId: string) => {
      try {
        await electronAPI.plugin?.uninstall(pluginId);
        setInstalled((prev) => prev.filter((p) => p.id !== pluginId));
      } catch (err) {
        console.error('Nie udało się odinstalować wtyczki:', err);
      } finally {
        setConfirmUninstall(null);
      }
    },
    [electronAPI],
  );

  const handleUpdate = useCallback(
    async (pluginId: string) => {
      try {
        await electronAPI.plugin?.update(pluginId);
        await loadInstalled();
      } catch (err) {
        console.error('Nie udało się zaktualizować wtyczki:', err);
      }
    },
    [electronAPI, loadInstalled],
  );

  const handleUpdateAll = useCallback(async () => {
    const updatable = installed.filter((p) => p.hasUpdate);
    for (const plugin of updatable) {
      await handleUpdate(plugin.id);
    }
  }, [installed, handleUpdate]);

  // ── Explore Tab Actions ──────────────────────────────────────

  const handleSearch = useCallback(
    (query: string) => {
      setSearchQuery(query);
      if (!query.trim()) {
        setExploreView('featured');
        setSearchResults([]);
        return;
      }
      startTransition(() => {
        void (async () => {
          try {
            const results = await marketplaceService.search(query);
            setSearchResults(results);
            setExploreView('search');
          } catch (err) {
            console.error('Wyszukiwanie nie powiodło się:', err);
          }
        })();
      });
    },
    [startTransition],
  );

  // ── Install Flow ─────────────────────────────────────────────

  const handleInstall = useCallback(
    async (pluginId: string) => {
      setInstallState({ pluginId, stage: 'installing', progress: 0, error: null });
      try {
        // Simulate progress increments during install
        for (let i = 10; i <= 90; i += 10) {
          await new Promise((r) => setTimeout(r, 150));
          setInstallState((prev) => ({ ...prev, progress: i }));
        }

        await electronAPI.plugin?.install(pluginId);

        setInstallState((prev) => ({ ...prev, stage: 'complete', progress: 100 }));
        // Refresh installed list after successful install
        await loadInstalled();

        // Auto-clear after brief delay
        setTimeout(() => setInstallState(INITIAL_INSTALL), 2500);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Nieznany błąd instalacji';
        setInstallState((prev) => ({ ...prev, stage: 'error', error: message }));
      }
    },
    [electronAPI, loadInstalled],
  );

  const resetInstall = useCallback(() => setInstallState(INITIAL_INSTALL), []);

  // ── Derived Data ─────────────────────────────────────────────

  const updatable = installed.filter((p) => p.hasUpdate);

  // ── Render Helpers ───────────────────────────────────────────

  const renderInstallBanner = () => {
    if (installState.stage === 'idle') return null;

    return (
      <div className="ph-install-banner" role="status" aria-live="polite">
        {installState.stage === 'installing' && (
          <>
            <span>Instalowanie…</span>
            <div className="ph-progress-bar" role="progressbar" aria-valuenow={installState.progress} aria-valuemin={0} aria-valuemax={100}>
              <div className="ph-progress-fill" style={{ width: `${installState.progress}%` }} />
            </div>
            <span className="ph-progress-text">{installState.progress}%</span>
          </>
        )}
        {installState.stage === 'complete' && (
          <span className="ph-success">✅ Wtyczka zainstalowana pomyślnie</span>
        )}
        {installState.stage === 'error' && (
          <div className="ph-error-banner">
            <span>❌ {installState.error}</span>
            <button type="button" className="ph-btn ph-btn-sm" onClick={resetInstall}>
              Zamknij
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderInstalledTab = () => {
    if (loadingInstalled) {
      return <p className="ph-empty">Ładowanie wtyczek…</p>;
    }
    if (installed.length === 0) {
      return <p className="ph-empty">Brak zainstalowanych wtyczek</p>;
    }

    return (
      <ul className="ph-plugin-list" role="list">
        {installed.map((plugin) => (
          <li key={plugin.id} className="ph-plugin-row" role="listitem">
            {plugin.icon && (
              <img src={plugin.icon} alt="" className="ph-icon-sm" aria-hidden="true" />
            )}

            <div className="ph-plugin-info">
              <strong>{plugin.name}</strong>
              <span className="ph-meta">
                {plugin.author} · v{plugin.version}
              </span>
            </div>

            <div className="ph-actions">
              {plugin.hasUpdate && (
                <span className="ph-badge-update" aria-label="Dostępna aktualizacja">⬆</span>
              )}

              <button
                type="button"
                className={`ph-btn ph-btn-sm ${plugin.enabled ? 'ph-btn-warn' : 'ph-btn-ok'}`}
                onClick={() => handleToggle(plugin.id, plugin.enabled)}
                aria-pressed={plugin.enabled}
              >
                {plugin.enabled ? 'Wyłącz' : 'Włącz'}
              </button>

              {confirmUninstall === plugin.id ? (
                <span className="ph-confirm-inline" role="alert">
                  <span>Na pewno?</span>
                  <button
                    type="button"
                    className="ph-btn ph-btn-sm ph-btn-danger"
                    onClick={() => handleUninstall(plugin.id)}
                  >
                    Tak
                  </button>
                  <button
                    type="button"
                    className="ph-btn ph-btn-sm"
                    onClick={() => setConfirmUninstall(null)}
                  >
                    Nie
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  className="ph-btn ph-btn-sm ph-btn-danger"
                  onClick={() => setConfirmUninstall(plugin.id)}
                >
                  Odinstaluj
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    );
  };

  const renderExploreCard = (plugin: MarketplacePlugin) => (
    <div key={plugin.id} className="ph-card">
      {plugin.icon && <img src={plugin.icon} alt="" className="ph-icon-lg" aria-hidden="true" />}
      <h3 className="ph-card-title">{plugin.name}</h3>
      <p className="ph-card-author">{plugin.author}</p>
      <p className="ph-card-desc">{plugin.description}</p>

      <div className="ph-card-meta">
        <span aria-label={`Ocena ${plugin.rating.toFixed(1)}`}>⭐ {plugin.rating.toFixed(1)}</span>
        <span aria-label={`${plugin.downloads} pobrań`}>📥 {plugin.downloads.toLocaleString('pl-PL')}</span>
      </div>

      {plugin.tags.length > 0 && (
        <div className="ph-card-tags">
          {plugin.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="ph-tag">{tag}</span>
          ))}
        </div>
      )}

      <button
        type="button"
        className="ph-btn ph-btn-primary"
        disabled={installState.stage === 'installing' && installState.pluginId === plugin.id}
        onClick={() => handleInstall(plugin.id)}
      >
        {installState.stage === 'installing' && installState.pluginId === plugin.id
          ? 'Instalowanie…'
          : 'Zainstaluj'}
      </button>
    </div>
  );

  const renderExploreTab = () => (
    <>
      <div className="ph-search-bar">
        <label htmlFor="ph-search" className="sr-only">Szukaj wtyczek</label>
        <input
          id="ph-search"
          type="search"
          placeholder="Szukaj wtyczek…"
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          aria-label="Szukaj wtyczek"
        />
        {isPending && <span className="ph-spinner" aria-label="Wyszukiwanie…" />}
      </div>

      <div className="ph-explore-tabs" role="tablist" aria-label="Kategorie marketplace">
        <button
          type="button"
          role="tab"
          aria-selected={exploreView === 'featured'}
          className={`ph-sub-tab ${exploreView === 'featured' ? 'active' : ''}`}
          onClick={() => setExploreView('featured')}
        >
          Polecane
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={exploreView === 'trending'}
          className={`ph-sub-tab ${exploreView === 'trending' ? 'active' : ''}`}
          onClick={() => setExploreView('trending')}
        >
          Popularne
        </button>
        {exploreView === 'search' && (
          <button type="button" role="tab" aria-selected className="ph-sub-tab active">
            Wyniki ({searchResults.length})
          </button>
        )}
      </div>

      {loadingExplore ? (
        <p className="ph-empty">Ładowanie marketplace…</p>
      ) : (
        <div className="ph-card-grid">
          {exploreView === 'featured' && featured.map(renderExploreCard)}
          {exploreView === 'trending' && trending.map(renderExploreCard)}
          {exploreView === 'search' && searchResults.map(renderExploreCard)}
        </div>
      )}
    </>
  );

  const renderUpdatesTab = () => {
    if (loadingInstalled) {
      return <p className="ph-empty">Sprawdzanie aktualizacji…</p>;
    }
    if (updatable.length === 0) {
      return <p className="ph-empty">Wszystkie wtyczki są aktualne ✅</p>;
    }

    return (
      <>
        <div className="ph-updates-header">
          <span>{updatable.length} {updatable.length === 1 ? 'aktualizacja' : 'aktualizacji'} dostępnych</span>
          <button type="button" className="ph-btn ph-btn-primary" onClick={handleUpdateAll}>
            Aktualizuj wszystko
          </button>
        </div>

        <ul className="ph-plugin-list" role="list">
          {updatable.map((plugin) => (
            <li key={plugin.id} className="ph-plugin-row" role="listitem">
              {plugin.icon && (
                <img src={plugin.icon} alt="" className="ph-icon-sm" aria-hidden="true" />
              )}
              <div className="ph-plugin-info">
                <strong>{plugin.name}</strong>
                <span className="ph-meta">
                  {plugin.author} · v{plugin.version}
                </span>
              </div>
              <button
                type="button"
                className="ph-btn ph-btn-sm ph-btn-primary"
                onClick={() => handleUpdate(plugin.id)}
              >
                Aktualizuj
              </button>
            </li>
          ))}
        </ul>
      </>
    );
  };

  // ── Main Render ──────────────────────────────────────────────

  return (
    <div className="plugin-hub floating-panel" role="dialog" aria-label="Centrum wtyczek">
      <div className="ph-header">
        <h2>🔌 Centrum Wtyczek</h2>
        <button type="button" className="ph-btn-close" onClick={onClose} aria-label="Zamknij">
          ×
        </button>
      </div>

      {renderInstallBanner()}

      <nav className="ph-tabs" role="tablist" aria-label="Nawigacja centrum wtyczek">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'installed'}
          className={`ph-tab ${activeTab === 'installed' ? 'active' : ''}`}
          onClick={() => setActiveTab('installed')}
        >
          Zainstalowane
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'explore'}
          className={`ph-tab ${activeTab === 'explore' ? 'active' : ''}`}
          onClick={() => setActiveTab('explore')}
        >
          Odkryj
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'updates'}
          className={`ph-tab ${activeTab === 'updates' ? 'active' : ''}`}
          onClick={() => setActiveTab('updates')}
        >
          Aktualizacje
          {updatable.length > 0 && (
            <span className="ph-badge">{updatable.length}</span>
          )}
        </button>
      </nav>

      <div className="ph-content" role="tabpanel">
        {activeTab === 'installed' && renderInstalledTab()}
        {activeTab === 'explore' && renderExploreTab()}
        {activeTab === 'updates' && renderUpdatesTab()}
      </div>
    </div>
  );
}