import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
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
import { TopicIntelligenceStatusBanner } from '@components/search/TopicIntelligenceStatusBanner';
import { SearchEmptyState } from '@components/search/SearchEmptyState';
import { LowRecallBanner } from '@components/search/LowRecallBanner';
import { RelatedTopicsBar } from '@components/search/RelatedTopicsBar';
import { VerifyEmailBanner } from '@components/search/VerifyEmailBanner';
import { SearchResultsStats } from '@components/search/SearchResultsStats';
import { PersonalizedRemediationBanner } from '@components/search/PersonalizedRemediationBanner';
import { ShiftReviewBar } from '@components/search/ShiftReviewBar';
import { SearchResultsFilterSection } from '@components/search/SearchResultsFilterSection';
import { TopicKnowledgeDiscovery } from '@components/search/TopicKnowledgeDiscovery';
import { AgentMentorPanel } from '@components/search/AgentMentorPanel';
import { ResultLensToolbar } from '@components/search/ResultLensToolbar';
import { SynthesisStatusSection } from '@components/search/SynthesisStatusSection';
import { useSearchRecents } from '@hooks/useSearchRecents';
import { usePdfViewer } from '@hooks/usePdfViewer';
import { useResultsFilter } from '@hooks/useResultsFilter';
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
    void api.getClientConfig().then((config) => {
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

    api.getTopicEvidenceMemory(topic)
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
        api.synthesizeEvidenceStream(currentQuery, top5Articles, {
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
          api.getTopicStaleness(resolved.topic).then((s) => {
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
      const { agentGuidance: nextGuidance } = await api.refreshTopicKnowledge(topic);
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
      const response = await api.reviewTopicKnowledge(agentGuidance.topic);
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
      const response = await api.proposeTopicKnowledge(currentQuery, top5Articles);
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
        <VerifyEmailBanner
          resendStatus={resendStatus}
          onResend={handleResendVerification}
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
          <SearchResultsStats
            totalCount={results.length}
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
          <PersonalizedRemediationBanner
            learnerContext={learnerContext}
            onOpenQuiz={() => setInPlaceQuizExpanded(true)}
            agentGuidance={agentGuidance}
          />
        )}

        {results.length > 0 && (
          <ShiftReviewBar
            currentQuery={currentQuery}
            inPlaceQuizExpanded={inPlaceQuizExpanded}
            onOpenGuideline={openGuidelineFromWorkflow}
            onOpenCase={() => openCaseFromWorkflow('mixed')}
            onToggleQuiz={() => setInPlaceQuizExpanded((v) => !v)}
          />
        )}

        {(newPaperNotice || results.length > 0) && (
          <SearchResultsFilterSection
            resultFilter={resultFilter}
            onResultFilterChange={setResultFilter}
            newPaperNotice={newPaperNotice}
            recentAnalyses={recentAnalyses}
            onOpenAnalysis={openAnalysis}
          />
        )}

        {results.length > 0 && (
          <>
          {!agentGuidance && (
            <TopicKnowledgeDiscovery
              currentQuery={currentQuery}
              resultsCount={results.length}
              intelligenceLoading={intelligenceLoading}
              topicGuideStatus={topicGuideStatus}
              proposeError={proposeError}
              proposingKnowledge={proposingKnowledge}
              onProposeKnowledge={handleProposeKnowledge}
              proposedGuidance={proposedGuidance}
              onOpenCase={openCaseFromWorkflow}
              onOpenQuiz={openQuizFromWorkflow}
            />
          )}

          {agentGuidance && (
            <AgentMentorPanel
              agentGuidance={agentGuidance}
              isFlagshipTopic={isFlagshipTopic}
              isAuthenticated={isAuthenticated}
              topicGuideRefreshState={topicGuideRefreshState}
              onRefreshTopicGuide={runTopicGuideRefresh}
              knowledgeReviewStatus={knowledgeReviewStatus}
              onReviewTopicKnowledge={handleReviewTopicKnowledge}
              topicGuideRefreshError={topicGuideRefreshError}
              canVerifyTeachingAnchor={canVerifyTeachingAnchor}
              anchorVerifyKey={anchorVerifyKey}
              onAnchorVerifyKeyChange={setAnchorVerifyKey}
              currentQuery={currentQuery}
              onAgentGuidanceChange={setAgentGuidance}
              onOpenCase={openCaseFromWorkflow}
              onOpenQuiz={openQuizFromWorkflow}
              onSynthesize={() => void handleSynthesize()}
            />
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
                  await api.submitQuizAttempt({ topic: currentQuery, attempts });
                }}
              />
            </div>
          )}
          </div>
          </>
        )}

        {results.length > 0 && (
          <ResultLensToolbar
            resultsCount={results.length}
            openAccessCount={openAccessCount}
            highQualityCount={highQualityCount}
            recentCount={recentCount}
            practiceChangingCount={practiceChangingCount}
            resultLens={resultLens}
            resultFilter={resultFilter}
            selectedArticles={selectedArticles}
            savedArticles={savedArticles}
            isAuthenticated={isAuthenticated}
            onLensChange={(lens) => {
              setResultLens(lens);
              setVisibleCount(30);
            }}
            onClearLens={() => {
              setResultLens('all');
              setResultFilter('');
              setVisibleCount(30);
            }}
            onCompare={() => setIsComparing(true)}
            onNavigate={setCurrentPage}
            onClearSelection={clearSelection}
            onExport={exportResults}
            trackFeatureUsage={trackFeatureUsage}
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

        <SynthesisStatusSection
          synthesisError={synthesisError}
          synthesisLoading={synthesisLoading}
          synthesisLiveText={synthesisLiveText}
          stalenessBanner={stalenessBanner}
          onDismissStaleness={() => setStalenessBanner(null)}
        />

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

      <footer className="py-8 border-t border-gray-200/60 dark:border-slate-700/70 text-center space-y-2">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
          Signal MD · Multi-Source Medical Evidence Search
        </p>
        <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400">
          <Link to="/legal/terms" className="hover:text-indigo-600 dark:hover:text-indigo-400 underline-offset-2 hover:underline">Terms of Use</Link>
          <span aria-hidden className="text-slate-300 dark:text-slate-600">·</span>
          <Link to="/legal/privacy" className="hover:text-indigo-600 dark:hover:text-indigo-400 underline-offset-2 hover:underline">Privacy</Link>
        </nav>
      </footer>
      </div>
    </div>
  );
};
