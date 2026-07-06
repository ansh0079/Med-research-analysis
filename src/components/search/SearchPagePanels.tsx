import React from 'react';
import { Link } from 'react-router-dom';
import type { Article } from '@types';
import { Button } from '@components/ui/Button';
import type { ResultLens } from '@hooks/useResultsFilter';

export function SearchVerificationBanner({
  show,
  resendStatus,
  onResend,
  onDismiss,
}: {
  show: boolean;
  resendStatus: 'idle' | 'sending' | 'sent';
  onResend: () => void;
  onDismiss: () => void;
}) {
  if (!show) return null;
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
              <i className="fas fa-check" /> Email sent - check your inbox
            </span>
          ) : (
            <button
              type="button"
              onClick={onResend}
              disabled={resendStatus === 'sending'}
              className="text-xs font-semibold text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100 underline transition-colors disabled:opacity-50"
            >
              {resendStatus === 'sending' ? 'Sending...' : 'Resend verification email'}
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
  if (resultsCount <= 0) return null;
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

type LearnerContextSummary = {
  hasPersonalization?: boolean;
  weakClaimCount?: number;
  hasTrajectory?: boolean;
  weakTopicCount?: number;
};

export function PersonalizedRemediationBanner({
  learnerContext,
  hasAgentGuidance,
  onTargetedQuiz,
  onAskMentor,
}: {
  learnerContext: LearnerContextSummary | null | undefined;
  hasAgentGuidance: boolean;
  onTargetedQuiz: () => void;
  onAskMentor: () => void;
}) {
  const weakClaimCount = learnerContext?.weakClaimCount ?? 0;
  const shouldShow = Boolean(
    learnerContext?.hasPersonalization &&
    (weakClaimCount > 0 || learnerContext?.hasTrajectory || (learnerContext?.weakTopicCount ?? 0) > 0)
  );
  if (!shouldShow) return null;
  return (
    <div className="mb-4 rounded-xl border border-violet-200 bg-violet-50 p-4 dark:border-violet-900/50 dark:bg-violet-950/25">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-violet-600 dark:text-violet-300">Personalized remediation</p>
          <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-100">
            {weakClaimCount > 0
              ? `${weakClaimCount} weak claim${weakClaimCount === 1 ? '' : 's'} from your learning history match this topic.`
              : learnerContext?.hasTrajectory
                ? 'Your recent learning trajectory includes this topic.'
                : 'This search overlaps with prior weak topics.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onTargetedQuiz}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-violet-600 px-3 text-xs font-bold text-white hover:bg-violet-500">
            <i className="fas fa-brain text-[10px]" /> Targeted quiz
          </button>
          {hasAgentGuidance && (
            <button type="button" onClick={onAskMentor}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-violet-300 px-3 text-xs font-bold text-violet-700 hover:bg-white dark:border-violet-800 dark:text-violet-200 dark:hover:bg-violet-900/40">
              <i className="fas fa-comments text-[10px]" /> Ask mentor
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function ShiftReviewToolbar({
  show,
  currentQuery,
  inPlaceQuizExpanded,
  onEvidence,
  onGuideline,
  onCase,
  onToggleQuiz,
  onReflection,
}: {
  show: boolean;
  currentQuery: string;
  inPlaceQuizExpanded: boolean;
  onEvidence: () => void;
  onGuideline: () => void;
  onCase: () => void;
  onToggleQuiz: () => void;
  onReflection: () => void;
}) {
  if (!show) return null;
  return (
    <div className="sticky top-[calc(var(--nav-h)+0.75rem)] z-20 mb-4 rounded-2xl border border-slate-200/80 bg-white/92 p-3 shadow-sm backdrop-blur dark:border-slate-700/80 dark:bg-slate-900/88">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Shift review</p>
          <p className="truncate text-xs font-semibold text-slate-700 dark:text-slate-200">{currentQuery}</p>
        </div>
        <div className="grid grid-cols-2 gap-1.5 sm:flex sm:flex-wrap sm:items-center">
          <button type="button" onClick={onEvidence}
            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-2.5 sm:px-3 text-xs font-bold text-white hover:bg-indigo-500">
            <i className="fas fa-layer-group text-[10px]" /> Evidence
          </button>
          <button type="button" onClick={onGuideline}
            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-blue-200 px-2.5 sm:px-3 text-xs font-bold text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-300 dark:hover:bg-blue-950/40">
            <i className="fas fa-book-medical text-[10px]" /> Guideline
          </button>
          <button type="button" onClick={onCase}
            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-emerald-200 px-2.5 sm:px-3 text-xs font-bold text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950/40">
            <i className="fas fa-stethoscope text-[10px]" /> Case
          </button>
          <button type="button" onClick={onToggleQuiz}
            className={`inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border px-2.5 sm:px-3 text-xs font-bold transition-colors ${
              inPlaceQuizExpanded
                ? 'bg-violet-600 border-violet-600 text-white hover:bg-violet-500'
                : 'border-violet-200 text-violet-700 hover:bg-violet-50 dark:border-violet-800 dark:text-violet-300 dark:hover:bg-violet-950/40'
            }`}>
            <i className="fas fa-brain text-[10px]" /> {inPlaceQuizExpanded ? 'Close quiz' : 'Quiz me on this'}
          </button>
          <button type="button" onClick={onReflection}
            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-2.5 sm:px-3 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800/40">
            <i className="fas fa-file-export text-[10px]" /> Reflection
          </button>
        </div>
      </div>
    </div>
  );
}

export function SearchRefinementPanel({
  show,
  newPaperNotice,
  resultFilter,
  onResultFilterChange,
  recentAnalyses,
  onOpenAnalysis,
}: {
  show: boolean;
  newPaperNotice: string | null;
  resultFilter: string;
  onResultFilterChange: (value: string) => void;
  recentAnalyses: Article[];
  onOpenAnalysis: (article: Article) => void;
}) {
  if (!show) return null;
  return (
    <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_0.7fr]">
      <div className="neo-card p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Search within results</p>
            {newPaperNotice && <p className="mt-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">{newPaperNotice}</p>}
          </div>
          <input
            value={resultFilter}
            onChange={(event) => onResultFilterChange(event.target.value)}
            placeholder="Filter titles, abstracts, journals..."
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white sm:w-80"
          />
        </div>
        <p className="mt-2 text-[11px] text-slate-400">
          Shortcuts: / search, j/k move, s save, a analyze.
        </p>
      </div>
      {recentAnalyses.length > 0 && (
        <div className="neo-card p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Recently analyzed</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {recentAnalyses.slice(0, 5).map((article) => (
              <button
                key={article.uid}
                type="button"
                onClick={() => onOpenAnalysis(article)}
                className="max-w-full rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-indigo-950/40"
                title={article.title}
              >
                <span className="inline-block max-w-[13rem] truncate align-bottom">{article.title}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function ResultLensToolbar({
  show,
  resultLens,
  resultFilter,
  resultsCount,
  openAccessCount,
  highQualityCount,
  recentCount,
  practiceChangingCount,
  selectedArticlesCount,
  savedArticlesCount,
  isAuthenticated,
  onSetResultLens,
  onSetResultFilter,
  onSetVisibleCount,
  onTrackLens,
  onCompare,
  onNavigateTeam,
  onNavigateGrant,
  onNavigateSaved,
  onNavigateHistory,
  onClearSelection,
  onExport,
}: {
  show: boolean;
  resultLens: ResultLens;
  resultFilter: string;
  resultsCount: number;
  openAccessCount: number;
  highQualityCount: number;
  recentCount: number;
  practiceChangingCount: number;
  selectedArticlesCount: number;
  savedArticlesCount: number;
  isAuthenticated: boolean;
  onSetResultLens: (lens: ResultLens) => void;
  onSetResultFilter: (value: string) => void;
  onSetVisibleCount: (count: number) => void;
  onTrackLens: (lens: ResultLens, count: number) => void;
  onCompare: () => void;
  onNavigateTeam: () => void;
  onNavigateGrant: () => void;
  onNavigateSaved: () => void;
  onNavigateHistory: () => void;
  onClearSelection: () => void;
  onExport: (format: 'ris' | 'bibtex' | 'csl' | 'doc') => void;
}) {
  if (!show) return null;
  const lenses = [
    { id: 'all' as ResultLens, label: 'All', count: resultsCount, icon: 'fa-list' },
    { id: 'open_access' as ResultLens, label: 'Open access', count: openAccessCount, icon: 'fa-unlock' },
    { id: 'high_quality' as ResultLens, label: 'High quality', count: highQualityCount, icon: 'fa-shield-halved' },
    { id: 'recent' as ResultLens, label: 'Recent', count: recentCount, icon: 'fa-calendar-days' },
    { id: 'practice_changing' as ResultLens, label: 'Practice-changing', count: practiceChangingCount, icon: 'fa-bolt' },
  ];
  return (
    <div className="mb-4 neo-card p-3 flex flex-wrap gap-2 items-center">
      <div className="flex w-full flex-wrap items-center gap-1.5 border-b border-slate-100 pb-2 dark:border-slate-800">
        {lenses.map((lens) => (
          <button
            key={lens.id}
            type="button"
            disabled={lens.count === 0}
            onClick={() => {
              onSetResultLens(lens.id);
              onSetVisibleCount(30);
              onTrackLens(lens.id, lens.count);
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
            onClick={() => { onSetResultLens('all'); onSetResultFilter(''); onSetVisibleCount(30); }}
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
          <Button onClick={onNavigateTeam} variant="ghost" size="sm"
            leftIcon={<i className="fas fa-users text-[10px]" />}>Team</Button>
          <Button onClick={onNavigateGrant} variant="ghost" size="sm"
            leftIcon={<i className="fas fa-file-signature text-[10px]" />}>Grant</Button>
        </>
      )}
      {savedArticlesCount > 0 && (
        <Button onClick={onNavigateSaved} variant="ghost" size="sm"
          leftIcon={<i className="fas fa-bookmark text-[10px]" />}>
          Saved - {savedArticlesCount}
        </Button>
      )}
      {selectedArticlesCount > 0 && (
        <Button variant="ghost" size="sm" onClick={onClearSelection}>Clear</Button>
      )}
      <Button onClick={onNavigateHistory} variant="ghost" size="sm"
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

export function SearchFooter() {
  return (
    <footer className="py-8 border-t border-gray-200/60 dark:border-slate-700/70 text-center space-y-2">
      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
        Signal MD - Multi-Source Medical Evidence Search
      </p>
      <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400">
        <Link to="/legal/terms" className="hover:text-indigo-600 dark:hover:text-indigo-400 underline-offset-2 hover:underline">Terms of Use</Link>
        <span aria-hidden className="text-slate-300 dark:text-slate-600">-</span>
        <Link to="/legal/privacy" className="hover:text-indigo-600 dark:hover:text-indigo-400 underline-offset-2 hover:underline">Privacy</Link>
      </nav>
    </footer>
  );
}
