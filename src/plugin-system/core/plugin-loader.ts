/**
 * Plugin Loader - Handles loading plugin code
 */

import * as vm from 'vm';
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
   * Execute code in sandboxed environment using vm.runInNewContext
   * CR-003: Replaced 'new Function()' with 'vm.runInNewContext()' for security
   */
  private executeSandboxed(code: string): any {
    try {
      // Create a sandboxed context with limited access
      const sandbox: {
        BasePlugin: typeof BasePlugin;
        exports: { default?: any };
        console: any;
      } = {
        BasePlugin,
        exports: {},
        console: {
          log: (...args: any[]) => console.log('[Plugin]', ...args),
          warn: (...args: any[]) => console.warn('[Plugin]', ...args),
          error: (...args: any[]) => console.error('[Plugin]', ...args),
        },
      };

      // Execute code in sandboxed context
      const wrappedCode = `
        "use strict";
        ${code}
        exports.default;
      `;

      const result = vm.runInNewContext(wrappedCode, sandbox, {
        timeout: 5000, // 5s timeout
        displayErrors: true,
      });

      return { default: result || sandbox.exports.default };
    } catch (error) {
      throw new Error(`Sandboxed execution failed: ${error}`);
    }
  }
}