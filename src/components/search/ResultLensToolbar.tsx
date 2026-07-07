import React from 'react';
import { Button } from '@components/ui/Button';
import type { AppPage } from '@contexts/SearchContext';
import type { Article } from '@types';
import type { ResultLens } from '@hooks/useResultsFilter';

interface ResultLensToolbarProps {
  resultsCount: number;
  openAccessCount: number;
  highQualityCount: number;
  recentCount: number;
  practiceChangingCount: number;
  resultLens: ResultLens;
  resultFilter: string;
  selectedArticles: Article[];
  savedArticles: Article[];
  isAuthenticated: boolean;
  onLensChange: (lens: ResultLens) => void;
  onClearLens: () => void;
  onCompare: () => void;
  onNavigate: (page: AppPage) => void;
  onClearSelection: () => void;
  onExport: (format: 'ris' | 'bibtex' | 'csl' | 'doc') => void;
  trackFeatureUsage: (feature: string, metadata?: Record<string, unknown>) => void;
}

export const ResultLensToolbar: React.FC<ResultLensToolbarProps> = ({
  resultsCount,
  openAccessCount,
  highQualityCount,
  recentCount,
  practiceChangingCount,
  resultLens,
  resultFilter,
  selectedArticles,
  savedArticles,
  isAuthenticated,
  onLensChange,
  onClearLens,
  onCompare,
  onNavigate,
  onClearSelection,
  onExport,
  trackFeatureUsage,
}) => (
  <div className="mb-4 neo-card p-3 flex flex-wrap gap-2 items-center">
    <div className="flex w-full flex-wrap items-center gap-1.5 border-b border-slate-100 pb-2 dark:border-slate-800">
      {[
        { id: 'all' as ResultLens, label: 'All', count: resultsCount, icon: 'fa-list' },
        { id: 'open_access' as ResultLens, label: 'Open access', count: openAccessCount, icon: 'fa-unlock' },
        { id: 'high_quality' as ResultLens, label: 'High quality', count: highQualityCount, icon: 'fa-shield-halved' },
        { id: 'recent' as ResultLens, label: 'Recent', count: recentCount, icon: 'fa-calendar-days' },
        { id: 'practice_changing' as ResultLens, label: 'Practice-changing', count: practiceChangingCount, icon: 'fa-bolt' },
      ].map((lens) => (
        <button
          key={lens.id}
          type="button"
          disabled={lens.count === 0}
          onClick={() => {
            onLensChange(lens.id);
            trackFeatureUsage('result_lens_click', { lens: lens.id, count: lens.count });
          }}
          className={`inline-flex min-h-8 items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-bold transition-colors disabled:pointer-events-none disabled:opacity-35 ${
            resultLens === lens.id
              ? 'border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300'
              : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
          }`}
        >
          <i className={`fas ${lens.icon} text-[10px]`} />
          {lens.label}
          <span className="font-mono text-[10px] opacity-70">{lens.count}</span>
        </button>
      ))}
      {(resultLens !== 'all' || resultFilter.trim()) && (
        <button
          type="button"
          onClick={onClearLens}
          className="ml-auto inline-flex min-h-8 items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-bold text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        >
          <i className="fas fa-xmark text-[10px]" />
          Clear lens
        </button>
      )}
    </div>
    {selectedArticles.length >= 2 && (
      <Button onClick={onCompare} variant="gradient" size="sm"
        leftIcon={<i className="fas fa-balance-scale text-[10px]" />}>
        Compare {Math.min(selectedArticles.length, 2)}
      </Button>
    )}
    {isAuthenticated && (
      <>
        <Button onClick={() => onNavigate('team')} variant="ghost" size="sm"
          leftIcon={<i className="fas fa-users text-[10px]" />}>Team</Button>
        <Button onClick={() => onNavigate('grant')} variant="ghost" size="sm"
          leftIcon={<i className="fas fa-file-signature text-[10px]" />}>Grant</Button>
      </>
    )}
    {savedArticles.length > 0 && (
      <Button onClick={() => onNavigate('saved')} variant="ghost" size="sm"
        leftIcon={<i className="fas fa-bookmark text-[10px]" />}>
        Saved · {savedArticles.length}
      </Button>
    )}
    {selectedArticles.length > 0 && (
      <Button variant="ghost" size="sm" onClick={onClearSelection}>Clear</Button>
    )}
    <Button onClick={() => onNavigate('history')} variant="ghost" size="sm"
      leftIcon={<i className="fas fa-history text-[10px]" />}>History</Button>
    <div className="flex w-full flex-wrap gap-1.5 sm:ml-auto sm:w-auto">
      <Button variant="ghost" size="sm" onClick={() => onExport('ris')}
        leftIcon={<i className="fas fa-file-alt text-[10px]" />}>RIS</Button>
      <Button variant="ghost" size="sm" onClick={() => onExport('bibtex')}
        leftIcon={<i className="fas fa-file-code text-[10px]" />}>BibTeX</Button>
      <Button variant="ghost" size="sm" onClick={() => onExport('csl')}
        leftIcon={<i className="fas fa-quote-right text-[10px]" />}>CSL</Button>
      <Button variant="ghost" size="sm" onClick={() => onExport('doc')}
        leftIcon={<i className="fas fa-file-word text-[10px]" />}>Word</Button>
    </div>
  </div>
);
