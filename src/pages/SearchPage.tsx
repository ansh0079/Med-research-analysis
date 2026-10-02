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
import { resolveSynthesisArticles } from '@utils/synthesisSources';
import { PersonalizedRemediationBanner } from '@components/search/PersonalizedRemediationBanner';
import { SearchResultsFilterSection } from '@components/search/SearchResultsFilterSection';
import { SearchEvidenceWorkflowSection } from '@components/search/SearchEvidenceWorkflowSection';
import { LearningWorkspacePanel } from '@components/search/LearningWorkspacePanel';
import { ResultLensToolbar } from '@components/search/ResultLensToolbar';
import { SynthesisStatusSection } from '@components/search/SynthesisStatusSection';
import { SearchResultsGrid } from '@components/search/SearchResultsGrid';
import { SearchPageFooter } from '@components/search/SearchPageFooter';
import { useSearchPage } from '@hooks/useSearchPage';
import { useGuidelineWorkspaceSummary } from '@hooks/useGuidelineWorkspaceSummary';
import { api } from '@services/api';
import type { BriefDifficulty } from '@components/search/TopicBriefPanel';
import {
  buildSearchWorkspaceParams,
  chooseDefaultWorkspaceTab,
  parseSearchWorkspaceParams,
  type SearchWorkspaceTab,
} from '@utils/searchWorkspaceUrl';

