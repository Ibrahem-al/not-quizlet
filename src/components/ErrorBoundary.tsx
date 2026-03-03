import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '20px',
          fontFamily: 'system-ui, sans-serif',
          maxWidth: '800px',
          margin: '0 auto',
        }}>
          <h1 style={{ color: '#e11d48' }}>Something went wrong</h1>
          <p>The application encountered an error. Please check the console for more details.</p>
          {this.state.error && (
            <div style={{
              background: '#f1f5f9',
              padding: '16px',
              borderRadius: '8px',
              marginTop: '16px',
              overflow: 'auto',
            }}>
              <h3>Error Message:</h3>
              <pre style={{ color: '#e11d48' }}>{this.state.error.message}</pre>
              <h3>Stack Trace:</h3>
              <pre style={{ fontSize: '12px' }}>{this.state.error.stack}</pre>
              {this.state.errorInfo && (
                <>
                  <h3>Component Stack:</h3>
                  <pre style={{ fontSize: '12px' }}>{this.state.errorInfo.componentStack}</pre>
                </>
              )}
            </div>
          )}
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '20px',
              padding: '10px 20px',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
