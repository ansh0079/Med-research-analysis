'use strict';

const { buildEvidenceBouquet } = require('../../server/services/evidenceBouquet/bouquetBuilder');
const { applySearchLearningBoost } = require('../../server/services/search/searchLearningService');
const { annotateSearchRankMetadata } = require('../../server/services/search/searchPipeline');
const { orderArticlesByEvidenceRank } = require('../../server/services/search/evidenceLanes');

const QUERY = 'sglt2 inhibitors heart failure';

// One protected-tier RCT on top; the rest are cohort studies, the tier that
// personalisation guardrails allow to move (they never bury RCTs, SRs or guidelines).
function candidates() {
    return [
        { uid: 'pubmed-1', pmid: '1', title: 'SGLT2 inhibitors in heart failure with reduced ejection fraction', abstract: 'Randomized trial of SGLT2 inhibitors in heart failure.', year: 2019, citationCount: 4200, _ebmScore: 9, publicationTypes: ['Randomized Controlled Trial'] },
        { uid: 'pubmed-2', pmid: '2', title: 'SGLT2 inhibitor use in heart failure: a registry cohort', abstract: 'Registry cohort of SGLT2 inhibitor use in heart failure.', year: 2021, citationCount: 200, _ebmScore: 5, publicationTypes: ['Cohort Studies'] },
        { uid: 'pubmed-3', pmid: '3', title: 'SGLT2 inhibitors and heart failure: single-centre experience', abstract: 'Single-centre cohort of SGLT2 inhibitors in heart failure.', year: 2022, citationCount: 60, _ebmScore: 5, publicationTypes: ['Cohort Studies'] },
        { uid: 'pubmed-4', pmid: '4', title: 'Heart failure and SGLT2 inhibitor prescribing patterns', abstract: 'Cohort study of SGLT2 inhibitor use in heart failure.', year: 2020, citationCount: 40, _ebmScore: 5, publicationTypes: ['Cohort Studies'] },
    ];
}

function evidenceOrder(options = {}) {
    return buildEvidenceBouquet(candidates(), QUERY, { count: 10, selectionMode: 'relevance', ...options })
        .ranking.map((row) => row.uid || row.article?.uid);
}

describe('evidence rank is independent of learning signals', () => {
    test('teaching-object signal boosts passed to the bouquet do not change evidence order', () => {
        const plain = evidenceOrder();
        const withBoosts = evidenceOrder({
            articleSignalBoosts: new Map([['pubmed-4', 50], ['pubmed-1', -50]]),
        });
        expect(withBoosts).toEqual(plain);
    });

    test('personalisation reorders the learning list but never the served evidence order', () => {
        const bouquet = buildEvidenceBouquet(candidates(), QUERY, { count: 10, selectionMode: 'relevance' });
        const evidenceOnly = orderArticlesByEvidenceRank(
            annotateSearchRankMetadata(bouquet.topPapers, bouquet.ranking),
        ).map((a) => a.uid);

        const context = {
            shouldPersonalize: true,
            savedArticleUids: new Map([['pubmed-4', 9]]),
            preferredArticleUids: new Map([['pubmed-4', 9]]),
            helpfulArticleUids: new Map([['pubmed-4', 9]]),
        };
        const learned = applySearchLearningBoost(bouquet.topPapers, context, bouquet.ranking);
        const learningOrder = learned.map((a) => a.uid);
        const served = orderArticlesByEvidenceRank(annotateSearchRankMetadata(learned, bouquet.ranking))
            .map((a) => a.uid);

        expect(learningOrder).not.toEqual(evidenceOnly); // the learner signal did move something
        expect(served).toEqual(evidenceOnly);            // ...but not what is served as evidence rank
    });

    test('_evidenceRank values are identical with learning disabled and enabled', () => {
        const bouquet = buildEvidenceBouquet(candidates(), QUERY, { count: 10, selectionMode: 'relevance' });
        const ranksOf = (list) => Object.fromEntries(list.map((a) => [a.uid, a._evidenceRank]));
        const off = ranksOf(annotateSearchRankMetadata(bouquet.topPapers, bouquet.ranking));
        const learned = applySearchLearningBoost(bouquet.topPapers, {
            shouldPersonalize: true,
            savedArticleUids: new Map([['pubmed-4', 9]]),
        }, bouquet.ranking);
        const on = ranksOf(annotateSearchRankMetadata(learned, bouquet.ranking));
        expect(on).toEqual(off);
    });
});
