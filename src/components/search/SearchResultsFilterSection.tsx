import React from 'react';
import type { Article } from '@types';

interface SearchResultsFilterSectionProps {
  resultFilter: string;
  onResultFilterChange: (value: string) => void;
  newPaperNotice: string | null;
  recentAnalyses: Article[];
  onOpenAnalysis: (article: Article) => void;
}

export const SearchResultsFilterSection: React.FC<SearchResultsFilterSectionProps> = ({
  resultFilter,
  onResultFilterChange,
  newPaperNotice,
  recentAnalyses,
  onOpenAnalysis,
}) => (
  <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_0.7fr]">
    <div className="neo-card p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Search within results</p>
          {newPaperNotice && (
            <p className="mt-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">{newPaperNotice}</p>
          )}
        </div>
        <input
          value={resultFilter}
          onChange={(event) => onResultFilterChange(event.target.value)}
          placeholder="Filter titles, abstracts, journals..."
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white sm:w-80"
        />
      </div>
      <p className="mt-2 text-[11px] text-slate-400">
        Shortcuts: / search, j/k move, s save, a analyze.
      </p>
    </div>
    {recentAnalyses.length > 0 && (
      <div className="neo-card p-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Recently analyzed</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {recentAnalyses.slice(0, 5).map((article) => (
            <button
              key={article.uid}
              type="button"
              onClick={() => onOpenAnalysis(article)}
              className="max-w-full rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-indigo-950/40"
              title={article.title}
            >
              <span className="inline-block max-w-[13rem] truncate align-bottom">{article.title}</span>
            </button>
          ))}
        </div>
      </div>
    )}
  </div>
);
