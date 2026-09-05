'use strict';

const cache = require('../../cache');

describe('memory rate limiter', () => {
    test('awaits get/set so the in-memory counter actually increments', async () => {
        const key = `unit-rate-${Date.now()}-${Math.random()}`;
        const first = await cache.checkRateLimit(key, 2, 60);
        const second = await cache.checkRateLimit(key, 2, 60);
        const third = await cache.checkRateLimit(key, 2, 60);

        expect(first.allowed).toBe(true);
        expect(second.allowed).toBe(true);
        expect(third.allowed).toBe(false);
        expect(third.remaining).toBe(0);
    });
});
