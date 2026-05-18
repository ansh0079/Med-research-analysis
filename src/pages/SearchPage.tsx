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
import { TopicBriefPanel, type BriefDifficulty } from '@components/search/TopicBriefPanel';
import { EvidenceQuizPanel } from '@components/search/EvidenceQuizPanel';
import { EvidenceMapPanel } from '@components/search/EvidenceMapPanel';

import { GuidelineSnapshot } from '@components/search/GuidelineSnapshot';
import { useSearchContext } from '@contexts/SearchContext';
import { useAuth } from '@contexts/AuthContext';
import { useAnalytics, useSearch } from '@hooks';
import { Button } from '@components/ui/Button';
import { SkeletonCard } from '@components/search/SkeletonCard';
import { ResearchWorkspace } from '@components/search/ResearchWorkspace';
import { SearchHero } from '@components/search/SearchHero';
import { SearchEmptyState } from '@components/search/SearchEmptyState';
import { usePdfViewer } from '@hooks/usePdfViewer';
import { api } from '@services/api';
import { downloadText, toBibTeX, toCslJson, toRIS, toWordSummaryHtml } from '@services/exportArticles';
import { selectTopEvidence } from '../utils/selectTopEvidence';
import { extractClinicalScenario, scenarioToEvidenceQuery, type ClinicalScenarioExtract } from '../utils/extractClinicalScenario';
import type { AgentGuidance, Article, CaseLearningMode, SynthesisResult } from '@types';

const RECENT_ANALYSES_KEY = 'med_recent_analyses';
const SAVED_SEARCH_COUNTS_KEY = 'med_saved_search_counts';
const CASE_PREFILL_KEY = 'med_case_prefill';
const QUIZ_PREFILL_KEY = 'med_quiz_prefill';
const WORKFLOW_CONTEXT_KEY = 'med_shift_workflow';

/** Minimal article payload for quiz/case prefill (matches server sanitize + dedupe). */
function articleRowForTopicActions(a: Article) {
  return {
    uid: a.uid,
    title: a.title,
    abstract: a.abstract,
    doi: a.doi,
    pmid: a.pmid,
    pubdate: a.pubdate,
    source: a.source ?? a.journal,
    pmcrefcount: a.pmcrefcount,
    pubtype: a.pubtype,
    _source: a._source,
    _ebmScore: a._ebmScore,
    _isPreprint: a._isPreprint,
  };
}



function getWorkflowContext() {
  try {
    return JSON.parse(sessionStorage.getItem(WORKFLOW_CONTEXT_KEY) || '{}') as Record<string, unknown>;
  } catch {
    return {};
  }
}

function saveWorkflowContext(update: Record<string, unknown>) {
  try {
    sessionStorage.setItem(WORKFLOW_CONTEXT_KEY, JSON.stringify({
      ...getWorkflowContext(),
      ...update,
      updatedAt: new Date().toISOString(),
    }));
  } catch {
    // Ignore storage failures; URL navigation still carries the topic.
  }
}

