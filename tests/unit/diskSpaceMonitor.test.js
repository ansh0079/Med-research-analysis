'use strict';

jest.mock('@sentry/node', () => ({ captureMessage: jest.fn(), captureException: jest.fn() }));
const Sentry = require('@sentry/node');
const { assessDisk, reportDisk } = require('../../server/services/diskSpaceMonitor');

const GB = 1024 ** 3;
const bsize = 4096;
const disk = (totalGb, freeGb) => () => ({
    bsize,
    blocks: Math.round((totalGb * GB) / bsize),
    bavail: Math.round((freeGb * GB) / bsize),
});

describe('disk space monitor', () => {
    beforeEach(() => Sentry.captureMessage.mockClear());

    test('the 2026-10-02 incident (150 GB disk, nothing free) is an error', () => {
        const r = assessDisk({ statfs: disk(150, 0) });
        expect(r).toMatchObject({ level: 'error', freeGb: 0, totalGb: 150, freePct: 0 });
    });

    test('grades by free space and by percentage', () => {
        expect(assessDisk({ statfs: disk(150, 9.8) }).level).toBe('error');
        expect(assessDisk({ statfs: disk(150, 18) }).level).toBe('warning');
        expect(assessDisk({ statfs: disk(150, 44) }).level).toBe('ok');
        // A small disk is judged by percentage too: 5 GB free of 20 GB is 25%, but 1.5 GB of 100 GB is 1.5%.
        expect(assessDisk({ statfs: disk(100, 1.5) }).level).toBe('error');
    });

    test('limits are configurable', () => {
        const limits = { errorFreeGb: 2, errorFreePct: 1, warnFreeGb: 5, warnFreePct: 3 };
        expect(assessDisk({ statfs: disk(150, 9.8), limits }).level).toBe('ok');
        expect(assessDisk({ statfs: disk(150, 4), limits }).level).toBe('warning');
    });

    test('reports to Sentry once per level with a stable fingerprint, and stays silent when fine', () => {
        const logger = { warn: jest.fn() };
        expect(reportDisk(assessDisk({ statfs: disk(150, 44) }), logger)).toBe(false);
        expect(Sentry.captureMessage).not.toHaveBeenCalled();

        expect(reportDisk(assessDisk({ statfs: disk(150, 0) }), logger)).toBe(true);
        expect(Sentry.captureMessage).toHaveBeenCalledWith(
            expect.stringContaining('critically low'),
            expect.objectContaining({ level: 'error', fingerprint: ['disk-space-low', 'error'] })
        );
    });

    test('works against the real filesystem', () => {
        const r = assessDisk();
        expect(['ok', 'warning', 'error']).toContain(r.level);
        expect(r.totalGb).toBeGreaterThan(0);
    });
});
