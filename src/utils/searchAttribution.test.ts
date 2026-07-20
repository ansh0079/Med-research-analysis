import {
  storeSearchAttributionFromArticles,
  lookupArticleAttribution,
  normalizeAttributionKey,
} from './searchAttribution';

describe('searchAttribution', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  test('normalizeAttributionKey strips pubmed/pmid/doi prefixes', () => {
    expect(normalizeAttributionKey('pubmed:12345')).toBe('12345');
    expect(normalizeAttributionKey('PMID: 12345')).toBe('12345');
    expect(normalizeAttributionKey('https://doi.org/10.1000/xyz')).toBe('10.1000/xyz');
  });

  test('lookup matches by pmid alias after store from articles', () => {
    storeSearchAttributionFromArticles(42, [
      {
        uid: 'pubmed:999001',
        pmid: '999001',
        doi: '10.1000/demo',
        _decisionId: 7,
        _banditArmId: 'quiz_gap_heavy',
      },
    ]);

    expect(lookupArticleAttribution('999001')).toMatchObject({
      searchId: 42,
      decisionId: 7,
      banditArmId: 'quiz_gap_heavy',
    });
    expect(lookupArticleAttribution('pubmed:999001')?.decisionId).toBe(7);
    expect(lookupArticleAttribution('10.1000/demo')?.banditArmId).toBe('quiz_gap_heavy');
  });

  test('lookup falls back to localStorage when sessionStorage empty', () => {
    storeSearchAttributionFromArticles(9, [
      { uid: 'uid-a', pmid: '111', _decisionId: 3, _banditArmId: 'heuristic_default' },
    ]);
    sessionStorage.clear();
    expect(lookupArticleAttribution('uid-a')?.decisionId).toBe(3);
  });
});
