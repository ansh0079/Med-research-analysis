import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@contexts/AuthContext';
import { api } from '@services/api';
import { downloadText } from '@services/exportArticles';
import type { Article, CaseLearningMode, CaseModeResult, QuizQuestion, TeachingVignetteResult } from '@types';

import { useClientFeatures } from '@hooks/useClientFeatures';
import {
  CASE_PREFILL_KEY,
  QUIZ_PREFILL_KEY,
  MAX_CHARS,
  type ReflectionKind,
} from './caseModeConfig';
import {
  type CaseEvidenceBrief,
  type CaseToEvidenceResult,
  articleQuizSeed,
  articleReference,
  cleanText,
  escapeHtml,
  reflectionKindLabel,
  readWorkflowContext,
  writeWorkflowContext,
} from './caseModeUtils';

export interface UseCaseModeStateReturn {
  mode: CaseLearningMode;
  setMode: (mode: CaseLearningMode) => void;
  structuredCase: { age: string; sex: string; symptoms: string; labs: string; medications: string; comorbidities: string };
  updateField: (field: keyof UseCaseModeStateReturn['structuredCase'], value: string) => void;
  caseText: string;
  setCaseText: (text: string) => void;
  charsLeft: number;
  isOverLimit: boolean;
  loading: boolean;
  evidenceLoading: boolean;
  error: string | null;
  evidenceError: string | null;
  result: CaseModeResult | null;
  evidenceResult: CaseToEvidenceResult | null;
  prefillTopic: string | null;
  caseSeedArticles: Partial<Article>[] | null;
  autoGenerateTeachingCase: boolean;
  setAutoGenerateTeachingCase: (v: boolean) => void;
  tvLoading: boolean;
  tvError: string | null;
  tvResult: TeachingVignetteResult | null;
  reflectionKind: ReflectionKind;
  setReflectionKind: (kind: ReflectionKind) => void;
  reflectionSaveStatus: 'idle' | 'saving' | 'saved' | 'error';
  workflowContext: Record<string, unknown>;
  evidenceQuizMcqs: QuizQuestion[];
  buildPayload: () => string;
  runAnalysis: () => Promise<void>;
  runCaseToEvidence: () => Promise<void>;
  runTeachingVignette: () => Promise<void>;
  guardAuth: () => boolean;
  startQuizFromCase: (source: 'analysis' | 'teaching_vignette') => void;
  exportReflection: (source: 'analysis' | 'teaching_vignette', format: 'doc' | 'txt') => void;
  saveReflectionDraft: (source: 'analysis' | 'teaching_vignette') => Promise<void>;
  clearAll: () => void;
}

