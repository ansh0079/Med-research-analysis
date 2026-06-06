import React from 'react';
import type { RetractionStatus } from '@types';

interface Props {
  retraction: RetractionStatus;
  isPreprint?: boolean;
  isPotentialPredatory?: boolean;
  /** 'banner' = full-width warning bar (inside card), 'chip' = inline tag */
  variant?: 'banner' | 'chip';
}

export const RetractionBadge: React.FC<Props> = ({
  retraction,
  isPreprint,
  isPotentialPredatory,
  variant = 'banner',
}) => {
  if (variant === 'chip') {
    return (
      <>
        {retraction.isRetracted && (
          <span className="badge badge-retracted">⚠ Retracted</span>
        )}
        {isPreprint && (
          <span className="badge" style={{ background: 'rgba(251,191,36,0.15)', color: '#b45309', border: '1px solid rgba(251,191,36,0.4)' }}
            title="Preprint — not yet peer reviewed">
            ⚠ Preprint
          </span>
        )}
        {isPotentialPredatory && (
          <span className="badge" style={{ background: 'rgba(239,68,68,0.12)', color: '#b91c1c', border: '1px solid rgba(239,68,68,0.35)' }}
            title="Journal appears on a local predatory-journal watchlist. Verify before citing.">
            Journal watchlist
          </span>
        )}
      </>
    );
  }

  const hasWarning = retraction.isRetracted || isPreprint || isPotentialPredatory;
  if (!hasWarning) return null;

  return (
    <>
      {retraction.isRetracted && (
        <div
          role="alert"
          aria-live="assertive"
          className="mb-3 px-3 py-2 bg-red-600 text-white border border-red-700 rounded-xl text-xs shadow-lg shadow-red-500/20"
        >
          <span className="font-black uppercase tracking-wide">
            Retracted paper — verify the retraction notice before using this source
          </span>
          {retraction.retractionDate && ` · ${retraction.retractionDate}`}
          {retraction.reason && ` · ${retraction.reason}`}
        </div>
      )}
      {(isPreprint || isPotentialPredatory) && (
        <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-300">
          {isPreprint && <p><span className="font-bold">Preprint:</span> not peer reviewed.</p>}
          {isPotentialPredatory && <p><span className="font-bold">Journal watchlist:</span> verify journal quality and indexing before citing.</p>}
        </div>
      )}
    </>
  );
};
