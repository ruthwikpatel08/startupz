import React, { Component, ErrorInfo, ReactNode } from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('StartupZ ErrorBoundary caught error:', error, errorInfo);
    // Auto-recover from stale deployment chunk errors (e.g. Failed to fetch dynamically imported module)
    if (
      error?.message?.includes('dynamically imported module') ||
      error?.message?.includes('Failed to fetch') ||
      error?.message?.includes('Importing a module script failed')
    ) {
      const storageKey = 'startupz_stale_chunk_reload';
      if (!sessionStorage.getItem(storageKey)) {
        sessionStorage.setItem(storageKey, 'true');
        window.location.reload();
      }
    }
  }

  private handleReset = () => {
    try {
      localStorage.removeItem('startupz_user');
      localStorage.removeItem('startupz_token');
    } catch {
      // ignore
    }
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-dark-950 text-slate-900 dark:text-white font-sans">
          <div className="card-base max-w-md w-full p-8 text-center space-y-5 shadow-sm">
            <div className="w-12 h-12 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-lg flex items-center justify-center mx-auto border border-rose-200/60 dark:border-rose-900/40">
              <AlertTriangle size={24} />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                Something went wrong
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                An unexpected interface error occurred. You can reset cache and return to the homepage below.
              </p>
            </div>

            {this.state.error?.message && (
              <div className="p-3 rounded-md bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-dark-700 text-xs text-rose-600 dark:text-rose-400 font-mono text-left max-h-32 overflow-auto break-words">
                {this.state.error.message}
              </div>
            )}

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="btn-primary w-full py-2.5 px-4 text-xs font-semibold flex items-center justify-center gap-2"
              >
                <RefreshCw size={14} />
                <span>Reset Cache & Return Home</span>
              </button>

              <button
                type="button"
                onClick={() => window.location.reload()}
                className="btn-secondary w-full py-2 px-4 text-xs font-semibold"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
