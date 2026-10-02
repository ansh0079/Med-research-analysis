'use strict';

const {
    recordCacheLayer,
    cacheLayerSnapshot,
    resetCacheLayerMetrics,
} = require('../../server/services/ops/cacheLayerMetrics');

describe('cacheLayerMetrics', () => {
    beforeEach(() => resetCacheLayerMetrics());

    test('a layer with no samples is unmeasured, not a zero hit rate', async () => {
        const snapshot = await cacheLayerSnapshot();
        expect(snapshot.layers.search.hitRate).toBeNull();
        expect(snapshot.layers.synthesis.requests).toBe(0);
        expect(snapshot.layers['live-answer'].hitRate).toBeNull();
        expect(snapshot.layers.guidelines.hitRate).toBeNull();
    });

    test('hit rate is hits over requests for that layer only', async () => {
        recordCacheLayer('search', true);
        recordCacheLayer('search', true);
        recordCacheLayer('search', false);
        recordCacheLayer('synthesis', false);
        const snapshot = await cacheLayerSnapshot();
        expect(snapshot.layers.search).toMatchObject({ hits: 2, misses: 1, requests: 3 });
        expect(snapshot.layers.search.hitRate).toBeCloseTo(2 / 3);
        expect(snapshot.layers.synthesis.hitRate).toBe(0);
        expect(snapshot.layers.guidelines.requests).toBe(0);
    });
});
