import React, { useEffect, useState } from 'react';
import { api } from '@services/api';
import { handleAsyncError } from '@utils/handleAsyncError';

interface ClaimMasteryRow {
  claimKey: string;
  claimText: string;
  masteryProbability: number | null;
  masteryState: 'untested' | 'weak' | 'mastered' | string;
  attempts: number;
}

/**
 * Surfaces the Bayesian Knowledge Tracing mastery probability per verified
 * claim for this topic — computed by getUserClaimMastery on every quiz
 * submission but, before this panel, never shown anywhere in the app.
 */
export const ClaimMasteryPanel: React.FC<{ topic: string }> = ({ topic }) => {
  const [claims, setClaims] = useState<ClaimMasteryRow[]>([]);
  const [summary, setSummary] = useState<{ total: number; weak: number; mastered: number; untested: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!topic || topic.trim().length < 2) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    api.knowledge.getClaimMastery(topic, 40)
      .then((data) => {
        if (cancelled) return;
        setClaims(data.claims || []);
        setSummary(data.summary || null);
      })
      .catch((err) => { if (!cancelled) { handleAsyncError(err, 'ClaimMasteryPanel/getClaimMastery'); setClaims([]); setSummary(null); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [topic]);

  if (loading || !summary || summary.total === 0) return null;

  const weakest = [...claims]
    .filter((c) => c.attempts > 0)
    .sort((a, b) => (a.masteryProbability ?? 1) - (b.masteryProbability ?? 1))
    .slice(0, 5);

  if (weakest.length === 0) return null;

  return (
    <div className="neo-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
          <i className="fas fa-brain text-violet-500" /> Claim mastery
        </p>
        <span className="text-[10px] text-slate-400">
          {summary.mastered} mastered · {summary.weak} weak · {summary.untested} untested
        </span>
      </div>
      <ul className="space-y-2">
        {weakest.map((claim) => {
          const pct = claim.masteryProbability != null ? Math.round(claim.masteryProbability * 100) : null;
          const barColor = pct == null ? 'bg-slate-300' : pct >= 75 ? 'bg-emerald-500' : pct >= 40 ? 'bg-amber-500' : 'bg-rose-500';
          return (
            <li key={claim.claimKey} className="flex items-center gap-3">
              <p className="flex-1 min-w-0 text-[11px] text-slate-600 dark:text-slate-300 truncate" title={claim.claimText}>
                {claim.claimText}
              </p>
              <div className="w-20 shrink-0 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <div className={`h-full ${barColor} rounded-full transition-all`} data-pct={pct ?? 0}
                  style={{ width: `${pct ?? 0}%` }} />
              </div>
              <span className="w-9 shrink-0 text-right text-[10px] font-bold text-slate-500 dark:text-slate-400">
                {pct != null ? `${pct}%` : '—'}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
