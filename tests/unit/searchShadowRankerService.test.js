'use strict';

const {
    applyShadowRankerRollout,
    shadowRankArticles,
    trainLogisticRanker,
} = require('../../server/services/searchShadowRankerService');

describe('searchShadowRankerService', () => {
    test('produces a shadow ordering without mutating visible article order', () => {
        const articles = [
            { uid: 'low', title: 'Unrelated cell model', abstract: '', citationCount: 1, year: 1990 },
            { uid: 'high', title: 'ARDS low tidal volume randomized trial', abstract: 'ARDS mortality trial', citationCount: 3000, year: 2000, _pinnedLandmark: true, pubtype: ['Randomized Controlled Trial'] },
        ];
        const original = articles.map((article) => article.uid);
        const shadow = shadowRankArticles(articles, { query: 'ARDS low tidal volume trial' });
        expect(articles.map((article) => article.uid)).toEqual(original);
        expect(shadow.topK[0].articleUid).toBe('high');
    });

    test('trains a small logistic model from labelled judgments', () => {
        const judgments = Array.from({ length: 12 }, (_, index) => ({
            query: 'sepsis mortality trial',
            label: index < 6 ? 1 : 0,
            article: index < 6
                ? { title: 'sepsis mortality randomized trial', abstract: 'patients mortality', citationCount: 500, year: 2020 }
                : { title: 'mouse cytokine pathway', abstract: 'cell model', citationCount: 5, year: 1995 },
        }));
        const model = trainLogisticRanker(judgments, { epochs: 20 });
        expect(model.ok).toBe(true);
        expect(model.weights).toHaveLength(12);
    });

    test('apply mode reorders articles while shadow mode leaves order unchanged', () => {
        const articles = [
            { uid: 'low', title: 'Unrelated cell model', abstract: '', citationCount: 1, year: 1990 },
            { uid: 'high', title: 'ARDS low tidal volume randomized trial', abstract: 'ARDS mortality trial', citationCount: 3000, year: 2000, _pinnedLandmark: true, pubtype: ['Randomized Controlled Trial'] },
        ];
        const shadowOnly = applyShadowRankerRollout(articles, { query: 'ARDS low tidal volume trial', mode: 'shadow' });
        expect(shadowOnly.articles.map((article) => article.uid)).toEqual(['low', 'high']);
        expect(shadowOnly.shadowRanker.applied).toBe(false);

        const applied = applyShadowRankerRollout(articles, { query: 'ARDS low tidal volume trial', mode: 'apply' });
        expect(applied.articles[0].uid).toBe('high');
        expect(applied.shadowRanker.applied).toBe(true);
        expect(applied.shadowRanker.agreement.top1Changed).toBe(true);
    });
});
