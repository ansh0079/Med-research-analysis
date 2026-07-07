import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useNavigatePage, useSearchContext } from '@contexts/SearchContext';
import { useAuth } from '@contexts/AuthContext';
import { api } from '@services/api';
import type { Article, CaseModeResult, CaseLearningMode, QuizQuestion, TeachingVignetteResult } from '@types';
import { useClientFeatures } from '@hooks/useClientFeatures';
import { logAsyncError } from '@utils/handleAsyncError';
import { CaseAnalysisResultPanel } from '@components/case/CaseAnalysisResultPanel';
import { CaseEvidenceBriefPanel, type CaseEvidenceBrief, type CaseToEvidenceResult } from '@components/case/CaseEvidenceBriefPanel';
import { CaseInputCard } from '@components/case/CaseInputCard';
import { CaseModeSetupPanel } from '@components/case/CaseModeSetupPanel';
import { CaseQuizActionButton } from '@components/case/CaseQuizActionButton';
import { CaseReflectionExportPanel } from '@components/case/CaseReflectionExportPanel';
import { TeachingVignettePanel } from '@components/case/TeachingVignettePanel';
import {
  CASE_PREFILL_KEY,
  MAX_CHARS,
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
    }).catch((err) => logAsyncError(err, 'CaseModePage/submitCaseAttempt'));
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
    <CaseReflectionExportPanel
      kind={reflectionKind}
      saveStatus={reflectionSaveStatus}
      onKindChange={setReflectionKind}
      onExport={(format) => exportReflection(source, format)}
      onSaveDraft={() => { void saveReflectionDraft(source); }}
    />
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
    <CaseQuizActionButton onClick={() => startQuizFromCase(source)} />
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

        <CaseModeSetupPanel
          mode={mode}
          prefillTopic={prefillTopic}
          seedArticles={caseSeedArticles}
          workflowContext={workflowContext}
          onModeChange={setMode}
          onBack={() => setCurrentPage('search')}
        />

        {prefillTopic && caseSeedArticles && caseSeedArticles.length > 0 && (
          <TeachingVignettePanel
            topic={prefillTopic}
            seedCount={caseSeedArticles.length}
            result={tvResult}
            loading={tvLoading}
            error={tvError}
            quizButton={renderCaseQuizButton('teaching_vignette')}
            reflectionExport={renderReflectionExport('teaching_vignette')}
            onGenerate={runTeachingVignette}
          />
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
