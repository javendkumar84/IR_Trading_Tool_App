import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
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
    console.error('Uncaught component error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 bg-[#0d101a] border border-rose-900/80 rounded-2xl max-w-4xl mx-auto my-8 space-y-4 text-white font-sans shadow-2xl">
          <div className="flex items-center gap-3 text-rose-400">
            <AlertTriangle className="w-8 h-8 shrink-0" />
            <h2 className="text-lg font-bold">
              {this.props.fallbackTitle || 'A component error occurred'}
            </h2>
          </div>
          <p className="text-xs text-gray-400 font-mono bg-[#141824] p-3 rounded border border-gray-800">
            {this.state.error?.toString() || 'Unknown React State Error'}
          </p>
          <div className="pt-2">
            <button
              onClick={this.handleReset}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg"
            >
              <RefreshCw className="w-4 h-4" />
              Reset Component & Reload View
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
