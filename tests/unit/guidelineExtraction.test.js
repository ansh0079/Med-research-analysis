'use strict';
const { validateExtractedGuideline, extractPubmedId } = require('../../server/utils/guidelineExtraction');
const article = { pmid: '123', title: 'NICE guidance on asthma', journal: 'Respiratory Medicine', year: 2024,
    abstract: 'NICE recommends considering inhaled therapy for asthma.' };
const rec = { sourceBody: 'NICE', sourceUrl: 'https://pubmed.ncbi.nlm.nih.gov/123/', recommendationText: 'Consider inhaled therapy for asthma.' };

test('repairs the literal PMID path segment found in bulk-run URLs', () => {
    expect(extractPubmedId('https://pubmed.ncbi.nlm.nih.gov/PMID/123')).toBe('123');
    expect(validateExtractedGuideline({ ...rec, sourceUrl: 'https://pubmed.ncbi.nlm.nih.gov/PMID/123' }, [article]).sourceUrl).toBe(rec.sourceUrl);
    expect(extractPubmedId('https://pubmed.ncbi.nlm.nih.gov.evil.example/123')).toBeNull();
});

test('binds attribution, URL and year to the supplied article', () => {
    expect(validateExtractedGuideline({ ...rec, sourceYear: 2030 }, [article]))
        .toEqual({ ...rec, sourceYear: 2024 });
});
test.each([
    { ...rec, sourceBody: 'Respiratory Medicine' },
    { ...rec, sourceBody: 'AHA' },
    { ...rec, sourceBody: 'ICE' },
    { ...rec, sourceUrl: 'https://pubmed.ncbi.nlm.nih.gov/999/' },
    { ...rec, sourceUrl: 'https://example.com/123' },
    { ...rec, recommendationText: {} },
    null,
])('rejects journal substitution, invented attribution and invalid provenance: %j', (candidate) => {
    expect(validateExtractedGuideline(candidate, [article])).toBeNull();
});
test('allows explicitly named bodies outside the curated display list', () => {
    expect(validateExtractedGuideline({ ...rec, sourceBody: 'Example Clinical Society' },
        [{ ...article, title: 'Example Clinical Society practice guideline' }])).not.toBeNull();
});
test('does not transfer attribution between two articles', () => {
    expect(validateExtractedGuideline(rec, [{ ...article, pmid: '456' },
        { ...article, title: 'Asthma guideline', abstract: 'Consider inhaled therapy.' }])).toBeNull();
});
