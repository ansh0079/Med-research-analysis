import React from 'react';
import {
  formatReviewStateLabel,
  type SynopsisReviewState,
  type SynopsisSourceMode,
} from '@utils/synopsisTrustLabels';

export type { SynopsisSourceMode, SynopsisReviewState };
export { formatReviewStateLabel, synopsisTrustExportLines } from '@utils/synopsisTrustLabels';

function coverageLabel(ratio?: number | null) {
  if (typeof ratio !== 'number' || Number.isNaN(ratio)) return null;
  const pct = Math.round(Math.max(0, Math.min(1, ratio)) * 100);
  return `${pct}% full text`;
}

export function SynopsisTrustBanner({
  sourceMode,
  reviewState,
  citationOk,
  abstractOnly,
  fullTextCoverageRatio,
  className = '',
}: {
  sourceMode?: SynopsisSourceMode | null;
  reviewState?: SynopsisReviewState | string | null;
  citationOk?: boolean | null;
  abstractOnly?: boolean | null;
  fullTextCoverageRatio?: number | null;
  className?: string;
}) {
  const isAbstractOnly = abstractOnly === true || sourceMode === 'abstract_only';
  const coverage = coverageLabel(fullTextCoverageRatio);
  if (!isAbstractOnly && citationOk !== false && !reviewState && !coverage) return null;

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
            {coverage ? ` Coverage: ${coverage}.` : ''}
          </p>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {coverage && !isAbstractOnly && (
          <span
            className="inline-flex items-center gap-1 rounded-md border border-blue-300/70 bg-blue-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-blue-800 dark:border-blue-700/60 dark:bg-blue-950/40 dark:text-blue-200"
            title="Share of synopsis grounding from indexed full text"
          >
            <i className="fas fa-file-alt text-[9px]" />
            {coverage}
          </span>
        )}
        {reviewState && (
          <span
            className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${
              String(reviewState) === 'human_reviewed'
                ? 'border-emerald-400/80 bg-emerald-50 text-emerald-800 dark:border-emerald-600/60 dark:bg-emerald-950/40 dark:text-emerald-200'
                : String(reviewState) === 'needs_revision'
                  ? 'border-amber-400/80 bg-amber-50 text-amber-900 dark:border-amber-600/60 dark:bg-amber-950/40 dark:text-amber-200'
                  : 'border-slate-300 bg-slate-50 text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200'
            }`}
            title="Synopsis review state"
          >
            {String(reviewState) === 'human_reviewed' ? (
              <i className="fas fa-user-check text-[9px]" />
            ) : (
              <i className="fas fa-clipboard-check text-[9px]" />
            )}
            {formatReviewStateLabel(reviewState)}
          </span>
        )}
        {citationOk === true && (
          <span className="inline-flex items-center rounded-md border border-emerald-300/70 bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-800 dark:border-emerald-700/60 dark:bg-emerald-950/40 dark:text-emerald-200">
            Citations checked
          </span>
        )}
        {citationOk === false && (
          <span className="inline-flex items-center rounded-md border border-red-300/70 bg-red-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-red-800 dark:border-red-700/60 dark:bg-red-950/40 dark:text-red-200">
            Citation warning
          </span>
        )}
      </div>
    </div>
  );
}
