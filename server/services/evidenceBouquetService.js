// ==========================================
// Evidence Bouquet 2.0 — facade
// Multi-factor ranking with archetype-aware selection
// ==========================================

const { MECHANISM_QUERY_PATTERNS } = require('./evidenceBouquet/constants');
const { isPredatoryJournal } = require('./evidenceBouquet/journalQuality');
const {
    getCitationCount,
    hasCitationData,
    getYear,
    isRCT,
    isPreclinical,
    isGroundbreakingBasicScience,
} = require('./evidenceBouquet/articleClassifiers');
const { classifyArchetype, mapStudyTypesToArchetypes } = require('./evidenceBouquet/archetype');
const { computeCompositeScore } = require('./evidenceBouquet/compositeScore');
const {
    matchesPopulationFilter,
    meshRelevanceRatio,
    queryMatchScore,
    queryAliasMatchScore,
    isOffTopic,
} = require('./evidenceBouquet/queryRelevance');
const {
    classifyQueryIntent,
    intentToPreferredArchetypes,
    intentArchetypeBias,
    topicalMatchWeight,
    intentRecencyAdjustment,
} = require('./evidenceBouquet/queryIntent');
const { buildEvidenceBouquet } = require('./evidenceBouquet/bouquetBuilder');

module.exports = {
    buildEvidenceBouquet,
    computeCompositeScore,
    classifyArchetype,
    getCitationCount,
    hasCitationData,
    getYear,
    isOffTopic,
    matchesPopulationFilter,
    meshRelevanceRatio,
    queryMatchScore,
    queryAliasMatchScore,
    isPreclinical,
    isGroundbreakingBasicScience,
    isPredatoryJournal,
    isRCT,
    MECHANISM_QUERY_PATTERNS,
    mapStudyTypesToArchetypes,
    classifyQueryIntent,
    intentToPreferredArchetypes,
    intentArchetypeBias,
    topicalMatchWeight,
    intentRecencyAdjustment,
};
