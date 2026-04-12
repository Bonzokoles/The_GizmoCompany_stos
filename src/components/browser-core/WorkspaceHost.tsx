import { useEffect, useState, type ReactNode } from "react";
import type { Tab } from "./shell.types";

interface WorkspaceHostProps {
  activeTabId: string;
  tabs: Tab[];
  children: ReactNode;
  onActiveTabChange?: (tabId: string) => void;
}

export function WorkspaceHost({
  activeTabId,
  tabs,
  children,
  onActiveTabChange,
}: WorkspaceHostProps) {
  const [selectedTabId, setSelectedTabId] = useState(activeTabId);

  useEffect(() => {
    setSelectedTabId(activeTabId);
  }, [activeTabId]);

  const handleSelect = (tabId: string) => {
    setSelectedTabId(tabId);
    onActiveTabChange?.(tabId);
  };

  return (
    <section
      className="workspace-host"
      aria-label="Workspace host"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 0,
        minWidth: 0,
      }}
    >
      <div
        className="workspace-host__tabs"
        role="tablist"
        aria-label="Workspace tabs"
        style={{
          display: "flex",
          gap: 6,
          padding: "6px 10px",
          borderBottom: "1px solid #1f2937",
          background: "#0f172a",
          overflowX: "auto",
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={selectedTabId === tab.id}
            onClick={() => handleSelect(tab.id)}
            style={{
              border: "1px solid #334155",
              padding: "4px 10px",
              cursor: "pointer",
              background: selectedTabId === tab.id ? "#1d4ed8" : "#0b1220",
              color: "#e2e8f0",
              whiteSpace: "nowrap",
            }}
          >
            {tab.title || "Untitled"}
          </button>
        ))}
      </div>

      <div
        className="workspace-host__content"
        style={{ flex: 1, minHeight: 0, minWidth: 0, position: "relative" }}
      >
        {children}
      </div>
    </section>
  );
}

export type { WorkspaceHostProps };
