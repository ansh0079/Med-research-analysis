import React, { useCallback, useEffect, useState } from 'react';
import { useSearchContext } from '@contexts/SearchContext';
import { Button } from '@components/ui/Button';
import api from '@services/api';
import type { GuidelineEntry } from '@types';

const PAGE_SIZE = 25;
const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: 'Any status' },
  { value: 'human_reviewed', label: 'Human reviewed' },
  { value: 'ai_extracted', label: 'AI extracted' },
  { value: 'stale', label: 'Stale' },
];

export const GuidelineBrowserPage: React.FC = () => {
  const { setCurrentPage, setQuery: setSearchContextQuery } = useSearchContext();
  const [queryInput, setQueryInput] = useState('');
  const [status, setStatus] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');
  const [appliedStatus, setAppliedStatus] = useState('');
  const [offset, setOffset] = useState(0);
  const [rows, setRows] = useState<GuidelineEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (q: string, st: string, off: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.browseGuidelines({
        query: q || undefined,
        status: st || undefined,
        limit: PAGE_SIZE,
        offset: off,
      });
      setRows(res.guidelines);
      setTotal(res.total);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not load guidelines');
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(appliedQuery, appliedStatus, offset);
  }, [appliedQuery, appliedStatus, offset, load]);

  const applyFilters = () => {
    setOffset(0);
    setAppliedQuery(queryInput.trim());
    setAppliedStatus(status);
  };

  const openInSearch = (topic: string) => {
    setSearchContextQuery(topic);
    setCurrentPage('search');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800 pb-16">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <button
          type="button"
          onClick={() => setCurrentPage('search')}
          className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 hover:text-indigo-600 transition-colors flex items-center gap-2"
        >
          <i className="fas fa-arrow-left" /> Back to Search
        </button>

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black text-gray-900 dark:text-white">Guideline library</h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 max-w-2xl leading-relaxed">
              Curated recommendation snippets stored in the platform—the same sources referenced when synthesizing evidence for a topic.
              Always verify against the original guideline; status labels describe editorial workflow, not clinical approval.
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-4 mb-6 space-y-3">
          <div className="flex flex-col md:flex-row gap-3">
            <input
              type="search"
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
              placeholder="Search topic, issuing body, or recommendation text…"
              className="flex-1 px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            <select
              title="Filter by curation status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none md:w-52"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value || 'any'} value={o.value}>{o.label}</option>
              ))}
            </select>
            <Button variant="primary" onClick={applyFilters} leftIcon={<i className="fas fa-search" />}>
              Search
            </Button>
          </div>
          <p className="text-[11px] text-gray-400 dark:text-gray-500">
            {total.toLocaleString()} snippet{total === 1 ? '' : 's'} match these filters (superseded entries are hidden).
          </p>
        </div>

        {error && (
          <div className="mb-4 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm">
            <i className="fas fa-exclamation-circle mr-2" />{error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <i className="fas fa-spinner fa-spin text-2xl text-indigo-500" />
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-16 text-gray-500 dark:text-gray-400 text-sm">
            No guidelines found. Try a shorter keyword or clear filters.
          </div>
        ) : (
          <ul className="space-y-4">
            {rows.map((g) => (
              <li
                key={g.id}
                className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => openInSearch(g.topic)}
                    className="text-left font-bold text-indigo-600 dark:text-indigo-400 hover:underline text-sm"
                  >
                    {g.topic}
                  </button>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                    {g.status.replace(/_/g, ' ')}
                  </span>
                  {g.sourceYear != null && (
                    <span className="text-xs text-gray-400">{g.sourceYear}</span>
                  )}
                </div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                  {g.sourceBody}
                  {g.sourceRegion ? ` · ${g.sourceRegion}` : ''}
                </p>
                <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">
                  {g.recommendationText}
                </p>
                <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
                  {g.recommendationStrength && (
                    <span><span className="font-bold text-gray-600 dark:text-gray-300">Strength:</span> {g.recommendationStrength}</span>
                  )}
                  {g.sourceUrl && (
                    <a
                      href={g.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                    >
                      Primary source <i className="fas fa-external-link-alt ml-0.5 text-[10px]" />
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        {total > PAGE_SIZE && (
          <div className="flex justify-center gap-3 mt-8">
            <Button
              variant="secondary"
              size="sm"
              disabled={offset <= 0 || loading}
              onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
            >
              Previous
            </Button>
            <span className="text-sm text-gray-500 self-center">
              {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of {total}
            </span>
            <Button
              variant="secondary"
              size="sm"
              disabled={offset + PAGE_SIZE >= total || loading}
              onClick={() => setOffset((o) => o + PAGE_SIZE)}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
