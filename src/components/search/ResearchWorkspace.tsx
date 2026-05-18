import React from 'react';
import { Button } from '@components/ui/Button';
import type { PdfLayout } from '@hooks/usePdfViewer';

interface ResearchWorkspaceProps {
  layout: PdfLayout;
  isPdfOpen: boolean;
  onToggleLayout: () => void;
  onClosePdf: () => void;
  children: React.ReactNode;
  pdfPanel: React.ReactNode;
  showToolbar?: boolean;
}

/**
 * Toggles between full-width search results and a split view with a PDF (iframe) alongside.
 */
export const ResearchWorkspace: React.FC<ResearchWorkspaceProps> = ({
  layout,
  isPdfOpen,
  onToggleLayout,
  onClosePdf,
  children,
  pdfPanel,
  showToolbar = true,
}) => {
  const isSplit = layout === 'split' && isPdfOpen;

  return (
    <div className="w-full min-h-[50vh]">
      {showToolbar && isPdfOpen && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-gray-200 dark:border-slate-600 bg-white/85 dark:bg-slate-800/85 px-4 py-2 shadow-lg shadow-slate-900/5">
          <div className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
            Research workspace
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onToggleLayout}
              leftIcon={
                <i className={isSplit ? 'fas fa-columns' : 'fas fa-expand'} />
              }
            >
              {isSplit ? 'Full-width list' : 'Split with PDF'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClosePdf}
              leftIcon={<i className="fas fa-times" />}
            >
              Close PDF
            </Button>
          </div>
        </div>
      )}

      <div
        className={
          isSplit
            ? 'grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-0 lg:min-h-[calc(100vh-12rem)]'
            : 'w-full'
        }
      >
        <div
          className={
            isSplit
              ? 'min-h-0 min-w-0 overflow-y-auto pr-0 lg:pr-4'
              : 'w-full'
          }
        >
          {children}
        </div>
        {isSplit && (
          <div className="min-h-[60vh] lg:min-h-0 border-t border-gray-200 dark:border-slate-700 lg:border-t-0 lg:border-l lg:pl-4">
            {pdfPanel}
          </div>
        )}
      </div>
    </div>
  );
};
