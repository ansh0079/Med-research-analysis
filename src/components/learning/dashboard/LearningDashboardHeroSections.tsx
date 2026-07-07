import React from 'react';
import type { LearningDashboard as LearningDashboardType } from '@types';
import { STARTER_TOPIC_SETS } from '../../../utils/learningDashboardConstants';

export function FsrsDueBanner({
  dueCardCount,
  onReviewClick,
}: {
  dueCardCount: number;
  onReviewClick: () => void;
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
        onClick={onReviewClick}
        className="shrink-0 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors"
      >
        Review now
      </button>
    </div>
  );
}

export function StartTopicReviewCard({
  startTopic,
  pendingStartTopic,
  activeRuns = [] as NonNullable<LearningDashboardType['activeRuns']>,
  onStartTopicChange,
  onStartReview,
  onRunClick,
}: {
  startTopic: string;
  pendingStartTopic: string | null;
  activeRuns: NonNullable<LearningDashboardType['activeRuns']>;
  onStartTopicChange: (value: string) => void;
  onStartReview: (topicOverride?: string) => void;
  onRunClick: (runId: number) => void;
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
                  onClick={() => onRunClick(run.id)}
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

export function CurriculaOverviewCard({
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
