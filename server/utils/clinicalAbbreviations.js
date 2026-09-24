'use strict';

const { TOPIC_SYNONYM_GROUPS } = require('./topicSynonyms');

/**
 * Short tokens that carry clinical meaning and must survive term extraction.
 *
 * Topic term extraction kept only tokens of four letters or more, to drop
 * function words. That silently removed the most discriminating word in the way
 * clinicians actually search. Measured on production: "aki diagnosis and
 * management" reduced to ["diagnosis"] — "aki" too short, "management" a stop
 * word — and retrieval returned cardiac amyloidosis, hepatorenal syndrome and
 * syphilis, with no AKI content at all. "ckd management" reduced to [] and had
 * nothing to search on.
 *
 * The four-letter floor stays, because it is what keeps function words out.
 * Short tokens are admitted only when they appear here, so the fix adds no
 * noise. Extend the list rather than lowering the floor.
 */
const CURATED_ABBREVIATIONS = [
    // renal
    'aki', 'ckd', 'esrd', 'rrt', 'uti', 'gn', 'nsaid',
    // cardiac
    'af', 'mi', 'hf', 'chf', 'acs', 'cad', 'htn', 'pci', 'cabg', 'ecg', 'ekg', 'lvef', 'svt', 'vt',
    // respiratory
    'pe', 'copd', 'ild', 'osa', 'ards', 'cap', 'hap', 'vap', 'tb', 'niv',
    // neuro
    'tia', 'ich', 'sah', 'ms', 'gbs', 'msa',
    // vascular / haem
    'dvt', 'vte', 'itp', 'ttp', 'dic', 'cml', 'cll', 'aml', 'all', 'mgus', 'hit',
    // endocrine / metabolic
    'dka', 'hhs', 'dm', 't1dm', 't2dm', 'gdm', 'pcos', 'sglt2', 'glp', 'tsh',
    // gastro / hepatic
    'ibd', 'ibs', 'gord', 'gerd', 'nafld', 'nash', 'hcc', 'sbp', 'ercp',
    // rheum / immune
    'ra', 'sle', 'aps', 'gca', 'pmr', 'axspa', 'psa',
    // infection
    'hiv', 'hbv', 'hcv', 'cmv', 'ebv', 'mrsa', 'vre', 'cdi', 'pjp', 'sti', 'pid',
    // obstetric / other
    'pph', 'iugr', 'icu', 'ed', 'cpr', 'ckmb', 'bmi', 'crp', 'esr', 'bnp', 'inr',
];

/**
 * 'all' is a leukaemia and also the English word, 'ms' is multiple sclerosis and
 * a unit, 'ed' is the emergency department and a suffix. They stay in, because a
 * missing discriminating term costs a whole result set while a spurious one is
 * ranked away by the scorer that follows.
 */
const CLINICAL_ABBREVIATIONS = new Set([
    ...CURATED_ABBREVIATIONS,
    // Every short key already curated as a synonym group is clinical by construction.
    ...TOPIC_SYNONYM_GROUPS.flat().filter((term) => /^[a-z0-9-]{2,3}$/.test(term)),
]);

/** @returns {boolean} true when a token below the length floor should be kept. */
function isClinicalAbbreviation(token) {
    return CLINICAL_ABBREVIATIONS.has(String(token || '').toLowerCase());
}

module.exports = { CLINICAL_ABBREVIATIONS, isClinicalAbbreviation };
