import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught error:", error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          className="error-boundary"
          style={{
            padding: "24px",
            background: "rgba(248, 113, 113, 0.1)",
            border: "1px solid rgba(248, 113, 113, 0.3)",
            borderRadius: "8px",
            margin: "16px",
          }}
        >
          <h3 style={{ color: "#f87171", marginBottom: "8px" }}>
            ⚠️ Wystąpił błąd
          </h3>
          <p style={{ fontSize: "14px", opacity: 0.8, marginBottom: "12px" }}>
            Coś poszło nie tak. Odśwież stronę lub spróbuj ponownie później.
          </p>
          <details style={{ fontSize: "12px", opacity: 0.6 }}>
            <summary style={{ cursor: "pointer", marginBottom: "8px" }}>
              Szczegóły techniczne
            </summary>
            <pre
              style={{
                background: "rgba(0,0,0,0.2)",
                padding: "8px",
                borderRadius: "4px",
                overflow: "auto",
              }}
            >
              {this.state.error?.toString()}
            </pre>
          </details>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: "12px",
              padding: "8px 16px",
              background: "#60a5fa",
              border: "none",
              borderRadius: "4px",
              color: "white",
              cursor: "pointer",
            }}
          >
            Odśwież stronę
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
