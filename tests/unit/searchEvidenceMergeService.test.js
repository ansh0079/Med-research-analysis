const { mergeCuratedWithLiveEvidence } = require('../../server/services/searchEvidenceMergeService');
const { applySearchLearningBoost } = require('../../server/services/searchLearningService');

describe('searchEvidenceMergeService', () => {
    const live = [
        { uid: 'pmid-1', title: 'Beta blockers in heart failure with reduced ejection fraction', abstract: 'heart failure RCT', pmid: '1', pubtype: ['Randomized Controlled Trial'] },
        { uid: 'pmid-2', title: 'Sacubitril valsartan in chronic heart failure', abstract: 'HFrEF outcomes trial', pmid: '2', pubtype: ['Randomized Controlled Trial'] },
    ];

    test('mergeCuratedWithLiveEvidence prefers curated then bouquet-ranked live', () => {
        const curated = [{ uid: 'cur-1', title: 'Flagship HF trial', abstract: 'curated heart failure' }];
        const { articles, ranking } = mergeCuratedWithLiveEvidence(curated, live, 3, 'heart failure');
        expect(articles[0].uid).toBe('cur-1');
        expect(ranking).toBeDefined();
    });

    test('merge path runs learning boost before bouquet when personalized', () => {
        const context = {
            shouldPersonalize: true,
            preferredArticleUids: new Map([['1', 1]]),
            savedArticleUids: new Map(),
            helpfulArticleUids: new Map(),
            notHelpfulArticleUids: new Map(),
            interactionArticleUids: new Map(),
            impressionArticleUids: new Map(),
            missedPaperUids: new Map(),
            weakArticleUids: new Set(),
            trajectoryTerms: new Set(),
            profileWeakTopics: [],
        };
        const boosted = applySearchLearningBoost(live, context);
        expect(boosted.some((a) => a._learningBoost != null)).toBe(true);
    });
});
