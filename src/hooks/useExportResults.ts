import React from 'react';
import { downloadText, toBibTeX, toCslJson, toRIS, toWordSummaryHtml } from '@services/exportArticles';
import type { Article } from '@types';

export function useExportResults({
  currentQuery,
  selectedArticles,
  visibleResults,
}: {
  currentQuery: string;
  selectedArticles: Article[];
  visibleResults: Article[];
}) {
  const exportResults = React.useCallback(
    (format: 'bibtex' | 'ris' | 'csl' | 'doc') => {
      const articles = selectedArticles.length ? selectedArticles : visibleResults;
      const stamp = new Date().toISOString().split('T')[0];
      const base = `search_results_${stamp}`;
      if (format === 'bibtex') downloadText(`${base}.bib`, toBibTeX(articles));
      if (format === 'ris') downloadText(`${base}.ris`, toRIS(articles));
      if (format === 'csl') downloadText(`${base}.json`, toCslJson(articles), 'application/json');
      if (format === 'doc') downloadText(`${base}.doc`, toWordSummaryHtml(articles, currentQuery || 'Search Results'), 'application/msword');
    },
    [currentQuery, selectedArticles, visibleResults],
  );

  return { exportResults };
}
