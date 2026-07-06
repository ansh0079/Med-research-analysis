import { useEffect } from 'react';
import type { Article } from '@types';

interface UseSearchPageKeyboardOptions {
  visibleResults: Article[];
  activeResultIndex: number;
  setActiveResultIndex: (idx: number | ((prev: number) => number)) => void;
  toggleSaveArticle: (article: Article) => void;
  openAnalysis: (article: Article) => void;
}

export function useSearchPageKeyboard({
  visibleResults,
  activeResultIndex,
  setActiveResultIndex,
  toggleSaveArticle,
  openAnalysis,
}: UseSearchPageKeyboardOptions) {
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable;
      if (event.key === '/' && !isTyping) {
        event.preventDefault();
        window.dispatchEvent(new Event('medsearch:focus-search'));
      }
      if (isTyping || visibleResults.length === 0) return;
      if (event.key === 'j') {
        event.preventDefault();
        setActiveResultIndex((idx) => Math.min(visibleResults.length - 1, idx + 1));
      }
      if (event.key === 'k') {
        event.preventDefault();
        setActiveResultIndex((idx) => Math.max(0, idx - 1));
      }
      if (event.key === 's') {
        event.preventDefault();
        void toggleSaveArticle(visibleResults[activeResultIndex]);
      }
      if (event.key === 'a') {
        event.preventDefault();
        openAnalysis(visibleResults[activeResultIndex]);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [activeResultIndex, openAnalysis, setActiveResultIndex, toggleSaveArticle, visibleResults]);
}
