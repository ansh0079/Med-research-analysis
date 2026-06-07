import React, { useState, useMemo, useEffect } from 'react';
import type { Article } from '@types';

export type ResultLens = 'all' | 'open_access' | 'high_quality' | 'recent' | 'practice_changing';

export function useResultsFilter(results: Article[]) {
  const [resultFilter, setResultFilter] = useState('');
  const [resultLens, setResultLens] = useState<ResultLens>('all');
  const [visibleCount, setVisibleCount] = useState(30);
  const [activeResultIndex, setActiveResultIndex] = useState(0);

  const currentYear = useMemo(() => new Date().getFullYear(), []);

  const counts = useMemo(() => {
    let openAccessCount = 0;
    let highQualityCount = 0;
    let retractedCount = 0;
    let recentCount = 0;
    let practiceChangingCount = 0;
    for (const article of results) {
      if (article.isFree || article.pmcid) openAccessCount += 1;
      if (article._quality?.grade === 'A' || article._quality?.grade === 'B') highQualityCount += 1;
      if (article._retraction?.isRetracted) retractedCount += 1;
      const year = parseInt((article.pubdate || '').slice(0, 4), 10);
      if (Number.isFinite(year) && year >= currentYear - 3) {
        recentCount += 1;
        const citations = article.pmcrefcount ?? article.citationCount ?? 0;
        if (citations >= 100) practiceChangingCount += 1;
      }
    }
    return { openAccessCount, highQualityCount, retractedCount, recentCount, practiceChangingCount };
  }, [currentYear, results]);

  const visibleResults = useMemo(() => {
    const q = resultFilter.trim().toLowerCase();
    return results.filter((article) => {
      if (resultLens === 'open_access' && !(article.isFree || article.pmcid)) return false;
      if (resultLens === 'high_quality' && !(article._quality?.grade === 'A' || article._quality?.grade === 'B')) return false;
      if (resultLens === 'recent') {
        const year = parseInt((article.pubdate || '').slice(0, 4), 10);
        if (!Number.isFinite(year) || year < currentYear - 3) return false;
      }
      if (resultLens === 'practice_changing') {
        const year = parseInt((article.pubdate || '').slice(0, 4), 10);
        const citations = article.pmcrefcount ?? article.citationCount ?? 0;
        if (!Number.isFinite(year) || year < currentYear - 3 || citations < 100) return false;
      }
      if (!q) return true;
      return [
        article.title,
        article.abstract,
        article.journal,
        article.source,
        article.authors?.map((author) => author.name).join(' '),
      ].filter(Boolean).join(' ').toLowerCase().includes(q);
    });
  }, [currentYear, results, resultFilter, resultLens]);

  const renderedResults = useMemo(() => visibleResults.slice(0, visibleCount), [visibleCount, visibleResults]);

  useEffect(() => {
    setActiveResultIndex(0);
    setVisibleCount(30);
  }, [resultFilter, resultLens, results.length]);

  // Infinite scroll
  useEffect(() => {
    if (visibleCount >= visibleResults.length) return;
    const onScroll = () => {
      const remaining = document.documentElement.scrollHeight - (window.scrollY + window.innerHeight);
      if (remaining < 900) setVisibleCount((count) => Math.min(visibleResults.length, count + 20));
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [visibleCount, visibleResults.length]);

  const resetForNewSearch = React.useCallback(() => {
    setResultFilter('');
    setResultLens('all');
    setVisibleCount(30);
  }, []);

  return {
    resultFilter,
    setResultFilter,
    resultLens,
    setResultLens,
    visibleResults,
    renderedResults,
    visibleCount,
    setVisibleCount,
    activeResultIndex,
    setActiveResultIndex,
    ...counts,
    resetForNewSearch,
  };
}
