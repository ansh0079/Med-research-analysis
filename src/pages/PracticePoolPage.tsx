import React, { useState, useCallback } from 'react';
import { api } from '@services/api';

interface PoolQuestion {
  id: string;
  topic: string;
  source: 'guideline' | 'evidence';
  type: string;
  questionType: 'recall' | 'clinical_application' | 'trial_interpretation' | 'guideline' | 'pitfall';
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string | null;
  guidelineRef: string | null;
  difficulty: 'easy' | 'medium' | 'hard';
  outlineNodeId?: string | null;
  outlineLabel?: string | null;
  claimKey?: string | null;
  sourceArticleUid?: string | null;
  sourceArticleTitle?: string | null;
}

type Difficulty = 'all' | 'easy' | 'medium' | 'hard';
type QType = 'all' | 'recall' | 'clinical_application' | 'guideline' | 'pitfall';

const DIFFICULTY_OPTS: { value: Difficulty; label: string }[] = [
  { value: 'all', label: 'Any difficulty' },
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
];

const TYPE_OPTS: { value: QType; label: string }[] = [
  { value: 'all', label: 'All types' },
  { value: 'recall', label: 'Recall' },
  { value: 'clinical_application', label: 'Clinical application' },
  { value: 'guideline', label: 'Guideline' },
  { value: 'pitfall', label: 'Pitfall' },
];

const COUNT_OPTS = [5, 10, 15, 20, 30];

const sourceBadge = (source: string) =>
  source === 'guideline'
    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
    : 'bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300';

const diffBadge = (d: string) =>
  d === 'easy' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
  : d === 'hard' ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300'
  : 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300';

