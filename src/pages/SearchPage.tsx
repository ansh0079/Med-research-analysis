import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArticleCard } from '@components/search/ArticleCard';
const AIAnalysisPanel = React.lazy(() => import('@components/search/AIAnalysisPanel').then(m => ({ default: m.AIAnalysisPanel })));
// AgentChatPanel is lazy-loaded because it only appears after topic knowledge is ready.
const AgentChatPanel = React.lazy(() => import('@components/search/AgentChatPanel').then(m => ({ default: m.AgentChatPanel })));
import { SynthesisPanel } from '@components/search/SynthesisPanel';
import { TopicActionBanner } from '@components/quiz/TopicActionBanner';
import { SelectionBasket } from '@components/search/SelectionBasket';
import { ComparisonView } from '@components/search/ComparisonView';
import { EvidenceProjectPanel } from '@components/search/EvidenceProjectPanel';
import { TopicBriefPanel } from '@components/search/TopicBriefPanel';
import { EvidenceQuizPanel } from '@components/search/EvidenceQuizPanel';
import { EvidenceMapPanel } from '@components/search/EvidenceMapPanel';
import { ArticleDetailDrawer } from '@components/search/ArticleDetailDrawer';

import { GuidelineSnapshot } from '@components/search/GuidelineSnapshot';
import { useSearchMeta, useSearchQuery, useSearchSelection } from '@contexts/SearchContext';
import { useAuth } from '@contexts/AuthContext';
import { useAnalytics, useSearch } from '@hooks';
import { Button } from '@components/ui/Button';
import { SkeletonCard } from '@components/search/SkeletonCard';
import { ResearchWorkspace } from '@components/search/ResearchWorkspace';
import { SearchHero } from '@components/search/SearchHero';
import { ErrorBanner } from '@components/common/ErrorBanner';
import { TopicIntelligenceStatusBanner } from '@components/search/TopicIntelligenceStatusBanner';
import { SearchEmptyState } from '@components/search/SearchEmptyState';
import { SearchFooter, SearchResultLensToolbar, SearchStatsCards, SearchVerifyBanner } from '@components/search/SearchPagePanels';
import { LowRecallBanner } from '@components/search/LowRecallBanner';
import { RelatedTopicsBar } from '@components/search/RelatedTopicsBar';
import { useSearchRecents } from '@hooks/useSearchRecents';
import { usePdfViewer } from '@hooks/usePdfViewer';
import { useResultsFilter, type ResultLens } from '@hooks/useResultsFilter';
import { useExportResults } from '@hooks/useExportResults';
import { useWorkflowContext } from '@hooks/useWorkflowContext';
import { useClientFeatures } from '@hooks/useClientFeatures';
import { api } from '@services/api';
import { selectTopEvidence } from '../utils/selectTopEvidence';
import type { AgentGuidance, Article, SynthesisResult, TopicEvidenceMemory } from '@types';

const RECENT_ANALYSES_KEY = 'med_recent_analyses';
const SAVED_SEARCH_COUNTS_KEY = 'med_saved_search_counts';

