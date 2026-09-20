import React from 'react';
import type { QueryResolution } from '@types';

interface QuerySenseBannerProps {
  resolution: QueryResolution | null | undefined;
  onTryQuery: (query: string) => void;
}

/**
 * Shown when the query left an abbreviation's meaning open. Results are for the
 * assumed sense; the alternatives re-run the search with the other meaning spelled out.
 */
export const QuerySenseBanner: React.FC<QuerySenseBannerProps> = ({ resolution, onTryQuery }) => {
  if (resolution?.status !== 'ambiguous' || !resolution.ambiguities.length) return null;

  return (
    <div
      role="status"
      className="mb-4 rounded-xl border border-sky-200 bg-sky-50/90 px-4 py-3 dark:border-sky-900/50 dark:bg-sky-950/25"
    >
      {resolution.ambiguities.map((amb) => (
        <div key={amb.token} className="mb-1 last:mb-0">
          <p className="text-sm font-semibold text-sky-900 dark:text-sky-100">
            &ldquo;{amb.token.toUpperCase()}&rdquo; can mean more than one thing &mdash; showing {amb.assumed}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {amb.alternatives.map((alt) => (
              <button
                key={alt.label}
                type="button"
                onClick={() => onTryQuery(alt.query)}
                className="inline-flex min-h-9 items-center rounded-full border border-sky-300/80 bg-white px-3 py-1 text-xs font-semibold text-sky-900 transition-colors hover:border-sky-400 hover:bg-sky-100 dark:border-sky-800 dark:bg-sky-950/60 dark:text-sky-100 dark:hover:bg-sky-900/50"
              >
                Search {alt.label} instead
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
