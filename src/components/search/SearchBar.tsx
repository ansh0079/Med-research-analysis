import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useAnalytics } from '@hooks/useAnalytics';
import { useDebounce } from '@hooks/useDebounce';
import { api } from '@services/api';
import type { SpecificityLevel, DataSource } from '@types';
import { STUDY_TYPE_FILTER_OPTIONS } from '@utils/searchStudyFilters';
import type { SearchRecentEntry } from '@utils/searchRecents';

interface SearchBarProps {
  onSearch: (query: string) => void;
  value?: string;
  onChange?: (value: string) => void;
  recentSearches?: SearchRecentEntry[];
  loading?: boolean;
  specificity?: SpecificityLevel;
  onSpecificityChange?: (level: SpecificityLevel) => void;
  sources?: DataSource[];
  onSourcesChange?: (sources: DataSource[]) => void;
  vectorSearchEnabled?: boolean;
  useVectorSearch?: boolean;
  onVectorModeChange?: (enabled: boolean) => void;
  studyTypes?: string[];
  onStudyTypesChange?: (studyTypes: string[]) => void;
  yearRange?: [number, number];
  onYearRangeChange?: (yearRange: [number, number] | undefined) => void;
  placeholder?: string;
}

const QUERY_TEMPLATES = [
  {
    id: 'therapy',
    label: 'Therapy evidence',
    icon: 'fa-prescription-bottle-medical',
    query: 'intervention vs standard care clinical outcomes',
    studyTypes: ['"Randomized Controlled Trial"[Publication Type]', '"Systematic Review"[Publication Type]'],
    specificity: 'moderate' as SpecificityLevel,
  },
  {
    id: 'guidelines',
    label: 'Guidelines',
    icon: 'fa-book-medical',
    query: 'current clinical practice guideline recommendation',
    studyTypes: ['"Practice Guideline"[Publication Type]'],
    specificity: 'strict' as SpecificityLevel,
  },
  {
    id: 'harms',
    label: 'Harms',
    icon: 'fa-triangle-exclamation',
    query: 'adverse events safety contraindications',
    studyTypes: ['"Clinical Trial"[Publication Type]', '"Systematic Review"[Publication Type]'],
    specificity: 'broad' as SpecificityLevel,
  },
  {
    id: 'reviews',
    label: 'Reviews',
    icon: 'fa-layer-group',
    query: 'systematic review meta-analysis clinical outcomes',
    studyTypes: ['"Systematic Review"[Publication Type]', '"Meta-Analysis"[Publication Type]'],
    specificity: 'moderate' as SpecificityLevel,
  },
];

const SOURCE_OPTIONS: { value: DataSource; label: string; dot: string }[] = [
  { value: 'pubmed',   label: 'PubMed',            dot: 'bg-blue-500' },
  { value: 'semantic', label: 'Semantic Scholar',   dot: 'bg-violet-500' },
  { value: 'openalex', label: 'OpenAlex',           dot: 'bg-cyan-500' },
];

const SPECIFICITY_OPTIONS: { value: SpecificityLevel; label: string; title: string }[] = [
  { value: 'broad', label: 'Broad', title: 'Expand related terms and retrieve a wider evidence set' },
  { value: 'moderate', label: 'Balanced', title: 'Balance recall and precision for most research questions' },
  { value: 'strict', label: 'Strict', title: 'Prioritise exact terms and tighter matching' },
];

const RECENT_SOURCE_LABEL: Record<SearchRecentEntry['source'], string> = {
  session: 'This session',
  local: 'Recent topic',
  account: 'Your history',
};

