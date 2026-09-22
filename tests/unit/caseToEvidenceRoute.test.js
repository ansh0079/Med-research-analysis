'use strict';

jest.mock('../../server/services/caseToEvidenceService', () => ({
    buildCaseToEvidenceBrief: jest.fn(),
}));

const express = require('express');
const request = require('supertest');
const { registerKnowledgeRoutes } = require('../../server/routes/learning/knowledge');
const { buildCaseToEvidenceBrief } = require('../../server/services/caseToEvidenceService');

function makeApp() {
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => { req.log = { error: jest.fn() }; next(); });
    const requireAuth = (req, res, next) => {
        if (req.headers.authorization !== 'Bearer test') return res.sendStatus(401);
        req.user = { id: 'u1' };
        next();
    };
    registerKnowledgeRoutes(app, {
        db: {}, requireAuthJwt: requireAuth, requireAuthOrBeta: requireAuth,
        requireVerifiedEmail: (_req, _res, next) => next(),
        rateLimit: () => (_req, _res, next) => next(),
        serverConfig: { keys: {} }, fetch: jest.fn(),
    });
    return app;
}

beforeEach(() => jest.clearAllMocks());

test('case-to-evidence requires authentication and forwards the search snapshot', async () => {
    const app = makeApp();
    await request(app).post('/api/learning/case-to-evidence')
        .send({ clinicalQuestion: 'Which evidence applies to this case?' }).expect(401);
    buildCaseToEvidenceBrief.mockResolvedValue({ brief: { bestEvidence: 'Trial evidence' }, articles: [] });
    const response = await request(app).post('/api/learning/case-to-evidence')
        .set('Authorization', 'Bearer test')
        .send({
            clinicalQuestion: 'Which evidence applies to this case?', topic: 'ARDS',
            seedArticles: [{ uid: 'pubmed-1' }], evidenceSnapshotId: 'snap-1',
        }).expect(200);
    expect(response.body.brief.bestEvidence).toBe('Trial evidence');
    expect(buildCaseToEvidenceBrief).toHaveBeenCalledWith(expect.any(Object), expect.objectContaining({
        userId: 'u1', evidenceSnapshotId: 'snap-1', seedArticles: [{ uid: 'pubmed-1' }],
    }));
});

test('a foreign or expired snapshot is reported as a client error', async () => {
    const error = new Error('Evidence snapshot is unavailable for this user');
    error.code = 'INVALID_EVIDENCE_SNAPSHOT';
    buildCaseToEvidenceBrief.mockRejectedValue(error);
    await request(makeApp()).post('/api/learning/case-to-evidence')
        .set('Authorization', 'Bearer test')
        .send({ clinicalQuestion: 'Which evidence applies to this case?', evidenceSnapshotId: 'foreign' })
        .expect(400);
});
