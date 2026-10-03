import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '@services/api';

type CuratedQuestion = import('@services/api/mcqs').CuratedQuestion;
type CuratedSourceRef = import('@services/api/mcqs').CuratedSourceRef;

export const CuratedMcqsTopicPage: React.FC = () => {
  const { topicKey = '' } = useParams<{ topicKey: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [displayName, setDisplayName] = React.useState<string>('');
  const [questions, setQuestions] = React.useState<CuratedQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = React.useState(0);
  const [answers, setAnswers] = React.useState<Record<string, string>>({});
  const [revealed, setRevealed] = React.useState<Record<string, string>>({});
  const [grading, setGrading] = React.useState(false);
  const [syncError, setSyncError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api.mcqs.getCuratedTopic(topicKey)
      .then((r) => {
        if (cancelled) return;
        setDisplayName(r.displayName || r.topicKey);
        setQuestions(r.questions || []);
      })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load MCQs'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [topicKey]);

  const started = questions.length > 0;
  const q = questions[currentIdx];
  const userAns = q ? answers[q.id] : undefined;
  const isAnswered = !!userAns;
  const correct = q ? (revealed[q.id] || '') : '';
  const isCorrect = q && correct && userAns?.toUpperCase() === correct.toUpperCase();
  const score = questions.filter(qq => revealed[qq.id] && answers[qq.id]?.toUpperCase() === (revealed[qq.id] || '').toUpperCase()).length;

  const grade = async (letter: string) => {
    if (!q || isAnswered || grading) return;
    setGrading(true);
    setSyncError(null);
    try {
      const graded = await api.ai.gradeQuizAnswer({
        gradingToken: q.gradingToken || '',
        questionId: q.id,
        questionText: q.question,
        userAnswer: letter,
      });
      setRevealed((prev) => ({ ...prev, [q.id]: graded.correctAnswer }));
      setAnswers((prev) => ({ ...prev, [q.id]: letter }));
    } catch {
      setSyncError('Could not check that answer. Please try again.');
    } finally {
      setGrading(false);
    }
  };

  const next = () => {
    if (currentIdx + 1 >= questions.length) {
      navigate('/mcqs'); // back to topics
      return;
    }
    setCurrentIdx((i) => i + 1);
  };

  if (loading) {
    return (
      <div className="min-h-screen aurora-bg flex items-center justify-center">
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-900/40 p-4 text-sm text-slate-500 dark:text-slate-400">
          <i className="fas fa-spinner fa-spin mr-2" /> Loading…
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="min-h-screen aurora-bg flex items-center justify-center">
        <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-4 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      </div>
    );
  }

  if (!started) {
    return (
      <div className="min-h-screen aurora-bg flex items-center justify-center">
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-900/40 p-4 text-sm text-slate-500 dark:text-slate-400">
          No questions found for this topic.
        </div>
      </div>
    );
  }

  const optionLetters = q.options.map(o => o.match(/^([A-E]):/)?.[1] || o[0]).filter(Boolean);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      <div className="max-w-3xl mx-auto px-4 py-8 w-full flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold text-slate-800 dark:text-slate-100">Practice MCQs — {displayName}</h1>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              Question {currentIdx + 1} of {questions.length} · Score {score}/{currentIdx + (isAnswered ? 1 : 0)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/mcqs')}
            className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            ✕ Exit
          </button>
        </div>

        {/* Progress */}
        <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-500 rounded-full transition-all duration-300"
            style={{ width: `${((currentIdx + (isAnswered ? 1 : 0)) / questions.length) * 100}%` }}
          />
        </div>

        {/* Question card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-5">
          {/* Stem */}
          <p className="text-sm text-slate-800 dark:text-slate-100 leading-relaxed font-medium">
            {q.question}
          </p>

          {/* Options */}
          <div className="space-y-2">
            {q.options.map((opt, i) => {
              const letter = optionLetters[i] || String.fromCharCode(65 + i);
              const chosen = userAns?.toUpperCase() === letter.toUpperCase();
              const isRight = correct.toUpperCase() === letter.toUpperCase();
              let cls = 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20';
              if (isAnswered && isRight) cls = 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/25 text-emerald-800 dark:text-emerald-200';
              else if (isAnswered && chosen) cls = 'border-red-400 bg-red-50 dark:bg-red-900/25 text-red-700 dark:text-red-300';
              else if (isAnswered) cls = 'border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 opacity-60';
              return (
                <button
                  key={letter}
                  type="button"
                  onClick={() => { void grade(letter); }}
                  disabled={isAnswered || grading}
                  className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-all ${cls}`}
                >
                  {opt}
                </button>
              );
            })}
          </div>

          {/* Explanation + Sources */}
          {isAnswered && (
            <div className={`rounded-xl p-4 text-sm space-y-2 ${isCorrect ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800' : 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800'}`}>
              <p className={`font-semibold text-xs uppercase tracking-wider ${isCorrect ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'}`}>
                {isCorrect ? 'Correct' : `Incorrect — Answer: ${correct}`}
              </p>
              {q.explanation && (
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{q.explanation}</p>
              )}
              {Array.isArray(q.sourceRefs) && q.sourceRefs.length > 0 && (
                <div className="mt-2 pt-2 border-t border-current/10">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mb-1.5">
                    Cited sources
                  </p>
                  <ul className="space-y-2">
                    {q.sourceRefs.map((s: CuratedSourceRef, i: number) => (
                      <li key={i} className="text-xs text-slate-700 dark:text-slate-300">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold">{s.sourceBody || 'Source'}</span>
                          {s.sourceYear != null && <span className="text-slate-400">· {s.sourceYear}</span>}
                          {s.sourceUrl && (
                            <a
                              href={s.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-indigo-600 dark:text-indigo-400 hover:underline"
                            >
                              Link
                            </a>
                          )}
                        </div>
                        {s.excerpt && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                            “{s.excerpt}”
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {syncError && (
                <p className="text-xs text-amber-700 dark:text-amber-300">{syncError}</p>
              )}
            </div>
          )}

          {/* Next */}
          {isAnswered && (
            <button
              type="button"
              onClick={next}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors"
            >
              {currentIdx + 1 >= questions.length ? 'Finish' : 'Next question →'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CuratedMcqsTopicPage;

