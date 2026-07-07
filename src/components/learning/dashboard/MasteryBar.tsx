import React from 'react';

export function MasteryBar({ label, score, color }: { label: string; score: number; color: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-medium text-slate-500 dark:text-slate-400 w-28 shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${Math.min(score, 100)}%` }} />
      </div>
      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 w-8 text-right">{score}%</span>
    </div>
  );
}
