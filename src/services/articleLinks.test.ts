import type { Article } from '@types';
import { getArticleLinkInfo } from './articleLinks';

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
