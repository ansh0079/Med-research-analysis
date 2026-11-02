'use strict';

const { evidenceEntries, registerTeachingObjectEvidence } = require('../../server/services/generationEvidenceRegistryService');

describe('generationEvidenceRegistryService', () => {
    test('extracts per-question source and exact anchor lineage', () => {
        const entries = evidenceEntries({ payload: { mcqs: [{ id: 'q1', claimKey: 'claim-1',
            sourceRefs: [{ documentId: 7 }], evidenceAnchors: [{ documentId: 7, exactQuote: 'Exact source text.' }] }] } });
        expect(entries).toEqual(expect.arrayContaining([
            expect.objectContaining({ role: 'mcq_source', questionId: 'q1' }),
            expect.objectContaining({ role: 'mcq_anchor', questionId: 'q1', exactQuote: 'Exact source text.' }),
        ]));
    });

    test('writes topic, generated object, question and resolved document into registry', async () => {
        const writes = [];
        const db = {
            normalizeTopic: (value) => String(value).toLowerCase(),
            get: jest.fn(async () => ({ id: 7, title: 'Guideline', pmid: '12345678', pmcid: null,
                doi: null, source_url: 'https://example.test/guideline' })),
            run: jest.fn(async (sql, params) => { writes.push({ sql, params }); }),
        };
        const result = await registerTeachingObjectEvidence(db, {
            objectKey: 'mcq:test', objectType: 'guideline_mcq', topic: 'Test Topic',
            generatedAt: '2026-11-02T00:00:00.000Z', reviewState: 'unreviewed',
            payload: { mcqs: [{ id: 'q1', sourceRefs: [{ documentId: 7 }] }] },
        });
        expect(result.registered).toBe(1);
        expect(writes).toHaveLength(1);
        expect(writes[0].params).toEqual(expect.arrayContaining(['Test Topic', 'mcq', 'mcq:test', 'q1', 7, 'Guideline']));
    });
});
