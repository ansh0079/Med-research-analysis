import React from 'react';

interface QuizOptionButtonProps {
  opt: string;
  letter: string;
  isAnswered: boolean;
  isCorrectLetter: boolean;
  isSelected: boolean;
  /** Ticked but not yet submitted (select-all-that-apply questions). */
  isPicked?: boolean;
  onClick: () => void;
}

export const QuizOptionButton: React.FC<QuizOptionButtonProps> = ({
  opt, isAnswered, isCorrectLetter, isSelected, isPicked, onClick,
}) => {
  let cls = 'w-full text-left px-4 py-3 rounded-xl border-2 font-medium text-sm transition-all duration-150 ';
  if (!isAnswered && isPicked) {
    cls += 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-200';
  } else if (!isAnswered) {
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
        {!isAnswered && isPicked && <i className="fas fa-check-square text-indigo-500 shrink-0" />}
        {isAnswered && isCorrectLetter && <i className="fas fa-check-circle text-emerald-500 shrink-0" />}
        {isAnswered && isSelected && !isCorrectLetter && <i className="fas fa-times-circle text-red-500 shrink-0" />}
        {isAnswered && !isCorrectLetter && !isSelected && <i className="fas fa-circle text-slate-200 dark:text-slate-700 shrink-0 text-[10px]" />}
        {opt}
      </span>
    </button>
  );
};
