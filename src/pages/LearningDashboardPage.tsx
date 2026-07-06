import React, { useEffect, useRef, useState, useCallback, Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@services/api';
import { useSearchContext } from '@contexts/SearchContext';
import type { LearningDashboard as LearningDashboardType, LearningInsight, LearningProfile, CalibrationSummary } from '@types';
import { DueReviewBadge } from '@components/learning/DailyReviewQueue';
import { SpacedRepMemoryPanel } from '@components/learning/SpacedRepMemoryPanel';
import { PortfolioTab } from '@components/learning/PortfolioTab';
import { PracticeAlertCard } from '@components/ui';
import { TopicProgressGrid } from '@components/learning/TopicProgressGrid';
import { MasteryBar, QTYPE_BARS, InsightCard, CalibrationSummaryCard } from '@components/learning/LearningDashboardWidgets';
import { ForYouPanel, ProfileSettings } from '@components/learning/LearningDashboardPanels';

const LearningDashboardCpdTab = lazy(() =>
  import('./LearningDashboardCpdTab').then((m) => ({ default: m.LearningDashboardCpdTab })),
);

const QUIZ_PREFILL_KEY = 'med_quiz_prefill';
const CASE_PREFILL_KEY = 'med_case_prefill';

const STARTER_TOPIC_SETS = [
  { label: 'Clerkship cardio', topics: ['Acute coronary syndrome', 'Atrial fibrillation', 'Heart failure'] },
  { label: 'Acute take', topics: ['Sepsis', 'Pulmonary embolism', 'Diabetic ketoacidosis'] },
  { label: 'Respiratory ward', topics: ['Asthma exacerbation', 'COPD exacerbation', 'Pneumonia'] },
  { label: 'Exam core', topics: ['Anaemia', 'Acute kidney injury', 'Meningitis'] },
] as const;


export const LearningDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { setDetectedTopic, setCurrentPage } = useSearchContext();
  const [dashboard, setDashboard] = useState<LearningDashboardType | null>(null);
  const [insights, setInsights] = useState<LearningInsight[]>([]);
  const [calibration, setCalibration] = useState<CalibrationSummary | null>(null);
  const [profile, setProfile] = useState<LearningProfile | null>(null);
  const [topicMemories, setTopicMemories] = useState<import('../types').UserTopicMemory[]>([]);
  const [practiceAlerts, setPracticeAlerts] = useState<Array<{
    objectKey: string; objectType: string; topic?: string | null;
    title: string; classification: string; rationale?: string | null;
  }>>([]);
  const [judgement, setJudgement] = useState<{
    profile: Array<{
      topic: string; attempts: number; correct: number; accuracy: number; lastAttemptAt?: string | null;
    }>;
    tags: Array<{
      tag: string; count: number; wrongCount: number; lastSeenAt?: string | null;
      examples?: Array<{ topic: string | null; questionText: string; isCorrect: boolean }>;
    }>;
  }>({ profile: [], tags: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'topics' | 'cpd' | 'portfolio' | 'settings'>('overview');
  const [startTopic, setStartTopic] = useState('');
  const [pendingStartTopic, setPendingStartTopic] = useState<string | null>(null);
  const onboardingStartHandled = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const [dash, insightData, memData] = await Promise.all([
          api.learning.getLearningDashboard(),
          api.learning.getLearningInsights().catch(() => ({ insights: [], profile: null, calibration: null })),
          api.learning.listTopicMemory(10, 0).catch(() => ({ memories: [] })),
        ]);
        if (!cancelled) {
          setDashboard(dash);
          setInsights(insightData.insights);
          setCalibration(insightData.calibration ?? null);
          setProfile(insightData.profile ?? dash.profile);
          setTopicMemories(memData.memories);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [alertsRes, judgRes] = await Promise.allSettled([
        api.knowledge.getPracticeAlerts('', 15),
        api.knowledge.getEvidenceJudgementProfile('', 12),
      ]);
      if (cancelled) return;
      if (alertsRes.status === 'fulfilled') setPracticeAlerts(alertsRes.value.alerts);
      if (judgRes.status === 'fulfilled') {
        setJudgement({
          profile: judgRes.value.profile.topics || [],
          tags: judgRes.value.profile.tags || [],
        });
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const drillTopic = useCallback((topic: string, studyRunId?: number) => {
    setDetectedTopic(topic);
    try { sessionStorage.setItem(QUIZ_PREFILL_KEY, JSON.stringify({ topic, studyRunId, difficulty: 'mixed', articles: [] })); } catch { /* ignore */ }
    const params = new URLSearchParams({ topic, difficulty: 'mixed' });
    if (studyRunId) params.set('studyRunId', String(studyRunId));
    navigate(`/quiz?${params.toString()}`);
  }, [setDetectedTopic, navigate]);

  const caseOnTopic = useCallback((topic: string) => {
    try { sessionStorage.setItem(CASE_PREFILL_KEY, JSON.stringify({ topic, learningMode: 'resident', articles: [] })); } catch { /* ignore */ }
    setCurrentPage('case');
  }, [setCurrentPage]);

  const handleInsightAction = useCallback((insight: LearningInsight) => {
    if (insight.type === 'review_due' || insight.type === 'strength' || insight.type === 'coverage_gap' || insight.type === 'active_run') {
      if (insight.studyRunId) navigate(`/learning/${insight.studyRunId}`);
      else if (insight.topic) drillTopic(insight.topic);
    } else if (insight.type === 'weak_type') {
      if (insight.topic) drillTopic(insight.topic, insight.studyRunId);
      else setCurrentPage('quiz');
    } else if (insight.type === 'onboarding') {
      setCurrentPage('quiz');
    }
  }, [drillTopic, navigate, setCurrentPage]);

  const startReview = useCallback(async (topicOverride?: string) => {
    const topic = String(topicOverride || startTopic || '').trim();
    if (topic.length < 2) return;
    setPendingStartTopic(topic);
    try {
      const { run } = await api.learning.createStudyRun(topic);
      setDetectedTopic(topic);
      navigate(`/learning/${run.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start review');
    } finally {
      setPendingStartTopic(null);
    }
  }, [navigate, setDetectedTopic, startTopic]);

  useEffect(() => {
    if (onboardingStartHandled.current || loading) return;
    const topic = sessionStorage.getItem('med_learning_start_topic');
    if (!topic) return;
    onboardingStartHandled.current = true;
    sessionStorage.removeItem('med_learning_start_topic');
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStartTopic(topic);
    void startReview(topic);
  }, [loading, startReview]);

  const handleSaveProfile = useCallback(async (data: Partial<LearningProfile>) => {
    try {
      const { profile: updated } = await api.learning.updateLearningProfile(data);
      setProfile(updated);
    } catch { /* ignore */ }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen aurora-bg flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen aurora-bg flex items-center justify-center px-4">
        <div className="text-center">
          <i className="fas fa-exclamation-circle text-3xl text-red-400 mb-3 block" />
          <p className="text-red-500 font-semibold mb-2">{error}</p>
          <button type="button" onClick={() => window.location.reload()} className="text-sm text-indigo-600 hover:underline">Retry</button>
        </div>
      </div>
    );
  }

  const stats = dashboard?.stats;
  const hasData = (stats?.topicsStudied ?? 0) > 0;
  const activeRuns = dashboard?.activeRuns ?? [];
  const dueCount = dashboard?.reviewQueue?.length ?? 0;
  const highInsights = insights.filter((i) => i.severity === 'high');

  return (
    <div className="min-h-screen aurora-bg">
      <div className="max-w-4xl mx-auto px-4 pt-[calc(var(--nav-h)+1.5rem)] pb-16">

        {/* Header */}
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">Topic Review</h1>
            <p className="text-sm text-slate-400 mt-0.5">
              {profile?.persona ? `${profile.persona} · ` : ''}
              Start a topic, read the map, quiz weak nodes, close the gaps
            </p>
          </div>
          <button type="button" onClick={() => setCurrentPage('search')}
            className="shrink-0 flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">
            <i className="fas fa-search" /> Search papers
          </button>
        </div>

        {/* FSRS spaced-rep cards due banner — highest priority */}
        {(dashboard?.dueCardCount ?? 0) > 0 && (
          <div className="rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/50 p-4 flex items-center gap-4 mb-5">
            <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-900/40 flex items-center justify-center shrink-0">
              <i className="fas fa-layer-group text-rose-600 dark:text-rose-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-rose-800 dark:text-rose-300">
                {dashboard!.dueCardCount} card{dashboard!.dueCardCount! > 1 ? 's' : ''} due for review
              </p>
              <p className="text-xs text-rose-600 dark:text-rose-400 truncate">
                Your spaced-repetition queue is waiting — reviewing now locks knowledge in long-term memory.
              </p>
            </div>
            <button
              type="button"
              onClick={() => { setActiveTab('cpd'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              className="shrink-0 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors"
            >
              Review now
            </button>
          </div>
        )}

        {/* Urgent alerts strip */}
        {highInsights.length > 0 && (
          <div className="mb-5 space-y-2">
            {highInsights.map((ins, i) => (
              <InsightCard key={i} insight={ins} onAction={handleInsightAction} />
            ))}
          </div>
        )}

        <div className="neo-card p-5 mb-6">
          <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
            <div>
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <i className="fas fa-play-circle text-indigo-500" /> Start a guided topic review
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Choose any topic, then move through knowledge map, evidence, quiz, and gap report in one run.
              </p>
              <input
                value={startTopic}
                onChange={(e) => setStartTopic(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') void startReview(); }}
                placeholder="Topic, e.g. ARDS corticosteroids"
                className="mt-3 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <button
              type="button"
              disabled={pendingStartTopic !== null || startTopic.trim().length < 2}
              onClick={() => void startReview()}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-bold transition-colors"
            >
              {pendingStartTopic !== null && pendingStartTopic === startTopic.trim() ? <><i className="fas fa-spinner fa-spin mr-2" />Starting...</> : <><i className="fas fa-play mr-2" />Start Review</>}
            </button>
          </div>
          <div className="mt-4 border-t border-slate-100 dark:border-slate-700 pt-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Quick starts</p>
            <div className="space-y-3">
              {STARTER_TOPIC_SETS.map((set) => (
                <div key={set.label} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300 sm:w-32 shrink-0">{set.label}</span>
                  <div className="flex flex-wrap gap-2">
                    {set.topics.map((topic) => (
                      <button
                        key={topic}
                        type="button"
                        disabled={pendingStartTopic !== null}
                        onClick={() => void startReview(topic)}
                        className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:border-indigo-300 hover:text-indigo-600 disabled:opacity-50 transition-colors inline-flex items-center gap-1.5"
                      >
                        {pendingStartTopic === topic ? <i className="fas fa-circle-notch fa-spin text-[10px]" aria-hidden /> : null}
                        {topic}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          {activeRuns.length > 0 && (
            <div className="mt-4 space-y-2">
              {activeRuns.slice(0, 4).map((run) => {
                const total = Number(run.progress?.totalNodes || Object.keys(run.nodeCoverage || {}).length || 0);
                const covered = Number(run.progress?.coveredNodes || Object.values(run.nodeCoverage || {}).filter((n) => n.seen).length || 0);
                return (
                  <div key={run.id} className="rounded-xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800/50 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => navigate(`/learning/${run.id}`)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate capitalize">{run.topic}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {total > 0 ? `${covered}/${total} nodes covered` : 'Run ready'} · {new Date(run.lastActiveAt).toLocaleDateString()}
                        </p>
                      </div>
                      <i className="fas fa-arrow-right text-slate-300 text-[10px] shrink-0" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {dashboard?.curriculaOverview && dashboard.curriculaOverview.length > 0 && (
          <div className="neo-card p-5 mb-6">
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-3">
              <i className="fas fa-route text-rose-500" /> Exam study paths
            </h2>
            <p className="text-xs text-slate-400 mb-4">
              Structured blocks by exam stage—see how many path topics you have started and quizzed.
            </p>
            <div className="space-y-3">
              {dashboard.curriculaOverview.map((c) => (
                <div
                  key={c.id}
                  className="rounded-xl border border-slate-100 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/40 px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{c.name}</p>
                    {c.examStageLabel && (
                      <p className="text-[10px] text-slate-400 mt-0.5">{c.examStageLabel}</p>
                    )}
                    {c.examSummary && (
                      <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1 font-semibold">
                        {c.examSummary.pctTopicsTouched}% topics started
                        <span className="text-slate-400 font-normal">
                          {' '}({c.examSummary.topicsStarted}/{c.examSummary.totalTopics} · {c.examSummary.confident} confident)
                        </span>
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate('/study-paths')}
                    className="shrink-0 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors"
                  >
                    Open paths
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stats Row */}
        {stats && (
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-6">
            {[
              { value: stats.currentStreak,    label: 'Day Streak',  icon: 'fa-fire',        color: 'text-orange-500' },
              { value: `${stats.overallAccuracy}%`, label: 'Accuracy', icon: 'fa-bullseye',  color: 'text-emerald-600' },
              { value: stats.totalQuizzes,     label: 'Questions',   icon: 'fa-brain',        color: 'text-indigo-600' },
              { value: stats.totalCases,       label: 'Cases',       icon: 'fa-stethoscope',  color: 'text-rose-500' },
              { value: stats.topicsStudied,    label: 'Topics',      icon: 'fa-layer-group',  color: 'text-amber-500' },
              { value: stats.longestStreak,    label: 'Best Streak', icon: 'fa-trophy',       color: 'text-sky-500' },
            ].map(({ value, label, icon, color }) => (
              <div key={label} className="neo-card p-4 text-center">
                <i className={`fas ${icon} ${color} text-lg mb-1 block`} />
                <div className="text-xl font-black text-slate-800 dark:text-white">{value}</div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Spaced-rep due card count — always visible, clickable */}
        <button
          type="button"
          onClick={() => { setActiveTab('cpd'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
          className={`w-full mb-6 rounded-2xl border p-4 flex items-center gap-4 transition-colors ${
            (dashboard?.dueCardCount ?? 0) > 0
              ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/50 hover:bg-amber-100 dark:hover:bg-amber-900/40'
              : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800/50'
          }`}
        >
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            (dashboard?.dueCardCount ?? 0) > 0
              ? 'bg-amber-100 dark:bg-amber-900/40'
              : 'bg-slate-100 dark:bg-slate-800/50'
          }`}>
            <i className={`fas fa-layer-group ${
              (dashboard?.dueCardCount ?? 0) > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400 dark:text-slate-500'
            }`} />
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className={`text-sm font-bold ${
              (dashboard?.dueCardCount ?? 0) > 0 ? 'text-amber-800 dark:text-amber-300' : 'text-slate-600 dark:text-slate-300'
            }`}>
              {(dashboard?.dueCardCount ?? 0) > 0
                ? `${dashboard!.dueCardCount} card${dashboard!.dueCardCount! > 1 ? 's' : ''} due for review`
                : 'No cards due for review'}
            </p>
            <p className={`text-xs truncate ${
              (dashboard?.dueCardCount ?? 0) > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400 dark:text-slate-500'
            }`}>
              {(dashboard?.dueCardCount ?? 0) > 0
                ? 'Click to jump to your spaced-repetition queue'
                : 'You\'re all caught up — great work!'}
            </p>
          </div>
          <i className={`fas fa-chevron-right text-xs shrink-0 ${
            (dashboard?.dueCardCount ?? 0) > 0 ? 'text-amber-400' : 'text-slate-300'
          }`} />
        </button>

        {/* Tabs */}
        <div className="flex gap-1 mb-5 border-b border-slate-200 dark:border-slate-700">
          {(['overview', 'topics', 'cpd', 'portfolio', 'settings'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-xs font-bold capitalize transition-colors border-b-2 -mb-px ${
                activeTab === tab
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              {tab === 'settings' ? <><i className="fas fa-sliders-h mr-1" />Profile</>
                : tab === 'cpd' ? <><i className="fas fa-file-medical-alt mr-1" />CPD<DueReviewBadge /></>
                : tab === 'portfolio' ? <><i className="fas fa-folder-open mr-1" />Portfolio</>
                : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Empty state */}
        {!hasData && activeTab !== 'settings' && activeTab !== 'portfolio' && (
          <div className="neo-card p-10 text-center">
            <i className="fas fa-graduation-cap text-4xl text-indigo-300 mb-4 block" />
            <h2 className="text-lg font-bold text-slate-700 dark:text-slate-200 mb-2">No study data yet</h2>
            <p className="text-sm text-slate-400 mb-6">Start a topic review from the box above, or jump straight into a quiz from a topic name.</p>
            <button type="button" onClick={() => setActiveTab('overview')}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-colors">
              <i className="fas fa-play mr-2" /> Start a review
            </button>
          </div>
        )}

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && hasData && (
          <div className="space-y-5">
            <ForYouPanel onNavigate={navigate} />
            <SpacedRepMemoryPanel />

            {/* All insights */}
            {insights.length > 0 && (
              <div className="neo-card p-5">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
                  <i className="fas fa-lightbulb text-amber-500" /> Your learning insights
                </h3>
                <div className="space-y-2">
                  {insights.map((ins, i) => (
                  <InsightCard key={i} insight={ins} onAction={handleInsightAction} />
                  ))}
                </div>
              </div>
            )}

            {/* Confidence calibration reliability diagram */}
            {calibration && <CalibrationSummaryCard calibration={calibration} />}

            {/* Practice-changing alerts */}
            {practiceAlerts.length > 0 && (
              <div className="neo-card p-5">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
                  <i className="fas fa-bell text-rose-500" /> Practice-changing evidence
                  <span className="ml-auto text-[10px] font-normal text-slate-400">{practiceAlerts.length} item{practiceAlerts.length !== 1 ? 's' : ''}</span>
                </h3>
                <div className="space-y-2">
                  {practiceAlerts.slice(0, 6).map((alert) => (
                    <PracticeAlertCard
                      key={alert.objectKey}
                      objectKey={alert.objectKey}
                      title={alert.title}
                      topic={alert.topic}
                      rationale={alert.rationale}
                      onQuiz={alert.topic ? () => drillTopic(alert.topic!) : undefined}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Review due banner */}
            {dueCount > 0 && (
              <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
                  <i className="fas fa-clock text-amber-600 dark:text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-amber-800 dark:text-amber-300">{dueCount} topic{dueCount > 1 ? 's' : ''} due for review</p>
                  <p className="text-xs text-amber-600 dark:text-amber-400 truncate">
                    {dashboard!.reviewQueue.slice(0, 3).map((m) => m.topic).join(', ')}{dueCount > 3 ? ` +${dueCount - 3} more` : ''}
                  </p>
                </div>
                <button type="button" onClick={() => drillTopic(dashboard!.reviewQueue[0].topic)}
                  className="shrink-0 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors">
                  Review now
                </button>
              </div>
            )}

            {/* Weak topics quick-drill */}
            {(dashboard?.weakTopics?.length ?? 0) > 0 && (
              <div className="neo-card p-5">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
                  <i className="fas fa-exclamation-triangle text-amber-500" /> Weak spots — needs drilling
                </h3>
                <div className="space-y-2">
                  {dashboard!.weakTopics.map((m) => (
                    <div key={m.normalizedTopic} className="flex items-center gap-3 rounded-xl border border-slate-100 dark:border-slate-700 px-3 py-2.5 bg-white dark:bg-slate-800/50">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate capitalize">{m.topic}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <div className="flex-1 h-1 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden max-w-[120px]">
                            <div className="h-full bg-red-400 rounded-full" style={{ width: `${Math.min(m.overallScore, 100)}%` }} />
                          </div>
                          <span className="text-[10px] text-red-500 font-semibold">{m.overallScore}%</span>
                        </div>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <button type="button" onClick={() => drillTopic(m.topic)}
                          className="px-2.5 py-1 rounded-lg bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-[11px] font-bold transition-colors">
                          <i className="fas fa-brain mr-1" /> Quiz
                        </button>
                        <button type="button" onClick={() => caseOnTopic(m.topic)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold transition-colors">
                          <i className="fas fa-stethoscope mr-1" /> Case
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Stale topics — searched but not recently quizzed */}
            {topicMemories.filter((m) => m.memoryTier === 'sparse' && m.weakOutlineNodeIds.length > 0).length > 0 && (
              <div className="neo-card p-5">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
                  <i className="fas fa-hourglass-half text-orange-500" /> Stale topics — knowledge gaps detected
                </h3>
                <div className="space-y-2">
                  {topicMemories
                    .filter((m) => m.memoryTier === 'sparse' && m.weakOutlineNodeIds.length > 0)
                    .slice(0, 5)
                    .map((m) => (
                      <div key={m.normalizedTopic} className="flex items-center gap-3 rounded-xl border border-orange-100 dark:border-orange-900/30 bg-orange-50/50 dark:bg-orange-950/20 px-3 py-2.5">
                        <i className="fas fa-exclamation-circle text-orange-400 text-xs shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate capitalize">{m.displayTopic || m.normalizedTopic}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{m.weakOutlineNodeIds.length} weak concept{m.weakOutlineNodeIds.length !== 1 ? 's' : ''} · {m.searchCount} search{m.searchCount !== 1 ? 'es' : ''}</p>
                        </div>
                        <button type="button" onClick={() => drillTopic(m.displayTopic || m.normalizedTopic)}
                          className="shrink-0 text-[10px] font-bold px-2 py-1 rounded-lg bg-orange-100 text-orange-700 hover:bg-orange-200 dark:bg-orange-900/40 dark:text-orange-300 transition-colors">
                          Refresh
                        </button>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Topic Memory */}
            {topicMemories.length > 0 && (
              <div className="neo-card p-5">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
                  <i className="fas fa-memory text-violet-500" /> Topic memory
                </h3>
                <div className="space-y-2">
                  {topicMemories.slice(0, 5).map((m) => (
                    <div key={m.normalizedTopic} className="flex items-center gap-3 rounded-xl border border-slate-100 dark:border-slate-700 px-3 py-2.5 bg-white dark:bg-slate-800/50">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate capitalize">{m.displayTopic || m.normalizedTopic}</p>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                            m.memoryTier === 'strong'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                              : m.memoryTier === 'building'
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          }`}>
                            {m.memoryTier}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {m.searchCount} search{m.searchCount !== 1 ? 'es' : ''} · {m.topPaperCount} tracked · {m.savedPaperCount} saved · {m.weakOutlineNodeIds.length} weak
                        </p>
                      </div>
                      <button type="button" onClick={() => drillTopic(m.displayTopic || m.normalizedTopic)}
                        className="px-2.5 py-1 rounded-lg bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-[11px] font-bold transition-colors">
                        <i className="fas fa-brain mr-1" /> Quiz
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Mastery by question type */}
            {(dashboard?.mastery?.length ?? 0) > 0 && (
              <div className="neo-card p-5">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                  <i className="fas fa-chart-bar text-indigo-500" /> Average mastery by question type
                </h3>
                <div className="space-y-3">
                  {QTYPE_BARS.map((b) => {
                    const total = dashboard!.mastery.reduce((s, m) => s + (m[b.key] ?? 0), 0);
                    const avg = Math.round(total / Math.max(1, dashboard!.mastery.length));
                    return <MasteryBar key={b.key} label={b.label} score={avg} color={b.color} />;
                  })}
                </div>
              </div>
            )}

            {/* Evidence judgement profile — reasoning patterns + accuracy per topic */}
            {(judgement.tags.length > 0 || judgement.profile.length > 0) && (
              <div className="neo-card p-5">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
                  <i className="fas fa-balance-scale text-sky-500" /> Evidence judgement profile
                </h3>
                {judgement.tags.length > 0 && (
                  <div className="mb-4 space-y-2">
                    {judgement.tags.slice(0, 5).map((tag) => (
                      <div key={tag.tag} className="rounded-xl border border-sky-100 dark:border-sky-900/30 bg-sky-50/50 dark:bg-sky-950/20 px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-200 capitalize">{tag.tag.replace(/_/g, ' ')}</span>
                          <span className="ml-auto text-[10px] text-sky-600 dark:text-sky-300">{tag.wrongCount}/{tag.count} missed</span>
                        </div>
                        {tag.examples?.[0]?.questionText && (
                          <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2">{tag.examples[0].questionText}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {(() => {
                  const untestedCount = judgement.profile.filter((t) => t.attempts === 0).length;
                  return untestedCount > 0 ? (
                    <p className="text-[11px] text-amber-600 dark:text-amber-400 mb-3 flex items-center gap-1.5">
                      <i className="fas fa-question-circle" />
                      {untestedCount} topic{untestedCount !== 1 ? 's' : ''} untested — quiz them to build your profile
                    </p>
                  ) : null;
                })()}
                <div className="space-y-2">
                  {judgement.profile.filter((t) => t.attempts > 0).slice(0, 8).map((t) => (
                    <div key={t.topic} className="flex items-center gap-3">
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400 w-28 shrink-0 truncate capitalize">{t.topic}</span>
                      <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${t.accuracy >= 80 ? 'bg-emerald-500' : t.accuracy >= 60 ? 'bg-amber-500' : 'bg-red-400'}`}
                          style={{ width: `${Math.min(t.accuracy, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 w-8 text-right">{t.accuracy}%</span>
                      <button type="button" onClick={() => drillTopic(t.topic)}
                        className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-lg bg-sky-100 text-sky-700 hover:bg-sky-200 dark:bg-sky-900/40 dark:text-sky-300 transition-colors">
                        Drill
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent activity */}
            {((dashboard?.recentActivity.quizzes?.length ?? 0) + (dashboard?.recentActivity.cases?.length ?? 0) + (dashboard?.recentActivity.conversations?.length ?? 0)) > 0 && (
              <div className="neo-card p-5">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                  <i className="fas fa-history text-sky-500" /> Recent activity
                </h3>
                <div className="space-y-2">
                  {dashboard!.recentActivity.conversations?.slice(0, 3).map((c) => (
                    <div key={`conv-${c.id}`} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                      <i className="fas fa-comments text-emerald-500 text-xs shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate capitalize">{c.topic}</p>
                        <p className="text-[10px] text-slate-400">Mentor chat · {c.messageCount} messages · {new Date(c.lastMessageAt ?? c.createdAt).toLocaleDateString()}</p>
                      </div>
                      <button type="button"
                        onClick={() => { setDetectedTopic(c.topic); navigate(`/?q=${encodeURIComponent(c.topic)}`); }}
                        className="text-[10px] text-indigo-500 hover:underline shrink-0">
                        Search again
                      </button>
                    </div>
                  ))}
                  {dashboard!.recentActivity.quizzes?.slice(0, 3).map((q) => (
                    <div key={`q-${q.id}`} className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                      <div className="flex items-center gap-3 min-w-0">
                        <i className="fas fa-brain text-indigo-400 text-xs shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate capitalize">{q.topic}</p>
                          <p className="text-[10px] text-slate-400">{q.questionType} · {new Date(q.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${q.isCorrect ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        {q.isCorrect ? 'Correct' : 'Incorrect'}
                      </span>
                    </div>
                  ))}
                  {dashboard!.recentActivity.cases?.slice(0, 2).map((c) => (
                    <div key={`c-${c.id}`} className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                      <div className="flex items-center gap-3 min-w-0">
                        <i className="fas fa-stethoscope text-emerald-400 text-xs shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate capitalize">{c.topic}</p>
                          <p className="text-[10px] text-slate-400">{c.caseType} · {c.learningMode} · {new Date(c.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      {c.score !== undefined && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${c.score >= 70 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                          {c.score}%
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TOPICS TAB */}
        {activeTab === 'topics' && (
          <TopicProgressGrid onQuiz={drillTopic} onCase={caseOnTopic} />
        )}

        {/* CPD TAB */}
        {activeTab === 'cpd' && (
          <Suspense fallback={
            <div className="neo-card p-8 flex justify-center">
              <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
            </div>
          }>
            <LearningDashboardCpdTab />
          </Suspense>
        )}

        {/* PORTFOLIO TAB */}
        {activeTab === 'portfolio' && (
          <div className="neo-card p-5">
            <PortfolioTab />
          </div>
        )}

        {/* SETTINGS TAB */}
        {activeTab === 'settings' && (
          <div className="neo-card p-5 max-w-lg">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
              <i className="fas fa-user-graduate text-indigo-500" /> Learner profile
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              These preferences are shared with the Mentor agent so it can adapt explanations, MCQ difficulty, and case complexity to you.
            </p>
            <ProfileSettings profile={profile} onSave={handleSaveProfile} />
          </div>
        )}
      </div>
    </div>
  );
};
