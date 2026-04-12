export const PANEL_GROUPS = {
  PRIMARY: ["web-view", "search", "ai-chat"],
  SECONDARY: ["file-manager", "terminal", "plugin-marketplace"],
  OVERLAY: ["settings", "command-palette", "agent-hub"],
} as const;

export type PanelGroup = keyof typeof PANEL_GROUPS;
// NOTE: PanelId (the real union) lives in shell.types.ts — import from there
