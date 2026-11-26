import React, { useId, useState } from 'react';

interface NeedsReviewButtonProps {
  /** Short explanation shown when the label is opened. */
  explanation: string;
  /** Extra controls (for example a report form or a clinician review action). */
  children?: React.ReactNode;
  className?: string;
}

/**
 * Amber "Needs review" label shown on content that has been checked against stored source text
 * but not yet approved by a clinician. It is a button: opening it explains the status and offers
 * the review / report actions passed as children.
 */
export const NeedsReviewButton: React.FC<NeedsReviewButtonProps> = ({ explanation, children, className = '' }) => {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  return (
    <span className={`inline-flex flex-col items-start gap-2 ${className}`}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-800 ring-1 ring-amber-200 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-800"
      >
        <i className="fas fa-user-doctor text-[9px]" aria-hidden="true" />
        Needs review
      </button>
      {open && (
        <span id={panelId} role="region" aria-label="Review status" className="block max-w-xl space-y-2 rounded-xl border border-amber-200 bg-amber-50/60 px-3 py-2 text-[12px] font-normal normal-case tracking-normal text-slate-700 dark:border-amber-900 dark:bg-amber-950/20 dark:text-slate-200">
          <span className="block">{explanation}</span>
          {children}
        </span>
      )}
    </span>
  );
};
