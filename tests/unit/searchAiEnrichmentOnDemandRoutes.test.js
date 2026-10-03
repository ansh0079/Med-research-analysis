'use strict';

/**
 * The clinical answer box is made when the reader presses "Generate clinical answer": the search route
 * stores what it needs, POST /api/search/ai-enrichment/:key/generate starts it, and the poll reports
 * 'not_requested' until then instead of spinning forever.
 */

jest.mock('../../server/services/aiGenerationJobService', () => ({
    getOrEnqueueConsensusSynopsis: jest.fn(async () => ({ queued: true })),
    getOrEnqueueLiveClinicalAnswer: jest.fn(async () => ({ queued: true })),
}));

const express = require('express');
const request = require('supertest');
const ai = require('../../server/services/aiGenerationJobService');
const { registerUnifiedSearchRoutes } = require('../../server/routes/search/unifiedSearch');
const { registerSearchFeedbackRoutes } = require('../../server/routes/search/feedback');

const KEY = 'b'.repeat(32);

function makeApp({ stored = null, jobs = {} } = {}) {
    const data = new Map(stored ? [[`enrichment-request:${KEY}`, stored]] : []);
    const cache = { get: async (k) => data.get(k) ?? null, set: async (k, v) => { data.set(k, v); return true; } };
    const db = { getAiGenerationJobByKey: async (k) => jobs[k] || null };
    const app = express();
    app.use(express.json());
    const passthrough = () => (_req, _res, next) => next();
    registerUnifiedSearchRoutes(app, {
        db, cache, serverConfig: {}, rateLimit: passthrough, fetchImpl: jest.fn(),
        topicHelpers: { buildAgentGuidance: jest.fn(), buildTopicIntelligence: jest.fn() },
    });
    registerSearchFeedbackRoutes(app, { db, cache, rateLimit: passthrough, requireJson: (_q, _s, n) => n() });
    return app;
}

describe('on-demand clinical answer', () => {
    const saved = process.env.SEARCH_PRECOMPUTE_AI_EXTRAS;
    beforeEach(() => { jest.clearAllMocks(); delete process.env.SEARCH_PRECOMPUTE_AI_EXTRAS; });
    afterAll(() => { if (saved === undefined) delete process.env.SEARCH_PRECOMPUTE_AI_EXTRAS; else process.env.SEARCH_PRECOMPUTE_AI_EXTRAS = saved; });

    test('the poll says not_requested before anyone asks, instead of pending forever', async () => {
        const res = await request(makeApp()).get(`/api/search/ai-enrichment/${KEY}`);
        expect(res.body).toEqual({ status: 'not_requested' });
    });

    test('generate starts both jobs from the stored search under the search\'s enrichment key', async () => {
        const stored = { query: 'sepsis fluids', articles: [{ uid: 'a1' }, { uid: 'a2' }], previousQueries: ['x'], trainingStage: 'finals', sessionDepth: 2 };
        const res = await request(makeApp({ stored })).post(`/api/search/ai-enrichment/${KEY}/generate`).send({});
        expect(res.status).toBe(202);
        expect(ai.getOrEnqueueConsensusSynopsis).toHaveBeenCalledWith(expect.objectContaining({ topic: 'sepsis fluids', articles: stored.articles }));
        expect(ai.getOrEnqueueLiveClinicalAnswer).toHaveBeenCalledWith(expect.objectContaining({ topic: 'sepsis fluids', trainingStage: 'finals', sessionDepth: 2 }));
        expect(ai.getOrEnqueueLiveClinicalAnswer.mock.calls[0][0].jobKey).toContain(KEY);
    });

    test('an expired search asks the reader to search again rather than guessing', async () => {
        const res = await request(makeApp()).post(`/api/search/ai-enrichment/${KEY}/generate`).send({});
        expect(res.status).toBe(410);
        expect(res.body.code).toBe('ENRICHMENT_REQUEST_EXPIRED');
        expect(ai.getOrEnqueueConsensusSynopsis).not.toHaveBeenCalled();
    });

    test('a malformed key is rejected', async () => {
        const res = await request(makeApp()).post('/api/search/ai-enrichment/not-a-key/generate').send({});
        expect(res.status).toBe(400);
    });

    test('reporting a topic outdated ends its stored review, drops the hot copy and logs it for curators', async () => {
        const fs = require('fs');
        const path = require('path');
        const Sqlite = require('better-sqlite3');
        const store = require('../../server/services/search/topicReviewStore');
        const sqlite = new Sqlite(':memory:');
        sqlite.exec(fs.readFileSync(path.join(__dirname, '../../database/migrations/108_topic_search_reviews.sql'), 'utf8'));
        const events = [];
        const deleted = [];
        const db = {
            normalizeTopic: (t) => String(t).toLowerCase(),
            get: async (sql, p = []) => sqlite.prepare(sql).get(...p),
            run: async (sql, p = []) => ({ changes: sqlite.prepare(sql).run(...p).changes }),
            insertGuidelineWatchEvent: async (e) => { events.push(e); },
        };
        await store.putReviewedSearch(db, { cacheKey: 'k', topic: 'Community acquired pneumonia', shared: { articles: [{ uid: 'a' }] } });
        const app = express();
        app.use(express.json());
        registerUnifiedSearchRoutes(app, {
            db, cache: { get: async () => null, set: async () => true, del: async (k) => { deleted.push(k); } },
            serverConfig: {}, rateLimit: () => (_q, _s, n) => n(), fetchImpl: jest.fn(),
            topicHelpers: { buildAgentGuidance: jest.fn(), buildTopicIntelligence: jest.fn() },
        });

        const res = await request(app).post('/api/search/topic-outdated').send({ topic: 'Community acquired pneumonia' });
        expect(res.body).toEqual({ ok: true, refreshed: true });
        expect(await store.getReviewedSearch(db, 'k')).toBeNull();
        expect(deleted).toHaveLength(1);
        expect(events[0]).toMatchObject({ eventType: 'user_reported_outdated', normalizedTopic: 'community acquired pneumonia' });
    });

    test('reporting without a topic is rejected', async () => {
        const res = await request(makeApp()).post('/api/search/topic-outdated').send({});
        expect(res.status).toBe(400);
    });

    test('with precomputation on, a missing job still reads as pending', async () => {
        process.env.SEARCH_PRECOMPUTE_AI_EXTRAS = '1';
        const res = await request(makeApp()).get(`/api/search/ai-enrichment/${KEY}`);
        expect(res.body).toEqual({ status: 'pending' });
    });
});
