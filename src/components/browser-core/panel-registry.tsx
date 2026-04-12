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

const AIPanel = lazy(() =>
  import("../ai/AIPanel").then((m) => ({ default: m.AIPanel })),
);
const SecurityMonitor = lazy(() =>
  import("../analytics/SecurityMonitor").then((m) => ({
    default: m.SecurityMonitor,
  })),
);
const CloudflareTunnelPanel = lazy(() =>
  import("../cloudflare/CloudflareTunnelPanel").then((m) => ({
    default: m.CloudflareTunnelPanel,
  })),
);
const PluginHub = lazy(() =>
  import("../plugins/PluginHub").then((m) => ({ default: m.PluginHub })),
);
const ToolsPanel = lazy(() =>
  import("../tools/ToolsPanel").then((m) => ({ default: m.ToolsPanel })),
);
const AIGatewayPanel = lazy(() =>
  import("../ai/AIGatewayPanel").then((m) => ({ default: m.AIGatewayPanel })),
);
const TerminalPanel = lazy(() =>
  import("../tools/TerminalPanel").then((m) => ({ default: m.TerminalPanel })),
);
const AnalyticsPanel = lazy(() =>
  import("../analytics/AnalyticsPanel").then((m) => ({
    default: m.AnalyticsPanel,
  })),
);
const SearchPanel = lazy(() =>
  import("../navigation/SearchPanel").then((m) => ({ default: m.SearchPanel })),
);
const CatalogBrowser = lazy(() =>
  import("../tools/CatalogBrowser").then((m) => ({
    default: m.CatalogBrowser,
  })),
);
const KnowledgeHubPanel = lazy(() =>
  import("../knowledge-hub/KnowledgeHubPanel").then((m) => ({
    default: m.KnowledgeHubPanel,
  })),
);
const AgentsCreatorPanel = lazy(() =>
  import("../agents-creator/AgentsCreatorPanel").then((m) => ({
    default: m.AgentsCreatorPanel,
  })),
);
const CopilotDevPanel = lazy(() =>
  import("../ai/CopilotDevPanel").then((m) => ({ default: m.CopilotDevPanel })),
);
const JimboKitPanel = lazy(() =>
  import("../assistant/JimboKitPanel").then((m) => ({
    default: m.JimboKitPanel,
  })),
);
const KBViewerPanel = lazy(() =>
  import("../knowledge-hub/KBViewerPanel").then((m) => ({
    default: m.KBViewerPanel,
  })),
);
const CodeEditorPanel = lazy(() =>
  import("../tools/CodeEditorPanel").then((m) => ({
    default: m.CodeEditorPanel,
  })),
);
// ── Registry entry type ───────────────────────────────────────────────────────

export interface PanelEntry {
  /** Unique panel identifier */
  id: PanelId;
  /** Emoji / icon shown in the toolbar button */
  icon: string;
  /** Tooltip / aria-label for the toolbar button */
  title: string;
  /** Factory — renders the panel component with the supplied context */
  render: (ctx: PanelContext) => ReactElement;
}

// ── Registry ──────────────────────────────────────────────────────────────────

export const PANEL_REGISTRY: PanelEntry[] = [
  {
    id: "ai",
    icon: "🤖",
    title: "Asystent AI",
    render: (ctx) => <AIPanel onClose={ctx.onClose} />,
  },
  {
    id: "security",
    icon: "🔒",
    title: "Bezpieczeństwo",
    render: (ctx) => <SecurityMonitor onClose={ctx.onClose} />,
  },
  {
    id: "cloudflare",
    icon: "🌐",
    title: "Cloudflare Tunnel",
    render: (ctx) => <CloudflareTunnelPanel onClose={ctx.onClose} />,
  },
  {
    id: "plugins",
    icon: "🔌",
    title: "Wtyczki",
    render: (ctx) => <PluginHub onClose={ctx.onClose} />,
  },
  {
    id: "tools",
    icon: "🛠",
    title: "Narzędzia",
    render: (ctx) => <ToolsPanel onClose={ctx.onClose} />,
  },
  {
    id: "ai-gateway",
    icon: "🧠",
    title: "AI Gateway",
    render: (ctx) => <AIGatewayPanel onClose={ctx.onClose} />,
  },
  {
    id: "terminal",
    icon: "⌨",
    title: "Terminal",
    render: (ctx) => (
      <TerminalPanel onClose={ctx.onClose} onNavigate={ctx.onNavigate} />
    ),
  },
  {
    id: "analytics",
    icon: "📊",
    title: "Analytics (Umami)",
    render: (ctx) => <AnalyticsPanel onClose={ctx.onClose} />,
  },
  {
    id: "search",
    icon: "🔍",
    title: "Wyszukiwarka",
    render: (ctx) => (
      <SearchPanel onClose={ctx.onClose} onNavigate={ctx.onNavigate} />
    ),
  },
  {
    id: "catalog",
    icon: "📚",
    title: "Biblioteka lokalna",
    render: (ctx) => <CatalogBrowser onClose={ctx.onClose} />,
  },
  {
    id: "knowledge",
    icon: "📇",
    title: "Knowledge Hub — bazy wiedzy i agenci",
    render: (ctx) => <KnowledgeHubPanel onClose={ctx.onClose} />,
  },
  {
    id: "agents-creator",
    icon: "🧑‍💻",
    title: "Agents Creator — tworzenie agentów z bazami wiedzy",
    render: (ctx) => <AgentsCreatorPanel onClose={ctx.onClose} />,
  },
  {
    id: "copilot-dev",
    icon: "⚡",
    title: "ZENO DevTools — narzędzia developerskie",
    render: (ctx) => <CopilotDevPanel onClose={ctx.onClose} />,
  },
  {
    id: "jimbo-kit",
    icon: "🦾",
    title: "Jimbo_kit — Agent AI z terminalem",
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
  {
    id: "kb-viewer",
    icon: "📚",
    title: "KB Viewer — Baza Wiedzy",
    render: (ctx) => (
      <KBViewerPanel
        onClose={ctx.onClose}
        onSendToJimbo={ctx.onSendToJimbo}
      />
    ),
  },
  {
    id: "code-editor",
    icon: "💻",
    title: "Code Editor — Monaco + AI",
    render: (ctx) => <CodeEditorPanel onClose={ctx.onClose} />,
  },
];

/** Quick lookup by id */
export const PANEL_BY_ID = Object.fromEntries(
  PANEL_REGISTRY.map((p) => [p.id, p]),
) as Record<PanelId, PanelEntry>;
