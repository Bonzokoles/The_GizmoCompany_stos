interface PanelFallbackProps {
  panelId: string;
  error?: Error;
  onRetry: () => void;
}

export function PanelFallback({ panelId, error, onRetry }: PanelFallbackProps) {
  return (
    <div
      role="alert"
      style={{
        margin: "12px",
        border: "1px solid #7f1d1d",
        background: "#1f1111",
        color: "#fecaca",
        padding: "12px",
      }}
    >
      <h3 style={{ margin: "0 0 8px 0", fontSize: "14px", fontWeight: 700 }}>
        Panel „{panelId}” napotkał błąd
      </h3>
      {error?.message && (
        <p style={{ margin: "0 0 12px 0", color: "#fca5a5", fontSize: "13px" }}>
          {error.message}
        </p>
      )}
      <button
        onClick={onRetry}
        type="button"
        style={{
          border: "1px solid #ef4444",
          background: "#7f1d1d",
          color: "#fee2e2",
          cursor: "pointer",
          padding: "6px 10px",
          fontSize: "13px",
        }}
      >
        Przeładuj panel
      </button>
    </div>
  );
}

export type { PanelFallbackProps };
