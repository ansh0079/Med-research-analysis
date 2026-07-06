import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useSearchContext } from '@contexts/SearchContext';
import { generateQuiz, generateQuizFromEvidence, QuizGenerationError, type QuizArticle } from '@services/quizService';
import { selectTopEvidence } from '../utils/selectTopEvidence';
import { api } from '@services/api';
import { lookupArticleAttribution } from '@utils/searchAttribution';
import { downloadText } from '@services/exportArticles';
import { useAuth } from '@contexts/AuthContext';
import { EvidenceAuditPanel, type EvidenceAuditSnapshot } from '@components/search/EvidenceAuditPanel';
import type { QuizQuestion, QuizState, StudyRun, StudyRunOutline, LearningProfile, UserTopicMemory } from '@types';
import {
  MemoryDetailBadge,
} from '@components/quiz/QuizQuestionParts';
import { QuizCompletionPanel } from '@components/quiz/QuizCompletionPanel';
import { QuizGenerationStatePanel } from '@components/quiz/QuizGenerationStatePanel';
import { QuizQuestionPanel } from '@components/quiz/QuizQuestionPanel';
import {
  INITIAL_STATE,
  buildQuizReflectionSections,
  currentTimeMs,
  getDifficultyFromParam,
  learningRoundItemsToQuestions,
  readWorkflowContext,
  waitForClaimJob,
} from '@components/quiz/QuizPageUtils';

