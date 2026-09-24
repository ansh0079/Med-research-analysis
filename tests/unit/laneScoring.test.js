'use strict';

/**
 * Lane-specific scoring (v2): explicit features per lane, missing metadata treated as missing rather
 * than negative, freshness rules by evidence type, and citation counts as prominence only.
 */

const {
    LANE_FEATURE_WEIGHTS,
    FRESHNESS_RULES,
    scoreArticleInLaneV2,
    rankLaneV2,
    laneCandidateContext,
    freshness,
} = require('../../server/services/search/laneScoring');
const { rankArticlesWithinLanes, laneRankingMode, laneShadowSummary } = require('../../server/services/search/evidenceLanes');

const NOW = new Date('2026-09-20T00:00:00Z');
const ctx = (over = {}) => ({ query: 'heart failure treatment', now: NOW, ...over });

const article = (over = {}) => ({
    uid: over.uid || 'pubmed-1',
    title: 'Treatment of heart failure',
    year: 2024,
    _evidenceRank: 1,
    ...over,
});

const score = (over, lane = 'supporting', c = ctx(), pool = { maxRank: 4, citationPool: [] }) => scoreArticleInLaneV2(article(over), lane, c, pool);

describe('features are weighted explicitly, and missing ones are renormalised away', () => {
    test('each lane weights the features that matter for its question, summing to 1', () => {
        for (const [lane, weights] of Object.entries(LANE_FEATURE_WEIGHTS)) {
            const total = Object.values(weights).reduce((a, b) => a + b, 0);
            expect(total).toBeCloseTo(1, 6);
            expect(weights.topical).toBeGreaterThan(0); // relevance always counts
            expect(lane).toBeTruthy();
        }
        expect(LANE_FEATURE_WEIGHTS.guidelines.population_fit).toBeGreaterThan(0);
        expect(LANE_FEATURE_WEIGHTS.guidelines.jurisdiction_fit).toBeGreaterThan(0);
        expect(LANE_FEATURE_WEIGHTS.guidelines.citation_prominence).toBeUndefined(); // prominence is not evidence for a guideline
    });

    test('a missing feature is listed, excluded, and lowers coverage rather than the score', () => {
        const withYear = score({ year: 2024, pubtype: ['Randomized Controlled Trial'] }, 'supporting');
        const noYear = score({ year: undefined, pubdate: undefined, pubtype: ['Randomized Controlled Trial'] }, 'supporting');
        expect(withYear.trace.missing).not.toContain('freshness');
        expect(noYear.trace.missing).toContain('freshness');
        expect(noYear.trace.coverage).toBeLessThan(withYear.trace.coverage);
        // The undated article is not punished for the absent year: it scores the same on what is known.
        expect(noYear.score).toBeGreaterThanOrEqual(withYear.score);
    });

    test('an article with no metadata at all scores on relevance alone, not zero', () => {
        const bare = scoreArticleInLaneV2(
            { uid: 'x', title: 'Treatment of heart failure', _evidenceRank: 1 }, 'supporting', ctx(), { maxRank: 4, citationPool: [] },
        );
        expect(bare.trace.features.topical).toBe(1);
        expect(bare.score).toBeGreaterThan(0);
        expect(bare.trace.missing).toEqual(expect.arrayContaining(['design', 'freshness', 'citation_prominence']));
    });

    test('the trace explains the placement and names the version', () => {
        const s = score({ _guidelineRegistryMatch: true, pubtype: ['Practice Guideline'], title: 'ESC heart failure guideline' }, 'guidelines');
        expect(s.trace.version).toBe(2);
        expect(s.trace.reasons).toEqual(expect.arrayContaining(['Verified registry guideline']));
        expect(Object.keys(s.trace.weights)).toEqual(Object.keys(LANE_FEATURE_WEIGHTS.guidelines));
    });
});

