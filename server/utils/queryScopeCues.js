'use strict';

/**
 * Population / jurisdiction cues from a query.
 *
 * Thin adapter over the canonical vocabulary in services/clinical/clinicalFacts: this file used to
 * carry its own regexes, which could recognise a cue the article side could not. The legacy tag
 * names ('paediatric', 'adult', 'pregnancy') are preserved for stored query representations.
 */

const { queryFacts } = require('../services/clinical/clinicalFacts');

/** Canonical population tags collapsed to the three the query representation has always used. */
const LEGACY_TAG = {
    neonatal: 'paediatric',
    infant: 'paediatric',
    child: 'paediatric',
    adolescent: 'paediatric',
    adult: 'adult',
    older_adult: 'adult',
    pregnancy: 'pregnancy',
    renal_impairment: 'renal_impairment',
    dialysis: 'dialysis',
    hepatic_impairment: 'hepatic_impairment',
};

function queryPopulationCue(query) {
    const { populations } = queryFacts(query);
    // Pregnancy wins over a generic adult mention: "heart failure in pregnancy in adults" is a
    // pregnancy question. Paediatric and organ-impairment scopes likewise beat an incidental "adults" arm.
    for (const preferred of ['pregnancy', 'paediatric', 'dialysis', 'renal_impairment', 'hepatic_impairment', 'adult']) {
        if (populations.some((tag) => LEGACY_TAG[tag] === preferred)) return preferred;
    }
    return null;
}

function queryJurisdictionCue(query) {
    return queryFacts(query).jurisdiction;
}

module.exports = {
    queryPopulationCue,
    queryJurisdictionCue,
};
