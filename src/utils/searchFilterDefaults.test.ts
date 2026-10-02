import { DEFAULT_SOURCES, defaultSearchFilters, mergeSavedFilters } from './searchFilterDefaults';

describe('search filter defaults', () => {
  it('does not request Semantic Scholar by default', () => {
    expect(DEFAULT_SOURCES).toEqual(['pubmed', 'openalex']);
    expect(defaultSearchFilters()).toMatchObject({ sources: ['pubmed', 'openalex'], specificity: 'moderate', useVectorSearch: true });
  });

  it('moves a saved copy of the old default to the new default, in any order', () => {
    expect(mergeSavedFilters({ sources: ['pubmed', 'openalex', 'semantic'] }).sources).toEqual(['pubmed', 'openalex']);
    expect(mergeSavedFilters({ sources: ['semantic', 'pubmed', 'openalex'] }).sources).toEqual(['pubmed', 'openalex']);
  });

  it('keeps a combination the person actually chose', () => {
    expect(mergeSavedFilters({ sources: ['pubmed', 'semantic'] }).sources).toEqual(['pubmed', 'semantic']);
    expect(mergeSavedFilters({ sources: ['semantic'] }).sources).toEqual(['semantic']);
    expect(mergeSavedFilters({ sources: ['pubmed', 'openalex', 'semantic', 'crossref'] }).sources)
      .toEqual(['pubmed', 'openalex', 'semantic', 'crossref']);
  });

  it('preserves the other saved settings while migrating sources', () => {
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
    a.sources?.push('semantic');
    expect(defaultSearchFilters().sources).toEqual(['pubmed', 'openalex']);
  });
});