export const SearchBar: React.FC<SearchBarProps> = ({
  onSearch, value, onChange, recentSearches = [],
  loading = false, specificity = 'moderate',
  onSpecificityChange, sources = ['pubmed'], onSourcesChange,
  vectorSearchEnabled = false, useVectorSearch = false, onVectorModeChange,
  studyTypes = [], onStudyTypesChange,
  yearRange, onYearRangeChange,
  placeholder = 'Enter your research query…',
}) => {
  const currentYear = new Date().getFullYear();
  const [internalQuery, setInternalQuery] = useState('');
  const isControlled = value !== undefined;
  const query = isControlled ? value : internalQuery;
  const setQuery = useCallback((next: string) => {
    if (isControlled) onChange?.(next);
    else setInternalQuery(next);
  }, [isControlled, onChange]);
  const [focused, setFocused] = useState(false);
  const [meshSuggestions, setMeshSuggestions] = useState<Array<{ label: string; resource: string }>>([]);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { trackSearch } = useAnalytics();
  const debouncedQuery = useDebounce(query, 600);

  useEffect(() => {
    const focus = () => inputRef.current?.focus();
    window.addEventListener('medsearch:focus-search', focus);
    return () => window.removeEventListener('medsearch:focus-search', focus);
  }, []);

  // Fetch MeSH suggestions when query is long enough
  useEffect(() => {
    const trimmed = debouncedQuery.trim();
    if (trimmed.length < 3) return;
    let cancelled = false;
    api.review.meshSuggest(trimmed).then((data) => {
      if (!cancelled) setMeshSuggestions(data.suggestions.slice(0, 5));
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [debouncedQuery]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setMeshSuggestions([]);
      trackSearch(query.trim(), { specificity, sources: sources.join(',') });
      onSearch(query.trim());
    }
  }, [query, onSearch, specificity, sources, trackSearch]);

  const applyMeshSuggestion = useCallback((label: string) => {
    setQuery(label);
    setMeshSuggestions([]);
    trackSearch(label, { specificity, sources: sources.join(','), meshApplied: 'true' });
    onSearch(label);
  }, [onSearch, setQuery, specificity, sources, trackSearch]);

  const applyRecentSearch = useCallback((label: string) => {
    setQuery(label);
    setMeshSuggestions([]);
    trackSearch(label, { specificity, sources: sources.join(','), recentApplied: 'true' });
    onSearch(label);
  }, [onSearch, setQuery, specificity, sources, trackSearch]);

  const showRecentDropdown = focused && !query.trim() && recentSearches.length > 0 && meshSuggestions.length === 0;

  const toggleSource = useCallback((source: DataSource) => {
    if (!onSourcesChange) return;
    const updated = sources.includes(source)
      ? sources.filter((s) => s !== source)
      : [...sources, source];
    if (updated.length > 0) onSourcesChange(updated);
  }, [sources, onSourcesChange]);

  const toggleStudyType = useCallback((clause: string) => {
    if (!onStudyTypesChange) return;
    const updated = studyTypes.includes(clause)
      ? studyTypes.filter((s) => s !== clause)
      : [...studyTypes, clause];
    onStudyTypesChange(updated);
  }, [studyTypes, onStudyTypesChange]);

  const applyTemplate = useCallback((template: typeof QUERY_TEMPLATES[number]) => {
    const trimmed = query.trim();
    const nextQuery = trimmed ? `${trimmed} ${template.query}` : template.query;
    setQuery(nextQuery);
    onStudyTypesChange?.(template.studyTypes);
    onSpecificityChange?.(template.specificity);
    trackSearch(nextQuery, { template: template.id, specificity: template.specificity, sources: sources.join(',') });
    onSearch(nextQuery);
  }, [onSearch, onSpecificityChange, onStudyTypesChange, query, setQuery, sources, trackSearch]);

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit}>
        {/* Main input */}
        <div className={`relative rounded-2xl transition-all duration-300 ${
          focused
            ? 'shadow-[0_0_0_1px_rgba(99,102,241,0.5),0_8px_40px_-8px_rgba(99,102,241,0.35)]'
            : 'shadow-[0_4px_24px_-4px_rgba(15,23,42,0.14)]'
        }`}>
          <div className="absolute inset-0 rounded-2xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl -z-0 border border-slate-200/80 dark:border-slate-700/60" />

          <div className="relative flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:px-5">
            <div className="flex w-full min-w-0 flex-1 items-center gap-3">
              {loading ? (
                <svg className="animate-spin h-4 w-4 text-indigo-500 shrink-0" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <svg className="h-4 w-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="8" strokeWidth="2" />
                  <path d="m21 21-4.35-4.35" strokeWidth="2" strokeLinecap="round" />
                </svg>
              )}

              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder={placeholder}
                className="min-w-0 flex-1 bg-transparent text-base text-slate-900 outline-none placeholder-slate-400 dark:text-slate-100 dark:placeholder-slate-500"
              />

              {query && !loading && (
                <button
                  type="button"
                  title="Clear search"
                  aria-label="Clear search query"
                  onClick={() => { setQuery(''); setMeshSuggestions([]); }}
                  className="text-slate-300 dark:text-slate-600 hover:text-slate-500 dark:hover:text-slate-400 transition-colors shrink-0"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={!query.trim() || loading}
              className="w-full shrink-0 rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm shadow-indigo-500/25 transition-all hover:bg-indigo-500 hover:shadow-indigo-500/40 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
            >
              {loading ? 'Searching…' : 'Search'}
            </button>
          </div>
        </div>

        {showRecentDropdown && (
          <div className="mt-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg overflow-hidden z-50">
            <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800">
              Recent searches
            </div>
            {recentSearches.map((entry) => (
              <button
                key={`${entry.source}-${entry.query}`}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); applyRecentSearch(entry.query); }}
                className="flex min-h-11 w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-indigo-50 hover:text-indigo-700 dark:text-slate-300 dark:hover:bg-indigo-950/40 dark:hover:text-indigo-300 sm:min-h-0"
              >
                <i className="fas fa-history text-[10px] text-slate-400 shrink-0" aria-hidden />
                <span className="min-w-0 flex-1 truncate">{entry.query}</span>
                <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 shrink-0">
                  {RECENT_SOURCE_LABEL[entry.source]}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* MeSH suggestions dropdown */}
        {focused && meshSuggestions.length > 0 && (
          <div className="mt-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg overflow-hidden z-50">
            <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800">
              MeSH canonical terms
            </div>
            {meshSuggestions.map((s) => (
              <button
                key={s.resource || s.label}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); applyMeshSuggestion(s.label); }}
                className="flex min-h-11 w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-indigo-50 hover:text-indigo-700 dark:text-slate-300 dark:hover:bg-indigo-950/40 dark:hover:text-indigo-300 sm:min-h-0"
              >
                <span className="text-indigo-400 font-mono text-xs">MeSH</span>
                {s.label}
              </button>
            ))}
          </div>
        )}

        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          {/* Source + vector toggles */}
          <div className="flex flex-wrap items-center gap-2">
            {SOURCE_OPTIONS.map((src) => {
              const active = sources.includes(src.value);
              return (
                <button
                  key={src.value}
                  type="button"
                  onClick={() => toggleSource(src.value)}
                  className={`flex min-h-11 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all sm:min-h-0 ${
                    active
                      ? 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 shadow-sm'
                      : 'bg-transparent text-slate-400 dark:text-slate-600 border-transparent hover:text-slate-500 dark:hover:text-slate-500'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${active ? src.dot : 'bg-slate-300 dark:bg-slate-600'}`} />
                  {src.label}
                </button>
              );
            })}

            {vectorSearchEnabled && onVectorModeChange && (
              <button
                type="button"
                onClick={() => onVectorModeChange(!useVectorSearch)}
                className={`flex min-h-11 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all sm:min-h-0 ${
                  useVectorSearch
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50'
                    : 'bg-transparent text-slate-400 dark:text-slate-600 border-transparent hover:text-slate-500'
                }`}
                title="Fuse pgvector results into ranked list (RRF). Requires indexed corpus."
              >
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Semantic
              </button>
            )}
          </div>

          {/* Specificity tabs (Broad / Balanced / Strict) removed — always use moderate */}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Templates</span>
          {QUERY_TEMPLATES.map((template) => (
            <button
              key={template.id}
              type="button"
              onClick={() => applyTemplate(template)}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-slate-200 bg-white/80 px-3 py-1 text-[11px] font-semibold text-slate-600 transition-colors hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300 dark:hover:border-indigo-800 dark:hover:bg-indigo-950/40 dark:hover:text-indigo-300 sm:min-h-8 sm:px-2.5"
              title={`Search using ${template.label.toLowerCase()} filters`}
            >
              <i className={`fas ${template.icon} text-[10px] text-slate-400`} />
              {template.label}
            </button>
          ))}
        </div>

        {(onStudyTypesChange || onYearRangeChange) && (
          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            {onStudyTypesChange && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Study type</span>
                {STUDY_TYPE_FILTER_OPTIONS.map((opt) => {
                  const active = studyTypes.includes(opt.clause);
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => toggleStudyType(opt.clause)}
                      className={`min-h-11 rounded-full border px-3 py-1 text-[11px] font-semibold transition-colors sm:min-h-0 sm:px-2.5 ${
                        active
                          ? 'border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300'
                          : 'border-transparent bg-slate-100/80 text-slate-500 hover:text-slate-700 dark:bg-slate-800/60 dark:text-slate-400 dark:hover:text-slate-200'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            )}
            {onYearRangeChange && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Years</span>
                <input
                  type="number"
                  min={1990}
                  max={currentYear}
                  placeholder="From"
                  value={yearRange?.[0] ?? ''}
                  onChange={(e) => {
                    const from = e.target.value ? Number(e.target.value) : undefined;
                    const to = yearRange?.[1];
                    if (from && to) onYearRangeChange([from, to]);
                    else if (!from && !to) onYearRangeChange(undefined);
                    else if (from) onYearRangeChange([from, from]);
                  }}
                  className="w-20 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                />
                <span className="text-xs text-slate-400">–</span>
                <input
                  type="number"
                  min={1990}
                  max={currentYear}
                  placeholder="To"
                  value={yearRange?.[1] ?? ''}
                  onChange={(e) => {
                    const to = e.target.value ? Number(e.target.value) : undefined;
                    const from = yearRange?.[0];
                    if (from && to) onYearRangeChange([from, to]);
                    else if (!from && !to) onYearRangeChange(undefined);
                    else if (to) onYearRangeChange([to, to]);
                  }}
                  className="w-20 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                />
              </div>
            )}
          </div>
        )}
      </form>
    </div>
  );
};
