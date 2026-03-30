/**
 * Plugin API - Core interface for all plugins
 * Standardized API that all plugins must implement
 */

export type PluginCapability =
  | 'ui-panel'
  | 'network-intercept'
  | 'tab-manager'
  | 'ai-integration'
  | 'theme'
  | 'storage'
  | 'shortcuts'
  | 'custom';

export interface PluginPermission {
  name: string;
  description: string;
  level: 'read' | 'write' | 'execute';
}

export interface PluginMetadata {
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  icon?: string;
  capabilities: PluginCapability[];
  permissions: PluginPermission[];
  repository?: string;
  license?: string;
  minimumBrowserVersion?: string;
  dependencies?: Record<string, string>;
}

export interface PluginContext {
  api: PluginAPI;
  config: Record<string, any>;
  storage: PluginStorage;
  logger: PluginLogger;
}

export interface PluginAPI {
  // UI Management
  createPanel(options: PanelOptions): Promise<PanelHandle>;
  registerCommand(command: CommandDefinition): void;
  registerShortcut(shortcut: ShortcutDefinition): void;

  // Browser API
  getCurrentTab(): Promise<BrowserTab | null>;
  getTabs(): Promise<BrowserTab[]>;
  navigateTo(tabId: string, url: string): Promise<void>;
  executeScript(code: string, tabId?: string): Promise<any>;

  // AI Integration
  callAI(request: AICallRequest): Promise<string>;
  getAIProviders(): Promise<string[]>;

  // Events
  on(event: string, callback: (...args: any[]) => void): void;
  off(event: string, callback: (...args: any[]) => void): void;
  emit(event: string, ...args: any[]): void;

  // Storage
  getStorage(): PluginStorage;

  // Network
  fetch(url: string, options?: RequestInit): Promise<Response>;

  // Utilities
  showNotification(message: string, type?: 'info' | 'success' | 'warning' | 'error'): void;
  showDialog(title: string, message: string, buttons?: string[]): Promise<number>;
}

export interface PluginStorage {
  get(key: string): Promise<any>;
  set(key: string, value: any): Promise<void>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
  keys(): Promise<string[]>;
}

export interface PluginLogger {
  log(...args: any[]): void;
  debug(...args: any[]): void;
  info(...args: any[]): void;
  warn(...args: any[]): void;
  error(...args: any[]): void;
}

export interface PanelOptions {
  id: string;
  title: string;
  width?: number;
  height?: number;
  position?: 'left' | 'right' | 'bottom';
  component: React.ComponentType<any>;
}

export interface PanelHandle {
  show(): void;
  hide(): void;
  close(): void;
  setContent(component: React.ComponentType<any>): void;
}

export interface CommandDefinition {
  id: string;
  title: string;
  description?: string;
  shortcut?: string;
  execute: (...args: any[]) => Promise<void> | void;
  icon?: string;
}

export interface ShortcutDefinition {
  id: string;
  keys: string;
  description?: string;
  execute: () => Promise<void> | void;
}

export interface AICallRequest {
  prompt: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  provider?: string;
}

export interface BrowserTab {
  id: string;
  title: string;
  url: string;
  favicon?: string;
  isActive: boolean;
}

/**
 * Base Plugin Class - All plugins should extend this
 */
export abstract class BasePlugin {
  protected metadata!: PluginMetadata;
  protected context!: PluginContext;

  abstract getMetadata(): PluginMetadata;
  abstract onLoad(context: PluginContext): Promise<void>;
  abstract onUnload(): Promise<void>;
  abstract onEnable?(): Promise<void>;
  abstract onDisable?(): Promise<void>;

  getContext(): PluginContext {
    return this.context;
  }

  setContext(context: PluginContext): void {
    this.context = context;
    this.metadata = this.getMetadata();
  }
}

/**
 * Plugin hooks for lifecycle management
 */
export interface PluginHooks {
  beforeLoad?: () => Promise<void>;
  onLoad?: (context: PluginContext) => Promise<void>;
  afterLoad?: () => Promise<void>;
  beforeUnload?: () => Promise<void>;
  onUnload?: () => Promise<void>;
  afterUnload?: () => Promise<void>;
  onEnable?: () => Promise<void>;
  onDisable?: () => Promise<void>;
}