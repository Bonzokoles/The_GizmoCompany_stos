/**
 * Plugin Manager - Central plugin orchestration
 */

import { EventEmitter } from 'events';
import { BasePlugin, PluginMetadata, PluginContext } from './plugin-api';
import { PluginLoader } from './plugin-loader';
import { PluginRegistry } from './plugin-registry';

export interface PluginLoadOptions {
  sandboxed?: boolean;
  autoEnable?: boolean;
}

export class PluginManager extends EventEmitter {
  private plugins: Map<string, BasePlugin> = new Map();
  private loader: PluginLoader;
  private registry: PluginRegistry;
  private enabledPlugins: Set<string> = new Set();

  constructor() {
    super();
    this.loader = new PluginLoader();
    this.registry = new PluginRegistry();
  }

  /**
   * Load plugin from file or URL
   */
  async loadPlugin(
    source: string,
    options: PluginLoadOptions = {}
  ): Promise<BasePlugin> {
    try {
      console.log(`📦 Loading plugin from ${source}...`);

      // Load plugin code
      const pluginCode = await this.loader.load(source, {
        sandboxed: options.sandboxed ?? true,
      });

      // Create plugin instance
      const plugin = pluginCode.default ?? pluginCode;

      if (!plugin || !('getMetadata' in plugin)) {
        throw new Error('Invalid plugin: missing getMetadata method');
      }

      const metadata = plugin.getMetadata();

      // Validate plugin
      await this.validatePlugin(metadata);

      // Register plugin
      this.registry.register(metadata);
      this.plugins.set(metadata.id, plugin);

      // Create context
      const context = this.createContext(metadata);
      plugin.setContext(context);

      // Call lifecycle hooks
      await plugin.onLoad?.(context);

      // Auto-enable if requested
      if (options.autoEnable) {
        await this.enablePlugin(metadata.id);
      }

      console.log(`✅ Plugin loaded: ${metadata.name} v${metadata.version}`);
      this.emit('plugin-loaded', metadata);

      return plugin;
    } catch (error) {
      console.error(`❌ Failed to load plugin: ${error}`);
      this.emit('plugin-error', { source, error });
      throw error;
    }
  }

  /**
   * Unload plugin
   */
  async unloadPlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin not found: ${pluginId}`);
    }

    try {
      // Disable if enabled
      if (this.enabledPlugins.has(pluginId)) {
        await this.disablePlugin(pluginId);
      }

      // Call unload hook
      await plugin.onUnload?.();

      // Cleanup
      this.plugins.delete(pluginId);
      this.registry.unregister(pluginId);

      console.log(`✅ Plugin unloaded: ${pluginId}`);
      this.emit('plugin-unloaded', pluginId);
    } catch (error) {
      console.error(`❌ Failed to unload plugin: ${error}`);
      throw error;
    }
  }

  /**
   * Enable plugin
   */
  async enablePlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin not found: ${pluginId}`);
    }

    if (this.enabledPlugins.has(pluginId)) {
      return; // Already enabled
    }

    try {
      await plugin.onEnable?.();
      this.enabledPlugins.add(pluginId);

      console.log(`✅ Plugin enabled: ${pluginId}`);
      this.emit('plugin-enabled', pluginId);
    } catch (error) {
      console.error(`❌ Failed to enable plugin: ${error}`);
      throw error;
    }
  }

  /**
   * Disable plugin
   */
  async disablePlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin not found: ${pluginId}`);
    }

    if (!this.enabledPlugins.has(pluginId)) {
      return; // Already disabled
    }

    try {
      await plugin.onDisable?.();
      this.enabledPlugins.delete(pluginId);

      console.log(`✅ Plugin disabled: ${pluginId}`);
      this.emit('plugin-disabled', pluginId);
    } catch (error) {
      console.error(`❌ Failed to disable plugin: ${error}`);
      throw error;
    }
  }

  /**
   * Get all loaded plugins
   */
  getPlugins(): Map<string, BasePlugin> {
    return new Map(this.plugins);
  }

  /**
   * Get plugin by ID
   */
  getPlugin(pluginId: string): BasePlugin | undefined {
    return this.plugins.get(pluginId);
  }

  /**
   * Get plugin metadata
   */
  getPluginMetadata(pluginId: string): PluginMetadata | undefined {
    return this.registry.getMetadata(pluginId);
  }

  /**
   * Check if plugin is enabled
   */
  isPluginEnabled(pluginId: string): boolean {
    return this.enabledPlugins.has(pluginId);
  }

  /**
   * Get enabled plugins
   */
  getEnabledPlugins(): BasePlugin[] {
    return Array.from(this.enabledPlugins).map(id => this.plugins.get(id)!);
  }

  /**
   * Validate plugin metadata
   */
  private async validatePlugin(metadata: PluginMetadata): Promise<void> {
    if (!metadata.id || !metadata.name || !metadata.version) {
      throw new Error('Invalid plugin metadata: missing required fields');
    }

    if (this.plugins.has(metadata.id)) {
      throw new Error(`Plugin already loaded: ${metadata.id}`);
    }

    // Validate version format
    if (!/^\d+\.\d+\.\d+/.test(metadata.version)) {
      throw new Error(`Invalid version format: ${metadata.version}`);
    }
  }

  /**
   * Create plugin context
   */
  private createContext(metadata: PluginMetadata): PluginContext {
    return {
      api: {
        // Implement API methods here
        createPanel: async () => ({ show: () => {}, hide: () => {}, close: () => {}, setContent: () => {} }),
        registerCommand: () => {},
        registerShortcut: () => {},
        getCurrentTab: async () => null,
        getTabs: async () => [],
        navigateTo: async () => {},
        executeScript: async () => {},
        callAI: async () => '',
        getAIProviders: async () => [],
        on: () => {},
        off: () => {},
        emit: () => {},
        getStorage: () => ({
          get: async () => {},
          set: async () => {},
          remove: async () => {},
          clear: async () => {},
          keys: async () => [],
        }),
        fetch: async (url) => fetch(url),
        showNotification: () => {},
        showDialog: async () => 0,
      },
      config: {},
      storage: {
        get: async () => {},
        set: async () => {},
        remove: async () => {},
        clear: async () => {},
        keys: async () => [],
      },
      logger: {
        log: console.log,
        debug: console.debug,
        info: console.info,
        warn: console.warn,
        error: console.error,
      },
    };
  }
}

export const pluginManager = new PluginManager();