export const SearchPage: React.FC = () => {
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
    lowRecallLearning,
  } = useSearch();
  const recentSearches = useSearchRecents(searchHistory, isAuthenticated);
  const {
    activePdf, isOpen, layout, openPdf, closePdf, toggleLayout,
  } = usePdfViewer();
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

  // Pick up onboarding pre-selected query and run it automatically
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

  const {
    resultFilter, setResultFilter,
    resultLens, setResultLens,
    visibleResults, renderedResults,
    visibleCount, setVisibleCount,
    activeResultIndex, setActiveResultIndex,
    openAccessCount, highQualityCount, recentCount, practiceChangingCount, retractedCount,
    resetForNewSearch,
  } = useResultsFilter(results);

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
  }, [activeResultIndex, openAnalysis, toggleSaveArticle, visibleResults]);

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
        // Check for evidence shift vs prior synthesis for this topic
        if (isAuthenticated && resolved.topic) {
          api.knowledge.getTopicStaleness(resolved.topic).then((s) => {
            if (s.significantChange && s.changes.length > 0) {
              setStalenessBanner({
                changes: s.changes,
                priorGrade: s.prior?.evidence_grade ?? '',
                newGrade: s.latest?.evidence_grade ?? '',
              });
            }
          }).catch(() => undefined);
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
  } = useWorkflowContext({
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

  return (
    <div className="min-h-screen aurora-bg mesh-bg">
      <div className="aurora-content">

      {showVerifyBanner && (
        <SearchVerifyBanner
          resendStatus={resendStatus}
          onResend={() => { void handleResendVerification(); }}
          onDismiss={() => setVerifyBannerDismissed(true)}
        />
      )}

      <SearchHero
        showVerifyBanner={showVerifyBanner}
        onSearch={handleSearch}
        searchQuery={currentQuery}
        onSearchQueryChange={setCurrentQuery}
        recentSearches={recentSearches}
        loading={loading}
        filters={filters}
        setFilters={setFilters}
        vectorSearchEnabled={vectorSearchEnabled}
        searchHistory={searchHistory}
        shiftPresentation={shiftPresentation}
        setShiftPresentation={setShiftPresentation}
        scenarioExtract={scenarioExtract}
        shiftLaneLoading={shiftLaneLoading}
        runShiftFastLane={runShiftFastLane}
        currentQuery={currentQuery}
        topicGuideStatus={topicGuideStatus}
        intelligenceLoading={intelligenceLoading}
        topicGuideRefreshState={topicGuideRefreshState}
        topicGuideRefreshError={topicGuideRefreshError}
        runTopicGuideRefresh={runTopicGuideRefresh}
        isAuthenticated={isAuthenticated}
        error={error}
        results={results}
        inPlaceQuizExpanded={inPlaceQuizExpanded}
        setInPlaceQuizExpanded={setInPlaceQuizExpanded}
        trackFeatureUsage={trackFeatureUsage}
        openGuidelineFromWorkflow={openGuidelineFromWorkflow}
        openCaseFromWorkflow={openCaseFromWorkflow}
      />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-3 sm:px-4 -mt-10 sm:-mt-16 pb-24">
        {currentQuery && (
          <LowRecallBanner lowRecall={lowRecallLearning} onTryQuery={handleSearch} />
        )}

        {currentQuery && results.length > 0 && (
          <RelatedTopicsBar
            topic={currentQuery}
            evidenceRelatedTopics={evidenceRelatedTopics}
            onOpenTopic={handleSearch}
          />
        )}

        {results.length > 0 && (
          <SearchStatsCards
            resultsCount={results.length}
            openAccessCount={openAccessCount}
            highQualityCount={highQualityCount}
            retractedCount={retractedCount}
          />
        )}

        {results.length > 0 && (intelligenceLoading || (!agentGuidance && (topicGuideStatus === 'building' || topicGuideStatus === 'pending'))) && (
          <TopicIntelligenceStatusBanner
            intelligenceLoading={intelligenceLoading}
            topicGuideStatus={agentGuidance ? 'idle' : topicGuideStatus}
            variant="card"
            className="mb-4"
          />
        )}

        {results.length > 0 && learnerContext?.hasPersonalization && (learnerContext.weakClaimCount > 0 || learnerContext.hasTrajectory || learnerContext.weakTopicCount > 0) && (
          <div className="mb-4 rounded-xl border border-violet-200 bg-violet-50 p-4 dark:border-violet-900/50 dark:bg-violet-950/25">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-violet-600 dark:text-violet-300">Personalized remediation</p>
                <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {learnerContext.weakClaimCount > 0
                    ? `${learnerContext.weakClaimCount} weak claim${learnerContext.weakClaimCount === 1 ? '' : 's'} from your learning history match this topic.`
                    : learnerContext.hasTrajectory
                      ? 'Your recent learning trajectory includes this topic.'
                      : 'This search overlaps with prior weak topics.'}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setInPlaceQuizExpanded(true)}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-violet-600 px-3 text-xs font-bold text-white hover:bg-violet-500">
                  <i className="fas fa-brain text-[10px]" /> Targeted quiz
                </button>
                {agentGuidance && (
                  <button type="button" onClick={() => document.getElementById('agent-mentor-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-violet-300 px-3 text-xs font-bold text-violet-700 hover:bg-white dark:border-violet-800 dark:text-violet-200 dark:hover:bg-violet-900/40">
                    <i className="fas fa-comments text-[10px]" /> Ask mentor
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {results.length > 0 && (
          <div className="sticky top-[calc(var(--nav-h)+0.75rem)] z-20 mb-4 rounded-2xl border border-slate-200/80 bg-white/92 p-3 shadow-sm backdrop-blur dark:border-slate-700/80 dark:bg-slate-900/88">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Shift review</p>
                <p className="truncate text-xs font-semibold text-slate-700 dark:text-slate-200">{currentQuery}</p>
              </div>
              <div className="grid grid-cols-2 gap-1.5 sm:flex sm:flex-wrap sm:items-center">
                <button type="button" onClick={() => document.getElementById('workflow-evidence')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                  className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-2.5 sm:px-3 text-xs font-bold text-white hover:bg-indigo-500">
                  <i className="fas fa-layer-group text-[10px]" /> Evidence
                </button>
                <button type="button" onClick={openGuidelineFromWorkflow}
                  className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-blue-200 px-2.5 sm:px-3 text-xs font-bold text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-300 dark:hover:bg-blue-950/40">
                  <i className="fas fa-book-medical text-[10px]" /> Guideline
                </button>
                <button type="button" onClick={() => openCaseFromWorkflow('mixed')}
                  className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-emerald-200 px-2.5 sm:px-3 text-xs font-bold text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950/40">
                  <i className="fas fa-stethoscope text-[10px]" /> Case
                </button>
                <button type="button" onClick={() => setInPlaceQuizExpanded((v) => !v)}
                  className={`inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border px-2.5 sm:px-3 text-xs font-bold transition-colors ${
                    inPlaceQuizExpanded
                      ? 'bg-violet-600 border-violet-600 text-white hover:bg-violet-500'
                      : 'border-violet-200 text-violet-700 hover:bg-violet-50 dark:border-violet-800 dark:text-violet-300 dark:hover:bg-violet-950/40'
                  }`}>
                  <i className="fas fa-brain text-[10px]" /> {inPlaceQuizExpanded ? 'Close quiz' : 'Quiz me on this'}
                </button>
                <button type="button" onClick={() => openCaseFromWorkflow('mixed')}
                  className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-2.5 sm:px-3 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800/40">
                  <i className="fas fa-file-export text-[10px]" /> Reflection
                </button>
              </div>
            </div>
          </div>
        )}

        {(newPaperNotice || results.length > 0) && (
          <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_0.7fr]">
            <div className="neo-card p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Search within results</p>
                  {newPaperNotice && <p className="mt-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">{newPaperNotice}</p>}
                </div>
                <input
                  value={resultFilter}
                  onChange={(event) => setResultFilter(event.target.value)}
                  placeholder="Filter titles, abstracts, journals..."
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white sm:w-80"
                />
              </div>
              <p className="mt-2 text-[11px] text-slate-400">
                Shortcuts: / search, j/k move, s save, a analyze.
              </p>
            </div>
            {recentAnalyses.length > 0 && (
              <div className="neo-card p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Recently analyzed</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {recentAnalyses.slice(0, 5).map((article) => (
                    <button
                      key={article.uid}
                      type="button"
                      onClick={() => openAnalysis(article)}
                      className="max-w-full rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-indigo-950/40"
                      title={article.title}
                    >
                      <span className="inline-block max-w-[13rem] truncate align-bottom">{article.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {results.length > 0 && (
          <>
          {/* ── Discovery banner for unknown topics ────────────────────────── */}
          {!agentGuidance && !proposedGuidance && results.length > 0 && (
            <div className="mb-4 neo-card overflow-hidden border border-indigo-100 dark:border-indigo-900/40">
              <div className="bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 px-5 py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                    <i className="fas fa-compass text-white text-sm" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/70">Discovery</p>
                    <p className="text-sm font-black text-white truncate">{currentQuery}</p>
                  </div>
                </div>
              </div>
              <div className="p-5 space-y-4">
                <TopicIntelligenceStatusBanner
                  intelligenceLoading={intelligenceLoading}
                  topicGuideStatus={topicGuideStatus}
                />
                <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                  I&apos;m exploring this topic for the first time. I found <strong>{results.length} papers</strong> across multiple sources.
                  Would you like me to synthesise what I found and add it to memory so future searches get a mentor greeting?
                </p>
                {proposeError && (
                  <p className="text-xs text-red-600 dark:text-red-400 font-semibold">
                    <i className="fas fa-triangle-exclamation mr-1" />{proposeError}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleProposeKnowledge}
                    disabled={proposingKnowledge}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-xs font-bold transition-colors"
                  >
                    {proposingKnowledge ? (
                      <><span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin shrink-0" />Synthesising…</>
                    ) : (
                      <><i className="fas fa-brain text-[10px]" />Synthesise &amp; Add to Memory</>
                    )}
                  </button>
                  <span className="text-[11px] text-slate-400">
                    Requires sign-in. Creates a proposal for curator review.
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ── Proposed knowledge preview ─────────────────────────────────── */}
          {proposedGuidance && (
            <div className="mb-4 neo-card overflow-hidden border border-violet-100 dark:border-violet-900/40">
              <div className="bg-violet-600 px-5 py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                    <i className="fas fa-lightbulb text-white text-sm" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/70">Proposed Knowledge &middot; Pending Review</p>
                    <p className="text-sm font-black text-white truncate">{proposedGuidance.topic}</p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white">
                  <i className="fas fa-clock text-[9px]" /> Awaiting curator
                </span>
              </div>
              <div className="p-5 space-y-4">
                <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">{proposedGuidance.mentorMessage}</p>
                {proposedGuidance.seminalPapers.length > 0 && (
                  <div className="grid gap-2 md:grid-cols-2">
                    {proposedGuidance.seminalPapers.slice(0, 4).map((paper) => (
                      <div key={`${paper.sourceIndex}-${paper.title}`} className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">[{paper.sourceIndex}] {paper.title}</p>
                        {paper.clinicalPrinciple && <p className="mt-1 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">{paper.clinicalPrinciple}</p>}
                      </div>
                    ))}
                  </div>
                )}
                {proposedGuidance.teachingPoints.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Key Teaching Points</p>
                    <ul className="space-y-1.5">
                      {proposedGuidance.teachingPoints.slice(0, 4).map((tp, i) => (
                        <li key={i} className="flex gap-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                          <i className="fas fa-circle-dot text-violet-500 mt-0.5 text-[8px] shrink-0" />
                          <span>{typeof tp === 'string' ? tp : tp.claim}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button variant="gradient" size="sm" onClick={() => openCaseFromWorkflow('mixed')}
                    leftIcon={<i className="fas fa-stethoscope text-[10px]" />}>Generate Case</Button>
                  <Button variant="secondary" size="sm" onClick={() => openQuizFromWorkflow('mixed')}
                    leftIcon={<i className="fas fa-brain text-[10px]" />}>Generate MCQs</Button>
                </div>
              </div>
            </div>
          )}

          {agentGuidance && (
            <div id="agent-mentor-panel" className="mb-4 neo-card overflow-hidden border border-emerald-100 dark:border-emerald-900/40">
              <div className="bg-emerald-600 px-5 py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                    <i className="fas fa-user-graduate text-white text-sm" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/70">
                      {isFlagshipTopic ? 'Flagship Topic · Evidence Mentor Ready' : 'Mentor Message'}
                    </p>
                    <p className="text-sm font-black text-white truncate">{agentGuidance.topic}</p>
                  </div>
                </div>
                <div className="hidden sm:flex items-center gap-2">
                  {isAuthenticated && (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={topicGuideRefreshState === 'loading'}
                      onClick={() => void runTopicGuideRefresh()}
                      leftIcon={<i className="fas fa-arrows-rotate text-[10px]" />}
                    >
                      {topicGuideRefreshState === 'loading' ? 'Refreshing…' : 'Refresh'}
                    </Button>
                  )}
                  {isFlagshipTopic && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white">
                      <i className="fas fa-award text-[9px]" />
                      Flagship
                    </span>
                  )}
                  {agentGuidance.lastRefreshedAt && (
                    <span className="text-[10px] font-mono text-white/70">
                      refreshed {new Date(agentGuidance.lastRefreshedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
              <div className="p-5 space-y-4">
                <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">{agentGuidance.mentorMessage}</p>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                    agentGuidance.status === 'human_reviewed'
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                      : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                  }`}>
                    {agentGuidance.status === 'human_reviewed' ? 'Clinician reviewed' : 'AI generated'}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    confidence {Math.round((agentGuidance.confidence || 0) * 100)}%
                  </span>
                  {agentGuidance.status !== 'human_reviewed' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleReviewTopicKnowledge}
                      disabled={knowledgeReviewStatus === 'saving'}
                      leftIcon={<i className="fas fa-check text-[10px]" />}
                    >
                      {knowledgeReviewStatus === 'saving' ? 'Saving' : 'Mark Reviewed'}
                    </Button>
                  )}
                  {knowledgeReviewStatus === 'error' && (
                    <span className="text-[11px] font-semibold text-red-500">Sign in or retry to review.</span>
                  )}
                  {topicGuideRefreshError && (
                    <span className="text-[11px] font-semibold text-red-500">{topicGuideRefreshError}</span>
                  )}
                </div>
                {agentGuidance.seminalPapers.length > 0 && (
                  <div className="grid gap-2 md:grid-cols-2">
                    {agentGuidance.seminalPapers.slice(0, 4).map((paper) => (
                      <div key={`${paper.sourceIndex}-${paper.title}`} className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">[{paper.sourceIndex}] {paper.title}</p>
                        {paper.clinicalPrinciple && <p className="mt-1 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">{paper.clinicalPrinciple}</p>}
                      </div>
                    ))}
                  </div>
                )}
                {agentGuidance.teachingPoints.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Key Teaching Points</p>
                    <ul className="space-y-1.5">
                      {agentGuidance.teachingPoints.slice(0, 4).map((tp, i) => {
                        const anchored = (agentGuidance.verifiedAnchors || []).some((a) => (a.text || '').trim() === (tp.claim || '').trim());
                        return (
                          <li key={i} className="flex gap-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed items-start">
                            <i className="fas fa-circle-dot text-emerald-500 mt-0.5 text-[8px] shrink-0" />
                            <span className="flex-1 min-w-0">{tp.claim}</span>
                            {anchored && (
                              <span className="shrink-0 rounded bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200 text-[9px] font-black uppercase tracking-wide px-1.5 py-0.5">
                                Anchor
                              </span>
                            )}
                            {canVerifyTeachingAnchor && !anchored && isAuthenticated && (
                              <button
                                type="button"
                                disabled={anchorVerifyKey === `tp-${i}`}
                                onClick={async () => {
                                  const key = `tp-${i}`;
                                  setAnchorVerifyKey(key);
                                  try {
                                    const topic = agentGuidance.topic || currentQuery;
                                    const res = await api.knowledge.verifyTopicKnowledgeAnchor(topic, { claimText: tp.claim });
                                    if (res.agentGuidance) setAgentGuidance(res.agentGuidance);
                                  } catch {
                                    /* toast optional */
                                  } finally {
                                    setAnchorVerifyKey(null);
                                  }
                                }}
                                className="shrink-0 text-[10px] font-black uppercase tracking-wide text-indigo-600 dark:text-indigo-400 hover:underline disabled:opacity-40"
                              >
                                {anchorVerifyKey === `tp-${i}` ? '…' : 'Verify'}
                              </button>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button variant="gradient" size="sm" onClick={() => openCaseFromWorkflow('mixed')}
                    leftIcon={<i className="fas fa-stethoscope text-[10px]" />}>Generate Case</Button>
                  <Button variant="secondary" size="sm" onClick={() => openQuizFromWorkflow('mixed')}
                    leftIcon={<i className="fas fa-brain text-[10px]" />}>Generate MCQs</Button>
                  <Button variant="ghost" size="sm" onClick={handleSynthesize}
                    leftIcon={<i className="fas fa-layer-group text-[10px]" />}>Review Seminal Evidence</Button>
                </div>
              </div>
            </div>
          )}
          {agentGuidance && (
            <div className="mb-4">
              <React.Suspense fallback={null}>
                <AgentChatPanel
                  topic={agentGuidance.topic}
                  agentGuidance={agentGuidance}
                  currentArticles={results}
                  onGenerateCase={() => openCaseFromWorkflow('mixed')}
                  onGenerateMcqs={() => openQuizFromWorkflow('mixed')}
                />
              </React.Suspense>
            </div>
          )}
          <div id="workflow-evidence" className="mb-4 scroll-mt-28">
          <TopicBriefPanel
            query={currentQuery}
            top5={top5Articles}
            allResults={results}
            topicIntelligence={topicIntelligence}
            synthesis={synthesis}
            synthesisLoading={synthesisLoading}
            onSynthesize={handleSynthesize}
            onSummarizePaper={openAnalysis}
            onQuiz={openQuizFromWorkflow}
            onCase={openCaseFromWorkflow}
            onOpenTopic={handleSearch}
            onGuidelineCompare={openGuidelineFromWorkflow}
            agentGuidance={agentGuidance}
            liveClinicalAnswer={clinicalAnswer}
            aiEnrichmentLoading={aiEnrichmentLoading}
            communityInsight={communityInsight}
            proactiveAlert={proactiveAlert}
            knowledgeDriftAlerts={knowledgeDriftAlerts}
            evidenceMemory={topicEvidenceMemory}
            onDismissKnowledgeDrift={(id) => { void dismissKnowledgeDriftAlert(id); }}
          />
          <EvidenceMapPanel evidenceMap={topicIntelligence?.evidenceMap} onOpenTopic={handleSearch} />
          {results.length > 0 && (
            <div className="mb-4">
              <EvidenceQuizPanel
                topic={currentQuery}
                articles={top5Articles.length > 0 ? top5Articles : results.slice(0, 5)}
                autoExpand={inPlaceQuizExpanded}
                onAuthSubmit={async (attempts) => {
                  await api.learning.submitQuizAttempt({ topic: currentQuery, attempts });
                }}
              />
            </div>
          )}
          </div>
          </>
        )}

        {results.length > 0 && (
          <SearchResultLensToolbar
            resultsCount={results.length}
            resultLens={resultLens}
            resultFilter={resultFilter}
            lenses={[
              { id: 'all' as ResultLens, label: 'All', count: results.length, icon: 'fa-list' },
              { id: 'open_access' as ResultLens, label: 'Open access', count: openAccessCount, icon: 'fa-unlock' },
              { id: 'high_quality' as ResultLens, label: 'High quality', count: highQualityCount, icon: 'fa-shield-halved' },
              { id: 'recent' as ResultLens, label: 'Recent', count: recentCount, icon: 'fa-calendar-days' },
              { id: 'practice_changing' as ResultLens, label: 'Practice-changing', count: practiceChangingCount, icon: 'fa-bolt' },
            ]}
            selectedArticlesCount={selectedArticles.length}
            isAuthenticated={isAuthenticated}
            savedArticlesCount={savedArticles.length}
            onSelectLens={(lens, count) => {
              setResultLens(lens);
              setVisibleCount(30);
              trackFeatureUsage('result_lens_click', { lens, count });
            }}
            onClearLens={() => { setResultLens('all'); setResultFilter(''); setVisibleCount(30); }}
            onCompare={() => setIsComparing(true)}
            onSetPage={setCurrentPage}
            onClearSelection={clearSelection}
            onExport={exportResults}
          />
        )}

        {results.length > 0 && (
          <EvidenceProjectPanel
            currentQuery={currentQuery}
            results={results}
            selectedArticles={selectedArticles}
            onStartReview={() => setCurrentPage('review')}
          />
        )}

        {synthesisError && (
          synthesisError.startsWith('UPGRADE_REQUIRED:') ? (
            <div aria-live="polite" className="mb-6 p-6 rounded-2xl bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 text-center">
              <i className="fas fa-star text-2xl text-violet-400 mb-2 block" />
              <p className="text-sm font-semibold text-violet-800 dark:text-violet-200">Evidence synthesis is a Pro feature</p>
              <p className="text-xs text-violet-600 dark:text-violet-400 mt-1 mb-3">Upgrade to synthesize papers into clinical bottom lines and teaching claims.</p>
              <a href="/billing" className="inline-block text-xs font-bold px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors">
                View plans →
              </a>
            </div>
          ) : (
            <div aria-live="polite" className="mb-6">
              <ErrorBanner error={synthesisError} />
            </div>
          )
        )}

        {synthesisLoading && !synthesisLiveText && (
          <div aria-live="polite" className="sr-only">Generating evidence synthesis…</div>
        )}
        {synthesisLiveText && synthesisLoading && (
          <div aria-live="polite" className="mb-6 rounded-2xl border border-indigo-100 bg-white/90 p-4 text-sm text-slate-700 shadow-sm dark:border-indigo-900/40 dark:bg-slate-900/90 dark:text-slate-300">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-indigo-500">Live synthesis</p>
            <p className="whitespace-pre-wrap leading-relaxed">{synthesisLiveText}</p>
          </div>
        )}

        {stalenessBanner && (
          <div className="mb-4 rounded-2xl border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 flex items-start gap-3">
            <i className="fas fa-exclamation-triangle text-amber-500 text-sm mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-amber-800 dark:text-amber-200">Evidence has shifted since your last synthesis</p>
              <ul className="mt-1 space-y-0.5">
                {stalenessBanner.changes.map((c, i) => (
                  <li key={i} className="text-[11px] text-amber-700 dark:text-amber-300">{c}</li>
                ))}
              </ul>
            </div>
            <button type="button" onClick={() => setStalenessBanner(null)}
              className="shrink-0 text-amber-400 hover:text-amber-600 dark:hover:text-amber-200 transition-colors">
              <i className="fas fa-times text-xs" />
            </button>
          </div>
        )}

        {synthesis && (
          <div className="mb-8" data-synthesis-panel>
            <SynthesisPanel
              result={synthesis}
              articles={top5Articles}
              onClose={() => setSynthesis(null)}
              onGenerateCase={openSynthesisCase}
              onSearch={handleSearch}
            />
          </div>
        )}

        <TopicActionBanner
          onTestYourself={() => openQuizFromWorkflow('mixed')}
          onCaseScenario={openCaseFromWorkflow}
          onReadDeeper={() => {
            const q = encodeURIComponent(currentQuery);
            window.open(`https://pubmed.ncbi.nlm.nih.gov/?term=${q}`, '_blank', 'noopener');
          }}
        />

        {currentQuery && results.length > 0 && isAuthenticated && (
          <div className="mb-4 flex justify-end">
            <button
              type="button"
              onClick={() => navigate(`/topic/${encodeURIComponent(currentQuery)}`)}
              className="flex items-center gap-2 rounded-xl border border-indigo-200 dark:border-indigo-800/50 bg-indigo-50/60 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-300 text-xs font-bold px-4 py-2 hover:bg-indigo-100 dark:hover:bg-indigo-950/40 transition-colors"
            >
              <i className="fas fa-graduation-cap text-[11px]" />
              Open topic workspace
            </button>
          </div>
        )}

        <GuidelineSnapshot query={currentQuery} articles={results} autoRunAlignment={requestGuidelineAlignment} />

        {loading && results.length === 0 && (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        )}

        {results.length > 0 ? (
          <ResearchWorkspace
            layout={layout}
            isPdfOpen={isOpen}
            onToggleLayout={toggleLayout}
            onClosePdf={closePdf}
            pdfPanel={
              activePdf ? (
                <iframe
                  title="Full text PDF or article"
                  src={activePdf}
                  className="h-full min-h-[60vh] w-full rounded-xl border border-gray-200 bg-white dark:border-slate-600 dark:bg-slate-900"
                />
              ) : null
            }
          >
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {renderedResults.map((article, index) => (
                <div key={article.uid} className={index === activeResultIndex ? 'rounded-2xl ring-2 ring-indigo-400/70 ring-offset-2 ring-offset-transparent' : ''}>
                  <ArticleCard
                  key={article.uid}
                  article={article}
                  isSaved={isSaved(article.uid)}
                  isSelected={isSelected(article.uid)}
                  onSave={toggleSaveArticle}
                  onSelect={toggleSelectArticle}
                  onAnalyze={openAnalysis}
                  onGenerateCase={openArticleCase}
                  onQuizPaper={openArticleQuiz}
                  onOpenTopic={handleSearch}
                  onOpenInWorkspace={openPdf}
                  onViewDetails={setDetailArticle}
                  searchId={lastSearchId ?? undefined}
                  searchCompletedAt={searchCompletedAt ?? undefined}
                />
                </div>
              ))}
            </div>
            {visibleCount < visibleResults.length && (
              <div className="mt-6 flex justify-center">
                <Button variant="secondary" onClick={() => setVisibleCount((count) => Math.min(visibleResults.length, count + 20))}>
                  Load more results ({visibleResults.length - visibleCount} remaining)
                </Button>
              </div>
            )}
          </ResearchWorkspace>
        ) : !loading ? (
          <SearchEmptyState onExampleClick={handleSearch} isAuthenticated={isAuthenticated} />
        ) : null}
      </main>

      <React.Suspense fallback={null}>
        <AIAnalysisPanel key={activeArticle?.uid ?? 'none'} article={activeArticle} onClose={() => setActiveArticle(null)} />
      </React.Suspense>

      {detailArticle && (
        <ArticleDetailDrawer
          article={detailArticle}
          onClose={() => setDetailArticle(null)}
          onOpenInWorkspace={openPdf}
        />
      )}

      {isComparing && selectedArticles.length >= 2 && (
        <ComparisonView
          articles={[selectedArticles[0], selectedArticles[1]]}
          topic={currentQuery || undefined}
          onClose={() => setIsComparing(false)}
        />
      )}

      <SelectionBasket 
        selectedArticles={selectedArticles}
        onRemove={(uid) => {
          const article = selectedArticles.find(a => a.uid === uid);
          if (article) toggleSelectArticle(article);
        }}
        onClear={clearSelection}
      />

      <SearchFooter />
      </div>
    </div>
  );
};
