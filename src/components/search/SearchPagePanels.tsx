import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@components/ui/Button';
import type { ResultLens } from '@hooks/useResultsFilter';
import type { AppPage } from '@contexts/SearchContext';

export function SearchVerifyBanner({
  resendStatus,
  onResend,
  onDismiss,
}: {
  resendStatus: 'idle' | 'sending' | 'sent';
  onResend: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="fixed top-[var(--nav-h)] left-0 right-0 z-40 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800/60 px-4 py-2">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-3 flex-wrap">
        <p className="text-xs text-amber-800 dark:text-amber-200 flex items-center gap-2">
          <i className="fas fa-envelope text-amber-500" />
          Please verify your email address to unlock all features.
        </p>
        <div className="flex items-center gap-3">
          {resendStatus === 'sent' ? (
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
              <i className="fas fa-check" /> Email sent — check your inbox
            </span>
          ) : (
            <button
              type="button"
              onClick={onResend}
              disabled={resendStatus === 'sending'}
              className="text-xs font-semibold text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100 underline transition-colors disabled:opacity-50"
            >
              {resendStatus === 'sending' ? 'Sending…' : 'Resend verification email'}
            </button>
          )}
          <button
            type="button"
            onClick={onDismiss}
            className="text-amber-400 hover:text-amber-600 dark:hover:text-amber-200 transition-colors"
            aria-label="Dismiss"
          >
            <i className="fas fa-times text-xs" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function SearchStatsCards({
  resultsCount,
  openAccessCount,
  highQualityCount,
  retractedCount,
}: {
  resultsCount: number;
  openAccessCount: number;
  highQualityCount: number;
  retractedCount: number;
}) {
  return (
    <div className="mb-4 grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-4">
      {[
        { label: 'Evidence found', value: resultsCount, icon: 'fa-layer-group', tone: 'text-indigo-500' },
        { label: 'Open access', value: openAccessCount, icon: 'fa-unlock', tone: 'text-emerald-500' },
        { label: 'A/B quality', value: highQualityCount, icon: 'fa-shield-alt', tone: 'text-blue-500' },
        { label: 'Retracted flags', value: retractedCount, icon: 'fa-triangle-exclamation', tone: retractedCount ? 'text-red-500' : 'text-slate-400' },
      ].map((item) => (
        <div key={item.label} className="neo-card p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
          <div className={`w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center ${item.tone}`}>
            <i className={`fas ${item.icon} text-xs`} />
          </div>
          <div>
            <p className="font-mono text-base sm:text-lg font-black text-slate-900 dark:text-white">{item.value}</p>
            <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400">{item.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function SearchFooter() {
  return (
    <footer className="py-8 border-t border-gray-200/60 dark:border-slate-700/70 text-center space-y-2">
      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
        Signal MD · Multi-Source Medical Evidence Search
      </p>
      <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400">
        <Link to="/legal/terms" className="hover:text-indigo-600 dark:hover:text-indigo-400 underline-offset-2 hover:underline">Terms of Use</Link>
        <span aria-hidden className="text-slate-300 dark:text-slate-600">·</span>
        <Link to="/legal/privacy" className="hover:text-indigo-600 dark:hover:text-indigo-400 underline-offset-2 hover:underline">Privacy</Link>
      </nav>
    </footer>
  );
}

export function SearchResultLensToolbar({
  resultsCount,
  resultLens,
  resultFilter,
  lenses,
  selectedArticlesCount,
  isAuthenticated,
  savedArticlesCount,
  onSelectLens,
  onClearLens,
  onCompare,
  onSetPage,
  onClearSelection,
  onExport,
}: {
  resultsCount: number;
  resultLens: ResultLens;
  resultFilter: string;
  lenses: Array<{ id: ResultLens; label: string; count: number; icon: string }>;
  selectedArticlesCount: number;
  isAuthenticated: boolean;
  savedArticlesCount: number;
  onSelectLens: (lens: ResultLens, count: number) => void;
  onClearLens: () => void;
  onCompare: () => void;
  onSetPage: (page: AppPage) => void;
  onClearSelection: () => void;
  onExport: (format: 'ris' | 'bibtex' | 'csl' | 'doc') => void;
}) {
  return (
    <div className="mb-4 neo-card p-3 flex flex-wrap gap-2 items-center">
      <div className="flex w-full flex-wrap items-center gap-1.5 border-b border-slate-100 pb-2 dark:border-slate-800">
        {lenses.map((lens) => (
          <button
            key={lens.id}
            type="button"
            disabled={lens.count === 0}
            onClick={() => onSelectLens(lens.id, lens.count)}
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
      {selectedArticlesCount >= 2 && (
        <Button onClick={onCompare} variant="gradient" size="sm"
          leftIcon={<i className="fas fa-balance-scale text-[10px]" />}>
          Compare {Math.min(selectedArticlesCount, 2)}
        </Button>
      )}
      {isAuthenticated && (
        <>
          <Button onClick={() => onSetPage('team')} variant="ghost" size="sm"
            leftIcon={<i className="fas fa-users text-[10px]" />}>Team</Button>
          <Button onClick={() => onSetPage('grant')} variant="ghost" size="sm"
            leftIcon={<i className="fas fa-file-signature text-[10px]" />}>Grant</Button>
        </>
      )}
      {savedArticlesCount > 0 && (
        <Button onClick={() => onSetPage('saved')} variant="ghost" size="sm"
          leftIcon={<i className="fas fa-bookmark text-[10px]" />}>
          Saved · {savedArticlesCount}
        </Button>
      )}
      {selectedArticlesCount > 0 && (
        <Button variant="ghost" size="sm" onClick={onClearSelection}>Clear</Button>
      )}
      <Button onClick={() => onSetPage('history')} variant="ghost" size="sm"
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
}
