import React, { useCallback, useEffect, useState } from 'react';
import { api } from '@services/api';

type EvalRun = {
  id: number;
  recommendation: string;
  reason: string | null;
  servingArmId: string | null;
  bestShadowArmId: string | null;
  servingScore: number | null;
  bestShadowScore: number | null;
  lift: number | null;
  labelledCount: number;
  propensityCoverage: number | null;
  createdAt: string;
};

function recCls(rec: string): string {
  if (rec === 'promote') return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
  if (rec === 'regress') return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300';
  return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
}

export function OfflineEvalPanel() {
  const [runs, setRuns] = useState<EvalRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.knowledge.getOfflineEvalRuns({ limit: 12 });
      setRuns(res.runs || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load offline eval runs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const trigger = async () => {
    setTriggering(true);
    try {
      await api.knowledge.triggerOfflineEvalRun({ days: 30 });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Trigger failed');
    } finally {
      setTriggering(false);
    }
  };

  return (
    <section className="space-y-3 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">Offline eval (real logs)</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Nightly IPS replay: promote / hold / regress recommendation
          </p>
        </div>
        <button
          type="button"
          disabled={triggering}
          onClick={() => void trigger()}
          className="rounded-lg bg-slate-800 text-white px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
        >
          {triggering ? 'Running…' : 'Run now'}
        </button>
      </div>
      {loading && <p className="text-xs text-slate-400">Loading…</p>}
      {error && <p className="text-xs text-rose-600">{error}</p>}
      <ul className="space-y-2">
        {runs.map((run) => (
          <li key={run.id} className="rounded-xl border border-slate-100 dark:border-slate-800 px-3 py-2 text-[11px]">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 font-bold uppercase ${recCls(run.recommendation)}`}>
                {run.recommendation}
              </span>
              <span className="text-slate-500">{run.createdAt ? new Date(run.createdAt).toLocaleString() : ''}</span>
              <span className="text-slate-600">
                serve {run.servingArmId} ({run.servingScore != null ? run.servingScore.toFixed(3) : '—'})
                {' → '}
                shadow {run.bestShadowArmId} ({run.bestShadowScore != null ? run.bestShadowScore.toFixed(3) : '—'})
              </span>
              <span className="text-slate-400 ml-auto">
                n={run.labelledCount}
                {run.propensityCoverage != null ? ` · prop ${(run.propensityCoverage * 100).toFixed(0)}%` : ''}
                {run.lift != null ? ` · lift ${run.lift.toFixed(3)}` : ''}
              </span>
            </div>
            {run.reason && <p className="mt-1 text-slate-500">{run.reason}</p>}
          </li>
        ))}
        {!loading && runs.length === 0 && (
          <p className="text-xs text-slate-400 py-3 text-center">No offline eval runs yet. Trigger one or wait for the nightly job.</p>
        )}
      </ul>
    </section>
  );
}