describe('freshness is decided per evidence type, not by one fixed year cutoff', () => {
    test('a guideline edition decays with age; a defining trial keeps a high floor', () => {
        const old = { year: 2006 };
        expect(freshness(old, 'guidelines', NOW)).toBeLessThan(0.5);
        expect(freshness(old, 'landmark_trials', NOW)).toBeGreaterThanOrEqual(FRESHNESS_RULES.landmark_trials.floor);
        expect(freshness({ year: 2024 }, 'guidelines', NOW)).toBe(1);
    });

    test('an old but still relevant trial is not rejected for its age', () => {
        const ranked = rankLaneV2([
            article({ uid: 'landmark-1988', year: 1988, title: 'Enalapril in severe heart failure', pubtype: ['Randomized Controlled Trial'], citationCount: 9000, _evidenceRank: 2 }),
            article({ uid: 'recent-weak', year: 2025, title: 'Heart failure registry report', pubtype: ['Cohort Studies'], citationCount: 3, _evidenceRank: 1 }),
        ], 'landmark_trials', ctx());
        expect(ranked[0].uid).toBe('landmark-1988');
        expect(ranked[0]._laneTrace.features.freshness).toBeGreaterThanOrEqual(FRESHNESS_RULES.landmark_trials.floor);
    });

    test('an undated article is missing freshness, never treated as ancient', () => {
        expect(freshness({}, 'reviews', NOW)).toBeNull();
    });
});

describe('the features each lane actually uses', () => {
    test('guidelines: registry verification, edition, population and jurisdiction fit, authority', () => {
        const c = ctx({ query: 'heart failure treatment in pregnancy', population: 'pregnancy', jurisdiction: 'uk' });
        const matching = score({
            title: 'NICE guideline: heart failure in pregnancy', abstract: 'Recommendations for pregnant women.',
            pubtype: ['Practice Guideline'], _guidelineRegistryMatch: true, year: 2024,
        }, 'guidelines', c);
        const mismatched = score({
            uid: 'pubmed-2', title: 'ESC guideline: heart failure in adults', abstract: 'Recommendations for adults.',
            pubtype: ['Practice Guideline'], year: 2014,
        }, 'guidelines', c);
        expect(matching.trace.features).toMatchObject({ registry_verified: 1, population_fit: 1, jurisdiction_fit: 1, authority: 1 });
        expect(mismatched.trace.features.population_fit).toBe(0);
        expect(matching.score).toBeGreaterThan(mismatched.score);
        expect(matching.trace.reasons).toEqual(expect.arrayContaining(['Matches the queried population']));
    });

    test('population and jurisdiction are missing, not zero, when the query or the article does not state them', () => {
        const noCue = score({ pubtype: ['Practice Guideline'], title: 'Heart failure guideline' }, 'guidelines', ctx());
        expect(noCue.trace.missing).toEqual(expect.arrayContaining(['population_fit', 'jurisdiction_fit']));
        const noStatement = score({ pubtype: ['Practice Guideline'], title: 'Heart failure guideline', abstract: 'General advice.' }, 'guidelines', ctx({ population: 'paediatric' }));
        expect(noStatement.trace.missing).toContain('population_fit');
    });

    test('reviews: a systematic review with meta-analysis outranks a narrative review of the same age', () => {
        const ranked = rankLaneV2([
            article({ uid: 'narrative', title: 'Heart failure: a review', pubtype: ['Review'], _evidenceRank: 1 }),
            article({ uid: 'sr-ma', title: 'Heart failure treatment: a systematic review and meta-analysis', pubtype: ['Systematic Review', 'Meta-Analysis'], _evidenceRank: 2 }),
        ], 'reviews', ctx());
        expect(ranked[0].uid).toBe('sr-ma');
        expect(ranked[0]._laneTrace.features.design).toBe(1);
    });

    test('methodological quality is missing until a real risk-of-bias signal exists: it is never inferred from citations', () => {
        const s = score({ citationCount: 5000, pubtype: ['Systematic Review'] }, 'reviews');
        expect(s.trace.missing).toContain('methodological_quality');
        const withSignal = score({ pubtype: ['Systematic Review'], _riskOfBiasScore: 0.9 }, 'reviews');
        expect(withSignal.trace.features.methodological_quality).toBe(0.9);
    });

    test('citation prominence is a percentile among comparable articles, and only in the lanes that use it', () => {
        const pool = { citationPool: [1, 10, 100, 1000] };
        const high = scoreArticleInLaneV2(article({ citationCount: 1000 }), 'supporting', ctx(), pool);
        const low = scoreArticleInLaneV2(article({ citationCount: 1 }), 'supporting', ctx(), pool);
        expect(high.trace.features.citation_prominence).toBe(1);
        expect(low.trace.features.citation_prominence).toBe(0);
        expect(high.score).toBeGreaterThan(low.score);
        // A guideline is not ranked on how often it is cited.
        expect(scoreArticleInLaneV2(article({ citationCount: 1000 }), 'guidelines', ctx(), pool).trace.features.citation_prominence).toBeUndefined();
    });

    test('prominence alone cannot overturn a better study design: it is not evidence of quality', () => {
        const pool = { citationPool: [1, 10, 100, 5000] };
        const ranked = rankLaneV2([
            article({ uid: 'cited-cohort', title: 'Heart failure cohort', pubtype: ['Cohort Studies'], citationCount: 5000, _evidenceRank: 1 }),
            article({ uid: 'quiet-rct', title: 'Heart failure randomized trial', pubtype: ['Randomized Controlled Trial'], citationCount: 1, _evidenceRank: 1 }),
        ], 'supporting', ctx(), pool);
        expect(ranked[0].uid).toBe('quiet-rct');
    });

    test('an article with no citation data is missing prominence, not ranked as uncited', () => {
        const pool = { maxRank: 3, citationPool: [10, 100, 1000] };
        const unknown = scoreArticleInLaneV2(article({ citationCount: undefined }), 'supporting', ctx(), pool);
        const zero = scoreArticleInLaneV2(article({ citationCount: 0 }), 'supporting', ctx(), pool);
        expect(unknown.trace.missing).toContain('citation_prominence');
        expect(zero.trace.features.citation_prominence).toBe(0);
        expect(unknown.score).toBeGreaterThan(zero.score);
    });

    test('landmark: a curated pin outranks a higher-cited unpinned trial', () => {
        const ranked = rankLaneV2([
            article({ uid: 'cited', title: 'Heart failure trial', pubtype: ['Randomized Controlled Trial'], citationCount: 5000, _evidenceRank: 1 }),
            article({ uid: 'pinned', title: 'Heart failure landmark trial', pubtype: ['Randomized Controlled Trial'], citationCount: 50, _pinnedLandmark: true, _evidenceRank: 2 }),
        ], 'landmark_trials', ctx());
        expect(ranked[0].uid).toBe('pinned');
    });
});

