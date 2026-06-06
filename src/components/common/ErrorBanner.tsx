import React from 'react';
import { getRecoveryHint } from '@utils/appErrors';

interface ErrorBannerProps {
  error: string | Error | null;
  className?: string;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({ error, className = '' }) => {
  if (!error) return null;

  const message = error instanceof Error ? error.message : error;
  const hint = getRecoveryHint(error instanceof Error ? error : new Error(message));

  return (
    <div
      role="alert"
      className={`px-4 py-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-red-700 dark:text-red-400 rounded-2xl text-sm ${className}`}
    >
      <div className="flex items-start gap-2">
        <i className="fas fa-exclamation-circle mt-0.5 shrink-0" />
        <div className="min-w-0">
          <p>{message}</p>
          {hint && hint !== message && (
            <p className="mt-1 text-xs text-red-600/80 dark:text-red-400/80">{hint}</p>
          )}
        </div>
      </div>
    </div>
  );
};
