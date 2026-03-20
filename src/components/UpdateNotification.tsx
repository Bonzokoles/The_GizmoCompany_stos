/**
 * Update Notification Component
 * Shows update availability and progress — React 19
 */

import { useState, useEffect, useCallback } from 'react';
import type { ElectronAPI } from '../types/electron';
import './UpdateNotification.css';

interface UpdateNotificationProps {
  onDismiss: () => void;
}

export function UpdateNotification({ onDismiss }: UpdateNotificationProps) {
  const [updateInfo, setUpdateInfo] = useState<{ isUpdateAvailable: boolean; version?: string } | null>(null);
  const [progress, setProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isReady, setIsReady] = useState(false);

  const { electronAPI } = window;

  const checkForUpdates = useCallback(async () => {
    try {
      const result = await electronAPI.updater?.checkForUpdates();
      if (result?.isUpdateAvailable) {
        setUpdateInfo(result);
      }
    } catch (error) {
      console.error('Failed to check for updates:', error);
    }
  }, [electronAPI]);

  useEffect(() => {
    checkForUpdates();

    const unsubscribe = electronAPI.on?.('update-progress', (progressData: unknown) => {
      const data = progressData as { percent: number };
      setProgress(Math.round(data.percent));
      setIsDownloading(true);
    });

    const unsubReady = electronAPI.on?.('update-ready', () => {
      setIsReady(true);
      setIsDownloading(false);
    });

    return () => {
      unsubscribe?.();
      unsubReady?.();
    };
  }, [electronAPI, checkForUpdates]);

  const handleInstall = useCallback(async () => {
    try {
      await electronAPI.updater?.installUpdate();
    } catch (error) {
      console.error('Failed to install update:', error);
    }
  }, [electronAPI]);

  if (!updateInfo?.isUpdateAvailable) {
    return null;
  }

  return (
    <div className="update-notification" role="status" aria-live="polite">
      <div className="notification-content">
        <h3>Dostępna aktualizacja</h3>
        <p>THE_Zenon_browser {updateInfo.version} jest dostępny</p>

        {isDownloading && (
          <div className="progress-bar" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
            <div className="progress-fill" style={{ width: `${progress}%` }} />
            <span className="progress-text">{progress}%</span>
          </div>
        )}

        {isReady && (
          <p className="ready-message">✅ Aktualizacja gotowa do instalacji</p>
        )}

        <div className="notification-actions">
          <button className="btn-dismiss" onClick={onDismiss}>
            Odrzuć
          </button>
          <button
            className="btn-install"
            onClick={handleInstall}
            disabled={!isReady && !isDownloading}
          >
            {isReady ? 'Zainstaluj i uruchom ponownie' : isDownloading ? 'Pobieranie...' : 'Pobierz'}
          </button>
        </div>
      </div>
    </div>
  );
}