export const QuizPage: React.FC = () => {
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

  // Support legacy sessionStorage prefill as fallback
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
  // Full article objects preserved from search — used to resolve sourceIndices back to real papers
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

  // Full source articles indexed by 1-based sourceIndex — resolves quiz question sourceIndices
  const [quizSourceArticles, setQuizSourceArticles] = useState<QuizArticle[]>([]);

  const [quiz, setQuiz] = useState<QuizState>(INITIAL_STATE);
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

  const effectiveExplanationDepth = useMemo(() => {
    if (explainParam === 'foundation' || explainParam === 'exam_focus' || explainParam === 'mechanistic') return explainParam;
    if (learningProfile?.defaultExplanationDepth) return learningProfile.defaultExplanationDepth;
    return 'exam_focus';
  }, [explainParam, learningProfile]);

  const trainingStage = (learningProfile?.trainingStage || 'finals') as NonNullable<LearningProfile['trainingStage']>;
  const prefillTeachingPoints = Array.isArray(quizPrefill?.teachingPoints) ? quizPrefill.teachingPoints : undefined;
  const prefillMcqAngles = Array.isArray(quizPrefill?.mcqAngles) ? quizPrefill.mcqAngles : undefined;

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
      setQuiz(INITIAL_STATE);
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
          teachingPoints: prefillTeachingPoints,
          mcqAngles: prefillMcqAngles,
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
    prefillTeachingPoints,
    prefillMcqAngles,
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
  const isCorrect = currentQ && quiz.answers[currentQ.id]?.toLowerCase() === currentQ.correctAnswer.toLowerCase();

  /** Resolve the primary source article for a question using its sourceIndices (1-based). */
  const resolveSourceArticle = useCallback((q: QuizQuestion): QuizArticle | null => {
    const idx = q.sourceIndices?.[0];
    if (idx && idx > 0 && idx <= quizSourceArticles.length) return quizSourceArticles[idx - 1];
    return null;
  }, [quizSourceArticles]);
  const scorePercent = quiz.questions.length > 0 ? Math.round((quiz.score / quiz.questions.length) * 100) : 0;

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
    }).catch(() => undefined);
  }, [currentQ, isAuthenticated, feedbackSentIds, manualTopic]);

  const handleNext = () => {
    const nextIndex = quiz.currentIndex + 1;
    if (nextIndex >= quiz.questions.length) {
      setQuiz((prev) => ({ ...prev, complete: true }));
      // Store session feedback for the agent chat — if the score is poor,
      // the agent will adapt its teaching approach next time.
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
      // Auto-save quiz attempt for authenticated users
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
      await api.learning.submitQuizAttempt({
        topic: activeTopic,
        studyRunId: activeStudyRunId,
        ...(curriculumTopicIdParam ? { curriculumTopicId: curriculumTopicIdParam } : {}),
        attempts,
      });
      setSaveStatus('saved');
      // Fire-and-forget CPD log — non-critical
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
      // Refresh run data so gap report reflects the attempts we just saved
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

  const getQuizReflection = () => buildQuizReflectionSections({
    reflectionKind,
    quiz,
    evidenceSnippets,
    activeTopic,
    workflowContext,
    scorePercent,
  });

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
    const { kind, uniqueWeakTypes, evidenceUsed } = getQuizReflection();
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

  return (
    <div className="min-h-screen aurora-bg">
      <header className="w-full pt-[calc(var(--nav-h)+1.5rem)] pb-16 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/5 to-purple-600/5 -z-10" />
        <div className="max-w-3xl mx-auto">
          <button type="button" onClick={() => setCurrentPage('search')}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-900 dark:hover:text-white text-sm font-medium transition-colors mb-8">
            <i className="fas fa-arrow-left" /> Back to results
          </button>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200 dark:shadow-indigo-900/40">
              <i className="fas fa-brain text-white text-xl" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white">Test yourself</h1>
              <p className="text-sm text-indigo-500 font-semibold capitalize">{activeTopic}</p>
              {lockedArticles.length === 1 && quizPrefill?.singlePaperMode && (
                <span className="mt-1 inline-block text-[10px] font-bold uppercase tracking-widest text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20 px-2 py-0.5 rounded-full">
                  <i className="fas fa-file-medical mr-1" />
                  Questions grounded in this paper only
                </span>
              )}
              {lockedArticles.length > 1 && (
                <span className="mt-1 inline-block text-[10px] font-bold uppercase tracking-widest text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20 px-2 py-0.5 rounded-full">
                  <i className="fas fa-layer-group mr-1" />
                  Grounded in top {lockedArticles.length} evidence papers from your search
                </span>
              )}
              {fromDataset && (
                <span className="mt-1 inline-block text-[10px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full">
                  General medical questions · MedMCQA dataset
                </span>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Training: {String(trainingStage).replace(/_/g, ' ')}
                </span>
                {isAuthenticated && topicMemory && topicMemory.searchCount + topicMemory.topPaperCount + topicMemory.savedPaperCount > 0 && (
                  <MemoryDetailBadge memory={topicMemory} />
                )}
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                  Explain
                  <select
                    value={effectiveExplanationDepth}
                    onChange={(e) => {
                      const v = e.target.value;
                      const next = new URLSearchParams(searchParams);
                      next.set('explain', v);
                      setSearchParams(next, { replace: true });
                    }}
                    className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-2 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-200"
                  >
                    <option value="foundation">First principles</option>
                    <option value="exam_focus">Exam focus</option>
                    <option value="mechanistic">Mechanistic</option>
                  </select>
                </label>
                {curriculumTopicIdParam ? (
                  <span className="text-[10px] font-bold uppercase tracking-widest text-rose-500">
                    Study path topic
                  </span>
                ) : null}
              </div>
              {typeof workflowContext.originalPresentation === 'string' && workflowContext.originalPresentation.trim() && (
                <div className="mt-3 max-w-2xl rounded-xl border border-cyan-200 bg-cyan-50/80 px-3 py-2 text-xs text-cyan-950/80 dark:border-cyan-900/60 dark:bg-cyan-950/20 dark:text-cyan-100/80">
                  <span className="font-bold uppercase tracking-widest text-cyan-700 dark:text-cyan-300">Shift context: </span>
                  {workflowContext.originalPresentation}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 -mt-8 pb-24">
        {urlMode === 'spaced_rep' && urlTargetNodeIds && urlTargetNodeIds.length > 0 && (
          <div className="mb-4 rounded-xl border border-violet-200 dark:border-violet-700/40 bg-violet-50 dark:bg-violet-950/20 px-4 py-3 flex items-center gap-3">
            <i className="fas fa-rotate text-violet-500 dark:text-violet-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-bold text-violet-800 dark:text-violet-200">Spaced repetition session</p>
              <p className="text-xs text-violet-600 dark:text-violet-400 mt-0.5">
                Targeting {urlTargetNodeIds.length} concept{urlTargetNodeIds.length === 1 ? '' : 's'} due for review.
                Completing this session will reschedule them.
              </p>
            </div>
          </div>
        )}
        <QuizGenerationStatePanel
          generating={generating}
          genError={genError}
          genErrorCode={genErrorCode}
          hasEvidenceSnippets={evidenceSnippets.length > 0}
          hasClaimJobKey={Boolean(urlClaimJobKey)}
          activeTopic={activeTopic}
          manualTopic={manualTopic}
          onManualTopicChange={setManualTopic}
          onManualStart={startManualQuiz}
          onLoadQuiz={loadQuiz}
        />

        {!generating && !genError && quiz.complete && (
          <QuizCompletionPanel
            quiz={quiz}
            scorePercent={scorePercent}
            isAuthenticated={isAuthenticated}
            saveStatus={saveStatus}
            activeStudyRunId={activeStudyRunId}
            studyRun={studyRun}
            studyOutline={studyOutline}
            studyRunLoadFailed={studyRunLoadFailed}
            reflectionKind={reflectionKind}
            reflectionSaveStatus={reflectionSaveStatus}
            resolveSourceArticle={resolveSourceArticle}
            onNewQuestions={loadQuiz}
            onBackToRun={(runId) => navigate(`/learning/${runId}`)}
            onBackToPapers={() => setCurrentPage('search')}
            onSignIn={() => setCurrentPage('auth')}
            onContinueStudyRun={(run) => navigate(`/quiz?topic=${encodeURIComponent(run.topic)}&difficulty=mixed&studyRunId=${run.id}`)}
            onViewRun={(runId) => navigate(`/learning/${runId}`)}
            onReflectionKindChange={setReflectionKind}
            onSaveReflectionDraft={() => { void saveQuizReflectionDraft(); }}
            onExportReflection={exportQuizReflection}
          />
        )}

        {!generating && !genError && !quiz.complete && currentQ && (
          <>
            <QuizQuestionPanel
              currentQ={currentQ}
              currentIndex={quiz.currentIndex}
              questionCount={quiz.questions.length}
              score={quiz.score}
              isAnswered={isAnswered}
              isCorrect={isCorrect}
              selected={selected}
              answerConfidence={answerConfidence}
              adaptiveNotice={adaptiveNotice}
              effectiveExplanationDepth={effectiveExplanationDepth}
              isAuthenticated={isAuthenticated}
              feedbackSent={feedbackSentIds.has(currentQ.id)}
              sourceArticle={resolveSourceArticle(currentQ)}
              onAnswer={handleAnswer}
              onConfidenceChange={setAnswerConfidence}
              onExplanationFeedback={handleExplanationFeedback}
              onNext={handleNext}
            />

            {quizEvidenceAudit && (
              <EvidenceAuditPanel snapshot={quizEvidenceAudit} className="mt-4" />
            )}

            {disclaimer && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-300">
                <i className="fas fa-triangle-exclamation mr-2" />
                {disclaimer}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};
