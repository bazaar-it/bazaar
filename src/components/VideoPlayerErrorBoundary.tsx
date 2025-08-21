"use client";

import React, { Component, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  playerName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class VideoPlayerErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Video Player Error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return <>{this.props.fallback}</>;
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] bg-gray-50 rounded-lg border border-gray-200 p-8">
          <AlertCircle className="w-12 h-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Video Player Error
          </h3>
          <p className="text-sm text-gray-600 text-center mb-4 max-w-md">
            {this.props.playerName 
              ? `The ${this.props.playerName} player encountered an error.`
              : 'The video player encountered an error.'
            } Please try refreshing the player.
          </p>
          {this.state.error && (
            <details className="mb-4 text-xs text-gray-500 max-w-full">
              <summary className="cursor-pointer hover:text-gray-700">
                Technical details
              </summary>
              <pre className="mt-2 p-2 bg-gray-100 rounded overflow-auto max-w-full">
                {this.state.error.message}
              </pre>
            </details>
          )}
          <button
            onClick={this.handleReset}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}