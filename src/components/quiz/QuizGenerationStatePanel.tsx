import React from 'react';

export function QuizGenerationStatePanel({
  generating,
  genError,
  genErrorCode,
  hasEvidenceSnippets,
  hasClaimJobKey,
  activeTopic,
  manualTopic,
  onManualTopicChange,
  onManualStart,
  onLoadQuiz,
}: {
  generating: boolean;
  genError: string | null;
  genErrorCode: string | null;
  hasEvidenceSnippets: boolean;
  hasClaimJobKey: boolean;
  activeTopic: string;
  manualTopic: string;
  onManualTopicChange: (topic: string) => void;
  onManualStart: () => void;
  onLoadQuiz: () => void;
}) {
  if (generating) {
    return (
      <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 p-12 text-center shadow-sm">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-500 dark:text-slate-400 font-medium">Generating questions from your research...</p>
        <p className="text-xs text-slate-400 mt-1">Includes recall, clinical application, and trial interpretation questions</p>
      </div>
    );
  }

  if (!genError) return null;

  const needsManualTopic = !activeTopic || activeTopic.trim().length < 2;
  const canStartManualQuiz = manualTopic.trim().length >= 2;

  return (
    <div className="rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-8 text-center">
      <i className="fas fa-exclamation-circle text-3xl text-red-500 mb-3 block" />
      <p className="text-red-700 dark:text-red-300 font-medium mb-4">{genError}</p>
      {genErrorCode === 'CLAIMS_REQUIRED' && hasEvidenceSnippets && (
        <button
          type="button"
          onClick={onLoadQuiz}
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
      {(genErrorCode === 'JOB_TIMEOUT' || (hasClaimJobKey && genErrorCode !== 'CLAIMS_REQUIRED')) && (
        <p className="text-xs text-red-600 dark:text-red-400 mb-4">
          Teaching claims are still generating. Wait a moment, then try again.
        </p>
      )}
      {needsManualTopic ? (
        <div className="mx-auto max-w-md">
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={manualTopic}
              onChange={(event) => onManualTopicChange(event.target.value)}
              onKeyDown={(event) => { if (event.key === 'Enter') onManualStart(); }}
              placeholder="Enter a topic, e.g. sepsis"
              className="flex-1 rounded-xl border border-red-200 dark:border-red-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-red-400"
            />
            <button
              type="button"
              disabled={!canStartManualQuiz}
              onClick={onManualStart}
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
        <button type="button" onClick={onLoadQuiz}
          className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-sm transition-colors">
          Try again
        </button>
      )}
    </div>
  );
}
