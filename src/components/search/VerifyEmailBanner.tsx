import React from 'react';

interface VerifyEmailBannerProps {
  resendStatus: 'idle' | 'sending' | 'sent';
  onResend: () => void;
  onDismiss: () => void;
}

export const VerifyEmailBanner: React.FC<VerifyEmailBannerProps> = ({
  resendStatus,
  onResend,
  onDismiss,
}) => (
  <div className="fixed top-[var(--nav-h)] left-0 right-0 z-40 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800/60 px-4 py-2">
    <div className="max-w-4xl mx-auto flex items-center justify-between gap-3 flex-wrap">
      <p className="text-xs text-amber-800 dark:text-amber-200 flex items-center gap-2">
        <i className="fas fa-envelope text-amber-500" />
        Please verify your email address to unlock all features.
      </p>
      <div className="flex items-center gap-3">
        {resendStatus === 'sent' ? (
          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
            <i className="fas fa-check" /> Email sent — check your inbox
          </span>
        ) : (
          <button
            type="button"
            onClick={onResend}
            disabled={resendStatus === 'sending'}
            className="text-xs font-semibold text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100 underline transition-colors disabled:opacity-50"
          >
            {resendStatus === 'sending' ? 'Sending…' : 'Resend verification email'}
          </button>
        )}
        <button
          type="button"
          onClick={onDismiss}
          className="text-amber-400 hover:text-amber-600 dark:hover:text-amber-200 transition-colors"
          aria-label="Dismiss"
        >
          <i className="fas fa-times text-xs" />
        </button>
      </div>
    </div>
  </div>
);
