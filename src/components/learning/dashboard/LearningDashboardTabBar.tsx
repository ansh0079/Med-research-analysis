import React from 'react';
import { DueReviewBadge } from '@components/learning/DailyReviewQueue';
import type { LearningDashboardTab } from '../../../utils/learningDashboardConstants';

export function LearningDashboardTabBar({
  activeTab,
  onTabChange,
}: {
  activeTab: LearningDashboardTab;
  onTabChange: (tab: LearningDashboardTab) => void;
}) {
  return (
    <div className="flex gap-1 mb-5 border-b border-slate-200 dark:border-slate-700">
      {(['overview', 'topics', 'cpd', 'portfolio', 'settings'] as const).map((tab) => (
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

export function LearningDashboardEmptyState({ onStartReview }: { onStartReview: () => void }) {
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
