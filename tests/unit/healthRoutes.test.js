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
