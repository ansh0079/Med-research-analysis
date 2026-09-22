'use strict';

jest.mock('../../server/services/caseEvidenceService', () => ({
    gatherEvidenceArticlesForCase: jest.fn(),
    hasKnownCaseRetraction: jest.fn(async () => false),
}));
jest.mock('../../server/services/search/searchEvidenceSnapshot', () => ({
    persistSearchEvidenceSnapshot: jest.fn(),
}));
jest.mock('../../server/services/search/generationEvidenceManifest', () => ({
    recordGenerationInputs: jest.fn(),
    publicManifest: jest.fn((manifest) => ({ complete: manifest.complete, inputs: manifest.inputs.length, missing: [] })),
}));
jest.mock('../../server/services/aiService', () => ({
    getSharedAiService: jest.fn(() => ({ callText: jest.fn(async () => '{"bestEvidence":"Trial evidence"}') })),
    TEMPERATURE: { synopsis: 0.1 },
}));
jest.mock('../../server/utils/aiProvider', () => ({
    resolveProvider: jest.fn(() => ({ provider: 'gemini', model: 'test-model' })),
}));

const { gatherEvidenceArticlesForCase } = require('../../server/services/caseEvidenceService');
const { persistSearchEvidenceSnapshot } = require('../../server/services/search/searchEvidenceSnapshot');
const { recordGenerationInputs } = require('../../server/services/search/generationEvidenceManifest');
const { buildCaseToEvidenceBrief } = require('../../server/services/caseToEvidenceService');

test('a fresh case brief consumes the retrieval object and persists replayable inputs', async () => {
    gatherEvidenceArticlesForCase.mockResolvedValue({
        articles: [{ uid: 'pubmed-1', title: 'Trial', abstract: 'Evidence', pmid: '1' }],
        retractionScreening: 'complete', vectorUsed: false, sourcesTried: ['pubmed'],
    });
    persistSearchEvidenceSnapshot.mockResolvedValue({ id: 'case-snapshot', status: 'persisted' });
    recordGenerationInputs.mockResolvedValue({ complete: true, inputs: [], missing: [] });
    const database = {
        all: jest.fn(async () => []),
        run: jest.fn(async () => ({})),
        getGuidelinesByTopic: jest.fn(async () => []),
        getTopicKnowledge: jest.fn(async () => null),
        get: jest.fn(async () => ({ lineage_status: 'invalid', evidence_snapshot_id: null })),
        listTeachingObjectClaimsForTopic: jest.fn(async () => [{
            objectKey: 'paper:legacy', claimKey: 'claim-1', claimText: 'Stored claim',
            verificationStatus: 'source_verified',
        }]),
    };
    const result = await buildCaseToEvidenceBrief(database, {
        clinicalQuestion: 'Which trial informs this decision?',
        topic: 'Heart failure', userId: 'u1',
        serverConfig: { keys: {} }, fetchImpl: jest.fn(),
    });
    expect(result.articles).toHaveLength(1);
    expect(result.brief.bestEvidence).toBe('Trial evidence');
    expect(result.evidenceProvenance).toMatchObject({ snapshotId: 'case-snapshot', status: 'unverified' });
    expect(result.relatedClaims[0].verificationStatus).toBe('unverified');
    expect(persistSearchEvidenceSnapshot).toHaveBeenCalledWith(database, expect.objectContaining({
        articles: result.articles, userId: 'u1', origin: 'case_to_evidence',
    }));
    expect(database.run).toHaveBeenCalled();

    database.listTeachingObjectClaimsForTopic.mockResolvedValue([]);
    const fullyRecorded = await buildCaseToEvidenceBrief(database, {
        clinicalQuestion: 'Which trial informs this decision?', topic: 'Heart failure', userId: 'u1',
        serverConfig: { keys: {} }, fetchImpl: jest.fn(),
    });
    expect(fullyRecorded.evidenceProvenance.status).toBe('source_replayable');
});
