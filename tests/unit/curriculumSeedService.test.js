jest.mock('../../server/services/unifiedEvidenceSearch', () => ({
    fetchUnifiedEvidence: jest.fn(),
}));

jest.mock('../../server/services/synthesisGenerationCore', () => ({
    runFullSynthesisGeneration: jest.fn(),
}));

jest.mock('../../server/services/paperSynopsisCore', () => ({
    runPaperSynopsisGeneration: jest.fn(),
}));

jest.mock('../../server/services/claimGuidelineEngine', () => ({
    alignTopicClaimsWithGuidelines: jest.fn(),
}));

const { fetchUnifiedEvidence } = require('../../server/services/unifiedEvidenceSearch');
const { runFullSynthesisGeneration } = require('../../server/services/synthesisGenerationCore');
const { runPaperSynopsisGeneration } = require('../../server/services/paperSynopsisCore');
const { alignTopicClaimsWithGuidelines } = require('../../server/services/claimGuidelineEngine');
const { seedCurriculumTopic, reviewDueForVolatility } = require('../../server/services/curriculumSeedService');

describe('curriculumSeedService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('sets review due date from topic volatility', () => {
        const now = new Date('2026-05-19T00:00:00.000Z');
        expect(reviewDueForVolatility('high', now)).toBe('2026-06-18T00:00:00.000Z');
        expect(reviewDueForVolatility('moderate', now)).toBe('2026-08-17T00:00:00.000Z');
        expect(reviewDueForVolatility('stable', now)).toBe('2026-11-15T00:00:00.000Z');
    });

    test('searches, synthesises, creates synopses, aligns guidelines, and marks seeded', async () => {
        const db = {
            getCurriculumSeedTopic: jest.fn().mockResolvedValue({
                id: 7,
                displayName: 'Sepsis and septic shock',
                suggestedQuery: 'sepsis septic shock bundle fluids vasopressors',
                volatility: 'high',
            }),
            updateCurriculumSeedStatus: jest.fn().mockImplementation(async (_id, patch) => ({
                id: 7,
                displayName: 'Sepsis and septic shock',
                ...patch,
            })),
            listTeachingObjectClaimsForTopic: jest.fn().mockResolvedValue([{ claimKey: 'c1' }, { claimKey: 'c2' }]),
        };
        const articles = [
            { uid: 'a1', title: 'RCT one', abstract: 'A', _impact: { score: 10 } },
            { uid: 'a2', title: 'Review two', abstract: 'B', _impact: { score: 8 } },
            { uid: 'a3', title: 'Trial three', abstract: 'C', _impact: { score: 6 } },
        ];
        fetchUnifiedEvidence.mockResolvedValueOnce(articles);
        runFullSynthesisGeneration.mockResolvedValueOnce({ timestamp: '2026-05-19T12:00:00.000Z', jobKey: 'syn:abc' });
        runPaperSynopsisGeneration.mockResolvedValue({});
        alignTopicClaimsWithGuidelines.mockResolvedValueOnce({ processed: 2, results: [] });

        const result = await seedCurriculumTopic({
            db,
            topicId: 7,
            serverConfig: { keys: { gemini: 'x' } },
            fetchImpl: jest.fn(),
            cache: {},
            limits: { searchLimit: 10, synthesisArticles: 3, synopsisArticles: 2 },
        });

        expect(fetchUnifiedEvidence).toHaveBeenCalledWith(expect.objectContaining({
            query: 'sepsis septic shock bundle fluids vasopressors',
            safeLimit: 10,
            sourceList: ['pubmed', 'openalex', 'semantic'],
        }));
        expect(runFullSynthesisGeneration).toHaveBeenCalledWith(expect.objectContaining({
            topic: 'Sepsis and septic shock',
            articles: expect.arrayContaining([expect.objectContaining({ uid: 'a1' })]),
        }));
        expect(runPaperSynopsisGeneration).toHaveBeenCalledTimes(2);
        expect(alignTopicClaimsWithGuidelines).toHaveBeenCalledWith(db, 'Sepsis and septic shock', { limit: 40, apply: true });
        expect(db.updateCurriculumSeedStatus).toHaveBeenLastCalledWith(7, expect.objectContaining({
            seedStatus: 'seeded',
            lastSynthesisAt: '2026-05-19T12:00:00.000Z',
            claimCount: 2,
        }));
        expect(result).toMatchObject({
            selectedArticleCount: 3,
            synthesisJobKey: 'syn:abc',
            synopsisCount: 2,
            claimCount: 2,
        });
    });

    test('marks low-recall seed as failed_low_recall without calling AI', async () => {
        const db = {
            getCurriculumSeedTopic: jest.fn().mockResolvedValue({
                id: 8,
                displayName: 'Niche topic',
                suggestedQuery: 'rare query',
                volatility: 'moderate',
            }),
            updateCurriculumSeedStatus: jest.fn().mockImplementation(async (_id, patch) => ({ id: 8, ...patch })),
        };
        fetchUnifiedEvidence.mockResolvedValueOnce([]);

        const result = await seedCurriculumTopic({ db, topicId: 8, fetchImpl: jest.fn(), cache: {} });

        expect(runFullSynthesisGeneration).not.toHaveBeenCalled();
        expect(db.updateCurriculumSeedStatus).toHaveBeenLastCalledWith(8, expect.objectContaining({
            seedStatus: 'failed_low_recall',
            claimCount: 0,
        }));
        expect(result.warning).toMatch(/No evidence articles/);
    });
});