export function PracticePoolPage() {
  const [difficulty, setDifficulty] = useState<Difficulty>('all');
  const [qType, setQType] = useState<QType>('all');
  const [count, setCount] = useState(10);
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<PoolQuestion[]>([]);
  const [total, setTotal] = useState(0);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showExplanation, setShowExplanation] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const started = questions.length > 0;
  const currentQ = questions[currentIdx];
  const userAnswer = currentQ ? answers[currentQ.id] : undefined;
  const isAnswered = !!userAnswer;
  const isCorrect = currentQ && userAnswer?.toUpperCase() === currentQ.correctAnswer.toUpperCase();
  const score = questions.filter(q => answers[q.id]?.toUpperCase() === q.correctAnswer.toUpperCase()).length;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.fetchPracticePool({
        count,
        difficulty: difficulty === 'all' ? undefined : difficulty,
        type: qType === 'all' ? undefined : qType,
      }) as { questions: PoolQuestion[]; total: number };
      if (!data.questions?.length) {
        setError('No questions found for these filters. Try broadening your selection.');
        setLoading(false);
        return;
      }
      setQuestions(data.questions);
      setTotal(data.total);
      setAnswers({});
      setCurrentIdx(0);
      setShowExplanation(false);
      setComplete(false);
      setSyncError(null);
    } catch {
      setError('Failed to load practice pool. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [count, difficulty, qType]);

  const handleAnswer = (letter: string) => {
    if (isAnswered) return;
    setAnswers(prev => ({ ...prev, [currentQ.id]: letter }));
    setShowExplanation(true);
    setSyncError(null);
    api.submitQuizAttempt({
      topic: currentQ.topic,
      attempts: [{
        questionId: currentQ.id,
        questionType: currentQ.questionType,
        questionText: currentQ.question,
        userAnswer: letter,
        correctAnswer: currentQ.correctAnswer,
        isCorrect: letter.toUpperCase() === currentQ.correctAnswer.toUpperCase(),
        sourceArticleUid: currentQ.sourceArticleUid || undefined,
        sourceArticleTitle: currentQ.sourceArticleTitle || undefined,
        outlineNodeId: currentQ.outlineNodeId || undefined,
        outlineLabel: currentQ.outlineLabel || currentQ.question.slice(0, 120),
        claimKey: currentQ.claimKey || undefined,
      }],
    }).catch(() => {
      setSyncError('Answer saved locally, but learning memory did not sync. Try again if this persists.');
    });
  };

  const handleNext = () => {
    if (currentIdx + 1 >= questions.length) {
      setComplete(true);
    } else {
      setCurrentIdx(i => i + 1);
      setShowExplanation(false);
    }
  };

  const handleRestart = () => {
    setQuestions([]);
    setAnswers({});
    setCurrentIdx(0);
    setShowExplanation(false);
    setComplete(false);
    setSyncError(null);
  };

  // ── Setup screen ──────────────────────────────────────────────────────────
  if (!started) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
        <div className="max-w-2xl mx-auto px-4 py-12 w-full">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Practice Pool</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Random questions drawn from our full bank of {total > 0 ? `${total.toLocaleString()}+` : ''} pre-built MCQs —
              evidence-based and guideline-anchored, across all clinical topics.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-6">
            {/* Count */}
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Number of questions</p>
              <div className="flex flex-wrap gap-2">
                {COUNT_OPTS.map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setCount(n)}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                      count === n
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-indigo-400'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Difficulty */}
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Difficulty</p>
              <div className="flex flex-wrap gap-2">
                {DIFFICULTY_OPTS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setDifficulty(opt.value)}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                      difficulty === opt.value
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-indigo-400'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Question type */}
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Question type</p>
              <div className="flex flex-wrap gap-2">
                {TYPE_OPTS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setQType(opt.value)}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                      qType === opt.value
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-indigo-400'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

            <button
              type="button"
              onClick={load}
              disabled={loading}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold text-sm transition-colors"
            >
              {loading ? 'Loading…' : 'Start practice'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Complete screen ───────────────────────────────────────────────────────
  if (complete) {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center px-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-8 max-w-md w-full text-center space-y-4">
          <div className={`text-5xl font-bold ${pct >= 70 ? 'text-emerald-500' : pct >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
            {pct}%
          </div>
          <p className="text-slate-600 dark:text-slate-300 text-sm">
            {score} / {questions.length} correct
          </p>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={load}
              className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors"
            >
              New batch
            </button>
            <button
              type="button"
              onClick={handleRestart}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Change filters
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Quiz screen ───────────────────────────────────────────────────────────
  const optionLetters = currentQ.options.map(o => o.match(/^([A-D]):/)?.[1] || o[0]).filter(Boolean);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      <div className="max-w-2xl mx-auto px-4 py-8 w-full flex flex-col gap-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold text-slate-800 dark:text-slate-100">Practice Pool</h1>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              Question {currentIdx + 1} of {questions.length}
            </p>
          </div>
          <button
            type="button"
            onClick={handleRestart}
            className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            ✕ Exit
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-500 rounded-full transition-all duration-300"
            style={{ width: `${((currentIdx + (isAnswered ? 1 : 0)) / questions.length) * 100}%` }}
          />
        </div>

        {/* Question card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-5">

          {/* Meta badges */}
          <div className="flex flex-wrap gap-1.5">
            <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${sourceBadge(currentQ.source)}`}>
              {currentQ.source === 'guideline' ? 'Guideline' : 'Evidence'}
            </span>
            <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${diffBadge(currentQ.difficulty)}`}>
              {currentQ.difficulty}
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
              {currentQ.questionType.replace(/_/g, ' ')}
            </span>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 italic">
              {currentQ.topic}
            </span>
          </div>

          {/* Stem */}
          <p className="text-sm text-slate-800 dark:text-slate-100 leading-relaxed font-medium">
            {currentQ.question}
          </p>

          {/* Options */}
          <div className="space-y-2">
            {currentQ.options.map((opt, i) => {
              const letter = optionLetters[i] || String.fromCharCode(65 + i);
              const chosen = userAnswer?.toUpperCase() === letter.toUpperCase();
              const correct = currentQ.correctAnswer.toUpperCase() === letter.toUpperCase();
              let cls = 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20';
              if (isAnswered && correct) cls = 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/25 text-emerald-800 dark:text-emerald-200';
              else if (isAnswered && chosen) cls = 'border-red-400 bg-red-50 dark:bg-red-900/25 text-red-700 dark:text-red-300';
              else if (isAnswered) cls = 'border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 opacity-60';
              return (
                <button
                  key={letter}
                  type="button"
                  onClick={() => handleAnswer(letter)}
                  disabled={isAnswered}
                  className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-all ${cls}`}
                >
                  {opt}
                </button>
              );
            })}
          </div>

          {/* Explanation */}
          {showExplanation && (
            <div className={`rounded-xl p-4 text-sm space-y-2 ${isCorrect ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800' : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'}`}>
              <p className={`font-semibold text-xs uppercase tracking-wider ${isCorrect ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'}`}>
                {isCorrect ? '✓ Correct' : `✗ Incorrect — Answer: ${currentQ.correctAnswer}`}
              </p>
              {currentQ.explanation && (
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{currentQ.explanation}</p>
              )}
              {currentQ.guidelineRef && (
                <p className="text-xs text-blue-600 dark:text-blue-400 italic">{currentQ.guidelineRef}</p>
              )}
              {syncError && (
                <p className="text-xs text-amber-700 dark:text-amber-300">{syncError}</p>
              )}
            </div>
          )}

          {/* Next button */}
          {isAnswered && (
            <button
              type="button"
              onClick={handleNext}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors"
            >
              {currentIdx + 1 >= questions.length ? 'See results' : 'Next question →'}
            </button>
          )}
        </div>

        {/* Score tracker */}
        <p className="text-center text-xs text-slate-400 dark:text-slate-500">
          Score so far: {score} / {currentIdx + (isAnswered ? 1 : 0)}
        </p>
      </div>
    </div>
  );
}
