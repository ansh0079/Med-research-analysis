import React from 'react';
import type { SearchFilters } from '@types';

interface Props {
  query: string;
  filters: SearchFilters;
  onRelax: (next: SearchFilters) => void;
  onRetry: (query: string) => void;
}

const SPECIFICITY_LABEL: Record<string, string> = {
  strict: 'Strict',
  moderate: 'Balanced',
  broad: 'Broad',
};

/** "…"Practice Guideline"[Publication Type]" → "Practice Guideline" */
function studyTypeLabel(raw: string): string {
  const match = String(raw || '').match(/"([^"]+)"/);
  return match ? match[1] : String(raw || '');
}

/**
 * Shown when a search completed and matched nothing.
 *
 * Previously this rendered SearchEmptyState -- the cold-start panel of example
 * queries -- so a zero-result search looked identical to never having searched
 * at all. A user reported it as "nothing happened" when the search had in fact
 * run correctly and legitimately matched nothing under their filters. Naming
 * the filters that narrowed it, and offering to relax them, is what makes an
 * empty result legible rather than looking broken.
 */
export const NoResultsState: React.FC<Props> = ({ query, filters, onRelax, onRetry }) => {
  const sources = filters.sources || [];
  const studyTypes = filters.studyTypes || [];
  const specificity = filters.specificity || 'moderate';

  const isStrict = specificity === 'strict';
  const hasStudyTypes = studyTypes.length > 0;
  // Study-type filters are PubMed publication-type syntax; they do nothing on
  // any other source, so a filtered search without PubMed selected narrows
  // results while being unable to apply the filter it is narrowing for.
  const pubmedMissing = hasStudyTypes && !sources.includes('pubmed');

  const relaxations: Array<{ key: string; label: string; next: SearchFilters }> = [];
  if (pubmedMissing) {
    relaxations.push({
      key: 'add-pubmed',
      label: 'Add PubMed',
      next: { ...filters, sources: [...sources, 'pubmed'] as SearchFilters['sources'] },
    });
  }
  if (isStrict) {
    relaxations.push({
      key: 'broaden',
      label: 'Use balanced matching',
      next: { ...filters, specificity: 'moderate' },
    });
  }
  if (hasStudyTypes) {
    relaxations.push({
      key: 'clear-types',
      label: 'Clear study-type filter',
      next: { ...filters, studyTypes: [] },
    });
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12 text-center">
      <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
        <i className="fas fa-search text-slate-400 text-lg" />
      </div>

      <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
        No results for “{query}”
      </h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
        The search ran successfully — these filters just didn’t match anything.
      </p>

      <div className="flex flex-wrap justify-center gap-2 mb-6">
        {sources.map((s) => (
          <span key={s} className="px-2.5 py-1 rounded-full text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            {s}
          </span>
        ))}
        <span className="px-2.5 py-1 rounded-full text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
          {SPECIFICITY_LABEL[specificity] || specificity} matching
        </span>
        {studyTypes.map((t) => (
          <span key={t} className="px-2.5 py-1 rounded-full text-xs bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300">
            {studyTypeLabel(t)}
          </span>
        ))}
      </div>

      {pubmedMissing && (
        <p className="text-xs text-amber-700 dark:text-amber-300 mb-5 max-w-md mx-auto">
          Study-type filters only apply to PubMed, which isn’t selected — so this
          search was narrowed without being able to filter by type.
        </p>
      )}

      {relaxations.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2 mb-4">
          {relaxations.map(({ key, label, next }) => (
            <button
              key={key}
              type="button"
              onClick={() => onRelax(next)}
              className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-500 transition-colors"
            >
              {label}
            </button>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => onRetry(query)}
        className="text-xs text-slate-500 dark:text-slate-400 hover:text-indigo-500 underline underline-offset-4"
      >
        Search again
      </button>
    </div>
  );
};
