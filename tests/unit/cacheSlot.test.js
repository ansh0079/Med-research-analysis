'use strict';

const cacheSingleton = require('../../cache');

const freshCache = () => new cacheSingleton.constructor();

describe('cache.tryAcquireSlot', () => {
    afterEach(() => jest.restoreAllMocks());

    test('without Redis: the slot is taken once per interval, then free again', async () => {
        const cache = freshCache();
        let now = 5_000;
        jest.spyOn(Date, 'now').mockImplementation(() => now);

        expect(await cache.tryAcquireSlot('k', 1100)).toEqual({ acquired: true, waitMs: 0 });
        now += 300;
        expect(await cache.tryAcquireSlot('k', 1100)).toEqual({ acquired: false, waitMs: 800 });
        now += 800;
        expect(await cache.tryAcquireSlot('k', 1100)).toEqual({ acquired: true, waitMs: 0 });
    });

    test('slots with different keys do not affect each other', async () => {
        const cache = freshCache();
        expect((await cache.tryAcquireSlot('a', 1000)).acquired).toBe(true);
        expect((await cache.tryAcquireSlot('b', 1000)).acquired).toBe(true);
        expect((await cache.tryAcquireSlot('a', 1000)).acquired).toBe(false);
    });

    test('with Redis: one atomic SET NX with a millisecond expiry under a prefixed key', async () => {
        const cache = freshCache();
        cache.redis = { set: jest.fn().mockResolvedValue('OK'), pttl: jest.fn() };
        expect(await cache.tryAcquireSlot('semanticscholar', 1100)).toEqual({ acquired: true, waitMs: 0 });
        expect(cache.redis.set).toHaveBeenCalledWith(`${cache.redisPrefix}slot:semanticscholar`, '1', 'PX', 1100, 'NX');
        expect(cache.redis.pttl).not.toHaveBeenCalled();
    });

    test('with Redis: a held slot reports how long until it frees up', async () => {
        const cache = freshCache();
        cache.redis = { set: jest.fn().mockResolvedValue(null), pttl: jest.fn().mockResolvedValue(420) };
        expect(await cache.tryAcquireSlot('semanticscholar', 1100)).toEqual({ acquired: false, waitMs: 420 });
        // A key that vanished or has no expiry must not produce a zero or negative wait.
        cache.redis.pttl.mockResolvedValue(-2);
        expect((await cache.tryAcquireSlot('semanticscholar', 1100)).waitMs).toBe(25);
    });
});
