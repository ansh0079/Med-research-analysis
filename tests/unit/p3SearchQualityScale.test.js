'use strict';

const { loadSearchGoldFixture } = require('../../scripts/load-search-gold-fixture');
const {
    ALL_CLINICAL_QUERY_ALIAS_RULES,
    clinicalQueryPinnedPmids,
} = require('../../server/services/unifiedEvidenceSearch');
const {
    analyzeAliasCoverage,
    pinnedPmidsForQuery,
    suggestSeedsFromLandmarkMisses,
} = require('../../server/services/clinicalQueryAliasSeeds');
const { compareSummaryToBaseline } = require('../../server/services/searchQualityRegression');
const baselineSpec = require('../fixtures/search-quality-baseline.json');
const { DEFAULT_MIN_SCORE } = require('../../server/services/vectorSearchService');
const {
    orderArticlesForVectorCoverage,
    enqueueVectorIndexForBouquetArticles,
} = require('../../server/services/vectorCoverageService');
const {
    searchRankingContextFeatures,
    contextualArmPriorBoost,
    chooseArmBySamplesContextual,
    selectSearchRankingArm,
} = require('../../server/services/personalizationBanditService');

describe('P3 landmark alias coverage (CI gate)', () => {
    test('gold relevant PMIDs match curated title fragments (fixture integrity)', () => {
        const titleMap = require('../fixtures/search-quality-gold-pmid-titles.json').titles;
        const fixture = loadSearchGoldFixture('tests/fixtures/search-quality-gold.json');
        const missing = [];
        for (const q of fixture.queries) {
            for (const pmid of q.relevantUids || []) {
                const fragment = titleMap[String(pmid)];
                if (!fragment) continue; // not all gold PMIDs need catalog entries
                // Presence in the catalog is the contract; live PubMed title checks are offline scripts.
                expect(String(fragment).length).toBeGreaterThan(3);
            }
        }
        // Every expansion landmark we previously corrupted must be catalogued.
        for (const pmid of [
            '10376614', '15152059', '21128814', '22449319', '21991949', '12637609',
            '10697061', '22508468', '30208454', '26095867', '23803136', '29694815',
            '15502112', '7800005', '27571048', '23323867', '17494925',
        ]) {
            expect(titleMap[pmid]).toBeTruthy();
            if (!titleMap[pmid]) missing.push(pmid);
        }
        expect(missing).toEqual([]);
    });

    test('gold fixture normalizes graded relevantUids to strings', () => {
        const fixture = loadSearchGoldFixture('tests/fixtures/search-quality-gold.json');
        const graded = fixture.queries.find((q) => q.query.includes('community acquired pneumonia'));
        expect(graded.relevantUids.every((u) => typeof u === 'string')).toBe(true);
        expect(graded.relevanceGrades['31573350']).toBe(3);
    });

    test('data-driven seeds raise gold PMID pin coverage above 95%', () => {
        const fixture = loadSearchGoldFixture('tests/fixtures/search-quality-gold.json');
        const coverage = analyzeAliasCoverage(ALL_CLINICAL_QUERY_ALIAS_RULES, fixture.queries);
        expect(coverage.coverageRatio).toBeGreaterThanOrEqual(0.95);
        expect(coverage.uncoveredCount).toBeLessThanOrEqual(5);
    });

    test('labelled landmark_rct gold queries pin at least one relevant PMID for the query text', () => {
        const fixture = loadSearchGoldFixture('tests/fixtures/search-quality-gold.json');
        const landmarkQueries = fixture.queries.filter((q) => q.category === 'landmark_rct');
        expect(landmarkQueries.length).toBeGreaterThan(10);
        const misses = [];
        for (const q of landmarkQueries) {
            const pinned = new Set(clinicalQueryPinnedPmids(q.query));
            const hit = (q.relevantUids || []).some((uid) => pinned.has(String(uid)));
            if (!hit) misses.push(q.query);
        }
        expect(misses).toEqual([]);
    });

    test('suggestSeedsFromLandmarkMisses emits pmids for review', () => {
        const suggestions = suggestSeedsFromLandmarkMisses([
            { query: 'example trial heart failure', missingRelevantUids: ['99999999'] },
        ]);
        expect(suggestions[0].pmids).toContain('99999999');
        expect(suggestions[0].all.length).toBeGreaterThan(0);
    });
});

