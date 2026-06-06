import React, { useState, useEffect } from 'react';
import { useSearchContext } from '@contexts/SearchContext';
import { useAuth } from '@contexts/AuthContext';
import api from '@services/api';

interface DayStat {
  date: string;
  searches: number;
  analyses: number;
}

interface PopularSearch {
  query: string;
  count: number;
}

interface QualityMetricBlock {
  sampleSize?: number;
  mrr?: number | null;
  ndcgAt10?: number | null;
  ctrTop3?: number | null;
  ctrTop10?: number | null;
  timeToRelevantPaperMs?: number | null;
  factualAccuracyScore?: number | null;
  completenessScore?: number | null;
  clinicalUsefulnessScore?: number | null;
  avgTimeSavedMinutes?: number | null;
  citationValidationPassRate?: number | null;
  retentionImprovementRate?: number | null;
  avgSearchRefinementDepth?: number | null;
  avgKnowledgeMemoryScore?: number | null;
  recommendationSatisfactionRate?: number | null;
}

function formatRate(value: number | null | undefined, digits = 2) {
  if (value == null || Number.isNaN(value)) return '—';
  return value.toFixed(digits);
}

function MetricTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-white/70 dark:bg-slate-900/40 p-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
      <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">{value}</p>
      {hint && <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{hint}</p>}
    </div>
  );
}

