import React from 'react';
import type { Article } from '@types';

interface SearchResultsFilterSectionProps {
  newPaperNotice: string | null;
  recentAnalyses: Article[];
  onOpenAnalysis: (article: Article) => void;
}

export const SearchResultsFilterSection: React.FC<SearchResultsFilterSectionProps> = ({
  newPaperNotice,
  recentAnalyses,
  onOpenAnalysis,
}) => (
  <div className="mb-4 space-y-2">
    {newPaperNotice && (
      <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">{newPaperNotice}</p>
    )}
    {recentAnalyses.length > 0 && (
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Recently analyzed</span>
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
    )}
  </div>
);
