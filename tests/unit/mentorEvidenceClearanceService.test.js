'use strict';

const { evaluateMentorEvidenceClearance } = require('../../server/services/mentorEvidenceClearanceService');

const fullText = 'The intervention reduced hospital admission without increasing serious adverse events in the prespecified population.';
const source = { pmid: '12345', title: 'A reliable trial', design: 'randomized controlled trial' };
const db = {
    get: jest.fn(async () => ({
        id: 1, pmid: '12345', title: source.title, evidence_tier: 'trial',
        document_label: 'randomized_controlled_trial', full_text: fullText,
        full_text_source: 'pmc', word_count: 1200,
    })),
};

describe('mentorEvidenceClearanceService', () => {
    beforeEach(() => db.get.mockClear());

    test('clears a claim only when its accepted source and exact text anchor are stored', async () => {
        const result = await evaluateMentorEvidenceClearance(db, {
            sources: [source],
            teaching_points: [{
                claim: 'The intervention reduced admissions.',
                cites: ['12345'],
                evidenceAnchors: [{ pmid: '12345', quote: fullText }],
            }],
        });
        expect(result.cleared).toBe(true);
        expect(result.verifiedAnchors).toBe(1);
    });

    test('does not clear a citation that has no source-text anchor', async () => {
        const result = await evaluateMentorEvidenceClearance(db, {
            sources: [source],
            teaching_points: [{ claim: 'The intervention reduced admissions.', cites: ['12345'] }],
        });
        expect(result.cleared).toBe(false);
        expect(result.failures).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'missing_evidence_anchor' })]));
        expect(db.get).not.toHaveBeenCalled();
    });

    test('does not clear a quote absent from the stored source', async () => {
        const result = await evaluateMentorEvidenceClearance(db, {
            sources: [source],
            teaching_points: [{
                claim: 'The intervention eliminated mortality.',
                evidenceAnchors: [{ pmid: '12345', quote: 'This unsupported sentence is deliberately long enough to pass the minimum length check.' }],
            }],
        });
        expect(result.cleared).toBe(false);
        expect(result.failures).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'supporting_quote_not_found' })]));
    });

    test('resolves the cited PMID row, not another row that only shares its title', async () => {
        const Sqlite = require('better-sqlite3');
        const sqlite = new Sqlite(':memory:');
        try {
            sqlite.exec(`CREATE TABLE guideline_documents (id INTEGER PRIMARY KEY, pmid TEXT, pmcid TEXT, doi TEXT, title TEXT,
                document_label TEXT, evidence_tier TEXT, full_text TEXT, full_text_source TEXT, word_count INTEGER,
                source_year INTEGER, source_url TEXT)`);
            const insert = sqlite.prepare(`INSERT INTO guideline_documents (id, pmid, title, document_label, full_text, full_text_source)
                VALUES (?, ?, ?, 'guideline', ?, 'pdf')`);
            // Lower id, same title, no PMID, differently extracted text: must not be chosen for pmid 999.
            insert.run(1, null, 'Shared Guideline Title', 'Unrelated extraction of the same document with broken hyphen- ation.');
            insert.run(2, '999', 'Shared Guideline Title', `Preamble. ${fullText}`);
            const realDb = { get: async (sql, params) => sqlite.prepare(sql).get(...params) };
            const result = await evaluateMentorEvidenceClearance(realDb, {
                sources: [{ pmid: '999', title: 'Shared Guideline Title', design: 'guideline' }],
                teaching_points: [{ claim: 'Admissions fell.', evidenceAnchors: [{ pmid: '999', quote: fullText }] }],
            });
            expect(result.cleared).toBe(true);
        } finally { sqlite.close(); }
    });
});
