/**
 * Plugin Registry - Tracks plugin metadata and state
 */

import { PluginMetadata } from './plugin-api';

export class PluginRegistry {
  private registry: Map<string, PluginMetadata> = new Map();

  /**
   * Register plugin
   */
  register(metadata: PluginMetadata): void {
    this.registry.set(metadata.id, metadata);
  }

  /**
   * Unregister plugin
   */
  unregister(pluginId: string): void {
    this.registry.delete(pluginId);
  }

  /**
   * Get plugin metadata
   */
  getMetadata(pluginId: string): PluginMetadata | undefined {
    return this.registry.get(pluginId);
  }

  /**
   * Get all metadata
   */
  getAllMetadata(): PluginMetadata[] {
    return Array.from(this.registry.values());
  }

  /**
   * Find plugins by capability
   */
  findByCapability(capability: string): PluginMetadata[] {
    return Array.from(this.registry.values()).filter((m) =>
      m.capabilities.includes(capability as any)
    );
  }

  /**
   * Check if plugin exists
   */
  exists(pluginId: string): boolean {
    return this.registry.has(pluginId);
  }

  /**
   * Clear registry
   */
  clear(): void {
    this.registry.clear();
  }
}