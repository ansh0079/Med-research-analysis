import React from 'react';
import { useSearchParams } from 'react-router-dom';
const AIAnalysisPanel = React.lazy(() => import('@components/search/AIAnalysisPanel').then(m => ({ default: m.AIAnalysisPanel })));
import { SynthesisPanel } from '@components/search/SynthesisPanel';
import { SelectionBasket } from '@components/search/SelectionBasket';
import { ComparisonView } from '@components/search/ComparisonView';
import { ArticleDetailDrawer } from '@components/search/ArticleDetailDrawer';
import { GuidelineSnapshot } from '@components/search/GuidelineSnapshot';
import { EvidenceVerdictStrip } from '@components/search/EvidenceVerdictStrip';
import { SkeletonCard } from '@components/search/SkeletonCard';
import { SearchHero } from '@components/search/SearchHero';
import { SearchEmptyState } from '@components/search/SearchEmptyState';
import { NoResultsState } from '@components/search/NoResultsState';
import { LowRecallBanner } from '@components/search/LowRecallBanner';
import { QuerySenseBanner } from '@components/search/QuerySenseBanner';
import { RelatedTopicsBar } from '@components/search/RelatedTopicsBar';
import { VerifyEmailBanner } from '@components/search/VerifyEmailBanner';
import { SearchDetails, SourceFailureNotice, hasSearchDetails } from '@components/search/SearchDetails';
import { CollapsibleRow } from '@components/search/CollapsibleRow';
import { STUDY_TYPE_FILTER_OPTIONS } from '@utils/searchStudyFilters';
import { PersonalizedRemediationBanner } from '@components/search/PersonalizedRemediationBanner';
import { SearchResultsFilterSection } from '@components/search/SearchResultsFilterSection';
import { SearchEvidenceWorkflowSection } from '@components/search/SearchEvidenceWorkflowSection';
import { LearningWorkspacePanel } from '@components/search/LearningWorkspacePanel';
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
    searchPack,
    queryResolution,
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
    resultsQuery,
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
    evidenceLane,
    setEvidenceLane,
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

  // Run a search supplied in the URL (?q=...). This is how a shared /topic/:topic
  // link degrades for a visitor who is not signed in: TopicPage is protected, so
  // they cannot be sent there, but they can still see the evidence for that topic.
  // Only fires once per query so it does not re-run on every render.
  const [searchParams, setSearchParams] = useSearchParams();
  const [workspaceTab, setWorkspaceTab] = React.useState<'evidence' | 'guidelines' | 'learn'>('evidence');
  const urlQuery = searchParams.get('q')?.trim() || '';
  const consumedQueryRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (!urlQuery || consumedQueryRef.current === urlQuery) return;
    consumedQueryRef.current = urlQuery;
    handleSearch(urlQuery);
    // Drop the param once consumed so a refresh does not silently re-run a
    // search the visitor may have since navigated away from.
    searchParams.delete('q');
    setSearchParams(searchParams, { replace: true });
  }, [urlQuery, handleSearch, searchParams, setSearchParams]);

  React.useEffect(() => {
    setWorkspaceTab('evidence');
  }, [resultsQuery]);

  const activeFilters = {
    specificity: filters.specificity,
    studyTypeLabels: (filters.studyTypes || [])
      .map((clause) => STUDY_TYPE_FILTER_OPTIONS.find((o) => o.clause === clause)?.label)
      .filter(Boolean) as string[],
    yearRange: filters.yearRange,
  };

  const workflowSectionProps = {
    currentQuery,
    results,
    agentGuidance,
    proposedGuidance,
    top5Articles,
    topicIntelligence,
    synthesis,
    synthesisLoading,
    intelligenceLoading,
    topicGuideStatus,
    proposeError,
    proposingKnowledge,
    isFlagshipTopic,
    isAuthenticated,
    topicGuideRefreshState,
    knowledgeReviewStatus,
    topicGuideRefreshError,
    canVerifyTeachingAnchor,
    anchorVerifyKey,
    inPlaceQuizExpanded,
    clinicalAnswer,
    aiEnrichmentLoading,
    aiEnrichmentFailed,
    communityInsight,
    proactiveAlert,
    knowledgeDriftAlerts,
    topicEvidenceMemory,
    onProposeKnowledge: handleProposeKnowledge,
    onRefreshTopicGuide: runTopicGuideRefresh,
    onReviewTopicKnowledge: handleReviewTopicKnowledge,
    onAnchorVerifyKeyChange: setAnchorVerifyKey,
    onAgentGuidanceChange: setAgentGuidance,
    onOpenCase: openCaseFromWorkflow,
    onOpenQuiz: openQuizFromWorkflow,
    onSynthesize: handleSynthesize,
    onSearch: handleSearch,
    onOpenGuideline: openGuidelineFromWorkflow,
    onOpenAnalysis: openAnalysis,
    onViewDetails: setDetailArticle,
    onDismissKnowledgeDrift: (id: number) => { void dismissKnowledgeDriftAlert(id); },
  };

  const openWorkspaceTab = (tab: 'evidence' | 'guidelines' | 'learn') => {
    setWorkspaceTab(tab);
    requestAnimationFrame(() => {
      document.getElementById(`workspace-${tab}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  // Generated learning content lives in the Learn tab. Opening a quiz must
  // reveal that workspace before scrolling to the in-place quiz panel.
  const openInPlaceQuiz = () => {
    if (!isAuthenticated) {
      openQuizFromWorkflow('mixed');
      return;
    }
    setWorkspaceTab('learn');
    setInPlaceQuizExpanded(true);
    requestAnimationFrame(() => {
      document.getElementById('evidence-quiz')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

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
      />

      {/* The pull-up only works against the tall empty-state hero; with results the hero is compact and the workflow bar would sit underneath. */}
      <main className={`max-w-7xl mx-auto px-3 sm:px-4 pb-24 ${results.length > 0 ? 'mt-2' : '-mt-10 sm:-mt-16'}`}>
        {results.length > 0 && (
          <>
            <section className="mb-3" aria-labelledby="evidence-workspace-title">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-indigo-500">Evidence workspace</p>
              <h1 id="evidence-workspace-title" className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                {resultsQuery || currentQuery}
              </h1>
            </section>

            <EvidenceVerdictStrip
              query={resultsQuery || currentQuery}
              results={results}
              conflictCount={synthesis?.conflictMatrix?.length ?? null}
              onJumpToGuidelines={() => openWorkspaceTab('guidelines')}
              openAccessCount={openAccessCount}
              retractedCount={retractedCount}
              notice={<SourceFailureNotice sourceTelemetry={searchTelemetry?.sources} sourceFailures={searchTelemetry?.sourceFailures} />}
              details={hasSearchDetails({ sourceTelemetry: searchTelemetry?.sources, queryIntent, searchPack, activeFilters }) ? (
                <SearchDetails sourceTelemetry={searchTelemetry?.sources} queryIntent={queryIntent} searchPack={searchPack} activeFilters={activeFilters} />
              ) : undefined}
            />

            <nav className="mb-5 flex gap-6 border-b border-slate-200 dark:border-slate-700" aria-label="Evidence workspace sections" role="tablist">
              {(['evidence', 'guidelines', 'learn'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={workspaceTab === tab}
                  aria-controls={`workspace-${tab}`}
                  onClick={() => openWorkspaceTab(tab)}
                  className={`border-b-2 px-0.5 pb-3 text-sm font-bold capitalize transition-colors ${
                    workspaceTab === tab
                      ? 'border-indigo-600 text-indigo-700 dark:border-indigo-400 dark:text-indigo-300'
                      : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </nav>
          </>
        )}

        <section id="workspace-evidence" role="tabpanel" hidden={results.length > 0 && workspaceTab !== 'evidence'} className="scroll-mt-28">
          {currentQuery && (
            <>
              <QuerySenseBanner resolution={queryResolution} onTryQuery={handleSearch} />
              <LowRecallBanner lowRecall={lowRecallLearning} onTryQuery={handleSearch} />
            </>
          )}

          <div id="search-results" className="scroll-mt-28">
            {results.length > 0 && (
              <ResultLensToolbar
                resultsCount={results.length}
                openAccessCount={openAccessCount}
                highQualityCount={highQualityCount}
                recentCount={recentCount}
                practiceChangingCount={practiceChangingCount}
                resultLens={resultLens}
                resultFilter={resultFilter}
                onResultFilterChange={setResultFilter}
                searchPack={searchPack}
                evidenceLane={evidenceLane}
                onLaneChange={setEvidenceLane}
                selectedArticles={selectedArticles}
                savedArticles={savedArticles}
                onLensChange={(lens) => {
                  setResultLens(lens);
                  setVisibleCount(30);
                }}
                onClearLens={() => {
                  setResultLens('all');
                  setResultFilter('');
                  setEvidenceLane('all');
                  setVisibleCount(30);
                }}
                onCompare={() => setIsComparing(true)}
                onNavigate={setCurrentPage}
                onClearSelection={clearSelection}
                onExport={exportResults}
                trackFeatureUsage={trackFeatureUsage}
              />
            )}

            {loading && results.length === 0 && (
              <div className="mb-8 grid grid-cols-1 gap-4">
                {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
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
                evidenceLane={evidenceLane}
                searchPack={searchPack}
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
              currentQuery && searchCompletedAt ? (
                <NoResultsState
                  query={currentQuery}
                  filters={filters}
                  onRelax={(next) => { setFilters(next); handleSearch(currentQuery); }}
                  onRetry={handleSearch}
                />
              ) : (
                <SearchEmptyState onExampleClick={handleSearch} isAuthenticated={isAuthenticated} />
              )
            ) : null}
          </div>

          {currentQuery && results.length > 0 && (
            <RelatedTopicsBar topic={currentQuery} evidenceRelatedTopics={evidenceRelatedTopics} onOpenTopic={handleSearch} />
          )}

          {(newPaperNotice || recentAnalyses.length > 0) && (
            <SearchResultsFilterSection newPaperNotice={newPaperNotice} recentAnalyses={recentAnalyses} onOpenAnalysis={openAnalysis} />
          )}
        </section>

        {results.length > 0 && (
          <section id="workspace-guidelines" role="tabpanel" hidden={workspaceTab !== 'guidelines'} className="scroll-mt-28">
            <GuidelineSnapshot query={resultsQuery || currentQuery} articles={results} autoRunAlignment={requestGuidelineAlignment} />
          </section>
        )}

        {results.length > 0 && (
          <section id="workspace-learn" role="tabpanel" hidden={workspaceTab !== 'learn'} className="scroll-mt-28 space-y-5">
            <LearningWorkspacePanel
              query={resultsQuery || currentQuery}
              results={results}
              topicIntelligence={topicIntelligence}
              synthesisLoading={synthesisLoading}
              isAuthenticated={isAuthenticated}
              onGenerateSynopsis={() => {
                if (!isAuthenticated) {
                  navigate('/auth', { state: { from: { pathname: '/search', search: '', hash: '' } } });
                  return;
                }
                void handleSynthesize();
              }}
              onOpenQuiz={openInPlaceQuiz}
              onOpenCase={() => openCaseFromWorkflow('mixed')}
              onChooseSources={() => openWorkspaceTab('evidence')}
            />

            <SynthesisStatusSection
              synthesisError={synthesisError}
              synthesisLoading={synthesisLoading}
              synthesisLiveText={synthesisLiveText}
              stalenessBanner={stalenessBanner}
              onDismissStaleness={() => setStalenessBanner(null)}
            />

            {synthesis && (
              <div data-synthesis-panel>
                <SynthesisPanel
                  result={synthesis}
                  articles={top5Articles}
                  onClose={() => setSynthesis(null)}
                  onGenerateCase={openSynthesisCase}
                  onSearch={handleSearch}
                />
              </div>
            )}

            <SearchEvidenceWorkflowSection part="tools" {...workflowSectionProps} />

            {learnerContext?.hasPersonalization && (learnerContext.weakClaimCount > 0 || learnerContext.hasTrajectory || learnerContext.weakTopicCount > 0) && (
              <CollapsibleRow
                icon="fa-bullseye"
                title="Your learning gaps"
                summary={learnerContext.weakClaimCount > 0 ? `${learnerContext.weakClaimCount} weak claim${learnerContext.weakClaimCount === 1 ? '' : 's'} on this topic` : 'Linked to your recent learning'}
              >
                <PersonalizedRemediationBanner learnerContext={learnerContext} onOpenQuiz={openInPlaceQuiz} agentGuidance={agentGuidance} />
              </CollapsibleRow>
            )}

            {currentQuery && isAuthenticated && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => navigate(`/topic/${encodeURIComponent(currentQuery)}`)}
                  className="flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50/60 px-4 py-2 text-xs font-bold text-indigo-700 transition-colors hover:bg-indigo-100 dark:border-indigo-800/50 dark:bg-indigo-950/20 dark:text-indigo-300 dark:hover:bg-indigo-950/40"
                >
                  <i className="fas fa-graduation-cap text-[11px]" />
                  Open topic workspace
                </button>
              </div>
            )}
          </section>
        )}
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
