import React from 'react';
import type { LowRecallLearning } from '@types';

interface LowRecallBannerProps {
  lowRecall: LowRecallLearning | null | undefined;
  onTryQuery: (query: string) => void;
}

export const LowRecallBanner: React.FC<LowRecallBannerProps> = ({ lowRecall, onTryQuery }) => {
  if (!lowRecall?.aliases?.length) return null;

  return (
    <div
      role="status"
      className="mb-4 rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3 dark:border-amber-900/50 dark:bg-amber-950/25"
    >
      <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
        Few results ({lowRecall.resultCount}) — try a broader MeSH term
      </p>
      <p className="mt-1 text-xs text-amber-800/80 dark:text-amber-200/80">
        These canonical terms often retrieve more relevant papers for &ldquo;{lowRecall.query}&rdquo;.
      </p>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {lowRecall.aliases.slice(0, 6).map((alias) => (
          <button
            key={alias}
            type="button"
            onClick={() => onTryQuery(alias)}
            className="inline-flex min-h-9 items-center rounded-full border border-amber-300/80 bg-white px-3 py-1 text-xs font-semibold text-amber-900 transition-colors hover:border-amber-400 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-100 dark:hover:bg-amber-900/50"
          >
            {alias}
          </button>
        ))}
      </div>
    </div>
  );
};
