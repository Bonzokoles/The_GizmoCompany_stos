/**
 * Plugin Manager Tests
 */

import { PluginManager } from '@/plugin-system/core/plugin-manager';
import { BasePlugin, PluginMetadata, PluginContext } from '@/plugin-system/core/plugin-api';

// Mock the plugin-loader module so loadPlugin doesn't hit file system
jest.mock('@/plugin-system/core/plugin-loader', () => ({
  PluginLoader: jest.fn().mockImplementation(() => ({
    load: jest.fn(),
  })),
}));

// Concrete mock plugin
class MockPlugin extends BasePlugin {
  loadCalled = false;
  unloadCalled = false;
  enableCalled = false;
  disableCalled = false;

  getMetadata(): PluginMetadata {
    return {
      id: 'test-plugin',
      name: 'Test Plugin',
      version: '1.0.0',
      author: 'Test Author',
      description: 'A test plugin',
      capabilities: ['ui-panel'],
      permissions: [],
    };
  }

  async onLoad(): Promise<void> {
    this.loadCalled = true;
  }

  async onUnload(): Promise<void> {
    this.unloadCalled = true;
  }

  async onEnable(): Promise<void> {
    this.enableCalled = true;
  }

  async onDisable(): Promise<void> {
    this.disableCalled = true;
  }
}

