import React from 'react';
import type { QuizQuestion } from '@types';
import type { QuizArticle } from '@services/quizService';
import { VerificationBadge } from '@components/ui/VerificationBadge';
import {
  DIFFICULTY_COLORS,
  OptionButton,
  QuestionTypeBadge,
  SourceBadge,
  VisualExplanation,
  parseSourceLabel,
} from '@components/quiz/QuizQuestionParts';

export function QuizQuestionPanel({
  currentQ,
  currentIndex,
  questionCount,
  score,
  isAnswered,
  isCorrect,
  selected,
  answerConfidence,
  adaptiveNotice,
  effectiveExplanationDepth,
  isAuthenticated,
  feedbackSent,
  sourceArticle,
  onAnswer,
  onConfidenceChange,
  onExplanationFeedback,
  onNext,
}: {
  currentQ: QuizQuestion;
  currentIndex: number;
  questionCount: number;
  score: number;
  isAnswered: boolean;
  isCorrect: boolean | undefined;
  selected: string | null;
  answerConfidence: number;
  adaptiveNotice: string | null;
  effectiveExplanationDepth: 'foundation' | 'exam_focus' | 'mechanistic';
  isAuthenticated: boolean;
  feedbackSent: boolean;
  sourceArticle: QuizArticle | null;
  onAnswer: (answer: string) => void;
  onConfidenceChange: (value: number) => void;
  onExplanationFeedback: (feedbackType: 'confusing' | 'clear') => void;
  onNext: () => void;
}) {
  const sourceYear = sourceArticle?.pubdate?.slice(0, 4) ?? null;
  const sourceJournal = sourceArticle?.source ?? sourceArticle?.journal ?? null;
  const sourceUrl = sourceArticle?.pmid
    ? `https://pubmed.ncbi.nlm.nih.gov/${sourceArticle.pmid}/`
    : sourceArticle?.doi
      ? `https://doi.org/${sourceArticle.doi}`
      : null;

  return (
    <>
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
            Question {currentIndex + 1} of {questionCount}
          </span>
          <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{score} correct</span>
        </div>
        <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className="impact-bar-fill"
            data-pct={String(Math.round((currentIndex / Math.max(1, questionCount)) * 100 / 10) * 10)}
          />
        </div>
      </div>

      {adaptiveNotice && (
        <div className="mb-4 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-xs font-semibold text-indigo-700 dark:border-indigo-800/50 dark:bg-indigo-950/30 dark:text-indigo-300">
          <i className="fas fa-sliders mr-2" />
          {adaptiveNotice}
        </div>
      )}

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
                onChange={(e) => onConfidenceChange(Number(e.target.value))}
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
                  onClick={() => onAnswer(letter)}
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
                onClick={() => onAnswer(val)}
              />
            ))}
          </div>
        )}
      </div>

      {currentQ && isAnswered && (
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

          <VisualExplanation visual={currentQ.visualExplanation ?? null} />

          {currentQ.distractorRationale && (
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

          {(sourceArticle || currentQ.sourceArticle || currentQ.sourceReference) && (
            <div className="mt-3 rounded-lg border border-indigo-100 bg-indigo-50/60 dark:border-indigo-800/40 dark:bg-indigo-950/20 px-3 py-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500 dark:text-indigo-400 mb-1 flex items-center gap-1">
                <i className="fas fa-book-open text-[9px]" />
                Evidence source for this question
              </p>
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 leading-snug">
                {sourceArticle?.title ?? currentQ.sourceArticle ?? currentQ.sourceReference}
              </p>
              {(sourceYear || sourceJournal) && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {[sourceJournal, sourceYear].filter(Boolean).join(' - ')}
                </p>
              )}
              {sourceUrl && (
                <a href={sourceUrl} target="_blank" rel="noopener noreferrer"
                  className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
                  <i className="fas fa-arrow-up-right-from-square text-[9px]" />
                  View paper
                </a>
              )}
            </div>
          )}
        </div>
      )}

      {isAnswered && isAuthenticated && (
        <div className="flex items-center justify-end gap-2 -mt-1">
          {feedbackSent ? (
            <span className="text-[11px] text-slate-400 dark:text-slate-500 italic">Thanks for your feedback</span>
          ) : (
            <>
              <span className="text-[11px] text-slate-400 dark:text-slate-500">Explanation helpful?</span>
              <button
                type="button"
                onClick={() => onExplanationFeedback('clear')}
                className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 transition-colors"
              >
                <i className="fas fa-thumbs-up mr-1 text-[9px]" />Yes
              </button>
              <button
                type="button"
                onClick={() => onExplanationFeedback('confusing')}
                className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/30 dark:text-amber-400 transition-colors"
              >
                <i className="fas fa-question mr-1 text-[9px]" />Confusing
              </button>
            </>
          )}
        </div>
      )}

      {isAnswered && (
        <button type="button" onClick={onNext}
          className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-colors shadow-md shadow-indigo-200 dark:shadow-indigo-900/40">
          {currentIndex + 1 < questionCount
            ? <><span>Next question</span> <i className="fas fa-arrow-right ml-2" /></>
            : <><span>See results</span> <i className="fas fa-trophy ml-2" /></>
          }
        </button>
      )}
    </>
  );
}
