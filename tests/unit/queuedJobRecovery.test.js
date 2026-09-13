'use strict';

const { sweepQueuedJobs } = require('../../server/services/zombieJobSweeper');

test('expires obsolete jobs conditionally and recovers recent jobs in a bounded batch', async () => {
    const now = Date.parse('2026-09-13T12:00:00Z');
    const db = {
        all: jest.fn(async () => [
            { job_key: 'old', updated_at: '2026-07-01T00:00:00Z' },
            { job_key: 'recent', updated_at: '2026-09-13T11:00:00Z' },
        ]),
        run: jest.fn(async () => ({ changes: 1 })),
    };
    const queue = { bullEnabled: true, enqueueNamed: jest.fn() };
    expect(await sweepQueuedJobs(db, { queue, now, limit: 2 })).toEqual({ scanned: 2, expired: 1, requeued: 1 });
    expect(db.all.mock.calls[0][1][1]).toBe(2);
    expect(db.run.mock.calls[0][0]).toContain("status = 'queued' AND updated_at = ?");
    expect(queue.enqueueNamed).toHaveBeenCalledWith('process', { jobKey: 'recent' }, expect.objectContaining({ jobId: expect.stringMatching(/^ai-recovery-/) }));
});

test('does not report expiry when another worker already claimed the row', async () => {
    const result = await sweepQueuedJobs({ all: async () => [{ job_key: 'old', updated_at: '2020-01-01' }], run: async () => ({ changes: 0 }) }, { queue: { bullEnabled: true } });
    expect(result.expired).toBe(0);
});
