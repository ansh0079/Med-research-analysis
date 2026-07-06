import React from 'react';
import type { LearningDashboard as LearningDashboardType } from '@types';

export const STARTER_TOPIC_SETS = [
  { label: 'Clerkship cardio', topics: ['Acute coronary syndrome', 'Atrial fibrillation', 'Heart failure'] },
  { label: 'Acute take', topics: ['Sepsis', 'Pulmonary embolism', 'Diabetic ketoacidosis'] },
  { label: 'Respiratory ward', topics: ['Asthma exacerbation', 'COPD exacerbation', 'Pneumonia'] },
  { label: 'Exam core', topics: ['Anaemia', 'Acute kidney injury', 'Meningitis'] },
] as const;

export function LearningDashboardStartSection({
  startTopic,
  pendingStartTopic,
  activeRuns,
  onStartTopicChange,
  onStartReview,
  onOpenRun,
}: {
  startTopic: string;
  pendingStartTopic: string | null;
  activeRuns: NonNullable<LearningDashboardType['activeRuns']>;
  onStartTopicChange: (value: string) => void;
  onStartReview: (topicOverride?: string) => void;
  onOpenRun: (runId: number) => void;
}) {
  return (
    <div className="neo-card p-5 mb-6">
      <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <i className="fas fa-play-circle text-indigo-500" /> Start a guided topic review
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Choose any topic, then move through knowledge map, evidence, quiz, and gap report in one run.
          </p>
          <input
            value={startTopic}
            onChange={(e) => onStartTopicChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') void onStartReview(); }}
            placeholder="Topic, e.g. ARDS corticosteroids"
            className="mt-3 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <button
          type="button"
          disabled={pendingStartTopic !== null || startTopic.trim().length < 2}
          onClick={() => void onStartReview()}
          className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-bold transition-colors"
        >
          {pendingStartTopic !== null && pendingStartTopic === startTopic.trim()
            ? <><i className="fas fa-spinner fa-spin mr-2" />Starting...</>
            : <><i className="fas fa-play mr-2" />Start Review</>}
        </button>
      </div>
      <div className="mt-4 border-t border-slate-100 dark:border-slate-700 pt-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Quick starts</p>
        <div className="space-y-3">
          {STARTER_TOPIC_SETS.map((set) => (
            <div key={set.label} className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300 sm:w-32 shrink-0">{set.label}</span>
              <div className="flex flex-wrap gap-2">
                {set.topics.map((topic) => (
                  <button
                    key={topic}
                    type="button"
                    disabled={pendingStartTopic !== null}
                    onClick={() => void onStartReview(topic)}
                    className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:border-indigo-300 hover:text-indigo-600 disabled:opacity-50 transition-colors inline-flex items-center gap-1.5"
                  >
                    {pendingStartTopic === topic ? <i className="fas fa-circle-notch fa-spin text-[10px]" aria-hidden /> : null}
                    {topic}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      {activeRuns.length > 0 && (
        <div className="mt-4 space-y-2">
          {activeRuns.slice(0, 4).map((run) => {
            const total = Number(run.progress?.totalNodes || Object.keys(run.nodeCoverage || {}).length || 0);
            const covered = Number(run.progress?.coveredNodes || Object.values(run.nodeCoverage || {}).filter((n) => n.seen).length || 0);
            return (
              <div key={run.id} className="rounded-xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800/50 overflow-hidden">
                <button
                  type="button"
                  onClick={() => onOpenRun(run.id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate capitalize">{run.topic}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {total > 0 ? `${covered}/${total} nodes covered` : 'Run ready'} · {new Date(run.lastActiveAt).toLocaleDateString()}
                    </p>
                  </div>
                  <i className="fas fa-arrow-right text-slate-300 text-[10px] shrink-0" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
