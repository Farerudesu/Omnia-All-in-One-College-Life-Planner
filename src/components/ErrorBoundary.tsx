import { Component, type ReactNode, type ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Omnia ErrorBoundary caught an unhandled error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const isId = typeof window !== 'undefined' && localStorage.getItem('omnia_language') !== 'en';
      return (
        <div
          role="alert"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '50vh',
            padding: '2rem',
            textAlign: 'center',
            color: 'var(--on-surface)',
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: 'var(--error-container, #fee2e2)',
              color: 'var(--error, #dc2626)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem',
            }}
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            {this.props.fallbackTitle ||
              (isId
                ? 'Terjadi kesalahan saat memuat tampilan'
                : 'Something went wrong loading this view')}
          </h2>
          <p
            style={{
              color: 'var(--on-surface-variant)',
              fontSize: '0.875rem',
              maxWidth: 460,
              marginBottom: '1.5rem',
              lineHeight: 1.5,
            }}
          >
            {this.props.fallbackMessage ||
              (isId
                ? 'Sistem mengalami kendala teknis sementara. Silakan segarkan halaman untuk mencoba kembali.'
                : 'An unexpected error occurred. Please refresh the page to reload the schedule.')}
          </p>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              type="button"
              className="btn-primary"
              onClick={this.handleReset}
              style={{ minHeight: 40, padding: '0 1.25rem' }}
            >
              {isId ? 'Muat Ulang Halaman' : 'Reload Page'}
            </button>
            <button
              type="button"
              className="btn-outline"
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.href = '/assignments';
              }}
              style={{ minHeight: 40, padding: '0 1.25rem' }}
            >
              {isId ? 'Ke Halaman Tugas' : 'Go to Tasks'}
            </button>
          </div>
          {import.meta.env.DEV && this.state.error && (
            <pre
              style={{
                marginTop: '2rem',
                padding: '1rem',
                background: 'var(--surface-container-high)',
                borderRadius: 8,
                fontSize: '0.75rem',
                textAlign: 'left',
                maxWidth: 600,
                overflowX: 'auto',
                color: 'var(--error, #dc2626)',
              }}
            >
              {this.state.error.stack || this.state.error.message}
            </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
