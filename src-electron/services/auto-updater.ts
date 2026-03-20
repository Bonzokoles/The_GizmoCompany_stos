/**
 * Auto-Updater Service
 * Handles checking for and installing updates
 */

import { app, dialog, ipcMain } from 'electron';
import { autoUpdater } from 'electron-updater';
import path from 'path';

export interface UpdateInfo {
  version: string;
  releaseDate: string;
  releaseNotes: string[];
  isUpdateAvailable: boolean;
}

export class AutoUpdaterService {
  private isCheckingForUpdate = false;
  private updateCheckInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.configureAutoUpdater();
    this.setupIPC();
  }

  private configureAutoUpdater() {
    autoUpdater.logger = require('electron-log');
    autoUpdater.checkForUpdatesAndNotify();

    autoUpdater.on('checking-for-update', () => {
      console.log('🔄 Checking for updates...');
    });

    autoUpdater.on('update-available', (info) => {
      console.log(`✅ Update available: ${info.version}`);
      this.notifyUpdateAvailable(info);
    });

    autoUpdater.on('update-not-available', () => {
      console.log('✅ You are up to date');
    });

    autoUpdater.on('error', (error) => {
      console.error('❌ Update error:', error);
    });

    autoUpdater.on('download-progress', (progress) => {
      console.log(`📥 Download progress: ${progress.percent}%`);
      ipcMain.emit('update-progress', progress);
    });

    autoUpdater.on('update-downloaded', () => {
      console.log('✅ Update downloaded, will install on quit');
      this.notifyUpdateReady();
    });
  }

  private setupIPC() {
    ipcMain.handle('updater:check-for-updates', async () => {
      try {
        const result = await autoUpdater.checkForUpdates();
        if (!result) return { isUpdateAvailable: false };
        return {
          isUpdateAvailable: result.updateInfo.version !== app.getVersion(),
          version: result.updateInfo.version,
          releaseDate: result.updateInfo.releaseDate,
        };
      } catch (error: any) {
        console.error('Failed to check for updates:', error);
        return { isUpdateAvailable: false, error: error.message };
      }
    });

    ipcMain.handle('updater:install-update', async () => {
      autoUpdater.quitAndInstall();
    });

    ipcMain.handle('updater:get-current-version', async () => {
      return app.getVersion();
    });
  }

  private notifyUpdateAvailable(info: any) {
    dialog
      .showMessageBox({
        type: 'info',
        title: 'Update Available',
        message: `THE_Zenon_browser ${info.version} is available`,
        detail: 'Downloading update in background...',
        buttons: ['Later', 'Install Now'],
      })
      .then((result) => {
        if (result.response === 1) {
          autoUpdater.downloadUpdate();
        }
      });
  }

  private notifyUpdateReady() {
    dialog
      .showMessageBox({
        type: 'info',
        title: 'Update Ready',
        message: 'Update is ready to install',
        detail: 'Application will restart to apply update',
        buttons: ['Later', 'Install & Restart'],
      })
      .then((result) => {
        if (result.response === 1) {
          autoUpdater.quitAndInstall();
        }
      });
  }

  /**
   * Start automatic update checks
   */
  startAutoChecks(intervalHours: number = 1): void {
    if (this.updateCheckInterval) {
      clearInterval(this.updateCheckInterval);
    }

    console.log(`🔄 Starting auto-update checks every ${intervalHours}h`);

    // Check immediately
    autoUpdater.checkForUpdates();

    // Then check periodically
    this.updateCheckInterval = setInterval(() => {
      autoUpdater.checkForUpdates();
    }, intervalHours * 60 * 60 * 1000);
  }

  /**
   * Stop automatic update checks
   */
  stopAutoChecks(): void {
    if (this.updateCheckInterval) {
      clearInterval(this.updateCheckInterval);
      this.updateCheckInterval = null;
      console.log('🛑 Auto-update checks stopped');
    }
  }

  /**
   * Manual check for updates
   */
  async checkForUpdates(): Promise<UpdateInfo> {
    try {
      if (this.isCheckingForUpdate) {
        return { version: '', releaseDate: '', releaseNotes: [], isUpdateAvailable: false };
      }

      this.isCheckingForUpdate = true;

      const result = await autoUpdater.checkForUpdates();
      if (!result) return { version: '', releaseDate: '', releaseNotes: [], isUpdateAvailable: false };

      return {
        version: result.updateInfo.version,
        releaseDate: result.updateInfo.releaseDate || new Date().toISOString(),
        releaseNotes: this.parseReleaseNotes(result.updateInfo.releaseNotes),
        isUpdateAvailable: result.updateInfo.version !== app.getVersion(),
      };
    } catch (error) {
      console.error('Error checking for updates:', error);
      throw error;
    } finally {
      this.isCheckingForUpdate = false;
    }
  }

  private parseReleaseNotes(notes: any): string[] {
    if (!notes) return [];
    if (Array.isArray(notes)) return notes;
    if (typeof notes === 'string') return notes.split('\n');
    return [];
  }
}

export const autoUpdaterService = new AutoUpdaterService();