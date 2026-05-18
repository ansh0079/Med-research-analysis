import { useState, useCallback } from 'react';

export type PdfLayout = 'list' | 'split';

/**
 * Manages the primary PDF url and layout (full-width list vs split with PDF).
 */
export const usePdfViewer = () => {
  const [activePdf, setActivePdf] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [layout, setLayout] = useState<PdfLayout>('list');

  const openPdf = useCallback((url: string, options?: { split?: boolean }) => {
    setActivePdf(url);
    setIsOpen(true);
    if (options?.split !== false) {
      setLayout('split');
    }
  }, []);

  const closePdf = useCallback(() => {
    setActivePdf(null);
    setIsOpen(false);
    setLayout('list');
  }, []);

  const toggleLayout = useCallback(() => {
    if (!activePdf) return;
    setLayout((l) => (l === 'split' ? 'list' : 'split'));
  }, [activePdf]);

  const setListMode = useCallback(() => {
    setLayout('list');
    setIsOpen(false);
    setActivePdf(null);
  }, []);

  return {
    activePdf,
    isOpen,
    layout,
    openPdf,
    closePdf,
    toggleLayout,
    setListMode,
    setLayout,
  };
};
