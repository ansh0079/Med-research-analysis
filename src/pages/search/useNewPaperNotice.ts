import { useState } from 'react';

const SAVED_SEARCH_COUNTS_KEY = 'med_saved_search_counts';

export function useNewPaperNotice() {
  const [newPaperNotice, setNewPaperNotice] = useState<string | null>(null);

  const updateNewPaperNotice = (query: string, foundCount: number) => {
    try {
      const savedCounts = JSON.parse(localStorage.getItem(SAVED_SEARCH_COUNTS_KEY) || '{}') as Record<string, number>;
      const previous = savedCounts[query.toLowerCase()];
      if (typeof previous === 'number' && foundCount > previous) {
        setNewPaperNotice(`${foundCount - previous} new paper${foundCount - previous === 1 ? '' : 's'} since your last search for this query.`);
      } else {
        setNewPaperNotice(null);
      }
      savedCounts[query.toLowerCase()] = foundCount;
      localStorage.setItem(SAVED_SEARCH_COUNTS_KEY, JSON.stringify(savedCounts));
    } catch {
      setNewPaperNotice(null);
    }
  };

  return { newPaperNotice, setNewPaperNotice, updateNewPaperNotice };
}
