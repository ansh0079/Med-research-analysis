import React, { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '@services/api';
import { Button } from '@components/ui/Button';
import { useAuth } from '@contexts/AuthContext';
import { useToast } from '@components/ui/Toast';
import type { Article, QuizQuestion } from '@types';

interface Props {
  topic: string;
  articles: Article[];
  onComplete?: (score: number, total: number) => void;
  onAuthSubmit?: (attempts: Array<import('@types').QuizAttemptSubmission['attempts'][number]>) => Promise<void>;
  autoExpand?: boolean;
}

export const EvidenceQuizPanel: React.FC<Props> = ({ topic, articles, onComplete, onAuthSubmit, autoExpand = false }) => {
  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [expanded, setExpanded] = useState(autoExpand);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Track per-question timing and answers for optional backend submission
  const questionStartRef = useRef<number>(0);
  const answersRef = useRef<Array<{ questionId: string; userAnswer: string; isCorrect: boolean; timeMs: number }>>([]);

  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSaveStatus('idle');
    answersRef.current = [];
    try {
      const result = await api.generateQuizFromEvidence(topic, articles, 'mixed', 3);
      setQuestions(result.questions);
      questionStartRef.current = Date.now();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load quiz');
    } finally {
      setLoading(false);
    }
  }, [topic, articles]);

  useEffect(() => {
    if (autoExpand) setExpanded(true);
  }, [autoExpand]);

  useEffect(() => {
    if (expanded && questions.length === 0 && !loading && !error) {
      fetchQuestions();
    }
  }, [expanded, questions.length, loading, error, fetchQuestions]);

  const currentQuestion = questions[currentIndex];

  const handleSelect = (letter: string) => {
    if (showExplanation || !currentQuestion) return;
    const timeMs = Date.now() - questionStartRef.current;
    const isCorrect = letter === currentQuestion.correctAnswer;
    setSelectedAnswer(letter);
    setShowExplanation(true);
    if (isCorrect) {
      setScore((s) => s + 1);
    }
    answersRef.current.push({
      questionId: currentQuestion.id || `${topic}-${currentIndex}`,
      userAnswer: letter,
      isCorrect,
      timeMs,
    });
  };

  const submitToBackend = useCallback(async (finalScore: number, total: number) => {
    if (!isAuthenticated || answersRef.current.length === 0) return;
    setSaveStatus('saving');
    try {
      const attempts = questions.map((q, idx) => {
        const ans = answersRef.current[idx];
        return {
          questionId: q.id || `${topic}-${idx}`,
          questionType: (q.questionType || 'clinical_application') as import('@types').QuizAttempt['questionType'],
          questionText: q.question,
          userAnswer: ans?.userAnswer || '',
          correctAnswer: q.correctAnswer,
          isCorrect: ans?.isCorrect ?? false,
          timeMs: ans?.timeMs ?? 0,
          confidence: undefined as number | undefined,
          sourceArticleUid: q.sourceArticle || undefined,
          sourceArticleTitle: getSourceTitle(q.sourceArticle, q.sourceIndices) || null,
          outlineNodeId: null as string | null,
          outlineLabel: null as string | null,
          claimKey: null as string | null,
          promptVariant: 'in_search_evidence_quiz',
        };
      });

      if (onAuthSubmit) {
        await onAuthSubmit(attempts);
      } else {
        await api.submitQuizAttempt({ topic, attempts });
      }
      setSaveStatus('saved');
      showToast('Quiz saved to your learning profile', 'success', 3000);
    } catch (err) {
      setSaveStatus('error');
      if (err instanceof Error && err.message === 'VERIFICATION_REQUIRED') {
        showToast('Verify your email to save quiz progress', 'warning', 5000);
      } else {
        // Non-blocking: user still sees their score. Silent failure is okay.
        showToast('Could not save quiz progress', 'info', 3000);
      }
    }
  }, [isAuthenticated, questions, topic, showToast]);

  const handleNext = () => {
    if (currentIndex + 1 >= questions.length) {
      const finalScore = score + (selectedAnswer === currentQuestion?.correctAnswer ? 1 : 0);
      setCompleted(true);
      onComplete?.(finalScore, questions.length);
      void submitToBackend(finalScore, questions.length);
    } else {
      setCurrentIndex((i) => i + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
      questionStartRef.current = Date.now();
    }
  };

  const handleRetry = () => {
    setQuestions([]);
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setShowExplanation(false);
    setScore(0);
    setCompleted(false);
    setError(null);
    setSaveStatus('idle');
    answersRef.current = [];
    fetchQuestions();
  };

  const getSourceTitle = (sourceArticle?: string | null, sourceIndices?: number[] | null) => {
    if (sourceArticle) return sourceArticle;
    if (sourceIndices && sourceIndices.length > 0) {
      const idx = sourceIndices[0] - 1;
      if (idx >= 0 && idx < articles.length) {
        return articles[idx].title;
      }
    }
    return null;
  };

  return (
    <div className="neo-card rounded-2xl overflow-hidden border border-violet-100 dark:border-violet-900/40 shadow-lg shadow-violet-100/30 dark:shadow-violet-900/20 mb-6">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 bg-gradient-to-r from-violet-50 to-white dark:from-violet-950/30 dark:to-slate-950/10 hover:from-violet-100 dark:hover:from-violet-900/40 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <i className="fas fa-brain text-violet-500 text-sm" />
          <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
            {completed ? 'Quiz completed' : 'Test yourself on this evidence'}
          </span>
          {completed && (
            <span className={`text-xs font-bold rounded-full px-2 py-0.5 ${score === questions.length ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
              {score}/{questions.length} correct
            </span>
          )}
          {saveStatus === 'saved' && (
            <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <i className="fas fa-check" /> Saved
            </span>
          )}
        </div>
        <i className={`fas fa-chevron-${expanded ? 'up' : 'down'} text-slate-400 text-xs transition-transform`} />
      </button>

      {expanded && (
        <div className="px-5 py-4">
          {loading && (
            <div className="flex items-center gap-2 text-sm text-slate-500 py-4">
              <div className="spinner w-4 h-4" />
              Generating citation-grounded questions…
            </div>
          )}

          {error && (
            <div className="flex flex-col gap-3 py-2">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              <Button variant="secondary" size="sm" onClick={handleRetry}>Retry</Button>
            </div>
          )}

          {!loading && !error && questions.length === 0 && (
            <p className="text-sm text-slate-500 py-2">No questions available.</p>
          )}

          {completed && (
            <div className="space-y-3">
              <div className={`rounded-xl px-4 py-3 ${score === questions.length ? 'bg-emerald-50 dark:bg-emerald-950/20' : 'bg-amber-50 dark:bg-amber-950/20'}`}>
                <p className={`text-sm font-bold ${score === questions.length ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'}`}>
                  {score === questions.length ? 'Perfect score!' : `${score} of ${questions.length} correct`}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {score === questions.length
                    ? 'You understood the key evidence well. Ready for a case scenario?'
                    : 'Review the explanations above to strengthen weak concepts.'}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={handleRetry}>Retake</Button>
              </div>
            </div>
          )}

          {!completed && currentQuestion && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Question {currentIndex + 1} of {questions.length}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  {currentQuestion.questionType?.replace('_', ' ')}
                </span>
              </div>

              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-relaxed">
                {currentQuestion.question}
              </p>

              {currentQuestion.options && (
                <div className="space-y-2">
                  {currentQuestion.options.map((opt) => {
                    const letter = opt.trim().charAt(0);
                    const isCorrect = letter === currentQuestion.correctAnswer;
                    const isSelected = letter === selectedAnswer;
                    const showResult = showExplanation;
                    return (
                      <button
                        key={letter}
                        type="button"
                        disabled={showExplanation}
                        onClick={() => handleSelect(letter)}
                        className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all border ${
                          showResult && isCorrect
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/20 dark:border-emerald-800 dark:text-emerald-200'
                            : showResult && isSelected && !isCorrect
                              ? 'bg-red-50 border-red-200 text-red-800 dark:bg-red-950/20 dark:border-red-800 dark:text-red-200'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-slate-900/40 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800'
                        }`}
                      >
                        <span className="font-bold mr-1.5">{letter}:</span>
                        {opt.slice(3)}
                      </button>
                    );
                  })}
                </div>
              )}

              {showExplanation && (
                <div className="space-y-3 animate-fade-in">
                  <div className="rounded-xl bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 px-4 py-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-500 dark:text-indigo-400 mb-1">Explanation</p>
                    <p className="text-xs text-indigo-900 dark:text-indigo-200 leading-relaxed">{currentQuestion.explanation}</p>
                    {currentQuestion.explanationDeep && (
                      <p className="text-xs text-indigo-700 dark:text-indigo-300 leading-relaxed mt-2 border-t border-indigo-100 dark:border-indigo-900/40 pt-2">
                        {currentQuestion.explanationDeep}
                      </p>
                    )}
                  </div>

                  {getSourceTitle(currentQuestion.sourceArticle, currentQuestion.sourceIndices) && (
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 italic">
                      Based on: {getSourceTitle(currentQuestion.sourceArticle, currentQuestion.sourceIndices)}
                    </p>
                  )}

                  <div className="flex justify-end">
                    <Button variant="gradient" size="sm" onClick={handleNext}>
                      {currentIndex + 1 >= questions.length ? 'Finish' : 'Next'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
