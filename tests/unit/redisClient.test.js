'use strict';

const { buildRedisOptions } = require('../../server/config/redisClient');

describe('buildRedisOptions commandTimeout handling', () => {
    // ioredis checks `typeof options.commandTimeout === 'number'` to decide whether to
    // arm a per-command timer. Since `0` is a number, commandTimeout:0 arms a 0ms timer
    // that rejects every command almost immediately — including BullMQ's long-lived
    // blocking polls. The only way to actually disable it is to omit the key (undefined).
    test('commandTimeout:undefined override results in a non-numeric commandTimeout', () => {
        const opts = buildRedisOptions({ commandTimeout: undefined });
        expect(typeof opts.commandTimeout).not.toBe('number');
    });

    test('commandTimeout:0 override would be dangerous — guard against reintroducing it', () => {
        const opts = buildRedisOptions({ commandTimeout: 0 });
        // This assertion documents the footgun: 0 IS a number, so this would arm an
        // immediate-timeout timer in ioredis. If this test starts failing because someone
        // "fixed" commandTimeout:0 to mean disabled, update the BullMQ connection override
        // in jobQueue.js accordingly — but as of ioredis 5.x, 0 is NOT safe here.
        expect(typeof opts.commandTimeout).toBe('number');
        expect(opts.commandTimeout).toBe(0);
    });

    test('default commandTimeout (no override) is a positive number for non-blocking clients', () => {
        const opts = buildRedisOptions({});
        expect(typeof opts.commandTimeout).toBe('number');
        expect(opts.commandTimeout).toBeGreaterThan(0);
    });
});
