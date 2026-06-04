const { buildProxyService } = require('../../server/services/externalApiProxy');

describe('externalApiProxy source cache', () => {
    test('reuses cached OpenAlex source responses', async () => {
        const store = new Map();
        const cache = {
            get: jest.fn(async (key) => store.get(key)),
            set: jest.fn(async (key, value) => store.set(key, value)),
        };
        const fetchImpl = jest.fn(async () => ({
            ok: true,
            json: async () => ({ results: [{ id: 'w1', display_name: 'Trial' }] }),
        }));
        const telemetry = {};
        const proxy = buildProxyService({ serverConfig: { keys: {} }, fetchImpl, cache, telemetry });

        const first = await proxy.openAlexSearch('heart failure', { limit: 10 });
        const second = await proxy.openAlexSearch('heart failure', { limit: 10 });

        expect(first).toEqual(second);
        expect(fetchImpl).toHaveBeenCalledTimes(1);
        expect(cache.set).toHaveBeenCalledTimes(1);
        expect(telemetry.sourceFetches.openalex.cached).toBe(true);
    });

    test('single-flights concurrent identical OpenAlex misses', async () => {
        const store = new Map();
        const cache = {
            get: jest.fn(async (key) => store.get(key)),
            set: jest.fn(async (key, value) => store.set(key, value)),
        };
        let resolveFetch;
        const fetchImpl = jest.fn(() => new Promise((resolve) => {
            resolveFetch = () => resolve({
                ok: true,
                json: async () => ({ results: [{ id: 'w2', display_name: 'Shared' }] }),
            });
        }));
        const telemetry = {};
        const proxy = buildProxyService({ serverConfig: { keys: {} }, fetchImpl, cache, telemetry });

        const p1 = proxy.openAlexSearch('sepsis', { limit: 20 });
        const p2 = proxy.openAlexSearch('sepsis', { limit: 20 });
        await new Promise((resolve) => setImmediate(resolve));
        resolveFetch();
        const [first, second] = await Promise.all([p1, p2]);

        expect(first).toEqual(second);
        expect(fetchImpl).toHaveBeenCalledTimes(1);
    });
});
