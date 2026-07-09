import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@services/api';
import { useSearchContext } from '@contexts/SearchContext';
import type {
  CalibrationSummary,
  LearningDashboard as LearningDashboardType,
  LearningInsight,
  LearningProfile,
  UserTopicMemory,
} from '@types';
import type { JudgementProfile, PracticeAlertItem } from '@components/learning/dashboard';
import { CASE_PREFILL_KEY, LearningDashboardTab, QUIZ_PREFILL_KEY } from '../utils/learningDashboardConstants';

export function useLearningDashboardPage() {
  const navigate = useNavigate();
  const { setDetectedTopic, setCurrentPage } = useSearchContext();

  const [dashboard, setDashboard] = useState<LearningDashboardType | null>(null);
  const [insights, setInsights] = useState<LearningInsight[]>([]);
  const [calibration, setCalibration] = useState<CalibrationSummary | null>(null);
  const [profile, setProfile] = useState<LearningProfile | null>(null);
  const [topicMemories, setTopicMemories] = useState<UserTopicMemory[]>([]);
  const [practiceAlerts, setPracticeAlerts] = useState<PracticeAlertItem[]>([]);
  const [judgement, setJudgement] = useState<JudgementProfile>({ profile: [], tags: [] });
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
    try {
      sessionStorage.setItem(QUIZ_PREFILL_KEY, JSON.stringify({ topic, studyRunId, difficulty: 'mixed', articles: [] }));
    } catch { /* ignore */ }
    const params = new URLSearchParams({ topic, difficulty: 'mixed' });
    if (studyRunId) params.set('studyRunId', String(studyRunId));
    navigate(`/quiz?${params.toString()}`);
  }, [setDetectedTopic, navigate]);

  const caseOnTopic = useCallback((topic: string) => {
    try {
      sessionStorage.setItem(CASE_PREFILL_KEY, JSON.stringify({ topic, learningMode: 'resident', articles: [] }));
    } catch { /* ignore */ }
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

    setStartTopic(topic);
    void startReview(topic);
  }, [loading, startReview]);

  const handleSaveProfile = useCallback(async (data: Partial<LearningProfile>) => {
    try {
      const { profile: updated } = await api.learning.updateLearningProfile(data);
      setProfile(updated);
    } catch { /* ignore */ }
  }, []);

  const goToCpdTab = useCallback(() => {
    setActiveTab('cpd');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const stats = dashboard?.stats;
  const hasData = (stats?.topicsStudied ?? 0) > 0;
  const activeRuns = dashboard?.activeRuns ?? [];
  const highInsights = insights.filter((i) => i.severity === 'high');

  return {
    navigate,
    setDetectedTopic,
    dashboard,
    insights,
    calibration,
    profile,
    topicMemories,
    practiceAlerts,
    judgement,
    loading,
    error,
    activeTab,
    setActiveTab,
    startTopic,
    setStartTopic,
    pendingStartTopic,
    drillTopic,
    caseOnTopic,
    handleInsightAction,
    startReview,
    handleSaveProfile,
    goToCpdTab,
    setCurrentPage,
    stats,
    hasData,
    activeRuns,
    highInsights,
  };
}
