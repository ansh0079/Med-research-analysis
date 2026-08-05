import type { LearningHealthResponse } from '@types';

export function LearningHealthPanel({ health, loading, error, onRefresh }: {
  health: LearningHealthResponse['health'] | null;
  loading: boolean;
  error: string;
  onRefresh: () => void;
}) {
  if (loading) return <p className="text-sm text-slate-400">Loading learning health...</p>;
  if (error) {
    return (
      <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600 dark:bg-red-950/30">
        {error}
      </div>
    );
  }
  if (!health) return <p className="text-sm text-slate-400">No learning health data yet.</p>;

  const vectorPct = Math.round((health.vectorUsage.usageRate || 0) * 100);
  const latestRun = health.schedulerRuns[0];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Learning System</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Generated {new Date(health.generatedAt).toLocaleString()}
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <i className="fas fa-sync-alt mr-1" /> Refresh
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Vector Usage</p>
          <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">{vectorPct}%</p>
          <p className="text-[11px] text-slate-400">{health.vectorUsage.used}/{health.vectorUsage.total} searches</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Refresh Queue</p>
          <p className="mt-1 text-2xl font-black text-amber-600">{health.refreshCandidates.length}</p>
          <p className="text-[11px] text-slate-400">decay-prioritized topics</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Low Recall</p>
          <p className="mt-1 text-2xl font-black text-rose-600">{health.lowRecall.items.length}</p>
          <p className="text-[11px] text-slate-400">last {health.lowRecall.days} days</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Alias Seeded</p>
          <p className="mt-1 text-2xl font-black text-indigo-600">{health.aliasSeededTopics.length}</p>
          <p className="text-[11px] text-slate-400">placeholder topics</p>
        </div>
      </div>

      {(health.teachingObjects || health.freshness) && (
        <div className="grid gap-4 lg:grid-cols-2">
          {health.teachingObjects && (
            <div className="rounded-xl border border-slate-100 p-4 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Teaching Objects</p>
                  <p className="text-2xl font-black text-emerald-600">{health.teachingObjects.total}</p>
                </div>
                <div className="text-right text-[11px] text-slate-400">
                  {health.teachingObjects.byType.map((item) => (
                    <p key={item.objectType}>{item.objectType}: {item.count}</p>
                  ))}
                </div>
              </div>
              <div className="mt-3 space-y-2">
                {health.teachingObjects.recent.slice(0, 3).map((item) => (
                  <div key={item.objectKey} className="text-xs">
                    <p className="font-bold text-slate-800 dark:text-slate-200 line-clamp-1">{item.title || item.objectKey}</p>
                    <p className="text-slate-400">{item.objectType} / {item.topic || 'no topic'}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {health.freshness && (
            <div className="rounded-xl border border-slate-100 p-4 dark:border-slate-800">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Freshness Alerts</p>
              <div className="mt-3 space-y-2">
                {health.freshness.staleTopics.slice(0, 3).map((item) => (
                  <div key={item.normalizedTopic} className="flex items-center justify-between gap-3 text-xs">
                    <span className="font-bold text-slate-800 dark:text-slate-200">{item.displayTopic}</span>
                    <span className="text-amber-600">{Math.round((item.confidenceDecay || 0) * 100)}% decay</span>
                  </div>
                ))}
                {health.freshness.strongMemoryRefresh.slice(0, 3).map((item) => (
                  <div key={item.normalizedTopic} className="flex items-center justify-between gap-3 text-xs">
                    <span className="font-bold text-slate-800 dark:text-slate-200">{item.displayTopic}</span>
                    <span className="text-blue-600">engaged {Math.round(item.communityEngagementScore || 0)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {latestRun && (
        <div className="rounded-xl border border-slate-100 p-4 dark:border-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Latest scheduler run</p>
              <p className="text-[11px] text-slate-400">{new Date(latestRun.startedAt).toLocaleString()}</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold uppercase text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {latestRun.status}
            </span>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-4 text-xs">
            <span>{latestRun.candidatesCount} candidates</span>
            <span>{latestRun.refreshedCount} refreshed</span>
            <span>{latestRun.skippedCount} skipped</span>
            <span>{latestRun.errorCount} errors</span>
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-400">Top Bouquet Signals</p>
          <div className="space-y-2">
            {health.topBouquetTopics.slice(0, 6).map((item) => (
              <div key={item.normalizedTopic} className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{item.displayTopic}</p>
                <p className="text-[11px] text-slate-400">{item.totalSignals} signals · {item.distinctArticles} papers</p>
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-400">Refresh Candidates</p>
          <div className="space-y-2">
            {health.refreshCandidates.slice(0, 6).map((item) => (
              <div key={item.normalizedTopic} className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{item.displayTopic}</p>
                  <span className="text-[10px] font-bold text-amber-600">{item.priorityScore.toFixed(2)}</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  {item.volatility} · decay {Math.round((item.confidenceDecay || 0) * 100)}% · effective {Math.round((item.effectiveConfidence || 0) * 100)}%
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-400">Low-Recall Queries</p>
        <div className="space-y-2">
          {health.lowRecall.items.slice(0, 6).map((item) => (
            <div key={`${item.normalizedTopic}-${item.displayQuery}`} className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{item.displayQuery}</p>
              <p className="text-[11px] text-slate-400">
                {item.attemptCount} attempts · {item.resultCount} results · aliases: {item.expandedAliases.slice(0, 4).join(', ') || 'none'}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
