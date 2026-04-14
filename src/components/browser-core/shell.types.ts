/**
 * shell.types.ts — Shell-level types for ZENO Browser
 * Defines the union of all panel IDs and the shared context passed to every panel.
 */

import type { Tab as ElectronTab } from "../../types/electron";

/** All panel identifiers — one source of truth */
export type PanelId =
  | "ai"
  | "security"
  | "cloudflare"
  | "plugins"
  | "tools"
  | "ai-gateway"
  | "terminal"
  | "analytics"
  | "search"
  | "catalog"
  | "knowledge"
  | "agents-creator"
  | "jimbo-kit"
  | "kb-viewer"
  | "code-editor"
  | "file-agent";

/** Kontekst dokumentu przekazywany z KB Viewer do Jimbo_kit */
export interface KBDocContext {
  title: string;
  url: string;
  category: string;
  query: string;
  content: string;
  md_path: string;
}

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
  /** Aktywny dokument z KB Viewer — null jeśli żaden nie jest otwarty */
  kbDocContext?: KBDocContext | null;
  /** Ustaw kontekst KB i otwórz Jimbo_kit */
  onSendToJimbo?: (doc: KBDocContext) => void;
}

/** Shared tab model used by shell workspace components */
export type Tab = ElectronTab;
