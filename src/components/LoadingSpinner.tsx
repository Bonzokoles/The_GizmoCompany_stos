interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  message?: string;
  fullScreen?: boolean;
}

export function LoadingSpinner({
  size = "md",
  message,
  fullScreen = false,
}: LoadingSpinnerProps) {
  const sizeMap = {
    sm: "16px",
    md: "32px",
    lg: "48px",
  };

  const spinner = (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "12px",
        padding: fullScreen ? "64px" : "24px",
      }}
    >
      <div
        className="loading-spinner"
        style={{
          width: sizeMap[size],
          height: sizeMap[size],
          border: "3px solid rgba(96, 165, 250, 0.2)",
          borderTopColor: "#60a5fa",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
        }}
      />
      {message && (
        <p style={{ fontSize: "14px", opacity: 0.7, margin: 0 }}>{message}</p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(0, 0, 0, 0.5)",
          zIndex: 9999,
        }}
      >
        {spinner}
      </div>
    );
  }

  return spinner;
}
