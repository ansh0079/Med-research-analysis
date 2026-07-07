import { useState, useEffect } from 'react';
import { api } from '@services/api';
import type { LearningDashboard, LearningInsight, LearningProfile, CalibrationSummary, UserTopicMemory } from '@types';

export type PracticeAlert = {
  objectKey: string;
  objectType: string;
  topic?: string | null;
  title: string;
  classification: string;
  rationale?: string | null;
};

export type JudgementData = {
  profile: Array<{
    topic: string;
    attempts: number;
    correct: number;
    accuracy: number;
    lastAttemptAt?: string | null;
  }>;
  tags: Array<{
    tag: string;
    count: number;
    wrongCount: number;
    lastSeenAt?: string | null;
    examples?: Array<{ topic: string | null; questionText: string; isCorrect: boolean }>;
  }>;
};

export interface LearningDashboardData {
  dashboard: LearningDashboard | null;
  insights: LearningInsight[];
  calibration: CalibrationSummary | null;
  profile: LearningProfile | null;
  setProfile: (profile: LearningProfile | null) => void;
  topicMemories: UserTopicMemory[];
  practiceAlerts: PracticeAlert[];
  judgement: JudgementData;
  loading: boolean;
  error: string;
  setError: (error: string) => void;
}

export function useLearningDashboardData(): LearningDashboardData {
  const [dashboard, setDashboard] = useState<LearningDashboard | null>(null);
  const [insights, setInsights] = useState<LearningInsight[]>([]);
  const [calibration, setCalibration] = useState<CalibrationSummary | null>(null);
  const [profile, setProfile] = useState<LearningProfile | null>(null);
  const [topicMemories, setTopicMemories] = useState<UserTopicMemory[]>([]);
  const [practiceAlerts, setPracticeAlerts] = useState<PracticeAlert[]>([]);
  const [judgement, setJudgement] = useState<JudgementData>({ profile: [], tags: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  return { dashboard, insights, calibration, profile, setProfile, topicMemories, practiceAlerts, judgement, loading, error, setError };
}
