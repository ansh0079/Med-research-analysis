import { Button } from '@components/ui/Button';
import type { ReviewProject } from '@types';

export function ReviewSetupCard({
  review,
  question,
  inclusionText,
  exclusionText,
  loading,
  error,
  liveNote,
  onQuestionChange,
  onInclusionChange,
  onExclusionChange,
  onCreateReview,
  onResetReview,
}: {
  review: ReviewProject | null;
  question: string;
  inclusionText: string;
  exclusionText: string;
  loading: boolean;
  error: string | null;
  liveNote: string | null;
  onQuestionChange: (value: string) => void;
  onInclusionChange: (value: string) => void;
  onExclusionChange: (value: string) => void;
  onCreateReview: () => void;
  onResetReview: () => void;
}) {
  return (
    <div className="neo-card rounded-2xl p-4 space-y-3">
      {review && (
        <div className="flex items-center justify-between gap-2 mb-1">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Active Review</p>
            <p className="text-sm font-bold text-indigo-700 dark:text-indigo-300">{review.title}</p>
          </div>
          <button type="button" onClick={onResetReview}
            className="text-xs text-slate-400 hover:text-slate-600 transition-colors">
            <i className="fas fa-times mr-1" aria-hidden="true" />New
          </button>
        </div>
      )}
      <input
        className="w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
        placeholder="Review question (PICO-style)"
        value={question}
        onChange={(e) => onQuestionChange(e.target.value)}
        disabled={!!review}
      />
      <div className="grid md:grid-cols-2 gap-3">
        <textarea
          className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 min-h-[100px] text-sm"
          placeholder="Inclusion criteria (one per line)"
          value={inclusionText}
          onChange={(e) => onInclusionChange(e.target.value)}
          disabled={!!review}
        />
        <textarea
          className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 min-h-[100px] text-sm"
          placeholder="Exclusion criteria (one per line)"
          value={exclusionText}
          onChange={(e) => onExclusionChange(e.target.value)}
          disabled={!!review}
        />
      </div>
      {!review && (
        <Button variant="gradient" onClick={onCreateReview} isLoading={loading} disabled={!question.trim()}>
          <i className="fas fa-plus text-[10px] mr-1.5" aria-hidden="true" />Create Review
        </Button>
      )}
      {error && <p className="text-sm text-red-600 dark:text-red-300">{error}</p>}
      {liveNote && (
        <p className="text-sm text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
          <i className="fas fa-users text-xs" aria-hidden="true" /> {liveNote}
        </p>
      )}
    </div>
  );
}
