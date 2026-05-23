import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useSearchContext } from '@contexts/SearchContext';
import { generateQuiz, type QuizArticle } from '@services/quizService';
import { selectTopEvidence } from '../utils/selectTopEvidence';
import { api } from '@services/api';
import { downloadText } from '@services/exportArticles';
import { useAuth } from '@contexts/AuthContext';
import { StudyRunPanel } from '@components/learning/StudyRunPanel';
import { EvidenceAuditPanel, type EvidenceAuditSnapshot } from '@components/search/EvidenceAuditPanel';
import type { QuizQuestion, QuizState, QuestionType, StudyRun, StudyRunOutline, LearningProfile, UserTopicMemory } from '@types';
import { VerificationBadge } from '@components/ui/VerificationBadge';

const WORKFLOW_CONTEXT_KEY = 'med_shift_workflow';

function readWorkflowContext() {
  try {
    return JSON.parse(sessionStorage.getItem(WORKFLOW_CONTEXT_KEY) || '{}') as Record<string, unknown>;
  } catch {
    return {};
  }
}

function MemoryDetailBadge({ memory }: { memory: UserTopicMemory }) {
  const [open, setOpen] = useState(false);
  const tierLabel = memory.memoryTier === 'strong' ? 'strong' : memory.memoryTier === 'building' ? 'building' : 'sparse';
  const tierCls =
    memory.memoryTier === 'strong'
      ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/25'
      : memory.memoryTier === 'building'
        ? 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/25'
        : 'text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80';

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${tierCls}`}
        title="Click for topic memory details"
      >
        Topic memory: {tierLabel} <i className={`fas fa-chevron-${open ? 'up' : 'down'} text-[8px] ml-0.5`} />
      </button>
      {open && (
        <div className="absolute z-20 mt-1.5 left-0 w-56 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg p-3 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Memory breakdown</p>
          <div className="flex justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400">Searches</span>
            <span className="font-semibold text-slate-700 dark:text-slate-200">{memory.searchCount}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400">Tracked papers</span>
            <span className="font-semibold text-slate-700 dark:text-slate-200">{memory.topPaperCount}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400">Saved papers</span>
            <span className="font-semibold text-slate-700 dark:text-slate-200">{memory.savedPaperCount}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400">Weak nodes</span>
            <span className="font-semibold text-slate-700 dark:text-slate-200">{memory.weakOutlineNodeIds.length}</span>
          </div>
          <div className="flex justify-between text-xs border-t border-slate-100 dark:border-slate-700 pt-1.5">
            <span className="text-slate-500 dark:text-slate-400">Memory score</span>
            <span className="font-semibold text-slate-700 dark:text-slate-200">{Math.round(memory.memoryScore * 100)}%</span>
          </div>
        </div>
      )}
    </div>
  );
}

const INITIAL_STATE: QuizState = {
  questions: [],
  currentIndex: 0,
  answers: {},
  showExplanation: false,
  score: 0,
  complete: false,
};

function parseSourceLabel(text: string): { text: string; label: string | null } {
  const match = text.match(/\s*\[(Trial|Guideline|Topic memory)\]$/i);
  if (match) {
    return { text: text.slice(0, match.index).trim(), label: match[1] };
  }
  return { text, label: null };
}

function SourceBadge({ label }: { label: string }) {
  const config: Record<string, { cls: string; icon: string }> = {
    Trial: { cls: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300', icon: 'fa-flask' },
    Guideline: { cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300', icon: 'fa-book-medical' },
    'Topic memory': { cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300', icon: 'fa-memory' },
  };
  const c = config[label] || { cls: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400', icon: 'fa-question-circle' };
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${c.cls}`}>
      <i className={`fas ${c.icon} text-[9px]`} />
      {label}
    </span>
  );
}

