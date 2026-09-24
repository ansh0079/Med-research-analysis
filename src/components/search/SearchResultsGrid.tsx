import React from 'react';
import { ArticleCard } from '@components/search/ArticleCard';
import { ResearchWorkspace } from '@components/search/ResearchWorkspace';
import { Button } from '@components/ui/Button';
import type { PdfLayout } from '@hooks/usePdfViewer';
import type { Article, EvidenceLaneKey, SearchPack } from '@types';

const LANE_ORDER: EvidenceLaneKey[] = ['guidelines', 'landmark_trials', 'reviews', 'supporting'];

interface SearchResultsGridProps {
  layout: PdfLayout;
  isPdfOpen: boolean;
  onToggleLayout: () => void;
  onClosePdf: () => void;
  activePdf: string | null;
  renderedResults: Article[];
  evidenceLane?: EvidenceLaneKey | 'all';
  searchPack?: SearchPack | null;
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

function ArticleGrid({
  articles,
  activeResultIndex,
  offset = 0,
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
}: {
  articles: Article[];
  activeResultIndex: number;
  offset?: number;
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
}) {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {articles.map((article, index) => (
        <div
          key={article.uid}
          className={offset + index === activeResultIndex ? 'rounded-2xl ring-2 ring-indigo-400/70 ring-offset-2 ring-offset-transparent' : ''}
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
  );
}

export const SearchResultsGrid: React.FC<SearchResultsGridProps> = ({
  layout,
  isPdfOpen,
  onToggleLayout,
  onClosePdf,
  activePdf,
  renderedResults,
  evidenceLane = 'all',
  searchPack = null,
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
}) => {
  const cardProps = {
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
  };
  const grouped = evidenceLane === 'all' && renderedResults.some((article) => article._evidenceLane);

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
      {grouped ? (
        <div className="space-y-8">
          {LANE_ORDER.map((laneKey) => {
            const laneArticles = renderedResults.filter((article) => (article._evidenceLane || 'supporting') === laneKey);
            const laneMeta = searchPack?.lanes?.[laneKey];
            return (
              <section key={laneKey}>
                <h2 className="mb-3 text-sm font-black uppercase tracking-wider text-slate-500">
                  {laneMeta?.label || laneKey.replace('_', ' ')}
                  <span className="ml-2 font-mono text-[11px] opacity-70">{laneArticles.length}</span>
                </h2>
                {laneArticles.length > 0 ? (
                  <ArticleGrid
                    articles={laneArticles}
                    activeResultIndex={activeResultIndex}
                    offset={renderedResults.indexOf(laneArticles[0])}
                    {...cardProps}
                  />
                ) : (
                  <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                    {laneMeta?.emptyState || 'No papers in this lane.'}
                  </p>
                )}
              </section>
            );
          })}
        </div>
      ) : (
        <ArticleGrid
          articles={renderedResults}
          activeResultIndex={activeResultIndex}
          {...cardProps}
        />
      )}
      {visibleCount < visibleResultsLength && (
        <div className="mt-6 flex justify-center">
          <Button variant="secondary" onClick={onLoadMore}>
            Load more results ({visibleResultsLength - visibleCount} remaining)
          </Button>
        </div>
      )}
    </ResearchWorkspace>
  );
};
