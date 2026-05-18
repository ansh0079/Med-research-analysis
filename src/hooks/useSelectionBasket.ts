import { useState, useCallback, useRef, useEffect } from 'react';
import type { Article } from '@types';

interface UseSelectionBasketOptions {
  onLimitReached?: () => void;
}

export const useSelectionBasket = (options?: UseSelectionBasketOptions) => {
  const [selectedArticles, setSelectedArticles] = useState<Article[]>([]);
  const onLimitReachedRef = useRef(options?.onLimitReached);

  useEffect(() => {
    onLimitReachedRef.current = options?.onLimitReached;
  });

  const toggleArticle = useCallback((article: Article) => {
    setSelectedArticles((prev) => {
      const exists = prev.find((a) => a.uid === article.uid);
      if (exists) {
        return prev.filter((a) => a.uid !== article.uid);
      }
      // Limit to 5 articles for optimal AI synthesis performance
      if (prev.length >= 5) {
        onLimitReachedRef.current?.();
        return prev;
      }
      return [...prev, article];
    });
  }, []);

  const removeArticle = useCallback((uid: string) => {
    setSelectedArticles((prev) => prev.filter((a) => a.uid !== uid));
  }, []);

  const clearBasket = useCallback(() => setSelectedArticles([]), []);

  const isSelected = useCallback(
    (uid: string) => selectedArticles.some((a) => a.uid === uid),
    [selectedArticles]
  );

  return { selectedArticles, toggleArticle, removeArticle, clearBasket, isSelected };
};