const AUTH_WORKSPACE_KEY = 'signalmd_search_workspace_after_auth';

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
    resultSort,
    setResultSort,
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

  const [searchParams, setSearchParams] = useSearchParams();
  const initialUrlState = React.useRef(parseSearchWorkspaceParams(searchParams));
  const [workspaceTab, setWorkspaceTab] = React.useState<SearchWorkspaceTab>(initialUrlState.current.tab);
  const urlQuery = searchParams.get('q')?.trim() || '';
  const consumedQueryRef = React.useRef<string | null>(null);
  const pendingRequestedTabRef = React.useRef<SearchWorkspaceTab | undefined>(
    searchParams.has('tab') ? initialUrlState.current.tab : undefined,
  );
  const manuallySelectedTabForQueryRef = React.useRef('');
  const resolvedDefaultTabForQueryRef = React.useRef('');

  // A shared URL restores the actual workspace: retrieval filters, result view,
  // tab and ordering. Keeping q in the address also makes refresh and support
  // reproduction deterministic.
  React.useEffect(() => {
    if (!urlQuery || consumedQueryRef.current === urlQuery) return;
    if (urlQuery === resultsQuery) {
      consumedQueryRef.current = urlQuery;
      return;
    }
    consumedQueryRef.current = urlQuery;
    const restored = parseSearchWorkspaceParams(searchParams);
    pendingRequestedTabRef.current = searchParams.has('tab') ? restored.tab : undefined;
    const restoredFilters = { ...filters, ...restored.filters };
    void handleSearch(urlQuery, restoredFilters).then(() => {
      setResultLens(restored.lens);
      setEvidenceLane(restored.lane);
      setResultSort(restored.sort);
      setResultFilter(restored.resultFilter);
    });
  }, [filters, handleSearch, resultsQuery, searchParams, setEvidenceLane, setResultFilter, setResultLens, setResultSort, urlQuery]);

  React.useEffect(() => {
    const requested = pendingRequestedTabRef.current;
    setWorkspaceTab(requested || 'evidence');
    manuallySelectedTabForQueryRef.current = '';
    resolvedDefaultTabForQueryRef.current = requested ? resultsQuery : '';
    pendingRequestedTabRef.current = undefined;
  }, [resultsQuery]);

  const workspaceQuery = results.length > 0 ? (resultsQuery || currentQuery) : '';
  const guidelineWorkspace = useGuidelineWorkspaceSummary(workspaceQuery, results);
  const learningTopic = resultsQuery || currentQuery;
  const synopsisViewRef = React.useRef<{ key: string; startedAt: number } | null>(null);

  const logSearchLearningEvent = React.useCallback((
    eventType: string,
    payload: Record<string, unknown> = {},
    sourceType = 'search',
    sourceId?: string | number,
  ) => {
    if (!isAuthenticated || !learningTopic.trim()) return;
    void api.learning.logLearningEvent({
      eventType,
      topic: learningTopic,
      sourceType,
      sourceId,
      payload: {
        searchId: lastSearchId ?? null,
        resultCount: results.length,
        ...payload,
      },
    }).catch(() => {
      // Measurement must never interrupt the evidence workflow.
    });
  }, [isAuthenticated, lastSearchId, learningTopic, results.length]);

  React.useEffect(() => {
    if (!isAuthenticated || !resultsQuery || results.length === 0) return;
    logSearchLearningEvent('search_workspace_viewed', {
      defaultTab: workspaceTab,
      queryIntent: queryIntent ?? null,
    });
  // One impression per completed result set. Tab changes are recorded separately.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, resultsQuery, searchCompletedAt]);

  React.useEffect(() => {
    if (workspaceTab !== 'learn') return;
    logSearchLearningEvent('learning_workspace_opened', {
      hasSynopsis: Boolean(synthesis),
      selectedSourceCount: selectedArticles.length,
    });
  // Log the transition into the learning workspace, not every state change inside it.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceTab, resultsQuery]);

  React.useEffect(() => {
    if (!synthesis || !isAuthenticated) return;
    const key = String(synthesis.jobKey || synthesis.timestamp || `${learningTopic}:${synthesis.articleCount}`);
    if (synopsisViewRef.current?.key === key) return;
    synopsisViewRef.current = { key, startedAt: Date.now() };
    logSearchLearningEvent('synopsis_presented', {
      jobKey: synthesis.jobKey ?? null,
      cached: Boolean(synthesis.cached),
      sourceCount: synthesis.articleCount,
      retrievedSourceCount: synthesis.retrievedArticleCount ?? synthesis.articleCount,
    }, 'synthesis', synthesis.jobKey ?? key);
    return () => {
      const active = synopsisViewRef.current;
      if (!active || active.key !== key) return;
      synopsisViewRef.current = null;
      logSearchLearningEvent('synopsis_view_ended', {
        jobKey: synthesis.jobKey ?? null,
        dwellMs: Math.max(0, Date.now() - active.startedAt),
        cached: Boolean(synthesis.cached),
      }, 'synthesis', synthesis.jobKey ?? key);
    };
  }, [isAuthenticated, learningTopic, logSearchLearningEvent, synthesis]);

  React.useEffect(() => {
    if (!resultsQuery || guidelineWorkspace.query !== resultsQuery || guidelineWorkspace.loading) return;
    if (resolvedDefaultTabForQueryRef.current === resultsQuery || manuallySelectedTabForQueryRef.current === resultsQuery) return;
    setWorkspaceTab(chooseDefaultWorkspaceTab());
    resolvedDefaultTabForQueryRef.current = resultsQuery;
  }, [guidelineWorkspace.loading, guidelineWorkspace.query, resultsQuery]);

  React.useEffect(() => {
    if (!resultsQuery) return;
    const next = buildSearchWorkspaceParams({
      query: resultsQuery,
      tab: workspaceTab,
      lens: resultLens,
      lane: evidenceLane,
      sort: resultSort,
      resultFilter,
      filters,
    });
    if (next.toString() !== searchParams.toString()) setSearchParams(next, { replace: true });
  }, [evidenceLane, filters, resultFilter, resultLens, resultSort, resultsQuery, searchParams, setSearchParams, workspaceTab]);

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
    onOpenCase: (difficulty?: BriefDifficulty) => {
      logSearchLearningEvent('case_opened', { difficulty: difficulty ?? 'mixed', entryPoint: 'workflow' }, 'case');
      openCaseFromWorkflow(difficulty);
    },
    onOpenQuiz: (difficulty?: BriefDifficulty) => {
      logSearchLearningEvent('quiz_opened', { difficulty: difficulty ?? 'mixed', entryPoint: 'workflow' }, 'quiz');
      openQuizFromWorkflow(difficulty);
    },
    onSynthesize: handleSynthesize,
    onSearch: handleSearch,
    onOpenGuideline: openGuidelineFromWorkflow,
    onOpenAnalysis: openAnalysis,
    onViewDetails: setDetailArticle,
    onDismissKnowledgeDrift: (id: number) => { void dismissKnowledgeDriftAlert(id); },
  };

  const synthesisArticles = React.useMemo(
    () => synthesis ? resolveSynthesisArticles(synthesis, results) : top5Articles,
    [results, synthesis, top5Articles],
  );

  const openWorkspaceTab = (tab: SearchWorkspaceTab) => {
    manuallySelectedTabForQueryRef.current = resultsQuery;
    resolvedDefaultTabForQueryRef.current = resultsQuery;
    setWorkspaceTab(tab);
    requestAnimationFrame(() => {
      document.getElementById(`workspace-${tab}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const currentWorkspaceParams = React.useMemo(() => buildSearchWorkspaceParams({
    query: resultsQuery || currentQuery,
    tab: workspaceTab,
    lens: resultLens,
    lane: evidenceLane,
    sort: resultSort,
    resultFilter,
    filters,
  }), [currentQuery, evidenceLane, filters, resultFilter, resultLens, resultSort, resultsQuery, workspaceTab]);

  const continueAfterAuth = React.useCallback((pendingAction: 'synopsis') => {
    try {
      sessionStorage.setItem(AUTH_WORKSPACE_KEY, JSON.stringify({
        query: resultsQuery || currentQuery,
        selectedUids: selectedArticles.map((article) => article.uid),
        pendingAction,
      }));
    } catch {
      // The shareable URL still restores the search when storage is unavailable.
    }
    navigate('/auth', {
      state: { from: { pathname: '/search', search: `?${currentWorkspaceParams.toString()}`, hash: '' } },
    });
  }, [currentQuery, currentWorkspaceParams, navigate, resultsQuery, selectedArticles]);

  React.useEffect(() => {
    if (!isAuthenticated || !resultsQuery || results.length === 0) return;
    let pending: { query?: string; selectedUids?: string[]; pendingAction?: string } | null = null;
    try {
      pending = JSON.parse(sessionStorage.getItem(AUTH_WORKSPACE_KEY) || 'null');
    } catch {
      pending = null;
    }
    if (!pending || pending.query !== resultsQuery) return;
    sessionStorage.removeItem(AUTH_WORKSPACE_KEY);
    for (const uid of (pending.selectedUids || []).slice(0, 3)) {
      const article = results.find((candidate) => candidate.uid === uid);
      if (article && !isSelected(uid)) toggleSelectArticle(article);
    }
    if (pending.pendingAction === 'synopsis') {
      setWorkspaceTab('learn');
      resolvedDefaultTabForQueryRef.current = resultsQuery;
      void handleSynthesize();
    }
  }, [handleSynthesize, isAuthenticated, isSelected, results, resultsQuery, toggleSelectArticle]);

  // Generated learning content lives in the Learn tab. Opening a quiz must
  // reveal that workspace before scrolling to the in-place quiz panel.
  const openInPlaceQuiz = () => {
    if (!isAuthenticated) {
      openQuizFromWorkflow('mixed');
      return;
    }
    logSearchLearningEvent('quiz_opened', { difficulty: 'mixed', entryPoint: 'learning_workspace' }, 'quiz');
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
              guidelineWorkspace={guidelineWorkspace}
              notice={<SourceFailureNotice sourceTelemetry={searchTelemetry?.sources} sourceFailures={searchTelemetry?.sourceFailures} />}
              details={hasSearchDetails({ sourceTelemetry: searchTelemetry?.sources, queryIntent, searchPack, activeFilters }) ? (
                <SearchDetails sourceTelemetry={searchTelemetry?.sources} queryIntent={queryIntent} searchPack={searchPack} activeFilters={activeFilters} />
              ) : undefined}
            />

            <nav className="mb-5 flex gap-6 border-b border-slate-200 dark:border-slate-700" aria-label="Evidence workspace sections" role="tablist">
              {(['guidelines', 'evidence', 'learn'] as const).map((tab) => (
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
                resultSort={resultSort}
                onResultFilterChange={setResultFilter}
                onSortChange={setResultSort}
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
                  setResultSort('relevance');
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
                onGenerateCase={(article) => {
                  logSearchLearningEvent('case_opened', { entryPoint: 'article', articleUid: article.uid }, 'article', article.uid);
                  openArticleCase(article);
                }}
                onQuizPaper={(article) => {
                  logSearchLearningEvent('quiz_opened', { entryPoint: 'article', articleUid: article.uid }, 'article', article.uid);
                  openArticleQuiz(article);
                }}
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

        {results.length > 0 && workspaceTab === 'guidelines' && (
          <section id="workspace-guidelines" role="tabpanel" className="scroll-mt-28">
            <GuidelineSnapshot query={resultsQuery || currentQuery} articles={results} workspace={guidelineWorkspace} autoRunAlignment={requestGuidelineAlignment} />
          </section>
        )}

        {results.length > 0 && (
          <section id="workspace-learn" role="tabpanel" hidden={workspaceTab !== 'learn'} className="scroll-mt-28 space-y-5">
            <LearningWorkspacePanel
              query={resultsQuery || currentQuery}
              results={results}
              guidelineWorkspace={guidelineWorkspace}
              synthesisLoading={synthesisLoading}
              isAuthenticated={isAuthenticated}
              onGenerateSynopsis={() => {
                if (!isAuthenticated) {
                  continueAfterAuth('synopsis');
                  return;
                }
                logSearchLearningEvent('synopsis_requested', {
                  selectedSourceCount: selectedArticles.length,
                  availableSourceCount: results.length,
                }, 'synthesis');
                void handleSynthesize();
              }}
              onOpenQuiz={openInPlaceQuiz}
              onOpenCase={() => {
                logSearchLearningEvent('case_opened', { difficulty: 'mixed', entryPoint: 'learning_workspace' }, 'case');
                openCaseFromWorkflow('mixed');
              }}
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
                  articles={synthesisArticles}
                  onClose={() => setSynthesis(null)}
                  onGenerateCase={() => {
                    logSearchLearningEvent('case_opened', { entryPoint: 'synthesis', jobKey: synthesis.jobKey ?? null }, 'synthesis', synthesis.jobKey ?? undefined);
                    openSynthesisCase();
                  }}
                  onSourceOpen={(article, index) => {
                    logSearchLearningEvent('synopsis_source_opened', {
                      articleUid: article.uid,
                      sourceIndex: index + 1,
                      jobKey: synthesis.jobKey ?? null,
                    }, 'article', article.uid);
                  }}
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
