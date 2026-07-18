'use strict';

const { validateContract, ArticleSynopsisSchema, ConsensusSynopsisSchema } = require('../../shared/contracts');
const { validateAiOutput } = require('../../server/services/aiOutputValidation');
const { fetchUnifiedEvidence } = require('../../server/services/unifiedEvidenceSearch');
const { runSynthesisConflictExtraction } = require('../../server/services/synthesisGenerationCore');

describe('P0 schema contracts', () => {
    test('ArticleSynopsisSchema accepts whatNotToOverclaim as string[]', () => {
        const result = validateContract(ArticleSynopsisSchema, {
            takeaway: 'Metformin first line',
            trustRating: 'MODERATE',
            whatNotToOverclaim: ['Do not claim mortality benefit.', 'Avoid overgeneralizing.'],
        });
        expect(result.ok).toBe(true);
        expect(result.data.whatNotToOverclaim).toEqual([
            'Do not claim mortality benefit.',
            'Avoid overgeneralizing.',
        ]);
    });

    test('ArticleSynopsisSchema coerces scalar whatNotToOverclaim to array', () => {
        const result = validateContract(ArticleSynopsisSchema, {
            takeaway: 'Ok',
            whatNotToOverclaim: 'Do not overclaim.',
        });
        expect(result.ok).toBe(true);
        expect(result.data.whatNotToOverclaim).toEqual(['Do not overclaim.']);
    });

    test('paper_synopsis validation keeps whatNotToOverclaim as array', () => {
        const result = validateAiOutput('paper_synopsis', {
            takeaway: 'Ok',
            trustRating: 'HIGH',
            whatNotToOverclaim: ['Trap one', 'Trap two'],
        });
        expect(result.ok).toBe(true);
        expect(result.data.whatNotToOverclaim).toEqual(['Trap one', 'Trap two']);
    });

    test('ConsensusSynopsisSchema accepts evidenceStrength HIGH|MODERATE|LOW|VERY_LOW', () => {
        const result = validateContract(ConsensusSynopsisSchema, {
            clinicalBottomLine: 'Use cautiously.',
            evidenceStrength: 'MODERATE',
            whatNotToOverclaim: ['Do not treat as a guideline.'],
        });
        expect(result.ok).toBe(true);
        expect(result.data.evidenceStrength).toBe('MODERATE');
        expect(result.data.whatNotToOverclaim).toEqual(['Do not treat as a guideline.']);
    });
});

describe('P0 source failure telemetry', () => {
    test('records pubmed failure on telemetry when PubMed throws', async () => {
        const telemetry = {};
        const articles = await fetchUnifiedEvidence({
            query: 'diabetes metformin',
            safeLimit: 5,
            sourceList: ['pubmed'],
            serverConfig: { keys: {} },
            fetch: jest.fn().mockRejectedValue(new Error('PubMed down')),
            telemetry,
        });
        expect(articles).toEqual([]);
        expect(telemetry.sourceFailures.pubmed.failed).toBe(true);
        expect(telemetry.sourceFailures.pubmed.error).toMatch(/PubMed down/);
        expect(telemetry.sourceFetches.pubmed.failed).toBe(true);
    });
});

describe('P0 synthesis conflict helper', () => {
    test('returns empty matrix when no guidelines are available', async () => {
        const out = await runSynthesisConflictExtraction({
            topArticles: [{ uid: '1', title: 'Trial', abstract: 'A' }],
            guidelines: [],
            topic: 'ARDS',
        });
        expect(out.conflictMatrix).toEqual([]);
        expect(out.guidelineAlignment).toBeTruthy();
    });
});
