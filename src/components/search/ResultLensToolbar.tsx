import React from 'react';
import { Button } from '@components/ui/Button';
import type { AppPage } from '@contexts/SearchContext';
import type { Article, EvidenceLaneKey, SearchPack } from '@types';
import type { ResultLens, ResultSort } from '@hooks/useResultsFilter';

type ExportFormat = 'ris' | 'bibtex' | 'csl' | 'doc';

interface ResultLensToolbarProps {
  resultsCount: number;
  openAccessCount: number;
  highQualityCount: number;
  recentCount: number;
  practiceChangingCount: number;
  resultLens: ResultLens;
  resultFilter: string;
  resultSort: ResultSort;
  onResultFilterChange: (value: string) => void;
  onSortChange: (sort: ResultSort) => void;
  searchPack?: SearchPack | null;
  evidenceLane: EvidenceLaneKey | 'all';
  onLaneChange: (lane: EvidenceLaneKey | 'all') => void;
  selectedArticles: Article[];
  savedArticles: Article[];
  onLensChange: (lens: ResultLens) => void;
  onClearLens: () => void;
  onCompare: () => void;
  onNavigate: (page: AppPage) => void;
  onClearSelection: () => void;
  onExport: (format: ExportFormat) => void;
  trackFeatureUsage: (feature: string, metadata?: Record<string, unknown>) => void;
}

const EXPORT_OPTIONS: { format: ExportFormat; label: string; icon: string }[] = [
  { format: 'ris', label: 'RIS (EndNote, Zotero)', icon: 'fa-file-alt' },
  { format: 'bibtex', label: 'BibTeX', icon: 'fa-file-code' },
  { format: 'csl', label: 'CSL JSON', icon: 'fa-quote-right' },
  { format: 'doc', label: 'Word summary', icon: 'fa-file-word' },
];

