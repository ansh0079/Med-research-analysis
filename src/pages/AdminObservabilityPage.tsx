import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@services/api';
import { useAuth } from '@contexts/AuthContext';
import { VerificationBadge } from '@components/ui/VerificationBadge';
import type {
  ProductionObservability,
  ProductionObservabilityStatus,
  TopicReadinessRow,
  TopicReadinessTier,
} from '@services/api/knowledgeAdmin';

function CollectiveMemoryPanel() {
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

const statusStyles: Record<ProductionObservabilityStatus, string> = {
  healthy: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  watch: 'bg-amber-100 text-amber-700 border-amber-200',
  degraded: 'bg-rose-100 text-rose-700 border-rose-200',
  insufficient_data: 'bg-slate-100 text-slate-600 border-slate-200',
};

function formatStatus(status: string) {
  return status.replace(/_/g, ' ');
}

function formatMetricValue(value: unknown) {
  if (typeof value === 'number') {
    if (value >= 0 && value <= 1) return `${Math.round(value * 100)}%`;
    return Number.isInteger(value) ? String(value) : value.toFixed(2);
  }
  if (value == null) return '-';
  return String(value);
}

function ProductionObservabilityPanel({ observability }: { observability: ProductionObservability }) {
  const sections = Object.entries(observability.sections);
  const badgeClass = statusStyles[observability.status] || statusStyles.insufficient_data;

  return (
    <section className="neo-card p-4 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Phase 7 production loop</h2>
          <p className="text-xs text-slate-500 mt-1">
            Live readiness across search quality, RL reward attribution, synopsis trust, AI jobs, and SLO burn.
          </p>
        </div>
        <div className="text-right">
          <span className={`inline-flex rounded border px-2 py-1 text-[10px] font-bold uppercase ${badgeClass}`}>
            {formatStatus(observability.status)}
          </span>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{observability.score}</p>
          <p className="text-[10px] text-slate-500">readiness score</p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-5">
        {sections.map(([name, section]) => (
          <div key={name} className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{name}</p>
              <span className={`shrink-0 rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase ${statusStyles[section.status]}`}>
                {formatStatus(section.status)}
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 line-clamp-3">
              {section.checks[0]?.message || 'No checks reported.'}
            </p>
            {section.checks[0] && (
              <p className="text-[10px] text-slate-400 mt-2">
                {section.checks[0].label}: {formatMetricValue(section.checks[0].value)}
              </p>
            )}
          </div>
        ))}
      </div>

      {observability.alerts.length > 0 ? (
        <div className="grid gap-3 lg:grid-cols-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Alerts</p>
            <ul className="space-y-2">
              {observability.alerts.slice(0, 5).map((alert, index) => (
                <li key={`${alert.area}-${index}`} className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                      alert.severity === 'critical' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {alert.area}
                    </span>
                    <span className="font-semibold text-slate-700 dark:text-slate-200">{alert.message}</span>
                  </div>
                  {alert.action && <p className="text-slate-500 mt-1">{alert.action}</p>}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Next actions</p>
            <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
              {observability.actions.slice(0, 5).map((action, index) => (
                <li key={`${action}-${index}`} className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2">
                  {action}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
          All Phase 7 operating checks are healthy for the last {observability.windowDays} days.
        </p>
      )}
    </section>
  );
}

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

type BackgroundJob = {
  jobKey: string;
  jobType: string;
  status: string;
  topic: string | null;
  errorMessage: string | null;
  attempts: number;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  failedAt?: string;
  originalCreatedAt?: string | null;
};

const JOB_TYPE_OPTIONS = [
  'full_synthesis',
  'paper_synopsis',
  'consensus_synopsis',
  'live_clinical_answer',
  'quiz_prefetch',
  'topic_seed',
  'guideline_align',
  'pdf_index',
];

const STATUS_OPTIONS = ['queued', 'running', 'failed', 'completed'];

function BackgroundJobsPanel() {
  const [tab, setTab] = useState<'active' | 'failed' | 'dead'>('active');
  const [jobType, setJobType] = useState<string>('');
  const [jobs, setJobs] = useState<BackgroundJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (tab === 'dead') {
        const res = await api.knowledge.listDeadLetterJobs({ jobType: jobType || undefined, limit: 50 });
        setJobs(res.jobs.map((j) => ({
          ...j,
          status: 'dead_letter',
          createdAt: j.originalCreatedAt || j.failedAt,
          updatedAt: j.failedAt,
          startedAt: null,
          completedAt: null,
        })));
      } else {
        const status = tab === 'active' ? 'queued,running' : 'failed';
        const res = await api.knowledge.listAdminJobs({ status, jobType: jobType || undefined, limit: 50 });
        setJobs(res.jobs);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load jobs');
    } finally {
      setLoading(false);
    }
  }, [tab, jobType]);

  useEffect(() => { void load(); }, [load]);

  const retry = async (jobKey: string, fromDead = false) => {
    setRetrying(jobKey);
    setError(null);
    try {
      if (fromDead) {
        await api.knowledge.requeueDeadLetterJob(jobKey);
      } else {
        await api.knowledge.retryAdminJob(jobKey);
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Retry failed');
    } finally {
      setRetrying(null);
    }
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      queued: 'bg-slate-100 text-slate-600',
      running: 'bg-blue-100 text-blue-700',
      completed: 'bg-emerald-100 text-emerald-700',
      failed: 'bg-rose-100 text-rose-700',
      dead_letter: 'bg-amber-100 text-amber-700',
    };
    return (
      <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${colors[status] || 'bg-slate-100 text-slate-600'}`}>
        {status}
      </span>
    );
  };

  return (
    <section className="neo-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500">Background jobs</h2>
          <p className="text-xs text-slate-500 mt-1">
            Inspect, retry, and requeue durable enrichment jobs (search intelligence, topic seed, guideline alignment, PDF indexing).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={jobType}
            onChange={(e) => setJobType(e.target.value)}
            className="text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1"
          >
            <option value="">All job types</option>
            {JOB_TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="text-xs rounded bg-slate-100 dark:bg-slate-800 px-2 py-1 hover:bg-slate-200 disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      <div className="flex gap-2 mb-3">
        {[
          { key: 'active', label: 'Active' },
          { key: 'failed', label: 'Failed' },
          { key: 'dead', label: 'Dead letter' },
        ].map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key as typeof tab)}
            className={`text-xs font-semibold px-3 py-1 rounded ${
              tab === t.key
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <p className="text-xs text-rose-600 mb-3">{error}</p>}

      <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300 max-h-96 overflow-y-auto">
        {jobs.map((j) => (
          <li key={j.jobKey} className="rounded border border-slate-200 dark:border-slate-700 px-3 py-2">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {statusBadge(j.status)}
                  <span className="font-mono font-semibold">{j.jobType}</span>
                  {j.topic && <span className="text-slate-500 truncate max-w-[200px]">{j.topic}</span>}
                </div>
                <p className="font-mono text-[10px] text-slate-400 mt-1 break-all">{j.jobKey}</p>
                {j.errorMessage && <p className="text-rose-600 mt-1">{j.errorMessage}</p>}
                <p className="text-slate-400 mt-1">
                  attempts: {j.attempts} - updated: {new Date(j.updatedAt || j.failedAt || j.createdAt).toLocaleString()}
                </p>
              </div>
              {(j.status === 'failed' || j.status === 'dead_letter') && (
                <button
                  type="button"
                  onClick={() => void retry(j.jobKey, j.status === 'dead_letter')}
                  disabled={retrying === j.jobKey}
                  className="shrink-0 rounded bg-indigo-600 px-2 py-1 text-[10px] font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {retrying === j.jobKey ? 'Retrying...' : 'Retry'}
                </button>
              )}
            </div>
          </li>
        ))}
        {jobs.length === 0 && !loading && (
          <p className="text-slate-500">No {tab === 'dead' ? 'dead-letter' : tab} jobs found.</p>
        )}
      </ul>
    </section>
  );
}

const readinessTierStyles: Record<TopicReadinessTier, string> = {
  needs_enrichment: 'bg-rose-100 text-rose-700 border-rose-200',
  search_ready: 'bg-blue-100 text-blue-700 border-blue-200',
  learner_ready: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  flagship: 'bg-indigo-100 text-indigo-700 border-indigo-200',
};

const readinessTierLabels: Record<TopicReadinessTier, string> = {
  needs_enrichment: 'Needs enrichment',
  search_ready: 'Search ready',
  learner_ready: 'Learner ready',
  flagship: 'Flagship',
};

function missingLabel(signal: string) {
  const labels: Record<string, string> = {
    topic_knowledge: 'Knowledge',
    source_articles: 'Articles',
    guidelines: 'Guidelines',
    claims: 'Claims',
    teaching_objects: 'Teaching',
    mcqs: 'MCQs',
  };
  return labels[signal] || signal.replace(/_/g, ' ');
}

function priorityRank(priority: string) {
  return { high: 0, medium: 1, low: 2, unknown: 3 }[priority] ?? 3;
}

function weaknessScore(row: TopicReadinessRow) {
  return row.missing.length * 10
    + Math.max(0, 8 - row.counts.claims)
    + Math.max(0, 3 - row.counts.sourceArticles)
    + Math.max(0, 1 - row.counts.guidelines) * 4
    + Math.max(0, 1 - row.counts.mcqObjects) * 3;
}

function TopicReadinessPanel() {
  const [rows, setRows] = useState<TopicReadinessRow[]>([]);
  const [summary, setSummary] = useState<Awaited<ReturnType<typeof api.knowledge.getTopicReadiness>>['readiness']['summary'] | null>(null);
  const [tier, setTier] = useState<'all' | TopicReadinessTier>('all');
  const [block, setBlock] = useState('all');
  const [seedStatus, setSeedStatus] = useState('all');
  const [sort, setSort] = useState<'weakest' | 'priority' | 'highest'>('weakest');
  const [loading, setLoading] = useState(false);
  const [actionKey, setActionKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.knowledge.getTopicReadiness({ limit: 500 });
      setRows(res.readiness.topics);
      setSummary(res.readiness.summary);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load topic readiness');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const blocks = Array.from(new Set(rows.map((row) => row.block))).sort();
  const statuses = Array.from(new Set(rows.map((row) => row.seedStatus))).sort();
  const filtered = rows
    .filter((row) => tier === 'all' || row.tier === tier)
    .filter((row) => block === 'all' || row.block === block)
    .filter((row) => seedStatus === 'all' || row.seedStatus === seedStatus)
    .sort((a, b) => {
      if (sort === 'highest') return weaknessScore(a) - weaknessScore(b);
      if (sort === 'priority') return priorityRank(a.priority) - priorityRank(b.priority) || weaknessScore(b) - weaknessScore(a);
      return weaknessScore(b) - weaknessScore(a) || priorityRank(a.priority) - priorityRank(b.priority);
    });

  const runAction = async (row: TopicReadinessRow, action: 'seed' | 'align' | 'watch') => {
    const key = `${row.normalizedTopic}:${action}`;
    setActionKey(key);
    setError(null);
    try {
      if (action === 'seed') {
        if (!row.curriculumTopicId) throw new Error('This topic is not linked to a curriculum seed row yet.');
        await api.knowledge.seedCurriculumTopic(row.curriculumTopicId, {
          searchLimit: 24,
          synthesisArticles: 8,
          synopsisArticles: 3,
          background: true,
        });
      } else if (action === 'align') {
        await api.knowledge.alignTopicGuidelines(row.displayName, { limit: 40, apply: true });
      } else {
        await api.knowledge.runGuidelineWatchScan(row.displayName);
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Topic action failed');
    } finally {
      setActionKey(null);
    }
  };

  return (
    <section className="neo-card p-4 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Topic readiness</h2>
          <p className="text-xs text-slate-500 mt-1">
            Canonical corpus coverage across topic knowledge, guidelines, source articles, teaching claims, MCQs, and cases.
          </p>
        </div>
        <button type="button" onClick={() => void load()} disabled={loading} className="neo-btn text-xs">
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {summary && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            ['Canonical', summary.canonicalTopics],
            ['Enriched', summary.topicKnowledgeRows],
            ['Learner-ready', summary.byTier.learner_ready || 0],
            ['Flagship', summary.byTier.flagship || 0],
            ['Guidelines', summary.tableCounts.topicGuidelines || 0],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
              <p className="text-xl font-black text-slate-900 dark:text-white">{value}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <select value={tier} onChange={(e) => setTier(e.target.value as typeof tier)}
          className="rounded border border-slate-200 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-900">
          <option value="all">All tiers</option>
          {Object.entries(readinessTierLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <select value={block} onChange={(e) => setBlock(e.target.value)}
          className="rounded border border-slate-200 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-900">
          <option value="all">All blocks</option>
          {blocks.map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
        <select value={seedStatus} onChange={(e) => setSeedStatus(e.target.value)}
          className="rounded border border-slate-200 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-900">
          <option value="all">All seed states</option>
          {statuses.map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}
          className="rounded border border-slate-200 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-900">
          <option value="weakest">Weakest first</option>
          <option value="priority">Highest priority</option>
          <option value="highest">Strongest first</option>
        </select>
      </div>

      {error && <p className="text-xs text-rose-600">{error}</p>}

      <div className="max-h-[34rem] overflow-y-auto">
        <table className="w-full text-left text-xs">
          <thead className="sticky top-0 bg-white text-[10px] uppercase tracking-widest text-slate-400 dark:bg-slate-900">
            <tr>
              <th className="py-2 pr-2">Topic</th>
              <th className="py-2 pr-2">Tier</th>
              <th className="py-2 pr-2">Counts</th>
              <th className="py-2 pr-2">Missing</th>
              <th className="py-2 pr-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 120).map((row) => (
              <tr key={row.normalizedTopic} className="border-t border-slate-100 align-top dark:border-slate-800">
                <td className="py-2 pr-2">
                  <p className="font-semibold text-slate-800 dark:text-slate-100">{row.displayName}</p>
                  <p className="text-[10px] text-slate-500">{row.block} - {row.priority} - {row.seedStatus}</p>
                </td>
                <td className="py-2 pr-2">
                  <span className={`inline-flex rounded border px-2 py-1 text-[10px] font-bold uppercase ${readinessTierStyles[row.tier]}`}>
                    {readinessTierLabels[row.tier]}
                  </span>
                </td>
                <td className="py-2 pr-2 text-slate-500">
                  <span title="Source articles">A {row.counts.sourceArticles}</span>
                  {' '}<span title="Guidelines">G {row.counts.guidelines}</span>
                  {' '}<span title="Claims">C {row.counts.claims}</span>
                  {' '}<span title="MCQs">Q {row.counts.mcqObjects}</span>
                </td>
                <td className="py-2 pr-2">
                  <div className="flex max-w-sm flex-wrap gap-1">
                    {row.missing.length === 0 ? (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">Complete</span>
                    ) : row.missing.map((signal) => (
                      <span key={signal} className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
                        {missingLabel(signal)}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="py-2 pr-2">
                  <div className="flex flex-wrap gap-1">
                    <button type="button" disabled={!row.curriculumTopicId || actionKey === `${row.normalizedTopic}:seed`}
                      onClick={() => void runAction(row, 'seed')}
                      className="rounded bg-emerald-600 px-2 py-1 text-[10px] font-bold text-white disabled:opacity-40">
                      Seed
                    </button>
                    <button type="button" disabled={actionKey === `${row.normalizedTopic}:align`}
                      onClick={() => void runAction(row, 'align')}
                      className="rounded bg-blue-600 px-2 py-1 text-[10px] font-bold text-white disabled:opacity-40">
                      Align
                    </button>
                    <button type="button" disabled={actionKey === `${row.normalizedTopic}:watch`}
                      onClick={() => void runAction(row, 'watch')}
                      className="rounded bg-slate-800 px-2 py-1 text-[10px] font-bold text-white disabled:opacity-40">
                      Refresh
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && !loading && (
              <tr><td colSpan={5} className="py-6 text-center text-slate-500">No topics match these filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
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
  const [cronHealth, setCronHealth] = useState<Array<{
    task: string;
    lastRunAt: string | null;
    lastStatus: string | null;
    lastError: string | null;
    consecutiveFailures: number;
    runsTotal: number;
    stale: boolean;
  }> | null>(null);
  const [togglingAutomation, setTogglingAutomation] = useState(false);
  const [costDashboard, setCostDashboard] = useState<{
    totals: { llmCalls: number; estimatedCostUsd: number; synopsesGenerated: number; failedCalls: number };
    byOperation: Array<{ operation: string; callCount: number; estimatedCostUsd: number }>;
    highCostTopics: Array<{ normalizedTopic: string; estimatedCostUsd: number; callCount: number }>;
    failedLlmCalls: Array<{ operation: string; errorMessage: string | null; createdAt: string }>;
    failedGenerationJobs: Array<{ jobKey: string; jobType: string; errorMessage: string | null }>;
  } | null>(null);
  const [productionObservability, setProductionObservability] = useState<ProductionObservability | null>(null);

  const isStaff = user?.role === 'admin' || user?.role === 'curator';

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [res, costRes, automationRes, productionRes, cronRes] = await Promise.all([
        api.knowledge.getAdminClaimObservability({ limit: 30 }),
        api.knowledge.getAdminLlmCostDashboard({ days: 30, limit: 12 }).catch(() => null),
        api.knowledge.getBackgroundAutomation().catch(() => null),
        api.knowledge.getProductionObservability({ days: 7 }).catch(() => null),
        api.knowledge.getCronHealth().catch(() => null),
      ]);
      setAutomation(automationRes?.automation ?? null);
      setCronHealth(cronRes?.crons ?? null);
      setData(res.observability);
      setCostDashboard(costRes?.dashboard ?? null);
      setProductionObservability(productionRes?.observability ?? null);
      const seedRes = await api.knowledge.listCurriculumSeedTopics({ limit: 120 });
      setSeedTopics(seedRes.topics);
      const schedulerRes = await api.knowledge.getCurriculumSchedulerObservability({ limit: 8 });
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
      await api.knowledge.alignTopicGuidelines(topic, { limit: 40, apply: true });
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
      await api.knowledge.importCoreClinicalTopics();
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
      await api.knowledge.seedCurriculumTopic(topicId, {
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
      await api.knowledge.runCurriculumSeedBatch({
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
      await api.knowledge.retryFailedCurriculumSeeds({
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
      await api.knowledge.setBackgroundAutomationPaused(!automation.paused);
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
      await api.knowledge.updateCurriculumSchedulerSettings({ enabled: !scheduler.guardrails.settings.enabled });
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
                  {togglingAutomation ? 'Saving...' : automation.paused ? 'Resume all schedulers' : 'Pause all schedulers'}
                </button>
              </div>
            </div>
          </section>
        )}
        {cronHealth && cronHealth.length > 0 && !loading && (
          <section className={`neo-card p-4 border-l-4 ${cronHealth.some((c) => c.lastStatus === 'error' || c.stale) ? 'border-rose-500' : 'border-emerald-500'}`}>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Scheduled task health</p>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-slate-400">
                    <th className="py-1 pr-3 font-semibold">Task</th>
                    <th className="py-1 pr-3 font-semibold">Last run</th>
                    <th className="py-1 pr-3 font-semibold">Status</th>
                    <th className="py-1 pr-3 font-semibold">Fails</th>
                    <th className="py-1 font-semibold">Runs</th>
                  </tr>
                </thead>
                <tbody>
                  {cronHealth.map((c) => (
                    <tr key={c.task} className="border-t border-slate-100 dark:border-slate-800">
                      <td className="py-1.5 pr-3 font-mono">{c.task}</td>
                      <td className="py-1.5 pr-3 text-slate-500">{c.lastRunAt ? new Date(c.lastRunAt).toLocaleString() : 'never'}</td>
                      <td className="py-1.5 pr-3">
                        <span className={`font-semibold ${c.lastStatus === 'error' || c.stale ? 'text-rose-600' : 'text-emerald-600'}`}
                          title={c.lastError || undefined}>
                          {c.stale ? 'stale' : (c.lastStatus ?? '—')}
                        </span>
                      </td>
                      <td className={`py-1.5 pr-3 ${c.consecutiveFailures > 0 ? 'text-rose-600 font-semibold' : 'text-slate-500'}`}>{c.consecutiveFailures}</td>
                      <td className="py-1.5 text-slate-500">{c.runsTotal}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
        {loading && <div className="flex justify-center py-12"><div className="spinner" /></div>}

        {data && !loading && (
          <>
            <p className="text-[10px] text-slate-400">Updated {new Date(data.generatedAt).toLocaleString()}</p>

            {productionObservability && (
              <ProductionObservabilityPanel observability={productionObservability} />
            )}

            <TopicReadinessPanel />

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

            <BackgroundJobsPanel />
          </>
        )}
      </div>
    </div>
  );
}
