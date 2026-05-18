import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const STORAGE_KEY = 'med_phi_notice_dismissed_v1';

export const PhiDataNotice: React.FC = () => {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (dismissed) return;
    const previousPadding = document.body.style.paddingBottom;
    document.body.style.paddingBottom = '88px';
    return () => {
      document.body.style.paddingBottom = previousPadding;
    };
  }, [dismissed]);

  if (dismissed) return null;

  const dismiss = () => {
    try {
      sessionStorage.setItem(STORAGE_KEY, '1');
    } catch {
      /* ignore */
    }
    setDismissed(true);
  };

  return (
    <div
      role="region"
      aria-label="Data use notice"
      className="fixed bottom-2 left-2 right-2 z-[100] rounded-xl border border-amber-200/80 bg-amber-50/95 px-3 py-2 shadow-[0_8px_30px_rgba(120,53,15,0.16)] backdrop-blur-sm dark:border-amber-900/50 dark:bg-amber-950/95 sm:bottom-0 sm:left-0 sm:right-0 sm:rounded-none sm:border-x-0 sm:border-b-0"
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-2 text-xs text-amber-950 dark:text-amber-100 sm:flex-row sm:items-center sm:gap-4">
        <p className="flex-1 leading-relaxed">
          <strong className="font-semibold">Research tool - not for protected health information (PHI).</strong>{' '}
          <span className="hidden sm:inline">
            Do not enter patient identifiers or clinical data subject to HIPAA or similar rules. Outputs are for literature
            support only; verify with local policy and qualified professionals.{' '}
          </span>
          <span className="sm:hidden">Avoid patient identifiers. Verify outputs before use. </span>
          <Link to="/legal/privacy" className="font-medium text-amber-900 underline dark:text-amber-200">
            Privacy
          </Link>
          {' - '}
          <Link to="/legal/terms" className="font-medium text-amber-900 underline dark:text-amber-200">
            Terms
          </Link>
        </p>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 rounded-lg bg-amber-200/80 px-3 py-1 text-[11px] font-semibold text-amber-950 hover:opacity-90 dark:bg-amber-800/80 dark:text-amber-50"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
};
