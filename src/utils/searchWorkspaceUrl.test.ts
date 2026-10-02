import {
  buildSearchWorkspaceParams,
  chooseDefaultWorkspaceTab,
  parseSearchWorkspaceParams,
} from './searchWorkspaceUrl';

describe('search workspace URL state', () => {
  it('round-trips the query, workspace, result controls and retrieval filters', () => {
    const params = buildSearchWorkspaceParams({
      query: 'heart failure SGLT2',
      tab: 'learn',
      lens: 'open_access',
      lane: 'reviews',
      sort: 'newest',
      resultFilter: 'dapagliflozin',
      filters: {
        specificity: 'strict',
        sources: ['pubmed', 'openalex'],
        yearRange: [2020, 2026],
        studyTypes: ['Randomized Controlled Trial[pt]', 'Meta-Analysis[pt]'],
        useVectorSearch: true,
      },
    });

    expect(parseSearchWorkspaceParams(params)).toEqual({
      query: 'heart failure SGLT2',
      tab: 'learn',
      lens: 'open_access',
      lane: 'reviews',
      sort: 'newest',
      resultFilter: 'dapagliflozin',
      filters: {
        specificity: 'strict',
        sources: ['pubmed', 'openalex'],
        yearRange: [2020, 2026],
        studyTypes: ['Randomized Controlled Trial[pt]', 'Meta-Analysis[pt]'],
        useVectorSearch: true,
      },
    });
  });

  it('uses safe defaults for invalid URL values', () => {
    const parsed = parseSearchWorkspaceParams(new URLSearchParams('q=x&tab=bad&sort=bad&lane=bad&from=abc&to=2026'));
    expect(parsed).toMatchObject({ tab: 'evidence', sort: 'relevance', lane: 'all' });
    expect(parsed.filters.yearRange).toBeUndefined();
  });

  it('opens the ranked evidence list unless a tab was explicitly requested', () => {
    expect(chooseDefaultWorkspaceTab()).toBe('evidence');
    expect(chooseDefaultWorkspaceTab('learn')).toBe('learn');
    expect(chooseDefaultWorkspaceTab('guidelines')).toBe('guidelines');
  });
});
