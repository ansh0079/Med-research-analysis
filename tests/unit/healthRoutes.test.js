const { checkDatabaseHealth } = require('../../server/routes/health');

describe('health route helpers', () => {
    test('executes a database query for health checks', async () => {
        const db = {
            get: jest.fn().mockResolvedValue({ health_check: 1 }),
        };

        const result = await checkDatabaseHealth(db);

        expect(result.ok).toBe(true);
        expect(result.latencyMs).toEqual(expect.any(Number));
        expect(db.get).toHaveBeenCalledWith('SELECT 1 AS health_check');
    });

    test('reports unhealthy when the database query fails', async () => {
        const db = {
            get: jest.fn().mockRejectedValue(new Error('database is locked')),
        };

        const result = await checkDatabaseHealth(db);

        expect(result.ok).toBe(false);
        expect(result.error).toBe('database is locked');
    });
});

describe('GET /health payload', () => {
    const { registerHealthRoutes } = require('../../server/routes/health');
    const express = require('express');
    const request = require('supertest');

    function buildApp() {
        const app = express();
        // Proxy stands in for the full 198-method database contract.
        const db = new Proxy({}, { get: () => jest.fn(async () => ({ health_check: 1 })) });
        registerHealthRoutes(app, {
            serverConfig: { features: {}, keys: {} },
            clientConfig: {},
            cache: { getStats: () => ({ keys: 0, hitRate: '0.00%' }) },
            db,
        });
        return app;
    }

    afterEach(() => {
        delete process.env.GIT_SHA;
    });

    test('exposes the deployed commit from the GIT_SHA build stamp', async () => {
        process.env.GIT_SHA = 'abc1234def';

        const res = await request(buildApp()).get('/health');

        expect(res.status).toBe(200);
        expect(res.body.gitSha).toBe('abc1234def');
    });

    test('reports "unknown" when no SHA was stamped (local/dev runs)', async () => {
        const res = await request(buildApp()).get('/health');

        expect(res.status).toBe(200);
        expect(res.body.gitSha).toBe('unknown');
    });
});
