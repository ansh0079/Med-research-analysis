import React from 'react';

interface PracticeAlertCardProps {
  objectKey: string;
  title: string;
  rationale?: string | null;
  /** Optional topic label shown below the title */
  topic?: string | null;
  /** If provided, renders a "Quiz" action button */
  onQuiz?: () => void;
}

/**
 * Card displaying a single practice-changing evidence alert.
 * Used in both TopicPage and LearningDashboardPage.
 */
export function PracticeAlertCard({ objectKey, title, rationale, topic, onQuiz }: PracticeAlertCardProps) {
  return (
    <div
      key={objectKey}
      className="flex items-start gap-3 rounded-xl border border-rose-100 dark:border-rose-900/30 bg-rose-50/60 dark:bg-rose-950/20 px-3 py-2.5"
    >
      <i className="fas fa-stethoscope text-rose-400 text-xs mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 leading-snug">{title}</p>
        {topic && (
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 capitalize">{topic}</p>
        )}
        {rationale && (
          <p className="text-[10px] text-rose-600 dark:text-rose-400 mt-0.5 leading-relaxed">{rationale}</p>
        )}
      </div>
      {onQuiz && (
        <button
          type="button"
          onClick={onQuiz}
          className="shrink-0 text-[10px] font-bold px-2 py-1 rounded-lg bg-rose-100 text-rose-700 hover:bg-rose-200 dark:bg-rose-900/40 dark:text-rose-300 transition-colors"
        >
          Quiz
        </button>
      )}
    </div>
  );
}