describe('scores are a function of the article and the query only', () => {
    test('learning signals and teaching boosts do not change a lane score', () => {
        const plain = score({ pubtype: ['Randomized Controlled Trial'] }, 'supporting');
        const boosted = score({
            pubtype: ['Randomized Controlled Trial'],
            _learningBoost: 5, _learningRank: 1, _banditArmId: 'arm-x', _missedQuizCount: 4, _signalWeight: 9,
        }, 'supporting');
        expect(boosted.score).toBe(plain.score);
        expect(boosted.trace.features).toEqual(plain.trace.features);
    });

    test('ranking is deterministic and ties fall back to the global evidence rank', () => {
        const items = [
            article({ uid: 'b', _evidenceRank: 3, pubtype: ['Cohort Studies'] }),
            article({ uid: 'a', _evidenceRank: 2, pubtype: ['Cohort Studies'] }),
        ];
        const once = rankLaneV2(items, 'supporting', ctx()).map((a) => a.uid);
        expect(rankLaneV2(items, 'supporting', ctx()).map((a) => a.uid)).toEqual(once);
        expect(once).toEqual(['a', 'b']);
    });

    test('the citation pool holds only articles that actually report citations', () => {
        const pool = laneCandidateContext([
            article({ citationCount: 10 }), article({ citationCount: 100 }), article({ citationCount: undefined }),
        ]);
        expect(pool).toEqual({ citationPool: [10, 100] });
    });

    test('topical relevance measures the query, not the composite ranker output', () => {
        // Same rank, different topicality: the article that is actually about the query wins.
        const onTopic = score({ uid: 'a', title: 'Treatment of heart failure', _evidenceRank: 5 });
        const offTopic = score({ uid: 'b', title: 'Management of psoriasis', _evidenceRank: 5 });
        expect(onTopic.trace.features.topical).toBeGreaterThan(offTopic.trace.features.topical);

        // And the composite rank does not override it: a worse-ranked on-topic paper still reads
        // as more relevant than a better-ranked off-topic one.
        const wellRanked = score({ uid: 'c', title: 'Management of psoriasis', _evidenceRank: 1 });
        expect(onTopic.trace.features.topical).toBeGreaterThan(wellRanked.trace.features.topical);
    });

    test('a named trial counts as topical even when the query terms are absent from the text', () => {
        const c = ctx({ aliases: ['DAPA-HF'] });
        const byName = scoreArticleInLaneV2({ uid: 'a', title: 'DAPA-HF: primary results', _evidenceRank: 9 }, 'supporting', c, { citationPool: [] });
        expect(byName.trace.features.topical).toBe(1);
    });

    test('without a query, relevance falls back to rank decay, and lane size does not decide it', () => {
        const noQuery = { now: NOW };
        const at = (rank) => scoreArticleInLaneV2(article({ _evidenceRank: rank }), 'supporting', noQuery, { citationPool: [] }).trace.features.topical;
        expect(at(1)).toBe(1);
        expect(at(2)).toBeCloseTo(0.909, 3); // one position apart is nearly the same relevance
        expect(at(11)).toBe(0.5);
        expect(at(21)).toBeCloseTo(0.333, 3);
        // The same rank scores the same whether the lane holds two articles or twenty.
        const small = rankLaneV2([article({ uid: 'a', _evidenceRank: 1 }), article({ uid: 'b', _evidenceRank: 2 })], 'supporting', noQuery);
        const large = rankLaneV2(Array.from({ length: 20 }, (_, i) => article({ uid: `x${i}`, _evidenceRank: i + 1 })), 'supporting', noQuery);
        expect(small[0]._laneTrace.features.topical).toBe(large[0]._laneTrace.features.topical);
    });
});

