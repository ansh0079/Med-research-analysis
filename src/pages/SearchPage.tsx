import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
const AIAnalysisPanel = React.lazy(() => import('@components/search/AIAnalysisPanel').then(m => ({ default: m.AIAnalysisPanel })));
// AgentChatPanel is lazy-loaded because it only appears after topic knowledge is ready.
const AgentChatPanel = React.lazy(() => import('@components/search/AgentChatPanel').then(m => ({ default: m.AgentChatPanel })));
import { TopicActionBanner } from '@components/quiz/TopicActionBanner';
import { SelectionBasket } from '@components/search/SelectionBasket';
import { ComparisonView } from '@components/search/ComparisonView';
import { EvidenceProjectPanel } from '@components/search/EvidenceProjectPanel';
import { TopicBriefPanel } from '@components/search/TopicBriefPanel';
import { EvidenceQuizPanel } from '@components/search/EvidenceQuizPanel';
import { EvidenceMapPanel } from '@components/search/EvidenceMapPanel';
import { ArticleDetailDrawer } from '@components/search/ArticleDetailDrawer';
import { SearchKnowledgePanels } from '@components/search/SearchKnowledgePanels';

import { GuidelineSnapshot } from '@components/search/GuidelineSnapshot';
import { useSearchMeta, useSearchQuery, useSearchSelection } from '@contexts/SearchContext';
import { useAuth } from '@contexts/AuthContext';
import { useAnalytics, useSearch } from '@hooks';
import { SearchHero } from '@components/search/SearchHero';
import { TopicIntelligenceStatusBanner } from '@components/search/TopicIntelligenceStatusBanner';

import { LowRecallBanner } from '@components/search/LowRecallBanner';
import { RelatedTopicsBar } from '@components/search/RelatedTopicsBar';
import { useSearchRecents } from '@hooks/useSearchRecents';
import { usePdfViewer } from '@hooks/usePdfViewer';
import { useResultsFilter } from '@hooks/useResultsFilter';
import { useExportResults } from '@hooks/useExportResults';
import { useWorkflowContext } from '@hooks/useWorkflowContext';
import { useClientFeatures } from '@hooks/useClientFeatures';
import { api } from '@services/api';
import { selectTopEvidence } from '../utils/selectTopEvidence';
import type { Article } from '@types';
import {
  PersonalizedRemediationBanner,
  ResultLensToolbar,
  SearchFooter,
  SearchRefinementPanel,
  SearchStatsCards,
  SearchVerificationBanner,
  ShiftReviewToolbar,
} from '@components/search/SearchPagePanels';

import { useSearchPageOnboarding } from './search/useSearchPageOnboarding';
import { useNewPaperNotice } from './search/useNewPaperNotice';
import { useSearchPageRecentAnalyses } from './search/useSearchPageRecentAnalyses';
import { useSearchPageKeyboard } from './search/useSearchPageKeyboard';
import { useSearchPageSynthesis } from './search/useSearchPageSynthesis';
import { useSearchPageTopicActions } from './search/useSearchPageTopicActions';
import { useTopicEvidenceMemory } from './search/useTopicEvidenceMemory';
import { SearchSynthesisSection } from './search/SearchSynthesisSection';
import { SearchResultsSection } from './search/SearchResultsSection';

