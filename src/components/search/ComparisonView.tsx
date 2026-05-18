import React, { useState, useEffect } from 'react';
import { api } from '@services/api';
import { Button } from '@components/ui/Button';
import type { Article } from '@types';

interface ComparisonViewProps {
  articles: [Article, Article];
  onClose: () => void;
}

export const ComparisonView: React.FC<ComparisonViewProps> = ({ articles, onClose }) => {
  const [texts, setTexts] = useState<[string, string]>(['', '']);
  const [loading, setLoading] = useState<[boolean, boolean]>([true, true]);
  const [errors, setErrors] = useState<[string | null, string | null]>([null, null]);

  const fetchFullText = async (article: Article, index: number) => {
    if (!article.doi) {
      setErrors(prev => {
        const next = [...prev] as [string | null, string | null];
        next[index] = 'No DOI available for this article.';
        return next;
      });
      setLoading(prev => {
        const next = [...prev] as [boolean, boolean];
        next[index] = false;
        return next;
      });
      return;
    }

    try {
      const { url, isFree } = await api.findFullText(article.doi);
      if (!url || !isFree) throw new Error('Open-access full text not found.');
      
      const { text } = await api.extractPdfText(url);
      setTexts(prev => {
        const next = [...prev] as [string, string];
        next[index] = text;
        return next;
      });
    } catch (err) {
      setErrors(prev => {
        const next = [...prev] as [string | null, string | null];
        next[index] = err instanceof Error ? err.message : 'Failed to extract text.';
        return next;
      });
    } finally {
      setLoading(prev => {
        const next = [...prev] as [boolean, boolean];
        next[index] = false;
        return next;
      });
    }
  };

  useEffect(() => {
    fetchFullText(articles[0], 0);
    fetchFullText(articles[1], 1);
  }, [articles]);

  return (
    <div className="fixed inset-0 bg-white dark:bg-slate-900 z-[60] flex flex-col">
      {/* Toolbar */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-800">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold text-indigo-600">Side-by-Side Comparison</h2>
          <span className="text-xs text-gray-500 font-medium bg-gray-200 dark:bg-slate-700 px-2 py-1 rounded">Full-Text Extraction Mode</span>
        </div>
        <Button variant="secondary" onClick={onClose} size="sm">
          <i className="fas fa-times mr-2" /> Close Comparison
        </Button>
      </div>

      {/* Comparison Grid */}
      <div className="flex-1 flex overflow-hidden">
        {articles.map((article, idx) => (
          <div key={article.uid} className={`flex-1 flex flex-col border-r last:border-r-0 border-gray-200 dark:border-slate-700`}>
            {/* Column Header */}
            <div className="p-4 bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800">
              <h3 className="font-bold text-gray-900 dark:text-white line-clamp-2 text-sm mb-1">{article.title}</h3>
              <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                {article.source || article.journal} • {article.year || article.pubdate}
              </p>
            </div>

            {/* Column Content */}
            <div className="flex-1 overflow-y-auto p-6 bg-white dark:bg-slate-900 custom-scrollbar">
              {loading[idx] ? (
                <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-400">
                  <div className="w-8 h-8 border-[3px] border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                  <p className="text-sm">Extracting full text...</p>
                </div>
              ) : errors[idx] ? (
                <div className="flex flex-col items-center justify-center h-full p-8 text-center gap-4">
                  <div className="w-12 h-12 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center text-red-500">
                    <i className="fas fa-exclamation-triangle" />
                  </div>
                  <p className="text-sm text-red-600 dark:text-red-400 font-medium">{errors[idx]}</p>
                  <p className="text-xs text-gray-400 italic">Analysis will fallback to abstract if needed.</p>
                  <div className="mt-4 p-4 bg-gray-50 dark:bg-slate-800 rounded-lg text-left">
                    <h4 className="text-xs font-bold uppercase mb-2">Abstract Fallback:</h4>
                    <p className="text-xs leading-relaxed text-gray-600 dark:text-gray-300">{article.abstract}</p>
                  </div>
                </div>
              ) : (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <p className="text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap font-serif">
                    {texts[idx]}
                  </p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};