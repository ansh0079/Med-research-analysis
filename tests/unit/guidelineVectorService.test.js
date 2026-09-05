'use strict';

const { blendGuidelineVectorScores, rerankGuidelinesWithVectors } = require('../../server/services/guidelineVectorService');
const { GUIDELINE_VECTOR_SOURCE } = require('../../server/embeddings');
const vectorMixin = require('../../database/mixins/m07b-vector-cache-annotations');

describe('guidelineVectorService', () => {
    test('blends lexical relevance with pgvector hits', () => {
        const blended = blendGuidelineVectorScores([
            { id: 'g1', relevanceScore: 0.4, sourceBody: 'NICE' },
            { id: 'g2', relevanceScore: 0.5, sourceBody: 'ESC' },
        ], [
            { data: { guidelineId: 'g1' }, score: 0.95 },
        ], { weight: 0.4 });

        expect(blended[0].id).toBe('g1');
        expect(blended[0].vectorScore).toBeCloseTo(0.95, 2);
        expect(blended[0].relevanceScore).toBeCloseTo((0.4 * 0.6) + (0.95 * 0.4), 2);
    });

    test('rerank is a no-op without vector search', async () => {
        const ranked = [{ id: 'g1', relevanceScore: 0.8 }];
        const out = await rerankGuidelinesWithVectors(
            { isVectorSearchAvailable: () => false },
            'sepsis',
            ranked
        );
        expect(out).toBe(ranked);
    });
});

describe('searchSimilarArticlesCache source scoping', () => {
    const embedding = new Array(384).fill(0.1);

    function buildDb(captured) {
        const Db = vectorMixin(class {});
        const db = new Db();
        db._articlesCacheEmbeddingDim = 384;
        db.pgVectorPool = {
            query: async (sql, params) => {
                captured.sql = sql;
                captured.params = params;
                return { rows: [] };
            },
        };
        return db;
    }

    test('an unscoped search excludes guideline vectors', async () => {
        const captured = {};
        await buildDb(captured).searchSimilarArticlesCache(embedding, 5, 0.4);
        expect(captured.params[3]).toBeNull();
        expect(captured.params[4]).toContain(GUIDELINE_VECTOR_SOURCE);
        expect(captured.sql).toContain('source <> ALL($5::text[])');
    });

    test('an explicit source scopes the search to that source only', async () => {
        const captured = {};
        await buildDb(captured).searchSimilarArticlesCache(embedding, 5, 0.4, {
            source: GUIDELINE_VECTOR_SOURCE,
        });
        expect(captured.params[3]).toBe(GUIDELINE_VECTOR_SOURCE);
    });
});
