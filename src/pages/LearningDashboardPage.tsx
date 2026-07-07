import React, { useEffect, useRef, useState, useCallback, Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@services/api';
import { useSearchContext } from '@contexts/SearchContext';
import type { LearningInsight, LearningProfile } from '@types';
import { DueReviewBadge } from '@components/learning/DailyReviewQueue';
import { PortfolioTab } from '@components/learning/PortfolioTab';
import { TopicProgressGrid } from '@components/learning/TopicProgressGrid';
import { InsightCard } from '@components/learning/LearningDashboardWidgets';
import { ProfileSettings } from '@components/learning/LearningDashboardPanels';
import { useLearningDashboardData } from './learning/useLearningDashboardData';
import { StartReviewCard } from './learning/StartReviewCard';
import { OverviewTab } from './learning/OverviewTab';

const LearningDashboardCpdTab = lazy(() =>
  import('./LearningDashboardCpdTab').then((m) => ({ default: m.LearningDashboardCpdTab })),
);

const QUIZ_PREFILL_KEY = 'med_quiz_prefill';
const CASE_PREFILL_KEY = 'med_case_prefill';

export const LearningDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { setDetectedTopic, setCurrentPage } = useSearchContext();
  const { dashboard, insights, calibration, profile, setProfile, topicMemories, practiceAlerts, judgement, loading, error, setError } = useLearningDashboardData();
  const [activeTab, setActiveTab] = useState<'overview' | 'topics' | 'cpd' | 'portfolio' | 'settings'>('overview');
  const [startTopic, setStartTopic] = useState('');
  const [pendingStartTopic, setPendingStartTopic] = useState<string | null>(null);
  const onboardingStartHandled = useRef(false);

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
  }, [navigate, setDetectedTopic, startTopic, setError]);

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
  }, [setProfile]);

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

        {/* FSRS spaced-rep cards due — highest priority banner */}
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

        {highInsights.length > 0 && (
          <div className="mb-5 space-y-2">
            {highInsights.map((ins, i) => (
              <InsightCard key={i} insight={ins} onAction={handleInsightAction} />
            ))}
          </div>
        )}

        <StartReviewCard
          startTopic={startTopic}
          setStartTopic={setStartTopic}
          startReview={startReview}
          pendingStartTopic={pendingStartTopic}
          activeRuns={activeRuns}
          navigate={navigate}
        />

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

        {stats && (
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-6">
            {[
              { value: stats.currentStreak,         label: 'Day Streak',  icon: 'fa-fire',        color: 'text-orange-500' },
              { value: `${stats.overallAccuracy}%`, label: 'Accuracy',    icon: 'fa-bullseye',    color: 'text-emerald-600' },
              { value: stats.totalQuizzes,           label: 'Questions',   icon: 'fa-brain',        color: 'text-indigo-600' },
              { value: stats.totalCases,             label: 'Cases',       icon: 'fa-stethoscope',  color: 'text-rose-500' },
              { value: stats.topicsStudied,          label: 'Topics',      icon: 'fa-layer-group',  color: 'text-amber-500' },
              { value: stats.longestStreak,          label: 'Best Streak', icon: 'fa-trophy',       color: 'text-sky-500' },
            ].map(({ value, label, icon, color }) => (
              <div key={label} className="neo-card p-4 text-center">
                <i className={`fas ${icon} ${color} text-lg mb-1 block`} />
                <div className="text-xl font-black text-slate-800 dark:text-white">{value}</div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        )}

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
            (dashboard?.dueCardCount ?? 0) > 0 ? 'bg-amber-100 dark:bg-amber-900/40' : 'bg-slate-100 dark:bg-slate-800/50'
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

        {activeTab === 'overview' && hasData && dashboard && (
          <OverviewTab
            dashboard={dashboard}
            insights={insights}
            calibration={calibration}
            practiceAlerts={practiceAlerts}
            topicMemories={topicMemories}
            judgement={judgement}
            dueCount={dueCount}
            drillTopic={drillTopic}
            caseOnTopic={caseOnTopic}
            handleInsightAction={handleInsightAction}
            navigate={navigate}
            setDetectedTopic={setDetectedTopic}
          />
        )}

        {activeTab === 'topics' && (
          <TopicProgressGrid onQuiz={drillTopic} onCase={caseOnTopic} />
        )}

        {activeTab === 'cpd' && (
          <Suspense fallback={
            <div className="neo-card p-8 flex justify-center">
              <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
            </div>
          }>
            <LearningDashboardCpdTab />
          </Suspense>
        )}

        {activeTab === 'portfolio' && (
          <div className="neo-card p-5">
            <PortfolioTab />
          </div>
        )}

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
