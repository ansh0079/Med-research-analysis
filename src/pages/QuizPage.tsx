import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useSearchContext } from '@contexts/SearchContext';
import { generateQuiz, generateQuizFromEvidence, QuizGenerationError, type QuizArticle } from '@services/quizService';
import { selectTopEvidence } from '../utils/selectTopEvidence';
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
} from '@components/learning/quizPageUtils';
import { buildQuizReflectionSections, exportQuizReflection, type ReflectionKind } from '@components/learning/quizReflectionExport';
import { QuizPageHeader, QuizSpacedRepBanner, QuizGeneratingPanel, QuizErrorPanel } from '@components/learning/QuizPageStatusPanels';
import { QuizCompletePanel } from '@components/learning/QuizCompletePanel';
import { QuizActiveQuestionPanel } from '@components/learning/QuizActiveQuestionPanel';
import { getWorkflowContext } from '@utils/workflowContext';

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

  const [quizPrefill] = useState(() => {
    try {
      const raw = sessionStorage.getItem('med_quiz_prefill');
      if (!raw) return null;
      sessionStorage.removeItem('med_quiz_prefill');
      return JSON.parse(raw);
    } catch { return null; }
  });
  const [workflowContext] = useState<Record<string, unknown>>(() => ({
    ...getWorkflowContext(),
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
    }).catch(() => undefined);
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

  const saveQuizReflectionDraft = async () => {
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
  };

  return (
    <div className="min-h-screen aurora-bg">
      <QuizPageHeader
        activeTopic={activeTopic}
        lockedArticleCount={lockedArticles.length}
        singlePaperMode={quizPrefill?.singlePaperMode}
        fromDataset={fromDataset}
        trainingStage={trainingStage}
        isAuthenticated={isAuthenticated}
        topicMemory={topicMemory}
        effectiveExplanationDepth={effectiveExplanationDepth}
        curriculumTopicId={curriculumTopicIdParam}
        workflowContext={workflowContext}
        onBack={() => setCurrentPage('search')}
        onExplainDepthChange={(depth) => {
          const next = new URLSearchParams(searchParams);
          next.set('explain', depth);
          setSearchParams(next, { replace: true });
        }}
      />

      <main className="max-w-3xl mx-auto px-4 -mt-8 pb-24">
        {urlMode === 'spaced_rep' && urlTargetNodeIds && urlTargetNodeIds.length > 0 && (
          <QuizSpacedRepBanner targetNodeCount={urlTargetNodeIds.length} />
        )}

        {generating && <QuizGeneratingPanel />}

        {genError && (
          <QuizErrorPanel
            genError={genError}
            genErrorCode={genErrorCode}
            activeTopic={activeTopic}
            manualTopic={manualTopic}
            hasEvidenceSnippets={evidenceSnippets.length > 0}
            urlClaimJobKey={urlClaimJobKey}
            onManualTopicChange={setManualTopic}
            onStartManualQuiz={startManualQuiz}
            onRetry={loadQuiz}
            onQuizFromEvidence={loadQuiz}
          />
        )}

        {!generating && !genError && quiz.complete && (
          <QuizCompletePanel
            quiz={quiz}
            scorePercent={scorePercent}
            activeStudyRunId={activeStudyRunId}
            studyRun={studyRun}
            studyOutline={studyOutline}
            studyRunLoadFailed={studyRunLoadFailed}
            isAuthenticated={isAuthenticated}
            saveStatus={saveStatus}
            reflectionKind={reflectionKind}
            reflectionSaveStatus={reflectionSaveStatus}
            resolveSourceArticle={resolveSourceArticle}
            onNewQuestions={loadQuiz}
            onBackToRun={() => navigate(`/learning/${activeStudyRunId}`)}
            onBackToSearch={() => setCurrentPage('search')}
            onContinueGapReview={() => {
              if (studyRun) {
                navigate(`/quiz?topic=${encodeURIComponent(studyRun.topic)}&difficulty=mixed&studyRunId=${studyRun.id}`);
              }
            }}
            onSignIn={() => setCurrentPage('auth')}
            onViewRunPage={() => navigate(`/learning/${activeStudyRunId}`)}
            onReflectionKindChange={setReflectionKind}
            onSaveReflectionDraft={saveQuizReflectionDraft}
            onExportReflection={(format) => exportQuizReflection({
              reflectionKind,
              activeTopic,
              quizScore: quiz.score,
              questionCount: quiz.questions.length,
              scorePercent,
              questions: quiz.questions,
              answers: quiz.answers,
              format,
            })}
          />
        )}

        {!generating && !genError && !quiz.complete && currentQ && (
          <QuizActiveQuestionPanel
            quiz={quiz}
            currentQ={currentQ}
            isAnswered={isAnswered}
            isCorrect={isCorrect}
            selected={selected}
            answerConfidence={answerConfidence}
            effectiveExplanationDepth={effectiveExplanationDepth}
            adaptiveNotice={adaptiveNotice}
            isAuthenticated={isAuthenticated}
            feedbackSentIds={feedbackSentIds}
            quizEvidenceAudit={quizEvidenceAudit}
            disclaimer={disclaimer}
            resolveSourceArticle={resolveSourceArticle}
            onAnswerConfidenceChange={setAnswerConfidence}
            onAnswer={handleAnswer}
            onExplanationFeedback={handleExplanationFeedback}
            onNext={handleNext}
          />
        )}
      </main>
    </div>
  );
};
