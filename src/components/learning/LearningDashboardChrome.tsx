import React from 'react';
import type { LearningDashboard as LearningDashboardType, LearningInsight } from '@types';
import { DueReviewBadge } from '@components/learning/DailyReviewQueue';
import { InsightCard } from '@components/learning/LearningDashboardWidgets';

export type LearningDashboardTab = 'overview' | 'topics' | 'cpd' | 'portfolio' | 'settings';

export function LearningDashboardFsrsBanner({
  dueCardCount,
  onReviewNow,
}: {
  dueCardCount: number;
  onReviewNow: () => void;
}) {
  if (dueCardCount <= 0) return null;

  return (
    <div className="rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/50 p-4 flex items-center gap-4 mb-5">
      <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-900/40 flex items-center justify-center shrink-0">
        <i className="fas fa-layer-group text-rose-600 dark:text-rose-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-rose-800 dark:text-rose-300">
          {dueCardCount} card{dueCardCount > 1 ? 's' : ''} due for review
        </p>
        <p className="text-xs text-rose-600 dark:text-rose-400 truncate">
          Your spaced-repetition queue is waiting — reviewing now locks knowledge in long-term memory.
        </p>
      </div>
      <button
        type="button"
        onClick={onReviewNow}
        className="shrink-0 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors"
      >
        Review now
      </button>
    </div>
  );
}

export function LearningDashboardHighInsights({
  insights,
  onAction,
}: {
  insights: LearningInsight[];
  onAction: (insight: LearningInsight) => void;
}) {
  if (insights.length === 0) return null;

  return (
    <div className="mb-5 space-y-2">
      {insights.map((ins, i) => (
        <InsightCard key={i} insight={ins} onAction={onAction} />
      ))}
    </div>
  );
}

export function LearningDashboardCurricula({
  curricula,
  onOpenPaths,
}: {
  curricula: NonNullable<LearningDashboardType['curriculaOverview']>;
  onOpenPaths: () => void;
}) {
  if (!curricula.length) return null;

  return (
    <div className="neo-card p-5 mb-6">
      <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-3">
        <i className="fas fa-route text-rose-500" /> Exam study paths
      </h2>
      <p className="text-xs text-slate-400 mb-4">
        Structured blocks by exam stage—see how many path topics you have started and quizzed.
      </p>
      <div className="space-y-3">
        {curricula.map((c) => (
          <div
            key={c.id}
            className="rounded-xl border border-slate-100 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/40 px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{c.name}</p>
              {c.examStageLabel && (
                <p className="text-[10px] text-slate-400 mt-0.5">{c.examStageLabel}</p>
              )}
              {c.examSummary && (
                <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1 font-semibold">
                  {c.examSummary.pctTopicsTouched}% topics started
                  <span className="text-slate-400 font-normal">
                    {' '}({c.examSummary.topicsStarted}/{c.examSummary.totalTopics} · {c.examSummary.confident} confident)
                  </span>
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onOpenPaths}
              className="shrink-0 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors"
            >
              Open paths
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function LearningDashboardStatsRow({
  stats,
}: {
  stats: NonNullable<LearningDashboardType['stats']>;
}) {
  return (
    <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-6">
      {[
        { value: stats.currentStreak,    label: 'Day Streak',  icon: 'fa-fire',        color: 'text-orange-500' },
        { value: `${stats.overallAccuracy}%`, label: 'Accuracy', icon: 'fa-bullseye',  color: 'text-emerald-600' },
        { value: stats.totalQuizzes,     label: 'Questions',   icon: 'fa-brain',        color: 'text-indigo-600' },
        { value: stats.totalCases,       label: 'Cases',       icon: 'fa-stethoscope',  color: 'text-rose-500' },
        { value: stats.topicsStudied,    label: 'Topics',      icon: 'fa-layer-group',  color: 'text-amber-500' },
        { value: stats.longestStreak,    label: 'Best Streak', icon: 'fa-trophy',       color: 'text-sky-500' },
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

export function LearningDashboardDueCardButton({
  dueCardCount,
  onClick,
}: {
  dueCardCount: number;
  onClick: () => void;
}) {
  const hasDue = dueCardCount > 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full mb-6 rounded-2xl border p-4 flex items-center gap-4 transition-colors ${
        hasDue
          ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/50 hover:bg-amber-100 dark:hover:bg-amber-900/40'
          : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800/50'
      }`}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
        hasDue ? 'bg-amber-100 dark:bg-amber-900/40' : 'bg-slate-100 dark:bg-slate-800/50'
      }`}>
        <i className={`fas fa-layer-group ${
          hasDue ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400 dark:text-slate-500'
        }`} />
      </div>
      <div className="flex-1 min-w-0 text-left">
        <p className={`text-sm font-bold ${
          hasDue ? 'text-amber-800 dark:text-amber-300' : 'text-slate-600 dark:text-slate-300'
        }`}>
          {hasDue
            ? `${dueCardCount} card${dueCardCount > 1 ? 's' : ''} due for review`
            : 'No cards due for review'}
        </p>
        <p className={`text-xs truncate ${
          hasDue ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400 dark:text-slate-500'
        }`}>
          {hasDue
            ? 'Click to jump to your spaced-repetition queue'
            : 'You\'re all caught up — great work!'}
        </p>
      </div>
      <i className={`fas fa-chevron-right text-xs shrink-0 ${
        hasDue ? 'text-amber-400' : 'text-slate-300'
      }`} />
    </button>
  );
}

export function LearningDashboardTabs({
  activeTab,
  onTabChange,
}: {
  activeTab: LearningDashboardTab;
  onTabChange: (tab: LearningDashboardTab) => void;
}) {
  const tabs: LearningDashboardTab[] = ['overview', 'topics', 'cpd', 'portfolio', 'settings'];

  return (
    <div className="flex gap-1 mb-5 border-b border-slate-200 dark:border-slate-700">
      {tabs.map((tab) => (
        <button
          key={tab}
          type="button"
          onClick={() => onTabChange(tab)}
          className={`px-4 py-2 text-xs font-bold capitalize transition-colors border-b-2 -mb-px ${
            activeTab === tab
              ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          {tab === 'settings' ? <><i className="fas fa-sliders-h mr-1" />Profile</>
            : tab === 'cpd' ? <><i className="fas fa-file-medical-alt mr-1" />CPD<DueReviewBadge /></>
            : tab === 'portfolio' ? <><i className="fas fa-folder-open mr-1" />Portfolio</>
            : tab.charAt(0).toUpperCase() + tab.slice(1)}
        </button>
      ))}
    </div>
  );
}

export function LearningDashboardEmptyState({
  onStartReview,
}: {
  onStartReview: () => void;
}) {
  return (
    <div className="neo-card p-10 text-center">
      <i className="fas fa-graduation-cap text-4xl text-indigo-300 mb-4 block" />
      <h2 className="text-lg font-bold text-slate-700 dark:text-slate-200 mb-2">No study data yet</h2>
      <p className="text-sm text-slate-400 mb-6">Start a topic review from the box above, or jump straight into a quiz from a topic name.</p>
      <button
        type="button"
        onClick={onStartReview}
        className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-colors"
      >
        <i className="fas fa-play mr-2" /> Start a review
      </button>
    </div>
  );
}
