import React from 'react';
const AIAnalysisPanel = React.lazy(() => import('@components/search/AIAnalysisPanel').then(m => ({ default: m.AIAnalysisPanel })));
import { ArticleDetailDrawer } from '@components/search/ArticleDetailDrawer';
import { ComparisonView } from '@components/search/ComparisonView';
import { SelectionBasket } from '@components/search/SelectionBasket';
import type { Article } from '@types';

interface SearchOverlaysProps {
  activeArticle: Article | null;
  onCloseAIPanel: () => void;
  detailArticle: Article | null;
  onCloseDetailDrawer: () => void;
  onOpenInWorkspace: (url: string) => void;
  isComparing: boolean;
  selectedArticles: Article[];
  currentQuery: string;
  onCloseComparison: () => void;
  onRemoveFromBasket: (uid: string) => void;
  onClearSelection: () => void;
}

export const SearchOverlays: React.FC<SearchOverlaysProps> = ({
  activeArticle,
  onCloseAIPanel,
  detailArticle,
  onCloseDetailDrawer,
  onOpenInWorkspace,
  isComparing,
  selectedArticles,
  currentQuery,
  onCloseComparison,
  onRemoveFromBasket,
  onClearSelection,
}) => (
  <>
    <React.Suspense fallback={null}>
      <AIAnalysisPanel key={activeArticle?.uid ?? 'none'} article={activeArticle} onClose={onCloseAIPanel} />
    </React.Suspense>

    {detailArticle && (
      <ArticleDetailDrawer
        article={detailArticle}
        onClose={onCloseDetailDrawer}
        onOpenInWorkspace={onOpenInWorkspace}
      />
    )}

    {isComparing && selectedArticles.length >= 2 && (
      <ComparisonView
        articles={[selectedArticles[0], selectedArticles[1]]}
        topic={currentQuery || undefined}
        onClose={onCloseComparison}
      />
    )}

    <SelectionBasket
      selectedArticles={selectedArticles}
      onRemove={onRemoveFromBasket}
      onClear={onClearSelection}
    />
  </>
);
