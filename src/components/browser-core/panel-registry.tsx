/**
 * panel-registry.tsx — All lazy panel imports + metadata
 *
 * Each entry describes a panel: its id, toolbar icon, tooltip title,
 * and a factory function that renders the panel given a PanelContext.
 *
 * Adding a new panel = one entry here, nothing else to change.
 */

import { lazy } from "react";
import type { ReactElement } from "react";
import type { PanelId, PanelContext } from "./shell.types";

// ── Lazy imports ─────────────────────────────────────────────────────────────

const TerminalPanel = lazy(() =>
  import("../tools/TerminalPanel").then((m) => ({ default: m.TerminalPanel })),
);
const PiTerminalPanel = lazy(() =>
  import("../tools/PiTerminalPanel"),
);
const JimboKitPanel = lazy(() =>
  import("../assistant/JimboKitPanel").then((m) => ({ default: m.JimboKitPanel })),
);
const AgentWorkspacePanel = lazy(() =>
  import("../agents/AgentWorkspacePanel").then((m) => ({ default: m.AgentWorkspacePanel })),
);

// ── Registry entry type ───────────────────────────────────────────────────────

export interface PanelEntry {
  /** Unique panel identifier */
  id: PanelId;
  /** Short symbol shown in the toolbar button */
  icon: string;
  /** Tooltip / aria-label for the toolbar button */
  title: string;
  /** Factory — renders the panel component with the supplied context */
  render: (ctx: PanelContext) => ReactElement;
}

// ── Registry ──────────────────────────────────────────────────────────────────

export const PANEL_REGISTRY: PanelEntry[] = [
  {
    id: "terminal",
    icon: ">_",
    title: "Terminal",
    render: (ctx) => (
      <TerminalPanel onClose={ctx.onClose} onNavigate={ctx.onNavigate} />
    ),
  },
  {
    id: "pi-terminal",
    icon: "π",
    title: "Pi Agent Terminal",
    render: (ctx) => (
      <PiTerminalPanel
        onClose={ctx.onClose}
        onSpawnAgent={ctx.onSpawnAgent}
        workspaceAgents={ctx.workspaceAgents}
      />
    ),
  },
  {
    id: "agent-workspace",
    icon: "⚡",
    title: "Agent Workspace (1–3 agenty)",
    render: (ctx) => (
      <AgentWorkspacePanel onClose={ctx.onClose} initialAgents={ctx.workspaceAgents} />
    ),
  },
  {
    id: "jimbo-kit",
    icon: "◈",
    title: "Jimbo_kit — Agent AI",
    render: (ctx) => (
      <JimboKitPanel
        onClose={ctx.onClose}
        onNavigate={ctx.onNavigate}
        onNewTab={ctx.onNewTab}
        onBack={ctx.onBack}
        onForward={ctx.onForward}
        onReload={ctx.onReload}
        currentUrl={ctx.currentUrl}
        kbDocContext={ctx.kbDocContext}
        floating
      />
    ),
  },
];

/** Quick lookup by id */
export const PANEL_BY_ID = Object.fromEntries(
  PANEL_REGISTRY.map((p) => [p.id, p]),
) as Record<PanelId, PanelEntry>;
