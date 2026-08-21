import React, { useCallback, useEffect, useState } from 'react';
import { api } from '@services/api';

type LearningEvent = {
  id: number;
  createdAt: string;
  policyType: string;
  armId: string;
  userId: string | null;
  topic: string | null;
  shownItem: { articleUid: string | null; position: number | null; boost: number | null };
  decision: { selectionSource: string | null; propensity: number | null; sourceEvent: string | null };
  interactions: Array<Record<string, unknown>>;
  reward: { immediate: number | null; delayed: number | null; total: number | null };
  attributionConfidence: number | null;
  updatedPolicy: {
    user: { alpha: number; beta: number; pulls: number; thompsonMean: number } | null;
    global: { alpha: number; beta: number; pulls: number; thompsonMean: number } | null;
  };
  learningQuality: { label: string; note: string };
};

function qualityCls(label: string): string {
  if (label === 'preference') return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
  if (label === 'noise_risk') return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300';
  if (label === 'pending') return 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400';
  return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
}

export function LearningEventInspectorPanel() {
  const [events, setEvents] = useState<LearningEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(7);
  const [onlyWithReward, setOnlyWithReward] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.knowledge.getLearningEvents({
        policyType: 'search_ranking',
        days,
        limit: 30,
        onlyWithReward,
      });
      setEvents((res.inspector?.events || []) as LearningEvent[]);
      setTotal(res.inspector?.total || 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load learning events');
    } finally {
      setLoading(false);
    }
  }, [days, onlyWithReward]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className="space-y-3 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">Learning event inspector</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            decision → shown item → interaction → reward → updated policy
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5"
          >
            <option value={3}>3d</option>
            <option value={7}>7d</option>
            <option value={30}>30d</option>
          </select>
          <label className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
            <input type="checkbox" checked={onlyWithReward} onChange={(e) => setOnlyWithReward(e.target.checked)} />
            Rewarded only
          </label>
          <button type="button" onClick={() => void load()} className="rounded-lg bg-slate-800 text-white px-3 py-1.5 font-semibold">
            Refresh
          </button>
        </div>
      </div>

      {loading && <p className="text-xs text-slate-400">Loading events…</p>}
      {error && <p className="text-xs text-rose-600">{error}</p>}

      {!loading && (
        <>
          <p className="text-[11px] text-slate-400">{total} events · showing {events.length}</p>
          <div className="space-y-2">
            {events.map((ev) => (
              <button
                key={ev.id}
                type="button"
                onClick={() => setExpandedId(expandedId === ev.id ? null : ev.id)}
                className="w-full text-left rounded-xl border border-slate-100 dark:border-slate-800 px-3 py-2 hover:bg-slate-50/80 dark:hover:bg-slate-900/40"
              >
                <div className="flex flex-wrap items-center gap-2 text-[11px]">
                  <span className={`rounded-full px-2 py-0.5 font-bold uppercase ${qualityCls(ev.learningQuality.label)}`}>
                    {ev.learningQuality.label.replace(/_/g, ' ')}
                  </span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">{ev.armId}</span>
                  <span className="text-slate-400">{ev.createdAt ? new Date(ev.createdAt).toLocaleString() : ''}</span>
                  <span className="text-slate-500 truncate max-w-[12rem]">{ev.topic || ev.shownItem.articleUid || '—'}</span>
                  <span className="ml-auto tabular-nums text-slate-600">
                    r={ev.reward.total != null ? ev.reward.total.toFixed(3) : '—'}
                    {ev.attributionConfidence != null ? ` · c=${ev.attributionConfidence.toFixed(2)}` : ''}
                  </span>
                </div>
                {expandedId === ev.id && (
                  <div className="mt-3 grid gap-2 md:grid-cols-2 text-[11px]">
                    <div className="space-y-1">
                      <p className="font-bold uppercase tracking-wider text-slate-400">Chain</p>
                      <ol className="list-decimal list-inside space-y-1 text-slate-600 dark:text-slate-300">
                        <li>
                          Decision: {ev.decision.selectionSource || 'bandit'} · propensity{' '}
                          {ev.decision.propensity != null ? ev.decision.propensity.toFixed(3) : '—'}
                        </li>
                        <li>
                          Shown: {ev.shownItem.articleUid || '—'} @ pos {ev.shownItem.position ?? '—'}
                          {ev.shownItem.boost != null ? ` (boost ${ev.shownItem.boost})` : ''}
                        </li>
                        <li>
                          Interactions: {ev.interactions.length
                            ? ev.interactions.map((i) => String(i.type)).join(', ')
                            : 'none logged'}
                        </li>
                        <li>
                          Reward: imm {ev.reward.immediate ?? '—'} / delay {ev.reward.delayed ?? '—'} / total{' '}
                          {ev.reward.total ?? '—'}
                        </li>
                        <li>
                          Policy α/β — user{' '}
                          {ev.updatedPolicy.user
                            ? `${ev.updatedPolicy.user.alpha.toFixed(2)}/${ev.updatedPolicy.user.beta.toFixed(2)} (μ=${ev.updatedPolicy.user.thompsonMean.toFixed(3)}, n=${ev.updatedPolicy.user.pulls})`
                            : '—'}
                          {' · '}global{' '}
                          {ev.updatedPolicy.global
                            ? `${ev.updatedPolicy.global.alpha.toFixed(2)}/${ev.updatedPolicy.global.beta.toFixed(2)}`
                            : '—'}
                        </li>
                      </ol>
                      <p className="text-slate-500 italic">{ev.learningQuality.note}</p>
                    </div>
                    <div>
                      <p className="font-bold uppercase tracking-wider text-slate-400 mb-1">Interactions</p>
                      <pre className="whitespace-pre-wrap break-all rounded-lg bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 p-2 max-h-40 overflow-auto text-slate-600 dark:text-slate-300">
                        {JSON.stringify(ev.interactions, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </button>
            ))}
            {events.length === 0 && (
              <p className="text-xs text-slate-400 py-4 text-center">No learning events in this window.</p>
            )}
          </div>
        </>
      )}
    </section>
  );
}
