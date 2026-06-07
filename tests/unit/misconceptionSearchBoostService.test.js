const {
    misconceptionArticleBoost,
    phraseOverlapScore,
} = require('../../server/services/misconceptionSearchBoostService');

describe('misconceptionSearchBoostService', () => {
    test('phraseOverlapScore detects shared tokens', () => {
        const score = phraseOverlapScore(
            'Extracorporeal carbon dioxide removal for COPD exacerbation',
            ['carbon dioxide removal mortality benefit']
        );
        expect(score).toBeGreaterThan(0);
    });

    test('misconceptionArticleBoost promotes corrective papers', () => {
        const boost = misconceptionArticleBoost(
            { uid: 'pmid-1', title: 'COPD trial', abstract: 'Carbon dioxide removal study' },
            {
                correctiveArticleUids: new Map([['pmid-1', 1.2]]),
                misconceptionPhrases: ['Do not overclaim mortality benefit'],
                weakClaimKeys: new Set(),
                dangerousClaimKeys: new Set(),
            },
            { misconception: 2 }
        );
        expect(boost).toBeGreaterThan(1);
    });
});
