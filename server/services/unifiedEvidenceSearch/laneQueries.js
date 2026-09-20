'use strict';

/**
 * Per-lane PubMed queries. Lane membership is decided after retrieval, so a single
 * broad query can leave the guidelines or reviews lane empty even when PubMed holds
 * them. These queries fetch each evidence type directly, in parallel with the broad
 * query, and are merged and de-duplicated with it.
 *
 * Skipped when the caller already constrains publication type: an explicit study-type
 * filter or 'strict' specificity already narrows every query to those types.
 * `SEARCH_LANE_RETRIEVAL=off` is the kill switch (extra provider calls per search).
 */

const { appendPubMedPublicationFilters } = require('./pubmedFilters');

const LANE_PUBLICATION_TYPES = Object.freeze({
    guidelines: ['Practice Guideline', 'Guideline'],
    reviews: ['Systematic Review', 'Meta-Analysis'],
    landmark_trials: ['Randomized Controlled Trial'],
});

const MAX_LANE_RESULTS = 8;

function laneRetrievalEnabled(env = process.env) {
    return String(env.SEARCH_LANE_RETRIEVAL || 'on').toLowerCase() !== 'off';
}

function laneResultLimit(safeLimit) {
    const limit = Math.ceil((Number(safeLimit) || MAX_LANE_RESULTS * 2) / 2);
    return Math.max(3, Math.min(MAX_LANE_RESULTS, limit));
}

/** @returns {{ lane: string, query: string }[]} */
function buildLaneQueries(baseQuery, { specificity = 'moderate', parsedStudyTypes = [], parsedYearFilters = [], env = process.env } = {}) {
    if (!laneRetrievalEnabled(env)) return [];
    if (!String(baseQuery || '').trim()) return [];
    if (specificity === 'strict') return [];
    if (Array.isArray(parsedStudyTypes) && parsedStudyTypes.length > 0) return [];
    return Object.entries(LANE_PUBLICATION_TYPES).map(([lane, types]) => ({
        lane,
        query: appendPubMedPublicationFilters(baseQuery, 'moderate', types, parsedYearFilters),
    }));
}

module.exports = {
    LANE_PUBLICATION_TYPES,
    MAX_LANE_RESULTS,
    laneRetrievalEnabled,
    laneResultLimit,
    buildLaneQueries,
};
