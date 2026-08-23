'use strict';

const {
    normalizePmcid,
    extractPubmedPmcid,
    isOpenAccessArticle,
    resolveFreeFullTextUrl,
    annotateOpenAccess,
    mergeOpenAccessFields,
} = require('../../server/utils/articleAccess');
const { articleFromOpenAlexWork } = require('../../server/services/unifiedEvidenceSearch/openAlexMapper');
const { mergeArticleMetadata } = require('../../server/services/unifiedEvidenceSearch/articleDedupe');
const { sanitizeArticleOutput } = require('../../server/utils/articles');

const HRS_REVIEW_ARTICLEIDS = [
    { idtype: 'pubmed', value: '37397940' },
    { idtype: 'pmc', value: 'PMC10308288' },
    { idtype: 'pmcid', value: 'pmc-id: PMC10308288;' },
    { idtype: 'doi', value: '10.4254/wjh.v15.i6.741' },
];

describe('article open-access access', () => {
    test('normalizes dirty PubMed pmcid strings from esummary', () => {
        expect(normalizePmcid('PMC10308288')).toBe('PMC10308288');
        expect(normalizePmcid('pmc-id: PMC10308288;')).toBe('PMC10308288');
        expect(extractPubmedPmcid(HRS_REVIEW_ARTICLEIDS)).toBe('PMC10308288');
    });

    test('treats the hepatorenal review as free from PubMed articleids', () => {
        const annotated = annotateOpenAccess({
            title: 'Recent advances in pathophysiology, diagnosis and management of hepatorenal syndrome: A review',
            pmid: '37397940',
            articleids: HRS_REVIEW_ARTICLEIDS,
        });
        expect(annotated.pmcid).toBe('PMC10308288');
        expect(annotated.isFree).toBe(true);
        expect(resolveFreeFullTextUrl(annotated)).toBe('https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10308288/');
    });

    test('OpenAlex diamond OA without PMC is still free (the previous paywall false positive)', () => {
        const article = articleFromOpenAlexWork({
            id: 'https://openalex.org/W4381988646',
            display_name: 'Recent advances in pathophysiology, diagnosis and management of hepatorenal syndrome: A review',
            publication_year: 2023,
            doi: 'https://doi.org/10.4254/wjh.v15.i6.741',
            ids: {
                doi: 'https://doi.org/10.4254/wjh.v15.i6.741',
                pmid: 'https://pubmed.ncbi.nlm.nih.gov/37397940',
            },
            open_access: {
                is_oa: true,
                oa_status: 'diamond',
                oa_url: 'https://doi.org/10.4254/wjh.v15.i6.741',
            },
            authorships: [],
        });
        expect(article.isFree).toBe(true);
        expect(article.openAccess).toBe(true);
        expect(isOpenAccessArticle(article)).toBe(true);
        expect(resolveFreeFullTextUrl(article)).toBe('https://doi.org/10.4254/wjh.v15.i6.741');
        const sanitized = sanitizeArticleOutput(article);
        expect(sanitized.isFree).toBe(true);
        expect(sanitized.fullTextUrl).toBe('https://doi.org/10.4254/wjh.v15.i6.741');
    });

    test('merging OpenAlex OA onto a PubMed row without PMC keeps the paper free', () => {
        const pubmed = {
            uid: 'pubmed-37397940',
            pmid: '37397940',
            title: 'Recent advances in pathophysiology, diagnosis and management of hepatorenal syndrome: A review',
            isFree: false,
            _source: 'pubmed',
        };
        const openalex = {
            uid: 'https://openalex.org/W4381988646',
            pmid: '37397940',
            openAccess: true,
            isFree: true,
            openAccessUrl: 'https://doi.org/10.4254/wjh.v15.i6.741',
            _source: 'openalex',
        };
        const merged = mergeArticleMetadata(pubmed, openalex);
        expect(merged.isFree).toBe(true);
        expect(merged.openAccessUrl).toBe('https://doi.org/10.4254/wjh.v15.i6.741');
        expect(mergeOpenAccessFields(pubmed, openalex).isFree).toBe(true);
    });
});