export const SearchPage: React.FC = () => {
  const navigate = useNavigate();
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
  const [verifyBannerDismissed, setVerifyBannerDismissed] = useState(false);
  const [resendStatus, setResendStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const showVerifyBanner = isAuthenticated && user?.emailVerified === false && !verifyBannerDismissed;

  const handleResendVerification = useCallback(async () => {
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
  const [inPlaceQuizExpanded, setInPlaceQuizExpanded] = useState(false);
  const [detailArticle, setDetailArticle] = useState<Article | null>(null);

  const { currentQuery, setCurrentQuery } = useSearchPageOnboarding(search, filters);
  const { newPaperNotice, updateNewPaperNotice } = useNewPaperNotice();
  const { recentAnalyses, openAnalysis } = useSearchPageRecentAnalyses();

  useEffect(() => {
    let cancelled = false;
    void api.search.getClientConfig().then((config) => {
      if (!cancelled) setVectorSearchEnabled(Boolean(config.features?.vectorSearch));
    });
    return () => { cancelled = true; };
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

  useSearchPageKeyboard({
    visibleResults,
    activeResultIndex,
    setActiveResultIndex,
    toggleSaveArticle,
    openAnalysis,
  });

  const top5Articles = useMemo(
    () => topicIntelligence?.evidenceBouquet.topPapers?.length
      ? topicIntelligence.evidenceBouquet.topPapers
      : selectTopEvidence(results, results.length),
    [results, topicIntelligence]
  );

  const evidenceRelatedTopics = useMemo(
    () => (topicIntelligence?.evidenceMap?.nodes?.relatedTopics || [])
      .map((entry) => entry.displayTopic || entry.normalizedTopic)
      .filter(Boolean),
    [topicIntelligence?.evidenceMap?.nodes?.relatedTopics]
  );

  const isFlagshipTopic = useMemo(
    () => Boolean(
      topicIntelligence &&
      agentGuidance &&
      top5Articles.length >= 3 &&
      (topicIntelligence.guidelineSnapshot.count ?? 0) > 0 &&
      ((agentGuidance.seminalPapers?.length ?? 0) >= 3 || (agentGuidance.teachingPoints?.length ?? 0) >= 3)
    ),
    [agentGuidance, top5Articles.length, topicIntelligence]
  );

  const topicEvidenceMemory = useTopicEvidenceMemory({
    topic: agentGuidance?.topic || currentQuery,
    isAuthenticated,
    resultsCount: results.length,
  });

  const {
    synthesis,
    synthesisLoading,
    synthesisError,
    synthesisLiveText,
    stalenessBanner,
    setSynthesis,
    setSynthesisError,
    setSynthesisLiveText,
    setStalenessBanner,
    handleSynthesize,
  } = useSearchPageSynthesis({
    currentQuery,
    top5Articles,
    results,
    isAuthenticated,
    betaOpenAccess,
  });

  const {
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
  } = useSearchPageTopicActions({
    currentQuery,
    agentGuidance,
    isAuthenticated,
    user,
    setAgentGuidance,
    setTopicGuideStatus,
    setCurrentPage,
    trackFeatureUsage,
  });

  const handleSearch = useCallback(
    async (query: string) => {
      const trimmed = query.trim();
      if (!trimmed) return [];
      setSynthesis(null);
      setSynthesisError(null);
      setSynthesisLiveText('');
      setTopicGuideRefreshError(null);
      setCurrentQuery(trimmed);
      resetForNewSearch();
      const found = await search(trimmed, filters);
      updateNewPaperNotice(trimmed, found.length);
      return found;
    },
    [filters, resetForNewSearch, search, setCurrentQuery, setSynthesis, setSynthesisError, setSynthesisLiveText, setTopicGuideRefreshError, updateNewPaperNotice]
  );

  const { exportResults } = useExportResults({ currentQuery, selectedArticles, visibleResults });

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

  const [requestGuidelineAlignment, setRequestGuidelineAlignment] = useState(false);

  const openGuidelineFromWorkflow = useCallback(async () => {
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

  return (
    <div className="min-h-screen aurora-bg mesh-bg">
      <div className="aurora-content">

      <SearchVerificationBanner
        show={showVerifyBanner}
        resendStatus={resendStatus}
        onResend={handleResendVerification}
        onDismiss={() => setVerifyBannerDismissed(true)}
      />

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

        <SearchStatsCards
          resultsCount={results.length}
          openAccessCount={openAccessCount}
          highQualityCount={highQualityCount}
          retractedCount={retractedCount}
        />

        {results.length > 0 && (intelligenceLoading || (!agentGuidance && (topicGuideStatus === 'building' || topicGuideStatus === 'pending'))) && (
          <TopicIntelligenceStatusBanner
            intelligenceLoading={intelligenceLoading}
            topicGuideStatus={agentGuidance ? 'idle' : topicGuideStatus}
            variant="card"
            className="mb-4"
          />
        )}

        {results.length > 0 && (
          <PersonalizedRemediationBanner
            learnerContext={learnerContext}
            hasAgentGuidance={Boolean(agentGuidance)}
            onTargetedQuiz={() => setInPlaceQuizExpanded(true)}
            onAskMentor={() => document.getElementById('agent-mentor-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          />
        )}

        <ShiftReviewToolbar
          show={results.length > 0}
          currentQuery={currentQuery}
          inPlaceQuizExpanded={inPlaceQuizExpanded}
          onEvidence={() => document.getElementById('workflow-evidence')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          onGuideline={openGuidelineFromWorkflow}
          onCase={() => openCaseFromWorkflow('mixed')}
          onToggleQuiz={() => setInPlaceQuizExpanded((v) => !v)}
          onReflection={() => openCaseFromWorkflow('mixed')}
        />

        <SearchRefinementPanel
          show={Boolean(newPaperNotice || results.length > 0)}
          newPaperNotice={newPaperNotice}
          resultFilter={resultFilter}
          onResultFilterChange={setResultFilter}
          recentAnalyses={recentAnalyses}
          onOpenAnalysis={openAnalysis}
        />

        {results.length > 0 && (
          <>
          <SearchKnowledgePanels
            show={results.length > 0}
            agentGuidance={agentGuidance}
            proposedGuidance={proposedGuidance}
            results={results}
            currentQuery={currentQuery}
            intelligenceLoading={intelligenceLoading}
            topicGuideStatus={topicGuideStatus}
            proposeError={proposeError}
            proposingKnowledge={proposingKnowledge}
            isFlagshipTopic={isFlagshipTopic}
            isAuthenticated={isAuthenticated}
            topicGuideRefreshState={topicGuideRefreshState}
            topicGuideRefreshError={topicGuideRefreshError}
            knowledgeReviewStatus={knowledgeReviewStatus}
            canVerifyTeachingAnchor={canVerifyTeachingAnchor}
            anchorVerifyKey={anchorVerifyKey}
            onProposeKnowledge={() => void handleProposeKnowledge(top5Articles)}
            onGenerateCase={() => openCaseFromWorkflow('mixed')}
            onGenerateMcqs={() => openQuizFromWorkflow('mixed')}
            onReviewTopicKnowledge={handleReviewTopicKnowledge}
            onRefreshTopicGuide={() => void runTopicGuideRefresh()}
            onVerifyTeachingAnchor={handleVerifyTeachingAnchor}
            onReviewSeminalEvidence={() => { void handleSynthesize(); }}
          />
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

        <ResultLensToolbar
          show={results.length > 0}
          resultLens={resultLens}
          resultFilter={resultFilter}
          resultsCount={results.length}
          openAccessCount={openAccessCount}
          highQualityCount={highQualityCount}
          recentCount={recentCount}
          practiceChangingCount={practiceChangingCount}
          selectedArticlesCount={selectedArticles.length}
          savedArticlesCount={savedArticles.length}
          isAuthenticated={isAuthenticated}
          onSetResultLens={setResultLens}
          onSetResultFilter={setResultFilter}
          onSetVisibleCount={setVisibleCount}
          onTrackLens={(lens, count) => trackFeatureUsage('result_lens_click', { lens, count })}
          onCompare={() => setIsComparing(true)}
          onNavigateTeam={() => setCurrentPage('team')}
          onNavigateGrant={() => setCurrentPage('grant')}
          onNavigateSaved={() => setCurrentPage('saved')}
          onNavigateHistory={() => setCurrentPage('history')}
          onClearSelection={clearSelection}
          onExport={exportResults}
        />

        {results.length > 0 && (
          <EvidenceProjectPanel
            currentQuery={currentQuery}
            results={results}
            selectedArticles={selectedArticles}
            onStartReview={() => setCurrentPage('review')}
          />
        )}

        <SearchSynthesisSection
          synthesis={synthesis}
          synthesisLoading={synthesisLoading}
          synthesisError={synthesisError}
          synthesisLiveText={synthesisLiveText}
          stalenessBanner={stalenessBanner}
          top5Articles={top5Articles}
          onClose={() => setSynthesis(null)}
          onGenerateCase={openSynthesisCase}
          onSearch={handleSearch}
          onDismissStaleness={() => setStalenessBanner(null)}
        />

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

        <SearchResultsSection
          loading={loading}
          results={results}
          renderedResults={renderedResults}
          visibleResults={visibleResults}
          visibleCount={visibleCount}
          setVisibleCount={setVisibleCount}
          activeResultIndex={activeResultIndex}
          activePdf={activePdf}
          isPdfOpen={isOpen}
          layout={layout}
          onToggleLayout={toggleLayout}
          onClosePdf={closePdf}
          isSaved={isSaved}
          isSelected={isSelected}
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
          isAuthenticated={isAuthenticated}
          onExampleClick={handleSearch}
        />
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
