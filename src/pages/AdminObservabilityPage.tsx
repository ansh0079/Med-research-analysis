import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@services/api';
import { useAuth } from '@contexts/AuthContext';
import { VerificationBadge } from '@components/ui/VerificationBadge';

function CollectiveMemoryPanel() {
  const [stats, setStats] = useState<{
    topicsWithAttempts: number;
    totalAttempts: number;
    topicsWithMemory: number;
    topTopics: { normalized_topic: string; attempts: number; users: number }[];
  } | null>(null);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{ topics: number; message: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    try {
      setStats(await api.getAggregateMemoryStats());
    } catch { /* no quiz data yet */ }
  }, []);

  useEffect(() => { void loadStats(); }, [loadStats]);

  const run = async () => {
    setRunning(true);
    setResult(null);
    setErr(null);
    try {
      setResult(await api.runAggregateMemory());
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
            Aggregates quiz attempt patterns across all users per topic — misconceptions, difficulty bands, unique-user counts.
            Run after users complete quizzes to improve future quiz generation.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void run()}
          disabled={running}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
        >
          {running ? <><i className="fas fa-spinner fa-spin" /> Running…</> : <><i className="fas fa-sync-alt" /> Aggregate now</>}
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

      {result && (
        <p className="text-xs font-semibold text-emerald-600">✓ {result.message}</p>
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
                <span className="shrink-0 text-slate-400">{t.attempts} attempts · {t.users} users</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

type Observability = {
  generatedAt: string;
  countsByStatus: Array<{ status: string; count: number }>;
  staleTopics: Array<{ normalizedTopic: string; topic: string; claimCount: number; staleCount: number; lastUpdatedAt: string | null }>;
  abstractOnlyClaims: Array<{ claimKey: string; claimText: string; normalizedTopic?: string | null; verificationStatus: string }>;
  unverifiedClaims: Array<{ claimKey: string; claimText: string; normalizedTopic?: string | null; verificationStatus: string }>;
  failedGenerationJobs: Array<{ jobKey: string; jobType: string; errorMessage: string | null; updatedAt: string | null }>;
  highDemandTopics: Array<{ normalizedTopic: string; topic: string; claimCount: number; lastUpdatedAt: string | null }>;
};

type SeedTopic = {
  id: number | string;
  block: string;
  displayName: string;
  suggestedQuery?: string;
  priority: string;
  volatility: string;
  seedStatus: string;
  claimCount: number;
  reviewDueAt?: string | null;
};

type CurriculumScheduler = {
  generatedAt: string;
  runs: Array<{
    id: number;
    status: string;
    startedAt: string;
    finishedAt?: string | null;
    candidatesCount: number;
    refreshedCount: number;
    skippedCount: number;
    errorCount: number;
    details?: { topics?: Array<Record<string, unknown>> };
  }>;
  dueTopics: SeedTopic[];
  failedTopics: SeedTopic[];
  statusCounts: Array<{ seedStatus: string; count: number; claimCount: number }>;
  guardrails: {
    settings: {
      enabled: boolean;
      maxTopicsPerDay: number;
      maxSynopsesPerDay: number;
      maxEstimatedCostUsdPerDay: number;
      maxFailureRate: number;
    };
    usage: {
      date: string;
      topicsAttempted: number;
      topicsSeeded: number;
      topicsFailed: number;
      synopsesGenerated: number;
      estimatedCostUsd: number;
    };
    blockedReason: string | null;
  };
};

function ClaimRow({ claim }: { claim: { claimKey: string; claimText: string; verificationStatus: string } }) {
  return (
    <li className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs">
      <div className="flex items-start justify-between gap-2">
        <p className="text-slate-700 dark:text-slate-200 leading-snug">{claim.claimText}</p>
        <VerificationBadge status={claim.verificationStatus} />
      </div>
    </li>
  );
}

export function AdminObservabilityPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<Observability | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aligningTopic, setAligningTopic] = useState<string | null>(null);
  const [seedTopics, setSeedTopics] = useState<SeedTopic[]>([]);
  const [importingTopics, setImportingTopics] = useState(false);
  const [seedingTopicId, setSeedingTopicId] = useState<number | string | null>(null);
  const [runningSeedBatch, setRunningSeedBatch] = useState(false);
  const [retryingFailed, setRetryingFailed] = useState(false);
  const [updatingScheduler, setUpdatingScheduler] = useState(false);
  const [scheduler, setScheduler] = useState<CurriculumScheduler | null>(null);
  const [automation, setAutomation] = useState<{ paused: boolean; pausedAt: string | null; reason: string | null } | null>(null);
  const [togglingAutomation, setTogglingAutomation] = useState(false);
  const [costDashboard, setCostDashboard] = useState<{
    totals: { llmCalls: number; estimatedCostUsd: number; synopsesGenerated: number; failedCalls: number };
    byOperation: Array<{ operation: string; callCount: number; estimatedCostUsd: number }>;
    highCostTopics: Array<{ normalizedTopic: string; estimatedCostUsd: number; callCount: number }>;
    failedLlmCalls: Array<{ operation: string; errorMessage: string | null; createdAt: string }>;
    failedGenerationJobs: Array<{ jobKey: string; jobType: string; errorMessage: string | null }>;
  } | null>(null);

  const isStaff = user?.role === 'admin' || user?.role === 'curator';

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [res, costRes, automationRes] = await Promise.all([
        api.getAdminClaimObservability({ limit: 30 }),
        api.getAdminLlmCostDashboard({ days: 30, limit: 12 }).catch(() => null),
        api.getBackgroundAutomation().catch(() => null),
      ]);
      setAutomation(automationRes?.automation ?? null);
      setData(res.observability);
      setCostDashboard(costRes?.dashboard ?? null);
      const seedRes = await api.listCurriculumSeedTopics({ limit: 120 });
      setSeedTopics(seedRes.topics);
      const schedulerRes = await api.getCurriculumSchedulerObservability({ limit: 8 });
      setScheduler(schedulerRes.scheduler);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load observability');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isStaff) {
      navigate('/search');
      return;
    }
    void load();
  }, [isStaff, load, navigate]);

  const runGuidelineAlign = async (topic: string) => {
    setAligningTopic(topic);
    try {
      await api.alignTopicGuidelines(topic, { limit: 40, apply: true });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Guideline align failed');
    } finally {
      setAligningTopic(null);
    }
  };

  const importCoreTopics = async () => {
    setImportingTopics(true);
    setError(null);
    try {
      await api.importCoreClinicalTopics();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Core topic import failed');
    } finally {
      setImportingTopics(false);
    }
  };

  const seedTopic = async (topicId: number | string) => {
    setSeedingTopicId(topicId);
    setError(null);
    try {
      await api.seedCurriculumTopic(topicId, {
        searchLimit: 24,
        synthesisArticles: 8,
        synopsisArticles: 3,
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Topic seeding failed');
    } finally {
      setSeedingTopicId(null);
    }
  };

  const runSeedBatch = async () => {
    setRunningSeedBatch(true);
    setError(null);
    try {
      await api.runCurriculumSeedBatch({
        batchSize: 2,
        searchLimit: 24,
        synthesisArticles: 8,
        synopsisArticles: 3,
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Seed batch failed');
    } finally {
      setRunningSeedBatch(false);
    }
  };

  const retryFailedSeeds = async () => {
    setRetryingFailed(true);
    setError(null);
    try {
      await api.retryFailedCurriculumSeeds({
        batchSize: 2,
        searchLimit: 24,
        synthesisArticles: 8,
        synopsisArticles: 3,
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Retry failed seeds failed');
    } finally {
      setRetryingFailed(false);
    }
  };

  const toggleBackgroundAutomation = async () => {
    if (!automation) return;
    setTogglingAutomation(true);
    setError(null);
    try {
      await api.setBackgroundAutomationPaused(!automation.paused);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update background automation');
    } finally {
      setTogglingAutomation(false);
    }
  };

  const toggleScheduler = async () => {
    if (!scheduler) return;
    setUpdatingScheduler(true);
    setError(null);
    try {
      await api.updateCurriculumSchedulerSettings({ enabled: !scheduler.guardrails.settings.enabled });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Scheduler settings update failed');
    } finally {
      setUpdatingScheduler(false);
    }
  };

  if (!isStaff) return null;

  return (
    <div className="min-h-screen bg-[var(--c-bg)] px-4 py-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">Admin observability</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">LLM cost, claim trust pipeline, failed jobs, and curriculum seeding.</p>
          </div>
          <button type="button" onClick={() => void load()} className="neo-btn text-xs">Refresh</button>
        </div>

        {error && <p className="text-sm text-rose-600">{error}</p>}
        {automation && !loading && (
          <section className={`neo-card p-4 border-l-4 ${automation.paused ? 'border-amber-500' : 'border-emerald-500'}`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Background automation</p>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 mt-1">
                  {automation.paused ? 'All automatic schedulers are paused' : 'Automatic schedulers are running'}
                </p>
                <p className="text-[10px] text-slate-500 mt-1">
                  Curriculum seed, topic refresh, claim regeneration, guideline watchtower, knowledge drift.
                  {automation.pausedAt ? ` Paused ${new Date(automation.pausedAt).toLocaleString()}.` : ''}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => navigate('/admin/quality')} className="neo-btn text-xs">Quality queues</button>
                <button type="button" onClick={() => void toggleBackgroundAutomation()} disabled={togglingAutomation}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white disabled:opacity-50 dark:bg-white dark:text-slate-900">
                  {togglingAutomation ? 'Saving�' : automation.paused ? 'Resume all schedulers' : 'Pause all schedulers'}
                </button>
              </div>
            </div>
          </section>
        )}
        {loading && <div className="flex justify-center py-12"><div className="spinner" /></div>}

        {data && !loading && (
          <>
            <p className="text-[10px] text-slate-400">Updated {new Date(data.generatedAt).toLocaleString()}</p>

            <CollectiveMemoryPanel />

            {costDashboard && (
              <section className="neo-card p-4 space-y-4">
                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">LLM cost (30 days)</h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
                    <p className="text-[10px] text-slate-500">LLM calls</p>
                    <p className="text-xl font-black text-slate-900 dark:text-white">{costDashboard.totals.llmCalls}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
                    <p className="text-[10px] text-slate-500">Estimated cost (USD)</p>
                    <p className="text-xl font-black text-emerald-600">${costDashboard.totals.estimatedCostUsd.toFixed(4)}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
                    <p className="text-[10px] text-slate-500">Synopses / synthesis</p>
                    <p className="text-xl font-black text-slate-900 dark:text-white">{costDashboard.totals.synopsesGenerated}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
                    <p className="text-[10px] text-slate-500">Failed AI calls</p>
                    <p className="text-xl font-black text-rose-600">{costDashboard.totals.failedCalls}</p>
                  </div>
                </div>
                {costDashboard.highCostTopics.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">High-cost topics</p>
                    <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                      {costDashboard.highCostTopics.map((t) => (
                        <li key={t.normalizedTopic} className="flex justify-between gap-2">
                          <span className="truncate">{t.normalizedTopic}</span>
                          <span className="shrink-0 font-mono">${t.estimatedCostUsd.toFixed(4)} · {t.callCount} calls</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>
            )}

            <section className="neo-card p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Core curriculum seed topics</h2>
                <button
                  type="button"
                  onClick={() => void importCoreTopics()}
                  disabled={importingTopics}
                  className="rounded-lg bg-indigo-600 px-3 py-1.5 text-[10px] font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {importingTopics ? 'Importing...' : 'Import core topics'}
                </button>
                <button
                  type="button"
                  onClick={() => void runSeedBatch()}
                  disabled={runningSeedBatch || seedTopics.length === 0}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-[10px] font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {runningSeedBatch ? 'Running...' : 'Run seed batch'}
                </button>
                <button
                  type="button"
                  onClick={() => void retryFailedSeeds()}
                  disabled={retryingFailed || !scheduler?.failedTopics.length}
                  className="rounded-lg bg-amber-600 px-3 py-1.5 text-[10px] font-bold text-white hover:bg-amber-700 disabled:opacity-50"
                >
                  {retryingFailed ? 'Retrying...' : 'Retry failed'}
                </button>
              </div>
              {scheduler && (
                <div className="mb-4 grid gap-3 md:grid-cols-3">
                  <div className="rounded-lg border border-slate-200 p-3 text-xs dark:border-slate-700">
                    <p className="font-bold text-slate-800 dark:text-slate-100">Due now</p>
                    <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">{scheduler.dueTopics.length}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 p-3 text-xs dark:border-slate-700">
                    <p className="font-bold text-slate-800 dark:text-slate-100">Failed / warning</p>
                    <p className="mt-1 text-2xl font-black text-amber-600">{scheduler.failedTopics.length}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 p-3 text-xs dark:border-slate-700">
                    <p className="font-bold text-slate-800 dark:text-slate-100">Latest run</p>
                    <p className="mt-1 text-sm font-black text-slate-900 dark:text-white">{scheduler.runs[0]?.status || 'none'}</p>
                    {scheduler.runs[0] && (
                      <p className="mt-1 text-[10px] text-slate-500">
                        {scheduler.runs[0].refreshedCount} seeded, {scheduler.runs[0].errorCount} errors
                      </p>
                    )}
                  </div>
                  <div className="rounded-lg border border-slate-200 p-3 text-xs dark:border-slate-700 md:col-span-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-bold text-slate-800 dark:text-slate-100">
                          Scheduler {scheduler.guardrails.settings.enabled ? 'enabled' : 'paused'}
                        </p>
                        <p className="mt-1 text-[10px] text-slate-500">
                          Today: {scheduler.guardrails.usage.topicsAttempted}/{scheduler.guardrails.settings.maxTopicsPerDay} topics,
                          {' '}{scheduler.guardrails.usage.synopsesGenerated}/{scheduler.guardrails.settings.maxSynopsesPerDay} synopses,
                          {' '}${scheduler.guardrails.usage.estimatedCostUsd.toFixed(4)}/${scheduler.guardrails.settings.maxEstimatedCostUsdPerDay.toFixed(2)}
                        </p>
                        {scheduler.guardrails.blockedReason && (
                          <p className="mt-1 text-[10px] font-bold text-amber-600">Blocked: {scheduler.guardrails.blockedReason}</p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => void toggleScheduler()}
                        disabled={updatingScheduler}
                        className="rounded-lg bg-slate-900 px-3 py-1.5 text-[10px] font-bold text-white hover:bg-slate-700 disabled:opacity-50 dark:bg-white dark:text-slate-900"
                      >
                        {updatingScheduler ? 'Updating...' : scheduler.guardrails.settings.enabled ? 'Pause scheduler' : 'Resume scheduler'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {seedTopics.length === 0 ? (
                <p className="text-xs text-slate-500">No core seed topics imported yet.</p>
              ) : (
                <>
                  <p className="mb-3 text-xs text-slate-500">{seedTopics.length} imported topic{seedTopics.length !== 1 ? 's' : ''}</p>
                  <div className="max-h-72 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="sticky top-0 bg-white text-[10px] uppercase tracking-widest text-slate-400 dark:bg-slate-900">
                        <tr>
                          <th className="py-2 pr-2">Topic</th>
                          <th className="py-2 pr-2">Block</th>
                          <th className="py-2 pr-2">Priority</th>
                          <th className="py-2 pr-2">Claims</th>
                          <th className="py-2 pr-2">Status</th>
                          <th className="py-2 pr-2" />
                        </tr>
                      </thead>
                      <tbody>
                        {seedTopics.slice(0, 80).map((topic) => (
                          <tr key={topic.id} className="border-t border-slate-100 dark:border-slate-800">
                            <td className="py-2 pr-2 font-semibold text-slate-700 dark:text-slate-200">{topic.displayName}</td>
                            <td className="py-2 pr-2 text-slate-500">{topic.block}</td>
                            <td className="py-2 pr-2 text-slate-500">{topic.priority}</td>
                            <td className="py-2 pr-2 text-slate-500">{topic.claimCount || 0}</td>
                            <td className="py-2 pr-2 text-slate-500">{topic.seedStatus}</td>
                            <td className="py-2 pr-2 text-right">
                              <button
                                type="button"
                                onClick={() => void seedTopic(topic.id)}
                                disabled={seedingTopicId === topic.id || topic.seedStatus === 'seeding'}
                                className="rounded-lg bg-slate-900 px-2.5 py-1 text-[10px] font-bold text-white hover:bg-slate-700 disabled:opacity-50 dark:bg-white dark:text-slate-900"
                              >
                                {seedingTopicId === topic.id || topic.seedStatus === 'seeding' ? 'Seeding...' : 'Seed'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </section>

            {scheduler && (
              <section className="neo-card p-4">
                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Curriculum seed scheduler</h2>
                <div className="mb-4 flex flex-wrap gap-2">
                  {scheduler.statusCounts.map((row) => (
                    <span key={row.seedStatus} className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      <strong>{row.seedStatus}</strong>: {row.count} topics / {row.claimCount} claims
                    </span>
                  ))}
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <h3 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Next due topics</h3>
                    <ul className="space-y-2 text-xs">
                      {scheduler.dueTopics.slice(0, 5).map((topic) => (
                        <li key={topic.id} className="flex justify-between gap-3 rounded border border-slate-200 px-2 py-1.5 dark:border-slate-700">
                          <span className="font-semibold text-slate-700 dark:text-slate-200">{topic.displayName}</span>
                          <span className="text-slate-500">{topic.seedStatus}</span>
                        </li>
                      ))}
                      {scheduler.dueTopics.length === 0 && <li className="text-slate-500">No topics due.</li>}
                    </ul>
                  </div>
                  <div>
                    <h3 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Recent seed runs</h3>
                    <ul className="space-y-2 text-xs">
                      {scheduler.runs.slice(0, 5).map((run) => (
                        <li key={run.id} className="rounded border border-slate-200 px-2 py-1.5 dark:border-slate-700">
                          <div className="flex justify-between gap-3">
                            <span className="font-semibold text-slate-700 dark:text-slate-200">{run.status}</span>
                            <span className="text-slate-500">{new Date(run.startedAt).toLocaleString()}</span>
                          </div>
                          <p className="mt-1 text-slate-500">{run.refreshedCount} seeded, {run.skippedCount} skipped, {run.errorCount} errors</p>
                        </li>
                      ))}
                      {scheduler.runs.length === 0 && <li className="text-slate-500">No seed runs yet.</li>}
                    </ul>
                  </div>
                </div>
              </section>
            )}

            <section className="neo-card p-4">
              <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Claims by trust status</h2>
              <div className="flex flex-wrap gap-2">
                {data.countsByStatus.map((row) => (
                  <span key={row.status} className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-1 text-xs">
                    <VerificationBadge status={row.status} />
                    <span className="font-semibold text-slate-600 dark:text-slate-300">{row.count}</span>
                  </span>
                ))}
              </div>
            </section>

            <section className="neo-card p-4">
              <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">High-demand topics</h2>
              <ul className="space-y-2">
                {data.highDemandTopics.map((t) => (
                  <li key={t.normalizedTopic} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span className="font-semibold text-slate-800 dark:text-slate-100">{t.topic}</span>
                    <span className="text-xs text-slate-500">{t.claimCount} claims</span>
                    <button
                      type="button"
                      disabled={aligningTopic === t.topic}
                      onClick={() => void runGuidelineAlign(t.topic)}
                      className="text-[10px] font-bold text-indigo-600 hover:underline disabled:opacity-50"
                    >
                      Run guideline engine
                    </button>
                  </li>
                ))}
              </ul>
            </section>

            <section className="neo-card p-4">
              <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Stale topics</h2>
              <ul className="space-y-2 text-sm">
                {data.staleTopics.map((t) => (
                  <li key={t.normalizedTopic} className="flex justify-between gap-2">
                    <span>{t.topic}</span>
                    <span className="text-rose-600 text-xs">{t.staleCount} stale / {t.claimCount} total</span>
                  </li>
                ))}
                {data.staleTopics.length === 0 && <p className="text-xs text-slate-500">None flagged.</p>}
              </ul>
            </section>

            <div className="grid md:grid-cols-2 gap-4">
              <section className="neo-card p-4">
                <h2 className="text-xs font-bold uppercase tracking-widest text-amber-600 mb-3">Abstract-only claims</h2>
                <ul className="space-y-2 max-h-72 overflow-y-auto">
                  {data.abstractOnlyClaims.map((c) => <ClaimRow key={c.claimKey} claim={c} />)}
                </ul>
              </section>
              <section className="neo-card p-4">
                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Unverified / draft claims</h2>
                <ul className="space-y-2 max-h-72 overflow-y-auto">
                  {data.unverifiedClaims.map((c) => <ClaimRow key={c.claimKey} claim={c} />)}
                </ul>
              </section>
            </div>

            <section className="neo-card p-4">
              <h2 className="text-xs font-bold uppercase tracking-widest text-rose-500 mb-3">Failed generation jobs</h2>
              <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                {data.failedGenerationJobs.map((j) => (
                  <li key={j.jobKey} className="rounded border border-slate-200 dark:border-slate-700 px-2 py-1.5">
                    <span className="font-mono font-semibold">{j.jobType}</span> - {j.jobKey}
                    {j.errorMessage && <p className="text-rose-600 mt-1">{j.errorMessage}</p>}
                  </li>
                ))}
                {data.failedGenerationJobs.length === 0 && <p className="text-slate-500">No recent failures.</p>}
              </ul>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
