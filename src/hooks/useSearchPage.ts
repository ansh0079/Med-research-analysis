import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSearchMeta, useSearchQuery, useSearchSelection } from '@contexts/SearchContext';
import { useAuth } from '@contexts/AuthContext';
import { useAnalytics, useSearch } from '@hooks';
import { useSearchRecents } from '@hooks/useSearchRecents';
import { usePdfViewer } from '@hooks/usePdfViewer';
import { useResultsFilter } from '@hooks/useResultsFilter';
import { useExportResults } from '@hooks/useExportResults';
import { useWorkflowContext } from '@hooks/useWorkflowContext';
import { useClientFeatures } from '@hooks/useClientFeatures';
import { api } from '@services/api';
import { selectTopEvidence } from '../utils/selectTopEvidence';
import { logAsyncError } from '@utils/handleAsyncError';
import type { AgentGuidance, Article, SynthesisResult, TopicEvidenceMemory } from '@types';

const RECENT_ANALYSES_KEY = 'med_recent_analyses';
const SAVED_SEARCH_COUNTS_KEY = 'med_saved_search_counts';

export function useSearchPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { trackFeatureUsage } = useAnalytics();
  const {
    results,
    filters,
    setFilters,
    setCurrentPage,
    searchHistory,
  } = useSearchQuery();
  const {
    savedArticles,
    selectedArticles,
    toggleSaveArticle,
    toggleSelectArticle,
    clearSelection,
    isSaved,
    isSelected,
  } = useSearchSelection();
  const {
    agentGuidance,
    setAgentGuidance,
    topicIntelligence,
    topicGuideStatus,
    setTopicGuideStatus,
    clinicalAnswer,
    communityInsight,
  } = useSearchMeta();

  const { user, isAuthenticated, resendVerification } = useAuth();
  const { betaOpenAccess } = useClientFeatures();
  const [verifyBannerDismissed, setVerifyBannerDismissed] = React.useState(false);
  const [resendStatus, setResendStatus] = React.useState<'idle' | 'sending' | 'sent'>('idle');
  const showVerifyBanner = isAuthenticated && user?.emailVerified === false && !verifyBannerDismissed;

  const handleResendVerification = React.useCallback(async () => {
    setResendStatus('sending');
    try {
      await resendVerification();
      setResendStatus('sent');
    } catch {
      setResendStatus('idle');
    }
  }, [resendVerification]);

  const {
    search, loading, error, lastSearchId, searchCompletedAt, proactiveAlert, learnerContext,
    aiEnrichmentLoading, intelligenceLoading, knowledgeDriftAlerts, dismissKnowledgeDriftAlert,
    aiEnrichmentFailed,
    lowRecallLearning, searchTelemetry,
  } = useSearch();
  const recentSearches = useSearchRecents(searchHistory, isAuthenticated);
  const pdfViewer = usePdfViewer();
  const [activeArticle, setActiveArticle] = useState<Article | null>(null);
  const [isComparing, setIsComparing] = useState(false);
  const [vectorSearchEnabled, setVectorSearchEnabled] = useState(false);
  const [synthesis, setSynthesis] = useState<SynthesisResult | null>(null);
  const [synthesisLoading, setSynthesisLoading] = useState(false);
  const [synthesisError, setSynthesisError] = useState<string | null>(null);
  const [synthesisLiveText, setSynthesisLiveText] = useState('');
  const [stalenessBanner, setStalenessBanner] = useState<{ changes: string[]; priorGrade: string; newGrade: string } | null>(null);
  const [knowledgeReviewStatus, setKnowledgeReviewStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [proposingKnowledge, setProposingKnowledge] = useState(false);
  const [proposedGuidance, setProposedGuidance] = useState<AgentGuidance | null>(null);
  const [proposeError, setProposeError] = useState<string | null>(null);
  const [topicEvidenceMemory, setTopicEvidenceMemory] = useState<TopicEvidenceMemory | null>(null);
  const [topicGuideRefreshState, setTopicGuideRefreshState] = React.useState<'idle' | 'loading'>('idle');
  const [topicGuideRefreshError, setTopicGuideRefreshError] = React.useState<string | null>(null);
  const [currentQuery, setCurrentQuery] = useState(() => {
    const q = sessionStorage.getItem('med_onboarding_query');
    return q || '';
  });
  const [requestGuidelineAlignment, setRequestGuidelineAlignment] = useState(false);
  const [anchorVerifyKey, setAnchorVerifyKey] = useState<string | null>(null);
  const canVerifyTeachingAnchor = ['admin', 'curator', 'specialist'].includes(String(user?.role || ''));
  const [inPlaceQuizExpanded, setInPlaceQuizExpanded] = useState(false);
  const [recentAnalyses, setRecentAnalyses] = useState<Article[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(RECENT_ANALYSES_KEY) || '[]');
    } catch {
      return [];
    }
  });
  const [newPaperNotice, setNewPaperNotice] = useState<string | null>(null);
  const [detailArticle, setDetailArticle] = useState<Article | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    void api.search.getClientConfig().then((config) => {
      if (!cancelled) setVectorSearchEnabled(Boolean(config.features?.vectorSearch));
    });
    return () => { cancelled = true; };
  }, []);

  const onboardingSearchDone = React.useRef(false);
  React.useEffect(() => {
    if (onboardingSearchDone.current) return;
    const onboardingQuery = currentQuery || sessionStorage.getItem('med_onboarding_query');
    if (onboardingQuery) {
      onboardingSearchDone.current = true;
      sessionStorage.removeItem('med_onboarding_query');
      void search(onboardingQuery, filters);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resultsFilter = useResultsFilter(results);
  const {
    resultFilter, setResultFilter,
    resultLens, setResultLens,
    visibleResults, renderedResults,
    visibleCount, setVisibleCount,
    activeResultIndex, setActiveResultIndex,
    openAccessCount, highQualityCount, recentCount, practiceChangingCount, retractedCount,
    resetForNewSearch,
  } = resultsFilter;

  const filtersRef = React.useRef(filters);
  filtersRef.current = filters;
  const searchRef = React.useRef(search);
  searchRef.current = search;

  const handleSearch = React.useCallback(
    async (query: string) => {
      const trimmed = query.trim();
      if (!trimmed) return [];
      setSynthesis(null);
      setSynthesisError(null);
      setSynthesisLiveText('');
      setTopicGuideRefreshError(null);
      setCurrentQuery(trimmed);
      resetForNewSearch();
      const found = await searchRef.current(trimmed, filtersRef.current);
      try {
        const savedCounts = JSON.parse(localStorage.getItem(SAVED_SEARCH_COUNTS_KEY) || '{}') as Record<string, number>;
        const previous = savedCounts[trimmed.toLowerCase()];
        if (typeof previous === 'number' && found.length > previous) {
          setNewPaperNotice(`${found.length - previous} new paper${found.length - previous === 1 ? '' : 's'} since your last search for this query.`);
        } else {
          setNewPaperNotice(null);
        }
        savedCounts[trimmed.toLowerCase()] = found.length;
        localStorage.setItem(SAVED_SEARCH_COUNTS_KEY, JSON.stringify(savedCounts));
      } catch {
        setNewPaperNotice(null);
      }
      return found;
    },
    [resetForNewSearch]
  );

  const evidenceRelatedTopics = React.useMemo(
    () => (topicIntelligence?.evidenceMap?.nodes?.relatedTopics || [])
      .map((entry) => entry.displayTopic || entry.normalizedTopic)
      .filter(Boolean),
    [topicIntelligence?.evidenceMap?.nodes?.relatedTopics]
  );

  const openAnalysis = React.useCallback((article: Article) => {
    setActiveArticle(article);
    setRecentAnalyses((prev) => {
      const updated = [article, ...prev.filter((item) => item.uid !== article.uid)].slice(0, 10);
      try {
        localStorage.setItem(RECENT_ANALYSES_KEY, JSON.stringify(updated));
      } catch {
        // Ignore storage failures.
      }
      return updated;
    });
  }, []);

  const { exportResults } = useExportResults({ currentQuery, selectedArticles, visibleResults });

  React.useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable;
      if (event.key === '/' && !isTyping) {
        event.preventDefault();
        window.dispatchEvent(new Event('medsearch:focus-search'));
      }
      if (isTyping || visibleResults.length === 0) return;
      if (event.key === 'j') {
        event.preventDefault();
        setActiveResultIndex((idx) => Math.min(visibleResults.length - 1, idx + 1));
      }
      if (event.key === 'k') {
        event.preventDefault();
        setActiveResultIndex((idx) => Math.max(0, idx - 1));
      }
      if (event.key === 's') {
        event.preventDefault();
        void toggleSaveArticle(visibleResults[activeResultIndex]);
      }
      if (event.key === 'a') {
        event.preventDefault();
        openAnalysis(visibleResults[activeResultIndex]);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [activeResultIndex, openAnalysis, toggleSaveArticle, visibleResults, setActiveResultIndex]);

  const top5Articles = React.useMemo(
    () => topicIntelligence?.evidenceBouquet.topPapers?.length
      ? topicIntelligence.evidenceBouquet.topPapers
      : selectTopEvidence(results, results.length),
    [results, topicIntelligence]
  );

  const isFlagshipTopic = React.useMemo(
    () => Boolean(
      topicIntelligence &&
      agentGuidance &&
      top5Articles.length >= 3 &&
      (topicIntelligence.guidelineSnapshot.count ?? 0) > 0 &&
      ((agentGuidance.seminalPapers?.length ?? 0) >= 3 || (agentGuidance.teachingPoints?.length ?? 0) >= 3)
    ),
    [agentGuidance, top5Articles.length, topicIntelligence]
  );

  React.useEffect(() => {
    let cancelled = false;
    const topic = (agentGuidance?.topic || currentQuery || '').trim();

    if (!isAuthenticated || topic.length < 2 || results.length === 0) {
      setTopicEvidenceMemory(null);
      return () => { cancelled = true; };
    }

    api.knowledge.getTopicEvidenceMemory(topic)
      .then((response) => {
        if (!cancelled) setTopicEvidenceMemory(response.memory);
      })
      .catch(() => {
        if (!cancelled) setTopicEvidenceMemory(null);
      });

    return () => { cancelled = true; };
  }, [agentGuidance?.topic, currentQuery, isAuthenticated, results.length]);

  const handleSynthesize = React.useCallback(async (): Promise<SynthesisResult | null> => {
    if (!results.length) return null;
    if (!isAuthenticated && !betaOpenAccess) {
      setSynthesisError('Sign in to use Evidence Synthesis');
      return null;
    }
    setSynthesisLoading(true);
    setSynthesisError(null);
    setSynthesisLiveText('');
    try {
      let liveText = '';
      let finalResult: SynthesisResult | null = null;
      await new Promise<void>((resolve, reject) => {
        api.ai.synthesizeEvidenceStream(currentQuery, top5Articles, {
          onChunk: (chunk) => {
            liveText += chunk;
            setSynthesisLiveText(liveText);
          },
          onResult: (result) => {
            finalResult = result;
          },
          onError: reject,
          onDone: resolve,
        });
      });
      const resolved = finalResult as SynthesisResult | null;
      if (resolved) {
        setSynthesis(resolved);
        if (isAuthenticated && resolved.topic) {
          api.knowledge.getTopicStaleness(resolved.topic).then((s) => {
            if (s.significantChange && s.changes.length > 0) {
              setStalenessBanner({
                changes: s.changes,
                priorGrade: s.prior?.evidence_grade ?? '',
                newGrade: s.latest?.evidence_grade ?? '',
              });
            }
          }).catch((err) => logAsyncError(err, 'useSearchPage/getTopicStaleness'));
        }
        return resolved;
      }
      return null;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Synthesis failed';
      if (msg === 'AUTH_REQUIRED') {
        setSynthesisError('Sign in to use Evidence Synthesis');
      } else if (msg.startsWith('UPGRADE_REQUIRED:')) {
        setSynthesisError('UPGRADE_REQUIRED:aiSynthesis');
      } else {
        setSynthesisError(msg);
      }
    } finally {
      setSynthesisLoading(false);
    }
    return null;
  }, [results, top5Articles, currentQuery, isAuthenticated, betaOpenAccess]);

  const workflow = useWorkflowContext({
    currentQuery,
    top5Articles,
    agentGuidance,
    synthesis,
    isAuthenticated,
    betaOpenAccess,
    results,
    handleSearch,
    trackFeatureUsage,
  });

  const {
    shiftPresentation, setShiftPresentation,
    scenarioExtract,
    shiftLaneLoading,
    openQuizFromWorkflow,
    openCaseFromWorkflow,
    openArticleCase,
    openArticleQuiz,
    openSynthesisCase,
    runShiftFastLane,
    saveWorkflowContext,
  } = workflow;

  const openGuidelineFromWorkflow = React.useCallback(async () => {
    saveWorkflowContext({
      topic: currentQuery,
      currentStep: 'guideline',
      source: 'search',
      evidenceCount: results.length,
    });
    setRequestGuidelineAlignment(true);

    const activeSynthesis = synthesis || (results.length > 0 && isAuthenticated ? await handleSynthesize() : null);

    window.requestAnimationFrame(() => {
      if (activeSynthesis?.conflictMatrix?.length) {
        document.getElementById('synthesis-conflict-matrix')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
      if (activeSynthesis) {
        document.querySelector('[data-synthesis-panel]')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
      document.getElementById('workflow-guideline')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, [currentQuery, handleSynthesize, isAuthenticated, results.length, saveWorkflowContext, synthesis]);

  const runTopicGuideRefresh = React.useCallback(async () => {
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

  const handleReviewTopicKnowledge = React.useCallback(async () => {
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

  const handleProposeKnowledge = React.useCallback(async () => {
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
  }, [currentQuery, top5Articles, isAuthenticated, setCurrentPage]);

  return {
    navigate,
    trackFeatureUsage,
    results,
    filters,
    setFilters,
    setCurrentPage,
    searchHistory,
    savedArticles,
    selectedArticles,
    toggleSaveArticle,
    toggleSelectArticle,
    clearSelection,
    isSaved,
    isSelected,
    agentGuidance,
    setAgentGuidance,
    topicIntelligence,
    topicGuideStatus,
    clinicalAnswer,
    communityInsight,
    isAuthenticated,
    showVerifyBanner,
    resendStatus,
    handleResendVerification,
    setVerifyBannerDismissed,
    loading,
    error,
    lastSearchId,
    searchCompletedAt,
    proactiveAlert,
    learnerContext,
    aiEnrichmentLoading,
    aiEnrichmentFailed,
    intelligenceLoading,
    knowledgeDriftAlerts,
    dismissKnowledgeDriftAlert,
    lowRecallLearning,
    searchTelemetry,
    recentSearches,
    pdfViewer,
    activeArticle,
    setActiveArticle,
    isComparing,
    setIsComparing,
    vectorSearchEnabled,
    synthesis,
    setSynthesis,
    synthesisLoading,
    synthesisError,
    synthesisLiveText,
    stalenessBanner,
    setStalenessBanner,
    knowledgeReviewStatus,
    proposingKnowledge,
    proposedGuidance,
    proposeError,
    topicEvidenceMemory,
    topicGuideRefreshState,
    topicGuideRefreshError,
    currentQuery,
    setCurrentQuery,
    requestGuidelineAlignment,
    anchorVerifyKey,
    setAnchorVerifyKey,
    canVerifyTeachingAnchor,
    inPlaceQuizExpanded,
    setInPlaceQuizExpanded,
    recentAnalyses,
    newPaperNotice,
    detailArticle,
    setDetailArticle,
    resultFilter,
    setResultFilter,
    resultLens,
    setResultLens,
    visibleResults,
    renderedResults,
    visibleCount,
    setVisibleCount,
    activeResultIndex,
    openAccessCount,
    highQualityCount,
    recentCount,
    practiceChangingCount,
    retractedCount,
    handleSearch,
    evidenceRelatedTopics,
    openAnalysis,
    exportResults,
    top5Articles,
    isFlagshipTopic,
    handleSynthesize,
    shiftPresentation,
    setShiftPresentation,
    scenarioExtract,
    shiftLaneLoading,
    openQuizFromWorkflow,
    openCaseFromWorkflow,
    openArticleCase,
    openArticleQuiz,
    openSynthesisCase,
    runShiftFastLane,
    openGuidelineFromWorkflow,
    runTopicGuideRefresh,
    handleReviewTopicKnowledge,
    handleProposeKnowledge,
  };
}
