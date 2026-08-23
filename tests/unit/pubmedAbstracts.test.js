'use strict';

const {
    parsePubmedEfetchAbstracts,
    articleHasUsableAbstract,
    articleHasSynopsisSource,
    hydrateArticleAbstract,
    attachAbstractsToArticles,
    ABSTRACT_MIN_CHARS,
} = require('../../server/utils/pubmedAbstracts');

const HRS_XML = `
<PubmedArticleSet>
  <PubmedArticle>
    <MedlineCitation>
      <PMID Version="1">37397940</PMID>
      <Article>
        <ArticleTitle>Recent advances in pathophysiology, diagnosis and management of hepatorenal syndrome: A review</ArticleTitle>
        <Abstract>
          <AbstractText Label="AIM" NlmCategory="OBJECTIVE">Hepatorenal syndrome is a severe complication of cirrhosis.</AbstractText>
          <AbstractText Label="METHODS" NlmCategory="METHODS">This review summarises recent diagnostic criteria and treatment options including terlipressin.</AbstractText>
        </Abstract>
      </Article>
    </MedlineCitation>
  </PubmedArticle>
</PubmedArticleSet>
`;

describe('pubmedAbstracts', () => {
    test('parses labeled AbstractText blocks from PubMed efetch XML', () => {
        const map = parsePubmedEfetchAbstracts(HRS_XML);
        expect(map['37397940']).toContain('AIM: Hepatorenal syndrome');
        expect(map['37397940']).toContain('METHODS: This review summarises');
    });

    test('decodes XML entities and strips inner tags', () => {
        const map = parsePubmedEfetchAbstracts(`
            <PubmedArticle>
              <PMID>11</PMID>
              <AbstractText>Patients with &lt;i&gt;E. coli&lt;/i&gt; and 95% CI 1.2&amp;#x2013;3.4.</AbstractText>
            </PubmedArticle>
        `);
        expect(map['11']).toContain('E. coli');
        expect(map['11']).toContain('1.2–3.4');
    });

    test('articleHasUsableAbstract rejects title-only stubs', () => {
        expect(articleHasUsableAbstract({ title: 'A review', abstract: undefined })).toBe(false);
        expect(articleHasUsableAbstract({ abstract: 'too short' })).toBe(false);
        expect(articleHasUsableAbstract({
            abstract: 'x'.repeat(ABSTRACT_MIN_CHARS),
        })).toBe(true);
    });

    test('articleHasSynopsisSource accepts cached full text without an abstract', () => {
        expect(articleHasSynopsisSource({
            title: 'Trial',
            _fullTextIndexed: true,
            _fullTextWordCount: 1200,
        })).toBe(true);
        expect(articleHasSynopsisSource({ title: 'Trial' })).toBe(false);
    });

    test('attachAbstractsToArticles fills missing abstracts only', () => {
        const articles = attachAbstractsToArticles([
            { pmid: '37397940', title: 'HRS', abstract: undefined },
            { pmid: '1', title: 'Has one', abstract: 'This abstract is already long enough to keep as-is from another source.' },
        ], {
            37397940: 'Hepatorenal syndrome abstract that is long enough to use for a critical appraisal.',
            1: 'should not replace',
        });
        expect(articles[0].abstract).toMatch(/Hepatorenal syndrome abstract/);
        expect(articles[1].abstract).toMatch(/already long enough/);
    });

    test('hydrateArticleAbstract fetches by PMID and caches the result', async () => {
        const fetchImpl = jest.fn(async () => ({
            ok: true,
            text: async () => HRS_XML,
        }));
        const store = new Map();
        const cache = {
            getAsync: jest.fn(async (key) => store.get(key)),
            setAsync: jest.fn(async (key, value) => store.set(key, value)),
        };

        const hydrated = await hydrateArticleAbstract(
            { pmid: '37397940', title: 'HRS review' },
            {
                fetchImpl,
                urlForIds: (ids) => `https://example.test/efetch?id=${ids.join(',')}`,
                cache,
            }
        );

        expect(hydrated.abstract).toContain('Hepatorenal syndrome');
        expect(fetchImpl).toHaveBeenCalledTimes(1);
        expect(cache.setAsync).toHaveBeenCalledWith(
            'pubmed-abstract:37397940',
            expect.stringContaining('Hepatorenal syndrome'),
            7 * 86400
        );

        const cached = await hydrateArticleAbstract(
            { pmid: '37397940', title: 'HRS review' },
            {
                fetchImpl,
                urlForIds: (ids) => `https://example.test/efetch?id=${ids.join(',')}`,
                cache,
            }
        );
        expect(cached.abstract).toContain('Hepatorenal syndrome');
        expect(fetchImpl).toHaveBeenCalledTimes(1);
    });
});
