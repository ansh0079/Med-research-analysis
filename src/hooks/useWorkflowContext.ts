import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { extractClinicalScenario, scenarioToEvidenceQuery, type ClinicalScenarioExtract } from '../utils/extractClinicalScenario';
import type { AgentGuidance, Article, CaseLearningMode, SynthesisResult } from '@types';
import type { BriefDifficulty } from '@components/search/TopicBriefPanel';
import { getWorkflowContext, saveWorkflowContext } from '@utils/workflowContext';

const CASE_PREFILL_KEY = 'med_case_prefill';
const QUIZ_PREFILL_KEY = 'med_quiz_prefill';

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

export interface WorkflowContextDeps {
  currentQuery: string;
  top5Articles: Article[];
  agentGuidance: AgentGuidance | null | undefined;
  synthesis: SynthesisResult | null;
  isAuthenticated: boolean;
  betaOpenAccess?: boolean;
  results: Article[];
  handleSearch: (q: string) => Promise<Article[]>;
  trackFeatureUsage: (event: string, props?: Record<string, unknown>) => void;
}

export function useWorkflowContext({
  currentQuery,
  top5Articles,
  agentGuidance,
  synthesis,
  isAuthenticated,
  betaOpenAccess = false,
  results,
  handleSearch,
  trackFeatureUsage,
}: WorkflowContextDeps) {
  const navigate = useNavigate();

  const [shiftPresentation, setShiftPresentation] = useState('');
  const [scenarioExtract, setScenarioExtract] = useState<ClinicalScenarioExtract | null>(null);
  const [shiftLaneLoading, setShiftLaneLoading] = useState(false);
  const shiftExtractDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced PICO + decision-point extraction from shift presentation
  useEffect(() => {
    if (shiftExtractDebounceRef.current) clearTimeout(shiftExtractDebounceRef.current);
    const trimmed = shiftPresentation.trim();
    if (trimmed.length < 15) {
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

  const mapDifficultyToMode = useCallback((difficulty: BriefDifficulty): CaseLearningMode => {
    if (difficulty === 'easy') return 'student';
    if (difficulty === 'hard') return 'specialist';
    return 'resident';
  }, []);

  const handleQuizScenario = useCallback((difficulty: BriefDifficulty = 'mixed') => {
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

  const openQuizFromWorkflow = useCallback((difficulty: BriefDifficulty = 'mixed') => {
    trackFeatureUsage('workflow_quiz_click', {
      authenticated: isAuthenticated,
      resultsCount: results.length,
      difficulty,
    });
    if (!isAuthenticated && !betaOpenAccess) {
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
  }, [agentGuidance, betaOpenAccess, currentQuery, handleQuizScenario, isAuthenticated, navigate, results.length, top5Articles, trackFeatureUsage]);

  const handleCaseScenario = useCallback((difficulty: BriefDifficulty = 'mixed') => {
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
  }, [agentGuidance, currentQuery, mapDifficultyToMode, navigate, shiftPresentation, top5Articles]);

  const openCaseFromWorkflow = useCallback((difficulty: BriefDifficulty = 'mixed') => {
    trackFeatureUsage('workflow_case_click', {
      authenticated: isAuthenticated,
      resultsCount: results.length,
      difficulty,
    });
    handleCaseScenario(difficulty);
  }, [handleCaseScenario, isAuthenticated, results.length, trackFeatureUsage]);

  const openArticleCase = useCallback((article: Article) => {
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

  const openArticleQuiz = useCallback((article: Article) => {
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

  const openSynthesisCase = useCallback(() => {
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

  const runShiftFastLane = useCallback(async () => {
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
  }, [handleSearch, isAuthenticated, scenarioExtract, shiftPresentation, trackFeatureUsage]);

  return {
    shiftPresentation,
    setShiftPresentation,
    scenarioExtract,
    shiftLaneLoading,
    handleQuizScenario,
    openQuizFromWorkflow,
    handleCaseScenario,
    openCaseFromWorkflow,
    openArticleCase,
    openArticleQuiz,
    openSynthesisCase,
    runShiftFastLane,
    getWorkflowContext,
    saveWorkflowContext,
  };
}
