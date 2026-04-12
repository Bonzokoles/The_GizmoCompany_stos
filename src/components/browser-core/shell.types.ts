/**
 * shell.types.ts — Shell-level types for ZENO Browser
 * Defines the union of all panel IDs and the shared context passed to every panel.
 */

/** All panel identifiers — one source of truth */
export type PanelId =
  | 'ai'
  | 'security'
  | 'cloudflare'
  | 'plugins'
  | 'tools'
  | 'ai-gateway'
  | 'terminal'
  | 'analytics'
  | 'search'
  | 'catalog'
  | 'knowledge'
  | 'agents-creator'
  | 'copilot-dev'
  | 'jimbo-kit';

/** Contextual props forwarded from BrowserUI to every panel */
export interface PanelContext {
  /** Close / dismiss this panel */
  onClose: () => void;
  /** Navigate the main webview to a URL */
  onNavigate: (url: string) => void;
  /** Open a new browser tab */
  onNewTab: () => void;
  /** Webview — go back */
  onBack: () => void;
  /** Webview — go forward */
  onForward: () => void;
  /** Webview — reload */
  onReload: () => void;
  /** Currently displayed URL */
  currentUrl: string;
}
