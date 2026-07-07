import React from 'react';
import type { LearningDashboard as LearningDashboardType } from '@types';

export function DashboardStatsRow({ stats }: { stats: NonNullable<LearningDashboardType['stats']> }) {
  return (
    <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-6">
      {[
        { value: stats.currentStreak, label: 'Day Streak', icon: 'fa-fire', color: 'text-orange-500' },
        { value: `${stats.overallAccuracy}%`, label: 'Accuracy', icon: 'fa-bullseye', color: 'text-emerald-600' },
        { value: stats.totalQuizzes, label: 'Questions', icon: 'fa-brain', color: 'text-indigo-600' },
        { value: stats.totalCases, label: 'Cases', icon: 'fa-stethoscope', color: 'text-rose-500' },
        { value: stats.topicsStudied, label: 'Topics', icon: 'fa-layer-group', color: 'text-amber-500' },
        { value: stats.longestStreak, label: 'Best Streak', icon: 'fa-trophy', color: 'text-sky-500' },
      ].map(({ value, label, icon, color }) => (
        <div key={label} className="neo-card p-4 text-center">
          <i className={`fas ${icon} ${color} text-lg mb-1 block`} />
          <div className="text-xl font-black text-slate-800 dark:text-white">{value}</div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-0.5">{label}</div>
        </div>
      ))}
    </div>
  );
}

export function SpacedRepDueButton({
  dueCardCount,
  onClick,
}: {
  dueCardCount: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full mb-6 rounded-2xl border p-4 flex items-center gap-4 transition-colors ${
        dueCardCount > 0
          ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/50 hover:bg-amber-100 dark:hover:bg-amber-900/40'
          : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800/50'
      }`}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
        dueCardCount > 0
          ? 'bg-amber-100 dark:bg-amber-900/40'
          : 'bg-slate-100 dark:bg-slate-800/50'
      }`}>
        <i className={`fas fa-layer-group ${
          dueCardCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400 dark:text-slate-500'
        }`} />
      </div>
      <div className="flex-1 min-w-0 text-left">
        <p className={`text-sm font-bold ${
          dueCardCount > 0 ? 'text-amber-800 dark:text-amber-300' : 'text-slate-600 dark:text-slate-300'
        }`}>
          {dueCardCount > 0
            ? `${dueCardCount} card${dueCardCount > 1 ? 's' : ''} due for review`
            : 'No cards due for review'}
        </p>
        <p className={`text-xs truncate ${
          dueCardCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400 dark:text-slate-500'
        }`}>
          {dueCardCount > 0
            ? 'Click to jump to your spaced-repetition queue'
            : 'You\'re all caught up — great work!'}
        </p>
      </div>
      <i className={`fas fa-chevron-right text-xs shrink-0 ${
        dueCardCount > 0 ? 'text-amber-400' : 'text-slate-300'
      }`} />
    </button>
  );
}
