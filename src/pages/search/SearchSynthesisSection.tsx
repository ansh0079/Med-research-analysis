import React from 'react';
import { SynthesisPanel } from '@components/search/SynthesisPanel';
import { ErrorBanner } from '@components/common/ErrorBanner';
import type { Article, SynthesisResult } from '@types';

interface SearchSynthesisSectionProps {
  synthesis: SynthesisResult | null;
  synthesisLoading: boolean;
  synthesisError: string | null;
  synthesisLiveText: string;
  stalenessBanner: { changes: string[]; priorGrade: string; newGrade: string } | null;
  top5Articles: Article[];
  onClose: () => void;
  onGenerateCase: () => void;
  onSearch: (query: string) => void;
  onDismissStaleness: () => void;
}

export const SearchSynthesisSection: React.FC<SearchSynthesisSectionProps> = ({
  synthesis,
  synthesisLoading,
  synthesisError,
  synthesisLiveText,
  stalenessBanner,
  top5Articles,
  onClose,
  onGenerateCase,
  onSearch,
  onDismissStaleness,
}) => {
  return (
    <>
      {synthesisError && (
        synthesisError.startsWith('UPGRADE_REQUIRED:') ? (
          <div aria-live="polite" className="mb-6 p-6 rounded-2xl bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 text-center">
            <i className="fas fa-star text-2xl text-violet-400 mb-2 block" />
            <p className="text-sm font-semibold text-violet-800 dark:text-violet-200">Evidence synthesis is a Pro feature</p>
            <p className="text-xs text-violet-600 dark:text-violet-400 mt-1 mb-3">Upgrade to synthesize papers into clinical bottom lines and teaching claims.</p>
            <a href="/billing" className="inline-block text-xs font-bold px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors">
              View plans -&gt;
            </a>
          </div>
        ) : (
          <div aria-live="polite" className="mb-6">
            <ErrorBanner error={synthesisError} />
          </div>
        )
      )}

      {synthesisLoading && !synthesisLiveText && (
        <div aria-live="polite" className="sr-only">Generating evidence synthesis...</div>
      )}
      {synthesisLiveText && synthesisLoading && (
        <div aria-live="polite" className="mb-6 rounded-2xl border border-indigo-100 bg-white/90 p-4 text-sm text-slate-700 shadow-sm dark:border-indigo-900/40 dark:bg-slate-900/90 dark:text-slate-300">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-indigo-500">Live synthesis</p>
          <p className="whitespace-pre-wrap leading-relaxed">{synthesisLiveText}</p>
        </div>
      )}

      {stalenessBanner && (
        <div className="mb-4 rounded-2xl border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 flex items-start gap-3">
          <i className="fas fa-exclamation-triangle text-amber-500 text-sm mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-amber-800 dark:text-amber-200">Evidence has shifted since your last synthesis</p>
            <ul className="mt-1 space-y-0.5">
              {stalenessBanner.changes.map((c, i) => (
                <li key={i} className="text-[11px] text-amber-700 dark:text-amber-300">{c}</li>
              ))}
            </ul>
          </div>
          <button type="button" onClick={onDismissStaleness}
            className="shrink-0 text-amber-400 hover:text-amber-600 dark:hover:text-amber-200 transition-colors">
            <i className="fas fa-times text-xs" />
          </button>
        </div>
      )}

      {synthesis && (
        <div className="mb-8" data-synthesis-panel>
          <SynthesisPanel
            result={synthesis}
            articles={top5Articles}
            onClose={onClose}
            onGenerateCase={onGenerateCase}
            onSearch={onSearch}
          />
        </div>
      )}
    </>
  );
};
