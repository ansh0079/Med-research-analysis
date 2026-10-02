import type { DataSource, SearchFilters } from '@types';

// PubMed and OpenAlex carry a search (OpenAlex also supplies citation counts and
// open-access links).
export const DEFAULT_SOURCES: DataSource[] = ['pubmed', 'openalex'];

// Semantic Scholar was removed as a search source: without a working API key its
// anonymous pool rate-limits most requests, and a throttled source silently returns
// nothing. The server ignores it too; this keeps saved browser settings from showing
// or sending it.
const RETIRED_SOURCES: readonly string[] = ['semantic'];

export function defaultSearchFilters(): SearchFilters {
  return {
    sources: [...DEFAULT_SOURCES],
    specificity: 'moderate',
    useVectorSearch: true,
  };
}

/**
 * Merges saved filters over the defaults, dropping retired sources. If a saved choice
 * contained only retired sources, the defaults apply rather than an empty search.
 */
export function mergeSavedFilters(saved: unknown): SearchFilters {
  const defaults = defaultSearchFilters();
  if (!saved || typeof saved !== 'object') return defaults;
  const merged: SearchFilters = { ...defaults, ...(saved as SearchFilters) };
  if (Array.isArray(merged.sources)) {
    const kept = merged.sources.filter((source) => !RETIRED_SOURCES.includes(source));
    merged.sources = kept.length > 0 ? kept : [...DEFAULT_SOURCES];
  }
  return merged;
}
