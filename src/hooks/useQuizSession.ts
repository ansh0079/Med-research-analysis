import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useSearchContext } from '@contexts/SearchContext';
import { generateQuiz, generateQuizFromEvidence, QuizGenerationError, type QuizArticle } from '@services/quizService';
import { api } from '@services/api';
import { lookupArticleAttribution } from '@utils/searchAttribution';
import { useAuth } from '@contexts/AuthContext';
import type { QuizQuestion, QuizState, StudyRun, StudyRunOutline, LearningProfile, UserTopicMemory } from '@types';
import { EvidenceAuditSnapshot } from '@components/search/EvidenceAuditPanel';
import {
  QUIZ_INITIAL_STATE,
  currentTimeMs,
  getDifficultyFromParam,
  learningRoundItemsToQuestions,
  waitForClaimJob,
  readQuizPrefill,
  buildLockedArticles,
  buildEvidenceSnippets,
  advanceQuizWithAdaptiveDifficulty,
} from '@components/learning/quizPageUtils';
import { buildQuizReflectionSections, exportQuizReflection, type ReflectionKind } from '@components/learning/quizReflectionExport';
import { getWorkflowContext } from '@utils/workflowContext';

export function useQuizSession() {
  const navigate = useNavigate();
  const { detectedTopic, results, setCurrentPage } = useSearchContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAuthenticated } = useAuth();

  const urlTopic = searchParams.get('topic');
  const urlStudyRunId = Number(searchParams.get('studyRunId') || 0) || undefined;
  const curriculumTopicIdParam = Number(searchParams.get('curriculumTopicId') || 0) || undefined;
  const explainParam = searchParams.get('explain');
  const urlDifficulty = getDifficultyFromParam(searchParams.get('difficulty'));
  const urlMode = searchParams.get('mode') as 'spaced_rep' | 'standard' | null;
  const urlTargetNodeIds = useMemo(() => {
    const raw = searchParams.get('targetNodes');
    if (!raw) return undefined;
    return raw.split(',').map((s) => s.trim()).filter(Boolean);
  }, [searchParams]);
  const urlClaimJobKey = searchParams.get('claimJob')?.trim() || undefined;
  const urlRoundId = Number(searchParams.get('roundId') || 0) || undefined;
  const urlCount = Math.min(Math.max(Number(searchParams.get('count') || 5) || 5, 1), 10);

  const [quizPrefill] = useState(readQuizPrefill);
  const [workflowContext] = useState<Record<string, unknown>>(() => ({
    ...getWorkflowContext(),
    ...(quizPrefill?.workflow as Record<string, unknown> | undefined || {}),
  }));

  const activeTopic = urlTopic || String(quizPrefill?.topic || '') || detectedTopic || '';
  const activeStudyRunId = urlStudyRunId || (Number(quizPrefill?.studyRunId || 0) || undefined);
  const prefillDifficulty = urlDifficulty || (
    quizPrefill?.difficulty === 'easy' || quizPrefill?.difficulty === 'medium'
    || quizPrefill?.difficulty === 'hard' || quizPrefill?.difficulty === 'mixed'
      ? quizPrefill.difficulty as 'easy' | 'medium' | 'hard' | 'mixed'
      : 'mixed'
  );

  const lockedArticles = useMemo(() => buildLockedArticles(quizPrefill), [quizPrefill]);
  const evidenceSnippets = useMemo(
    () => buildEvidenceSnippets(lockedArticles, results),
    [lockedArticles, results],
  );

  const [quizSourceArticles, setQuizSourceArticles] = useState<QuizArticle[]>([]);
  const [quiz, setQuiz] = useState<QuizState>(QUIZ_INITIAL_STATE);
  const [generating, setGenerating] = useState(true);
  const [genError, setGenError] = useState<string | null>(null);
  const [genErrorCode, setGenErrorCode] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [answerConfidence, setAnswerConfidence] = useState(3);
  const [confidenceByQuestion, setConfidenceByQuestion] = useState<Record<string, number>>({});
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [fromDataset, setFromDataset] = useState(false);
  const [disclaimer, setDisclaimer] = useState<string | null>(null);
  const [quizEvidenceAudit, setQuizEvidenceAudit] = useState<EvidenceAuditSnapshot | null>(null);
  const [studyRun, setStudyRun] = useState<StudyRun | null>(null);
  const [studyOutline, setStudyOutline] = useState<StudyRunOutline | null>(null);
  const [feedbackSentIds, setFeedbackSentIds] = useState<Set<string>>(new Set());
  const [studyRunLoadFailed, setStudyRunLoadFailed] = useState(false);
  const [manualTopic, setManualTopic] = useState(activeTopic);
  const [learningProfile, setLearningProfile] = useState<LearningProfile | null>(null);
  const [topicMemory, setTopicMemory] = useState<UserTopicMemory | null>(null);
  const [reflectionKind, setReflectionKind] = useState<ReflectionKind>('CBD');
  const [reflectionSaveStatus, setReflectionSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [adaptiveNotice, setAdaptiveNotice] = useState<string | null>(null);

  const effectiveExplanationDepth = useMemo(() => {
    if (explainParam === 'foundation' || explainParam === 'exam_focus' || explainParam === 'mechanistic') return explainParam;
    if (learningProfile?.defaultExplanationDepth) return learningProfile.defaultExplanationDepth;
    return 'exam_focus';
  }, [explainParam, learningProfile]);

  const trainingStage = (learningProfile?.trainingStage || 'finals') as NonNullable<LearningProfile['trainingStage']>;

  useEffect(() => {
    if (!isAuthenticated) return;
    api.learning.getLearningProfile().then((r) => setLearningProfile(r.profile)).catch(() => {});
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || !activeTopic || activeTopic.trim().length < 2) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTopicMemory(null);
      return;
    }
    let cancelled = false;
    api.learning.getTopicMemory(activeTopic.trim())
      .then((r) => { if (!cancelled) setTopicMemory(r.memory); })
      .catch(() => { if (!cancelled) setTopicMemory(null); });
    return () => { cancelled = true; };
  }, [isAuthenticated, activeTopic]);

  const fetchQuiz = useCallback(async (isStale: () => boolean) => {
    if (!activeTopic || activeTopic.trim().length < 2) {
      if (!isStale()) {
        setGenError('No research topic detected. Search for a topic first, then open Test yourself.');
        setGenErrorCode(null);
        setGenerating(false);
      }
      return;
    }
    if (!isStale()) {
      setGenerating(true);
      setGenError(null);
      setGenErrorCode(null);
      setQuiz(QUIZ_INITIAL_STATE);
      setSelected(null);
      setQuizEvidenceAudit(null);
      setAdaptiveNotice(null);
    }
    try {
      if (urlRoundId && isAuthenticated) {
        const { round } = await api.knowledge.getLearningRound(urlRoundId);
        if (isStale()) return;
        const roundQuestions = learningRoundItemsToQuestions(
          (round.items || []) as Array<{
            id?: number;
            itemType?: string;
            claimKey?: string | null;
            questionText?: string;
            options?: string[];
            correctAnswer?: string | null;
            explanation?: string | null;
          }>
        );
        if (roundQuestions.length > 0) {
          setFromDataset(false);
          setDisclaimer('Structured learning round from your teaching claims.');
          setQuizSourceArticles(evidenceSnippets);
          setQuiz((prev) => ({ ...prev, questions: roundQuestions }));
          return;
        }
      }

      if (urlClaimJobKey) {
        await waitForClaimJob(urlClaimJobKey);
        if (isStale()) return;
      }

      const runGenerate = () => generateQuiz(
        activeTopic,
        evidenceSnippets,
        urlCount,
        prefillDifficulty,
        activeStudyRunId,
        {
          trainingStage,
          explanationDepth: effectiveExplanationDepth,
          targetNodeIds: urlTargetNodeIds,
          mode: urlMode ?? undefined,
          claimJobKey: urlClaimJobKey,
          teachingPoints: Array.isArray(quizPrefill?.teachingPoints) ? quizPrefill.teachingPoints : undefined,
          mcqAngles: Array.isArray(quizPrefill?.mcqAngles) ? quizPrefill.mcqAngles : undefined,
        }
      );

      let result;
      try {
        result = await runGenerate();
      } catch (err) {
        const canFallback =
          err instanceof QuizGenerationError
          && err.code === 'CLAIMS_REQUIRED'
          && evidenceSnippets.length > 0;
        if (!canFallback) throw err;
        result = await generateQuizFromEvidence(
          activeTopic,
          evidenceSnippets,
          prefillDifficulty,
          urlCount
        );
        if (!isStale()) {
          setAdaptiveNotice(
            'Teaching claims are not ready for this topic yet — using evidence-based questions from your search results. Run synthesis or paper synopses to unlock claim-anchored quizzes.'
          );
        }
      }

      if (isStale()) return;
      if (!result.questions.length) throw new Error('No questions were generated');
      setFromDataset(result.fromDataset);
      setDisclaimer(result.disclaimer || null);
      setQuizEvidenceAudit('evidenceAudit' in result ? (result.evidenceAudit ?? null) : null);
      setQuizSourceArticles(result.sourceArticles ?? evidenceSnippets);
      setQuiz((prev) => ({ ...prev, questions: result.questions }));
    } catch (err) {
      if (!isStale()) {
        if (err instanceof QuizGenerationError) {
          setGenError(err.message);
          setGenErrorCode(err.code);
        } else {
          setGenError(err instanceof Error ? err.message : 'Failed to generate quiz');
          setGenErrorCode(null);
        }
      }
    } finally {
      if (!isStale()) setGenerating(false);
    }
  }, [
    activeTopic,
    prefillDifficulty,
    evidenceSnippets,
    activeStudyRunId,
    trainingStage,
    effectiveExplanationDepth,
    urlTargetNodeIds,
    urlMode,
    urlClaimJobKey,
    urlRoundId,
    urlCount,
    isAuthenticated,
    quizPrefill,
  ]);

  const loadQuiz = useCallback(() => fetchQuiz(() => false), [fetchQuiz]);

  const startManualQuiz = useCallback(() => {
    const topic = manualTopic.trim();
    if (topic.length < 2) return;
    const params = new URLSearchParams({ topic, difficulty: prefillDifficulty });
    navigate(`/quiz?${params.toString()}`);
  }, [manualTopic, navigate, prefillDifficulty]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setManualTopic(activeTopic);
  }, [activeTopic]);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchQuiz(() => cancelled);
    return () => { cancelled = true; };
  }, [fetchQuiz]);

  const currentQ: QuizQuestion | undefined = quiz.questions[quiz.currentIndex];
  const isAnswered = currentQ ? quiz.answers[currentQ.id] !== undefined : false;
  const isCorrect = Boolean(currentQ && quiz.answers[currentQ.id]?.toLowerCase() === currentQ.correctAnswer.toLowerCase());

  const resolveSourceArticle = useCallback((q: QuizQuestion): QuizArticle | null => {
    const idx = q.sourceIndices?.[0];
    if (idx && idx > 0 && idx <= quizSourceArticles.length) return quizSourceArticles[idx - 1];
    return null;
  }, [quizSourceArticles]);

  const scorePercent = quiz.questions.length > 0 ? Math.round((quiz.score / quiz.questions.length) * 100) : 0;

  const saveQuizAttempt = useCallback(async (questions: QuizQuestion[], answers: Record<string, string>) => {
    setSaveStatus('saving');
    try {
      const attempts = questions.map((q) => {
        const resolvedSrc = resolveSourceArticle(q);
        const uid = resolvedSrc?.uid || q.sourceArticle || undefined;
        const attribution = uid ? lookupArticleAttribution(uid) : null;
        return {
          questionId: q.id,
          questionType: q.questionType || 'recall',
          questionText: q.question,
          userAnswer: answers[q.id] || '',
          correctAnswer: q.correctAnswer,
          isCorrect: (answers[q.id] || '').toLowerCase() === q.correctAnswer.toLowerCase(),
          sourceArticleUid: uid,
          sourceArticleTitle: resolvedSrc?.title || q.sourceArticle || undefined,
          decisionId: attribution?.decisionId,
          banditArmId: attribution?.banditArmId || undefined,
          searchId: attribution?.searchId,
          outlineNodeId: q.outlineNodeId || (q.sourceIndices?.[0] ? `src-${q.sourceIndices[0]}` : null),
          outlineLabel: q.outlineLabel ?? undefined,
          claimKey: q.claimKey ?? undefined,
          promptVariant: q.promptVariant ?? undefined,
          confidence: confidenceByQuestion[q.id] ?? answerConfidence,
        };
      });
      await api.learning.submitQuizAttempt({
        topic: activeTopic,
        studyRunId: activeStudyRunId,
        ...(curriculumTopicIdParam ? { curriculumTopicId: curriculumTopicIdParam } : {}),
        attempts,
      });
      setSaveStatus('saved');
      if (isAuthenticated) {
        const correctCount = attempts.filter((a) => a.isCorrect).length;
        api.learning.logCpdSession({
          activityType: 'quiz',
          topic: activeTopic,
          durationMinutes: Math.round(attempts.length * 2.5),
          questionCount: attempts.length,
          accuracyPct: attempts.length > 0 ? Math.round((correctCount / attempts.length) * 100) : null,
          source: 'auto',
        }).catch(() => { /* non-critical */ });
      }
      if (activeStudyRunId && isAuthenticated) {
        try {
          const { run, outline } = await api.learning.getStudyRun(activeStudyRunId);
          setStudyRun(run);
          setStudyOutline(outline);
          setStudyRunLoadFailed(false);
        } catch {
          setStudyRunLoadFailed(true);
        }
      }
      api.learning.getTopicMemory(activeTopic.trim())
        .then((r) => setTopicMemory(r.memory))
        .catch(() => {});
    } catch {
      setSaveStatus('error');
    }
  }, [
    resolveSourceArticle,
    confidenceByQuestion,
    answerConfidence,
    activeTopic,
    activeStudyRunId,
    curriculumTopicIdParam,
    isAuthenticated,
  ]);

  const handleAnswer = useCallback((answer: string) => {
    if (!currentQ || isAnswered) return;
    setSelected(answer);
    setConfidenceByQuestion((prev) => ({ ...prev, [currentQ.id]: answerConfidence }));
    const correct = answer.toLowerCase() === currentQ.correctAnswer.toLowerCase();
    setQuiz((prev) => ({
      ...prev,
      answers: { ...prev.answers, [currentQ.id]: answer },
      score: correct ? prev.score + 1 : prev.score,
      showExplanation: true,
    }));
  }, [currentQ, isAnswered, answerConfidence]);

  const handleExplanationFeedback = useCallback((feedbackType: 'confusing' | 'clear') => {
    if (!currentQ || !isAuthenticated) return;
    const qid = currentQ.id;
    if (feedbackSentIds.has(qid)) return;
    setFeedbackSentIds((prev) => new Set([...prev, qid]));
    api.learning.postQuizFeedback({
      topic: manualTopic.trim(),
      outlineNodeId: currentQ.outlineNodeId || currentQ.id,
      feedbackType,
    }).catch(() => undefined);
  }, [currentQ, isAuthenticated, feedbackSentIds, manualTopic]);

  const handleNext = useCallback(() => {
    const nextIndex = quiz.currentIndex + 1;
    if (nextIndex >= quiz.questions.length) {
      setQuiz((prev) => ({ ...prev, complete: true }));
      try {
        const weakTypes = quiz.questions
          .filter((q) => quiz.answers[q.id]?.toLowerCase() !== q.correctAnswer.toLowerCase())
          .map((q) => q.questionType || 'recall');
        sessionStorage.setItem('med_agent_session_feedback', JSON.stringify({
          topic: activeTopic,
          score: quiz.score,
          totalQuestions: quiz.questions.length,
          weakAreas: [...new Set(weakTypes)],
          timestamp: currentTimeMs(),
        }));
      } catch { /* sessionStorage unavailable */ }
      if (isAuthenticated && activeTopic) {
        void saveQuizAttempt(quiz.questions, quiz.answers);
      }
      return;
    }
    const { nextState, adaptiveNotice: notice } = advanceQuizWithAdaptiveDifficulty(quiz, currentQ, nextIndex);
    setQuiz(nextState);
    setAdaptiveNotice(notice);
    setSelected(null);
    setAnswerConfidence(3);
  }, [quiz, currentQ, activeTopic, isAuthenticated, saveQuizAttempt]);

  const saveQuizReflectionDraft = useCallback(async () => {
    if (!isAuthenticated) {
      setCurrentPage('auth');
      return;
    }
    const { uniqueWeakTypes, evidenceUsed } = buildQuizReflectionSections({
      reflectionKind,
      activeTopic,
      quizScore: quiz.score,
      questionCount: quiz.questions.length,
      scorePercent,
      questions: quiz.questions,
      answers: quiz.answers,
      workflowContext,
      evidenceSnippets,
    });
    setReflectionSaveStatus('saving');
    try {
      await api.learning.createPortfolioReflection({
        reflectionType: reflectionKind,
        sourceType: 'quiz',
        topic: activeTopic,
        whatHappened: [
          typeof workflowContext.originalPresentation === 'string' && workflowContext.originalPresentation.trim()
            ? `Original de-identified clinical question: ${workflowContext.originalPresentation}`
            : '',
          `Completed a ${quiz.questions.length}-question quiz on ${activeTopic}; score ${quiz.score}/${quiz.questions.length} (${scorePercent}%).`,
        ].filter(Boolean).join('\n\n'),
        whatILearned: uniqueWeakTypes.length > 0
          ? `Repeated weaker question types: ${uniqueWeakTypes.join(', ')}.`
          : 'No repeated weak question type was identified in this attempt.',
        whatIWillChange: 'Review incorrect explanations, revisit the source evidence, and repeat the topic with adaptive questions.',
        evidenceUsed,
        supervisorDiscussion: 'Draft saved from quiz review. Add supervisor discussion notes before portfolio submission.',
        status: 'draft',
      });
      setReflectionSaveStatus('saved');
      setTimeout(() => setReflectionSaveStatus('idle'), 2500);
    } catch {
      setReflectionSaveStatus('error');
    }
  }, [
    isAuthenticated,
    setCurrentPage,
    reflectionKind,
    activeTopic,
    quiz.score,
    quiz.questions,
    quiz.answers,
    scorePercent,
    workflowContext,
    evidenceSnippets,
  ]);

  const handleExplainDepthChange = useCallback((depth: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('explain', depth);
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const exportReflection = useCallback((format: 'doc' | 'txt') => {
    exportQuizReflection({
      reflectionKind,
      activeTopic,
      quizScore: quiz.score,
      questionCount: quiz.questions.length,
      scorePercent,
      questions: quiz.questions,
      answers: quiz.answers,
      format,
    });
  }, [reflectionKind, activeTopic, quiz.score, quiz.questions, quiz.answers, scorePercent]);

  return {
    activeTopic,
    activeStudyRunId,
    curriculumTopicIdParam,
    urlMode,
    urlTargetNodeIds,
    urlClaimJobKey,
    quizPrefill,
    workflowContext,
    lockedArticles,
    evidenceSnippets,
    fromDataset,
    trainingStage,
    topicMemory,
    effectiveExplanationDepth,
    generating,
    genError,
    genErrorCode,
    manualTopic,
    setManualTopic,
    loadQuiz,
    startManualQuiz,
    quiz,
    scorePercent,
    studyRun,
    studyOutline,
    studyRunLoadFailed,
    saveStatus,
    reflectionKind,
    reflectionSaveStatus,
    setReflectionKind,
    saveQuizReflectionDraft,
    exportReflection,
    currentQ,
    isAnswered,
    isCorrect,
    selected,
    answerConfidence,
    setAnswerConfidence,
    adaptiveNotice,
    feedbackSentIds,
    quizEvidenceAudit,
    disclaimer,
    resolveSourceArticle,
    handleAnswer,
    handleExplanationFeedback,
    handleNext,
    handleExplainDepthChange,
    isAuthenticated,
    setCurrentPage,
    navigate,
  };
}
