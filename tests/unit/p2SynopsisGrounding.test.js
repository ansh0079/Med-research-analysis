'use strict';

const {
    scoreClaimSourceRelevanceSync,
    cosineSimilarity,
    articleEvidenceText,
} = require('../../server/services/citationRelevanceService');
const {
    processPaperSynopsisTrust,
    resolveReviewState,
} = require('../../server/services/paperSynopsisTrust');
const { enqueuePdfIndexForBouquetArticles } = require('../../server/services/enrichmentJobService');
const { validateCitationRelevance } = require('../../server/services/synthesisGenerationCore');

describe('P2 citation relevance', () => {
    test('uses full-text sections in lexical evidence text', () => {
        const text = articleEvidenceText({
            title: 'ARDS ventilation',
            abstract: 'Abstract only.',
            _fullTextSections: { methods: 'tidal volume 6 ml/kg IBW protocol' },
        });
        expect(text).toMatch(/tidal volume/i);
    });

    test('scores claim relevant when full-text supports it', () => {
        const scored = scoreClaimSourceRelevanceSync(
            'Low tidal volume ventilation at 6 ml/kg improves outcomes',
            {
                title: 'Ventilation trial',
                abstract: 'We studied ICU patients.',
                _fullTextSections: { results: 'Low tidal volume 6 ml/kg IBW reduced mortality' },
            }
        );
        expect(scored.valid).toBe(true);
        expect(scored.relevanceScore).toBeGreaterThan(0.25);
    });

    test('validateCitationRelevance delegates to relevance service', () => {
        const out = validateCitationRelevance(
            'Sepsis fluids should be titrated carefully',
            1,
            [{ title: 'Sepsis fluid resuscitation', abstract: 'Titrate fluids carefully in septic shock.' }]
        );
        expect(out.valid).toBe(true);
    });

    test('cosineSimilarity returns 1 for identical vectors', () => {
        expect(cosineSimilarity([1, 0, 0], [1, 0, 0])).toBeCloseTo(1);
        expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
    });
});

describe('P2 priorReviewState wiring', () => {
    test('processPaperSynopsisTrust preserves human_reviewed', () => {
        const { audit } = processPaperSynopsisTrust({
            mainFindings: 'Primary endpoint met (HR 0.82) [1].',
            bottomLine: 'May reduce events in selected patients [1].',
            trustRating: 'MODERATE',
        }, {
            fullTextCoverageRatio: 0,
            priorReviewState: 'human_reviewed',
            article: { title: 'Trial', abstract: 'Primary endpoint met HR 0.82 and may reduce events.' },
        });
        expect(audit.reviewState).toBe('human_reviewed');
        expect(resolveReviewState({
            citationValidation: { ok: false },
            priorReviewState: 'human_reviewed',
        })).toBe('human_reviewed');
    });
});

describe('P2 bouquet PDF enqueue', () => {
    test('prefers bouquet articles and raises priority', async () => {
        const calls = [];
        const db = {
            getAiGenerationJobByKey: jest.fn().mockResolvedValue(null),
            createAiGenerationJob: jest.fn(async ({ inputPayload }) => {
                calls.push(inputPayload.article.uid);
                return { inserted: true };
            }),
            markAiGenerationJobRunning: jest.fn(),
            completeAiGenerationJob: jest.fn(),
            failAiGenerationJob: jest.fn(),
        };
        const results = await enqueuePdfIndexForBouquetArticles({
            db,
            articles: [
                { uid: 'other-1', title: 'Other', abstract: 'x' },
                { uid: 'bouquet-1', title: 'Bouquet', isFree: true },
                { uid: 'bouquet-2', title: 'Bouquet 2' },
            ],
            bouquetRanking: [{ uid: 'bouquet-1' }, { uid: 'bouquet-2' }],
            cache: null,
            logger: { warn() {}, debug() {} },
            limit: 2,
        });
        expect(results).toHaveLength(2);
        expect(calls[0]).toBe('bouquet-1');
        expect(results.every((r) => r.isBouquet)).toBe(true);
        expect(results.every((r) => r.status === 'queued')).toBe(true);
    });
});
