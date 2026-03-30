/**
 * Plugin Loader - Handles loading plugin code
 */

import { BasePlugin } from './plugin-api';

export interface LoaderOptions {
  sandboxed?: boolean;
}

export class PluginLoader {
  /**
   * Load plugin from source (file path or URL)
   */
  async load(source: string, options: LoaderOptions = {}): Promise<any> {
    try {
      // Determine source type
      if (source.startsWith('http://') || source.startsWith('https://')) {
        return await this.loadFromURL(source, options);
      } else {
        return await this.loadFromFile(source, options);
      }
    } catch (error) {
      console.error(`Failed to load plugin from ${source}:`, error);
      throw error;
    }
  }

  /**
   * Load from URL
   */
  private async loadFromURL(url: string, options: LoaderOptions): Promise<any> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const code = await response.text();
      return this.executeCode(code, options);
    } catch (error) {
      throw new Error(`Failed to load from URL ${url}: ${error}`);
    }
  }

  /**
   * Load from file system
   */
  private async loadFromFile(filePath: string, options: LoaderOptions): Promise<any> {
    try {
      // Use dynamic import for .ts/.js files
      if (filePath.endsWith('.ts') || filePath.endsWith('.js')) {
        const module = await import(filePath);
        return module;
      }

      throw new Error(`Unsupported file type: ${filePath}`);
    } catch (error) {
      throw new Error(`Failed to load from file ${filePath}: ${error}`);
    }
  }

  /**
   * Execute code in sandboxed context
   */
  private executeCode(code: string, _options: LoaderOptions): any {
    return this.executeSandboxed(code);
  }

  /**
   * Execute code in sandboxed environment using new Function with limited scope
   */
  private executeSandboxed(code: string): any {
    try {
      // Create a new Function with limited scope
      const fn = new Function(
        'BasePlugin',
        `
        "use strict";
        ${code}
        return { default: exports.default || null };
      `
      );

      const result = fn(BasePlugin);
      return result;
    } catch (error) {
      throw new Error(`Sandboxed execution failed: ${error}`);
    }
  }
}