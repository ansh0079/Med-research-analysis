/**
 * Offline personalization rubric — runs in CI without a live search server.
 */

const {
    applySearchLearningBoost,
    articleLearningBoost,
    collectTrajectoryTerms,
} = require('../../server/services/searchLearningService');
const { resolveClaimMasteryState } = require('../../server/services/claimRemediationService');
const { mergeCuratedWithLiveEvidence } = require('../../server/services/searchEvidenceMergeService');

const FIXTURES = [
    {
        name: 'trajectory terms boost heart-failure follow-up',
        query: 'heart failure',
        previousQueries: ['SGLT2 inhibitors heart failure'],
        articles: [
            { uid: 'pmid-1', title: 'Sacubitril in chronic heart failure', abstract: 'HFrEF trial', pmid: '1' },
            { uid: 'pmid-2', title: 'Unrelated nutrition survey', abstract: 'diet patterns', pmid: '2' },
        ],
        expectTopUid: 'pmid-1',
    },
    {
        name: 'saved article preference',
        query: 'sepsis',
        previousQueries: [],
        savedUid: 'pmid-9',
        articles: [
            { uid: 'pmid-8', title: 'Sepsis bundle compliance', abstract: 'hospital cohort', pmid: '8' },
            { uid: 'pmid-9', title: 'Early antibiotics in sepsis', abstract: 'RCT antibiotics timing', pmid: '9' },
        ],
        expectTopUid: 'pmid-9',
    },
];

function rankWithPersonalization(articles, query, { previousQueries = [], savedUid = null } = {}) {
    const context = {
        shouldPersonalize: true,
        preferredArticleUids: new Map(),
        savedArticleUids: savedUid ? new Map([[savedUid, 1]]) : new Map(),
        helpfulArticleUids: new Map(),
        notHelpfulArticleUids: new Map(),
        interactionArticleUids: new Map(),
        impressionArticleUids: new Map(),
        missedPaperUids: new Map(),
        weakArticleUids: new Set(),
        trajectoryTerms: collectTrajectoryTerms(previousQueries, []),
        profileWeakTopics: [],
    };
    return applySearchLearningBoost(articles, context);
}

describe('search personalization eval (offline)', () => {
    test('claim_gap signals force weak mastery over mastered quiz stats', () => {
        expect(resolveClaimMasteryState({ attempts: 10, correct: 9, gapSignals: 1 })).toBe('weak');
        expect(resolveClaimMasteryState({ attempts: 10, correct: 9, gapSignals: 0 })).toBe('mastered');
        expect(resolveClaimMasteryState({ attempts: 0, correct: 0, gapSignals: 2 })).toBe('weak');
    });

    for (const fixture of FIXTURES) {
        test(fixture.name, () => {
            const ranked = rankWithPersonalization(fixture.articles, fixture.query, {
                previousQueries: fixture.previousQueries,
                savedUid: fixture.savedUid,
            });
            expect(ranked[0]?.uid).toBe(fixture.expectTopUid);
        });
    }

    test('trajectory terms increase boost on matching titles', () => {
        const article = { uid: 'x', title: 'Beta blockers in heart failure', abstract: 'HFrEF', pmid: 'x' };
        const context = {
            shouldPersonalize: true,
            preferredArticleUids: new Map(),
            savedArticleUids: new Map(),
            helpfulArticleUids: new Map(),
            notHelpfulArticleUids: new Map(),
            interactionArticleUids: new Map(),
            impressionArticleUids: new Map(),
            missedPaperUids: new Map(),
            weakArticleUids: new Set(),
            trajectoryTerms: collectTrajectoryTerms(['SGLT2 inhibitors heart failure'], []),
            profileWeakTopics: [],
        };
        expect(articleLearningBoost(article, context)).toBeGreaterThan(0);
    });

    test('mergeCuratedWithLiveEvidence keeps curated sources first', () => {
        const curated = [{ uid: 'cur-1', title: 'Curated HF source', abstract: 'heart failure guidance' }];
        const live = [
            { uid: 'pmid-1', title: 'Heart failure beta blockers', abstract: 'RCT', pmid: '1', pubtype: ['Randomized Controlled Trial'] },
        ];
        const { articles } = mergeCuratedWithLiveEvidence(curated, live, 3, 'heart failure');
        expect(articles[0].uid).toBe('cur-1');
    });
});
