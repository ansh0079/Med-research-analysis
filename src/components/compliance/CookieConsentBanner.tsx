import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { getConsentChoice, setConsentChoice } from '../../services/consent';

export const CookieConsentBanner: React.FC = () => {
  const [decided, setDecided] = useState(() => getConsentChoice() !== null);

  if (decided) return null;

  const choose = (choice: 'accepted' | 'declined') => {
    setConsentChoice(choice);
    setDecided(true);
  };

  return (
    <div
      role="region"
      aria-label="Cookie consent"
      className="fixed top-2 left-2 right-2 z-[100] rounded-xl border border-slate-200/80 bg-white/95 px-3 py-2 shadow-[0_8px_30px_rgba(15,23,42,0.16)] backdrop-blur-sm dark:border-slate-700/50 dark:bg-slate-900/95 sm:top-0 sm:left-0 sm:right-0 sm:rounded-none sm:border-x-0 sm:border-t-0"
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-2 text-xs text-slate-800 dark:text-slate-100 sm:flex-row sm:items-center sm:gap-4">
        <p className="flex-1 leading-relaxed">
          <strong className="font-semibold">We use optional analytics cookies.</strong>{' '}
          <span className="hidden sm:inline">
            These help us spot errors and improve the app. They are off by default and stay off unless you accept.{' '}
          </span>
          <Link to="/legal/privacy" className="font-medium text-slate-700 underline dark:text-slate-200">
            Privacy
          </Link>
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => choose('declined')}
            className="rounded-lg bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-700 hover:opacity-90 dark:bg-slate-800 dark:text-slate-200"
          >
            Decline
          </button>
          <button
            type="button"
            onClick={() => choose('accepted')}
            className="rounded-lg bg-slate-800 px-3 py-1 text-[11px] font-semibold text-white hover:opacity-90 dark:bg-slate-200 dark:text-slate-900"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
};
