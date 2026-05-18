const {
    consensusJobKey,
    getOrEnqueueConsensusSynopsis,
    getOrEnqueueLiveClinicalAnswer,
    liveClinicalAnswerJobKey,
} = require('../../server/services/aiGenerationJobService');

describe('aiGenerationJobService', () => {
    const articles = [
        { uid: 'a-1', title: 'Open paper 1', isFree: true, abstract: 'A', pubdate: '2024' },
        { uid: 'a-2', title: 'Open paper 2', isFree: true, abstract: 'B', pubdate: '2025' },
    ];

    test('uses stable consensus job keys for the same topic and source set', () => {
        expect(consensusJobKey('sepsis', articles)).toBe(consensusJobKey('sepsis', [...articles]));
        expect(consensusJobKey('ards', articles)).not.toBe(consensusJobKey('sepsis', articles));
    });

    test('returns completed durable job payload immediately', async () => {
        const jobKey = consensusJobKey('sepsis', articles);
        const db = {
            getAiGenerationJobByKey: jest.fn(async () => ({
                status: 'completed',
                resultPayload: { status: 'generated', statement: 'Ready [1].' },
            })),
            createAiGenerationJob: jest.fn(),
            markAiGenerationJobRunning: jest.fn(),
            completeAiGenerationJob: jest.fn(),
            failAiGenerationJob: jest.fn(),
        };

        const result = await getOrEnqueueConsensusSynopsis({
            db,
            topic: 'sepsis',
            articles,
            serverConfig: { keys: {} },
            fetchImpl: jest.fn(),
            cache: { getAsync: jest.fn() },
        });

        expect(result).toMatchObject({ status: 'generated', cached: true, jobKey });
    });

    test('creates a queued durable job and returns a pending placeholder', async () => {
        const jobs = new Map();
        const db = {
            getAiGenerationJobByKey: jest.fn(async (key) => jobs.get(key) || null),
            createAiGenerationJob: jest.fn(async (job) => {
                jobs.set(job.jobKey, { status: 'queued', ...job });
                return jobs.get(job.jobKey);
            }),
            markAiGenerationJobRunning: jest.fn(async (key) => {
                jobs.set(key, { ...jobs.get(key), status: 'running' });
            }),
            completeAiGenerationJob: jest.fn(async (key, patch) => {
                jobs.set(key, { ...jobs.get(key), status: 'completed', resultPayload: patch.resultPayload });
            }),
            failAiGenerationJob: jest.fn(async (key, errorMessage) => {
                jobs.set(key, { ...jobs.get(key), status: 'failed', errorMessage });
            }),
        };

        const result = await getOrEnqueueConsensusSynopsis({
            db,
            topic: 'sepsis',
            articles,
            serverConfig: { keys: {} },
            fetchImpl: jest.fn(),
            cache: { getAsync: jest.fn(), setAsync: jest.fn() },
        });

        expect(result.status).toBe('queued');
        expect(result.jobKey).toMatch(/^consensus:/);
        expect(db.createAiGenerationJob).toHaveBeenCalledTimes(1);
        expect(result.statement).toContain('background');
    });

    test('queues live clinical answer jobs in the durable store', async () => {
        const jobs = new Map();
        const db = {
            getAiGenerationJobByKey: jest.fn(async (key) => jobs.get(key) || null),
            createAiGenerationJob: jest.fn(async (job) => {
                jobs.set(job.jobKey, { status: 'queued', ...job });
                return jobs.get(job.jobKey);
            }),
            markAiGenerationJobRunning: jest.fn(async (key) => {
                jobs.set(key, { ...jobs.get(key), status: 'running' });
            }),
            completeAiGenerationJob: jest.fn(async (key, patch) => {
                jobs.set(key, { ...jobs.get(key), status: 'completed', resultPayload: patch.resultPayload });
            }),
            failAiGenerationJob: jest.fn(async (key, errorMessage) => {
                jobs.set(key, { ...jobs.get(key), status: 'failed', errorMessage });
            }),
        };

        const result = await getOrEnqueueLiveClinicalAnswer({
            db,
            topic: 'sepsis',
            articles,
            guidelines: [],
            previousQueries: ['shock'],
            trainingStage: 'resident',
            serverConfig: { keys: {} },
            fetchImpl: jest.fn(),
        });

        expect(result.status).toBe('queued');
        expect(result.jobKey).toBe(liveClinicalAnswerJobKey('sepsis', articles, { previousQueries: ['shock'], trainingStage: 'resident' }));
        expect(db.createAiGenerationJob).toHaveBeenCalledWith(expect.objectContaining({
            jobType: 'live_clinical_answer',
            topic: 'sepsis',
        }));
    });
});
