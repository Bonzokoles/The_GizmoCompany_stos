/**
 * Plugin Installer - Handle plugin installation process
 */

import React, { useState } from 'react';
import { MarketplacePlugin } from '../../plugin-system/marketplace/marketplace-service';
import './PluginInstaller.css';

interface PluginInstallerProps {
  plugin: MarketplacePlugin;
  onComplete: () => void;
  onCancel: () => void;
}

export const PluginInstaller: React.FC<PluginInstallerProps> = ({
  plugin,
  onComplete,
  onCancel,
}) => {
  const [stage, setStage] = useState<'review' | 'installing' | 'complete' | 'error'>('review');
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const electronAPI = (window as any).electronAPI;

  const handleInstall = async () => {
    setStage('installing');
    try {
      // Simulate installation progress
      setProgress(0);
      for (let i = 0; i <= 100; i += 10) {
        await new Promise(resolve => setTimeout(resolve, 200));
        setProgress(i);
      }

      // Call Electron API to install plugin
      await electronAPI.plugin?.install?.(plugin.id);

      setStage('complete');
      setTimeout(onComplete, 2000);
    } catch (err: any) {
      setError(err.message);
      setStage('error');
    }
  };

  return (
    <div className="plugin-installer modal-overlay">
      <div className="modal-content">
        {/* Review Stage */}
        {stage === 'review' && (
          <>
            <div className="installer-header">
              <h2>Install Plugin</h2>
            </div>

            <div className="plugin-info">
              {plugin.icon && (
                <img src={plugin.icon} alt={plugin.name} className="plugin-icon-large" />
              )}

              <div className="info-text">
                <h3>{plugin.name}</h3>
                <p className="author">by {plugin.author}</p>
                <p className="description">{plugin.description}</p>
                <p className="version">Version {plugin.version}</p>
              </div>
            </div>

            <div className="permissions">
              <h4>Permissions Required:</h4>
              <ul>
                <li>Access to browser tabs</li>
                <li>Network access</li>
                <li>Local storage</li>
              </ul>
            </div>

            <div className="buttons">
              <button className="btn-cancel" onClick={onCancel}>
                Cancel
              </button>
              <button className="btn-install" onClick={handleInstall}>
                Install
              </button>
            </div>
          </>
        )}

        {/* Installing Stage */}
        {stage === 'installing' && (
          <>
            <div className="installer-header">
              <h2>Installing...</h2>
            </div>

            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>

            <p className="progress-text">{progress}% Complete</p>
          </>
        )}

        {/* Complete Stage */}
        {stage === 'complete' && (
          <>
            <div className="installer-header success">
              <h2>✅ Installation Complete</h2>
            </div>

            <p className="success-message">
              {plugin.name} has been successfully installed and is now active.
            </p>
          </>
        )}

        {/* Error Stage */}
        {stage === 'error' && (
          <>
            <div className="installer-header error">
              <h2>❌ Installation Failed</h2>
            </div>

            <p className="error-message">{error}</p>

            <div className="buttons">
              <button className="btn-cancel" onClick={onCancel}>
                Close
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};