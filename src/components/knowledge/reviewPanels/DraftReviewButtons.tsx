import React from 'react';

export type DraftReviewDecision = 'approve' | 'needs_review';

export function DraftReviewButtons({
  status,
  busyDecision = null,
  compact = false,
  onApprove,
  onNeedsReview,
}: {
  status: string;
  busyDecision?: DraftReviewDecision | null;
  compact?: boolean;
  onApprove: () => void;
  onNeedsReview: () => void;
}) {
  const approved = status === 'human_reviewed';
  const needsReview = status === 'pending_review';
  const busy = busyDecision != null;
  const pad = compact ? 'rounded-full px-2 py-1 text-[9px]' : 'rounded-full px-3 py-1.5 text-[10px]';

  return (
    <div className={`flex flex-wrap gap-1 ${compact ? 'mt-2' : ''}`}>
      <button
        type="button"
        aria-pressed={approved}
        disabled={busy || approved}
        onClick={onApprove}
        className={`${pad} font-bold uppercase tracking-wider transition-colors disabled:cursor-default disabled:opacity-80 ${
          approved
            ? 'bg-emerald-600 text-white'
            : 'border border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900 dark:bg-slate-900 dark:text-emerald-300'
        }`}
      >
        {busyDecision === 'approve' ? 'Saving…' : 'Approve'}
      </button>
      <button
        type="button"
        aria-pressed={needsReview}
        disabled={busy || needsReview}
        onClick={onNeedsReview}
        className={`${pad} font-bold uppercase tracking-wider transition-colors disabled:cursor-default disabled:opacity-80 ${
          needsReview
            ? 'bg-amber-500 text-white'
            : 'border border-amber-200 bg-white text-amber-800 hover:bg-amber-50 dark:border-amber-900 dark:bg-slate-900 dark:text-amber-200'
        }`}
      >
        {busyDecision === 'needs_review' ? 'Saving…' : 'Needs review'}
      </button>
    </div>
  );
}
