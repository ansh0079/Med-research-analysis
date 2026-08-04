import React, { useState, useCallback } from 'react';
import type { CaseStep, CaseStepFeedback, CaseStepResponse } from '@types';
import { QUESTION_TYPE_STYLES, STEP_TYPE_LABELS } from './caseConstants';

function OptionButton({ label, selected, correct, showResult, onClick }: {
  label: string; selected: boolean; correct: boolean; showResult: boolean; onClick: () => void;
}) {
  let cls = 'border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20';
  if (showResult && selected && correct) cls = 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 ring-2 ring-emerald-500/40';
  else if (showResult && selected && !correct) cls = 'border-red-500 bg-red-50 dark:bg-red-900/30 ring-2 ring-red-500/40';
  else if (showResult && correct) cls = 'border-emerald-400 bg-emerald-50/50 dark:bg-emerald-900/20';
  else if (selected) cls = 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 ring-2 ring-blue-500/40';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={showResult}
      className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all text-sm ${cls} ${showResult ? 'cursor-default' : 'cursor-pointer'}`}
    >
      <span className="text-slate-800 dark:text-slate-200">{label}</span>
      {showResult && correct && <i className="fas fa-check-circle text-emerald-500 float-right mt-0.5" />}
      {showResult && selected && !correct && <i className="fas fa-times-circle text-red-500 float-right mt-0.5" />}
    </button>
  );
}

export function CaseStepView({ step, stepIndex, onSubmit, feedback, response }: {
  step: CaseStep; stepIndex: number;
  onSubmit: (answer: string, timeMs: number) => void;
  feedback: CaseStepFeedback | null;
  response: CaseStepResponse | null;
}) {
  const [selected, setSelected] = useState<string | null>(response?.selectedAnswer || null);
  const [submitting, setSubmitting] = useState(false);
  const [startTime] = useState(() => Date.now());
  const showResult = !!feedback;
  const meta = STEP_TYPE_LABELS[step.type] || STEP_TYPE_LABELS.presentation;
  const qStyle = QUESTION_TYPE_STYLES[step.questionType] || QUESTION_TYPE_STYLES.recall;

  const handleSubmit = useCallback(async () => {
    if (!selected || showResult) return;
    setSubmitting(true);
    await onSubmit(selected, Date.now() - startTime);
    setSubmitting(false);
  }, [selected, showResult, onSubmit, startTime]);

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center gap-2 mb-1">
        <i className={`fas ${meta.icon} ${meta.color}`} />
        <span className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">{meta.label}</span>
        <span className="text-xs text-slate-400">Step {stepIndex + 1} of 5</span>
      </div>

      <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-4 border border-slate-200 dark:border-slate-700">
        <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line">{step.narrative}</p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{step.question}</p>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${qStyle}`}>
            {step.questionType.replace(/_/g, ' ')}
          </span>
        </div>

        <div className="space-y-2">
          {step.options.map((opt) => {
            const letter = opt.charAt(0);
            return (
              <OptionButton
                key={opt}
                label={opt}
                selected={selected === letter}
                correct={letter === step.correctAnswer}
                showResult={showResult}
                onClick={() => !showResult && setSelected(letter)}
              />
            );
          })}
        </div>
      </div>

      {!showResult && (
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!selected || submitting}
          className="w-full py-2.5 rounded-xl font-semibold text-sm bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? <><i className="fas fa-spinner fa-spin mr-2" />Submitting...</> : 'Submit Answer'}
        </button>
      )}

      {showResult && feedback && (
        <div className={`rounded-xl p-4 space-y-3 ${feedback.isCorrect ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800' : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'}`}>
          <div className="flex items-center gap-2">
            <i className={`fas ${feedback.isCorrect ? 'fa-check-circle text-emerald-500' : 'fa-times-circle text-red-500'}`} />
            <span className={`text-sm font-bold ${feedback.isCorrect ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'}`}>
              {feedback.isCorrect ? 'Correct!' : 'Incorrect'}
            </span>
          </div>
          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{feedback.explanation}</p>
          {!feedback.isCorrect && feedback.whyOthersWrong && (
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{feedback.whyOthersWrong}</p>
          )}
          <div className="flex items-start gap-2 pt-1 border-t border-slate-200 dark:border-slate-700">
            <i className="fas fa-lightbulb text-amber-500 mt-0.5 text-xs" />
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{feedback.teachingPoint}</p>
          </div>
          {feedback.evidenceSource && (
            <div className="flex items-center gap-1.5 pt-1">
              <i className="fas fa-bookmark text-blue-400 text-[10px]" />
              <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400">Source: {feedback.evidenceSource}</span>
            </div>
          )}
          {feedback.branchingNote && (
            <div className="flex items-start gap-1.5 pt-1 border-t border-slate-100 dark:border-slate-800">
              <i className="fas fa-code-branch text-violet-400 mt-0.5 text-[10px]" />
              <span className="text-[10px] text-violet-600 dark:text-violet-400 italic">{feedback.branchingNote}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
