'use strict';

// Semantic Scholar allows one request per second in total. These tests drive the limiter with an
// injected clock, so every gap is exact and nothing really waits.

function loadThrottle(env = {}) {
    jest.resetModules();
    for (const [k, v] of Object.entries(env)) process.env[k] = v;
    const mod = require('../../server/services/semanticScholarThrottle');
    for (const k of Object.keys(env)) delete process.env[k];
    return mod;
}

function fakeClock(start = 1_000_000) {
    const clock = { t: start };
    clock.now = () => clock.t;
    clock.sleep = jest.fn(async (ms) => { clock.t += ms; });
    return clock;
}

/** A cache whose slot honours the shared fake clock, like Redis SET ... PX ... NX. */
function fakeSlotCache(clock) {
    let until = 0;
    const cache = {
        tryAcquireSlot: jest.fn(async (_key, ms) => {
            if (until <= clock.now()) { until = clock.now() + ms; return { acquired: true, waitMs: 0 }; }
            return { acquired: false, waitMs: until - clock.now() };
        }),
    };
    return cache;
}

const response = (status, headers = {}) => ({
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name) => headers[name.toLowerCase()] ?? null },
});

describe('waitForSemanticScholarSlot', () => {
    test('requests are at least the interval apart, one after another', async () => {
        const { waitForSemanticScholarSlot, MIN_INTERVAL_MS } = loadThrottle();
        const clock = fakeClock();
        const starts = [];
        for (let i = 0; i < 4; i += 1) {
            await waitForSemanticScholarSlot({ cache: null, sleep: clock.sleep, now: clock.now });
            starts.push(clock.now());
        }
        for (let i = 1; i < starts.length; i += 1) expect(starts[i] - starts[i - 1]).toBeGreaterThanOrEqual(MIN_INTERVAL_MS);
    });

    test('callers that arrive at the same instant are released one at a time, in order', async () => {
        const { waitForSemanticScholarSlot, MIN_INTERVAL_MS } = loadThrottle();
        const clock = fakeClock();
        const released = [];
        await Promise.all([1, 2, 3, 4].map((id) => waitForSemanticScholarSlot({ cache: null, sleep: clock.sleep, now: clock.now })
            .then(() => released.push({ id, at: clock.now() }))));
        expect(released.map((r) => r.id)).toEqual([1, 2, 3, 4]);
        for (let i = 1; i < released.length; i += 1) expect(released[i].at - released[i - 1].at).toBeGreaterThanOrEqual(MIN_INTERVAL_MS);
    });

    test('two containers sharing one slot still stay the interval apart', async () => {
        // Real timers under fake time: time only moves when advanced, so each caller's wake-up is
        // observed at the moment it happens (a hand-rolled shared clock gets jumped by the other
        // caller's sleep and makes two genuinely separate sends look simultaneous).
        jest.useFakeTimers();
        try {
            const web = loadThrottle();
            const worker = loadThrottle();
            const shared = fakeSlotCache({ now: () => Date.now() });
            const sent = [];
            const send = (mod) => mod.waitForSemanticScholarSlot({ cache: shared }).then(() => sent.push(Date.now()));
            const all = Promise.all([send(web), send(worker), send(web), send(worker)]);
            for (let i = 0; i < 400 && sent.length < 4; i += 1) await jest.advanceTimersByTimeAsync(25);
            await all;
            sent.sort((a, b) => a - b);
            expect(sent).toHaveLength(4);
            // Observed at 25 ms resolution.
            for (let i = 1; i < sent.length; i += 1) expect(sent[i] - sent[i - 1]).toBeGreaterThanOrEqual(web.MIN_INTERVAL_MS - 25);
        } finally {
            jest.useRealTimers();
        }
    });

    test('takes the slot under the shared key with the full interval', async () => {
        const { waitForSemanticScholarSlot, MIN_INTERVAL_MS, SLOT_KEY } = loadThrottle();
        const clock = fakeClock();
        const cache = fakeSlotCache(clock);
        await waitForSemanticScholarSlot({ cache, sleep: clock.sleep, now: clock.now });
        expect(cache.tryAcquireSlot).toHaveBeenCalledWith(SLOT_KEY, MIN_INTERVAL_MS);
    });

    test('a broken shared slot (Redis down) does not block requests', async () => {
        const { waitForSemanticScholarSlot } = loadThrottle();
        const clock = fakeClock();
        const cache = { tryAcquireSlot: jest.fn().mockRejectedValue(new Error('redis down')) };
        await expect(waitForSemanticScholarSlot({ cache, sleep: clock.sleep, now: clock.now })).resolves.toBeUndefined();
    });

    test('the interval can be raised by configuration but never dropped below one second', () => {
        expect(loadThrottle({ S2_MIN_INTERVAL_MS: '10' }).MIN_INTERVAL_MS).toBe(1000);
        expect(loadThrottle({ S2_MIN_INTERVAL_MS: '2500' }).MIN_INTERVAL_MS).toBe(2500);
        expect(loadThrottle().MIN_INTERVAL_MS).toBe(1100);
    });
});

