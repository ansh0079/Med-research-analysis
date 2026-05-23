jest.mock('../../server/services/curriculumSeedService', () => ({
    seedCurriculumTopic: jest.fn(),
}));

const { seedCurriculumTopic } = require('../../server/services/curriculumSeedService');
const {
    runCurriculumSeedBatch,
    updateCurriculumSeedSchedulerSettings,
} = require('../../server/services/curriculumSeedScheduler');

function withGuardrails(db = {}) {
    return {
        getAdminRuntimeSetting: jest.fn().mockResolvedValue(null),
        setAdminRuntimeSetting: jest.fn().mockImplementation(async (_key, value) => value),
        getCurriculumSeedUsageForDate: jest.fn().mockResolvedValue({
            date: '2026-05-19',
            topicsAttempted: 0,
            topicsSeeded: 0,
            topicsFailed: 0,
            synopsesGenerated: 0,
            estimatedCostUsd: 0,
        }),
        incrementCurriculumSeedUsage: jest.fn().mockResolvedValue({}),
        ...db,
    };
}

describe('curriculumSeedScheduler', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('records an empty completed run when no seed candidates are due', async () => {
        const db = withGuardrails({
            createLearningSchedulerRun: jest.fn().mockResolvedValue({ id: 11 }),
            listCurriculumSeedCandidates: jest.fn().mockResolvedValue([]),
            finishLearningSchedulerRun: jest.fn().mockResolvedValue({}),
        });

        const result = await runCurriculumSeedBatch({ db, batchSize: 2, log: { info: jest.fn(), warn: jest.fn() } });

        expect(db.listCurriculumSeedCandidates).toHaveBeenCalledWith({ limit: 2, seedStatuses: [] });
        expect(db.finishLearningSchedulerRun).toHaveBeenCalledWith(11, expect.objectContaining({
            status: 'completed',
            candidatesCount: 0,
            refreshedCount: 0,
        }));
        expect(result.candidatesCount).toBe(0);
    });

    test('seeds due curriculum topics and records scheduler details', async () => {
        const db = withGuardrails({
            createLearningSchedulerRun: jest.fn().mockResolvedValue({ id: 12 }),
            listCurriculumSeedCandidates: jest.fn().mockResolvedValue([
                { id: 1, displayName: 'Hypertension', block: 'Cardiovascular', priority: 'high', volatility: 'moderate', seedStatus: 'not_seeded' },
                { id: 2, displayName: 'COPD', block: 'Respiratory', priority: 'high', volatility: 'high', seedStatus: 'not_seeded' },
            ]),
            finishLearningSchedulerRun: jest.fn().mockResolvedValue({}),
        });
        seedCurriculumTopic
            .mockResolvedValueOnce({ articleCount: 20, selectedArticleCount: 8, synopsisCount: 3, claimCount: 7, synopsisFailures: [] })
            .mockResolvedValueOnce({ articleCount: 18, selectedArticleCount: 8, synopsisCount: 2, claimCount: 5, synopsisFailures: [{ error: 'one failed' }] });

        const result = await runCurriculumSeedBatch({
            db,
            batchSize: 2,
            serverConfig: { keys: { gemini: 'x' } },
            fetchImpl: jest.fn(),
            cache: {},
            limits: { searchLimit: 24, synthesisArticles: 8, synopsisArticles: 3 },
            log: { info: jest.fn(), warn: jest.fn() },
        });

        expect(seedCurriculumTopic).toHaveBeenCalledTimes(2);
        expect(seedCurriculumTopic).toHaveBeenCalledWith(expect.objectContaining({ topicId: 1 }));
        expect(seedCurriculumTopic).toHaveBeenCalledWith(expect.objectContaining({ topicId: 2 }));
        expect(db.finishLearningSchedulerRun).toHaveBeenCalledWith(12, expect.objectContaining({
            status: 'completed',
            candidatesCount: 2,
            refreshedCount: 2,
            errorCount: 0,
            details: expect.objectContaining({
                topics: expect.arrayContaining([
                    expect.objectContaining({ displayName: 'Hypertension', status: 'seeded', claimCount: 7 }),
                    expect.objectContaining({ displayName: 'COPD', status: 'seeded', synopsisFailures: 1 }),
                ]),
            }),
        }));
        expect(result.refreshedCount).toBe(2);
        expect(db.incrementCurriculumSeedUsage).toHaveBeenCalledWith(expect.any(String), { topicsAttempted: 1 });
        expect(db.incrementCurriculumSeedUsage).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
            topicsSeeded: 1,
            synopsesGenerated: 3,
        }));
    });

    test('counts low recall as skipped and topic errors as errors', async () => {
        const db = withGuardrails({
            createLearningSchedulerRun: jest.fn().mockResolvedValue({ id: 13 }),
            listCurriculumSeedCandidates: jest.fn().mockResolvedValue([
                { id: 1, displayName: 'Rare syndrome', block: 'General', priority: 'medium', volatility: 'stable', seedStatus: 'not_seeded' },
                { id: 2, displayName: 'Broken topic', block: 'General', priority: 'medium', volatility: 'stable', seedStatus: 'not_seeded' },
            ]),
            finishLearningSchedulerRun: jest.fn().mockResolvedValue({}),
        });
        seedCurriculumTopic
            .mockResolvedValueOnce({ warning: 'No evidence articles were retrieved', articleCount: 0, selectedArticleCount: 0, synopsisCount: 0 })
            .mockRejectedValueOnce(new Error('LLM failed'));

        const result = await runCurriculumSeedBatch({ db, batchSize: 2, log: { info: jest.fn(), warn: jest.fn() } });

        expect(db.finishLearningSchedulerRun).toHaveBeenCalledWith(13, expect.objectContaining({
            status: 'completed_with_errors',
            candidatesCount: 2,
            refreshedCount: 0,
            skippedCount: 1,
            errorCount: 1,
        }));
        expect(result).toMatchObject({ skippedCount: 1, errorCount: 1 });
    });

    test('does not run when scheduler is paused by persistent settings', async () => {
        const db = withGuardrails({
            getAdminRuntimeSetting: jest.fn().mockResolvedValue({ enabled: false }),
            createLearningSchedulerRun: jest.fn(),
            listCurriculumSeedCandidates: jest.fn(),
            finishLearningSchedulerRun: jest.fn(),
        });

        const result = await runCurriculumSeedBatch({ db, batchSize: 2, log: { info: jest.fn(), warn: jest.fn() } });

        expect(result).toMatchObject({ skipped: true, reason: 'paused' });
        expect(db.createLearningSchedulerRun).not.toHaveBeenCalled();
        expect(db.listCurriculumSeedCandidates).not.toHaveBeenCalled();
    });

    test('blocks when daily topic cap is reached', async () => {
        const db = withGuardrails({
            getAdminRuntimeSetting: jest.fn().mockResolvedValue({ enabled: true, maxTopicsPerDay: 1 }),
            getCurriculumSeedUsageForDate: jest.fn().mockResolvedValue({
                date: '2026-05-19',
                topicsAttempted: 1,
                topicsSeeded: 1,
                topicsFailed: 0,
                synopsesGenerated: 3,
                estimatedCostUsd: 0.01,
            }),
            createLearningSchedulerRun: jest.fn(),
            listCurriculumSeedCandidates: jest.fn(),
            finishLearningSchedulerRun: jest.fn(),
        });

        const result = await runCurriculumSeedBatch({ db, batchSize: 2, log: { info: jest.fn(), warn: jest.fn() } });

        expect(result.reason).toBe('daily_topic_cap_reached');
        expect(db.createLearningSchedulerRun).not.toHaveBeenCalled();
    });

    test('updates persistent scheduler settings', async () => {
        const db = withGuardrails();
        const settings = await updateCurriculumSeedSchedulerSettings(db, { enabled: false, maxTopicsPerDay: 4 });

        expect(settings).toMatchObject({ enabled: false, maxTopicsPerDay: 4 });
        expect(db.setAdminRuntimeSetting).toHaveBeenCalledWith('curriculum_seed_scheduler', expect.objectContaining({
            enabled: false,
            maxTopicsPerDay: 4,
        }));
    });
});
