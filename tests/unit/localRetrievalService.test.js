'use strict';

const {
    rankLocalArticlesHybrid,
    searchLocalArticleCache,
} = require('../../server/services/localRetrievalService');

describe('localRetrievalService', () => {
    test('hybrid reranking prefers title and abstract matches over weak cached rows', () => {
        const ranked = rankLocalArticlesHybrid([
            { uid: 'weak', title: 'Cell culture cytokine pathway', abstract: 'mouse model', pubdate: '1999' },
            { uid: 'strong', title: 'ARDS low tidal volume ventilation trial', abstract: 'Adults with ARDS mortality', pubdate: '2024', pmcrefcount: 100 },
        ], 'ARDS low tidal volume mortality', 2);
        expect(ranked[0].uid).toBe('strong');
        expect(ranked[0]._localRetrievalMode).toBe('hybrid_lexical_semantic_lite');
    });

    test('fetches a deeper local pool and returns capped hybrid results', async () => {
        const db = {
            searchCachedArticlesLocal: jest.fn().mockResolvedValue([
                { uid: 'a', title: 'Heart failure guideline', abstract: 'current treatment', pubdate: '2024' },
                { uid: 'b', title: 'Unrelated', abstract: 'other', pubdate: '2000' },
            ]),
        };
        const result = await searchLocalArticleCache(db, { query: 'current heart failure treatment', limit: 1 });
        expect(db.searchCachedArticlesLocal).toHaveBeenCalledWith('current heart failure treatment', { limit: 4 });
        expect(result.used).toBe(true);
        expect(result.articles).toHaveLength(1);
        expect(result.articles[0].uid).toBe('a');
    });
});
