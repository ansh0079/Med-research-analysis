import React from 'react';
import { ArticleCard } from '@components/search/ArticleCard';
import { SkeletonCard } from '@components/search/SkeletonCard';
import { ResearchWorkspace } from '@components/search/ResearchWorkspace';
import { SearchEmptyState } from '@components/search/SearchEmptyState';
import { Button } from '@components/ui/Button';
import type { Article } from '@types';
import type { PdfLayout } from '@hooks/usePdfViewer';

interface SearchResultsSectionProps {
  loading: boolean;
  results: Article[];
  renderedResults: Article[];
  visibleResults: Article[];
  visibleCount: number;
  setVisibleCount: (count: number | ((prev: number) => number)) => void;
  activeResultIndex: number;
  activePdf: string | null;
  isPdfOpen: boolean;
  layout: PdfLayout;
  onToggleLayout: () => void;
  onClosePdf: () => void;
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
  searchCompletedAt?: number;
  isAuthenticated: boolean;
  onExampleClick: (query: string) => void;
}

export const SearchResultsSection: React.FC<SearchResultsSectionProps> = ({
  loading,
  results,
  renderedResults,
  visibleResults,
  visibleCount,
  setVisibleCount,
  activeResultIndex,
  activePdf,
  isPdfOpen,
  layout,
  onToggleLayout,
  onClosePdf,
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
  isAuthenticated,
  onExampleClick,
}) => {
  if (loading && results.length === 0) {
    return (
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
        {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    );
  }

  if (results.length === 0 && !loading) {
    return <SearchEmptyState onExampleClick={onExampleClick} isAuthenticated={isAuthenticated} />;
  }

  return (
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
          <div key={article.uid} className={index === activeResultIndex ? 'rounded-2xl ring-2 ring-indigo-400/70 ring-offset-2 ring-offset-transparent' : ''}>
            <ArticleCard
              key={article.uid}
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
      {visibleCount < visibleResults.length && (
        <div className="mt-6 flex justify-center">
          <Button variant="secondary" onClick={() => setVisibleCount((count) => Math.min(visibleResults.length, count + 20))}>
            Load more results ({visibleResults.length - visibleCount} remaining)
          </Button>
        </div>
      )}
    </ResearchWorkspace>
  );
};
