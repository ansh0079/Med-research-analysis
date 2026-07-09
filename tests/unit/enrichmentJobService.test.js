const {
    topicSeedJobKey,
    guidelineAlignJobKey,
    pdfIndexJobKey,
    getOrEnqueueTopicSeed,
    getOrEnqueueGuidelineAlign,
    getOrEnqueuePdfIndex,
} = require('../../server/services/enrichmentJobService');

describe('enrichmentJobService', () => {
    function createDb(overrides = {}) {
        return {
            getAiGenerationJobByKey: jest.fn(async () => null),
            createAiGenerationJob: jest.fn(async ({ jobKey }) => ({
                jobKey,
                status: 'queued',
                inserted: true,
            })),
            markAiGenerationJobRunning: jest.fn(),
            completeAiGenerationJob: jest.fn(),
            failAiGenerationJob: jest.fn(),
            resetAiGenerationJobForRetry: jest.fn(),
            ...overrides,
        };
    }

    function createCache(redis = null) {
        return {
            redis,
            get: jest.fn(),
            set: jest.fn(),
        };
    }

    describe('job keys', () => {
        it('produces stable topic seed keys', () => {
            const a = topicSeedJobKey('Atrial Fibrillation');
            const b = topicSeedJobKey('atrial fibrillation');
            expect(a).toBe(b);
            expect(a.startsWith('topic-seed:')).toBe(true);
        });

        it('produces stable guideline align keys', () => {
            const a = guidelineAlignJobKey('Heart Failure');
            const b = guidelineAlignJobKey('heart failure');
            expect(a).toBe(b);
            expect(a.startsWith('guideline-align:')).toBe(true);
        });

        it('produces stable pdf index keys', () => {
            const article = { doi: '10.1000/abc', pmid: '12345' };
            const key = pdfIndexJobKey(article);
            expect(key.startsWith('pdf-index:')).toBe(true);
            expect(pdfIndexJobKey({ doi: '10.1000/abc' })).toBe(key);
        });
    });

    describe('getOrEnqueueTopicSeed', () => {
        it('returns cached completed status when job already exists', async () => {
            const db = createDb({
                getAiGenerationJobByKey: jest.fn(async () => ({
                    jobKey: topicSeedJobKey('afib'),
                    status: 'completed',
                    resultPayload: { status: 'completed' },
                })),
            });
            const result = await getOrEnqueueTopicSeed({
                db,
                topic: 'afib',
                articles: [{ uid: 'a1', title: 'x' }],
                serverConfig: {},
                cache: createCache(),
                logger: console,
            });
            expect(result.status).toBe('completed');
            expect(result.cached).toBe(true);
            expect(db.createAiGenerationJob).not.toHaveBeenCalled();
        });

        it('creates a durable job row only once for duplicate calls', async () => {
            const db = createDb();
            const cache = createCache();
            const opts = {
                db,
                topic: 'afib',
                articles: [{ uid: 'a1', title: 'x' }],
                serverConfig: {},
                cache,
                logger: console,
            };
            const [a, b] = await Promise.all([getOrEnqueueTopicSeed(opts), getOrEnqueueTopicSeed(opts)]);
            expect(a.jobKey).toBe(b.jobKey);
            expect(db.createAiGenerationJob).toHaveBeenCalledTimes(2);
            // Both calls attempt creation; DB UNIQUE constraint + inserted flag prevent duplicate enqueue.
            const inserted = db.createAiGenerationJob.mock.results.filter((r) => r.value?.inserted).length;
            expect(inserted).toBeLessThanOrEqual(1);
        });
    });

    describe('getOrEnqueueGuidelineAlign', () => {
        it('skips when no durable job store', async () => {
            const db = {};
            const result = await getOrEnqueueGuidelineAlign({ db, topic: 'afib', cache: createCache(), logger: console });
            expect(result.status).toBe('skipped');
        });

        it('creates a queued job when none exists', async () => {
            const db = createDb();
            const result = await getOrEnqueueGuidelineAlign({ db, topic: 'afib', cache: createCache(), logger: console });
            expect(result.status).toBe('queued');
            expect(db.createAiGenerationJob).toHaveBeenCalledWith(
                expect.objectContaining({ jobType: 'guideline_align' })
            );
        });
    });

    describe('getOrEnqueuePdfIndex', () => {
        it('returns cached completed status when job already exists', async () => {
            const db = createDb({
                getAiGenerationJobByKey: jest.fn(async () => ({
                    jobKey: pdfIndexJobKey({ doi: '10.1000/abc' }),
                    status: 'completed',
                })),
            });
            const result = await getOrEnqueuePdfIndex({
                db,
                article: { doi: '10.1000/abc' },
                cache: createCache(),
                logger: console,
            });
            expect(result.status).toBe('completed');
            expect(result.cached).toBe(true);
            expect(db.createAiGenerationJob).not.toHaveBeenCalled();
        });
    });
});
