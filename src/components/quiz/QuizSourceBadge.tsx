import React from 'react';

export const QuizSourceBadge: React.FC<{ label: string }> = ({ label }) => {
  const config: Record<string, { cls: string; icon: string }> = {
    Trial: { cls: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300', icon: 'fa-flask' },
    Guideline: { cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300', icon: 'fa-book-medical' },
    'Topic memory': { cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300', icon: 'fa-memory' },
  };
  const c = config[label] || { cls: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400', icon: 'fa-question-circle' };
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${c.cls}`}>
      <i className={`fas ${c.icon} text-[9px]`} />
      {label}
    </span>
  );
};
