/**
 * Plugin Manager - Manage installed plugins
 */

import React, { useState, useEffect } from 'react';
import './PluginManager.css';

interface InstalledPlugin {
  id: string;
  name: string;
  version: string;
  author: string;
  icon?: string;
  enabled: boolean;
  hasUpdate?: boolean;
}

interface PluginManagerProps {
  onClose: () => void;
}

export const PluginManager: React.FC<PluginManagerProps> = ({ onClose }) => {
  const [plugins, setPlugins] = useState<InstalledPlugin[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmModal, setConfirmModal] = useState<{ pluginId: string; pluginName: string } | null>(null);

  const electronAPI = window.electronAPI;

  useEffect(() => {
    loadPlugins();
  }, []);

  const loadPlugins = async () => {
    try {
      const loadedPlugins = await electronAPI.plugin?.getInstalled?.();
      setPlugins(loadedPlugins || []);
    } catch (error) {
      console.error('Failed to load plugins:', error);
    } finally {
      setLoading(false);
    }
  };

  const togglePlugin = async (pluginId: string, enabled: boolean) => {
    try {
      if (enabled) {
        await electronAPI.plugin?.disable?.(pluginId);
      } else {
        await electronAPI.plugin?.enable?.(pluginId);
      }

      setPlugins(
        plugins.map((p) =>
          p.id === pluginId ? { ...p, enabled: !p.enabled } : p
        )
      );
    } catch (error) {
      console.error('Failed to toggle plugin:', error);
    }
  };

  const uninstallPlugin = async (pluginId: string) => {
    const plugin = plugins.find((p) => p.id === pluginId);
    if (!plugin) return;

    setConfirmModal({ pluginId, pluginName: plugin.name });
  };

  const confirmUninstall = async () => {
    if (!confirmModal) return;

    try {
      await electronAPI.plugin?.uninstall?.(confirmModal.pluginId);
      setPlugins(plugins.filter((p) => p.id !== confirmModal.pluginId));
    } catch (error) {
      console.error('Failed to uninstall plugin:', error);
    } finally {
      setConfirmModal(null);
    }
  };

  const updatePlugin = async (pluginId: string) => {
    try {
      await electronAPI.plugin?.update?.(pluginId);
      await loadPlugins();
    } catch (error) {
      console.error('Failed to update plugin:', error);
    }
  };

  return (
    <div className="plugin-manager floating-panel">
      <div className="panel-header">
        <h2>🔌 Plugin Manager</h2>
        <button className="btn-close" onClick={onClose}>
          ×
        </button>
      </div>

      <div className="panel-content">
        {loading ? (
          <p>Loading plugins...</p>
        ) : plugins.length === 0 ? (
          <p className="no-plugins">No plugins installed yet</p>
        ) : (
          <div className="plugins-list">
            {plugins.map((plugin) => (
              <div key={plugin.id} className="plugin-item">
                {plugin.icon && (
                  <img src={plugin.icon} alt={plugin.name} className="plugin-icon-small" />
                )}

                <div className="plugin-details">
                  <h4>{plugin.name}</h4>
                  <p className="author">{plugin.author}</p>
                  <p className="version">v{plugin.version}</p>
                </div>

                <div className="plugin-actions">
                  {plugin.hasUpdate && (
                    <button
                      className="btn-small btn-update"
                      onClick={() => updatePlugin(plugin.id)}
                    >
                      Update
                    </button>
                  )}

                  <button
                    className={`btn-small ${plugin.enabled ? 'btn-disable' : 'btn-enable'}`}
                    onClick={() => togglePlugin(plugin.id, plugin.enabled)}
                  >
                    {plugin.enabled ? 'Disable' : 'Enable'}
                  </button>

                  <button
                    className="btn-small btn-uninstall"
                    onClick={() => uninstallPlugin(plugin.id)}
                  >
                    Uninstall
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {confirmModal && (
        <div className="modal-overlay" onClick={() => setConfirmModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Confirm Uninstall</h3>
            <p>
              Are you sure you want to uninstall <strong>{confirmModal.pluginName}</strong>?
            </p>
            <div className="modal-actions">
              <button className="btn-small" onClick={() => setConfirmModal(null)}>
                Cancel
              </button>
              <button className="btn-small btn-uninstall" onClick={confirmUninstall}>
                Uninstall
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};