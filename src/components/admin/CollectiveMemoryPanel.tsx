import React, { useCallback, useEffect, useState } from 'react';
import { api } from '@services/api';

export function CollectiveMemoryPanel() {
  const [stats, setStats] = useState<{
    topicsWithAttempts: number;
    totalAttempts: number;
    topicsWithMemory: number;
    trackedPsychometricItems?: number;
    unreliablePsychometricItems?: number;
    topTopics: { normalized_topic: string; attempts: number; users: number }[];
  } | null>(null);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{ topics: number; message: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    try {
      setStats(await api.collaboration.getAggregateMemoryStats());
    } catch { /* no quiz data yet */ }
  }, []);

  useEffect(() => { void loadStats(); }, [loadStats]);

  const run = async () => {
    setRunning(true);
    setResult(null);
    setErr(null);
    try {
      setResult(await api.collaboration.runAggregateMemory());
      await loadStats();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Aggregation failed');
    } finally {
      setRunning(false);
    }
  };

  return (
    <section className="neo-card p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Collective memory</h2>
          <p className="text-xs text-slate-500 mt-1">
            Aggregates quiz attempt patterns across all users per topic - misconceptions, difficulty bands, unique-user counts.
            Run after users complete quizzes to improve future quiz generation.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void run()}
          disabled={running}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
        >
          {running ? <><i className="fas fa-spinner fa-spin" /> Running...</> : <><i className="fas fa-sync-alt" /> Aggregate now</>}
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-3 gap-3 text-xs">
          {[
            { label: 'Topics with attempts', value: stats.topicsWithAttempts },
            { label: 'Total quiz attempts', value: stats.totalAttempts },
            { label: 'Topics with memory', value: stats.topicsWithMemory },
          ].map(c => (
            <div key={c.label} className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
              <p className="text-xl font-black text-slate-900 dark:text-white">{c.value}</p>
              <p className="text-slate-500 mt-0.5">{c.label}</p>
            </div>
          ))}
        </div>
      )}

      {stats && (stats.trackedPsychometricItems ?? 0) > 0 && (
        <div className={`rounded-lg border px-3 py-2 text-xs ${
          (stats.unreliablePsychometricItems ?? 0) > 0
            ? 'border-amber-200 bg-amber-50/70 text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200'
            : 'border-emerald-200 bg-emerald-50/70 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-200'
        }`}>
          <i className={`fas ${(stats.unreliablePsychometricItems ?? 0) > 0 ? 'fa-hourglass-half' : 'fa-check-circle'} mr-2`} />
          {(stats.unreliablePsychometricItems ?? 0) > 0
            ? `${stats.unreliablePsychometricItems} of ${stats.trackedPsychometricItems} tracked items have fewer than 30 attempts — psychometric estimates are preliminary. Review per-topic details in Knowledge Review → Learning Health.`
            : `${stats.trackedPsychometricItems} tracked items meet the 30-attempt reliability threshold.`}
        </div>
      )}

      {result && (
        <p className="text-xs font-semibold text-emerald-600">OK {result.message}</p>
      )}
      {err && (
        <p className="text-xs text-rose-600">{err}</p>
      )}

      {stats && stats.topTopics.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Most active topics</p>
          <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
            {stats.topTopics.map(t => (
              <li key={t.normalized_topic} className="flex justify-between gap-2">
                <span className="truncate">{t.normalized_topic}</span>
                <span className="shrink-0 text-slate-400">{t.attempts} attempts - {t.users} users</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
