/**
 * Shared multi-source article fetch used by GET /api/search and case-analysis evidence gathering.
 * @param {import('../utils/fetch').safeFetch} fetch
 */

const { normalizePmid } = require('../utils/articleKeys');
const { articleFromOpenAlexWork } = require('./unifiedEvidenceSearch/openAlexMapper');
const { fetchUnifiedEvidence } = require('./unifiedEvidenceSearch/fetchOrchestrator');
const { mergeAndRank } = require('./unifiedEvidenceSearch/rrfFusion');
const { getEbmScore, isPreprint } = require('./unifiedEvidenceSearch/ebmScoring');
const {
    collapseNearDuplicateTitles,
    dedupeKey,
    normalizeDoi,
} = require('./unifiedEvidenceSearch/articleDedupe');
const {
    CLINICAL_QUERY_ALIAS_RULES,
    DATA_DRIVEN_ALIAS_RULES,
    ALL_CLINICAL_QUERY_ALIAS_RULES,
    clinicalQueryAliases,
    clinicalQueryPinnedPmids,
    buildPubMedSearchQuery,
} = require('./unifiedEvidenceSearch/clinicalQueryPubmed');
const {
    appendPubMedPublicationFilters,
    publicationTypeClause,
    SPECIFICITY_PUB_TYPE_FILTERS,
} = require('./unifiedEvidenceSearch/pubmedFilters');
const { decomposePico } = require('./unifiedEvidenceSearch/llmQueryIntelligence');

module.exports = {
    articleFromOpenAlexWork,
    fetchUnifiedEvidence,
    mergeAndRank,
    getEbmScore,
    isPreprint,
    collapseNearDuplicateTitles,
    dedupeKey,
    normalizePmid,
    normalizeDoi,
    clinicalQueryAliases,
    clinicalQueryPinnedPmids,
    CLINICAL_QUERY_ALIAS_RULES,
    DATA_DRIVEN_ALIAS_RULES,
    ALL_CLINICAL_QUERY_ALIAS_RULES,
    buildPubMedSearchQuery,
    appendPubMedPublicationFilters,
    publicationTypeClause,
    SPECIFICITY_PUB_TYPE_FILTERS,
    decomposePico,
};
