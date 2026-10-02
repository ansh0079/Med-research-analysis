'use strict';

const {
    QUIZ_BATCH_REUSE_MAX_AGE_DAYS,
    buildQuizBatchDescriptor,
    findReusableQuizBatch,
    findReusableQuizBatchForSnapshot,
    persistQuizBatch,
} = require('../../server/services/learning/quizBatchReuseService');

const db = {
    normalizeTopic: (topic) => String(topic).toLowerCase(),
};

describe('quizBatchReuseService', () => {
    test('builds stable keys from the exact prompt and isolates user scopes', () => {
        const base = { db, topic: 'Sepsis', flow: 'topic', prompt: 'same prompt', provider: 'gemini', model: 'gemini-2.5-flash' };
        const first = buildQuizBatchDescriptor({ ...base, userId: 'u1' });
        const again = buildQuizBatchDescriptor({ ...base, userId: 'u1' });
        const otherPrompt = buildQuizBatchDescriptor({ ...base, prompt: 'changed prompt', userId: 'u1' });
        const otherUser = buildQuizBatchDescriptor({ ...base, userId: 'u2' });

        expect(first).toEqual(again);
        expect(first.cacheKey).not.toBe(otherPrompt.cacheKey);
        expect(first.objectKey).not.toBe(otherUser.objectKey);
        expect(QUIZ_BATCH_REUSE_MAX_AGE_DAYS).toBe(30);
    });

    test('reuses only recent, matching, replayable batches', async () => {
        const descriptor = buildQuizBatchDescriptor({
            db, topic: 'Sepsis', flow: 'evidence', prompt: 'prompt', provider: 'gemini', model: 'gemini-2.5-flash', userId: 'u1',
        });
        const stored = {
            reviewState: 'machine_checked',
            evidenceSnapshotId: 'snap-1',
            lineageStatus: 'linked',
            provider: 'gemini',
            model: 'gemini-2.5-flash',
            payload: {
                quizCacheKey: descriptor.cacheKey,
                promptVersion: descriptor.promptVersion,
                cacheScopeUserId: 'u1',
                generatedAt: new Date().toISOString(),
                response: { questions: [{ question: 'Q1' }], topic: 'Sepsis', provider: 'gemini' },
            },
        };
        const database = {
            getTeachingObjectByKey: jest.fn().mockResolvedValue(stored),
            get: jest.fn().mockResolvedValue({ contract_version: 2 }),
        };

        await expect(findReusableQuizBatch(database, descriptor)).resolves.toMatchObject({
            questions: [{ question: 'Q1' }],
            provider: 'stored_quiz_cache',
            sourceProvider: 'gemini',
            cached: true,
            reusedFromStore: true,
        });

        stored.payload.quizCacheKey = 'different';
        await expect(findReusableQuizBatch(database, descriptor)).resolves.toBeNull();
    });

    test('does not reuse expired, withdrawn, or unprovable content', async () => {
        const descriptor = buildQuizBatchDescriptor({
            db, topic: 'ARDS', flow: 'topic', prompt: 'prompt', provider: 'gemini', model: 'gemini-2.5-flash',
        });
        const base = {
            reviewState: 'machine_checked', evidenceSnapshotId: 'snap', lineageStatus: 'linked',
            payload: {
                quizCacheKey: descriptor.cacheKey,
                promptVersion: descriptor.promptVersion,
                cacheScopeUserId: null,
                generatedAt: new Date().toISOString(),
                response: { questions: [{ question: 'Q' }] },
            },
        };
        const database = { getTeachingObjectByKey: jest.fn(), get: jest.fn().mockResolvedValue({ contract_version: 2 }) };

        database.getTeachingObjectByKey.mockResolvedValue({ ...base, reviewState: 'withdrawn' });
        await expect(findReusableQuizBatch(database, descriptor)).resolves.toBeNull();

        database.getTeachingObjectByKey.mockResolvedValue({ ...base, lineageStatus: 'legacy_unlinked' });
        await expect(findReusableQuizBatch(database, descriptor)).resolves.toBeNull();

        database.getTeachingObjectByKey.mockResolvedValue({
            ...base,
            payload: { ...base.payload, generatedAt: '2020-01-01T00:00:00.000Z' },
        });
        await expect(findReusableQuizBatch(database, descriptor)).resolves.toBeNull();
    });

    test('replays a same-snapshot batch when only the prompt hash or model changed', async () => {
        const descriptor = buildQuizBatchDescriptor({
            db, topic: 'Sepsis', flow: 'evidence', prompt: 'new personalised prompt', provider: 'gemini', model: 'new-model', userId: 'u1',
        });
        const stored = {
            reviewState: 'machine_checked',
            evidenceSnapshotId: 'snap-1',
            lineageStatus: 'linked',
            provider: 'gemini',
            model: 'old-model',
            payload: {
                quizCacheKey: 'an older prompt hash',
                promptVersion: descriptor.promptVersion,
                cacheScopeUserId: 'u1',
                flow: 'evidence',
                generatedAt: new Date().toISOString(),
                response: { questions: [{ question: 'Q1' }], topic: 'Sepsis' },
            },
        };
        const database = {
            getTeachingObjectByKey: jest.fn().mockResolvedValue(stored),
            get: jest.fn().mockResolvedValue({ contract_version: 2 }),
        };

        await expect(findReusableQuizBatchForSnapshot(database, descriptor, 'snap-1')).resolves.toMatchObject({
            questions: [{ question: 'Q1' }],
            provider: 'stored_quiz_cache',
            reuseReason: 'live_generation_unavailable',
        });
        await expect(findReusableQuizBatchForSnapshot(database, descriptor, 'another-snapshot')).resolves.toBeNull();
    });

    test('persists the complete validated response and its reuse contract', async () => {
        const database = { normalizeTopic: db.normalizeTopic, upsertTeachingObject: jest.fn().mockResolvedValue({}) };
        const descriptor = buildQuizBatchDescriptor({
            db: database, topic: 'Sepsis', flow: 'topic', prompt: 'prompt', provider: 'gemini', model: 'gemini-2.5-flash', userId: 'u1',
        });
        const responseBody = { questions: [{ question: 'Q1' }], topic: 'Sepsis', provider: 'gemini' };

        await expect(persistQuizBatch(database, descriptor, {
            topic: 'Sepsis', responseBody, provider: 'gemini', model: 'gemini-2.5-flash', confidence: 0.8,
            evidenceLineage: { snapshotId: 'snap-1', status: 'linked' }, manifestComplete: true,
        })).resolves.toBe(true);

        expect(database.upsertTeachingObject).toHaveBeenCalledWith(expect.objectContaining({
            objectKey: descriptor.objectKey,
            objectType: 'live_quiz_mcq',
            evidenceSnapshotId: 'snap-1',
            payload: expect.objectContaining({ response: responseBody, quizCacheKey: descriptor.cacheKey, cacheScopeUserId: 'u1' }),
        }));
    });
});
