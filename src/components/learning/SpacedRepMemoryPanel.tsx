import React, { useEffect, useState } from 'react';
import { api } from '@services/api';
import type { SpacedRepTopicGroup } from '@types';

function formatDue(daysUntil: number | null): string {
  if (daysUntil === null || Number.isNaN(daysUntil)) return '—';
  if (daysUntil < 0) return `${Math.abs(daysUntil)}d overdue`;
  if (daysUntil === 0) return 'due today';
  return `in ${daysUntil}d`;
}

/**
 * Real FSRS forgetting curve: R(t,S) = (1 + t/(9*S))^-1, the same formula the
 * backend uses to schedule reviews (see server/services/fsrsService.js). The
 * dashed marker is "you are here" — today's actual predicted recall odds,
 * not a stylized approximation.
 */
function MemoryCurveSvg({ stability, daysSince }: { stability: number; daysSince: number | null }) {
  const w = 200;
  const h = 56;
  const s = Math.max(0.5, stability);
  const maxDay = Math.max(s * 2, (daysSince ?? 0) + 1);
  const pts: string[] = [];
  for (let i = 0; i <= 20; i++) {
    const t = (i / 20) * maxDay;
    const recall = 100 * (1 / (1 + t / (9 * s)));
    const x = 8 + (t / maxDay) * (w - 16);
    const y = h - 10 - (recall / 100) * (h - 20);
    pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  const d = `M ${pts.join(' L ')}`;
  const youX = daysSince != null
    ? 8 + Math.min(1, daysSince / maxDay) * (w - 16)
    : null;

  return (
    <svg width={w} height={h} className="shrink-0 text-indigo-500" aria-hidden>
      <path d={d} fill="none" stroke="currentColor" strokeWidth="1.5" opacity={0.35} />
      {youX != null && (
        <line x1={youX} y1={8} x2={youX} y2={h - 8} stroke="currentColor" strokeWidth="1" strokeDasharray="4 3" opacity={0.9} />
      )}
      <text x={8} y={h - 1} fill="currentColor" fontSize={8} opacity={0.5}>Time →</text>
    </svg>
  );
}

export const SpacedRepMemoryPanel: React.FC = () => {
  const [topics, setTopics] = useState<SpacedRepTopicGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { topics: t } = await api.getSpacedRepTopics();
        if (!cancelled) setTopics(t);
      } catch {
        if (!cancelled) setTopics([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="neo-card p-5 flex items-center gap-3 text-slate-500">
        <div className="w-8 h-8 border-2 border-violet-200 border-t-violet-600 rounded-full animate-spin shrink-0" />
        <span className="text-sm">Loading spaced-repetition memory…</span>
      </div>
    );
  }

  if (topics.length === 0) {
    return (
      <div className="neo-card p-5 border-dashed border-slate-200 dark:border-slate-700">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-2">
          <i className="fas fa-wave-square text-violet-500" /> Spaced repetition memory
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Quiz on study-run outline nodes to start FSRS scheduling. You will see last review, next due date, and memory strength here—evidence that spaced practice is working.
        </p>
      </div>
    );
  }

  return (
    <div className="neo-card p-5">
      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-1">
        <i className="fas fa-wave-square text-violet-500" /> Spaced repetition memory
      </h3>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
        FSRS-scheduled: each node tracks memory stability (days until recall odds fall to ~90%) and difficulty independently. The curve shows your real predicted recall probability over time, not an approximation.
      </p>
      <div className="space-y-2">
        {topics.map((g) => {
          const key = g.normalizedTopic;
          const isOpen = open[key] ?? false;
          const retrievabilities = g.cards.map((c) => c.retrievability).filter((r): r is number => typeof r === 'number');
          const avgRetrievability = retrievabilities.length
            ? retrievabilities.reduce((s, r) => s + r, 0) / retrievabilities.length
            : null;
          const soonest = g.cards.reduce((a, c) => {
            const du = c.daysUntilDue;
            if (du == null) return a;
            if (a == null) return du;
            return Math.min(a, du);
          }, null as number | null);

          return (
            <div key={key} className="rounded-xl border border-slate-100 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/50 overflow-hidden">
              <button
                type="button"
                onClick={() => setOpen((o) => ({ ...o, [key]: !isOpen }))}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-white/60 dark:hover:bg-slate-700/30 transition-colors"
              >
                <span className="flex-1 min-w-0">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-100 capitalize truncate block">{g.topic}</span>
                  <span className="text-[10px] text-slate-500">
                    {g.cards.length} node{g.cards.length !== 1 ? 's' : ''}
                    {avgRetrievability != null ? ` · ~${Math.round(avgRetrievability * 100)}% recall now` : ''}
                    {soonest != null ? ` · next ${formatDue(soonest)}` : ''}
                  </span>
                </span>
                <i className={`fas fa-chevron-${isOpen ? 'up' : 'down'} text-slate-400 text-[10px] shrink-0`} />
              </button>
              {isOpen && (
                <ul className="border-t border-slate-100 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700">
                  {g.cards.map((c) => {
                    const stability = c.stability && c.stability > 0 ? c.stability : c.intervalDays;
                    return (
                      <li key={c.outlineNodeId} className="px-3 py-3 flex flex-col sm:flex-row sm:items-center gap-3 bg-white/50 dark:bg-slate-900/20">
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-bold text-slate-700 dark:text-slate-200">
                            {c.outlineLabel || c.outlineNodeId}
                          </p>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            Last review {c.daysSinceReview != null ? `${c.daysSinceReview}d ago` : '—'}
                            {' · '}
                            memory strength {stability.toFixed(1)}d
                            {typeof c.difficulty === 'number' && c.difficulty > 0 ? ` · difficulty ${c.difficulty.toFixed(1)}/10` : ''}
                            {typeof c.retrievability === 'number' ? ` · ${Math.round(c.retrievability * 100)}% recall now` : ''}
                            {' · '}
                            reps {c.repetitions}
                            {c.lapses ? ` · ${c.lapses} lapse${c.lapses !== 1 ? 's' : ''}` : ''}
                          </p>
                          <p className={`text-[10px] font-bold mt-1 ${c.daysUntilDue != null && c.daysUntilDue <= 0 ? 'text-rose-600 dark:text-rose-400' : 'text-violet-600 dark:text-violet-400'}`}>
                            Due {formatDue(c.daysUntilDue)}
                          </p>
                        </div>
                        <MemoryCurveSvg stability={stability} daysSince={c.daysSinceReview} />
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
