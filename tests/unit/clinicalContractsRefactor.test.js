'use strict';

const {
    validateContract,
    ArticleSynopsisSchema,
    PicoProfileSchema,
    ConflictItemSchema,
    SearchResultRankingSchema,
} = require('../../shared/contracts');
const { validateAiOutput } = require('../../server/services/aiOutputValidation');
const {
    impressionEngagementReward,
    quizAttemptReward,
    combineSearchQuizReward,
    explainInteractionReward,
} = require('../../server/services/rewardAttributionService');
const { buildSearchRankingTrace } = require('../../server/services/searchRankingTrace');

describe('shared clinical contracts', () => {
    test('validates PICO profile', () => {
        const result = validateContract(PicoProfileSchema, {
            population: 'adults with T2DM',
            intervention: 'metformin',
            comparison: 'placebo',
            confidence: 0.8,
        });
        expect(result.ok).toBe(true);
    });

    test('validates conflict item', () => {
        const result = validateContract(ConflictItemSchema, {
            level: 'major',
            trialIndex: 1,
            guidelineIndex: 1,
            trialClaim: 'Drug A reduces mortality',
            guidelineClaim: 'Drug A is not recommended',
        });
        expect(result.ok).toBe(true);
    });
});

describe('aiOutputValidation', () => {
    test('validates paper synopsis with trust default', () => {
        const result = validateAiOutput('paper_synopsis', {
            takeaway: 'Metformin first line',
            trustRating: 'MODERATE',
        });
        expect(result.ok).toBe(true);
        expect(result.data.trustRating).toBe('MODERATE');
    });

    test('degrades invalid conflict extraction when allowed', () => {
        const result = validateAiOutput('conflict_extraction', { conflictMatrix: 'not-an-array' }, { allowDegrade: true });
        expect(result.ok).toBe(false);
        expect(result.degraded.conflictMatrix).toEqual([]);
    });
});

describe('rewardAttributionService', () => {
    test('explains combined search + quiz reward', () => {
        const explained = explainInteractionReward({
            interactionType: 'quiz_after_search',
            impression: { was_clicked: true, dwell_time_ms: 15000 },
            quizAttempt: { isCorrect: true, isFirstAttempt: true },
        });
        expect(explained.components.length).toBeGreaterThan(1);
        expect(explained.totalReward).toBeGreaterThan(0);
    });

    test('quiz first correct beats repeat', () => {
        expect(quizAttemptReward(true, true)).toBeGreaterThan(quizAttemptReward(true, false));
    });

    test('impression save beats click only', () => {
        expect(impressionEngagementReward({ was_saved: true }))
            .toBeGreaterThan(impressionEngagementReward({ was_clicked: true }));
    });
});

describe('searchRankingTrace', () => {
    test('builds auditable trace', () => {
        const trace = buildSearchRankingTrace({
            article: { uid: 'pmid-1' },
            bouquetRow: { compositeScore: 42, archetype: 'landmark_rct' },
            learnerBoost: 1.2,
            banditArm: 'misconception_heavy',
            evidenceRank: 3,
            learningRank: 1,
        });
        const validated = SearchResultRankingSchema.safeParse(trace);
        expect(validated.success).toBe(true);
        expect(trace.finalScore).toBeGreaterThan(trace.baseEvidenceScore);
        expect(trace.banditArm).toBe('misconception_heavy');
    });
});
