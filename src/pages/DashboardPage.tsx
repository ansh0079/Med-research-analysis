import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@services/api';
import { useAuth } from '@contexts/AuthContext';
import { usePendingSynthesisJobs } from '@hooks/usePendingSynthesisJobs';
import { PracticeAlertCard } from '@components/ui';
import type { LearningDashboard, LearningRecommendation, ProactiveEvidenceAlert } from '@types';

const QUIZ_PREFILL_KEY = 'med_quiz_prefill';
const CASE_PREFILL_KEY = 'med_case_prefill';

const REC_TYPE_LABELS: Record<string, string> = {
  review: 'Due for review',
  strengthen: 'Weak area',
  explore: 'Searched — not tested',
  discover: 'Related topic',
  refresh: 'Getting stale',
  case: 'Try a case',
  start: 'Get started',
};

function openSearchTopic(navigate: (path: string) => void, topic: string) {
  sessionStorage.setItem('med_onboarding_query', topic);
  navigate('/search');
}

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { jobs: pendingJobs, loading: pendingLoading, refresh: refreshPending } = usePendingSynthesisJobs(true);

  const [dashboard, setDashboard] = useState<LearningDashboard | null>(null);
  const [recommendations, setRecommendations] = useState<LearningRecommendation[]>([]);
  const [searchHistory, setSearchHistory] = useState<Array<{ query: string; timestamp: string; results_count: number }>>([]);
  const [driftAlerts, setDriftAlerts] = useState<ProactiveEvidenceAlert[]>([]);
  const [practiceAlerts, setPracticeAlerts] = useState<Awaited<ReturnType<typeof api.knowledge.getPracticeAlerts>>['alerts']>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void Promise.allSettled([
      api.learning.getLearningDashboard(),
      api.learning.getLearningRecommendations(6),
      api.documents.getSearchHistory(),
      api.knowledge.listEvidenceAlerts({ limit: 8, unreadOnly: true }),
      api.knowledge.getPracticeAlerts('', 6),
    ])
      .then(([dashRes, recRes, histRes, driftRes, practiceRes]) => {
        if (cancelled) return;
        if (dashRes.status === 'fulfilled') setDashboard(dashRes.value);
        if (recRes.status === 'fulfilled') setRecommendations(recRes.value.recommendations || []);
        if (histRes.status === 'fulfilled') setSearchHistory((histRes.value.history || []).slice(0, 8));
        if (driftRes.status === 'fulfilled') setDriftAlerts(driftRes.value.alerts || []);
        if (practiceRes.status === 'fulfilled') setPracticeAlerts(practiceRes.value.alerts || []);
        if (dashRes.status === 'rejected' && recRes.status === 'rejected') {
          setError('Failed to load dashboard');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const handleRecommendation = useCallback((rec: LearningRecommendation) => {
    if (rec.action === 'quiz') {
      sessionStorage.setItem(QUIZ_PREFILL_KEY, JSON.stringify({ topic: rec.topic }));
      navigate('/quiz');
      return;
    }
    if (rec.action === 'case') {
      sessionStorage.setItem(CASE_PREFILL_KEY, JSON.stringify({ topic: rec.topic }));
      navigate('/case');
      return;
    }
    openSearchTopic(navigate, rec.topic);
  }, [navigate]);

  const openPendingJob = useCallback(async (jobKey: string, topic: string) => {
    try {
      const { job } = await api.ai.getAiGenerationJob(jobKey);
      if (job.status === 'completed') {
        openSearchTopic(navigate, topic);
        return;
      }
    } catch {
      // fall through
    }
    openSearchTopic(navigate, topic);
    void refreshPending();
  }, [navigate, refreshPending]);

  const dismissDriftAlert = useCallback(async (id: number) => {
    await api.knowledge.markEvidenceAlertRead(id);
    setDriftAlerts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen aurora-bg flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  const stats = dashboard?.stats;
  const dueTopics = dashboard?.reviewQueue?.length ?? 0;
  const dueCards = dashboard?.dueCardCount ?? 0;
  const activeRuns = dashboard?.activeRuns ?? [];

  return (
    <div className="min-h-screen aurora-bg">
      <div className="max-w-5xl mx-auto px-4 pt-[calc(var(--nav-h)+1.5rem)] pb-16">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">Dashboard</h1>
            <p className="text-sm text-slate-400 mt-0.5">
              {user?.email ? `Welcome back — pick up where you left off.` : 'Your research and learning home base.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => navigate('/learning')}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              <i className="fas fa-graduation-cap" /> Topic review
            </button>
            <button
              type="button"
              onClick={() => navigate('/search')}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500"
            >
              <i className="fas fa-search" /> New search
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </div>
        )}

        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { label: 'Day streak', value: stats?.currentStreak ?? 0, icon: 'fa-fire', tone: 'text-orange-500' },
            { label: 'Due reviews', value: dueTopics, icon: 'fa-clock', tone: dueTopics ? 'text-amber-500' : 'text-slate-400' },
            { label: 'Cards due', value: dueCards, icon: 'fa-layer-group', tone: dueCards ? 'text-rose-500' : 'text-slate-400' },
            { label: 'Syntheses', value: pendingJobs.length, icon: 'fa-wand-magic-sparkles', tone: pendingJobs.length ? 'text-indigo-500' : 'text-slate-400' },
          ].map((item) => (
            <div key={item.label} className="neo-card p-4 text-center">
              <i className={`fas ${item.icon} ${item.tone} text-lg mb-1 block`} />
              <div className="text-xl font-black text-slate-800 dark:text-white">{item.value}</div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-0.5">{item.label}</div>
            </div>
          ))}
        </div>

        {(pendingLoading || pendingJobs.length > 0) && (
          <section className="neo-card p-5 mb-6">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <i className="fas fa-wand-magic-sparkles text-indigo-500" />
                Pending syntheses
              </h2>
              <button type="button" onClick={() => void refreshPending()} className="text-[11px] font-semibold text-indigo-600 hover:underline dark:text-indigo-400">
                Refresh
              </button>
            </div>
            {pendingLoading && pendingJobs.length === 0 ? (
              <div className="space-y-2">
                {[1, 2].map((i) => (
                  <div key={i} className="h-14 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {pendingJobs.map((job) => (
                  <button
                    key={job.jobKey}
                    type="button"
                    onClick={() => void openPendingJob(job.jobKey, job.topic)}
                    className="w-full flex items-center gap-3 rounded-xl border border-indigo-100 bg-indigo-50/50 px-4 py-3 text-left hover:bg-indigo-50 dark:border-indigo-900/40 dark:bg-indigo-950/20 dark:hover:bg-indigo-950/35 transition-colors"
                  >
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/50">
                      {job.status === 'running' ? (
                        <i className="fas fa-circle-notch fa-spin text-indigo-600 dark:text-indigo-300 text-sm" />
                      ) : (
                        <i className="fas fa-hourglass-half text-indigo-600 dark:text-indigo-300 text-sm" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{job.topic}</span>
                      <span className="block text-xs text-slate-500 dark:text-slate-400">
                        {job.status === 'running' ? 'Synthesis running…' : 'Queued — tap to open topic'}
                      </span>
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-300 shrink-0">
                      Open
                    </span>
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        <div className="grid gap-6 lg:grid-cols-2 mb-6">
          <section className="neo-card p-5">
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
              <i className="fas fa-history text-slate-400" /> Recent searches
            </h2>
            {searchHistory.length === 0 ? (
              <p className="text-sm text-slate-400">No saved searches yet. Start from Search.</p>
            ) : (
              <div className="space-y-2">
                {searchHistory.map((entry) => (
                  <button
                    key={`${entry.query}-${entry.timestamp}`}
                    type="button"
                    onClick={() => openSearchTopic(navigate, entry.query)}
                    className="w-full flex items-center justify-between gap-3 rounded-xl border border-slate-100 dark:border-slate-700 px-3 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">{entry.query}</span>
                      <span className="block text-[10px] text-slate-400">
                        {entry.results_count} results · {new Date(entry.timestamp).toLocaleString()}
                      </span>
                    </span>
                    <i className="fas fa-arrow-right text-[10px] text-slate-300 shrink-0" />
                  </button>
                ))}
              </div>
            )}
            <button type="button" onClick={() => navigate('/history')} className="mt-3 text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400">
              Full search history →
            </button>
          </section>

          <section className="neo-card p-5">
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
              <i className="fas fa-chart-line text-emerald-500" /> Learning progress
            </h2>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Overall accuracy</span>
                <span className="font-bold text-slate-800 dark:text-slate-100">{stats?.overallAccuracy ?? 0}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Topics studied</span>
                <span className="font-bold text-slate-800 dark:text-slate-100">{stats?.topicsStudied ?? 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Questions answered</span>
                <span className="font-bold text-slate-800 dark:text-slate-100">{stats?.totalQuizzes ?? 0}</span>
              </div>
              {dueTopics > 0 && (
                <button
                  type="button"
                  onClick={() => navigate('/learning')}
                  className="mt-2 w-full rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 px-3 py-2 text-xs font-bold text-amber-800 dark:text-amber-200"
                >
                  {dueTopics} topic{dueTopics === 1 ? '' : 's'} due for review
                </button>
              )}
              {activeRuns.length > 0 && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">In-progress reviews</p>
                  {activeRuns.slice(0, 3).map((run) => (
                    <button
                      key={run.id}
                      type="button"
                      onClick={() => navigate(`/learning/${run.id}`)}
                      className="mb-1.5 w-full text-left text-xs font-semibold text-indigo-700 hover:underline dark:text-indigo-300 capitalize"
                    >
                      {run.topic}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button type="button" onClick={() => navigate('/learning')} className="mt-3 text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400">
              Open learning dashboard →
            </button>
          </section>
        </div>

        {(driftAlerts.length > 0 || practiceAlerts.length > 0) && (
          <section className="neo-card p-5 mb-6">
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
              <i className="fas fa-bell text-rose-500" /> Alerts
            </h2>
            <div className="space-y-2">
              {driftAlerts.map((alert) => (
                <div key={alert.id} className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 dark:border-amber-900/50 dark:bg-amber-950/20">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">{alert.displayTopic || alert.title || 'Evidence update'}</p>
                      <p className="text-xs text-amber-800/80 dark:text-amber-200/80 mt-0.5 line-clamp-2">{alert.summary || alert.title}</p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      {(alert.displayTopic || alert.normalizedTopic) && (
                        <button type="button" onClick={() => openSearchTopic(navigate, alert.displayTopic || alert.normalizedTopic)} className="text-[11px] font-bold text-amber-800 dark:text-amber-200 hover:underline">
                          Open
                        </button>
                      )}
                      <button type="button" onClick={() => void dismissDriftAlert(alert.id)} className="text-[11px] font-bold text-slate-500 hover:underline">
                        Dismiss
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {practiceAlerts.map((alert) => (
                <PracticeAlertCard
                  key={alert.objectKey}
                  objectKey={alert.objectKey}
                  title={alert.title}
                  topic={alert.topic || undefined}
                  rationale={alert.rationale || undefined}
                  onQuiz={alert.topic ? () => {
                    sessionStorage.setItem(QUIZ_PREFILL_KEY, JSON.stringify({ topic: alert.topic }));
                    navigate('/quiz');
                  } : undefined}
                />
              ))}
            </div>
          </section>
        )}

        {recommendations.length > 0 && (
          <section className="neo-card p-5">
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
              <i className="fas fa-compass text-violet-500" /> For you
            </h2>
            <div className="grid gap-2 sm:grid-cols-2">
              {recommendations.map((rec) => (
                <button
                  key={`${rec.type}-${rec.normalizedTopic}`}
                  type="button"
                  onClick={() => handleRecommendation(rec)}
                  className="rounded-xl border border-violet-100 bg-violet-50/40 px-4 py-3 text-left hover:bg-violet-50 dark:border-violet-900/40 dark:bg-violet-950/20 dark:hover:bg-violet-950/35 transition-colors"
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider text-violet-500">{REC_TYPE_LABELS[rec.type] || rec.type}</span>
                  <span className="block text-sm font-semibold text-slate-800 dark:text-slate-100 mt-1 line-clamp-2">{rec.topic}</span>
                  {rec.reason && <span className="block text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">{rec.reason}</span>}
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};
