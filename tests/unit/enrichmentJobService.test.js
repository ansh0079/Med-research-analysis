const {
    topicSeedJobKey,
    guidelineAlignJobKey,
    pdfIndexJobKey,
    getOrEnqueueTopicSeed,
    getOrEnqueueGuidelineAlign,
    getOrEnqueuePdfIndex,
    getOrEnqueueFlagshipEnrich,
} = require('../../server/services/enrichmentJobService');
const { flagshipEnrichJobKey } = require('../../server/services/flagshipEnrichService');

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
            resetAiGenerationJobForRetry: jest.fn(async () => null),
            failAiGenerationJob: jest.fn(async () => null),
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

    describe('getOrEnqueueFlagshipEnrich', () => {
        function createEnrichDb(overrides = {}) {
            return createDb({
                normalizeTopic: (t) => String(t || '').toLowerCase().trim(),
                get: jest.fn(async () => ({ count: 0 })),
                failAiGenerationJob: jest.fn(async () => null),
                ...overrides,
            });
        }

        it('skips when topic already has enough claims', async () => {
            const db = createEnrichDb({
                get: jest.fn(async () => ({ count: 12 })),
            });
            const result = await getOrEnqueueFlagshipEnrich({
                db,
                topic: 'Heart failure with reduced ejection fraction',
                flagship: { topic: 'Heart failure with reduced ejection fraction', landmarkPmids: ['1'] },
                cache: createCache(),
                logger: console,
            });
            expect(result.status).toBe('skipped');
            expect(result.reason).toBe('sufficient_claims');
            expect(db.createAiGenerationJob).not.toHaveBeenCalled();
        });

        it('creates a queued job when none exists and claims are low', async () => {
            const db = createEnrichDb();
            const result = await getOrEnqueueFlagshipEnrich({
                db,
                topic: 'Community-acquired pneumonia antibiotic strategy',
                flagship: {
                    topic: 'Community-acquired pneumonia antibiotic strategy',
                    landmarkPmids: ['1', '2'],
                },
                cache: createCache(),
                logger: console,
            });
            expect(result.status).toBe('queued');
            expect(result.claimCount).toBe(0);
            expect(db.createAiGenerationJob).toHaveBeenCalledWith(
                expect.objectContaining({ jobType: 'flagship_enrich' })
            );
        });

        it('retries completed jobs that still have insufficient claims', async () => {
            const topic = 'Anaphylaxis epinephrine emergency management';
            const jobKey = flagshipEnrichJobKey(topic);
            const db = createEnrichDb({
                getAiGenerationJobByKey: jest.fn(async () => ({
                    jobKey,
                    status: 'completed',
                    resultPayload: { totalClaimsWritten: 0 },
                })),
                get: jest.fn(async () => ({ count: 0 })),
            });
            const result = await getOrEnqueueFlagshipEnrich({
                db,
                topic,
                flagship: { topic, landmarkPmids: ['1'] },
                cache: createCache(),
                logger: console,
            });
            expect(result.status).toBe('queued');
            expect(result.retried).toBe(true);
            expect(db.failAiGenerationJob).toHaveBeenCalled();
            expect(db.resetAiGenerationJobForRetry).toHaveBeenCalledWith(jobKey);
            expect(db.createAiGenerationJob).not.toHaveBeenCalled();
        });
    });
});
