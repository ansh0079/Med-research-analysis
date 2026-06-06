import React from 'react';
import type { FollowUpQuestion } from '@types';

const TRIGGER_CONFIG: Record<FollowUpQuestion['trigger'], { icon: string; chip: string }> = {
  conflict:    { icon: 'fa-scale-balanced', chip: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-700/50' },
  uncertainty: { icon: 'fa-question-circle', chip: 'bg-violet-100 text-violet-800 dark:bg-violet-950/40 dark:text-violet-300 border-violet-200 dark:border-violet-700/50' },
  gap:         { icon: 'fa-flask', chip: 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-700/50' },
  subgroup:    { icon: 'fa-users', chip: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700/50' },
};

interface FollowUpQuestionsPanelProps {
  questions: FollowUpQuestion[];
  onSearch: (query: string) => void;
}

export const FollowUpQuestionsPanel: React.FC<FollowUpQuestionsPanelProps> = ({ questions, onSearch }) => {
  if (!questions || questions.length === 0) return null;

  return (
    <div className="rounded-2xl border border-indigo-100 dark:border-indigo-900/40 overflow-hidden">
      <div className="px-4 py-2.5 bg-indigo-50/70 dark:bg-indigo-950/30 border-b border-indigo-100 dark:border-indigo-900/40 flex items-center gap-2">
        <i className="fas fa-arrow-right text-indigo-500 text-[10px]" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
          Where to look next
        </span>
      </div>
      <div className="p-4 space-y-2">
        {questions.map((q, i) => {
          const cfg = TRIGGER_CONFIG[q.trigger] ?? TRIGGER_CONFIG.gap;
          return (
            <button
              key={i}
              type="button"
              onClick={() => onSearch(q.question)}
              className="w-full text-left group rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 transition-colors px-4 py-3 flex items-start gap-3"
            >
              <span className={`shrink-0 mt-0.5 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${cfg.chip}`}>
                <i className={`fas ${cfg.icon} mr-1`} />
                {q.trigger}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 group-hover:text-indigo-700 dark:group-hover:text-indigo-300 transition-colors leading-snug">
                  {q.question}
                </p>
                {q.rationale && (
                  <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    {q.rationale}
                  </p>
                )}
              </div>
              <i className="fas fa-arrow-right text-[10px] text-slate-300 dark:text-slate-600 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 shrink-0 mt-1 transition-colors" />
            </button>
          );
        })}
      </div>
    </div>
  );
};
