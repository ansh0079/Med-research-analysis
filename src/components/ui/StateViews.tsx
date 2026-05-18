import React from 'react';

interface LoadingStateProps {
  message?: string;
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading…',
  className = '',
}) => (
  <div className={`flex flex-col items-center justify-center gap-3 py-16 text-[var(--c-text-muted)] ${className}`}>
    <div className="spinner" />
    <p className="text-sm">{message}</p>
  </div>
);

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message,
  onRetry,
  className = '',
}) => (
  <div className={`flex flex-col items-center justify-center gap-3 py-16 text-center ${className}`}>
    <div className="text-4xl">⚠️</div>
    <h3 className="font-semibold text-[var(--c-text)]">{title}</h3>
    <p className="text-sm text-[var(--c-text-muted)] max-w-sm">{message}</p>
    {onRetry && (
      <button
        onClick={onRetry}
        className="mt-2 px-4 py-2 rounded-lg bg-[var(--c-accent)] text-white text-sm hover:opacity-90 transition-opacity"
      >
        Try again
      </button>
    )}
  </div>
);

interface EmptyStateProps {
  icon?: string;
  title: string;
  message?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = '📭',
  title,
  message,
  action,
  className = '',
}) => (
  <div className={`flex flex-col items-center justify-center gap-3 py-16 text-center ${className}`}>
    <div className="text-4xl">{icon}</div>
    <h3 className="font-semibold text-[var(--c-text)]">{title}</h3>
    {message && <p className="text-sm text-[var(--c-text-muted)] max-w-sm">{message}</p>}
    {action && <div className="mt-2">{action}</div>}
  </div>
);
