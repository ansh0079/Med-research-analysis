import { isOpenAccessArticle, normalizePmcid, resolveFreeFullTextUrl } from './articleAccess';

describe('articleAccess', () => {
  test('treats OpenAlex diamond OA without PMC as free', () => {
    const article = {
      uid: 'https://openalex.org/W4381988646',
      title: 'Recent advances in pathophysiology, diagnosis and management of hepatorenal syndrome: A review',
      isFree: true,
      openAccess: true,
      openAccessUrl: 'https://doi.org/10.4254/wjh.v15.i6.741',
      _source: 'openalex' as const,
    };
    expect(isOpenAccessArticle(article)).toBe(true);
    expect(resolveFreeFullTextUrl(article)).toBe('https://doi.org/10.4254/wjh.v15.i6.741');
  });

  test('normalizes dirty PubMed PMC ids', () => {
    expect(normalizePmcid('pmc-id: PMC10308288;')).toBe('PMC10308288');
  });
});
