import React from 'react';
import type { LearningProfile } from '@types';

export function LearningDashboardHeader({
  profile,
  onSearchClick,
}: {
  profile: LearningProfile | null;
  onSearchClick: () => void;
}) {
  return (
    <div className="mb-6 flex items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white">Topic Review</h1>
        <p className="text-sm text-slate-400 mt-0.5">
          {profile?.persona ? `${profile.persona} · ` : ''}
          Start a topic, read the map, quiz weak nodes, close the gaps
        </p>
      </div>
      <button
        type="button"
        onClick={onSearchClick}
        className="shrink-0 flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
      >
        <i className="fas fa-search" /> Search papers
      </button>
    </div>
  );
}

export function LearningDashboardLoadingState() {
  return (
    <div className="min-h-screen aurora-bg flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  );
}

export function LearningDashboardErrorState({ error }: { error: string }) {
  return (
    <div className="min-h-screen aurora-bg flex items-center justify-center px-4">
      <div className="text-center">
        <i className="fas fa-exclamation-circle text-3xl text-red-400 mb-3 block" />
        <p className="text-red-500 font-semibold mb-2">{error}</p>
        <button type="button" onClick={() => window.location.reload()} className="text-sm text-indigo-600 hover:underline">Retry</button>
      </div>
    </div>
  );
}
