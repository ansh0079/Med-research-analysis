import { useCallback, useState } from 'react';
import type { Article } from '@types';

const RECENT_ANALYSES_KEY = 'med_recent_analyses';

export function useSearchPageRecentAnalyses() {
  const [recentAnalyses, setRecentAnalyses] = useState<Article[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(RECENT_ANALYSES_KEY) || '[]');
    } catch {
      return [];
    }
  });

  const openAnalysis = useCallback((article: Article) => {
    setRecentAnalyses((prev) => {
      const updated = [article, ...prev.filter((item) => item.uid !== article.uid)].slice(0, 10);
      try {
        localStorage.setItem(RECENT_ANALYSES_KEY, JSON.stringify(updated));
      } catch {
        // Ignore storage failures.
      }
      return updated;
    });
  }, []);

  return { recentAnalyses, openAnalysis };
}
