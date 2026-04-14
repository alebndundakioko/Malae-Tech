import * as React from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      let errorMessage = "An unexpected error occurred. Please try again.";
      let errorDetails = "";

      try {
        // Check if it's a Firestore error JSON
        if (this.state.error?.message) {
          const parsed = JSON.parse(this.state.error.message);
          if (parsed.error && parsed.operationType) {
            errorMessage = `Database error during ${parsed.operationType} operation.`;
            errorDetails = parsed.error;
          }
        }
      } catch (e) {
        // Not a JSON error, use the original message if available
        errorMessage = this.state.error?.message || errorMessage;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-bg p-6">
          <div className="w-full max-w-md bg-surface rounded-[2.5rem] border border-line shadow-2xl p-10 text-center">
            <div className="w-20 h-20 rounded-3xl bg-red-50 flex items-center justify-center mx-auto mb-8 text-red-500">
              <AlertCircle className="w-10 h-10" />
            </div>
            
            <h2 className="text-2xl font-black text-text-main mb-4 tracking-tight">Something went wrong</h2>
            <p className="text-text-muted mb-6 leading-relaxed">
              {errorMessage}
            </p>

            {errorDetails && (
              <div className="mb-8 p-4 bg-bg rounded-2xl text-left">
                <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">Error Details</p>
                <p className="text-xs font-mono text-text-main break-all">{errorDetails}</p>
              </div>
            )}

            <button
              onClick={this.handleReset}
              className="w-full bg-primary hover:bg-accent text-white font-bold py-4 rounded-2xl shadow-xl shadow-primary/20 transition-all flex items-center justify-center gap-3 group"
            >
              <RotateCcw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
              Refresh Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
