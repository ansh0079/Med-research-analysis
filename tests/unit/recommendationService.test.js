jest.mock('../../server/services/vectorSearchService', () => ({
    createVectorSearchService: jest.fn(() => ({
        semanticSearch: jest.fn().mockResolvedValue({
            articles: [{ uid: 'pmid-1' }],
            scores: [0.9],
            semantic: { queryEmbeddingUsed: true, userEmbeddingUsed: false, queryWeight: 1 },
        }),
    })),
}));

const { personalizedSemanticSearch } = require('../../server/services/recommendationService');
const { createVectorSearchService } = require('../../server/services/vectorSearchService');

describe('recommendationService', () => {
    test('personalizedSemanticSearch delegates to vector service', async () => {
        const out = await personalizedSemanticSearch({
            db: { isVectorSearchAvailable: () => true },
            serverConfig: { keys: {} },
            query: 'ARDS prone positioning',
            userProfileText: 'ICU fellow',
        });
        expect(createVectorSearchService).toHaveBeenCalled();
        expect(out.articles).toHaveLength(1);
    });

    test('requires query', async () => {
        await expect(personalizedSemanticSearch({ db: {}, serverConfig: {} }))
            .rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    });
});