// Simple SVG bar chart — no external deps
const BarChart: React.FC<{ data: DayStat[]; days: number }> = ({ data, days }) => {
  const recent = data.slice(-days);
  const maxVal = Math.max(...recent.map((d) => d.searches), 1);
  const barWidth = Math.max(4, Math.floor(600 / recent.length) - 2);

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 620 120`} className="w-full h-28" preserveAspectRatio="none">
        {recent.map((d, i) => {
          const barH = Math.max(2, (d.searches / maxVal) * 90);
          const x = i * (barWidth + 2) + 10;
          return (
            <g key={d.date}>
              <rect
                x={x}
                y={110 - barH}
                width={barWidth}
                height={barH}
                rx={2}
                className="fill-indigo-500 dark:fill-indigo-400 opacity-80"
              />
              {d.analyses > 0 && (
                <rect
                  x={x}
                  y={110 - barH - Math.max(2, (d.analyses / maxVal) * 90)}
                  width={barWidth}
                  height={Math.max(2, (d.analyses / maxVal) * 90)}
                  rx={2}
                  className="fill-purple-400 dark:fill-purple-300 opacity-60"
                />
              )}
            </g>
          );
        })}
      </svg>
      <div className="flex justify-between text-[10px] text-gray-400 mt-1 px-2">
        <span>{recent[0]?.date?.slice(5)}</span>
        <span>{recent[Math.floor(recent.length / 2)]?.date?.slice(5)}</span>
        <span>{recent[recent.length - 1]?.date?.slice(5)}</span>
      </div>
    </div>
  );
};

export const AnalyticsPage: React.FC = () => {
  const { setCurrentPage, savedArticles } = useSearchContext();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [summary, setSummary] = useState<{
    dailyStats: DayStat[];
    popularSearches: PopularSearch[];
  } | null>(null);
  const [loading, setLoading] = useState(!!isAdmin);
  const [error, setError] = useState('');
  const [range, setRange] = useState<7 | 14 | 30>(30);
  const [qualityMetrics, setQualityMetrics] = useState<{
    search?: QualityMetricBlock;
    synthesis?: QualityMetricBlock;
    learningAgent?: QualityMetricBlock;
  } | null>(null);

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError('');
        const [data, quality] = await Promise.all([
          api.getAnalyticsSummary(),
          api.getQualityMetrics(range),
        ]);
        if (!cancelled) {
          setSummary(data);
          setQualityMetrics(quality as {
            search?: QualityMetricBlock;
            synthesis?: QualityMetricBlock;
            learningAgent?: QualityMetricBlock;
          });
        }
      } catch {
        if (!cancelled) setError('Failed to load analytics. Make sure the server is running.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isAdmin, range]);

  const dailyStats = summary?.dailyStats ?? [];
  const popularSearches = summary?.popularSearches ?? [];
  const recentAnalyses = React.useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('med_recent_analyses') || '[]') as Array<{ title: string; year?: number; journal?: string; source?: string; keywords?: string[] }>;
    } catch {
      return [];
    }
  }, []);

  const totalSearches = dailyStats.slice(-range).reduce((s, d) => s + (d.searches ?? 0), 0);
  const totalAnalyses = dailyStats.slice(-range).reduce((s, d) => s + (d.analyses ?? 0), 0);
  const maxPopular = Math.max(...popularSearches.map((p) => p.count), 1);
  const readingVelocity = Math.round((savedArticles.length + recentAnalyses.length) / Math.max(1, range / 7));
  const topicTerms = React.useMemo(() => {
    const terms = new Map<string, number>();
    [...savedArticles, ...recentAnalyses].forEach((article) => {
      const text = [article.title, article.journal || article.source, ...(article.keywords || [])].join(' ').toLowerCase();
      text.split(/[^a-z0-9]+/).filter((term) => term.length > 4 && !['study', 'trial', 'patients', 'clinical', 'research'].includes(term)).forEach((term) => {
        terms.set(term, (terms.get(term) || 0) + 1);
      });
    });
    return [...terms.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);
  }, [recentAnalyses, savedArticles]);
  const missedOpportunity = popularSearches.find((item) =>
    !savedArticles.some((article) => article.title.toLowerCase().includes(item.query.toLowerCase().split(/\s+/)[0] || item.query.toLowerCase()))
  );

  const personalHint =
    savedArticles.length > 0
      ? `You've saved ${savedArticles.length} paper${savedArticles.length === 1 ? '' : 's'}. Re-run a search sorted by date to capture newer evidence before you write.`
      : 'Save papers from search to build a personal evidence set; this page summarizes patterns from your saved library and recent analyses on this device.';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 pb-20 aurora-bg">
      <div className="aurora-content">
      {/* Header */}
      <header className="max-w-7xl mx-auto px-4 pt-10 pb-12">
        <button
          onClick={() => setCurrentPage('search')}
          className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 hover:text-indigo-600 transition-colors flex items-center gap-2"
        >
          <i className="fas fa-arrow-left" /> Back to Search
        </button>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 rounded-2xl flex items-center justify-center shadow-lg shadow-fuchsia-400/30">
              <i className="fas fa-chart-bar text-white text-xl" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-900 dark:text-white">Research &amp; usage analytics</h1>
              <p className="text-sm text-gray-400">
                Personal signals from your saved library and recent analyses; administrators also see whole-deployment search and AI activity.
              </p>
            </div>
          </div>
          <div className="flex rounded-xl bg-white/90 dark:bg-slate-800/90 border border-gray-200 dark:border-slate-700 p-1 gap-1 shadow-sm">
            {([7, 14, 30] as const).map((d) => (
              <button
                key={d}
                onClick={() => setRange(d)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  range === d
                    ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 space-y-6">
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-3xl leading-relaxed">
          The range toggle adjusts how &ldquo;reading velocity&rdquo; is annualized from your saved items and recent analyses.
          {isAdmin ? ' As an admin, it also selects the window shown in deployment-wide charts (last 7 / 14 / 30 days).' : ''}
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="neo-card rounded-2xl p-6">
            <h2 className="font-bold text-gray-900 dark:text-white mb-2">Reading velocity</h2>
            <p className="text-4xl font-black text-emerald-600 dark:text-emerald-400">{readingVelocity}</p>
            <p className="text-xs text-gray-400 mt-1">papers per week (saved + recent analyses on this browser)</p>
          </div>
          <div className="neo-card rounded-2xl p-6 lg:col-span-2">
            <h2 className="font-bold text-gray-900 dark:text-white mb-4">Personal topic graph</h2>
            {topicTerms.length === 0 ? (
              <p className="text-sm text-gray-400">Save or analyze papers to build a simple keyword picture of your focus areas.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {topicTerms.map(([term, count]) => (
                  <span
                    key={term}
                    className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700 ring-1 ring-indigo-100 dark:bg-indigo-950/30 dark:text-indigo-300 dark:ring-indigo-900"
                    style={{ fontSize: `${Math.min(18, 11 + count)}px` }}
                  >
                    {term}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="neo-card rounded-2xl p-6">
          <h2 className="font-bold text-gray-900 dark:text-white mb-2">Suggested next step</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {isAdmin && missedOpportunity
              ? `Org-wide, "${missedOpportunity.query}" was run ${missedOpportunity.count} times. Pair that traffic with the guideline library and newest papers before you freeze an evidence set.`
              : personalHint}
          </p>
        </div>

        {!isAdmin && (
          <div className="neo-card rounded-2xl p-6 border border-amber-100 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/20">
            <h2 className="font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
              <i className="fas fa-building text-amber-600 text-sm" />
              Deployment-wide metrics
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              Aggregate search volume, AI analysis counts, and popular queries across your entire installation are visible to users with the administrator role—useful for deanery or hospital ops reviews.
              Ask your org admin if you need that view.
            </p>
          </div>
        )}

        {isAdmin && loading && (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          </div>
        )}

        {isAdmin && !loading && error && (
          <div className="p-6 bg-red-50 dark:bg-red-900/20 rounded-2xl text-center text-red-600 dark:text-red-300">
            <i className="fas fa-exclamation-circle text-2xl mb-2 block" />
            {error}
          </div>
        )}

        {isAdmin && !loading && !error && (
          <>
            <h2 className="text-lg font-black text-gray-900 dark:text-white pt-2">Whole-deployment activity</h2>
            <p className="text-xs text-gray-400 -mt-1 mb-2">From server logs: searches and analyses recorded for all users.</p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                {
                  label: `Searches (${range}d)`,
                  value: totalSearches,
                  icon: 'fa-search',
                  color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20',
                },
                {
                  label: `AI analyses (${range}d)`,
                  value: totalAnalyses,
                  icon: 'fa-robot',
                  color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20',
                },
                {
                  label: 'Tracked query buckets',
                  value: popularSearches.length,
                  icon: 'fa-layer-group',
                  color: 'text-teal-600 bg-teal-50 dark:bg-teal-900/20',
                },
              ].map((card) => (
                <div
                  key={card.label}
                  className="neo-card rounded-2xl p-5 hover-float"
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${card.color}`}>
                    <i className={`fas ${card.icon}`} />
                  </div>
                  <p className="text-3xl font-black text-gray-900 dark:text-white">{card.value.toLocaleString()}</p>
                  <p className="text-xs text-gray-400 mt-1">{card.label}</p>
                </div>
              ))}
            </div>

            <div className="neo-card rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-gray-900 dark:text-white">Daily activity</h2>
                <div className="flex items-center gap-4 text-xs text-gray-400">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-indigo-500 inline-block" />
                    Searches
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-purple-400 inline-block opacity-60" />
                    Analyses
                  </span>
                </div>
              </div>
              {dailyStats.length > 0 ? (
                <BarChart data={dailyStats} days={range} />
              ) : (
                <p className="text-center text-gray-400 py-10 text-sm">No activity data yet.</p>
              )}
            </div>

            <div className="space-y-4">
              <h2 className="text-lg font-black text-gray-900 dark:text-white">Product quality metrics</h2>
              <p className="text-xs text-gray-400 -mt-2">Search MRR/NDCG from impressions; synthesis and learning agent from user feedback and learning events.</p>

              <div className="neo-card rounded-2xl p-6 space-y-4">
                <h3 className="font-bold text-gray-900 dark:text-white">Search quality</h3>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <MetricTile label="MRR" value={formatRate(qualityMetrics?.search?.mrr)} hint={`n=${qualityMetrics?.search?.sampleSize ?? 0} searches`} />
                  <MetricTile label="NDCG@10" value={formatRate(qualityMetrics?.search?.ndcgAt10)} />
                  <MetricTile label="CTR top 3" value={formatRate(qualityMetrics?.search?.ctrTop3)} />
                  <MetricTile label="Time to relevant" value={qualityMetrics?.search?.timeToRelevantPaperMs != null ? `${Math.round(qualityMetrics.search.timeToRelevantPaperMs / 1000)}s` : '—'} hint="avg click latency" />
                </div>
              </div>

              <div className="neo-card rounded-2xl p-6 space-y-4">
                <h3 className="font-bold text-gray-900 dark:text-white">Synthesis quality</h3>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <MetricTile label="Factual accuracy" value={formatRate(qualityMetrics?.synthesis?.factualAccuracyScore, 1)} hint={`n=${qualityMetrics?.synthesis?.sampleSize ?? 0}`} />
                  <MetricTile label="Completeness" value={formatRate(qualityMetrics?.synthesis?.completenessScore, 1)} />
                  <MetricTile label="Clinical usefulness" value={formatRate(qualityMetrics?.synthesis?.clinicalUsefulnessScore, 1)} />
                  <MetricTile label="Time saved" value={qualityMetrics?.synthesis?.avgTimeSavedMinutes != null ? `${formatRate(qualityMetrics.synthesis.avgTimeSavedMinutes, 0)} min` : '—'} />
                </div>
              </div>

              <div className="neo-card rounded-2xl p-6 space-y-4">
                <h3 className="font-bold text-gray-900 dark:text-white">Learning agent</h3>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <MetricTile label="Retention" value={formatRate(qualityMetrics?.learningAgent?.retentionImprovementRate != null ? qualityMetrics.learningAgent.retentionImprovementRate * 100 : null, 0) + (qualityMetrics?.learningAgent?.retentionImprovementRate != null ? '%' : '')} />
                  <MetricTile label="Query refinement" value={formatRate(qualityMetrics?.learningAgent?.avgSearchRefinementDepth, 1)} hint="avg session depth" />
                  <MetricTile label="Knowledge score" value={formatRate(qualityMetrics?.learningAgent?.avgKnowledgeMemoryScore, 0)} />
                  <MetricTile label="Satisfaction" value={formatRate(qualityMetrics?.learningAgent?.recommendationSatisfactionRate != null ? qualityMetrics.learningAgent.recommendationSatisfactionRate * 100 : null, 0) + (qualityMetrics?.learningAgent?.recommendationSatisfactionRate != null ? '%' : '')} />
                </div>
              </div>
            </div>

            <div className="neo-card rounded-2xl p-6">
              <h2 className="font-bold text-gray-900 dark:text-white mb-5">Top searches (deployment)</h2>
              {popularSearches.length === 0 ? (
                <p className="text-center text-gray-400 py-6 text-sm">No searches recorded yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[34rem] text-left">
                    <caption className="sr-only">Top deployment searches ranked by query count</caption>
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800">
                        <th scope="col" className="w-14 px-2 py-2 text-xs font-bold uppercase text-slate-400">Rank</th>
                        <th scope="col" className="px-2 py-2 text-xs font-bold uppercase text-slate-400">Query</th>
                        <th scope="col" className="w-24 px-2 py-2 text-right text-xs font-bold uppercase text-slate-400">Count</th>
                        <th scope="col" className="w-36 px-2 py-2 text-xs font-bold uppercase text-slate-400">Relative volume</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {popularSearches.slice(0, 20).map((item, i) => (
                        <tr key={item.query}>
                          <td className="px-2 py-3 text-right text-xs font-bold text-gray-300 dark:text-slate-600">{i + 1}</td>
                          <th scope="row" className="px-2 py-3 text-left text-sm font-medium text-gray-800 dark:text-gray-200">{item.query}</th>
                          <td className="px-2 py-3 text-right text-xs text-gray-400">{item.count}x</td>
                          <td className="px-2 py-3">
                            <div className="h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-slate-700" aria-hidden="true">
                              <div
                                className="h-full rounded-full bg-indigo-500 transition-all"
                                style={{ width: `${(item.count / maxPopular) * 100}%` }}
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </main>
      </div>
    </div>
  );
};
