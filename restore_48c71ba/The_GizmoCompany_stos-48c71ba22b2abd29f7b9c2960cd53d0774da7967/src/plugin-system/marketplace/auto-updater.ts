/**
 * Auto-Updater - Automatically checks and updates plugins
 */

import { EventEmitter } from 'events';
import { MarketplaceService } from './marketplace-service';
import { PluginManager } from '../core/plugin-manager';

export interface UpdateInfo {
  pluginId: string;
  currentVersion: string;
  newVersion: string;
  changelog?: string;
}

export class PluginAutoUpdater extends EventEmitter {
  private marketplaceService: MarketplaceService;
  private pluginManager: PluginManager;
  private checkInterval: ReturnType<typeof setInterval> | null = null;
  private updates: Map<string, UpdateInfo> = new Map();

  constructor(marketplaceService: MarketplaceService, pluginManager: PluginManager) {
    super();
    this.marketplaceService = marketplaceService;
    this.pluginManager = pluginManager;
  }

  /**
   * Start auto-update checks
   */
  startAutoCheck(intervalMs: number = 3600000): void {
    // Check every hour by default
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    this.checkForUpdates();

    this.checkInterval = setInterval(() => {
      this.checkForUpdates();
    }, intervalMs);

    console.log('✅ Auto-update checker started');
  }

  /**
   * Stop auto-update checks
   */
  stopAutoCheck(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      console.log('🛑 Auto-update checker stopped');
    }
  }

  /**
   * Check for updates
   */
  async checkForUpdates(): Promise<UpdateInfo[]> {
    try {
      const plugins = this.pluginManager.getPlugins();
      const updates: UpdateInfo[] = [];

      for (const [pluginId, plugin] of plugins) {
        const metadata = this.pluginManager.getPluginMetadata(pluginId);
        if (!metadata) continue;

        const latestVersion = await this.marketplaceService.checkUpdates(
          pluginId,
          metadata.version
        );

        if (latestVersion && this.isNewerVersion(latestVersion, metadata.version)) {
          const update: UpdateInfo = {
            pluginId,
            currentVersion: metadata.version,
            newVersion: latestVersion,
          };

          updates.push(update);
          this.updates.set(pluginId, update);

          this.emit('update-available', update);
        }
      }

      console.log(`✅ Checked ${plugins.size} plugins, ${updates.length} updates available`);
      return updates;
    } catch (error) {
      console.error('Failed to check for updates:', error);
      return [];
    }
  }

  /**
   * Apply update
   */
  async applyUpdate(pluginId: string): Promise<void> {
    try {
      const updateInfo = this.updates.get(pluginId);
      if (!updateInfo) {
        throw new Error('No update available for this plugin');
      }

      console.log(`📥 Updating ${pluginId} to ${updateInfo.newVersion}...`);

      // Download new version
      const pluginBlob = await this.marketplaceService.downloadPlugin(
        pluginId,
        updateInfo.newVersion
      );

      // Save to temporary location
      const tempPath = await this.saveBlobToTemp(pluginBlob);

      // Unload old version
      await this.pluginManager.unloadPlugin(pluginId);

      // Load new version
      await this.pluginManager.loadPlugin(tempPath, { autoEnable: true });

      // Remove from updates
      this.updates.delete(pluginId);

      console.log(`✅ Updated ${pluginId} to ${updateInfo.newVersion}`);
      this.emit('update-completed', { pluginId, version: updateInfo.newVersion });
    } catch (error) {
      console.error(`Failed to update plugin ${pluginId}:`, error);
      this.emit('update-failed', { pluginId, error });
      throw error;
    }
  }

  /**
   * Get available updates
   */
  getAvailableUpdates(): UpdateInfo[] {
    return Array.from(this.updates.values());
  }

  /**
   * Check if version is newer
   */
  private isNewerVersion(newVersion: string, currentVersion: string): boolean {
    const [newMajor, newMinor, newPatch] = newVersion.split('.').map(Number);
    const [curMajor, curMinor, curPatch] = currentVersion.split('.').map(Number);

    if (newMajor > curMajor) return true;
    if (newMajor === curMajor && newMinor > curMinor) return true;
    if (newMajor === curMajor && newMinor === curMinor && newPatch > curPatch) return true;

    return false;
  }

  /**
   * Save blob to temporary location
   */
  private async saveBlobToTemp(blob: Blob): Promise<string> {
    // Implementation depends on platform
    // For now, return a mock path
    return `/tmp/plugin-${Date.now()}.zip`;
  }
}