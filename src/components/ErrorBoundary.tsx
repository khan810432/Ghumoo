import * as React from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';
import { Button } from './ui/button';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends (React.Component as any) {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    const { hasError, error } = this.state as State;
    const { children } = this.props as Props;

    if (hasError) {
      let errorMessage = 'An unexpected error occurred.';
      let isFirebaseError = false;

      try {
        if (error?.message) {
          const parsed = JSON.parse(error.message);
          if (parsed.error && parsed.operationType) {
            errorMessage = `Firestore Error: ${parsed.error} during ${parsed.operationType} on ${parsed.path}`;
            isFirebaseError = true;
          }
        }
      } catch (e) {
        errorMessage = error?.message || errorMessage;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-slate-100">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Something went wrong</h1>
            <p className="text-slate-600 mb-6">
              {isFirebaseError ? 'There was a problem connecting to the live database.' : errorMessage}
            </p>
            {isFirebaseError && (
              <div className="bg-slate-50 rounded-lg p-4 mb-6 text-left text-xs font-mono text-slate-500 overflow-auto max-h-32">
                {errorMessage}
              </div>
            )}
            <Button 
              onClick={this.handleReset}
              className="w-full flex items-center justify-center gap-2"
            >
              <RefreshCcw className="w-4 h-4" />
              Reload Application
            </Button>
          </div>
        </div>
      );
    }

    return children;
  }
}
