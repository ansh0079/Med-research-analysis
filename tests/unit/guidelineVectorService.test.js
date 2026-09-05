'use strict';

const { blendGuidelineVectorScores, rerankGuidelinesWithVectors } = require('../../server/services/guidelineVectorService');

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