export function useCaseModeState(): UseCaseModeStateReturn {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated } = useAuth();
  const { betaOpenAccess } = useClientFeatures();
  const initialUrlTopic = searchParams.get('topic');

  const [mode, setMode] = useState<CaseLearningMode>(() => {
    const urlMode = new URLSearchParams(window.location.search).get('mode') as CaseLearningMode | null;
    return urlMode && ['student', 'resident', 'specialist', 'exam'].includes(urlMode) ? urlMode : 'resident';
  });
  const [structuredCase, setStructuredCase] = useState({
    age: '', sex: '', symptoms: '', labs: '', medications: '', comorbidities: '',
  });
  const [caseText, setCaseText] = useState(() => initialUrlTopic
    ? `Clinical question: ${initialUrlTopic}\n\nPlease describe the patient scenario (age, sex, presentation, comorbidities, relevant labs/imaging):`
    : ''
  );
  const [loading, setLoading] = useState(false);
  const [evidenceLoading, setEvidenceLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [evidenceError, setEvidenceError] = useState<string | null>(null);
  const [result, setResult] = useState<CaseModeResult | null>(null);
  const [evidenceResult, setEvidenceResult] = useState<CaseToEvidenceResult | null>(null);
  const [prefillTopic, setPrefillTopic] = useState<string | null>(initialUrlTopic);
  const [caseSeedArticles, setCaseSeedArticles] = useState<Partial<Article>[] | null>(null);
  const [autoGenerateTeachingCase, setAutoGenerateTeachingCase] = useState(false);
  const [tvLoading, setTvLoading] = useState(false);
  const [tvError, setTvError] = useState<string | null>(null);
  const [tvResult, setTvResult] = useState<TeachingVignetteResult | null>(null);
  const [reflectionKind, setReflectionKind] = useState<ReflectionKind>('CBD');
  const [reflectionSaveStatus, setReflectionSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [workflowContext, setWorkflowContext] = useState<Record<string, unknown>>(() => readWorkflowContext());

  const [prevSearchParams, setPrevSearchParams] = useState(searchParams);
  if (prevSearchParams !== searchParams) {
    setPrevSearchParams(searchParams);
    const urlTopic = searchParams.get('topic');
    const urlMode = searchParams.get('mode') as CaseLearningMode | null;
    if (urlMode && ['student', 'resident', 'specialist', 'exam'].includes(urlMode)) {
      setMode(urlMode);
    }
    if (urlTopic) {
      setPrefillTopic(urlTopic);
      setCaseText(`Clinical question: ${urlTopic}\n\nPlease describe the patient scenario (age, sex, presentation, comorbidities, relevant labs/imaging):`);
    }
  }

  // Fallback to legacy sessionStorage prefill (run once on mount)
  const [sessionPrefillApplied, setSessionPrefillApplied] = useState(false);
  if (!sessionPrefillApplied) {
    setSessionPrefillApplied(true);
    try {
      const raw = sessionStorage.getItem(CASE_PREFILL_KEY);
      if (raw) {
        sessionStorage.removeItem(CASE_PREFILL_KEY);
        const prefill = JSON.parse(raw) as {
          topic?: string;
          learningMode?: CaseLearningMode;
          articles?: Partial<Article>[];
          caseHooks?: string[];
          caseText?: string;
          autoGenerate?: boolean;
          workflow?: Record<string, unknown>;
        };
        const urlTopic = searchParams.get('topic');
        const urlMode = searchParams.get('mode') as CaseLearningMode | null;
        if (!urlMode && prefill.learningMode) setMode(prefill.learningMode);
        if (prefill.caseText?.trim()) {
          if (prefill.topic) setPrefillTopic(prefill.topic);
          setCaseText(prefill.caseText.trim());
        } else if (!urlTopic && prefill.topic) {
          setPrefillTopic(prefill.topic);
          const hook = prefill.caseHooks?.find((h) => h && h.trim().length > 10);
          setCaseText(hook
            ? hook.trim()
            : `Clinical question: ${prefill.topic}\n\nPlease describe the patient scenario (age, sex, presentation, comorbidities, relevant labs/imaging):`
          );
        }
        if (prefill.articles?.length) {
          setCaseSeedArticles(prefill.articles);
        }
        if (prefill.autoGenerate) setAutoGenerateTeachingCase(true);
        if (prefill.workflow) {
          setWorkflowContext(prefill.workflow);
          writeWorkflowContext(prefill.workflow);
        }
      }
    } catch { /* ignore */ }
  }

  const charsLeft = MAX_CHARS - caseText.length;
  const isOverLimit = charsLeft < 0;

  const updateField = (field: keyof typeof structuredCase, value: string) =>
    setStructuredCase((prev) => ({ ...prev, [field]: value }));

  const buildPayload = useCallback(() => [
    structuredCase.age && `Age: ${structuredCase.age}`,
    structuredCase.sex && `Sex: ${structuredCase.sex}`,
    structuredCase.symptoms && `Symptoms/presentation: ${structuredCase.symptoms}`,
    structuredCase.labs && `Labs/imaging/vitals: ${structuredCase.labs}`,
    structuredCase.medications && `Medications: ${structuredCase.medications}`,
    structuredCase.comorbidities && `Comorbidities: ${structuredCase.comorbidities}`,
    caseText && `Additional context: ${caseText}`,
  ].filter(Boolean).join('\n'), [structuredCase, caseText]);

  const guardAuth = useCallback(() => {
    if (!isAuthenticated && !betaOpenAccess) {
      navigate('/auth');
      return false;
    }
    return true;
  }, [isAuthenticated, betaOpenAccess, navigate]);

  const recordCaseAttempt = useCallback((caseType: 'analysis' | 'teaching_vignette', text: string) => {
    if (!isAuthenticated) return;
    api.submitCaseAttempt({
      topic: prefillTopic || 'general',
      caseText: text,
      caseType,
      learningMode: mode,
      userResponse: null,
      aiFeedback: null,
      seedArticleUids: caseSeedArticles?.map((a) => String(a.uid || '')).filter(Boolean) ?? [],
    }).catch(() => undefined);
  }, [isAuthenticated, prefillTopic, mode, caseSeedArticles]);

  const runAnalysis = useCallback(async () => {
    if (!guardAuth()) return;
    const payload = buildPayload();
    if (!payload.trim() || isOverLimit) return;
    setLoading(true); setError(null); setResult(null);
    setEvidenceResult(null);
    try {
      const response = await api.analyzeCase(payload, 'auto', {
        topic: prefillTopic || undefined,
        learningMode: mode,
        seedArticles: caseSeedArticles && caseSeedArticles.length > 0 ? caseSeedArticles : undefined,
      });
      setResult(response);
      recordCaseAttempt('analysis', payload);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Case analysis failed';
      if (msg === 'AUTH_REQUIRED' && !isAuthenticated) {
        navigate('/auth');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }, [guardAuth, buildPayload, isOverLimit, prefillTopic, mode, caseSeedArticles, recordCaseAttempt, isAuthenticated, navigate]);

  const runCaseToEvidence = useCallback(async () => {
    if (!guardAuth()) return;
    const payload = buildPayload();
    if (!payload.trim() || isOverLimit) return;
    setEvidenceLoading(true);
    setEvidenceError(null);
    setEvidenceResult(null);
    setResult(null);
    try {
      const response = await api.getCaseToEvidence(
        payload,
        prefillTopic || '',
        (caseSeedArticles || []) as Article[]
      );
      setEvidenceResult({
        topic: response.topic || prefillTopic || 'Clinical case',
        clinicalQuestion: payload,
        articles: response.articles || [],
        brief: (response.brief || {}) as CaseEvidenceBrief,
        relatedClaims: (response.relatedClaims || []) as CaseToEvidenceResult['relatedClaims'],
      });
      recordCaseAttempt('analysis', payload);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Case-to-evidence brief failed';
      if (msg === 'AUTH_REQUIRED' && !isAuthenticated) {
        navigate('/auth');
      } else {
        setEvidenceError(msg);
      }
    } finally {
      setEvidenceLoading(false);
    }
  }, [guardAuth, buildPayload, isOverLimit, prefillTopic, caseSeedArticles, recordCaseAttempt, isAuthenticated, navigate]);

  const runTeachingVignette = useCallback(async () => {
    if (!guardAuth()) return;
    if (!prefillTopic || !caseSeedArticles || caseSeedArticles.length === 0) return;
    setTvLoading(true); setTvError(null); setTvResult(null);
    try {
      const response = await api.generateTeachingVignette(prefillTopic, caseSeedArticles, mode);
      setTvResult(response);
      recordCaseAttempt('teaching_vignette', prefillTopic);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Teaching vignette generation failed';
      if (msg === 'AUTH_REQUIRED' && !isAuthenticated) {
        navigate('/auth');
      } else {
        setTvError(msg);
      }
    } finally {
      setTvLoading(false);
    }
  }, [guardAuth, prefillTopic, caseSeedArticles, mode, recordCaseAttempt, isAuthenticated, navigate]);

  const autoGenerateStarted = useRef(false);
  useEffect(() => {
    if (!autoGenerateTeachingCase || autoGenerateStarted.current) return;
    if (!prefillTopic || !caseSeedArticles || caseSeedArticles.length === 0) return;
    autoGenerateStarted.current = true;
    let cancelled = false;
    (async () => {
      if (cancelled) return;
      await runTeachingVignette();
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoGenerateTeachingCase, prefillTopic, caseSeedArticles]);

  const buildReflectionSections = useCallback((
    source: 'analysis' | 'teaching_vignette',
    kind: ReflectionKind,
  ) => {
    const generatedAt = new Date().toLocaleString();
    const sourceResult = source === 'analysis' ? result : null;
    const sourceVignette = source === 'teaching_vignette' ? tvResult : null;
    const evidence = sourceResult?.citations?.length
      ? sourceResult.citations
      : caseSeedArticles ?? [];
    const originalPresentation = typeof workflowContext.originalPresentation === 'string' ? workflowContext.originalPresentation : '';
    const presentation = cleanText(
      originalPresentation ||
      sourceResult?.vignette ||
      sourceResult?.patientPresentation ||
      sourceResult?.caseSummary ||
      sourceVignette?.presentingComplaint ||
      caseText ||
      buildPayload()
    );
    const decisionPoint = cleanText(
      sourceResult?.keyDecisionPoint ||
      sourceResult?.differentialReasoning ||
      sourceVignette?.managementReasoning ||
      prefillTopic ||
      'Clinical decision point reviewed with evidence'
    );
    const evidenceSummary = [
      sourceResult?.evidenceExplanation,
      sourceVignette?.managementReasoning,
      sourceResult?.interventions?.map((item) => `${item.name}: ${item.rationale} [${item.evidenceStrength}]`).join('\n'),
    ].filter(Boolean).map(cleanText).join('\n\n');
    const learningPoints = sourceVignette?.teachingPoints?.length
      ? sourceVignette.teachingPoints.map((tp, index) => `${index + 1}. ${tp.point}`)
      : [
        ...(sourceResult?.interventions ?? []).slice(0, 3).map((item, index) => `${index + 1}. ${item.name}: ${item.rationale}`),
        ...(sourceResult?.caseMCQs ?? []).slice(0, 2).map((q, index) => `${index + 1 + (sourceResult?.interventions?.slice(0, 3).length ?? 0)}. ${q.explanation}`),
      ];
    const uncertainties = [
      ...(sourceResult?.uncertainties ?? []),
      ...(sourceVignette?.uncertaintyFlags ?? []),
    ];
    const actionPlan = kind === 'DOPS'
      ? 'Clarify the relevant local procedural guideline, discuss supervision requirements, and document observed competence separately if a real procedure was performed.'
      : kind === 'mini-CEX'
        ? 'Discuss the case with a senior clinician, compare the evidence against local guidance, and identify one behaviour to use in the next similar presentation.'
        : 'Use this evidence summary to structure a CBD discussion: clinical reasoning, evidence appraisal, uncertainty, patient safety, and a specific learning action.';

    return [
      ['WBA / portfolio type', reflectionKindLabel(kind)],
      ['Generated', generatedAt],
      ['Topic', cleanText(prefillTopic || sourceResult?.query || sourceVignette?.topic || 'Clinical evidence reflection')],
      ['Original clinical question', cleanText(originalPresentation) || 'Not captured. Add the de-identified presentation before submission.'],
      ['De-identified case / scenario', presentation],
      ['Clinical decision point', decisionPoint],
      ['Evidence reviewed', evidence.length ? evidence.map(articleReference).join('\n') : 'No seed articles recorded. Add citations before portfolio submission.'],
      ['Evidence appraisal', evidenceSummary || 'Summarise the main evidence, guideline comparison, and limitations after senior review.'],
      ['Learning points', learningPoints.length ? learningPoints.map(cleanText).join('\n') : 'Add 2-3 personal learning points before submission.'],
      ['Uncertainty and safety', uncertainties.length ? uncertainties.map((item) => `- ${cleanText(item)}`).join('\n') : 'No explicit uncertainties captured. Verify against local guidelines and patient-specific factors.'],
      ['Reflection', 'This was generated from an evidence-assisted learning workflow and should be edited into first person before portfolio submission. Include what changed in your clinical reasoning and how this will affect future practice.'],
      ['Action plan', actionPlan],
      ['Governance note', 'Do not include identifiable patient data. Verify against local policy, guideline recommendations, and senior clinical judgement.'],
    ] as Array<[string, string]>;
  }, [result, tvResult, caseSeedArticles, workflowContext, caseText, buildPayload, prefillTopic]);

  const exportReflection = useCallback((source: 'analysis' | 'teaching_vignette', format: 'doc' | 'txt') => {
    const sections = buildReflectionSections(source, reflectionKind);
    const stamp = new Date().toISOString().split('T')[0];
    const safeKind = reflectionKind.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    if (format === 'txt') {
      const text = sections.map(([title, body]) => `${title}\n${body}`).join('\n\n');
      downloadText(`portfolio_reflection_${safeKind}_${stamp}.txt`, text);
      return;
    }
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(reflectionKindLabel(reflectionKind))}</title>
      <style>body{font-family:Arial,sans-serif;line-height:1.45;color:#111827;max-width:820px;margin:32px auto;padding:0 24px}h1{font-size:24px}h2{font-size:15px;margin-top:20px;border-bottom:1px solid #e5e7eb;padding-bottom:4px}p{font-size:13px;white-space:pre-wrap}</style>
    </head><body>
      <h1>${escapeHtml(reflectionKindLabel(reflectionKind))}</h1>
      ${sections.map(([title, body]) => `<h2>${escapeHtml(title)}</h2><p>${escapeHtml(body)}</p>`).join('\n')}
    </body></html>`;
    downloadText(`portfolio_reflection_${safeKind}_${stamp}.doc`, html, 'application/msword');
  }, [buildReflectionSections, reflectionKind]);

  const saveReflectionDraft = useCallback(async (source: 'analysis' | 'teaching_vignette') => {
    const sections = buildReflectionSections(source, reflectionKind);
    const pick = (title: string) => sections.find(([key]) => key === title)?.[1] || '';
    setReflectionSaveStatus('saving');
    try {
      await api.createPortfolioReflection({
        reflectionType: reflectionKind,
        sourceType: 'case',
        topic: pick('Topic') || prefillTopic || 'Clinical case reflection',
        whatHappened: [pick('Original clinical question'), pick('De-identified case / scenario')].filter(Boolean).join('\n\n'),
        whatILearned: [pick('Evidence appraisal'), pick('Learning points')].filter(Boolean).join('\n\n'),
        whatIWillChange: pick('Action plan'),
        evidenceUsed: pick('Evidence reviewed'),
        supervisorDiscussion: 'Draft saved from Case Mode. Add supervisor discussion notes before portfolio submission.',
        status: 'draft',
      });
      setReflectionSaveStatus('saved');
      setTimeout(() => setReflectionSaveStatus('idle'), 2000);
    } catch {
      setReflectionSaveStatus('error');
    }
  }, [buildReflectionSections, reflectionKind, prefillTopic]);

  const startQuizFromCase = useCallback((source: 'analysis' | 'teaching_vignette') => {
    const sourceResult = source === 'analysis' ? result : null;
    const sourceVignette = source === 'teaching_vignette' ? tvResult : null;
    const topic = cleanText(
      sourceResult?.keyDecisionPoint ||
      sourceResult?.query ||
      sourceVignette?.managementReasoning ||
      sourceVignette?.topic ||
      prefillTopic ||
      'Clinical decision point'
    );
    const evidence = sourceResult?.citations?.length
      ? sourceResult.citations
      : caseSeedArticles ?? [];
    const teachingPoints = sourceVignette?.teachingPoints?.map((tp) => ({
      claim: tp.point,
      evidence: tp.seedIndices?.map((idx) => `Seed ${idx}`).join(', '),
    })) || sourceResult?.interventions?.map((item) => ({
      claim: item.name,
      evidence: item.rationale,
    })) || [];
    const mcqAngles = [
      sourceResult?.keyDecisionPoint,
      sourceResult?.evidenceExplanation,
      sourceVignette?.managementReasoning,
      ...(sourceResult?.uncertainties ?? []),
      ...(sourceVignette?.uncertaintyFlags ?? []),
    ].filter(Boolean).map(cleanText).slice(0, 5);

    try {
      writeWorkflowContext({
        topic,
        currentStep: 'quiz',
        source: 'case',
        caseDecisionPoint: topic,
      });
      sessionStorage.setItem(QUIZ_PREFILL_KEY, JSON.stringify({
        topic,
        difficulty: 'mixed',
        articles: evidence.map(articleQuizSeed),
        teachingPoints,
        mcqAngles,
        workflow: readWorkflowContext(),
      }));
    } catch {
      // Navigation still works with URL params if storage is unavailable.
    }

    const params = new URLSearchParams();
    params.set('topic', topic);
    params.set('difficulty', 'mixed');
    navigate(`/quiz?${params.toString()}`);
  }, [result, tvResult, prefillTopic, caseSeedArticles, navigate]);

  const evidenceQuizMcqs: QuizQuestion[] = useMemo(() => {
    const q = evidenceResult?.brief?.quizQuestion;
    if (!q?.question || !Array.isArray(q.options) || !q.options.length) return [];
    const letter = String(q.correctAnswer || 'A').trim().charAt(0).toUpperCase();
    return [{
      id: 'case-evidence-quiz-1',
      question: q.question,
      options: q.options.map((opt, i) => `${String.fromCharCode(65 + i)}: ${opt}`),
      correctAnswer: /^[A-D]$/i.test(letter) ? letter : 'A',
      explanation: q.explanation || evidenceResult?.brief?.keyUncertainty || '',
      difficulty: 'medium',
      type: 'multiple_choice',
      questionType: 'clinical_application',
    }];
  }, [evidenceResult]);

  const clearAll = useCallback(() => {
    setStructuredCase({ age: '', sex: '', symptoms: '', labs: '', medications: '', comorbidities: '' });
    setCaseText('');
    setResult(null);
    setEvidenceResult(null);
    setError(null);
    setEvidenceError(null);
  }, []);

  return {
    mode, setMode,
    structuredCase, updateField,
    caseText, setCaseText,
    charsLeft, isOverLimit,
    loading, evidenceLoading,
    error, evidenceError,
    result, evidenceResult,
    prefillTopic, caseSeedArticles,
    autoGenerateTeachingCase, setAutoGenerateTeachingCase,
    tvLoading, tvError, tvResult,
    reflectionKind, setReflectionKind,
    reflectionSaveStatus,
    workflowContext,
    evidenceQuizMcqs,
    buildPayload,
    runAnalysis,
    runCaseToEvidence,
    runTeachingVignette,
    guardAuth,
    startQuizFromCase,
    exportReflection,
    saveReflectionDraft,
    clearAll,
  };
}
