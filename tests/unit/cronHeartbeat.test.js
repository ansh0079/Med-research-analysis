const { withCronHeartbeat, recordCronRun } = require('../../server/services/cronHeartbeat');

function mockDb() {
    const calls = [];
    return {
        calls,
        failures: 0,
        async get(sql, params) {
            calls.push({ sql, params });
            const ok = params[2] === 'ok';
            this.failures = ok ? 0 : this.failures + 1;
            return { consecutive_failures: this.failures };
        },
    };
}

describe('cronHeartbeat', () => {
    test('successful run records ok heartbeat and returns the task result', async () => {
        const db = mockDb();
        const fn = withCronHeartbeat('test-task', async () => 'done', { db, logger: { error: jest.fn() } });
        await expect(fn()).resolves.toBe('done');
        expect(db.calls).toHaveLength(1);
        expect(db.calls[0].params[0]).toBe('test-task');
        expect(db.calls[0].params[2]).toBe('ok');
        expect(db.calls[0].sql).toContain('ON CONFLICT(task) DO UPDATE');
    });

    test('failing run records error heartbeat, logs, and does not throw', async () => {
        const db = mockDb();
        const logger = { error: jest.fn() };
        const fn = withCronHeartbeat('test-task', async () => { throw new Error('boom'); }, { db, logger });
        await expect(fn()).resolves.toBeNull();
        expect(db.calls[0].params[2]).toBe('error');
        expect(db.calls[0].params[3]).toBe('boom');
        expect(logger.error).toHaveBeenCalledWith(
            expect.objectContaining({ task: 'test-task' }),
            expect.any(String)
        );
    });

    test('heartbeat write failure never breaks the task', async () => {
        const db = { async get() { throw new Error('db down'); } };
        const fn = withCronHeartbeat('test-task', async () => 42, { db, logger: { error: jest.fn() } });
        await expect(fn()).resolves.toBe(42);
    });

    test('recordCronRun returns the consecutive-failure count from the upsert', async () => {
        const db = mockDb();
        db.failures = 4;
        const n = await recordCronRun(db, 't', { ok: false, error: 'x' });
        expect(n).toBe(5);
    });

    test('recordCronRun tolerates a missing db', async () => {
        await expect(recordCronRun({ }, 't', { ok: true })).resolves.toBeNull();
    });
});