export const ResultLensToolbar: React.FC<ResultLensToolbarProps> = ({
  resultsCount,
  openAccessCount,
  highQualityCount,
  recentCount,
  practiceChangingCount,
  resultLens,
  resultFilter,
  resultSort,
  onResultFilterChange,
  onSortChange,
  searchPack,
  evidenceLane,
  onLaneChange,
  selectedArticles,
  savedArticles,
  onLensChange,
  onClearLens,
  onCompare,
  onNavigate,
  onClearSelection,
  onExport,
  trackFeatureUsage,
}) => {
  const [exportOpen, setExportOpen] = React.useState(false);
  const exportRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!exportOpen) return;
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent ? event.key === 'Escape' : !exportRef.current?.contains(event.target as Node)) {
        setExportOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [exportOpen]);

  // Lenses with no matching papers are hidden rather than shown disabled, unless active.
  const lenses = [
    { id: 'all' as ResultLens, label: 'All', count: resultsCount, icon: 'fa-list' },
    { id: 'open_access' as ResultLens, label: 'Open access', count: openAccessCount, icon: 'fa-unlock' },
    { id: 'high_quality' as ResultLens, label: 'High quality', count: highQualityCount, icon: 'fa-shield-halved' },
    { id: 'recent' as ResultLens, label: 'Recent', count: recentCount, icon: 'fa-calendar-days' },
    { id: 'practice_changing' as ResultLens, label: 'Practice-changing', count: practiceChangingCount, icon: 'fa-bolt' },
  ].filter((lens) => lens.id === 'all' || lens.count > 0 || lens.id === resultLens);

  const laneOrder: EvidenceLaneKey[] = searchPack?.displayOrder?.length
    ? searchPack.displayOrder
    : ['guidelines', 'landmark_trials', 'reviews', 'supporting'];
  const lanes = searchPack
    ? laneOrder
      .map((key) => searchPack.lanes[key])
      .filter((lane) => lane && (lane.count > 0 || lane.key === evidenceLane))
    : [];

  const pillClass = (active: boolean) => `inline-flex min-h-8 items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold transition-colors ${
    active
      ? 'border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300'
      : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
  }`;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-1.5">
      <label className="relative">
        <span className="sr-only">Filter results</span>
        <i className="fas fa-magnifying-glass pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400" />
        <input
          value={resultFilter}
          onChange={(event) => onResultFilterChange(event.target.value)}
          placeholder="Filter results"
          className="h-8 w-40 rounded-full border border-slate-200 bg-white pl-7 pr-3 text-[11px] text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white sm:w-48"
        />
      </label>
      <label className="relative">
        <span className="sr-only">Sort results</span>
        <select
          value={resultSort}
          onChange={(event) => onSortChange(event.target.value as ResultSort)}
          className="h-8 rounded-full border border-slate-200 bg-white px-3 text-[11px] font-bold text-slate-600 outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
        >
          <option value="relevance">Ranked by relevance</option>
          <option value="newest">Newest first</option>
          <option value="citations">Most cited</option>
          <option value="quality">Highest quality</option>
        </select>
      </label>
      {lenses.map((lens) => (
        <button
          key={lens.id}
          type="button"
          onClick={() => {
            onLensChange(lens.id);
            trackFeatureUsage('result_lens_click', { lens: lens.id, count: lens.count });
          }}
          className={pillClass(resultLens === lens.id)}
        >
          <i className={`fas ${lens.icon} text-[10px]`} />
          {lens.label}
          <span className="font-mono text-[10px] opacity-70">{lens.count}</span>
        </button>
      ))}
      {lanes.length > 0 && <span className="mx-1 h-5 w-px bg-slate-200 dark:bg-slate-700" aria-hidden />}
      {lanes.map((lane) => (
        <button
          key={lane.key}
          type="button"
          aria-pressed={evidenceLane === lane.key}
          onClick={() => onLaneChange(evidenceLane === lane.key ? 'all' : lane.key)}
          className={pillClass(evidenceLane === lane.key)}
        >
          {lane.label}
          <span className="font-mono text-[10px] opacity-70">{lane.count}</span>
        </button>
      ))}
      {(resultLens !== 'all' || resultFilter.trim() || evidenceLane !== 'all' || resultSort !== 'relevance') && (
        <button
          type="button"
          onClick={onClearLens}
          className="inline-flex min-h-8 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        >
          <i className="fas fa-xmark text-[10px]" />
          Clear
        </button>
      )}

      <div className="ml-auto flex flex-wrap items-center gap-1.5">
        {selectedArticles.length >= 2 && (
          <Button onClick={onCompare} variant="gradient" size="sm"
            leftIcon={<i className="fas fa-balance-scale text-[10px]" />}>
            Compare {Math.min(selectedArticles.length, 2)}
          </Button>
        )}
        {selectedArticles.length > 0 && (
          <Button variant="ghost" size="sm" onClick={onClearSelection}>Clear selection</Button>
        )}
        {savedArticles.length > 0 && (
          <Button onClick={() => onNavigate('saved')} variant="ghost" size="sm"
            leftIcon={<i className="fas fa-bookmark text-[10px]" />}>
            Saved · {savedArticles.length}
          </Button>
        )}
        <div ref={exportRef} className="relative">
          <Button
            variant="ghost"
            size="sm"
            aria-haspopup="menu"
            aria-expanded={exportOpen}
            onClick={() => setExportOpen((open) => !open)}
            leftIcon={<i className="fas fa-download text-[10px]" />}
          >
            Export <i className="fas fa-chevron-down ml-1 text-[9px]" />
          </Button>
          {exportOpen && (
            <div role="menu" className="absolute right-0 z-20 mt-1 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
              {EXPORT_OPTIONS.map((option) => (
                <button
                  key={option.format}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    onExport(option.format);
                    setExportOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <i className={`fas ${option.icon} w-3 text-[10px] text-slate-400`} />
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
