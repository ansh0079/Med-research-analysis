import React, { useRef, useState } from 'react';
import { useAuth } from '@contexts/AuthContext';
import { useClientFeatures } from '@hooks/useClientFeatures';
import { api } from '@services/api';
import type { QuestionType, QuizQuestion } from '@types';

const QTYPE_LABEL: Partial<Record<QuestionType, string>> = {
  recall: 'Recall', clinical_application: 'Clinical Application',
  trial_interpretation: 'Trial Interpretation', guideline: 'Guideline', pitfall: 'Pitfall',
};

const QTYPE_COLOR: Partial<Record<QuestionType, string>> = {
  recall: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  clinical_application: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
  trial_interpretation: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
  guideline: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  pitfall: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

export function CaseMCQs({ mcqs, topic }: { mcqs: QuizQuestion[]; topic: string }) {
  const { isAuthenticated } = useAuth();
  const { betaOpenAccess } = useClientFeatures();
  const submittedRef = useRef(new Set<string>());
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [collapsed, setCollapsed] = useState(false);

  const q = mcqs[current];
  if (!q) return null;
  const isAnswered = answers[q.id] !== undefined;
  const isCorrect = isAnswered && answers[q.id]?.toLowerCase() === q.correctAnswer.toLowerCase();

  const persistAttempt = async (question: QuizQuestion, letter: string) => {
    if ((!isAuthenticated && !betaOpenAccess) || !topic || submittedRef.current.has(question.id)) return;
    submittedRef.current.add(question.id);
    try {
      await api.learning.submitQuizAttempt({
        topic,
        attempts: [{
          questionId: question.id,
          questionType: (question.questionType as QuestionType) || 'clinical_application',
          questionText: question.question,
          userAnswer: letter,
          correctAnswer: question.correctAnswer,
          isCorrect: letter.toLowerCase() === question.correctAnswer.toLowerCase(),
          promptVariant: 'case_embedded',
        }],
      });
    } catch {
      submittedRef.current.delete(question.id);
    }
  };

  const handleAnswer = (letter: string) => {
    if (isAnswered) return;
    setAnswers((prev) => ({ ...prev, [q.id]: letter }));
    void persistAttempt(q, letter);
  };

  return (
    <div>
      <button type="button" onClick={() => setCollapsed((v) => !v)}
        className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors mb-3">
        <i className={`fas fa-chevron-${collapsed ? 'down' : 'up'} text-[9px]`} />
        {mcqs.length} Case-Based MCQs
      </button>

      {!collapsed && (
        <>
          <div className="flex gap-1 flex-wrap mb-3">
            {mcqs.map((mq, i) => {
              const done = answers[mq.id] !== undefined;
              const correct = answers[mq.id]?.toLowerCase() === mq.correctAnswer.toLowerCase();
              return (
                <button key={mq.id} type="button" onClick={() => setCurrent(i)}
                  className={`w-8 h-8 rounded-lg text-xs font-bold transition-all border-2 ${
                    i === current
                      ? 'bg-indigo-600 border-indigo-600 text-white'
                      : done && correct
                        ? 'border-emerald-400 bg-emerald-50 text-emerald-700 dark:border-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-300'
                        : done
                          ? 'border-red-400 bg-red-50 text-red-600 dark:border-red-600 dark:bg-red-950/30 dark:text-red-300'
                          : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-indigo-400'
                  }`}>
                  {i + 1}
                </button>
              );
            })}
          </div>

          <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg capitalize ${
                q.difficulty === 'easy' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                  : q.difficulty === 'hard' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
              }`}>{q.difficulty}</span>
              {q.questionType && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${QTYPE_COLOR[q.questionType] ?? ''}`}>
                  {QTYPE_LABEL[q.questionType] ?? q.questionType}
                </span>
              )}
            </div>

            <p className="text-sm font-semibold text-slate-900 dark:text-white leading-relaxed mb-4">{q.question}</p>

            {q.options && (
              <div className="space-y-2">
                {q.options.map((opt) => {
                  const letter = opt.split(':')[0].trim();
                  const isCorrectLetter = letter.toLowerCase() === q.correctAnswer.toLowerCase();
                  const isSelected = answers[q.id] === letter;
                  let cls = 'w-full text-left px-3.5 py-2.5 rounded-xl border-2 text-sm font-medium transition-all duration-150 ';
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
                    <button key={letter} type="button" className={cls} disabled={isAnswered} onClick={() => handleAnswer(letter)}>
                      <span className="flex items-center gap-2.5">
                        {isAnswered && isCorrectLetter && <i className="fas fa-check-circle text-emerald-500 shrink-0" />}
                        {isAnswered && isSelected && !isCorrectLetter && <i className="fas fa-times-circle text-red-500 shrink-0" />}
                        {opt}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {isAnswered && (
              <div className={`mt-4 rounded-xl p-3.5 border ${isCorrect ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'}`}>
                <p className={`text-xs font-bold mb-1 ${isCorrect ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'}`}>
                  {isCorrect ? 'Correct!' : `Correct answer: ${q.correctAnswer}`}
                </p>
                <p className={`text-xs leading-relaxed ${isCorrect ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'}`}>
                  {q.explanation}
                </p>
                {q.whyOthersWrong && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                    <span className="font-bold">Why others are wrong:</span> {q.whyOthersWrong}
                  </p>
                )}
                {q.sourceReference && <p className="text-[10px] text-slate-400 mt-1.5 italic">{q.sourceReference}</p>}
              </div>
            )}

            {isAnswered && current < mcqs.length - 1 && (
              <button type="button" onClick={() => setCurrent((c) => c + 1)}
                className="mt-3 w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors">
                Next question <i className="fas fa-arrow-right ml-1" />
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
