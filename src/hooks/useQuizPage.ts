import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useSearchContext } from '@contexts/SearchContext';
import { generateQuiz, generateQuizFromEvidence, QuizGenerationError, type QuizArticle } from '@services/quizService';
import { selectTopEvidence } from '../utils/selectTopEvidence';
import { api } from '@services/api';
import { lookupArticleAttribution } from '@utils/searchAttribution';
import { logAsyncError } from '@utils/handleAsyncError';
import { downloadText } from '@services/exportArticles';
import { useAuth } from '@contexts/AuthContext';
import type { EvidenceAuditSnapshot } from '@components/search/EvidenceAuditPanel';
import type { QuizQuestion, QuizState, StudyRun, StudyRunOutline, LearningProfile, UserTopicMemory } from '@types';
import {
  QUIZ_INITIAL_STATE,
  readWorkflowContext,
  getDifficultyFromParam,
  learningRoundItemsToQuestions,
  waitForClaimJob,
  currentTimeMs,
} from '../utils/quizPageHelpers';

export function useQuizPage() {
  const navigate = useNavigate();
  const { detectedTopic, results, setCurrentPage } = useSearchContext();
  const [searchParams, setSearchParams] = useSearchParams();
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

  const [quizPrefill] = useState(() => {
    try {
      const raw = sessionStorage.getItem('med_quiz_prefill');
      if (!raw) return null;
      sessionStorage.removeItem('med_quiz_prefill');
      return JSON.parse(raw);
    } catch { return null; }
  });
  const [workflowContext] = useState<Record<string, unknown>>(() => ({
    ...readWorkflowContext(),
    ...(quizPrefill?.workflow || {}),
  }));

  const activeTopic = urlTopic || quizPrefill?.topic || detectedTopic || '';
  const activeStudyRunId = urlStudyRunId || (Number(quizPrefill?.studyRunId || 0) || undefined);
  const prefillDifficulty = urlDifficulty || (quizPrefill?.difficulty === 'easy' || quizPrefill?.difficulty === 'medium' || quizPrefill?.difficulty === 'hard' || quizPrefill?.difficulty === 'mixed' ? quizPrefill.difficulty : 'mixed');

  const lockedArticles = useMemo<QuizArticle[]>(() => {
    if (!quizPrefill?.articles?.length) return [];
    return quizPrefill.articles
      .map((a: Record<string, unknown>) => ({
        uid: String(a.uid || ''),
        title: String(a.title || '').trim(),
        abstract: a.abstract as string | undefined,
        doi: a.doi as string | null | undefined,
        pmid: a.pmid as string | null | undefined,
        pubdate: a.pubdate as string | null | undefined,
        source: (a.source ?? a.journal) as string | null | undefined,
        pmcrefcount: a.pmcrefcount as number | undefined,
        pubtype: a.pubtype as string[] | undefined,
      }))
      .filter((a: QuizArticle) => a.title.length > 0);
  }, [quizPrefill]);

  const evidenceSnippets = useMemo<QuizArticle[]>(() => {
    if (lockedArticles.length > 0) return lockedArticles;
    return selectTopEvidence(results, 5).map((a) => ({
      uid: a.uid,
      title: a.title,
      abstract: a.abstract,
      doi: a.doi,
      pmid: a.pmid,
      pubdate: a.pubdate,
      source: a.source ?? a.journal,
      pmcrefcount: a.pmcrefcount,
      pubtype: a.pubtype,
    }));
  }, [lockedArticles, results]);

  const [quizSourceArticles, setQuizSourceArticles] = useState<QuizArticle[]>([]);
  const [quiz, setQuiz] = useState<QuizState>(QUIZ_INITIAL_STATE);
  const [generating, setGenerating] = useState(true);
  const [genError, setGenError] = useState<string | null>(null);
  const [genErrorCode, setGenErrorCode] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [answerConfidence, setAnswerConfidence] = useState(3);
  const [confidenceByQuestion, setConfidenceByQuestion] = useState<Record<string, number>>({});
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const { isAuthenticated } = useAuth();
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
  const [reflectionKind, setReflectionKind] = useState<'CBD' | 'mini-CEX' | 'DOPS'>('CBD');
  const [reflectionSaveStatus, setReflectionSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [adaptiveNotice, setAdaptiveNotice] = useState<string | null>(null);
  const [learningVelocity, setLearningVelocity] = useState<{
    fromScore: number;
    toScore: number;
    deltaPoints: number;
    pointsPerDay: number;
    trend: string;
    daysSpanned: number;
  } | null>(null);

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
      setLearningVelocity(null);
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
      if ('claimAnchorMode' in result
        && typeof result.claimAnchorMode === 'string'
        && result.claimAnchorMode.startsWith('adaptive_teaching_object')) {
        const adaptiveQs = result.questions.filter((q) => q.outlineLabel || q.claimKey);
        const sampleGap = adaptiveQs.find((q) => q.outlineLabel)?.outlineLabel;
        const count = typeof result.adaptiveClaimCount === 'number'
          ? result.adaptiveClaimCount
          : adaptiveQs.length;
        setAdaptiveNotice(
          sampleGap
            ? `Selected ${count || adaptiveQs.length} question${(count || adaptiveQs.length) === 1 ? '' : 's'} from your weak claims — e.g. “${String(sampleGap).slice(0, 100)}”.`
            : `Selected from your weak teaching claims (${count || 'adaptive'} items) so practice targets what you missed.`
        );
      }
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
    quizPrefill.mcqAngles,
    quizPrefill.teachingPoints,
  ]);

  const loadQuiz = useCallback(() => fetchQuiz(() => false), [fetchQuiz]);

  const startManualQuiz = useCallback(() => {
    const topic = manualTopic.trim();
    if (topic.length < 2) return;
    const params = new URLSearchParams({ topic, difficulty: prefillDifficulty });
    navigate(`/quiz?${params.toString()}`);
  }, [manualTopic, navigate, prefillDifficulty]);

  useEffect(() => {

    setManualTopic(activeTopic);
  }, [activeTopic]);

  useEffect(() => {
    let cancelled = false;

    fetchQuiz(() => cancelled);
    return () => { cancelled = true; };
  }, [fetchQuiz]);

  const currentQ: QuizQuestion | undefined = quiz.questions[quiz.currentIndex];
  const isAnswered = currentQ ? quiz.answers[currentQ.id] !== undefined : false;
  const isCorrect = currentQ && quiz.answers[currentQ.id]?.toLowerCase() === currentQ.correctAnswer.toLowerCase();

  const resolveSourceArticle = useCallback((q: QuizQuestion): QuizArticle | null => {
    const idx = q.sourceIndices?.[0];
    if (idx && idx > 0 && idx <= quizSourceArticles.length) return quizSourceArticles[idx - 1];
    return null;
  }, [quizSourceArticles]);

  const scorePercent = quiz.questions.length > 0 ? Math.round((quiz.score / quiz.questions.length) * 100) : 0;

  const saveQuizAttempt = async (questions: QuizQuestion[], answers: Record<string, string>) => {
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
      const submitResult = await api.learning.submitQuizAttempt({
        topic: activeTopic,
        studyRunId: activeStudyRunId,
        ...(curriculumTopicIdParam ? { curriculumTopicId: curriculumTopicIdParam } : {}),
        attempts,
      });
      setSaveStatus('saved');
      if (submitResult.learningVelocity) {
        setLearningVelocity(submitResult.learningVelocity);
        try {
          sessionStorage.setItem('med_quiz_lift', JSON.stringify({
            topic: activeTopic,
            ...submitResult.learningVelocity,
            sessionScore: attempts.length
              ? Math.round((attempts.filter((a) => a.isCorrect).length / attempts.length) * 100)
              : null,
            timestamp: Date.now(),
          }));
        } catch { /* sessionStorage unavailable */ }
      }
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
  };

  const handleAnswer = (answer: string) => {
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
  };

  const handleExplanationFeedback = useCallback((feedbackType: 'confusing' | 'clear') => {
    if (!currentQ || !isAuthenticated) return;
    const qid = currentQ.id;
    if (feedbackSentIds.has(qid)) return;
    setFeedbackSentIds((prev) => new Set([...prev, qid]));
    api.learning.postQuizFeedback({
      topic: manualTopic.trim(),
      outlineNodeId: currentQ.outlineNodeId || currentQ.id,
      feedbackType,
    }).catch((err) => logAsyncError(err, 'useQuizPage/postQuizFeedback'));
  }, [currentQ, isAuthenticated, feedbackSentIds, manualTopic]);

  const handleNext = () => {
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
        saveQuizAttempt(quiz.questions, quiz.answers);
      }
    } else {
      let nextAdaptiveNotice: string | null = null;
      setQuiz((prev) => {
        if (!currentQ) return { ...prev, currentIndex: nextIndex, showExplanation: false };
        const recentAnswered = prev.questions
          .slice(0, prev.currentIndex + 1)
          .filter((q) => prev.answers[q.id] !== undefined);
        const lastThree = recentAnswered.slice(-3);
        const lastTwo = recentAnswered.slice(-2);
        const easyCorrectStreak = lastThree.length === 3
          && lastThree.every((q) => q.difficulty === 'easy' && prev.answers[q.id]?.toLowerCase() === q.correctAnswer.toLowerCase());
        const hardWrongStreak = lastTwo.length === 2
          && lastTwo.every((q) => q.difficulty === 'hard' && prev.answers[q.id]?.toLowerCase() !== q.correctAnswer.toLowerCase());
        const desired = easyCorrectStreak ? 'hard' : hardWrongStreak ? 'medium' : null;
        if (!desired) return { ...prev, currentIndex: nextIndex, showExplanation: false };
        const swapIndex = prev.questions.findIndex((q, index) => index >= nextIndex && q.difficulty === desired);
        if (swapIndex <= nextIndex) return { ...prev, currentIndex: nextIndex, showExplanation: false };
        const questions = [...prev.questions];
        [questions[nextIndex], questions[swapIndex]] = [questions[swapIndex], questions[nextIndex]];
        nextAdaptiveNotice = desired === 'hard'
          ? 'Difficulty escalated after three easy correct answers.'
          : 'Difficulty eased after two hard misses.';
        return { ...prev, questions, currentIndex: nextIndex, showExplanation: false };
      });
      setAdaptiveNotice(nextAdaptiveNotice);
      setSelected(null);
      setAnswerConfidence(3);
    }
  };

  const buildQuizReflectionSections = () => {
    const kind = reflectionKind;
    const stamp = new Date().toISOString().split('T')[0];
    const weakTypes = quiz.questions
      .filter((q) => quiz.answers[q.id]?.toLowerCase() !== q.correctAnswer.toLowerCase())
      .map((q) => q.questionType || 'recall');
    const uniqueWeakTypes = [...new Set(weakTypes)];
    const evidenceTitles = evidenceSnippets
      .map((s: { title?: string }) => s.title)
      .filter(Boolean)
      .slice(0, 5) as string[];
    const sections = [
      ['WBA / portfolio type', kind === 'CBD' ? 'Case-based Discussion (CBD)' : kind === 'mini-CEX' ? 'Mini Clinical Evaluation Exercise (mini-CEX)' : 'Direct Observation of Procedural Skills (DOPS)'],
      ['Generated', stamp],
      ['Topic', activeTopic],
      ['Original clinical question', typeof workflowContext.originalPresentation === 'string' && workflowContext.originalPresentation.trim() ? workflowContext.originalPresentation : 'Not captured. Add the de-identified presentation before submission.'],
      ['Learning journey', typeof workflowContext.source === 'string' ? `Started from ${workflowContext.source}.` : 'Started from evidence search.'],
      ['Quiz performance', `${quiz.score}/${quiz.questions.length} correct (${scorePercent}%)`],
      ['Questions attempted', String(quiz.questions.length)],
      ['Areas for improvement', uniqueWeakTypes.length > 0 ? uniqueWeakTypes.join(', ') : 'None identified - strong overall performance.'],
      ['Evidence used', evidenceTitles.length > 0 ? evidenceTitles.join('\n') : 'Current topic evidence and generated quiz explanations.'],
      ['Reflection notes', 'Use this quiz result to structure a discussion on clinical reasoning, evidence appraisal, and specific learning actions.'],
    ] as Array<[string, string]>;
    return {
      kind,
      stamp,
      sections,
      uniqueWeakTypes,
      evidenceUsed: evidenceTitles.length > 0
        ? evidenceTitles.map((title: string, index: number) => `${index + 1}. ${title}`).join('\n')
        : 'Quiz questions generated from the current topic evidence.',
    };
  };

  const exportQuizReflection = (format: 'doc' | 'txt') => {
    const kind = reflectionKind;
    const stamp = new Date().toISOString().split('T')[0];
    const safeKind = kind.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const weakTypes = quiz.questions
      .filter((q) => quiz.answers[q.id]?.toLowerCase() !== q.correctAnswer.toLowerCase())
      .map((q) => q.questionType || 'recall');
    const uniqueWeakTypes = [...new Set(weakTypes)];
    const sections = [
      ['WBA / portfolio type', kind === 'CBD' ? 'Case-based Discussion (CBD)' : kind === 'mini-CEX' ? 'Mini Clinical Evaluation Exercise (mini-CEX)' : 'Direct Observation of Procedural Skills (DOPS)'],
      ['Generated', stamp],
      ['Topic', activeTopic],
      ['Quiz performance', `${quiz.score}/${quiz.questions.length} correct (${scorePercent}%)`],
      ['Questions attempted', String(quiz.questions.length)],
      ['Areas for improvement', uniqueWeakTypes.length > 0 ? uniqueWeakTypes.join(', ') : 'None identified — strong overall performance.'],
      ['Reflection notes', 'Use this quiz result to structure a discussion on clinical reasoning, evidence appraisal, and specific learning actions.'],
    ] as Array<[string, string]>;
    if (format === 'txt') {
      const text = sections.map(([title, body]) => `${title}\n${body}`).join('\n\n');
      downloadText(`portfolio_reflection_${safeKind}_${stamp}.txt`, text);
      return;
    }
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${kind} Reflection</title>
      <style>body{font-family:Arial,sans-serif;line-height:1.45;color:#111827;max-width:820px;margin:32px auto;padding:0 24px}h1{font-size:24px}h2{font-size:15px;margin-top:20px;border-bottom:1px solid #e5e7eb;padding-bottom:4px}p{font-size:13px;white-space:pre-wrap}</style>
    </head><body>
      <h1>${kind} Reflection</h1>
      ${sections.map(([title, body]) => `<h2>${title}</h2><p>${body}</p>`).join('\n')}
    </body></html>`;
    downloadText(`portfolio_reflection_${safeKind}_${stamp}.doc`, html, 'application/msword');
  };

  const saveQuizReflectionDraft = async () => {
    if (!isAuthenticated) {
      setCurrentPage('auth');
      return;
    }
    const { kind, uniqueWeakTypes, evidenceUsed } = buildQuizReflectionSections();
    setReflectionSaveStatus('saving');
    try {
      await api.learning.createPortfolioReflection({
        reflectionType: kind,
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
  };

  return {
    searchParams,
    setSearchParams,
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
    quiz,
    generating,
    genError,
    genErrorCode,
    selected,
    answerConfidence,
    saveStatus,
    isAuthenticated,
    fromDataset,
    disclaimer,
    quizEvidenceAudit,
    studyRun,
    studyOutline,
    feedbackSentIds,
    studyRunLoadFailed,
    manualTopic,
    topicMemory,
    reflectionKind,
    reflectionSaveStatus,
    adaptiveNotice,
    learningVelocity,
    effectiveExplanationDepth,
    trainingStage,
    currentQ,
    isAnswered,
    isCorrect,
    scorePercent,
    resolveSourceArticle,
    setManualTopic,
    setAnswerConfidence,
    setReflectionKind,
    loadQuiz,
    startManualQuiz,
    handleAnswer,
    handleExplanationFeedback,
    handleNext,
    exportQuizReflection,
    saveQuizReflectionDraft,
    setCurrentPage,
    navigate,
  };
}
