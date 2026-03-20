import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div role="alert" style={{ padding: '1rem', border: '1px solid #c00', borderRadius: 8, margin: '1rem' }}>
          <h3 style={{ color: '#c00' }}>Coś poszło nie tak</h3>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.85em', color: '#666' }}>
            {this.state.error?.message}
          </pre>
          <button onClick={this.handleReset} style={{ marginTop: 8 }}>
            Spróbuj ponownie
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
