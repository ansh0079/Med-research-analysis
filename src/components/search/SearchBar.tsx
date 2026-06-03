import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useAnalytics } from '@hooks/useAnalytics';
import { useDebounce } from '@hooks/useDebounce';
import { api } from '@services/api';
import type { SpecificityLevel, DataSource } from '@types';

interface SearchBarProps {
  onSearch: (query: string) => void;
  loading?: boolean;
  specificity?: SpecificityLevel;
  onSpecificityChange?: (level: SpecificityLevel) => void;
  sources?: DataSource[];
  onSourcesChange?: (sources: DataSource[]) => void;
  vectorSearchEnabled?: boolean;
  useVectorSearch?: boolean;
  onVectorModeChange?: (enabled: boolean) => void;
  placeholder?: string;
}

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

export const SearchBar: React.FC<SearchBarProps> = ({
  onSearch, loading = false, specificity = 'moderate',
  onSpecificityChange, sources = ['pubmed'], onSourcesChange,
  vectorSearchEnabled = false, useVectorSearch = false, onVectorModeChange,
  placeholder = 'Enter your research query…',
}) => {
  const [query, setQuery] = useState('');
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
    api.meshSuggest(trimmed).then((data) => {
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
  }, [onSearch, specificity, sources, trackSearch]);

  const toggleSource = useCallback((source: DataSource) => {
    if (!onSourcesChange) return;
    const updated = sources.includes(source)
      ? sources.filter((s) => s !== source)
      : [...sources, source];
    if (updated.length > 0) onSourcesChange(updated);
  }, [sources, onSourcesChange]);

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
                  onClick={() => setQuery('')}
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
                className="w-full text-left px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-2 transition-colors"
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
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
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
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                  useVectorSearch
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50'
                    : 'bg-transparent text-slate-400 dark:text-slate-600 border-transparent hover:text-slate-500'
                }`}
                title="Fuse pgvector results into ranked list (RRF). Requires indexed corpus."
              >
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Vector
              </button>
            )}
          </div>

          {onSpecificityChange && (
            <div className="flex w-full overflow-hidden rounded-full border border-slate-200 bg-white/80 p-0.5 shadow-sm dark:border-slate-700 dark:bg-slate-900/70 sm:w-auto">
              {SPECIFICITY_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  title={option.title}
                  onClick={() => onSpecificityChange(option.value)}
                  className={`flex-1 rounded-full px-3 py-1 text-xs font-semibold transition-colors sm:flex-none ${
                    specificity === option.value
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </form>
    </div>
  );
};
