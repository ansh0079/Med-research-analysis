import React, { useCallback, useEffect, useState } from 'react';
import { api } from '@services/api';

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

export function BackgroundJobsPanel() {
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
