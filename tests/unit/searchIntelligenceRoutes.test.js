const express = require('express');
const request = require('supertest');

const { registerSearchRoutes } = require('../../server/routes/search');

describe('search intelligence route', () => {
    function createApp(dbOverrides = {}) {
        const app = express();
        app.use(express.json());
        app.use((req, _res, next) => {
            req.log = {
                error: jest.fn(),
                warn: jest.fn(),
                debug: jest.fn(),
            };
            next();
        });

        const db = {
            getTopicKnowledge: jest.fn().mockResolvedValue(null),
            ...dbOverrides,
        };

        registerSearchRoutes(app, {
            serverConfig: { keys: {} },
            db,
            cache: { get: jest.fn(), set: jest.fn() },
            rateLimit: () => (_req, _res, next) => next(),
            requireJson: (_req, _res, next) => next(),
            requireAuthJwt: (_req, _res, next) => next(),
            requireRole: () => (_req, _res, next) => next(),
            requireDailySearchLimit: () => (_req, _res, next) => next(),
            fetch: jest.fn(),
            enqueuePdfPreindex: jest.fn(),
        });

        return { app, db };
    }

    test('degrades optional intelligence panels instead of returning 500', async () => {
        const { app } = createApp();

        const res = await request(app)
            .post('/api/search/intelligence')
            .send({
                q: 'diabetes',
                articles: [
                    { uid: 'a1', title: 'Diabetes trial', abstract: 'Randomized trial', _source: 'pubmed' },
                    { uid: 'a2', title: 'Diabetes cohort', abstract: 'Cohort study', _source: 'pubmed' },
                ],
            });

        expect(res.status).toBe(200);
        expect(res.body.knowledgeAvailable).toBe(false);
        expect(res.body.topicIntelligence.guidelineSnapshot.guidelines).toEqual([]);
        expect(res.body.topicIntelligence.evidenceMap.nodes.groundedClaims).toEqual([]);
    });
});
