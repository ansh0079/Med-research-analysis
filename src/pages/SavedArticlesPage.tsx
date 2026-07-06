import React, { useState } from 'react';
import { useSearchContext } from '@contexts/SearchContext';
import { ArticleCard } from '@components/search/ArticleCard';
import { AIAnalysisPanel } from '@components/search/AIAnalysisPanel';
import { ArticleDetailDrawer } from '@components/search/ArticleDetailDrawer';
import { Button } from '@components/ui/Button';
import api from '@services/api';
import { usePdfViewer } from '@hooks/usePdfViewer';
import { downloadText, toCslJson, toRIS, toWordSummaryHtml } from '@services/exportArticles';
import type { Article } from '@types';

export const SavedArticlesPage: React.FC = () => {
  const { savedArticles, toggleSaveArticle, setCurrentPage, isSelected, toggleSelectArticle } = useSearchContext();
  const [activeArticle, setActiveArticle] = useState<Article | null>(null);
  const [detailArticle, setDetailArticle] = useState<Article | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const { activePdf, isOpen, layout, openPdf, closePdf, toggleLayout } = usePdfViewer();

  const handleExportBibTeX = async () => {
    if (savedArticles.length === 0) return;
    setIsExporting(true);
    try {
      const bibtex = await api.documents.exportBibTeX(savedArticles);
      const blob = new Blob([bibtex], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `research_collection_${new Date().toISOString().split('T')[0]}.bib`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      setExportError('Failed to export BibTeX. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const exportLocal = (format: 'ris' | 'csl' | 'doc') => {
    const stamp = new Date().toISOString().split('T')[0];
    if (format === 'ris') downloadText(`research_collection_${stamp}.ris`, toRIS(savedArticles));
    if (format === 'csl') downloadText(`research_collection_${stamp}.json`, toCslJson(savedArticles), 'application/json');
    if (format === 'doc') downloadText(`research_summary_${stamp}.doc`, toWordSummaryHtml(savedArticles), 'application/msword');
  };

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="w-full pt-10 pb-16 px-4 bg-gray-50 dark:bg-slate-900/50">
        <div className="max-w-7xl mx-auto">
          <button
            onClick={() => setCurrentPage('search')}
            className="flex items-center gap-2 text-gray-500 hover:text-indigo-600 font-bold text-xs uppercase tracking-widest mb-6 transition-colors"
          >
            <i className="fas fa-arrow-left" /> Back to Search
          </button>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
                <i className="fas fa-bookmark text-white text-xl" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-gray-900 dark:text-white">Research Library</h1>
                <p className="text-sm text-gray-500">{savedArticles.length} papers curated in this session</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              {exportError && (
                <div className="w-full">
                  <span className="text-xs text-red-600 dark:text-red-400">{exportError}</span>
                </div>
              )}
              <Button
                variant="secondary"
                size="sm"
                onClick={() => { setExportError(null); handleExportBibTeX(); }}
                isLoading={isExporting}
                leftIcon={<i className="fas fa-file-export" />}
              >
                Export BibTeX
              </Button>
              <Button variant="secondary" size="sm" onClick={() => exportLocal('ris')} leftIcon={<i className="fas fa-file-alt" />}>
                RIS
              </Button>
              <Button variant="secondary" size="sm" onClick={() => exportLocal('csl')} leftIcon={<i className="fas fa-quote-right" />}>
                CSL-JSON
              </Button>
              <Button variant="secondary" size="sm" onClick={() => exportLocal('doc')} leftIcon={<i className="fas fa-file-word" />}>
                Word
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setCurrentPage('search')}
                leftIcon={<i className="fas fa-plus" />}
              >
                Find More
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 mt-8">
        {savedArticles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {savedArticles.map((article) => (
              <ArticleCard
                key={article.uid}
                article={article}
                isSaved={true}
                isSelected={isSelected(article.uid)}
                onSave={toggleSaveArticle}
                onSelect={toggleSelectArticle}
                onAnalyze={setActiveArticle}
                onOpenInWorkspace={openPdf}
                onViewDetails={setDetailArticle}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-32 bg-white dark:bg-slate-800 rounded-3xl border-2 border-dashed border-gray-200 dark:border-slate-700">
            <div className="w-16 h-16 bg-gray-50 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
              <i className="fas fa-folder-open text-2xl" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Your library is empty</h3>
            <p className="text-sm text-gray-500 max-w-xs mx-auto mt-2 mb-6">
              Save articles from search results to build your research collection and generate synthesis reports.
            </p>
            <Button variant="primary" onClick={() => setCurrentPage('search')}>
              Start Searching
            </Button>
          </div>
        )}
      </main>

      {/* PDF split workspace */}
      {isOpen && activePdf && (
        <div className={`fixed inset-0 z-50 flex ${layout === 'split' ? 'flex-row' : 'flex-col'} bg-white dark:bg-slate-900`}>
          <div className={layout === 'split' ? 'flex-1 overflow-y-auto' : 'h-1/2 overflow-y-auto'}>
            <div className="p-4">
              <Button variant="secondary" size="sm" onClick={closePdf} leftIcon={<i className="fas fa-times" />}>
                Close Workspace
              </Button>
              <Button variant="secondary" size="sm" onClick={toggleLayout} leftIcon={<i className="fas fa-columns" />}>
                {layout === 'split' ? 'Stack' : 'Side by side'}
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 px-4">
              {savedArticles.map((article) => (
                <ArticleCard
                  key={article.uid}
                  article={article}
                  isSaved={true}
                  isSelected={isSelected(article.uid)}
                  onSave={toggleSaveArticle}
                  onSelect={toggleSelectArticle}
                  onAnalyze={setActiveArticle}
                  onOpenInWorkspace={openPdf}
                  onViewDetails={setDetailArticle}
                />
              ))}
            </div>
          </div>
          <div className={`${layout === 'split' ? 'w-1/2' : 'h-1/2'} border-l border-gray-200 dark:border-slate-700 flex flex-col`}>
            <iframe
              src={activePdf}
              title="Article PDF"
              className="flex-1 w-full"
            />
          </div>
        </div>
      )}

      <AIAnalysisPanel article={activeArticle} onClose={() => setActiveArticle(null)} />

      {detailArticle && (
        <ArticleDetailDrawer
          article={detailArticle}
          onClose={() => setDetailArticle(null)}
          onOpenInWorkspace={openPdf}
        />
      )}
    </div>
  );
};
