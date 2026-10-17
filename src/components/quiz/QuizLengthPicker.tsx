import React from 'react';

export const QUIZ_LENGTH_STEPS = [5, 10, 15, 20, 25, 30] as const;

interface QuizLengthPickerProps {
  value: number;
  onChange: (count: number) => void;
}

// Questions per quiz, in steps of 5. The server still applies the learner's plan limit.
export const QuizLengthPicker: React.FC<QuizLengthPickerProps> = ({ value, onChange }) => (
  <div className="mb-4 flex flex-wrap items-center gap-2" role="group" aria-label="Number of questions">
    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mr-1">Questions</span>
    {QUIZ_LENGTH_STEPS.map((n) => (
      <button
        key={n}
        type="button"
        onClick={() => onChange(n)}
        aria-pressed={value === n}
        className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors ${
          value === n
            ? 'bg-indigo-600 border-indigo-600 text-white'
            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-indigo-400'
        }`}
      >
        {n}
      </button>
    ))}
  </div>
);
