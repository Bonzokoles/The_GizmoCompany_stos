/**
 * Plugin Explorer - Discover and browse plugins
 */

import React, { useState, useEffect } from 'react';
import { marketplaceService, MarketplacePlugin } from '../../plugin-system/marketplace/marketplace-service';
import './PluginExplorer.css';

interface PluginExplorerProps {
  onClose: () => void;
  onInstall?: (plugin: MarketplacePlugin) => void;
}

export const PluginExplorer: React.FC<PluginExplorerProps> = ({ onClose, onInstall }) => {
  const [plugins, setPlugins] = useState<MarketplacePlugin[]>([]);
  const [featured, setFeatured] = useState<MarketplacePlugin[]>([]);
  const [trending, setTrending] = useState<MarketplacePlugin[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'featured' | 'trending' | 'search'>('featured');

  useEffect(() => {
    loadPlugins();
  }, []);

  const loadPlugins = async () => {
    setLoading(true);
    try {
      const [featuredData, trendingData] = await Promise.all([
        marketplaceService.getFeatured(),
        marketplaceService.getTrending(),
      ]);

      setFeatured(featuredData);
      setTrending(trendingData);
    } catch (error) {
      console.error('Failed to load plugins:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setLoading(true);
    try {
      const results = await marketplaceService.search(searchQuery);
      setPlugins(results);
      setActiveTab('search');
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderPluginCard = (plugin: MarketplacePlugin) => (
    <div key={plugin.id} className="plugin-card">
      {plugin.icon && <img src={plugin.icon} alt={plugin.name} className="plugin-icon" />}
      <h3>{plugin.name}</h3>
      <p className="author">by {plugin.author}</p>
      <p className="description">{plugin.description}</p>

      <div className="plugin-meta">
        <span className="rating">⭐ {plugin.rating.toFixed(1)}</span>
        <span className="downloads">📥 {plugin.downloads}</span>
      </div>

      <div className="plugin-tags">
        {plugin.tags.slice(0, 3).map((tag) => (
          <span key={tag} className="tag">
            {tag}
          </span>
        ))}
      </div>

      <button className="btn-install" onClick={() => onInstall?.(plugin)}>
        Install
      </button>
    </div>
  );

  return (
    <div className="plugin-explorer floating-panel">
      <div className="panel-header">
        <h2>🔌 Plugin Explorer</h2>
        <button className="btn-close" onClick={onClose}>
          ×
        </button>
      </div>

      <div className="panel-content">
        {/* Search Bar */}
        <form className="search-bar" onSubmit={handleSearch}>
          <input
            type="text"
            placeholder="Search plugins..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Searching...' : 'Search'}
          </button>
        </form>

        {/* Tabs */}
        <div className="tabs">
          <button
            className={`tab ${activeTab === 'featured' ? 'active' : ''}`}
            onClick={() => setActiveTab('featured')}
          >
            Featured
          </button>
          <button
            className={`tab ${activeTab === 'trending' ? 'active' : ''}`}
            onClick={() => setActiveTab('trending')}
          >
            Trending
          </button>
          {activeTab === 'search' && (
            <button className="tab active">Search Results ({plugins.length})</button>
          )}
        </div>

        {/* Plugin Grid */}
        <div className="plugins-grid">
          {activeTab === 'featured' &&
            featured.map((plugin) => renderPluginCard(plugin))}
          {activeTab === 'trending' && trending.map((plugin) => renderPluginCard(plugin))}
          {activeTab === 'search' && plugins.map((plugin) => renderPluginCard(plugin))}
        </div>

        {loading && <p className="loading">Loading plugins...</p>}
      </div>
    </div>
  );
};