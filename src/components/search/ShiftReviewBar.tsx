import React from 'react';

interface ShiftReviewBarProps {
  currentQuery: string;
  inPlaceQuizExpanded: boolean;
  onOpenGuideline: () => void;
  onOpenCase: () => void;
  onToggleQuiz: () => void;
}

export const ShiftReviewBar: React.FC<ShiftReviewBarProps> = ({
  currentQuery,
  inPlaceQuizExpanded,
  onOpenGuideline,
  onOpenCase,
  onToggleQuiz,
}) => (
  <div className="sticky top-[calc(var(--nav-h)+0.75rem)] z-20 mb-4 rounded-2xl border border-slate-200/80 bg-white/92 p-3 shadow-sm backdrop-blur dark:border-slate-700/80 dark:bg-slate-900/88">
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Shift review</p>
        <p className="truncate text-xs font-semibold text-slate-700 dark:text-slate-200">{currentQuery}</p>
      </div>
      <div className="grid grid-cols-2 gap-1.5 sm:flex sm:flex-wrap sm:items-center">
        <button
          type="button"
          onClick={() => document.getElementById('workflow-evidence')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-2.5 sm:px-3 text-xs font-bold text-white hover:bg-indigo-500"
        >
          <i className="fas fa-layer-group text-[10px]" /> Evidence
        </button>
        <button
          type="button"
          onClick={onOpenGuideline}
          className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-blue-200 px-2.5 sm:px-3 text-xs font-bold text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-300 dark:hover:bg-blue-950/40"
        >
          <i className="fas fa-book-medical text-[10px]" /> Guideline
        </button>
        <button
          type="button"
          onClick={onOpenCase}
          className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-emerald-200 px-2.5 sm:px-3 text-xs font-bold text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
        >
          <i className="fas fa-stethoscope text-[10px]" /> Case
        </button>
        <button
          type="button"
          onClick={onToggleQuiz}
          className={`inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border px-2.5 sm:px-3 text-xs font-bold transition-colors ${
            inPlaceQuizExpanded
              ? 'bg-violet-600 border-violet-600 text-white hover:bg-violet-500'
              : 'border-violet-200 text-violet-700 hover:bg-violet-50 dark:border-violet-800 dark:text-violet-300 dark:hover:bg-violet-950/40'
          }`}
        >
          <i className="fas fa-brain text-[10px]" /> {inPlaceQuizExpanded ? 'Close quiz' : 'Quiz me on this'}
        </button>
        <button
          type="button"
          onClick={onOpenCase}
          className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-2.5 sm:px-3 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800/40"
        >
          <i className="fas fa-file-export text-[10px]" /> Reflection
        </button>
      </div>
    </div>
  </div>
);
