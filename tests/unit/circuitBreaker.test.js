'use strict';

const { CircuitBreaker } = require('../../server/services/circuitBreaker');

function makeBreaker(fn, opts = {}) {
    return new CircuitBreaker(fn, { failureThreshold: 3, resetTimeoutMs: 500, halfOpenMaxCalls: 2, ...opts });
}

describe('CircuitBreaker', () => {
    describe('CLOSED state', () => {
        it('starts CLOSED and calls fn successfully', async () => {
            const fn = jest.fn().mockResolvedValue('ok');
            const cb = makeBreaker(fn);
            expect(cb.state).toBe('CLOSED');
            await expect(cb.fire('arg1')).resolves.toBe('ok');
            expect(fn).toHaveBeenCalledWith('arg1');
        });

        it('passes through the resolved value', async () => {
            const cb = makeBreaker(jest.fn().mockResolvedValue(42));
            await expect(cb.fire()).resolves.toBe(42);
        });

        it('re-throws errors without opening below threshold', async () => {
            const err = new Error('oops');
            const cb = makeBreaker(jest.fn().mockRejectedValue(err), { failureThreshold: 3 });
            await expect(cb.fire()).rejects.toThrow('oops');
            await expect(cb.fire()).rejects.toThrow('oops');
            expect(cb.state).toBe('CLOSED');
            expect(cb.failures).toBe(2);
        });
    });

    describe('CLOSED → OPEN transition', () => {
        it('opens after failureThreshold consecutive failures', async () => {
            const err = new Error('fail');
            const fn = jest.fn().mockRejectedValue(err);
            const cb = makeBreaker(fn, { failureThreshold: 3 });
            for (let i = 0; i < 3; i++) {
                await expect(cb.fire()).rejects.toThrow('fail');
            }
            expect(cb.state).toBe('OPEN');
        });

        it('records lastError when opening', async () => {
            const err = new Error('bang');
            const cb = makeBreaker(jest.fn().mockRejectedValue(err), { failureThreshold: 1 });
            await expect(cb.fire()).rejects.toThrow('bang');
            expect(cb.health().lastError).toBe('bang');
        });
    });

    describe('OPEN state', () => {
        async function openBreaker(opts = {}) {
            const fn = jest.fn().mockRejectedValue(new Error('fail'));
            const cb = makeBreaker(fn, { failureThreshold: 1, ...opts });
            await expect(cb.fire()).rejects.toThrow();
            expect(cb.state).toBe('OPEN');
            fn.mockReset();
            return { cb, fn };
        }

        it('throws immediately without calling fn', async () => {
            const { cb, fn } = await openBreaker({ resetTimeoutMs: 60000 });
            const err = await cb.fire().catch((e) => e);
            expect(err.circuitOpen).toBe(true);
            expect(err.status).toBe(503);
            expect(fn).not.toHaveBeenCalled();
        });

        it('error message mentions the timeout', async () => {
            const { cb } = await openBreaker({ resetTimeoutMs: 60000 });
            const err = await cb.fire().catch((e) => e);
            expect(err.message).toMatch(/OPEN/i);
        });
    });

    describe('OPEN → HALF_OPEN transition', () => {
        it('transitions to HALF_OPEN after resetTimeoutMs elapses', async () => {
            const fn = jest.fn()
                .mockRejectedValueOnce(new Error('fail'))
                .mockResolvedValue('recovered');
            const cb = makeBreaker(fn, { failureThreshold: 1, resetTimeoutMs: 50, halfOpenMaxCalls: 1 });
            await expect(cb.fire()).rejects.toThrow();
            expect(cb.state).toBe('OPEN');

            await new Promise((r) => setTimeout(r, 60));

            await expect(cb.fire()).resolves.toBe('recovered');
        });
    });

    describe('HALF_OPEN → CLOSED', () => {
        it('closes after halfOpenMaxCalls successes', async () => {
            const fn = jest.fn()
                .mockRejectedValueOnce(new Error('fail'))
                .mockResolvedValue('ok');
            const cb = makeBreaker(fn, { failureThreshold: 1, resetTimeoutMs: 50, halfOpenMaxCalls: 2 });
            await expect(cb.fire()).rejects.toThrow();
            await new Promise((r) => setTimeout(r, 60));

            await cb.fire();
            expect(cb.state).toBe('HALF_OPEN');
            await cb.fire();
            expect(cb.state).toBe('CLOSED');
            expect(cb.failures).toBe(0);
        });
    });

    describe('HALF_OPEN → OPEN on failure', () => {
        it('re-opens when a probe call fails', async () => {
            const err = new Error('still broken');
            const fn = jest.fn()
                .mockRejectedValueOnce(new Error('first'))
                .mockRejectedValue(err);
            const cb = makeBreaker(fn, { failureThreshold: 1, resetTimeoutMs: 50, halfOpenMaxCalls: 2 });
            await expect(cb.fire()).rejects.toThrow('first');
            await new Promise((r) => setTimeout(r, 60));
            await expect(cb.fire()).rejects.toThrow('still broken');
            expect(cb.state).toBe('OPEN');
        });
    });

    describe('health()', () => {
        it('returns correct fields in CLOSED state', () => {
            const cb = makeBreaker(jest.fn());
            const h = cb.health();
            expect(h).toMatchObject({ state: 'CLOSED', failures: 0, nextAttempt: 0, lastError: undefined });
        });

        it('returns OPEN state with non-zero nextAttempt', async () => {
            const cb = makeBreaker(jest.fn().mockRejectedValue(new Error('x')), { failureThreshold: 1, resetTimeoutMs: 5000 });
            await expect(cb.fire()).rejects.toThrow();
            const h = cb.health();
            expect(h.state).toBe('OPEN');
            expect(h.nextAttempt).toBeGreaterThan(Date.now());
            expect(h.lastError).toBe('x');
        });

        it('resets failures and lastError after recovery', async () => {
            const fn = jest.fn()
                .mockRejectedValueOnce(new Error('fail'))
                .mockResolvedValue('ok');
            const cb = makeBreaker(fn, { failureThreshold: 1, resetTimeoutMs: 50, halfOpenMaxCalls: 1 });
            await expect(cb.fire()).rejects.toThrow();
            await new Promise((r) => setTimeout(r, 60));
            await cb.fire();
            const h = cb.health();
            expect(h.state).toBe('CLOSED');
            expect(h.failures).toBe(0);
            expect(h.lastError).toBeUndefined();
        });
    });
});
