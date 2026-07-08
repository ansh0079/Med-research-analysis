'use strict';

function consensusEnrichmentJobKey(enrichmentKey) {
    return `consensus:${enrichmentKey}`;
}

function liveClinicalAnswerEnrichmentJobKey(enrichmentKey) {
    return `live-ca:${enrichmentKey}`;
}

module.exports = {
    consensusEnrichmentJobKey,
    liveClinicalAnswerEnrichmentJobKey,
};
