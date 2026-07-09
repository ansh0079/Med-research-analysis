import React from 'react';
import {
  formatReviewStateLabel,
  type SynopsisReviewState,
  type SynopsisSourceMode,
} from '@utils/synopsisTrustLabels';

export type { SynopsisSourceMode, SynopsisReviewState };
export { formatReviewStateLabel, synopsisTrustExportLines } from '@utils/synopsisTrustLabels';

export function SynopsisTrustBanner({
  sourceMode,
  reviewState,
  citationOk,
  abstractOnly,
  className = '',
}: {
  sourceMode?: SynopsisSourceMode | null;
  reviewState?: SynopsisReviewState | string | null;
  citationOk?: boolean | null;
  abstractOnly?: boolean | null;
  className?: string;
}) {
  const isAbstractOnly = abstractOnly === true || sourceMode === 'abstract_only';
  if (!isAbstractOnly && citationOk !== false && !reviewState) return null;

  return (
    <div className={`space-y-2 ${className}`}>
      {isAbstractOnly && (
        <div
          role="status"
          className="rounded-lg border-2 border-amber-400/80 bg-amber-50 px-3 py-2.5 dark:border-amber-600/60 dark:bg-amber-950/30"
        >
          <p className="text-[11px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-200">
            Abstract-only synopsis
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-amber-900/90 dark:text-amber-100/90">
            This appraisal used abstract and metadata only — full text was not indexed. Treat numerical results and practice claims cautiously.
          </p>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-1.5">
        {reviewState && (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {formatReviewStateLabel(reviewState)}
          </span>
        )}
        {citationOk === true && (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
            Citations checked
          </span>
        )}
        {citationOk === false && (
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-red-700 dark:bg-red-900/30 dark:text-red-300">
            Citation warning
          </span>
        )}
      </div>
    </div>
  );
}
