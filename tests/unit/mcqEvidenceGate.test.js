'use strict';

const {
    loadStoredFullTextEvidenceIndex,
    mcqMatchesStoredFullText,
} = require('../../server/services/mcqEvidenceGate');

describe('mcqEvidenceGate', () => {
    test('matches stored full text using guideline, PMID, DOI, and source URL identifiers', async () => {
        const db = { all: jest.fn().mockResolvedValue([
            { document_id: 7, guideline_id: 11, pmid: '39210723', doi: '10.1000/example', source_url: 'https://example.org/paper' },
        ]) };
        const index = await loadStoredFullTextEvidenceIndex(db);
        expect(mcqMatchesStoredFullText({ sourceRefs: [{ guidelineId: 11 }] }, index)).toBe(true);
        expect(mcqMatchesStoredFullText({ sourceRefs: [{ sourceUrl: 'https://pubmed.ncbi.nlm.nih.gov/39210723/' }] }, index)).toBe(true);
        expect(mcqMatchesStoredFullText({ sourceRefs: [{ doi: 'https://doi.org/10.1000/example' }] }, index)).toBe(true);
        expect(mcqMatchesStoredFullText({ sourceRefs: [{ sourceUrl: 'https://example.org/paper' }] }, index)).toBe(true);
    });

    test('fails closed for citation text without a stored identifier match', async () => {
        const index = await loadStoredFullTextEvidenceIndex({ all: jest.fn().mockResolvedValue([]) });
        expect(mcqMatchesStoredFullText({ referenceSource: 'A guideline', sourceRefs: [{ citation: 'A guideline' }] }, index)).toBe(false);
        expect(mcqMatchesStoredFullText({}, index)).toBe(false);
    });

    test('keeps recovered-question candidates withheld while review is pending', async () => {
        const db = { all: jest.fn().mockResolvedValue([{
            document_id: 7,
            guideline_id: 11,
            pmid: '39210723',
            doi: '10.1000/example',
            source_url: 'https://example.org/paper',
            full_text_source: 'jats',
        }]) };
        const index = await loadStoredFullTextEvidenceIndex(db);
        expect(mcqMatchesStoredFullText({
            sourceRefs: [{ pmid: '39210723' }],
            evidenceRecovery: { status: 'needs_review' },
        }, index)).toBe(false);
    });

    test('keeps recovered full text quarantined until an exact source-text anchor matches', async () => {
        const db = { all: jest.fn().mockResolvedValue([{
            document_id: 9,
            guideline_id: 19,
            pmid: '12345678',
            doi: '10.1000/recovered',
            source_url: 'https://example.org/recovered',
            full_text_source: 'jats_recovered',
            full_text: 'The recommended intervention is administered daily because it reduces mortality in adults.',
        }]) };
        const index = await loadStoredFullTextEvidenceIndex(db);
        const base = { sourceRefs: [{ pmid: '12345678' }] };

        expect(mcqMatchesStoredFullText(base, index)).toBe(false);
        expect(mcqMatchesStoredFullText({
            ...base,
            evidenceAnchors: [{
                pmid: '12345678',
                exactQuote: 'The recommended intervention is administered daily because it reduces mortality in adults.',
            }],
        }, index)).toBe(true);
        expect(mcqMatchesStoredFullText({
            ...base,
            evidenceAnchors: [{
                pmid: '12345678',
                exactQuote: 'This plausible sentence is not present anywhere in the recovered document.',
            }],
        }, index)).toBe(false);
    });
});
