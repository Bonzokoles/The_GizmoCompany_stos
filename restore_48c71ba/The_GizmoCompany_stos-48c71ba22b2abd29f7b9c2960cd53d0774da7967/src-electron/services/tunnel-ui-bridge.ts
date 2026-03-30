/**
 * Tunnel UI Bridge - Expose tunnel controls to React
 */

import { ipcMain } from 'electron';
import { CloudflareTunnelManager, TunnelConfig } from './cloudflare-tunnel';

export class TunnelUIBridge {
  private tunnelManager: CloudflareTunnelManager | null = null;

  constructor() {
    this.setupIPCHandlers();
  }

  /**
   * Initialize tunnel
   */
  async initialize(config: TunnelConfig): Promise<boolean> {
    try {
      this.tunnelManager = new CloudflareTunnelManager(config);
      return await this.tunnelManager.start();
    } catch (error) {
      console.error('Failed to initialize tunnel:', error);
      return false;
    }
  }

  /**
   * Setup IPC handlers for React components
   */
  private setupIPCHandlers() {
    ipcMain.handle('tunnel:initialize', async (_, config: TunnelConfig) => {
      return this.initialize(config);
    });

    ipcMain.handle('tunnel:start', async () => {
      if (!this.tunnelManager) return false;
      return await this.tunnelManager.start();
    });

    ipcMain.handle('tunnel:stop', async () => {
      if (!this.tunnelManager) return;
      await this.tunnelManager.stop();
    });

    ipcMain.handle('tunnel:status', async () => {
      if (!this.tunnelManager) return null;
      return this.tunnelManager.getStatus();
    });

    ipcMain.handle('tunnel:metrics', async () => {
      if (!this.tunnelManager) return null;
      return this.tunnelManager.getMetrics();
    });

    ipcMain.handle('tunnel:reconnect', async () => {
      if (!this.tunnelManager) return false;
      return await this.tunnelManager.reconnect();
    });

    ipcMain.handle('tunnel:host-status', async (_, hostname: string) => {
      if (!this.tunnelManager) return null;
      return this.tunnelManager.getHostStatus(hostname);
    });
  }

  /**
   * Get tunnel manager instance
   */
  getTunnelManager(): CloudflareTunnelManager | null {
    return this.tunnelManager;
  }
}

export const tunnelBridge = new TunnelUIBridge();