export const SearchPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { trackFeatureUsage } = useAnalytics();
  const {
    results, savedArticles, selectedArticles, filters,
    setFilters, toggleSaveArticle, toggleSelectArticle,
    clearSelection, isSaved, isSelected, setCurrentPage, agentGuidance, setAgentGuidance, topicIntelligence, topicGuideStatus,
    setTopicGuideStatus, clinicalAnswer, communityInsight, searchHistory,
  } = useSearchContext();

  const { user, isAuthenticated, resendVerification } = useAuth();
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

  const { search, loading, error, lastSearchId, proactiveAlert, aiEnrichmentLoading, knowledgeDriftAlerts, dismissKnowledgeDriftAlert } = useSearch();
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
  const [knowledgeReviewStatus, setKnowledgeReviewStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [proposingKnowledge, setProposingKnowledge] = useState(false);
  const [proposedGuidance, setProposedGuidance] = useState<AgentGuidance | null>(null);
  const [proposeError, setProposeError] = useState<string | null>(null);
  const [topicGuideRefreshState, setTopicGuideRefreshState] = React.useState<'idle' | 'loading'>('idle');
  const [topicGuideRefreshError, setTopicGuideRefreshError] = React.useState<string | null>(null);
  const [currentQuery, setCurrentQuery] = useState(() => {
    const q = sessionStorage.getItem('med_onboarding_query');
    return q || '';
  });
  const [shiftPresentation, setShiftPresentation] = useState('');
  const [scenarioExtract, setScenarioExtract] = useState<ClinicalScenarioExtract | null>(null);
  const shiftExtractDebounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const [shiftLaneLoading, setShiftLaneLoading] = useState(false);
  const [requestGuidelineAlignment, setRequestGuidelineAlignment] = useState(false);
  const [resultFilter, setResultFilter] = useState('');
  const [anchorVerifyKey, setAnchorVerifyKey] = useState<string | null>(null);
  const canVerifyTeachingAnchor = ['admin', 'curator', 'specialist'].includes(String(user?.role || ''));
  const [visibleCount, setVisibleCount] = useState(30);
  const [activeResultIndex, setActiveResultIndex] = useState(0);
  const [inPlaceQuizExpanded, setInPlaceQuizExpanded] = useState(false);
  const [recentAnalyses, setRecentAnalyses] = useState<Article[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(RECENT_ANALYSES_KEY) || '[]');
    } catch {
      return [];
    }
  });
  const [newPaperNotice, setNewPaperNotice] = useState<string | null>(null);
  const openAccessCount = results.filter((article) => article.isFree || article.pmcid).length;
  const highQualityCount = results.filter((article) => article._quality?.grade === 'A' || article._quality?.grade === 'B').length;
  const retractedCount = results.filter((article) => article._retraction?.isRetracted).length;
  const visibleResults = React.useMemo(() => {
    const q = resultFilter.trim().toLowerCase();
    if (!q) return results;
    return results.filter((article) =>
      [
        article.title,
        article.abstract,
        article.journal,
        article.source,
        article.authors?.map((author) => author.name).join(' '),
      ].filter(Boolean).join(' ').toLowerCase().includes(q)
    );
  }, [results, resultFilter]);
  const renderedResults = React.useMemo(() => visibleResults.slice(0, visibleCount), [visibleCount, visibleResults]);

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

  // Debounced PICO + decision-point extraction from shift presentation
  React.useEffect(() => {
    if (shiftExtractDebounceRef.current) clearTimeout(shiftExtractDebounceRef.current);
    const trimmed = shiftPresentation.trim();
    if (trimmed.length < 15) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setScenarioExtract(null);
      return;
    }
    shiftExtractDebounceRef.current = setTimeout(() => {
      setScenarioExtract(extractClinicalScenario(trimmed));
    }, 400);
    return () => {
      if (shiftExtractDebounceRef.current) clearTimeout(shiftExtractDebounceRef.current);
    };
  }, [shiftPresentation]);

  const handleSearch = React.useCallback(
    async (query: string) => {
      setSynthesis(null);
      setSynthesisError(null);
      setSynthesisLiveText('');
      setTopicGuideRefreshError(null);
      setCurrentQuery(query);
      setResultFilter('');
      setVisibleCount(30);
      const found = await search(query, filters);
      try {
        const savedCounts = JSON.parse(localStorage.getItem(SAVED_SEARCH_COUNTS_KEY) || '{}') as Record<string, number>;
        const previous = savedCounts[query.toLowerCase()];
        if (typeof previous === 'number' && found.length > previous) {
          setNewPaperNotice(`${found.length - previous} new paper${found.length - previous === 1 ? '' : 's'} since your last search for this query.`);
        } else {
          setNewPaperNotice(null);
        }
        savedCounts[query.toLowerCase()] = found.length;
        localStorage.setItem(SAVED_SEARCH_COUNTS_KEY, JSON.stringify(savedCounts));
      } catch {
        setNewPaperNotice(null);
      }
    },
    [filters, search]
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

  const [prevResultFilter, setPrevResultFilter] = React.useState(resultFilter);
  const [prevResultsLength, setPrevResultsLength] = React.useState(results.length);
  if (prevResultFilter !== resultFilter || prevResultsLength !== results.length) {
    setPrevResultFilter(resultFilter);
    setPrevResultsLength(results.length);
    setActiveResultIndex(0);
    setVisibleCount(30);
  }

  React.useEffect(() => {
    if (visibleCount >= visibleResults.length) return;
    const onScroll = () => {
      const remaining = document.documentElement.scrollHeight - (window.scrollY + window.innerHeight);
      if (remaining < 900) setVisibleCount((count) => Math.min(visibleResults.length, count + 20));
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [visibleCount, visibleResults.length]);

  const exportResults = React.useCallback((format: 'bibtex' | 'ris' | 'csl' | 'doc') => {
    const articles = selectedArticles.length ? selectedArticles : visibleResults;
    const stamp = new Date().toISOString().split('T')[0];
    const base = `search_results_${stamp}`;
    if (format === 'bibtex') downloadText(`${base}.bib`, toBibTeX(articles));
    if (format === 'ris') downloadText(`${base}.ris`, toRIS(articles));
    if (format === 'csl') downloadText(`${base}.json`, toCslJson(articles), 'application/json');
    if (format === 'doc') downloadText(`${base}.doc`, toWordSummaryHtml(articles, currentQuery || 'Search Results'), 'application/msword');
  }, [currentQuery, selectedArticles, visibleResults]);

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
      : selectTopEvidence(results, 5),
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

  const handleSynthesize = React.useCallback(async () => {
    if (!results.length) return;
    if (!isAuthenticated) {
      setSynthesisError('Sign in to use Evidence Synthesis');
      return;
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
      if (finalResult) setSynthesis(finalResult);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Synthesis failed';
      setSynthesisError(msg === 'AUTH_REQUIRED' ? 'Sign in to use Evidence Synthesis' : msg);
    } finally {
      setSynthesisLoading(false);
    }
  }, [results, top5Articles, currentQuery, isAuthenticated]);

  const mapDifficultyToMode = React.useCallback((difficulty: BriefDifficulty) => {
    if (difficulty === 'easy') return 'student';
    if (difficulty === 'hard') return 'specialist';
    return 'resident';
  }, []);

  const handleQuizScenario = React.useCallback((difficulty: BriefDifficulty = 'mixed') => {
    const params = new URLSearchParams();
    params.set('topic', currentQuery);
    params.set('difficulty', difficulty);
    saveWorkflowContext({
      topic: currentQuery,
      currentStep: 'quiz',
      source: 'search',
      evidenceCount: top5Articles.length,
    });
    try {
      sessionStorage.setItem(QUIZ_PREFILL_KEY, JSON.stringify({
        topic: currentQuery,
        difficulty,
        articles: top5Articles.map(articleRowForTopicActions),
        teachingPoints: agentGuidance?.teachingPoints || [],
        mcqAngles: agentGuidance?.mcqAngles || [],
        workflow: getWorkflowContext(),
      }));
    } catch {
      // Navigation still works with URL params if storage is unavailable.
    }
    navigate(`/quiz?${params.toString()}`);
  }, [agentGuidance, currentQuery, navigate, top5Articles]);

  const openQuizFromWorkflow = React.useCallback((difficulty: BriefDifficulty = 'mixed') => {
    trackFeatureUsage('workflow_quiz_click', {
      authenticated: isAuthenticated,
      resultsCount: results.length,
      difficulty,
    });
    if (!isAuthenticated) {
      const params = new URLSearchParams();
      params.set('topic', currentQuery);
      params.set('difficulty', difficulty);
      try {
        sessionStorage.setItem(QUIZ_PREFILL_KEY, JSON.stringify({
          topic: currentQuery,
          difficulty,
          articles: top5Articles.map(articleRowForTopicActions),
          teachingPoints: agentGuidance?.teachingPoints || [],
          mcqAngles: agentGuidance?.mcqAngles || [],
        }));
      } catch {
        /* ignore */
      }
      navigate('/auth', {
        state: {
          from: { pathname: '/quiz', search: `?${params.toString()}`, hash: '' },
        },
      });
      return;
    }
    handleQuizScenario(difficulty);
  }, [
    agentGuidance,
    currentQuery,
    handleQuizScenario,
    isAuthenticated,
    navigate,
    results.length,
    top5Articles,
    trackFeatureUsage,
  ]);

  const handleCaseScenario = React.useCallback((difficulty: BriefDifficulty = 'mixed') => {
    const params = new URLSearchParams();
    params.set('topic', currentQuery);
    params.set('mode', mapDifficultyToMode(difficulty));
    const fastLaneCaseText = shiftPresentation.trim().length >= 10
      ? [
        'Clinical presentation from shift:',
        shiftPresentation.trim(),
        '',
        'Decision point: identify the management question, appraise the key evidence, and generate practice questions.',
      ].join('\n')
      : undefined;
    try {
      saveWorkflowContext({
        topic: currentQuery,
        currentStep: 'case',
        source: shiftPresentation.trim().length >= 10 ? 'shift_presentation' : 'search',
        evidenceCount: top5Articles.length,
      });
      sessionStorage.setItem(CASE_PREFILL_KEY, JSON.stringify({
        topic: currentQuery,
        learningMode: mapDifficultyToMode(difficulty),
        articles: top5Articles.map(articleRowForTopicActions),
        caseHooks: agentGuidance?.caseGenerationHooks || [],
        caseText: fastLaneCaseText,
        autoGenerate: true,
        workflow: getWorkflowContext(),
      }));
    } catch {
      // Navigation still works with URL params if storage is unavailable.
    }
    navigate(`/case?${params.toString()}`);
  }, [agentGuidance, currentQuery, navigate, mapDifficultyToMode, shiftPresentation, top5Articles]);

  const openCaseFromWorkflow = React.useCallback((difficulty: BriefDifficulty = 'mixed') => {
    trackFeatureUsage('workflow_case_click', {
      authenticated: isAuthenticated,
      resultsCount: results.length,
      difficulty,
    });
    handleCaseScenario(difficulty);
  }, [handleCaseScenario, isAuthenticated, results.length, trackFeatureUsage]);

  const openGuidelineFromWorkflow = React.useCallback(() => {
    saveWorkflowContext({
      topic: currentQuery,
      currentStep: 'guideline',
      source: 'search',
      evidenceCount: results.length,
    });
    setRequestGuidelineAlignment(true);
    document.getElementById('workflow-guideline')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [currentQuery, results.length]);

  const openArticleCase = React.useCallback((article: Article) => {
    const topic = (currentQuery || article.title || 'clinical evidence').trim();
    const mode: CaseLearningMode = 'resident';
    const params = new URLSearchParams();
    params.set('topic', topic);
    params.set('mode', mode);
    try {
      saveWorkflowContext({
        topic,
        currentStep: 'case',
        source: 'article',
        sourceArticleTitle: article.title,
        sourceArticleUid: article.uid,
        originalPresentation: shiftPresentation.trim() || getWorkflowContext().originalPresentation,
        evidenceCount: 1,
      });
      sessionStorage.setItem(CASE_PREFILL_KEY, JSON.stringify({
        topic,
        learningMode: mode,
        articles: [articleRowForTopicActions(article)],
        caseHooks: [
          `Create a fictional patient case around the clinical decision tested by this paper: ${article.title}`,
        ],
        autoGenerate: true,
        workflow: getWorkflowContext(),
      }));
    } catch {
      // Navigation still works with URL params if storage is unavailable.
    }
    trackFeatureUsage('article_case_click', {
      authenticated: isAuthenticated,
      source: article._source,
      hasAbstract: Boolean(article.abstract),
    });
    navigate(`/case?${params.toString()}`);
  }, [currentQuery, isAuthenticated, navigate, shiftPresentation, trackFeatureUsage]);

  const openArticleQuiz = React.useCallback((article: Article) => {
    const topic = (currentQuery || article.title || 'clinical evidence').trim();
    try {
      sessionStorage.setItem(QUIZ_PREFILL_KEY, JSON.stringify({
        topic,
        difficulty: 'mixed',
        articles: [articleRowForTopicActions(article)],
        singlePaperMode: true,
      }));
    } catch {
      // Navigation still works with URL params if storage is unavailable.
    }
    trackFeatureUsage('article_quiz_click', {
      authenticated: isAuthenticated,
      source: article._source,
      hasAbstract: Boolean(article.abstract),
    });
    navigate(`/quiz?topic=${encodeURIComponent(topic)}&difficulty=mixed&count=3`);
  }, [currentQuery, isAuthenticated, navigate, trackFeatureUsage]);

  const openSynthesisCase = React.useCallback(() => {
    if (!synthesis) {
      openCaseFromWorkflow('mixed');
      return;
    }
    const recommendation = synthesis.synthesis.clinicalActionCard?.recommendation || synthesis.synthesis.clinicalBottomLine || synthesis.synthesis.consensus;
    const topic = synthesis.topic || currentQuery || 'clinical evidence';
    const mode: CaseLearningMode = 'resident';
    const params = new URLSearchParams({ topic, mode });
    const caseText = [
      shiftPresentation.trim() ? 'Clinical presentation from shift:' : '',
      shiftPresentation.trim(),
      shiftPresentation.trim() ? '' : '',
      'Evidence synthesis decision point:',
      recommendation,
      '',
      'Create a clinical case that tests how to apply this evidence and guideline uncertainty at the bedside.',
    ].filter(Boolean).join('\n');
    saveWorkflowContext({
      topic,
      currentStep: 'case',
      source: 'synthesis',
      originalPresentation: shiftPresentation.trim() || getWorkflowContext().originalPresentation,
      synthesisBottomLine: recommendation,
      evidenceCount: top5Articles.length,
    });
    try {
      sessionStorage.setItem(CASE_PREFILL_KEY, JSON.stringify({
        topic,
        learningMode: mode,
        articles: top5Articles.map(articleRowForTopicActions),
        caseText,
        autoGenerate: true,
        workflow: getWorkflowContext(),
      }));
    } catch {
      // Navigation still works with URL params if storage is unavailable.
    }
    trackFeatureUsage('synthesis_case_click', {
      authenticated: isAuthenticated,
      resultsCount: results.length,
    });
    navigate(`/case?${params.toString()}`);
  }, [currentQuery, isAuthenticated, navigate, openCaseFromWorkflow, results.length, shiftPresentation, synthesis, top5Articles, trackFeatureUsage]);

  const runShiftFastLane = React.useCallback(async () => {
    const presentation = shiftPresentation.trim();
    if (presentation.length < 10) return;
    const query = scenarioToEvidenceQuery(presentation, scenarioExtract);
    setShiftLaneLoading(true);
    try {
      saveWorkflowContext({
        originalPresentation: presentation,
        topic: query,
        currentStep: 'evidence',
        source: 'shift_presentation',
      });
      sessionStorage.setItem(CASE_PREFILL_KEY, JSON.stringify({
        topic: query,
        learningMode: 'resident',
        caseText: [
          'Clinical presentation from shift:',
          presentation,
          '',
          'Decision point: identify the management question, appraise the key evidence, and generate practice questions.',
        ].join('\n'),
        autoGenerate: false,
        workflow: getWorkflowContext(),
      }));
    } catch {
      // The search itself still works if storage is unavailable.
    }
    trackFeatureUsage('shift_fast_lane_search', {
      authenticated: isAuthenticated,
      length: presentation.length,
    });
    try {
      await handleSearch(query);
    } finally {
      setShiftLaneLoading(false);
    }
  }, [handleSearch, isAuthenticated, shiftPresentation, scenarioExtract, trackFeatureUsage]);

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

      {/* Email verification banner — sits just below the fixed TopNav */}
      {showVerifyBanner && (
        <div className="fixed top-[var(--nav-h)] left-0 right-0 z-40 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800/60 px-4 py-2">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-3 flex-wrap">
            <p className="text-xs text-amber-800 dark:text-amber-200 flex items-center gap-2">
              <i className="fas fa-envelope text-amber-500" />
              Please verify your email address to unlock all features.
            </p>
            <div className="flex items-center gap-3">
              {resendStatus === 'sent' ? (
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                  <i className="fas fa-check" /> Email sent — check your inbox
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={resendStatus === 'sending'}
                  className="text-xs font-semibold text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100 underline transition-colors disabled:opacity-50"
                >
                  {resendStatus === 'sending' ? 'Sending…' : 'Resend verification email'}
                </button>
              )}
              <button
                type="button"
                onClick={() => setVerifyBannerDismissed(true)}
                className="text-amber-400 hover:text-amber-600 dark:hover:text-amber-200 transition-colors"
                aria-label="Dismiss"
              >
                <i className="fas fa-times text-xs" />
              </button>
            </div>
          </div>
        </div>
      )}

      <SearchHero
        showVerifyBanner={showVerifyBanner}
        onSearch={handleSearch}
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
      <main className="max-w-7xl mx-auto px-4 -mt-16 pb-24">
        {results.length > 0 && (
          <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-4">
            {[
              { label: 'Evidence found', value: results.length, icon: 'fa-layer-group', tone: 'text-indigo-500' },
              { label: 'Open access', value: openAccessCount, icon: 'fa-unlock', tone: 'text-emerald-500' },
              { label: 'A/B quality', value: highQualityCount, icon: 'fa-shield-alt', tone: 'text-blue-500' },
              { label: 'Retracted flags', value: retractedCount, icon: 'fa-triangle-exclamation', tone: retractedCount ? 'text-red-500' : 'text-slate-400' },
            ].map((item) => (
              <div key={item.label} className="neo-card p-4 flex items-center gap-3">
                <div className={`w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center ${item.tone}`}>
                  <i className={`fas ${item.icon} text-xs`} />
                </div>
                <div>
                  <p className="font-mono text-lg font-black text-slate-900 dark:text-white">{item.value}</p>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{item.label}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {results.length > 0 && (
          <div className="sticky top-[calc(var(--nav-h)+0.75rem)] z-20 mb-4 rounded-2xl border border-slate-200/80 bg-white/92 p-3 shadow-sm backdrop-blur dark:border-slate-700/80 dark:bg-slate-900/88">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Shift review</p>
                <p className="truncate text-xs font-semibold text-slate-700 dark:text-slate-200">{currentQuery}</p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <button type="button" onClick={() => document.getElementById('workflow-evidence')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-indigo-600 px-3 text-xs font-bold text-white hover:bg-indigo-500">
                  <i className="fas fa-layer-group text-[10px]" /> Evidence
                </button>
                <button type="button" onClick={openGuidelineFromWorkflow}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-blue-200 px-3 text-xs font-bold text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-300 dark:hover:bg-blue-950/40">
                  <i className="fas fa-book-medical text-[10px]" /> Guideline
                </button>
                <button type="button" onClick={() => openCaseFromWorkflow('mixed')}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-emerald-200 px-3 text-xs font-bold text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950/40">
                  <i className="fas fa-stethoscope text-[10px]" /> Case
                </button>
                <button type="button" onClick={() => setInPlaceQuizExpanded((v) => !v)}
                  className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-bold transition-colors ${
                    inPlaceQuizExpanded
                      ? 'bg-violet-600 border-violet-600 text-white hover:bg-violet-500'
                      : 'border-violet-200 text-violet-700 hover:bg-violet-50 dark:border-violet-800 dark:text-violet-300 dark:hover:bg-violet-950/40'
                  }`}>
                  <i className="fas fa-brain text-[10px]" /> {inPlaceQuizExpanded ? 'Close quiz' : 'Quiz me on this'}
                </button>
                <button type="button" onClick={() => openCaseFromWorkflow('mixed')}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800/40">
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
                {(topicGuideStatus === 'building' || topicGuideStatus === 'pending') && (
                  <p className="text-xs font-semibold rounded-lg px-3 py-2 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-800 dark:text-indigo-200 border border-indigo-100 dark:border-indigo-900/50">
                    {topicGuideStatus === 'building'
                      ? 'A mentor topic guide is being generated server-side. You can still synthesize or open Quiz/Case below.'
                      : 'The mentor guide did not arrive in time — try Run search again in the header or open Knowledge → review.'}
                  </p>
                )}
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
            <div className="mb-4 neo-card overflow-hidden border border-emerald-100 dark:border-emerald-900/40">
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
                                    const res = await api.verifyTopicKnowledgeAnchor(topic, { claimText: tp.claim });
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
            onDismissKnowledgeDrift={(id) => { void dismissKnowledgeDriftAlert(id); }}
          />
          <EvidenceMapPanel evidenceMap={topicIntelligence?.evidenceMap} onOpenTopic={handleSearch} />
          {results.length > 0 && (
            <div className="mb-4">
              <EvidenceQuizPanel
                topic={currentQuery}
                articles={top5Articles.length > 0 ? top5Articles : results.slice(0, 5)}
                autoExpand={inPlaceQuizExpanded}
              />
            </div>
          )}
          </div>
          </>
        )}

        {results.length > 0 && (
          <div className="mb-4 neo-card p-3 flex flex-wrap gap-2 items-center">
            {selectedArticles.length >= 2 && (
              <Button onClick={() => setIsComparing(true)} variant="gradient" size="sm"
                leftIcon={<i className="fas fa-balance-scale text-[10px]" />}>
                Compare {Math.min(selectedArticles.length, 2)}
              </Button>
            )}
            {isAuthenticated && (
              <>
                <Button onClick={() => setCurrentPage('team')} variant="ghost" size="sm"
                  leftIcon={<i className="fas fa-users text-[10px]" />}>Team</Button>
                <Button onClick={() => setCurrentPage('grant')} variant="ghost" size="sm"
                  leftIcon={<i className="fas fa-file-signature text-[10px]" />}>Grant</Button>
              </>
            )}
            {savedArticles.length > 0 && (
              <Button onClick={() => setCurrentPage('saved')} variant="ghost" size="sm"
                leftIcon={<i className="fas fa-bookmark text-[10px]" />}>
                Saved · {savedArticles.length}
              </Button>
            )}
            {selectedArticles.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearSelection}>Clear</Button>
            )}
            <Button onClick={() => setCurrentPage('history')} variant="ghost" size="sm"
              leftIcon={<i className="fas fa-history text-[10px]" />}>History</Button>
            <div className="ml-auto flex gap-1.5 flex-wrap">
              <Button variant="ghost" size="sm" onClick={() => exportResults('ris')}
                leftIcon={<i className="fas fa-file-alt text-[10px]" />}>RIS</Button>
              <Button variant="ghost" size="sm" onClick={() => exportResults('bibtex')}
                leftIcon={<i className="fas fa-file-code text-[10px]" />}>BibTeX</Button>
              <Button variant="ghost" size="sm" onClick={() => exportResults('csl')}
                leftIcon={<i className="fas fa-quote-right text-[10px]" />}>CSL</Button>
              <Button variant="ghost" size="sm" onClick={() => exportResults('doc')}
                leftIcon={<i className="fas fa-file-word text-[10px]" />}>Word</Button>
            </div>
          </div>
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
          <div aria-live="polite" className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-2xl text-sm flex items-center gap-2">
            <i className="fas fa-exclamation-circle" />
            {synthesisError}
          </div>
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

        {synthesis && (
          <div className="mb-8">
            <SynthesisPanel
              result={synthesis}
              articles={top5Articles}
              onClose={() => setSynthesis(null)}
              onGenerateCase={openSynthesisCase}
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
                  searchId={lastSearchId ?? undefined}
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
        ) : (
          <SearchEmptyState />
        )}
      </main>

      <React.Suspense fallback={null}>
        <AIAnalysisPanel key={activeArticle?.uid ?? 'none'} article={activeArticle} onClose={() => setActiveArticle(null)} />
      </React.Suspense>

      {isComparing && selectedArticles.length >= 2 && (
        <ComparisonView 
          articles={[selectedArticles[0], selectedArticles[1]]} 
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
          Medical Research Intelligence · Multi-Source Academic Search
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
