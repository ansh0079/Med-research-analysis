const { blendEmbeddings, normalizeVector } = require('../../server/services/vectorSearchService');

function vec(fill) {
    return Array.from({ length: 384 }, () => fill);
}

describe('vectorSearchService', () => {
    test('normalizeVector rejects invalid vectors', () => {
        expect(normalizeVector([1, 2, 3])).toBeNull();
        expect(normalizeVector(vec('bad'))).toBeNull();
    });

    test('blendEmbeddings returns normalized query vector when no user embedding is supplied', () => {
        const blended = blendEmbeddings(vec(2), null);
        expect(blended).toHaveLength(384);
        expect(Math.sqrt(blended.reduce((sum, n) => sum + n * n, 0))).toBeCloseTo(1);
    });

    test('blendEmbeddings combines query and user embeddings with bounded query weight', () => {
        const query = Array.from({ length: 384 }, (_, i) => (i === 0 ? 1 : 0));
        const user = Array.from({ length: 384 }, (_, i) => (i === 1 ? 1 : 0));

        const blended = blendEmbeddings(query, user, { queryWeight: 0.8 });

        expect(blended[0]).toBeGreaterThan(blended[1]);
        expect(Math.sqrt(blended.reduce((sum, n) => sum + n * n, 0))).toBeCloseTo(1);
    });
});
