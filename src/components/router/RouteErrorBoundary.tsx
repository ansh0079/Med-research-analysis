import React from 'react';
import { useLocation } from 'react-router-dom';
import * as Sentry from '@sentry/react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class RouteErrorBoundaryInner extends React.Component<Props & { pathname: string }, State> {
  constructor(props: Props & { pathname: string }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    Sentry.captureException(error, {
      extra: {
        componentStack: errorInfo.componentStack,
        pathname: this.props.pathname,
      },
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex-1 flex items-center justify-center p-8 min-h-[60vh]">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-8 max-w-lg w-full text-center">
            <i className="fas fa-exclamation-triangle text-4xl text-red-500 mb-4" />
            <h2 className="text-xl font-bold text-red-800 dark:text-red-300 mb-2">
              This page failed to load
            </h2>
            <p className="text-sm text-red-600 dark:text-red-400 mb-2">
              Something went wrong while rendering{' '}
              <code className="font-mono bg-red-100 dark:bg-red-800/40 px-1.5 py-0.5 rounded">
                {this.props.pathname}
              </code>
            </p>
            <p className="text-xs text-red-500 dark:text-red-400 mb-6 font-mono">
              {this.state.error?.message}
            </p>
            <div className="flex gap-3 justify-center flex-wrap">
              <button
                onClick={() => this.setState({ hasError: false, error: undefined })}
                className="px-4 py-2 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors"
              >
                Try again
              </button>
              <button
                onClick={() => { window.location.href = '/'; }}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl font-medium hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
              >
                Go home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export const RouteErrorBoundary: React.FC<Props> = ({ children }) => {
  const { pathname } = useLocation();
  return (
    <RouteErrorBoundaryInner pathname={pathname}>
      {children}
    </RouteErrorBoundaryInner>
  );
};
