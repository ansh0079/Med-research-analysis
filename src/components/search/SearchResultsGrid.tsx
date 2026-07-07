import React from 'react';
import { ArticleCard } from '@components/search/ArticleCard';
import { ResearchWorkspace } from '@components/search/ResearchWorkspace';
import { Button } from '@components/ui/Button';
import type { PdfLayout } from '@hooks/usePdfViewer';
import type { Article } from '@types';

interface SearchResultsGridProps {
  layout: PdfLayout;
  isPdfOpen: boolean;
  onToggleLayout: () => void;
  onClosePdf: () => void;
  activePdf: string | null;
  renderedResults: Article[];
  activeResultIndex: number;
  visibleCount: number;
  visibleResultsLength: number;
  onLoadMore: () => void;
  isSaved: (uid: string) => boolean;
  isSelected: (uid: string) => boolean;
  onSave: (article: Article) => void;
  onSelect: (article: Article) => void;
  onAnalyze: (article: Article) => void;
  onGenerateCase: (article: Article) => void;
  onQuizPaper: (article: Article) => void;
  onOpenTopic: (query: string) => void;
  onOpenInWorkspace: (url: string) => void;
  onViewDetails: (article: Article) => void;
  searchId?: number;
  searchCompletedAt?: number | null;
}

export const SearchResultsGrid: React.FC<SearchResultsGridProps> = ({
  layout,
  isPdfOpen,
  onToggleLayout,
  onClosePdf,
  activePdf,
  renderedResults,
  activeResultIndex,
  visibleCount,
  visibleResultsLength,
  onLoadMore,
  isSaved,
  isSelected,
  onSave,
  onSelect,
  onAnalyze,
  onGenerateCase,
  onQuizPaper,
  onOpenTopic,
  onOpenInWorkspace,
  onViewDetails,
  searchId,
  searchCompletedAt,
}) => (
  <ResearchWorkspace
    layout={layout}
    isPdfOpen={isPdfOpen}
    onToggleLayout={onToggleLayout}
    onClosePdf={onClosePdf}
    pdfPanel={
      activePdf ? (
        <iframe
          title="Full text PDF or article"
          src={activePdf}
          className="h-full min-h-[60vh] w-full rounded-xl border border-gray-200 bg-white dark:border-slate-600 dark:bg-slate-900"
        />
      ) : null
    }
  >
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {renderedResults.map((article, index) => (
        <div
          key={article.uid}
          className={index === activeResultIndex ? 'rounded-2xl ring-2 ring-indigo-400/70 ring-offset-2 ring-offset-transparent' : ''}
        >
          <ArticleCard
            article={article}
            isSaved={isSaved(article.uid)}
            isSelected={isSelected(article.uid)}
            onSave={onSave}
            onSelect={onSelect}
            onAnalyze={onAnalyze}
            onGenerateCase={onGenerateCase}
            onQuizPaper={onQuizPaper}
            onOpenTopic={onOpenTopic}
            onOpenInWorkspace={onOpenInWorkspace}
            onViewDetails={onViewDetails}
            searchId={searchId}
            searchCompletedAt={searchCompletedAt}
          />
        </div>
      ))}
    </div>
    {visibleCount < visibleResultsLength && (
      <div className="mt-6 flex justify-center">
        <Button variant="secondary" onClick={onLoadMore}>
          Load more results ({visibleResultsLength - visibleCount} remaining)
        </Button>
      </div>
    )}
  </ResearchWorkspace>
);
