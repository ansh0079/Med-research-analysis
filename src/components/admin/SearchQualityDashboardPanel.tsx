import React from 'react';
import type { SearchQualityDashboard, SearchRankerPromotionGate } from '@services/api/knowledgeAdmin';

function formatRate(value: number | null | undefined) {
  return value == null ? '-' : `${Math.round(value * 100)}%`;
}

function formatMs(value: number | null | undefined) {
  return value == null ? '-' : `${Math.round(value)} ms`;
}

function metricTone(value: number | null | undefined, warnAt: number, invert = false) {
  if (value == null) return 'text-slate-500';
  const bad = invert ? value <= warnAt : value >= warnAt;
  return bad ? 'text-amber-600' : 'text-emerald-600';
}

function checkTone(status: string) {
  if (status === 'pass') return 'text-emerald-600';
  if (status === 'fail') return 'text-rose-600';
  return 'text-amber-600';
}

function displayGateValue(value: unknown) {
  if (typeof value === 'number') {
    return value > 0 && value < 1 ? formatRate(value) : String(Math.round(value * 100) / 100);
  }
  return value == null ? '-' : String(value);
}

export function SearchQualityDashboardPanel({ dashboard, gate }: { dashboard: SearchQualityDashboard; gate?: SearchRankerPromotionGate | null }) {
  const sourceRows = Object.entries(dashboard.sourceCache);
  const intentRows = Object.entries(dashboard.intentMix)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  return (
    <section className="neo-card p-4 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Search quality</h2>
          <p className="text-xs text-slate-500 mt-1">
            Live retrieval, cache, intent routing, and shadow-ranker signals for the last {dashboard.windowDays} days.
          </p>
        </div>
        <p className="text-[10px] text-slate-400">{new Date(dashboard.generatedAt).toLocaleString()}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
          <p className="text-[10px] text-slate-500">Searches</p>
          <p className="text-xl font-black text-slate-900 dark:text-white">{dashboard.summary.searches}</p>
        </div>
        <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
          <p className="text-[10px] text-slate-500">Zero results</p>
          <p className={`text-xl font-black ${metricTone(dashboard.summary.zeroResultRate, 0.08)}`}>
            {formatRate(dashboard.summary.zeroResultRate)}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
          <p className="text-[10px] text-slate-500">Result cache</p>
          <p className="text-xl font-black text-slate-900 dark:text-white">{formatRate(dashboard.summary.resultSetCacheHitRate)}</p>
        </div>
        <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
          <p className="text-[10px] text-slate-500">P95 latency</p>
          <p className={`text-xl font-black ${metricTone(dashboard.summary.p95LatencyMs, 6000)}`}>
            {formatMs(dashboard.summary.p95LatencyMs)}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
          <p className="text-[10px] text-slate-500">CTR</p>
          <p className={`text-xl font-black ${metricTone(dashboard.summary.clickThroughRate, 0.08, true)}`}>
            {formatRate(dashboard.summary.clickThroughRate)}
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Intent mix</p>
          {intentRows.length ? intentRows.map(([intent, count]) => (
            <div key={intent} className="flex items-center justify-between border-b border-slate-100 py-1 text-xs dark:border-slate-800">
              <span className="font-semibold text-slate-700 dark:text-slate-200">{intent.replace(/_/g, ' ')}</span>
              <span className="font-mono text-slate-500">{count}</span>
            </div>
          )) : <p className="text-xs text-slate-400">No intent data yet.</p>}
        </div>

        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Source cache</p>
          {sourceRows.length ? sourceRows.map(([source, stats]) => (
            <div key={source} className="flex items-center justify-between border-b border-slate-100 py-1 text-xs dark:border-slate-800">
              <span className="font-semibold text-slate-700 dark:text-slate-200">{source}</span>
              <span className="font-mono text-slate-500">{formatRate(stats.hitRate)} hit</span>
            </div>
          )) : <p className="text-xs text-slate-400">No source-cache data yet.</p>}
        </div>

        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Shadow ranker</p>
          <div className="flex items-center justify-between border-b border-slate-100 py-1 text-xs dark:border-slate-800">
            <span className="font-semibold text-slate-700 dark:text-slate-200">Samples</span>
            <span className="font-mono text-slate-500">{dashboard.shadowRanker.sampleSize}</span>
          </div>
          <div className="flex items-center justify-between border-b border-slate-100 py-1 text-xs dark:border-slate-800">
            <span className="font-semibold text-slate-700 dark:text-slate-200">Top-1 changed</span>
            <span className="font-mono text-slate-500">{formatRate(dashboard.shadowRanker.top1ChangeRate)}</span>
          </div>
          <div className="flex items-center justify-between border-b border-slate-100 py-1 text-xs dark:border-slate-800">
            <span className="font-semibold text-slate-700 dark:text-slate-200">Mean rank delta</span>
            <span className="font-mono text-slate-500">{dashboard.shadowRanker.meanAbsoluteRankDelta?.toFixed(2) ?? '-'}</span>
          </div>
        </div>
      </div>

      {gate && (
        <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Ranker promotion gate</p>
              <p className={`mt-1 text-sm font-black ${gate.recommendation === 'promote' ? 'text-emerald-600' : 'text-amber-600'}`}>
                {gate.recommendation === 'promote' ? 'Ready to promote' : 'Hold shadow ranker'}
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-2 py-1 font-mono text-[10px] text-slate-500 dark:bg-slate-800">
              {gate.rolloutEnv.currentMode}
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-500">{gate.reason}</p>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {gate.checks.map((check) => (
              <div key={check.id} className="flex items-center justify-between gap-3 border-t border-slate-100 pt-2 text-xs dark:border-slate-800">
                <span className="font-semibold text-slate-700 dark:text-slate-200">{check.label}</span>
                <span className={`font-mono ${checkTone(check.status)}`} title={check.threshold}>
                  {check.status}: {displayGateValue(check.value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {dashboard.lowRecallQueries.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Low recall</p>
          <div className="grid gap-2 md:grid-cols-2">
            {dashboard.lowRecallQueries.slice(0, 6).map((row) => (
              <div key={`${row.normalizedTopic}-${row.query}`} className="rounded-lg border border-slate-200 px-3 py-2 text-xs dark:border-slate-700">
                <p className="font-semibold text-slate-700 dark:text-slate-200">{row.query}</p>
                <p className="mt-1 text-[10px] text-slate-500">{row.attemptCount} attempts, {row.resultCount} results</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