function getDifficultyFromParam(value: string | null): 'easy' | 'medium' | 'hard' | 'mixed' {
  if (value === 'easy' || value === 'medium' || value === 'hard' || value === 'mixed') return value;
  return 'mixed';
}

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  hard: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const QTYPE_CONFIG: Record<QuestionType, { label: string; icon: string; cls: string }> = {
  recall:               { label: 'Recall',               icon: 'fa-brain',          cls: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' },
  clinical_application: { label: 'Clinical Application', icon: 'fa-stethoscope',    cls: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' },
  trial_interpretation: { label: 'Trial Interpretation', icon: 'fa-flask',          cls: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300' },
  guideline:            { label: 'Guideline',            icon: 'fa-book-medical',   cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  pitfall:              { label: 'Pitfall / Misconception', icon: 'fa-exclamation-triangle', cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
};

function QuestionTypeBadge({ type }: { type?: QuestionType }) {
  if (!type) return null;
  const cfg = QTYPE_CONFIG[type];
  if (!cfg) return null;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg ${cfg.cls}`}>
      <i className={`fas ${cfg.icon} text-[9px]`} />
      {cfg.label}
    </span>
  );
}

function OptionButton({
  opt, letter: _letter, isAnswered, isCorrectLetter, isSelected, onClick,
}: {
  opt: string; letter: string; isAnswered: boolean;
  isCorrectLetter: boolean; isSelected: boolean; onClick: () => void;
}) {
  let cls = 'w-full text-left px-4 py-3 rounded-xl border-2 font-medium text-sm transition-all duration-150 ';
  if (!isAnswered) {
    cls += 'border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20';
  } else if (isCorrectLetter) {
    cls += 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300';
  } else if (isSelected) {
    cls += 'border-red-400 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300';
  } else {
    cls += 'border-slate-100 dark:border-slate-700 text-slate-400 dark:text-slate-500';
  }
  return (
    <button className={cls} disabled={isAnswered} onClick={onClick} type="button">
      <span className="flex items-center gap-3">
        {isAnswered && isCorrectLetter && <i className="fas fa-check-circle text-emerald-500 shrink-0" />}
        {isAnswered && isSelected && !isCorrectLetter && <i className="fas fa-times-circle text-red-500 shrink-0" />}
        {isAnswered && !isCorrectLetter && !isSelected && <i className="fas fa-circle text-slate-200 dark:text-slate-700 shrink-0 text-[10px]" />}
        {opt}
      </span>
    </button>
  );
}

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

  const effectiveExplanationDepth = useMemo(() => {
    if (explainParam === 'foundation' || explainParam === 'exam_focus' || explainParam === 'mechanistic') return explainParam;
    if (learningProfile?.defaultExplanationDepth) return learningProfile.defaultExplanationDepth;
    return 'exam_focus';
  }, [explainParam, learningProfile]);

  const trainingStage = (learningProfile?.trainingStage || 'finals') as NonNullable<LearningProfile['trainingStage']>;

  useEffect(() => {
    if (!isAuthenticated) return;
    api.getLearningProfile().then((r) => setLearningProfile(r.profile)).catch(() => {});
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || !activeTopic || activeTopic.trim().length < 2) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTopicMemory(null);
      return;
    }
    let cancelled = false;
    api.getTopicMemory(activeTopic.trim())
      .then((r) => { if (!cancelled) setTopicMemory(r.memory); })
      .catch(() => { if (!cancelled) setTopicMemory(null); });
    return () => { cancelled = true; };
  }, [isAuthenticated, activeTopic]);

  const fetchQuiz = useCallback(async (isStale: () => boolean) => {
    if (!activeTopic || activeTopic.trim().length < 2) {
      if (!isStale()) {
        setGenError('No research topic detected. Search for a topic first, then open Test yourself.');
        setGenerating(false);
      }
      return;
    }
    if (!isStale()) {
      setGenerating(true);
      setGenError(null);
      setQuiz(INITIAL_STATE);
      setSelected(null);
      setQuizEvidenceAudit(null);
    }
    try {
      const {
        questions,
        fromDataset: fd,
        disclaimer: aiDisclaimer,
        sourceArticles,
        evidenceAudit,
      } = await generateQuiz(
        activeTopic,
        evidenceSnippets,
        5,
        prefillDifficulty,
        activeStudyRunId,
        {
          trainingStage,
          explanationDepth: effectiveExplanationDepth,
          targetNodeIds: urlTargetNodeIds,
          mode: urlMode ?? undefined,
          claimJobKey: urlClaimJobKey,
        }
      );
      if (isStale()) return;
      if (!questions.length) throw new Error('No questions were generated');
      setFromDataset(fd);
      setDisclaimer(aiDisclaimer || null);
      setQuizEvidenceAudit(evidenceAudit ?? null);
      setQuizSourceArticles(sourceArticles ?? evidenceSnippets);
      setQuiz((prev) => ({ ...prev, questions }));
    } catch (err) {
      if (!isStale()) setGenError(err instanceof Error ? err.message : 'Failed to generate quiz');
    } finally {
      if (!isStale()) setGenerating(false);
    }
  }, [activeTopic, prefillDifficulty, evidenceSnippets, activeStudyRunId, trainingStage, effectiveExplanationDepth, urlTargetNodeIds, urlMode, urlClaimJobKey]);

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
    api.postQuizFeedback({
      topic: manualTopic.trim(),
      outlineNodeId: currentQ.outlineNodeId || currentQ.id,
      feedbackType,
    }).catch(() => undefined);
  }, [currentQ, isAuthenticated, feedbackSentIds, manualTopic]);

  const handleNext = () => {
    const nextIndex = quiz.currentIndex + 1;
    if (nextIndex >= quiz.questions.length) {
      setQuiz((prev) => ({ ...prev, complete: true }));
      // Auto-save quiz attempt for authenticated users
      if (isAuthenticated && activeTopic) {
        saveQuizAttempt(quiz.questions, quiz.answers);
      }
    } else {
      setQuiz((prev) => ({ ...prev, currentIndex: nextIndex, showExplanation: false }));
      setSelected(null);
      setAnswerConfidence(3);
    }
  };

  const saveQuizAttempt = async (questions: QuizQuestion[], answers: Record<string, string>) => {
    setSaveStatus('saving');
    try {
      const attempts = questions.map((q) => {
        const resolvedSrc = resolveSourceArticle(q);
        return {
          questionId: q.id,
          questionType: q.questionType || 'recall',
          questionText: q.question,
          userAnswer: answers[q.id] || '',
          correctAnswer: q.correctAnswer,
          isCorrect: (answers[q.id] || '').toLowerCase() === q.correctAnswer.toLowerCase(),
          // Prefer the resolved uid from the actual article; fall back to title string
          sourceArticleUid: resolvedSrc?.uid || q.sourceArticle || undefined,
          sourceArticleTitle: resolvedSrc?.title || q.sourceArticle || undefined,
          outlineNodeId: q.outlineNodeId || (q.sourceIndices?.[0] ? `src-${q.sourceIndices[0]}` : null),
          outlineLabel: q.outlineLabel ?? undefined,
          claimKey: q.claimKey ?? undefined,
          confidence: confidenceByQuestion[q.id] ?? answerConfidence,
        };
      });
      await api.submitQuizAttempt({
        topic: activeTopic,
        studyRunId: activeStudyRunId,
        ...(curriculumTopicIdParam ? { curriculumTopicId: curriculumTopicIdParam } : {}),
        attempts,
      });
      setSaveStatus('saved');
      // Fire-and-forget CPD log — non-critical
      if (isAuthenticated) {
        const correctCount = attempts.filter((a) => a.isCorrect).length;
        api.logCpdSession({
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
          const { run, outline } = await api.getStudyRun(activeStudyRunId);
          setStudyRun(run);
          setStudyOutline(outline);
          setStudyRunLoadFailed(false);
        } catch {
          setStudyRunLoadFailed(true);
        }
      }
      api.getTopicMemory(activeTopic.trim())
        .then((r) => setTopicMemory(r.memory))
        .catch(() => {});
    } catch {
      setSaveStatus('error');
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
      await api.createPortfolioReflection({
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
        {generating && (
          <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 p-12 text-center shadow-sm">
            <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-500 dark:text-slate-400 font-medium">Generating questions from your research…</p>
            <p className="text-xs text-slate-400 mt-1">Includes recall, clinical application, and trial interpretation questions</p>
          </div>
        )}

        {genError && (
          <div className="rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-8 text-center">
            <i className="fas fa-exclamation-circle text-3xl text-red-500 mb-3 block" />
            <p className="text-red-700 dark:text-red-300 font-medium mb-4">{genError}</p>
            {(!activeTopic || activeTopic.trim().length < 2) ? (
              <div className="mx-auto max-w-md">
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    value={manualTopic}
                    onChange={(e) => setManualTopic(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') startManualQuiz(); }}
                    placeholder="Enter a topic, e.g. sepsis"
                    className="flex-1 rounded-xl border border-red-200 dark:border-red-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-red-400"
                  />
                  <button
                    type="button"
                    disabled={manualTopic.trim().length < 2}
                    onClick={startManualQuiz}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-bold text-sm transition-colors"
                  >
                    Start quiz
                  </button>
                </div>
                <p className="mt-3 text-xs text-red-500 dark:text-red-300">
                  You can quiz a topic directly; linked study runs add outline gap tracking when available.
                </p>
              </div>
            ) : (
              <button type="button" onClick={loadQuiz}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-sm transition-colors">
                Try again
              </button>
            )}
          </div>
        )}

        {!generating && !genError && quiz.complete && (
          <div className="space-y-4">
            {/* Score card — always first */}
            <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 p-8 text-center shadow-sm">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl ${
                scorePercent >= 70 ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
              }`}>
                <i className={`fas fa-${scorePercent >= 70 ? 'trophy' : 'chart-bar'}`} />
              </div>
              <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2">{quiz.score}/{quiz.questions.length}</h2>
              <p className="text-lg text-slate-500 dark:text-slate-400 mb-1">{scorePercent}% correct</p>
              <p className="text-sm text-slate-400 dark:text-slate-500 mb-6">
                {scorePercent >= 80 ? 'Excellent — strong knowledge of this topic.' : scorePercent >= 60 ? 'Good effort — review explanations to solidify understanding.' : 'Keep studying — review source articles and try again.'}
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <button type="button" onClick={loadQuiz}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm transition-colors">
                  <i className="fas fa-redo mr-2" /> New questions
                </button>
                {activeStudyRunId ? (
                  <button type="button" onClick={() => navigate(`/learning/${activeStudyRunId}`)}
                    className="px-5 py-2.5 border-2 border-indigo-200 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl font-bold text-sm transition-colors">
                    <i className="fas fa-map mr-2" /> Back to run
                  </button>
                ) : (
                  <button type="button" onClick={() => setCurrentPage('search')}
                    className="px-5 py-2.5 border-2 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl font-bold text-sm transition-colors">
                    <i className="fas fa-search mr-2" /> Back to papers
                  </button>
                )}
              </div>
              {isAuthenticated && saveStatus !== 'idle' && (
                <div className="mt-4">
                  {saveStatus === 'saving' && (
                    <span className="text-xs text-slate-400"><i className="fas fa-spinner fa-spin mr-1" /> Saving progress...</span>
                  )}
                  {saveStatus === 'saved' && (
                    <span className="text-xs text-emerald-600 font-semibold"><i className="fas fa-check mr-1" /> Progress saved</span>
                  )}
                  {saveStatus === 'error' && (
                    <span className="text-xs text-red-500"><i className="fas fa-exclamation-triangle mr-1" /> Failed to save progress</span>
                  )}
                </div>
              )}
              {!isAuthenticated && (
                <div className="mt-4">
                  <span className="text-xs text-slate-400">
                    <i className="fas fa-info-circle mr-1" />
                    <button type="button" onClick={() => setCurrentPage('auth')} className="underline hover:text-indigo-600">Sign in</button> to track your progress
                  </span>
                </div>
              )}
            </div>

            {/* Re-read panel — papers the doctor missed questions from */}
            {(() => {
              const missedPapers = new Map<string, { article: QuizArticle; missCount: number; questionTypes: string[] }>();
              quiz.questions.forEach((q) => {
                const wrong = (quiz.answers[q.id] || '').toLowerCase() !== q.correctAnswer.toLowerCase();
                if (!wrong) return;
                const src = resolveSourceArticle(q);
                if (!src) return;
                const key = src.uid || src.title;
                const existing = missedPapers.get(key);
                if (existing) {
                  existing.missCount += 1;
                  if (q.questionType && !existing.questionTypes.includes(q.questionType)) existing.questionTypes.push(q.questionType);
                } else {
                  missedPapers.set(key, { article: src, missCount: 1, questionTypes: q.questionType ? [q.questionType] : [] });
                }
              });
              if (missedPapers.size === 0) return null;
              const entries = [...missedPapers.values()].sort((a, b) => b.missCount - a.missCount);
              return (
                <div className="rounded-2xl bg-white dark:bg-slate-800 border border-red-100 dark:border-red-900/30 p-6 shadow-sm">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-1 flex items-center gap-2">
                    <i className="fas fa-book-open text-red-500" />
                    Review these papers before your next session
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                    You missed {quiz.questions.length - quiz.score} question{quiz.questions.length - quiz.score === 1 ? '' : 's'} grounded in the following evidence.
                  </p>
                  <div className="space-y-3">
                    {entries.map(({ article, missCount, questionTypes }) => {
                      const year = article.pubdate?.slice(0, 4) ?? null;
                      const journal = article.source ?? article.journal ?? null;
                      const pubmedUrl = article.pmid ? `https://pubmed.ncbi.nlm.nih.gov/${article.pmid}/` : article.doi ? `https://doi.org/${article.doi}` : null;
                      return (
                        <div key={article.uid || article.title} className="flex gap-3 rounded-xl bg-red-50/60 dark:bg-red-950/10 border border-red-100 dark:border-red-900/20 px-4 py-3">
                          <i className="fas fa-circle-xmark text-red-400 mt-0.5 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-snug">{article.title}</p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                              {[journal, year].filter(Boolean).join(' · ')}
                              {missCount > 1 && <span className="ml-2 font-semibold text-red-500">{missCount} questions missed</span>}
                              {questionTypes.length > 0 && <span className="ml-2 text-slate-400">({questionTypes.join(', ')})</span>}
                            </p>
                            {pubmedUrl && (
                              <a href={pubmedUrl} target="_blank" rel="noopener noreferrer"
                                className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
                                <i className="fas fa-arrow-up-right-from-square text-[9px]" /> View paper
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Gap report — only when part of a study run and data is ready */}
            {activeStudyRunId && studyRun && studyOutline && studyOutline.nodes.length > 0 && (
              <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 p-6 shadow-sm">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                  <i className="fas fa-map-signs text-indigo-500" /> Outline coverage — gap report
                </h3>
                <StudyRunPanel
                  run={studyRun}
                  outline={studyOutline}
                  gapReportMode
                  onContinue={() => navigate(`/quiz?topic=${encodeURIComponent(studyRun.topic)}&difficulty=mixed&studyRunId=${studyRun.id}`)}
                />
              </div>
            )}

            {/* Fallback when gap report fetch failed */}
            {activeStudyRunId && studyRunLoadFailed && (
              <div className="rounded-2xl border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-950/30 p-4 flex items-center gap-3">
                <i className="fas fa-exclamation-triangle text-amber-500 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Gap report unavailable</p>
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                    Could not load your outline coverage. Your quiz results were saved.{' '}
                    <button type="button" onClick={() => navigate(`/learning/${activeStudyRunId}`)}
                      className="underline hover:no-underline font-bold">
                      View run page
                    </button>{' '}to see the full gap report.
                  </p>
                </div>
              </div>
            )}

            {/* Portfolio reflection export */}
            <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 p-6 shadow-sm">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
                <i className="fas fa-file-export text-emerald-500" /> Portfolio reflection
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Export a de-identified WBA draft for CBD, mini-CEX, or DOPS evidence.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <select
                  value={reflectionKind}
                  onChange={(e) => setReflectionKind(e.target.value as 'CBD' | 'mini-CEX' | 'DOPS')}
                  className="h-9 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-2 text-xs font-bold text-slate-700 dark:text-slate-200"
                  aria-label="Portfolio reflection type"
                >
                  <option value="CBD">CBD</option>
                  <option value="mini-CEX">mini-CEX</option>
                  <option value="DOPS">DOPS</option>
                </select>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={saveQuizReflectionDraft}
                    disabled={reflectionSaveStatus === 'saving'}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-slate-900 px-3 text-xs font-black text-white transition-colors hover:bg-slate-700 disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                  >
                    <i className={`fas ${reflectionSaveStatus === 'saving' ? 'fa-circle-notch fa-spin' : reflectionSaveStatus === 'saved' ? 'fa-check' : 'fa-save'} text-[10px]`} />
                    {reflectionSaveStatus === 'saved' ? 'Saved' : 'Save draft'}
                  </button>
                  <button
                    type="button"
                    onClick={() => exportQuizReflection('doc')}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-black text-white transition-colors hover:bg-emerald-500"
                  >
                    <i className="fas fa-file-word text-[10px]" />
                    Export .doc
                  </button>
                  <button
                    type="button"
                    onClick={() => exportQuizReflection('txt')}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-emerald-200 bg-white px-3 text-xs font-black text-emerald-700 transition-colors hover:bg-emerald-50 dark:border-emerald-800 dark:bg-slate-950 dark:text-emerald-200 dark:hover:bg-emerald-950/40"
                  >
                    <i className="fas fa-file-lines text-[10px]" />
                    Export .txt
                  </button>
                </div>
              </div>
              {reflectionSaveStatus === 'error' && (
                <p className="mt-3 text-xs font-semibold text-red-500">Could not save draft. Please sign in and try again.</p>
              )}
            </div>
          </div>
        )}

        {!generating && !genError && !quiz.complete && currentQ && (
          <>
            {/* Progress bar */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                  Question {quiz.currentIndex + 1} of {quiz.questions.length}
                </span>
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{quiz.score} correct</span>
              </div>
              <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="impact-bar-fill"
                  data-pct={String(Math.round((quiz.currentIndex / Math.max(1, quiz.questions.length)) * 100 / 10) * 10)}
                />
              </div>
            </div>

            {/* Question card */}
            <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 p-6 shadow-sm mb-4">
              <div className="flex items-center gap-2 mb-4 flex-wrap">
                <span className={`text-xs font-bold px-2.5 py-1 rounded-lg capitalize ${DIFFICULTY_COLORS[currentQ.difficulty] ?? DIFFICULTY_COLORS.medium}`}>
                  {currentQ.difficulty}
                </span>
                <QuestionTypeBadge type={currentQ.questionType} />
                {!currentQ.questionType && (
                  <span className="text-xs text-slate-400 capitalize">
                    {currentQ.type === 'true_false' ? 'True / False' : 'Multiple choice'}
                  </span>
                )}
              </div>

              <p className="text-base font-semibold text-slate-900 dark:text-white leading-relaxed mb-4">
                {currentQ.question}
              </p>

              {!isAnswered && (
                <div className="mb-5 rounded-xl border border-slate-100 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/40 px-4 py-3">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-2">
                    Confidence before answering (1 = guessing, 5 = certain)
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={1}
                      max={5}
                      step={1}
                      value={answerConfidence}
                      onChange={(e) => setAnswerConfidence(Number(e.target.value))}
                      className="flex-1 accent-indigo-600"
                      aria-label="Answer confidence"
                    />
                    <span className="text-sm font-black text-indigo-600 dark:text-indigo-400 w-6 text-center">{answerConfidence}</span>
                  </div>
                </div>
              )}

              {currentQ.type === 'multiple_choice' && currentQ.options ? (
                <div className="space-y-3">
                  {currentQ.options.map((opt) => {
                    const letter = opt.split(':')[0].trim();
                    return (
                      <OptionButton
                        key={letter}
                        opt={opt}
                        letter={letter}
                        isAnswered={isAnswered}
                        isCorrectLetter={letter.toLowerCase() === currentQ.correctAnswer.toLowerCase()}
                        isSelected={selected === letter}
                        onClick={() => handleAnswer(letter)}
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="flex gap-4">
                  {['true', 'false'].map((val) => (
                    <OptionButton
                      key={val}
                      opt={val}
                      letter={val}
                      isAnswered={isAnswered}
                      isCorrectLetter={val === currentQ.correctAnswer.toLowerCase()}
                      isSelected={selected === val}
                      onClick={() => handleAnswer(val)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Explanation panel */}
            {quiz.showExplanation && (
              <div className={`rounded-2xl p-5 mb-4 border-2 animate-fade-in ${
                isCorrect
                  ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
                  : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
              }`}>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <i className={`fas fa-${isCorrect ? 'check-circle text-emerald-600' : 'lightbulb text-amber-600'}`} />
                  <span className={`text-sm font-bold ${isCorrect ? 'text-emerald-800 dark:text-emerald-300' : 'text-amber-800 dark:text-amber-300'}`}>
                    {isCorrect ? 'Correct!' : `Correct answer: ${currentQ.correctAnswer}`}
                  </span>
                  <VerificationBadge status={(currentQ as { verificationStatus?: string }).verificationStatus || 'synthesis_inferred'} />
                </div>

                {(() => {
                  const parsed = parseSourceLabel(currentQ.explanation || '');
                  return (
                    <div className="mb-3">
                      <p className={`text-sm leading-relaxed ${isCorrect ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'}`}>
                        {parsed.text}
                      </p>
                      {parsed.label && <div className="mt-2"><SourceBadge label={parsed.label} /></div>}
                    </div>
                  );
                })()}

                {effectiveExplanationDepth === 'mechanistic' && currentQ.explanationDeep && (
                  <div className="mb-3 rounded-xl bg-white/70 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-600 px-3 py-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-violet-600 dark:text-violet-400 mb-1">Mechanistic depth</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{currentQ.explanationDeep}</p>
                  </div>
                )}

                {currentQ.distractorRationale && isAnswered && (
                  <div className="mt-3 pt-3 border-t border-current/10">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">Per-option rationale</p>
                    <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                      {(['A', 'B', 'C', 'D'] as const).map((letter) => {
                        const text = currentQ.distractorRationale?.[letter];
                        if (!text) return null;
                        return (
                          <li key={letter}>
                            <span className="font-bold text-slate-700 dark:text-slate-300">{letter}.</span>{' '}
                            {text}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

                {currentQ.whyOthersWrong && (
                  <div className="mt-3 pt-3 border-t border-current/10">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1.5">Summary (wrong options)</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{currentQ.whyOthersWrong}</p>
                  </div>
                )}

                {(() => {
                  const src = resolveSourceArticle(currentQ);
                  const year = src?.pubdate?.slice(0, 4) ?? null;
                  const journal = src?.source ?? src?.journal ?? null;
                  const pubmedUrl = src?.pmid ? `https://pubmed.ncbi.nlm.nih.gov/${src.pmid}/` : src?.doi ? `https://doi.org/${src.doi}` : null;
                  if (!src && !currentQ.sourceArticle && !currentQ.sourceReference) return null;
                  return (
                    <div className="mt-3 rounded-lg border border-indigo-100 bg-indigo-50/60 dark:border-indigo-800/40 dark:bg-indigo-950/20 px-3 py-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500 dark:text-indigo-400 mb-1 flex items-center gap-1">
                        <i className="fas fa-book-open text-[9px]" />
                        Evidence source for this question
                      </p>
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 leading-snug">
                        {src?.title ?? currentQ.sourceArticle ?? currentQ.sourceReference}
                      </p>
                      {(year || journal) && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {[journal, year].filter(Boolean).join(' · ')}
                        </p>
                      )}
                      {pubmedUrl && (
                        <a href={pubmedUrl} target="_blank" rel="noopener noreferrer"
                          className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
                          <i className="fas fa-arrow-up-right-from-square text-[9px]" />
                          View paper
                        </a>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            {isAnswered && isAuthenticated && currentQ && (
              <div className="flex items-center justify-end gap-2 -mt-1">
                {feedbackSentIds.has(currentQ.id) ? (
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 italic">Thanks for your feedback</span>
                ) : (
                  <>
                    <span className="text-[11px] text-slate-400 dark:text-slate-500">Explanation helpful?</span>
                    <button
                      type="button"
                      onClick={() => handleExplanationFeedback('clear')}
                      className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 transition-colors"
                    >
                      <i className="fas fa-thumbs-up mr-1 text-[9px]" />Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExplanationFeedback('confusing')}
                      className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/30 dark:text-amber-400 transition-colors"
                    >
                      <i className="fas fa-question mr-1 text-[9px]" />Confusing
                    </button>
                  </>
                )}
              </div>
            )}

            {isAnswered && (
              <button type="button" onClick={handleNext}
                className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-colors shadow-md shadow-indigo-200 dark:shadow-indigo-900/40">
                {quiz.currentIndex + 1 < quiz.questions.length
                  ? <><span>Next question</span> <i className="fas fa-arrow-right ml-2" /></>
                  : <><span>See results</span> <i className="fas fa-trophy ml-2" /></>
                }
              </button>
            )}

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
