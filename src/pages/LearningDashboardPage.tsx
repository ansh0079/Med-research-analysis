import React, { useEffect, useRef, useState, useCallback, Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@services/api';
import { useSearchContext } from '@contexts/SearchContext';
import type {
  LearningDashboard as LearningDashboardType,
  LearningInsight,
  LearningProfile,
  CalibrationSummary,
  UserTopicMemory,
} from '@types';
import { PortfolioTab } from '@components/learning/PortfolioTab';
import { TopicProgressGrid } from '@components/learning/TopicProgressGrid';
import { LearningProfileSettings } from '@components/learning/LearningProfileSettings';
import { LearningDashboardStartSection } from '@components/learning/LearningDashboardStartSection';
import { LearningDashboardOverviewTab } from '@components/learning/LearningDashboardOverviewTab';
import {
  LearningDashboardFsrsBanner,
  LearningDashboardHighInsights,
  LearningDashboardCurricula,
  LearningDashboardStatsRow,
  LearningDashboardDueCardButton,
  LearningDashboardTabs,
  LearningDashboardEmptyState,
  type LearningDashboardTab,
} from '@components/learning/LearningDashboardChrome';

const LearningDashboardCpdTab = lazy(() =>
  import('./LearningDashboardCpdTab').then((m) => ({ default: m.LearningDashboardCpdTab })),
);

const QUIZ_PREFILL_KEY = 'med_quiz_prefill';
const CASE_PREFILL_KEY = 'med_case_prefill';

export const LearningDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { setDetectedTopic, setCurrentPage } = useSearchContext();
  const [dashboard, setDashboard] = useState<LearningDashboardType | null>(null);
  const [insights, setInsights] = useState<LearningInsight[]>([]);
  const [calibration, setCalibration] = useState<CalibrationSummary | null>(null);
  const [profile, setProfile] = useState<LearningProfile | null>(null);
  const [topicMemories, setTopicMemories] = useState<UserTopicMemory[]>([]);
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
  const [activeTab, setActiveTab] = useState<LearningDashboardTab>('overview');
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

  const jumpToCpdTab = useCallback(() => {
    setActiveTab('cpd');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleSearchTopic = useCallback((topic: string) => {
    setDetectedTopic(topic);
    navigate(`/?q=${encodeURIComponent(topic)}`);
  }, [setDetectedTopic, navigate]);

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
  const dueCardCount = dashboard?.dueCardCount ?? 0;

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

        <LearningDashboardFsrsBanner dueCardCount={dueCardCount} onReviewNow={jumpToCpdTab} />
        <LearningDashboardHighInsights insights={highInsights} onAction={handleInsightAction} />

        <LearningDashboardStartSection
          startTopic={startTopic}
          pendingStartTopic={pendingStartTopic}
          activeRuns={activeRuns}
          onStartTopicChange={setStartTopic}
          onStartReview={startReview}
          onOpenRun={(runId) => navigate(`/learning/${runId}`)}
        />

        {dashboard?.curriculaOverview && dashboard.curriculaOverview.length > 0 && (
          <LearningDashboardCurricula
            curricula={dashboard.curriculaOverview}
            onOpenPaths={() => navigate('/study-paths')}
          />
        )}

        {stats && <LearningDashboardStatsRow stats={stats} />}

        <LearningDashboardDueCardButton dueCardCount={dueCardCount} onClick={jumpToCpdTab} />

        <LearningDashboardTabs activeTab={activeTab} onTabChange={setActiveTab} />

        {!hasData && activeTab !== 'settings' && activeTab !== 'portfolio' && (
          <LearningDashboardEmptyState onStartReview={() => setActiveTab('overview')} />
        )}

        {activeTab === 'overview' && hasData && dashboard && (
          <LearningDashboardOverviewTab
            dashboard={dashboard}
            insights={insights}
            calibration={calibration}
            practiceAlerts={practiceAlerts}
            judgement={judgement}
            topicMemories={topicMemories}
            dueCount={dueCount}
            onNavigate={navigate}
            onInsightAction={handleInsightAction}
            onDrillTopic={drillTopic}
            onCaseTopic={caseOnTopic}
            onSearchTopic={handleSearchTopic}
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
            <LearningProfileSettings profile={profile} onSave={handleSaveProfile} />
          </div>
        )}
      </div>
    </div>
  );
};