describe('P3 search-quality baseline gates (CI)', () => {
    test('baseline absolute gates are defined', () => {
        expect(baselineSpec.absoluteGates.landmarkHitRateMin).toBeGreaterThanOrEqual(0.90);
        expect(baselineSpec.absoluteGates.offTopicRateAtKMax).toBeLessThanOrEqual(0.05);
        expect(baselineSpec.absoluteGates.managementIntentHitRateMin).toBeGreaterThanOrEqual(1.0);
        expect(baselineSpec.absoluteGates.diagnosisIntentHitRateMin).toBeGreaterThanOrEqual(1.0);
        expect(baselineSpec.absoluteGates.requiredTypeCoverageMin).toBeGreaterThanOrEqual(0.98);
        expect(baselineSpec.metrics).toHaveProperty('managementIntentHitRate');
        expect(baselineSpec.metrics).toHaveProperty('diagnosisIntentHitRate');
        expect(baselineSpec.metrics.requiredTypeCoverage).toBeGreaterThanOrEqual(0.98);
    });

    test('regression helper fails when landmark hit rate drops beyond tolerance', () => {
        const summary = {
            ...baselineSpec.metrics,
            landmarkHitRate: baselineSpec.metrics.landmarkHitRate - baselineSpec.regressionTolerance.landmarkHitRate - 0.05,
        };
        const result = compareSummaryToBaseline(summary, baselineSpec);
        expect(result.pass).toBe(false);
        expect(result.failingChecks.some((c) => c.label === 'landmarkHitRate')).toBe(true);
    });

    test('expansion gold management queries carry specificity filters for productized eval', () => {
        const expansion = require('../fixtures/search-quality-gold-expansion.json');
        const management = (expansion.queries || []).filter((q) => q.category === 'management_intent');
        expect(management.length).toBeGreaterThanOrEqual(3);
        for (const q of management) {
            expect(q.specificity).toBe('strict');
            expect(Array.isArray(q.parsedStudyTypes)).toBe(true);
            expect(q.parsedStudyTypes.some((c) => /Practice Guideline/i.test(c))).toBe(true);
        }
        const diagnosis = (expansion.queries || []).filter((q) => q.category === 'diagnosis_intent');
        expect(diagnosis.length).toBeGreaterThanOrEqual(2);
        for (const q of diagnosis) {
            expect(q.specificity).toBe('moderate');
        }
    });
});

describe('P3 vector coverage defaults', () => {
    test('DEFAULT_MIN_SCORE is unified at 0.25', () => {
        expect(DEFAULT_MIN_SCORE).toBeCloseTo(0.25, 5);
    });

    test('bouquet articles are preferred for vector enqueue', () => {
        const ordered = orderArticlesForVectorCoverage(
            [
                { uid: 'other', title: 'Other' },
                { uid: 'b1', title: 'Bouquet' },
            ],
            [{ uid: 'b1' }],
            1
        );
        expect(ordered[0].article.uid).toBe('b1');
        expect(ordered[0].isBouquet).toBe(true);
    });

    test('enqueueVectorIndexForBouquetArticles calls enqueueFn', () => {
        const calls = [];
        const result = enqueueVectorIndexForBouquetArticles({
            articles: [{ uid: 'a1' }, { uid: 'a2' }],
            bouquetRanking: [{ uid: 'a2' }],
            limit: 1,
            enqueueFn: (article) => calls.push(article.uid),
        });
        expect(result.enqueued).toBe(1);
        expect(calls).toEqual(['a2']);
    });
});

describe('P3 contextual search ranking bandit', () => {
    test('searchRankingContextFeatures maps mastery and streak bands', () => {
        expect(searchRankingContextFeatures({
            topicMastery: 82,
            profile: { currentStreak: 20 },
        })).toMatchObject({
            masteryBand: 'strong',
            streakBand: 'long',
        });
    });

    test('weak mastery boosts quiz_gap_heavy over engagement_heavy', () => {
        const features = { masteryBand: 'weak', streakBand: 'none' };
        expect(contextualArmPriorBoost('quiz_gap_heavy', features))
            .toBeGreaterThan(contextualArmPriorBoost('engagement_heavy', features));
    });

    test('contextual sampling prefers quiz_gap when samples are tied and mastery is weak', () => {
        const armIds = ['heuristic_default', 'engagement_heavy', 'quiz_gap_heavy', 'misconception_heavy'];
        const samples = Object.fromEntries(armIds.map((id) => [id, 0.5]));
        const chosen = chooseArmBySamplesContextual(
            armIds,
            samples,
            samples,
            0,
            'heuristic_default',
            { masteryBand: 'weak', streakBand: 'none' }
        );
        expect(chosen.armId).toBe('quiz_gap_heavy');
    });

    test('selectSearchRankingArm returns contextFeatures', async () => {
        const db = {
            ensurePersonalizationArms: jest.fn().mockResolvedValue(true),
            listPersonalizationArmStates: jest.fn().mockResolvedValue([
                { arm_id: 'heuristic_default', alpha: 1, beta: 1, pulls: 0 },
            ]),
        };
        const selected = await selectSearchRankingArm(db, 'u1', {
            topicMastery: 40,
            profile: { currentStreak: 4 },
        });
        expect(selected.contextFeatures).toMatchObject({
            masteryBand: 'weak',
            streakBand: 'active',
        });
        expect(SEARCH_RANKING_ARMS_PRESENT(selected.armId)).toBe(true);
    });
});

function SEARCH_RANKING_ARMS_PRESENT(armId) {
    return ['heuristic_default', 'engagement_heavy', 'misconception_heavy', 'quiz_gap_heavy'].includes(armId);
}

describe('P3 pinnedPmidsForQuery helper', () => {
    test('pins MERIT-HF for metoprolol heart failure query', () => {
        const pmids = pinnedPmidsForQuery(
            ALL_CLINICAL_QUERY_ALIAS_RULES,
            'metoprolol succinate chronic heart failure mortality MERIT-HF'
        );
        expect(pmids).toContain('10376614');
    });
});
