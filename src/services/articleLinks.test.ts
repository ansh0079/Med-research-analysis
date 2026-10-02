import type { Article } from '@types';
import { getArticleLinkInfo, getArticleSourceBadgeInfo } from './articleLinks';

const article = (fields: Partial<Article>) => ({ title: 'Heart failure', _source: 'pubmed', ...fields } as Article);

test.each(['123', 'pmid-123', 'pubmed-123', 'PMID:123'])(
  'resolves PubMed identifier %s', (uid) => {
    expect(getArticleLinkInfo(article({ uid })).primaryUrl).toBe('https://pubmed.ncbi.nlm.nih.gov/123/');
  },
);

test('prefers the explicit PMID over an internal storage identifier', () => {
  expect(getArticleLinkInfo(article({ uid: 'document-42', pmid: '456' })).primaryUrl)
    .toBe('https://pubmed.ncbi.nlm.nih.gov/456/');
});

test('missing PMID produces a title search, not a broken PubMed record link', () => {
  expect(getArticleLinkInfo(article({ uid: 'document-42' })).primaryUrl)
    .toBe('https://pubmed.ncbi.nlm.nih.gov/?term=Heart%20failure');
});

describe('Europe PMC results', () => {
  const epmc = (fields: Partial<Article>) => article({ _source: 'europepmc', ...fields });

  test('link to the Europe PMC record by PMID, then PMC id, then DOI', () => {
    expect(getArticleLinkInfo(epmc({ uid: 'pubmed-789', pmid: '789' })).primaryUrl).toBe('https://europepmc.org/article/MED/789');
    expect(getArticleLinkInfo(epmc({ uid: 'europepmc-PMC-PMC555', pmcid: 'PMC555' })).primaryUrl).toBe('https://europepmc.org/article/PMC/PMC555');
    expect(getArticleLinkInfo(epmc({ uid: 'europepmc-PPR-PPR1', doi: '10.1/abc' })).primaryUrl).toBe('https://doi.org/10.1%2Fabc');
  });

  test('are labelled Europe PMC, not mistaken for PubMed because they carry a PMID', () => {
    expect(getArticleSourceBadgeInfo(epmc({ uid: 'pubmed-789', pmid: '789' }))).toMatchObject({ key: 'europepmc', label: 'Europe PMC' });
    expect(getArticleLinkInfo(epmc({ uid: 'pubmed-789', pmid: '789' })).primaryLabel).toBe('Europe PMC');
  });
});
