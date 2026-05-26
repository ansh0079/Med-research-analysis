// ==========================================
// Unit Tests for Recommendation Routes
// ==========================================

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../../server/services/recommendationService');

const { registerRecommendationRoutes } = require('../../server/controllers/recommendationRoutes');
const { createRecommendationService } = require('../../server/services/recommendationService');

function authToken(payload = { id: 'u1', name: 'Test User', email: 't@test.com', role: 'researcher' }) {
    return jwt.sign(payload, 'test-jwt-secret', { expiresIn: '1h' });
}

describe('recommendationRoutes', () => {
    let app;
    let mockRec;

    const mockDb = {
        logEvent: jest.fn().mockResolvedValue({ id: 1 }),
    };

    const deps = {
        serverConfig: { keys: {} },
        db: mockDb,
        rateLimit: () => (req, res, next) => next(),
        requireJson: (req, res, next) => next(),
        requireAuthJwt: (req, res, next) => {
            req.user = { id: 'u1', role: 'researcher' };
            req.sessionId = 's1';
            next();
        },
        fetch: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
        app = express();
        app.use(express.json());

        mockRec = {
            getRecommendations: jest.fn().mockResolvedValue({
                recommendations: [{ title: 'Rec 1' }],
                cached: false,
            }),
            getRelatedForArticle: jest.fn().mockResolvedValue({
                articles: [{ title: 'Related 1' }],
                cached: false,
            }),
        };
        createRecommendationService.mockReturnValue(mockRec);

        registerRecommendationRoutes(app, deps);
    });

    describe('GET /api/recommendations/:userId', () => {
        test('returns 403 when accessing another user\'s recommendations', async () => {
            const res = await request(app)
                .get('/api/recommendations/other-user')
                .set('Authorization', `Bearer ${authToken()}`);
            expect(res.status).toBe(403);
        });

        test('returns 200 with recommendations', async () => {
            const res = await request(app)
                .get('/api/recommendations/u1?limit=5')
                .set('Authorization', `Bearer ${authToken()}`);
            expect(res.status).toBe(200);
            expect(res.body.recommendations).toHaveLength(1);
            expect(mockRec.getRecommendations).toHaveBeenCalledWith({
                userId: 'u1',
                sessionId: 's1',
                contextArticleId: undefined,
                limit: '5',
            });
        });
    });

    describe('GET /api/articles/:id/related', () => {
        test('returns 200 with related articles', async () => {
            const res = await request(app)
                .get('/api/articles/123/related?limit=3');
            expect(res.status).toBe(200);
            expect(res.body.articles).toHaveLength(1);
            expect(mockRec.getRelatedForArticle).toHaveBeenCalledWith({ id: '123', limit: '3' });
        });
    });
});
