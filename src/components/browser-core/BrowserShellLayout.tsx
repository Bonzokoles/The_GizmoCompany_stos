import type { ReactNode } from "react";

interface BrowserShellLayoutProps {
  sidebar?: ReactNode;
  statusBar?: ReactNode;
  children: ReactNode;
}

export function BrowserShellLayout({
  sidebar,
  statusBar,
  children,
}: BrowserShellLayoutProps) {
  return (
    <div
      className="browser-shell-layout"
      style={{
        display: "grid",
        gridTemplateRows: "1fr auto",
        height: "100vh",
        minHeight: 0,
        background: "#0f172a",
      }}
    >
      <div
        className="browser-shell-layout__content"
        style={{
          display: "grid",
          gridTemplateColumns: sidebar
            ? "280px minmax(0, 1fr)"
            : "minmax(0, 1fr)",
          minHeight: 0,
        }}
      >
        {sidebar && (
          <aside
            className="browser-shell-layout__sidebar"
            style={{
              minWidth: 0,
              minHeight: 0,
              borderRight: "1px solid #1f2937",
              background: "#111827",
              overflow: "hidden",
            }}
          >
            {sidebar}
          </aside>
        )}

        <section
          className="browser-shell-layout__main"
          style={{
            minWidth: 0,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {children}
        </section>
      </div>

      {statusBar && (
        <div className="browser-shell-layout__status" style={{ minHeight: 0 }}>
          {statusBar}
        </div>
      )}
    </div>
  );
}

export type { BrowserShellLayoutProps };
