import React, { useState } from 'react';
import type { SearchResultRanking } from '../../contracts';

interface RankingTraceBadgeProps {
  trace: SearchResultRanking;
  movedByLearning?: boolean;
  compactReasons?: string[];
}

export function RankingTraceBadge({ trace, movedByLearning, compactReasons }: RankingTraceBadgeProps) {
  const [open, setOpen] = useState(false);
  const reasons = (trace.reasons?.length ? trace.reasons : compactReasons) || [];
  const rankShift = trace.evidenceRank != null && trace.learningRank != null
    && trace.evidenceRank !== trace.learningRank;

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        className="badge font-semibold cursor-pointer hover:opacity-80"
        style={{
          background: movedByLearning || rankShift
            ? 'rgba(99,102,241,0.14)'
            : 'rgba(100,116,139,0.12)',
          color: movedByLearning || rankShift ? '#4f46e5' : '#475569',
          border: movedByLearning || rankShift
            ? '1px solid rgba(99,102,241,0.35)'
            : '1px solid rgba(100,116,139,0.3)',
        }}
        title="Why this paper ranked here"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {movedByLearning || rankShift ? '↕ Personalized rank' : 'Ranking trace'}
      </button>
      {open && (
        <div
          className="absolute left-0 top-full z-30 mt-1 w-72 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg p-3 text-left"
          role="tooltip"
        >
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Ranking breakdown</p>
          <dl className="space-y-1 text-[11px] text-slate-600 dark:text-slate-300">
            <div className="flex justify-between gap-2">
              <dt>Evidence score</dt>
              <dd className="font-mono">{trace.baseEvidenceScore.toFixed(1)}</dd>
            </div>
            {trace.teachingObjectBoost > 0 && (
              <div className="flex justify-between gap-2">
                <dt>Teaching boost</dt>
                <dd className="font-mono">+{trace.teachingObjectBoost.toFixed(1)}</dd>
              </div>
            )}
            {trace.learnerBoost !== 0 && (
              <div className="flex justify-between gap-2">
                <dt>Learner boost</dt>
                <dd className="font-mono">{trace.learnerBoost > 0 ? '+' : ''}{trace.learnerBoost.toFixed(1)}</dd>
              </div>
            )}
            <div className="flex justify-between gap-2 font-semibold">
              <dt>Final score</dt>
              <dd className="font-mono">{trace.finalScore.toFixed(1)}</dd>
            </div>
            {trace.evidenceRank != null && trace.learningRank != null && (
              <div className="flex justify-between gap-2">
                <dt>Rank (evidence → learning)</dt>
                <dd>{trace.evidenceRank} → {trace.learningRank}</dd>
              </div>
            )}
            {trace.banditArm && (
              <div className="flex justify-between gap-2">
                <dt>Bandit arm</dt>
                <dd className="truncate max-w-[8rem]" title={trace.banditArm}>{trace.banditArm}</dd>
              </div>
            )}
          </dl>
          {reasons.length > 0 && (
            <ul className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1 text-[10px] text-slate-500 dark:text-slate-400">
              {reasons.slice(0, 6).map((r, i) => (
                <li key={i}>• {r}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </span>
  );
}