describe('v2 is opt-in and comparable against what is served', () => {
    afterEach(() => { delete process.env.LANE_RANKING; });

    // Both editions are recent, so v1's year bonus cannot separate them; only v2 has a population feature.
    const candidates = () => [
        {
            uid: 'adult-guideline', title: 'ESC heart failure guideline', abstract: 'Recommendations for adults with heart failure.',
            pubtype: ['Practice Guideline'], year: 2024, _evidenceRank: 1, _evidenceLane: 'guidelines',
        },
        {
            uid: 'pregnancy-guideline', title: 'ESC guideline: heart failure in pregnancy', abstract: 'Recommendations for pregnant women with heart failure.',
            pubtype: ['Practice Guideline'], year: 2023, _evidenceRank: 2, _evidenceLane: 'guidelines',
        },
    ];
    const pregnancyQuery = { query: 'heart failure in pregnancy', population: 'pregnancy' };

    test('v1 is the default; the mode is read from LANE_RANKING', () => {
        expect(laneRankingMode({})).toBe('v1');
        expect(laneRankingMode({ LANE_RANKING: 'v2' })).toBe('v2');
        expect(laneRankingMode({ LANE_RANKING: 'shadow' })).toBe('shadow');
        expect(laneRankingMode({ LANE_RANKING: 'nonsense' })).toBe('v1');
    });

    test('v1 keeps the global rank order; v2 puts the guideline for the queried population first', () => {
        const v1 = rankArticlesWithinLanes(candidates(), { intent: 'guideline', laneRanking: 'v1' });
        expect(v1.map((a) => a.uid)).toEqual(['adult-guideline', 'pregnancy-guideline']);
        const v2 = rankArticlesWithinLanes(candidates(), { intent: 'guideline', laneRanking: 'v2', queryContext: pregnancyQuery });
        expect(v2.map((a) => a.uid)).toEqual(['pregnancy-guideline', 'adult-guideline']);
        expect(v2[0]._laneTrace.version).toBe(2);
        expect(v2[0]._laneTrace.features.population_fit).toBe(1);
        expect(v2[1]._laneTrace.features.population_fit).toBe(0);
    });

    test('shadow serves v1 and records what v2 would have done, without changing the order', () => {
        const shadow = rankArticlesWithinLanes(candidates(), { intent: 'guideline', laneRanking: 'shadow', queryContext: pregnancyQuery });
        expect(shadow.map((a) => a.uid)).toEqual(['adult-guideline', 'pregnancy-guideline']); // served order is still v1
        expect(shadow[0]._laneShadow).toMatchObject({ servedRank: 1, v2Rank: 2, rankDelta: 1 });
        expect(shadow[0]._laneShadow.trace.version).toBe(2);
        const summary = laneShadowSummary(shadow);
        expect(summary).toMatchObject({ compared: 2, moved: 2, maxDisplacement: 1, topChanged: ['guidelines'] });
    });

    test('there is no shadow comparison when the ranker is not in shadow mode', () => {
        const v1 = rankArticlesWithinLanes(candidates(), { intent: 'guideline', laneRanking: 'v1' });
        expect(v1[0]._laneShadow).toBeUndefined();
        expect(laneShadowSummary(v1)).toBeNull();
    });
});
