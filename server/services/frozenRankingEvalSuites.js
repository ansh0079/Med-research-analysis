'use strict';

/**
 * The single list of suites that make up the frozen ranking eval. Both
 * `npm run eval:search-ranking` and the bandit promotion gate import this, so
 * they cannot drift into checking different things.
 */
const FROZEN_RANKING_SUITES = Object.freeze([
    'searchAbbreviationRanking',
    'searchRankingTune',
    'guidelineTopicFallback',
    'queryAnchorRelevance',
    'guidelineEmbeddingRefiling',
    'searchPhase0Ranking',
    'evidenceLanes',
    'evidenceRankInvariance',
    'evalDatasetPolicy',
    'guidelineRegistry',
    'laneRetrieval',
]);

const RANKING_TEST_PATTERN = FROZEN_RANKING_SUITES.join('|');

module.exports = { FROZEN_RANKING_SUITES, RANKING_TEST_PATTERN };
