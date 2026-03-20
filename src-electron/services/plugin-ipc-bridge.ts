/**
 * Plugin IPC Bridge - Communication between React and Electron for plugin system
 */

import { ipcMain } from 'electron';
import { pluginManager } from '../../src/plugin-system/core/plugin-manager';
import { marketplaceService } from '../../src/plugin-system/marketplace/marketplace-service';
import { PluginAutoUpdater } from '../../src/plugin-system/marketplace/auto-updater';

let autoUpdater: PluginAutoUpdater;

export class PluginIPCBridge {
  private static readonly channels = [
    'plugin:load', 'plugin:unload', 'plugin:enable', 'plugin:disable',
    'plugin:get-installed', 'plugin:search-marketplace', 'plugin:get-featured',
    'plugin:get-trending', 'plugin:check-updates', 'plugin:apply-update',
    'plugin:start-auto-update',
  ];

  constructor() {
    // Remove any previously registered handlers (safe re-init)
    for (const ch of PluginIPCBridge.channels) {
      ipcMain.removeHandler(ch);
    }
    this.setupHandlers();
    autoUpdater = new PluginAutoUpdater(marketplaceService, pluginManager);
  }

  private setupHandlers() {
    // Load plugin
    ipcMain.handle('plugin:load', async (_, source: string) => {
      try {
        const plugin = await pluginManager.loadPlugin(source);
        return { success: true, pluginId: plugin.constructor.name };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    });

    // Unload plugin
    ipcMain.handle('plugin:unload', async (_, pluginId: string) => {
      try {
        await pluginManager.unloadPlugin(pluginId);
        return { success: true };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    });

    // Enable plugin
    ipcMain.handle('plugin:enable', async (_, pluginId: string) => {
      try {
        await pluginManager.enablePlugin(pluginId);
        return { success: true };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    });

    // Disable plugin
    ipcMain.handle('plugin:disable', async (_, pluginId: string) => {
      try {
        await pluginManager.disablePlugin(pluginId);
        return { success: true };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    });

    // Get installed plugins
    ipcMain.handle('plugin:get-installed', async () => {
      const plugins = pluginManager.getPlugins();
      return Array.from(plugins.values()).map((plugin) => {
        const metadata = pluginManager.getPluginMetadata(plugin.constructor.name);
        return {
          id: plugin.constructor.name,
          name: metadata?.name,
          version: metadata?.version,
          author: metadata?.author,
          enabled: pluginManager.isPluginEnabled(plugin.constructor.name),
        };
      });
    });

    // Search marketplace
    ipcMain.handle('plugin:search-marketplace', async (_, query: string) => {
      try {
        const results = await marketplaceService.search(query);
        return { success: true, plugins: results };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    });

    // Get featured plugins
    ipcMain.handle('plugin:get-featured', async () => {
      try {
        const plugins = await marketplaceService.getFeatured();
        return { success: true, plugins };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    });

    // Get trending plugins
    ipcMain.handle('plugin:get-trending', async () => {
      try {
        const plugins = await marketplaceService.getTrending();
        return { success: true, plugins };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    });

    // Check for updates
    ipcMain.handle('plugin:check-updates', async () => {
      try {
        const updates = await autoUpdater.checkForUpdates();
        return { success: true, updates };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    });

    // Apply update
    ipcMain.handle('plugin:apply-update', async (_, pluginId: string) => {
      try {
        await autoUpdater.applyUpdate(pluginId);
        return { success: true };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    });

    // Start auto-update
    ipcMain.handle('plugin:start-auto-update', async () => {
      autoUpdater.startAutoCheck();
      return { success: true };
    });
  }
}