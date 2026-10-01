import type React from 'react';
import api from '@services/api';
import type { Article } from '@types';

type PdfLookupState = 'idle' | 'loading' | 'found' | 'not-found';

interface ArticleCardAccessPanelProps {
  article: Article;
  isFree: boolean;
  freeUrl: string | null;
  pdfLookup: PdfLookupState;
  setPdfLookup: React.Dispatch<React.SetStateAction<PdfLookupState>>;
  pdfUrl: string | null;
  setPdfUrl: React.Dispatch<React.SetStateAction<string | null>>;
  onOpenInWorkspace?: (url: string) => void;
}

export function ArticleCardAccessPanel({
  article,
  isFree,
  freeUrl,
  pdfLookup,
  setPdfLookup,
  pdfUrl,
  setPdfUrl,
  onOpenInWorkspace,
}: ArticleCardAccessPanelProps) {
  if (isFree && freeUrl) {
    return (
      <div className="mb-3 space-y-2">
        <div className="space-y-1.5">
          {onOpenInWorkspace && (freeUrl.toLowerCase().endsWith('.pdf') || /pmc\//.test(freeUrl)) && (
            <button
              type="button"
              onClick={() => onOpenInWorkspace(freeUrl)}
              className="flex w-full items-center justify-center gap-2 py-2 rounded-xl border border-indigo-200/60 dark:border-indigo-800/50 bg-indigo-50/60 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 text-xs font-semibold hover:bg-indigo-100/80 dark:hover:bg-indigo-900/40 transition-colors"
            >
              <i className="fas fa-columns text-[10px]" /> Split workspace
            </button>
          )}
          <a
            href={freeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-all hover:shadow-lg hover:shadow-emerald-500/25"
          >
            <i className="fas fa-unlock text-[10px]" /> Read Free - Full Text
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-3 space-y-2">
      {article.doi && pdfLookup === 'idle' && (
        <button
          type="button"
          onClick={async () => {
            setPdfLookup('loading');
            try {
              const result = await api.documents.findFullText(article.doi!);
              if (result.isFree && result.url) {
                setPdfUrl(result.url);
                setPdfLookup('found');
              } else {
                setPdfLookup('not-found');
              }
            } catch {
              setPdfLookup('not-found');
            }
          }}
          className="inline-flex items-center gap-1.5 text-[0.72rem] font-medium text-emerald-600 transition-colors hover:text-emerald-700 hover:underline dark:text-emerald-400 dark:hover:text-emerald-300"
        >
          <i className="fas fa-search text-[10px]" /> Find free version
        </button>
      )}
      {pdfLookup === 'loading' && (
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <div className="spinner" /> Searching open-access repositories...
        </div>
      )}
      {pdfLookup === 'found' && pdfUrl && (
        <a
          href={pdfUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-colors"
        >
          <i className="fas fa-unlock text-[10px]" /> Free Version Found - Open PDF
        </a>
      )}
      {pdfLookup === 'not-found' && (
        <p className="text-[0.7rem] text-slate-400">No free version found via Unpaywall.</p>
      )}
    </div>
  );
}
