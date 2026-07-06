import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@components/ui/Button';
import { useNavigatePage, useSearchContext } from '@contexts/SearchContext';
import { useAuth } from '@contexts/AuthContext';
import { api } from '@services/api';
import type { Article, CaseModeResult, CaseLearningMode, QuizQuestion, TeachingVignetteResult } from '@types';
import { useClientFeatures } from '@hooks/useClientFeatures';
import { CaseAnalysisResultPanel } from '@components/case/CaseAnalysisResultPanel';
import { CaseMCQs } from '@components/case/CaseMCQs';
import { CaseEvidenceBriefPanel, type CaseEvidenceBrief, type CaseToEvidenceResult } from '@components/case/CaseEvidenceBriefPanel';
import { CaseInputCard } from '@components/case/CaseInputCard';
import {
  CASE_PREFILL_KEY,
  MAX_CHARS,
  MODES,
  QUIZ_PREFILL_KEY,
  REVIEW_PREFILL_KEY,
  articleQuizSeed,
  buildCaseQuizPrefill,
  buildCaseReflectionSections,
  buildEvidenceQuizMcqs,
  exportCaseReflection,
  readWorkflowContext,
  writeWorkflowContext,
  type ReflectionKind,
} from '@components/case/CaseModeUtils';

export const CaseModePage: React.FC = () => {
  const setCurrentPage = useNavigatePage();
  const { setQuery } = useSearchContext();
  const { isAuthenticated } = useAuth();
  const { betaOpenAccess } = useClientFeatures();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialUrlTopic = searchParams.get('topic');

  const [mode, setMode] = useState<CaseLearningMode>(() => {
    const urlMode = new URLSearchParams(window.location.search).get('mode') as CaseLearningMode | null;
    return urlMode && ['student', 'resident', 'specialist', 'exam'].includes(urlMode) ? urlMode : 'resident';
  });
  const [structuredCase, setStructuredCase] = React.useState({
    age: '', sex: '', symptoms: '', labs: '', medications: '', comorbidities: '',
  });
  const [caseText, setCaseText] = React.useState(() => initialUrlTopic
    ? `Clinical question: ${initialUrlTopic}\n\nPlease describe the patient scenario (age, sex, presentation, comorbidities, relevant labs/imaging):`
    : ''
  );
  const [loading, setLoading] = React.useState(false);
  const [evidenceLoading, setEvidenceLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [evidenceError, setEvidenceError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<CaseModeResult | null>(null);
  const [evidenceResult, setEvidenceResult] = React.useState<CaseToEvidenceResult | null>(null);
  const [prefillTopic, setPrefillTopic] = React.useState<string | null>(initialUrlTopic);
  const [caseSeedArticles, setCaseSeedArticles] = React.useState<Partial<Article>[] | null>(null);
  const [autoGenerateTeachingCase, setAutoGenerateTeachingCase] = React.useState(false);
  const [tvLoading, setTvLoading] = React.useState(false);
  const [tvError, setTvError] = React.useState<string | null>(null);
  const [tvResult, setTvResult] = React.useState<TeachingVignetteResult | null>(null);
  const [reflectionKind, setReflectionKind] = React.useState<ReflectionKind>('CBD');
  const [reflectionSaveStatus, setReflectionSaveStatus] = React.useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [workflowContext, setWorkflowContext] = React.useState<Record<string, unknown>>(() => readWorkflowContext());

  const [prevSearchParams, setPrevSearchParams] = React.useState(searchParams);
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
  const [sessionPrefillApplied, setSessionPrefillApplied] = React.useState(false);
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

  const buildPayload = () => [
    structuredCase.age && `Age: ${structuredCase.age}`,
    structuredCase.sex && `Sex: ${structuredCase.sex}`,
    structuredCase.symptoms && `Symptoms/presentation: ${structuredCase.symptoms}`,
    structuredCase.labs && `Labs/imaging/vitals: ${structuredCase.labs}`,
    structuredCase.medications && `Medications: ${structuredCase.medications}`,
    structuredCase.comorbidities && `Comorbidities: ${structuredCase.comorbidities}`,
    caseText && `Additional context: ${caseText}`,
  ].filter(Boolean).join('\n');

  const recordCaseAttempt = (caseType: 'analysis' | 'teaching_vignette', text: string) => {
    if (!isAuthenticated) return;
    api.learning.submitCaseAttempt({
      topic: prefillTopic || 'general',
      caseText: text,
      caseType,
      learningMode: mode,
      userResponse: null,
      aiFeedback: null,
      seedArticleUids: caseSeedArticles?.map((a) => String(a.uid || '')).filter(Boolean) ?? [],
    }).catch(() => undefined);
  };

  const buildReflectionSections = (source: 'analysis' | 'teaching_vignette', kind: ReflectionKind) =>
    buildCaseReflectionSections({
      source,
      kind,
      result,
      tvResult,
      caseSeedArticles,
      workflowContext,
      caseText,
      buildPayload,
      prefillTopic,
    });

  const exportReflection = (source: 'analysis' | 'teaching_vignette', format: 'doc' | 'txt') => {
    const sections = buildReflectionSections(source, reflectionKind);
    exportCaseReflection(sections, reflectionKind, format);
  };

  const saveReflectionDraft = async (source: 'analysis' | 'teaching_vignette') => {
    const sections = buildReflectionSections(source, reflectionKind);
    const pick = (title: string) => sections.find(([key]) => key === title)?.[1] || '';
    setReflectionSaveStatus('saving');
    try {
      await api.learning.createPortfolioReflection({
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
  };

  const renderReflectionExport = (source: 'analysis' | 'teaching_vignette') => (
    <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-300">Portfolio reflection</p>
          <p className="mt-1 text-xs text-emerald-900/80 dark:text-emerald-100/75">
            Export a de-identified WBA draft for CBD, mini-CEX, or DOPS evidence.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={reflectionKind}
            onChange={(event) => setReflectionKind(event.target.value as ReflectionKind)}
            className="h-9 rounded-lg border border-emerald-200 bg-white px-2 text-xs font-bold text-emerald-800 outline-none dark:border-emerald-800 dark:bg-slate-950 dark:text-emerald-100"
            aria-label="Portfolio reflection type"
          >
            <option value="CBD">CBD</option>
            <option value="mini-CEX">mini-CEX</option>
            <option value="DOPS">DOPS</option>
          </select>
          <button
            type="button"
            onClick={() => exportReflection(source, 'doc')}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-black text-white transition-colors hover:bg-emerald-500"
          >
            <i className="fas fa-file-word text-[10px]" />
            Save .doc
          </button>
          <button
            type="button"
            onClick={() => void saveReflectionDraft(source)}
            disabled={reflectionSaveStatus === 'saving'}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-slate-900 px-3 text-xs font-black text-white transition-colors hover:bg-slate-700 disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
          >
            <i className={`fas ${reflectionSaveStatus === 'saving' ? 'fa-circle-notch fa-spin' : reflectionSaveStatus === 'saved' ? 'fa-check' : 'fa-save'} text-[10px]`} />
            {reflectionSaveStatus === 'saved' ? 'Saved' : 'Save draft'}
          </button>
          <button
            type="button"
            onClick={() => exportReflection(source, 'txt')}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-emerald-200 bg-white px-3 text-xs font-black text-emerald-700 transition-colors hover:bg-emerald-50 dark:border-emerald-800 dark:bg-slate-950 dark:text-emerald-200 dark:hover:bg-emerald-950/40"
          >
            <i className="fas fa-file-lines text-[10px]" />
            Text
          </button>
        </div>
        {reflectionSaveStatus === 'error' && (
          <p className="text-xs font-semibold text-red-600 dark:text-red-300">Could not save draft. Sign in and try again.</p>
        )}
      </div>
    </div>
  );

  const startQuizFromCase = (source: 'analysis' | 'teaching_vignette') => {
    const { topic, evidence, teachingPoints, mcqAngles } = buildCaseQuizPrefill({
      source,
      result,
      tvResult,
      prefillTopic,
      caseSeedArticles,
    });

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
  };

  const renderCaseQuizButton = (source: 'analysis' | 'teaching_vignette') => (
    <button
      type="button"
      onClick={() => startQuizFromCase(source)}
      className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-xs font-black text-white transition-colors hover:bg-violet-500"
    >
      <i className="fas fa-brain text-[10px]" />
      Quiz this decision point
    </button>
  );

  const guardAuth = () => {
    if (!isAuthenticated && !betaOpenAccess) {
      navigate('/auth');
      return false;
    }
    return true;
  };

  const runTeachingVignette = async () => {
    if (!guardAuth()) return;
    if (!prefillTopic || !caseSeedArticles || caseSeedArticles.length === 0) return;
    setTvLoading(true); setTvError(null); setTvResult(null);
    try {
      const response = await api.ai.generateTeachingVignette(prefillTopic, caseSeedArticles, mode);
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
  };

  const autoGenerateStarted = React.useRef(false);
  React.useEffect(() => {
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

  const runAnalysis = async () => {
    if (!guardAuth()) return;
    const payload = buildPayload();
    if (!payload.trim() || isOverLimit) return;
    setLoading(true); setError(null); setResult(null);
    setEvidenceResult(null);
    try {
      const response = await api.ai.analyzeCase(payload, 'auto', {
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
  };

  const runCaseToEvidence = async () => {
    if (!guardAuth()) return;
    const payload = buildPayload();
    if (!payload.trim() || isOverLimit) return;
    setEvidenceLoading(true);
    setEvidenceError(null);
    setEvidenceResult(null);
    setResult(null);
    try {
      const response = await api.knowledge.getCaseToEvidence(
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
  };

  const evidenceQuizMcqs: QuizQuestion[] = React.useMemo(() => {
    return buildEvidenceQuizMcqs(evidenceResult?.brief?.quizQuestion, evidenceResult?.brief?.keyUncertainty || '');
  }, [evidenceResult]);

  return (
    <div className="min-h-screen aurora-bg">
      <div className="max-w-3xl mx-auto px-4 pt-[calc(var(--nav-h)+1.5rem)] pb-10 space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Clinical Case Scenario</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Evidence-backed case-based learning — research assistant only</p>
          </div>
          <button type="button" onClick={() => setCurrentPage('search')}
            className="text-xs font-bold text-slate-400 uppercase tracking-widest hover:text-indigo-600 transition-colors flex items-center gap-1.5">
            <i className="fas fa-arrow-left" /> Back
          </button>
        </div>

        {prefillTopic && (
          <div className="flex items-start gap-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 px-4 py-3 text-sm">
            <i className="fas fa-search text-indigo-400 mt-0.5 shrink-0" />
            <div>
              <span className="font-semibold text-indigo-700 dark:text-indigo-300">Pre-populated from your search: </span>
              <span className="text-indigo-600 dark:text-indigo-400">{prefillTopic}</span>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Add patient-specific details below, then run analysis.</p>
              {caseSeedArticles && caseSeedArticles.length > 0 && (
                <p className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-2 font-medium">
                  <i className="fas fa-layer-group mr-1" />
                  Evidence retrieval prioritises your top {caseSeedArticles.length} papers from this topic, then fills with live literature search.
                </p>
              )}
            </div>
          </div>
        )}

        {typeof workflowContext.originalPresentation === 'string' && workflowContext.originalPresentation.trim() && (
          <div className="rounded-xl border border-cyan-200 bg-cyan-50/80 px-4 py-3 text-sm dark:border-cyan-900/60 dark:bg-cyan-950/20">
            <p className="text-[10px] font-bold uppercase tracking-widest text-cyan-700 dark:text-cyan-300">Shift review context</p>
            <p className="mt-1 text-xs leading-relaxed text-cyan-950/80 dark:text-cyan-100/80 line-clamp-3">
              {workflowContext.originalPresentation}
            </p>
          </div>
        )}

        {/* Mode selector */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Learner Level</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {MODES.map((m) => (
              <button key={m.id} type="button" onClick={() => setMode(m.id)}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-center ${
                  mode === m.id
                    ? m.activeColor + ' shadow-sm'
                    : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-600'
                }`}>
                <i className={`fas ${m.icon} text-base`} />
                <span className="text-[11px] font-bold leading-tight">{m.label}</span>
                <span className="text-[9px] opacity-70 leading-tight hidden sm:block">{m.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Teaching vignette quick-generate card (only when seed articles are available) */}
        {prefillTopic && caseSeedArticles && caseSeedArticles.length > 0 && (
          <div className="neo-card rounded-2xl p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-violet-500 mb-1">Auto Teaching Case</p>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">Generate Teaching Vignette from Top Papers</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Synthesises a fictional patient case grounded strictly in your {caseSeedArticles.length} retrieved papers — no free-text entry required.
                  Every management step cites the seed articles.
                </p>
              </div>
              <i className="fas fa-book-open text-violet-400 text-xl shrink-0 mt-1" />
            </div>

            <Button variant="gradient" size="sm" onClick={runTeachingVignette}
              disabled={tvLoading} isLoading={tvLoading}
              leftIcon={tvLoading ? undefined : <i className="fas fa-wand-magic-sparkles text-[10px]" />}>
              {tvLoading ? 'Generating…' : 'Generate Teaching Case'}
            </Button>

            {tvError && (() => {
              if (tvError === 'AUTH_REQUIRED') {
                return (
                  <div className="flex items-center justify-between gap-3 px-4 py-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 rounded-xl">
                    <p className="text-sm text-indigo-700 dark:text-indigo-300 flex items-center gap-2">
                      <i className="fas fa-lock text-indigo-400 text-xs" /> Sign in to use this feature.
                    </p>
                    <a href="/auth" className="shrink-0 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition-colors">Sign in →</a>
                  </div>
                );
              }
              return (
                <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 rounded-xl">
                  <i className="fas fa-exclamation-circle text-red-400 text-xs shrink-0" />
                  <p className="text-sm text-red-600 dark:text-red-300">{tvError}</p>
                </div>
              );
            })()}

            {/* Teaching vignette result */}
            {tvResult && (
              <div className="space-y-5 pt-2 border-t border-slate-100 dark:border-slate-700/60 animate-fade-in">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span className={`font-bold px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider ${
                    MODES.find((m) => m.id === tvResult.learningMode)?.activeColor ?? ''
                  }`}>
                    {MODES.find((m) => m.id === tvResult.learningMode)?.label}
                  </span>
                  <span className="text-[10px] text-slate-400">· {tvResult.seedCount} seeds · {tvResult.model}</span>
                  {tvResult.cached && <span className="text-emerald-500 text-[10px]">cached</span>}
                  <span className="sm:ml-auto">{renderCaseQuizButton('teaching_vignette')}</span>
                </div>

                {renderReflectionExport('teaching_vignette')}

                {/* Synthetic patient */}
                <div className="rounded-2xl bg-gradient-to-br from-violet-50 to-indigo-50/40 dark:from-violet-950/20 dark:to-indigo-950/10 border border-violet-100 dark:border-violet-900/40 p-5 space-y-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-violet-500">Synthetic Patient Vignette</p>
                  {tvResult.presentingComplaint && (
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{tvResult.presentingComplaint}</p>
                  )}
                  {tvResult.history && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">History</p>
                      <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{tvResult.history}</p>
                    </div>
                  )}
                  {tvResult.examination && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Examination</p>
                      <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{tvResult.examination}</p>
                    </div>
                  )}
                  {tvResult.investigations && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Investigations</p>
                      <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{tvResult.investigations}</p>
                    </div>
                  )}
                </div>

                {/* Differential */}
                {tvResult.differential.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Differential Diagnosis</p>
                    <div className="space-y-2">
                      {tvResult.differential.map((d, i) => (
                        <div key={i} className="rounded-xl border border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 text-[10px] font-bold flex items-center justify-center shrink-0">{d.rank}</span>
                            <span className="text-sm font-semibold text-slate-900 dark:text-white">{d.diagnosis}</span>
                          </div>
                          <div className="ml-7 grid grid-cols-2 gap-2 text-xs">
                            {d.supporting && (
                              <div>
                                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">For: </span>
                                <span className="text-slate-600 dark:text-slate-400">{d.supporting}</span>
                              </div>
                            )}
                            {d.against && (
                              <div>
                                <span className="text-red-500 font-semibold">Against: </span>
                                <span className="text-slate-600 dark:text-slate-400">{d.against}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Management reasoning */}
                {tvResult.managementReasoning && (
                  <div className="rounded-xl border border-indigo-100 bg-indigo-50/70 p-4 dark:border-indigo-900/40 dark:bg-indigo-950/20">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-500 mb-2">Evidence-Grounded Management</p>
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{tvResult.managementReasoning}</p>
                  </div>
                )}

                {/* Teaching points */}
                {tvResult.teachingPoints.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Teaching Points</p>
                    <ul className="space-y-2">
                      {tvResult.teachingPoints.map((tp, i) => (
                        <li key={i} className="flex items-start gap-2.5">
                          <span className="mt-0.5 w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                          <span className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                            {tp.point}
                            {tp.seedIndices?.length > 0 && (
                              <span className="ml-1 text-[10px] font-bold text-indigo-500">[{tp.seedIndices.join(', ')}]</span>
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Evidence links */}
                {tvResult.evidenceLinks.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">How Each Paper Applies</p>
                    <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50">
                            <th className="text-left font-bold text-slate-400 uppercase tracking-wider px-4 py-2.5 w-10">Seed</th>
                            <th className="text-left font-bold text-slate-400 uppercase tracking-wider px-4 py-2.5">How It Applies</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800/80">
                          {tvResult.evidenceLinks.map((el, i) => (
                            <tr key={i} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                              <td className="px-4 py-2.5 font-mono font-bold text-indigo-500">{el.seedIndex}</td>
                              <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400 leading-relaxed">{el.howItApplies}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Uncertainty flags */}
                {tvResult.uncertaintyFlags.length > 0 && (
                  <div className="rounded-xl border border-amber-100 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/20 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400 mb-2">Uncertainty Flags</p>
                    <ul className="space-y-1.5">
                      {tvResult.uncertaintyFlags.map((u, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-300">
                          <i className="fas fa-question-circle mt-0.5 shrink-0 text-amber-500" />
                          {u}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Post-check flags */}
                {tvResult.postCheckFlags && (
                  <div className="rounded-xl border border-red-100 dark:border-red-900/40 bg-red-50/50 dark:bg-red-950/20 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-red-600 dark:text-red-400 mb-1">
                      <i className="fas fa-shield-halved mr-1" />Post-generation check
                    </p>
                    <p className="text-xs text-red-600 dark:text-red-300 mb-2">{tvResult.postCheckFlags.note}</p>
                    <div className="flex flex-wrap gap-1">
                      {tvResult.postCheckFlags.unsupportedDrugReferences.map((drug) => (
                        <span key={drug} className="px-2 py-0.5 rounded-lg bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 text-[10px] font-bold font-mono">{drug}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Inline MCQs */}
                {tvResult.caseMCQs.length > 0 && (
                  <div className="pt-4 border-t border-slate-100 dark:border-slate-700/60">
                    <CaseMCQs mcqs={tvResult.caseMCQs} topic={tvResult.topic || prefillTopic || 'Clinical case'} />
                  </div>
                )}

                <p className="text-[10px] text-slate-400 italic border-l-2 border-amber-400 pl-3">{tvResult.disclaimer}</p>
              </div>
            )}
          </div>
        )}

        <CaseInputCard
          structuredCase={structuredCase}
          caseText={caseText}
          charsLeft={charsLeft}
          isOverLimit={isOverLimit}
          loading={loading}
          evidenceLoading={evidenceLoading}
          evidenceError={evidenceError}
          error={error}
          hasPayload={Boolean(buildPayload().trim())}
          onUpdateField={updateField}
          onCaseTextChange={setCaseText}
          onUseExample={setCaseText}
          onClear={() => {
            setStructuredCase({ age: '', sex: '', symptoms: '', labs: '', medications: '', comorbidities: '' });
            setCaseText('');
            setResult(null);
            setEvidenceResult(null);
            setError(null);
            setEvidenceError(null);
          }}
          onRunCaseToEvidence={runCaseToEvidence}
          onRunAnalysis={runAnalysis}
        />
        {evidenceResult && (
          <CaseEvidenceBriefPanel
            result={evidenceResult}
            quizMcqs={evidenceQuizMcqs}
            topicFallback={prefillTopic}
          />
        )}

        {/* Results */}
        {result && (
          <CaseAnalysisResultPanel
            result={result}
            prefillTopic={prefillTopic}
            quizButton={renderCaseQuizButton('analysis')}
            reflectionExport={renderReflectionExport('analysis')}
            onSearchFollowUp={(question) => {
              setQuery(question);
              setCurrentPage('search');
            }}
            onStartReview={(question, articles) => {
              localStorage.setItem(REVIEW_PREFILL_KEY, JSON.stringify({ question, articles }));
              navigate('/review');
            }}
          />
        )}
      </div>
    </div>
  );
};
