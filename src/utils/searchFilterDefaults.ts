import type { DataSource, SearchFilters } from '@types';

// PubMed and OpenAlex carry a search (OpenAlex also supplies citation counts and
// open-access links). Semantic Scholar stays available as a toggle, but it is not
// requested by default: without an API key it is rate-limited, and a rate-limited
// source silently returns nothing, which also kept shared results from being cached
// for long (see assessSharedResult on the server).
export const DEFAULT_SOURCES: DataSource[] = ['pubmed', 'openalex'];

const PREVIOUS_DEFAULT_SOURCES: DataSource[] = ['pubmed', 'openalex', 'semantic'];

const sameSet = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((item) => b.includes(item));

export function defaultSearchFilters(): SearchFilters {
  return {
    sources: [...DEFAULT_SOURCES],
    specificity: 'moderate',
    useVectorSearch: true,
  };
}

/**
 * Merges saved filters over the defaults. Filters are saved on every search, so a
 * returning visitor's saved sources are almost always just the old default rather
 * than a choice. Only that exact old default is moved to the new one; anyone who
 * picked a different combination keeps it.
 */
export function mergeSavedFilters(saved: unknown): SearchFilters {
  const defaults = defaultSearchFilters();
  if (!saved || typeof saved !== 'object') return defaults;
  const merged: SearchFilters = { ...defaults, ...(saved as SearchFilters) };
  if (Array.isArray(merged.sources) && sameSet(merged.sources, PREVIOUS_DEFAULT_SOURCES)) {
    merged.sources = [...DEFAULT_SOURCES];
  }
  return merged;
}