describe('PluginManager', () => {
  let manager: PluginManager;
  let mockLoader: { load: jest.Mock };

  beforeEach(() => {
    manager = new PluginManager();
    mockLoader = (manager as any).loader;
  });

  describe('loadPlugin', () => {
    test('should load plugin and call onLoad', async () => {
      const plugin = new MockPlugin();
      mockLoader.load.mockResolvedValue({ default: plugin });

      const result = await manager.loadPlugin('test-source');

      expect(result).toBe(plugin);
      expect(plugin.loadCalled).toBe(true);
      expect(manager.getPlugin('test-plugin')).toBe(plugin);
    });

    test('should auto-enable when option is set', async () => {
      const plugin = new MockPlugin();
      mockLoader.load.mockResolvedValue({ default: plugin });

      await manager.loadPlugin('test-source', { autoEnable: true });

      expect(plugin.enableCalled).toBe(true);
      expect(manager.isPluginEnabled('test-plugin')).toBe(true);
    });

    test('should reject invalid metadata', async () => {
      const bad = { getMetadata: () => ({ id: '', name: '', version: '' }) };
      mockLoader.load.mockResolvedValue({ default: bad });

      await expect(manager.loadPlugin('bad')).rejects.toThrow('Invalid plugin metadata');
    });

    test('should reject duplicate plugin', async () => {
      const plugin = new MockPlugin();
      mockLoader.load.mockResolvedValue({ default: plugin });

      await manager.loadPlugin('source');
      await expect(manager.loadPlugin('source')).rejects.toThrow('Plugin already loaded');
    });
  });

  describe('enablePlugin', () => {
    test('should enable loaded plugin', async () => {
      const plugin = new MockPlugin();
      mockLoader.load.mockResolvedValue({ default: plugin });
      await manager.loadPlugin('source');

      await manager.enablePlugin('test-plugin');

      expect(plugin.enableCalled).toBe(true);
      expect(manager.isPluginEnabled('test-plugin')).toBe(true);
    });

    test('should be idempotent for already-enabled plugin', async () => {
      const plugin = new MockPlugin();
      mockLoader.load.mockResolvedValue({ default: plugin });
      await manager.loadPlugin('source', { autoEnable: true });

      await manager.enablePlugin('test-plugin');
      expect(manager.isPluginEnabled('test-plugin')).toBe(true);
    });

    test('should throw for unknown plugin', async () => {
      await expect(manager.enablePlugin('nope')).rejects.toThrow('Plugin not found');
    });
  });

  describe('disablePlugin', () => {
    test('should disable enabled plugin', async () => {
      const plugin = new MockPlugin();
      mockLoader.load.mockResolvedValue({ default: plugin });
      await manager.loadPlugin('source', { autoEnable: true });

      await manager.disablePlugin('test-plugin');

      expect(plugin.disableCalled).toBe(true);
      expect(manager.isPluginEnabled('test-plugin')).toBe(false);
    });

    test('should be idempotent for already-disabled plugin', async () => {
      const plugin = new MockPlugin();
      mockLoader.load.mockResolvedValue({ default: plugin });
      await manager.loadPlugin('source');

      await manager.disablePlugin('test-plugin');
      expect(manager.isPluginEnabled('test-plugin')).toBe(false);
    });

    test('should throw for unknown plugin', async () => {
      await expect(manager.disablePlugin('nope')).rejects.toThrow('Plugin not found');
    });
  });

  describe('unloadPlugin', () => {
    test('should unload plugin and call onUnload', async () => {
      const plugin = new MockPlugin();
      mockLoader.load.mockResolvedValue({ default: plugin });
      await manager.loadPlugin('source');

      await manager.unloadPlugin('test-plugin');

      expect(plugin.unloadCalled).toBe(true);
      expect(manager.getPlugin('test-plugin')).toBeUndefined();
    });

    test('should disable before unloading enabled plugin', async () => {
      const plugin = new MockPlugin();
      mockLoader.load.mockResolvedValue({ default: plugin });
      await manager.loadPlugin('source', { autoEnable: true });

      await manager.unloadPlugin('test-plugin');

      expect(plugin.disableCalled).toBe(true);
      expect(plugin.unloadCalled).toBe(true);
    });

    test('should throw for unknown plugin', async () => {
      await expect(manager.unloadPlugin('nope')).rejects.toThrow('Plugin not found');
    });
  });

  describe('queries', () => {
    test('getPlugin returns plugin by ID', async () => {
      const plugin = new MockPlugin();
      mockLoader.load.mockResolvedValue({ default: plugin });
      await manager.loadPlugin('source');

      expect(manager.getPlugin('test-plugin')).toBe(plugin);
      expect(manager.getPlugin('missing')).toBeUndefined();
    });

    test('getPlugins returns all loaded', async () => {
      const plugin = new MockPlugin();
      mockLoader.load.mockResolvedValue({ default: plugin });
      await manager.loadPlugin('source');

      expect(manager.getPlugins().size).toBe(1);
    });

    test('getPluginMetadata returns metadata', async () => {
      const plugin = new MockPlugin();
      mockLoader.load.mockResolvedValue({ default: plugin });
      await manager.loadPlugin('source');

      const meta = manager.getPluginMetadata('test-plugin');
      expect(meta?.id).toBe('test-plugin');
      expect(meta?.version).toBe('1.0.0');
    });

    test('getEnabledPlugins returns only enabled', async () => {
      const plugin = new MockPlugin();
      mockLoader.load.mockResolvedValue({ default: plugin });
      await manager.loadPlugin('source', { autoEnable: true });

      expect(manager.getEnabledPlugins()).toHaveLength(1);
    });
  });

  test('emits lifecycle events', async () => {
    const plugin = new MockPlugin();
    mockLoader.load.mockResolvedValue({ default: plugin });

    const loaded = jest.fn();
    const enabled = jest.fn();
    const disabled = jest.fn();
    const unloaded = jest.fn();

    manager.on('plugin-loaded', loaded);
    manager.on('plugin-enabled', enabled);
    manager.on('plugin-disabled', disabled);
    manager.on('plugin-unloaded', unloaded);

    await manager.loadPlugin('source');
    await manager.enablePlugin('test-plugin');
    await manager.disablePlugin('test-plugin');
    await manager.unloadPlugin('test-plugin');

    expect(loaded).toHaveBeenCalledTimes(1);
    expect(enabled).toHaveBeenCalledTimes(1);
    expect(disabled).toHaveBeenCalledTimes(1);
    expect(unloaded).toHaveBeenCalledTimes(1);
  });
});