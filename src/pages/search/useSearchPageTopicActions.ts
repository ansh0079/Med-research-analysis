import { useCallback, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '@services/api';
import type { AgentGuidance, Article, TopicGuideStatus } from '@types';
import type { AppPage } from '@contexts/SearchContext';

interface UseSearchPageTopicActionsOptions {
  currentQuery: string;
  agentGuidance: AgentGuidance | null;
  isAuthenticated: boolean;
  user: { role?: string } | null;
  setAgentGuidance: (guidance: AgentGuidance | null) => void;
  setTopicGuideStatus: (status: TopicGuideStatus) => void;
  setCurrentPage: (page: AppPage) => void;
  trackFeatureUsage: (event: string, meta?: Record<string, unknown>) => void;
}

export function useSearchPageTopicActions({
  currentQuery,
  agentGuidance,
  isAuthenticated,
  user,
  setAgentGuidance,
  setTopicGuideStatus,
  setCurrentPage,
  trackFeatureUsage,
}: UseSearchPageTopicActionsOptions) {
  const navigate = useNavigate();
  const location = useLocation();

  const [knowledgeReviewStatus, setKnowledgeReviewStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [proposingKnowledge, setProposingKnowledge] = useState(false);
  const [proposedGuidance, setProposedGuidance] = useState<AgentGuidance | null>(null);
  const [proposeError, setProposeError] = useState<string | null>(null);
  const [topicGuideRefreshState, setTopicGuideRefreshState] = useState<'idle' | 'loading'>('idle');
  const [topicGuideRefreshError, setTopicGuideRefreshError] = useState<string | null>(null);
  const [anchorVerifyKey, setAnchorVerifyKey] = useState<string | null>(null);

  const canVerifyTeachingAnchor = ['admin', 'curator', 'specialist'].includes(String(user?.role || ''));

  const runTopicGuideRefresh = useCallback(async () => {
    const topic = currentQuery.trim();
    if (!topic) return;
    if (!isAuthenticated) {
      navigate('/auth', { state: { from: location } });
      return;
    }
    trackFeatureUsage('topic_guide_refresh_request', { topic: topic.slice(0, 200) });
    setTopicGuideRefreshState('loading');
    setTopicGuideRefreshError(null);
    try {
      const { agentGuidance: nextGuidance } = await api.knowledge.refreshTopicKnowledge(topic);
      setAgentGuidance(nextGuidance);
      setTopicGuideStatus('ready');
      trackFeatureUsage('topic_guide_refresh_success', { topic: topic.slice(0, 200) });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Refresh failed';
      setTopicGuideRefreshError(msg);
      trackFeatureUsage('topic_guide_refresh_error', { message: msg.slice(0, 200) });
    } finally {
      setTopicGuideRefreshState('idle');
    }
  }, [
    currentQuery,
    isAuthenticated,
    location,
    navigate,
    setAgentGuidance,
    setTopicGuideStatus,
    trackFeatureUsage,
  ]);

  const handleReviewTopicKnowledge = useCallback(async () => {
    if (!agentGuidance || !isAuthenticated) {
      setCurrentPage('auth');
      return;
    }
    setKnowledgeReviewStatus('saving');
    try {
      const response = await api.knowledge.reviewTopicKnowledge(agentGuidance.topic);
      if (response.agentGuidance) setAgentGuidance(response.agentGuidance);
      setKnowledgeReviewStatus('saved');
    } catch {
      setKnowledgeReviewStatus('error');
    }
  }, [agentGuidance, isAuthenticated, setAgentGuidance, setCurrentPage]);

  const handleProposeKnowledge = useCallback(async (top5Articles: Article[]) => {
    if (!isAuthenticated) {
      setCurrentPage('auth');
      return;
    }
    setProposingKnowledge(true);
    setProposeError(null);
    try {
      const response = await api.knowledge.proposeTopicKnowledge(currentQuery, top5Articles);
      if (response.agentGuidance) {
        setProposedGuidance(response.agentGuidance);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to synthesize topic knowledge';
      setProposeError(msg);
    } finally {
      setProposingKnowledge(false);
    }
  }, [currentQuery, isAuthenticated, setCurrentPage]);

  const handleVerifyTeachingAnchor = useCallback(async (key: string, claimText: string) => {
    setAnchorVerifyKey(key);
    try {
      const topic = agentGuidance?.topic || currentQuery;
      const res = await api.knowledge.verifyTopicKnowledgeAnchor(topic, { claimText });
      if (res.agentGuidance) setAgentGuidance(res.agentGuidance);
    } catch {
      /* toast optional */
    } finally {
      setAnchorVerifyKey(null);
    }
  }, [agentGuidance, currentQuery, setAgentGuidance]);

  return {
    knowledgeReviewStatus,
    proposingKnowledge,
    proposedGuidance,
    proposeError,
    topicGuideRefreshState,
    topicGuideRefreshError,
    setTopicGuideRefreshError,
    anchorVerifyKey,
    canVerifyTeachingAnchor,
    runTopicGuideRefresh,
    handleReviewTopicKnowledge,
    handleProposeKnowledge,
    handleVerifyTeachingAnchor,
  };
}
