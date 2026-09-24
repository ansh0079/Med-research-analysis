'use strict';

/**
 * Versioned query representation (Plan 2 §3 / §14.3).
 * Resolver output is recorded separately from ranking so eligibility stays replayable.
 */

const { classifyQueryIntent } = require('../evidenceBouquet/queryIntent');
const { resolveQuerySenses } = require('../../utils/conditionQuery');
const { queryPopulationCue, queryJurisdictionCue } = require('../../utils/queryScopeCues');

const QUERY_REPRESENTATION_VERSION = 1;

function buildQueryRepresentation(query, extras = {}) {
    const originalQuery = String(query || '');
    const senses = extras.senses || resolveQuerySenses(originalQuery);
    return {
        version: QUERY_REPRESENTATION_VERSION,
        originalQuery,
        intent: extras.intent || classifyQueryIntent(originalQuery),
        population: queryPopulationCue(originalQuery),
        jurisdiction: queryJurisdictionCue(originalQuery),
        intervention: extras.pico?.intervention || extras.intervention || null,
        ambiguity: senses.status || 'clear',
        assumedSenses: Array.isArray(senses.ambiguities) ? senses.ambiguities : [],
        aliases: Array.isArray(extras.aliases) ? extras.aliases.slice(0, 12) : [],
    };
}

module.exports = {
    QUERY_REPRESENTATION_VERSION,
    buildQueryRepresentation,
};
