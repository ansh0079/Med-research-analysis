import React from 'react';
const AIAnalysisPanel = React.lazy(() => import('@components/search/AIAnalysisPanel').then(m => ({ default: m.AIAnalysisPanel })));
import { SynthesisPanel } from '@components/search/SynthesisPanel';
import { TopicActionBanner } from '@components/quiz/TopicActionBanner';
import { SelectionBasket } from '@components/search/SelectionBasket';
import { ComparisonView } from '@components/search/ComparisonView';
import { EvidenceProjectPanel } from '@components/search/EvidenceProjectPanel';
import { ArticleDetailDrawer } from '@components/search/ArticleDetailDrawer';
import { GuidelineSnapshot } from '@components/search/GuidelineSnapshot';
import { SkeletonCard } from '@components/search/SkeletonCard';
import { SearchHero } from '@components/search/SearchHero';
import { TopicIntelligenceStatusBanner } from '@components/search/TopicIntelligenceStatusBanner';
import { SearchEmptyState } from '@components/search/SearchEmptyState';
import { LowRecallBanner } from '@components/search/LowRecallBanner';
import { RelatedTopicsBar } from '@components/search/RelatedTopicsBar';
import { VerifyEmailBanner } from '@components/search/VerifyEmailBanner';
import { SearchResultsStats } from '@components/search/SearchResultsStats';
import { STUDY_TYPE_FILTER_OPTIONS } from '@utils/searchStudyFilters';
import { PersonalizedRemediationBanner } from '@components/search/PersonalizedRemediationBanner';
import { ShiftReviewBar } from '@components/search/ShiftReviewBar';
import { SearchResultsFilterSection } from '@components/search/SearchResultsFilterSection';
import { SearchEvidenceWorkflowSection } from '@components/search/SearchEvidenceWorkflowSection';
import { ResultLensToolbar } from '@components/search/ResultLensToolbar';
import { SynthesisStatusSection } from '@components/search/SynthesisStatusSection';
import { SearchResultsGrid } from '@components/search/SearchResultsGrid';
import { SearchPageFooter } from '@components/search/SearchPageFooter';
import { useSearchPage } from '@hooks/useSearchPage';

export const SearchPage: React.FC = () => {
  const page = useSearchPage();
  const {
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
    queryIntent,
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
  } = page;

  const { activePdf, isOpen, layout, openPdf, closePdf, toggleLayout } = pdfViewer;

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
            sourceTelemetry={searchTelemetry?.sources}
            sourceFailures={searchTelemetry?.sourceFailures}
            queryIntent={queryIntent}
            activeFilters={{
              specificity: filters.specificity,
              studyTypeLabels: (filters.studyTypes || [])
                .map((clause) => STUDY_TYPE_FILTER_OPTIONS.find((o) => o.clause === clause)?.label)
                .filter((label): label is string => Boolean(label)),
              yearRange: filters.yearRange,
            }}
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
          <SearchEvidenceWorkflowSection
            currentQuery={currentQuery}
            results={results}
            agentGuidance={agentGuidance}
            proposedGuidance={proposedGuidance}
            top5Articles={top5Articles}
            topicIntelligence={topicIntelligence}
            synthesis={synthesis}
            synthesisLoading={synthesisLoading}
            intelligenceLoading={intelligenceLoading}
            topicGuideStatus={topicGuideStatus}
            proposeError={proposeError}
            proposingKnowledge={proposingKnowledge}
            isFlagshipTopic={isFlagshipTopic}
            isAuthenticated={isAuthenticated}
            topicGuideRefreshState={topicGuideRefreshState}
            knowledgeReviewStatus={knowledgeReviewStatus}
            topicGuideRefreshError={topicGuideRefreshError}
            canVerifyTeachingAnchor={canVerifyTeachingAnchor}
            anchorVerifyKey={anchorVerifyKey}
            inPlaceQuizExpanded={inPlaceQuizExpanded}
            clinicalAnswer={clinicalAnswer}
            aiEnrichmentLoading={aiEnrichmentLoading}
            aiEnrichmentFailed={aiEnrichmentFailed}
            communityInsight={communityInsight}
            proactiveAlert={proactiveAlert}
            knowledgeDriftAlerts={knowledgeDriftAlerts}
            topicEvidenceMemory={topicEvidenceMemory}
            onProposeKnowledge={handleProposeKnowledge}
            onRefreshTopicGuide={runTopicGuideRefresh}
            onReviewTopicKnowledge={handleReviewTopicKnowledge}
            onAnchorVerifyKeyChange={setAnchorVerifyKey}
            onAgentGuidanceChange={setAgentGuidance}
            onOpenCase={openCaseFromWorkflow}
            onOpenQuiz={openQuizFromWorkflow}
            onSynthesize={handleSynthesize}
            onSearch={handleSearch}
            onOpenGuideline={openGuidelineFromWorkflow}
            onOpenAnalysis={openAnalysis}
            onDismissKnowledgeDrift={(id) => { void dismissKnowledgeDriftAlert(id); }}
          />
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
          <SearchResultsGrid
            layout={layout}
            isPdfOpen={isOpen}
            onToggleLayout={toggleLayout}
            onClosePdf={closePdf}
            activePdf={activePdf}
            renderedResults={renderedResults}
            activeResultIndex={activeResultIndex}
            visibleCount={visibleCount}
            visibleResultsLength={visibleResults.length}
            onLoadMore={() => setVisibleCount((count) => Math.min(visibleResults.length, count + 20))}
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
          />
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
          searchTopic={currentQuery || undefined}
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

      <SearchPageFooter />
      </div>
    </div>
  );
};
