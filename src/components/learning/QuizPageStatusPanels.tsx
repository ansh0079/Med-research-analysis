import React from 'react';
import type { LearningProfile, UserTopicMemory } from '@types';
import { MemoryDetailBadge } from '@components/learning/QuizWidgets';

export function QuizPageHeader({
  activeTopic,
  lockedArticleCount,
  singlePaperMode,
  fromDataset,
  trainingStage,
  isAuthenticated,
  topicMemory,
  effectiveExplanationDepth,
  curriculumTopicId,
  workflowContext,
  onBack,
  onExplainDepthChange,
}: {
  activeTopic: string;
  lockedArticleCount: number;
  singlePaperMode?: boolean;
  fromDataset: boolean;
  trainingStage: NonNullable<LearningProfile['trainingStage']>;
  isAuthenticated: boolean;
  topicMemory: UserTopicMemory | null;
  effectiveExplanationDepth: string;
  curriculumTopicId?: number;
  workflowContext: Record<string, unknown>;
  onBack: () => void;
  onExplainDepthChange: (depth: string) => void;
}) {
  return (
    <header className="w-full pt-[calc(var(--nav-h)+1.5rem)] pb-16 px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/5 to-purple-600/5 -z-10" />
      <div className="max-w-3xl mx-auto">
        <button type="button" onClick={onBack}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-900 dark:hover:text-white text-sm font-medium transition-colors mb-8">
          <i className="fas fa-arrow-left" /> Back to results
        </button>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200 dark:shadow-indigo-900/40">
            <i className="fas fa-brain text-white text-xl" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">Test yourself</h1>
            <p className="text-sm text-indigo-500 font-semibold capitalize">{activeTopic}</p>
            {lockedArticleCount === 1 && singlePaperMode && (
              <span className="mt-1 inline-block text-[10px] font-bold uppercase tracking-widest text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20 px-2 py-0.5 rounded-full">
                <i className="fas fa-file-medical mr-1" />
                Questions grounded in this paper only
              </span>
            )}
            {lockedArticleCount > 1 && (
              <span className="mt-1 inline-block text-[10px] font-bold uppercase tracking-widest text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20 px-2 py-0.5 rounded-full">
                <i className="fas fa-layer-group mr-1" />
                Grounded in top {lockedArticleCount} evidence papers from your search
              </span>
            )}
            {fromDataset && (
              <span className="mt-1 inline-block text-[10px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full">
                General medical questions · MedMCQA dataset
              </span>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Training: {String(trainingStage).replace(/_/g, ' ')}
              </span>
              {isAuthenticated && topicMemory && topicMemory.searchCount + topicMemory.topPaperCount + topicMemory.savedPaperCount > 0 && (
                <MemoryDetailBadge memory={topicMemory} />
              )}
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                Explain
                <select
                  value={effectiveExplanationDepth}
                  onChange={(e) => onExplainDepthChange(e.target.value)}
                  className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-2 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-200"
                >
                  <option value="foundation">First principles</option>
                  <option value="exam_focus">Exam focus</option>
                  <option value="mechanistic">Mechanistic</option>
                </select>
              </label>
              {curriculumTopicId ? (
                <span className="text-[10px] font-bold uppercase tracking-widest text-rose-500">
                  Study path topic
                </span>
              ) : null}
            </div>
            {typeof workflowContext.originalPresentation === 'string' && workflowContext.originalPresentation.trim() && (
              <div className="mt-3 max-w-2xl rounded-xl border border-cyan-200 bg-cyan-50/80 px-3 py-2 text-xs text-cyan-950/80 dark:border-cyan-900/60 dark:bg-cyan-950/20 dark:text-cyan-100/80">
                <span className="font-bold uppercase tracking-widest text-cyan-700 dark:text-cyan-300">Shift context: </span>
                {workflowContext.originalPresentation}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export function QuizSpacedRepBanner({ targetNodeCount }: { targetNodeCount: number }) {
  return (
    <div className="mb-4 rounded-xl border border-violet-200 dark:border-violet-700/40 bg-violet-50 dark:bg-violet-950/20 px-4 py-3 flex items-center gap-3">
      <i className="fas fa-rotate text-violet-500 dark:text-violet-400 shrink-0" />
      <div className="min-w-0">
        <p className="text-sm font-bold text-violet-800 dark:text-violet-200">Spaced repetition session</p>
        <p className="text-xs text-violet-600 dark:text-violet-400 mt-0.5">
          Targeting {targetNodeCount} concept{targetNodeCount === 1 ? '' : 's'} due for review.
          Completing this session will reschedule them.
        </p>
      </div>
    </div>
  );
}

export function QuizGeneratingPanel() {
  return (
    <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 p-12 text-center shadow-sm">
      <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
      <p className="text-slate-500 dark:text-slate-400 font-medium">Generating questions from your research…</p>
      <p className="text-xs text-slate-400 mt-1">Includes recall, clinical application, and trial interpretation questions</p>
    </div>
  );
}

export function QuizErrorPanel({
  genError,
  genErrorCode,
  activeTopic,
  manualTopic,
  hasEvidenceSnippets,
  urlClaimJobKey,
  onManualTopicChange,
  onStartManualQuiz,
  onRetry,
  onQuizFromEvidence,
}: {
  genError: string;
  genErrorCode: string | null;
  activeTopic: string;
  manualTopic: string;
  hasEvidenceSnippets: boolean;
  urlClaimJobKey?: string;
  onManualTopicChange: (value: string) => void;
  onStartManualQuiz: () => void;
  onRetry: () => void;
  onQuizFromEvidence: () => void;
}) {
  return (
    <div className="rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-8 text-center">
      <i className="fas fa-exclamation-circle text-3xl text-red-500 mb-3 block" />
      <p className="text-red-700 dark:text-red-300 font-medium mb-4">{genError}</p>
      {genErrorCode === 'CLAIMS_REQUIRED' && hasEvidenceSnippets && (
        <button
          type="button"
          onClick={onQuizFromEvidence}
          className="mb-4 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm transition-colors"
        >
          Quiz from search evidence instead
        </button>
      )}
      {genErrorCode === 'CLAIMS_REQUIRED' && (
        <p className="text-xs text-red-600 dark:text-red-400 mb-4 max-w-md mx-auto">
          Generate paper synopses or run evidence synthesis on this topic first to unlock claim-anchored questions.
        </p>
      )}
      {(genErrorCode === 'JOB_TIMEOUT' || (urlClaimJobKey && genErrorCode !== 'CLAIMS_REQUIRED')) && (
        <p className="text-xs text-red-600 dark:text-red-400 mb-4">
          Teaching claims are still generating. Wait a moment, then try again.
        </p>
      )}
      {(!activeTopic || activeTopic.trim().length < 2) ? (
        <div className="mx-auto max-w-md">
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={manualTopic}
              onChange={(e) => onManualTopicChange(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') onStartManualQuiz(); }}
              placeholder="Enter a topic, e.g. sepsis"
              className="flex-1 rounded-xl border border-red-200 dark:border-red-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-red-400"
            />
            <button
              type="button"
              disabled={manualTopic.trim().length < 2}
              onClick={onStartManualQuiz}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-bold text-sm transition-colors"
            >
              Start quiz
            </button>
          </div>
          <p className="mt-3 text-xs text-red-500 dark:text-red-300">
            You can quiz a topic directly; linked study runs add outline gap tracking when available.
          </p>
        </div>
      ) : (
        <button type="button" onClick={onRetry}
          className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-sm transition-colors">
          Try again
        </button>
      )}
    </div>
  );
}
