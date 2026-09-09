'use strict';

/**
 * Paper synopses age out after SYNOPSIS_REUSE_MAX_AGE_DAYS (90), enforced
 * lazily: findReusableStoredSynopsis refuses to serve a stale one, so the next
 * reader triggers a full regeneration and waits for it. This scheduler run does
 * that regeneration in the background instead.
 *
 * The point is entirely about *who waits*, not about correctness -- nobody was
 * ever served a stale synopsis. So the things worth guarding are the ones that
 * would quietly make the run useless or expensive: skipping the generator's own
 * reuse check, and not regenerating far more than intended.
 */

const mockRunPaperSynopsisGeneration = jest.fn().mockResolvedValue({ synopsis: { bottomLine: 'fresh' } });

jest.mock('../../server/services/ai/paperSynopsisCore', () => ({
    runPaperSynopsisGeneration: (...args) => mockRunPaperSynopsisGeneration(...args),
}));

jest.mock('../../server/services/topicKnowledgeExtraction', () => ({
    extractAndUpsertTopicKnowledge: jest.fn().mockResolvedValue(null),
}));
jest.mock('../../server/services/communitySeminalRefinementService', () => ({
    refineSeminalKnowledgeFromCommunity: jest.fn().mockResolvedValue(null),
}));

const { runStaleSynopsisRefresh } = require('../../server/services/topic/topicRefreshScheduler');

const SILENT = { info() {}, warn() {}, error() {}, debug() {} };

function makeDb(stale) {
    return {
        getStaleSynopsesForRefresh: jest.fn().mockResolvedValue(stale),
        createLearningSchedulerRun: jest.fn().mockResolvedValue({ id: 1 }),
        finishLearningSchedulerRun: jest.fn().mockResolvedValue(null),
    };
}

const CANDIDATES = [
    { articleUid: 'pmid:1', topic: 'hepatorenal syndrome', totalSignals: 9, generatedAt: '2026-01-01T00:00:00Z' },
    { articleUid: 'pmid:2', topic: 'septic shock', totalSignals: 4, generatedAt: '2026-01-02T00:00:00Z' },
];

beforeEach(() => { mockRunPaperSynopsisGeneration.mockClear(); });

describe('runStaleSynopsisRefresh', () => {
    test('regenerates each stale synopsis it is handed', async () => {
        const db = makeDb(CANDIDATES);
        await runStaleSynopsisRefresh({ db, serverConfig: { keys: {} }, fetchImpl: jest.fn(), cache: null, logger: SILENT });

        expect(mockRunPaperSynopsisGeneration).toHaveBeenCalledTimes(2);
        expect(mockRunPaperSynopsisGeneration.mock.calls.map((c) => c[0].article.uid)).toEqual(['pmid:1', 'pmid:2']);
    });

    test('passes refresh: true, or the generator would hand back the stale row it just found', async () => {
        // Without this the run would "succeed" every hour while changing
        // nothing -- findReusableStoredSynopsis would return the same aged
        // synopsis and the scheduler would record a refresh that never happened.
        const db = makeDb([CANDIDATES[0]]);
        await runStaleSynopsisRefresh({ db, serverConfig: { keys: {} }, fetchImpl: jest.fn(), cache: null, logger: SILENT });

        expect(mockRunPaperSynopsisGeneration).toHaveBeenCalledWith(
            expect.objectContaining({ refresh: true, topic: 'hepatorenal syndrome' }),
        );
    });

    test('asks for a bounded batch, since each item is a paid generation', async () => {
        const db = makeDb([]);
        await runStaleSynopsisRefresh({ db, serverConfig: { keys: {} }, fetchImpl: jest.fn(), cache: null, logger: SILENT });

        const [[opts]] = db.getStaleSynopsesForRefresh.mock.calls;
        expect(opts.limit).toBeGreaterThan(0);
        expect(opts.limit).toBeLessThanOrEqual(5);
    });

    test('one failing article does not abandon the rest of the batch', async () => {
        mockRunPaperSynopsisGeneration.mockRejectedValueOnce(new Error('provider down'));
        const db = makeDb(CANDIDATES);

        await runStaleSynopsisRefresh({ db, serverConfig: { keys: {} }, fetchImpl: jest.fn(), cache: null, logger: SILENT });

        expect(mockRunPaperSynopsisGeneration).toHaveBeenCalledTimes(2);
        expect(db.finishLearningSchedulerRun).toHaveBeenCalledWith(1, expect.objectContaining({
            status: 'completed_with_errors', refreshedCount: 1, errorCount: 1,
        }));
    });

    test('does nothing when there is nothing stale', async () => {
        const db = makeDb([]);
        await runStaleSynopsisRefresh({ db, serverConfig: { keys: {} }, fetchImpl: jest.fn(), cache: null, logger: SILENT });

        expect(mockRunPaperSynopsisGeneration).not.toHaveBeenCalled();
        expect(db.finishLearningSchedulerRun).toHaveBeenCalledWith(1, expect.objectContaining({ status: 'completed', candidatesCount: 0 }));
    });

    test('is skipped entirely on a database without the query', async () => {
        // Older deployments and the test harnesses that stub db surface-by-surface.
        await expect(runStaleSynopsisRefresh({ db: {}, serverConfig: {}, fetchImpl: jest.fn(), cache: null, logger: SILENT }))
            .resolves.toBeUndefined();
        expect(mockRunPaperSynopsisGeneration).not.toHaveBeenCalled();
    });
});
