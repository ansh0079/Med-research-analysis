import { DEFAULT_SOURCES, defaultSearchFilters, mergeSavedFilters } from './searchFilterDefaults';

describe('search filter defaults', () => {
  it('searches PubMed and OpenAlex by default', () => {
    expect(DEFAULT_SOURCES).toEqual(['pubmed', 'openalex']);
    expect(defaultSearchFilters()).toMatchObject({ sources: ['pubmed', 'openalex'], specificity: 'moderate', useVectorSearch: true });
  });

  it('removes the retired Semantic Scholar source from saved settings, in any order', () => {
    expect(mergeSavedFilters({ sources: ['pubmed', 'openalex', 'semantic'] }).sources).toEqual(['pubmed', 'openalex']);
    expect(mergeSavedFilters({ sources: ['semantic', 'pubmed', 'openalex'] }).sources).toEqual(['pubmed', 'openalex']);
    expect(mergeSavedFilters({ sources: ['pubmed', 'semantic'] }).sources).toEqual(['pubmed']);
  });

  it('keeps the rest of a chosen combination', () => {
    expect(mergeSavedFilters({ sources: ['openalex'] }).sources).toEqual(['openalex']);
    expect(mergeSavedFilters({ sources: ['pubmed', 'crossref'] }).sources).toEqual(['pubmed', 'crossref']);
  });

  it('falls back to the defaults when only retired sources were saved', () => {
    expect(mergeSavedFilters({ sources: ['semantic'] }).sources).toEqual(['pubmed', 'openalex']);
    expect(mergeSavedFilters({ sources: [] }).sources).toEqual(['pubmed', 'openalex']);
  });

  it('preserves the other saved settings', () => {
    const merged = mergeSavedFilters({ sources: ['pubmed', 'openalex', 'semantic'], specificity: 'strict', yearRange: [2020, 2026] });
    expect(merged).toMatchObject({ sources: ['pubmed', 'openalex'], specificity: 'strict', yearRange: [2020, 2026], useVectorSearch: true });
  });

  it('falls back to the defaults for missing or malformed saved data', () => {
    for (const bad of [null, undefined, 'x', 5]) {
      expect(mergeSavedFilters(bad).sources).toEqual(['pubmed', 'openalex']);
    }
  });

  it('never shares the defaults array between callers', () => {
    const a = defaultSearchFilters();
    a.sources?.push('crossref');
    expect(defaultSearchFilters().sources).toEqual(['pubmed', 'openalex']);
  });
});