describe('semanticScholarFetch', () => {
    const run = (mod, fetchImpl, opts = {}) => {
        const clock = opts.clock || fakeClock();
        return mod.semanticScholarFetch('https://api.semanticscholar.org/graph/v1/paper/x', {
            fetchImpl,
            makeOptions: (headers) => ({ headers, timeout: 1000 }),
            sleep: clock.sleep,
            now: clock.now,
            cache: null,
            ...opts,
        });
    };

    test('sends the key and returns a good response untouched', async () => {
        const mod = loadThrottle();
        const fetchImpl = jest.fn().mockResolvedValue(response(200));
        const res = await run(mod, fetchImpl, { key: 'k1' });
        expect(res.status).toBe(200);
        expect(fetchImpl).toHaveBeenCalledTimes(1);
        expect(fetchImpl.mock.calls[0][1].headers).toEqual({ 'x-api-key': 'k1' });
    });

    test('a 429 waits for Retry-After, then tries again', async () => {
        const mod = loadThrottle();
        const clock = fakeClock();
        const fetchImpl = jest.fn().mockResolvedValueOnce(response(429, { 'retry-after': '3' })).mockResolvedValueOnce(response(200));
        const res = await run(mod, fetchImpl, { clock });
        expect(res.status).toBe(200);
        expect(fetchImpl).toHaveBeenCalledTimes(2);
        expect(clock.sleep).toHaveBeenCalledWith(3000);
    });

    test('every attempt waits for its own slot, so retries cannot burst', async () => {
        const mod = loadThrottle();
        const clock = fakeClock();
        const cache = fakeSlotCache(clock);
        const fetchImpl = jest.fn().mockResolvedValueOnce(response(503)).mockResolvedValueOnce(response(429)).mockResolvedValueOnce(response(200));
        await run(mod, fetchImpl, { clock, cache });
        expect(fetchImpl).toHaveBeenCalledTimes(3);
        expect(cache.tryAcquireSlot.mock.calls.length).toBeGreaterThanOrEqual(3);
    });

    test('caps an excessive Retry-After', async () => {
        const mod = loadThrottle();
        const clock = fakeClock();
        const fetchImpl = jest.fn().mockResolvedValueOnce(response(429, { 'retry-after': '600' })).mockResolvedValueOnce(response(200));
        await run(mod, fetchImpl, { clock });
        expect(clock.sleep).toHaveBeenCalledWith(10000);
        expect(clock.sleep).not.toHaveBeenCalledWith(600000);
    });

    test('a rejected key is dropped and the request retried without it', async () => {
        const mod = loadThrottle();
        const fetchImpl = jest.fn().mockResolvedValueOnce(response(403)).mockResolvedValueOnce(response(200));
        const log = { warn: jest.fn() };
        const res = await run(mod, fetchImpl, { key: 'bad', log });
        expect(res.status).toBe(200);
        expect(fetchImpl.mock.calls[0][1].headers).toEqual({ 'x-api-key': 'bad' });
        expect(fetchImpl.mock.calls[1][1].headers).toEqual({});
        expect(log.warn).toHaveBeenCalled();
    });

    test('without a key a 403 is returned as is', async () => {
        const mod = loadThrottle();
        const fetchImpl = jest.fn().mockResolvedValue(response(403));
        const res = await run(mod, fetchImpl);
        expect(res.status).toBe(403);
        expect(fetchImpl).toHaveBeenCalledTimes(1);
    });

    test('gives back the last 429 after the allowed attempts instead of throwing', async () => {
        const mod = loadThrottle();
        const fetchImpl = jest.fn().mockResolvedValue(response(429));
        const res = await run(mod, fetchImpl, { maxAttempts: 3 });
        expect(res.status).toBe(429);
        expect(fetchImpl).toHaveBeenCalledTimes(3);
    });

    test('retries a network error, and rethrows if every attempt fails', async () => {
        const mod = loadThrottle();
        const flaky = jest.fn().mockRejectedValueOnce(new Error('ECONNRESET')).mockResolvedValueOnce(response(200));
        expect((await run(mod, flaky)).status).toBe(200);

        const down = jest.fn().mockRejectedValue(new Error('ENOTFOUND'));
        await expect(run(mod, down, { maxAttempts: 2 })).rejects.toThrow('ENOTFOUND');
        expect(down).toHaveBeenCalledTimes(2);
    });

    test('request options are built per attempt, when the request is actually sent', async () => {
        const mod = loadThrottle();
        const fetchImpl = jest.fn().mockResolvedValueOnce(response(429)).mockResolvedValueOnce(response(200));
        const makeOptions = jest.fn((headers) => ({ headers, signal: { fresh: true } }));
        await run(mod, fetchImpl, { makeOptions, key: 'k' });
        expect(makeOptions).toHaveBeenCalledTimes(2);
        expect(makeOptions.mock.calls[0][0]).toEqual({ 'x-api-key': 'k' });
    });
});
