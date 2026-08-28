import React, { useState } from 'react';
import type { ComorbidMeta, ComorbidConflict, ComorbidConditionEntry } from '@types';

interface Props {
  meta: ComorbidMeta;
  className?: string;
}

const DIRECTION_LABEL: Record<string, { label: string; color: string }> = {
  recommend:         { label: 'Recommend',     color: 'text-emerald-700 dark:text-emerald-400' },
  recommend_against: { label: 'Against',       color: 'text-red-600 dark:text-red-400' },
  consider:          { label: 'Consider',      color: 'text-amber-700 dark:text-amber-300' },
  no_recommendation: { label: 'No rec',        color: 'text-slate-500' },
};

function DirectionBadge({ direction }: { direction?: string | null }) {
  if (!direction) return null;
  const d = DIRECTION_LABEL[direction];
  if (!d) return null;
  return (
    <span className={`text-[10px] font-bold uppercase tracking-wider ${d.color}`}>{d.label}</span>
  );
}

function ConditionSection({ entry }: { entry: ComorbidConditionEntry }) {
  const [open, setOpen] = useState(true);
  const hasInapplicable = entry.inapplicable.length > 0;

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full px-4 py-3 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 capitalize truncate">
            {entry.condition}
          </span>
          {entry.sourceBodies.length > 0 && (
            <span className="text-[10px] text-slate-400 font-medium truncate hidden sm:block">
              {entry.sourceBodies.slice(0, 2).join(' · ')}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          {hasInapplicable && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded bg-amber-500/10">
              {entry.inapplicable.length} excluded
            </span>
          )}
          <span className="text-[10px] text-slate-400">{entry.applicable.length} recs</span>
          <svg
            className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {open && (
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {entry.applicable.map((rec, i) => (
            <div key={i} className="px-4 py-3">
              <div className="flex items-start gap-2">
                <DirectionBadge direction={rec.recDirection} />
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed flex-1">
                  {rec.text}
                </p>
              </div>
              {(rec.sourceBody || rec.sourceYear) && (
                <p className="mt-1 text-[10px] text-slate-400">
                  {[rec.sourceBody, rec.sourceYear].filter(Boolean).join(' ')}
                  {rec.intervention && <span className="ml-2 text-indigo-400">↳ {rec.intervention}</span>}
                </p>
              )}
            </div>
          ))}

          {hasInapplicable && (
            <div className="px-4 py-3 bg-amber-50/50 dark:bg-amber-900/10">
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-2">
                ⚠ Inapplicable — excluded by trial criteria
              </p>
              {entry.inapplicable.map((rec, i) => (
                <div key={i} className="mb-2 last:mb-0">
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-through leading-relaxed">
                    {rec.text}
                  </p>
                  <p className="mt-0.5 text-[10px] text-amber-600 dark:text-amber-400">
                    Excluded: {rec.exclusionHit} patients were not included in this evidence
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ConflictSection({ conflict }: { conflict: ComorbidConflict }) {
  const isStructured = conflict.structured;
  return (
    <div className={`rounded-xl border-2 p-4 ${isStructured ? 'border-red-400/40 dark:border-red-500/30' : 'border-amber-400/40 dark:border-amber-500/30'}`}>
      <div className="flex items-center gap-2 mb-3">
        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${isStructured ? 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-400/20' : 'bg-amber-500/10 text-amber-700 dark:text-amber-200 border-amber-400/20'}`}>
          {isStructured ? 'Confirmed conflict' : 'Probable conflict'}
        </span>
        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{conflict.label}</span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {conflict.detail.map((d, i) => (
          <div key={i} className="rounded-lg bg-white/60 dark:bg-slate-900/40 p-3 border border-slate-100 dark:border-slate-800">
            <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-500 mb-1.5 capitalize">
              {d.condition}
            </p>
            {d.recommendations.map((r, j) => (
              <div key={j} className="mb-1.5 last:mb-0">
                <DirectionBadge direction={r.direction} />
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed mt-0.5">{r.text}</p>
                {(r.sourceBody || r.sourceYear) && (
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {[r.sourceBody, r.sourceYear].filter(Boolean).join(' ')}
                  </p>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export const ComorbidConflictPanel: React.FC<Props> = ({ meta, className = '' }) => {
  const { byCondition, conflicts, uncovered, conditions } = meta;
  if (!byCondition.length) return null;

  const totalInapplicable = byCondition.reduce((n, e) => n + e.inapplicable.length, 0);

  return (
    <div className={`rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-5 py-4 bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Multi-condition guidelines
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
            {conditions.join(' · ')}
          </p>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider">
          {conflicts.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 dark:text-red-300">
              {conflicts.length} {conflicts.length === 1 ? 'conflict' : 'conflicts'}
            </span>
          )}
          {totalInapplicable > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-200">
              {totalInapplicable} excluded
            </span>
          )}
          {uncovered.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-500">
              {uncovered.length} no guideline
            </span>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Conflicts first — highest clinical significance */}
        {conflicts.length > 0 && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-red-500 mb-2">
              Conflicting recommendations — must be addressed explicitly
            </p>
            <div className="space-y-3">
              {conflicts.map((c, i) => <ConflictSection key={i} conflict={c} />)}
            </div>
          </div>
        )}

        {/* Per-condition guideline blocks */}
        <div className="space-y-2">
          {byCondition.map((entry, i) => (
            <ConditionSection key={i} entry={entry} />
          ))}
        </div>

        {/* Uncovered conditions */}
        {uncovered.length > 0 && (
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-3 bg-slate-50 dark:bg-slate-900/30">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">No guideline found</p>
            <p className="text-xs text-slate-500">{uncovered.join(', ')}</p>
          </div>
        )}
      </div>
    </div>
  );
};
