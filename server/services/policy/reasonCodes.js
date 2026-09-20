'use strict';

/**
 * Versioned write-policy reason codes.
 * Codes are stable identifiers for replay; bump the suffix when the rule changes.
 */
const REASON_CODES = Object.freeze({
    SCHEMA_MISSING_ISSUER: 'schema.missing_issuer.v1',
    SCHEMA_MISSING_EDITION: 'schema.missing_edition_or_date.v1',
    SCHEMA_MISSING_PROVENANCE: 'schema.missing_provenance.v1',
    CONCEPT_UNRESOLVED: 'concept.unresolved.v1',
    CONCEPT_TASK_WORD_KEY: 'concept.task_word_key.v1',
    ITEM_FORM_CUED: 'item_form.cued_longest_option.v1',
    ITEM_FORM_NO_ANSWER: 'item_form.no_defensible_answer.v1',
    ENTAILMENT_UNSUPPORTED: 'entailment.unsupported.v1',
    IDENTITY_MISSING_SOURCE: 'identity.missing_source.v1',
    BRIDGE_SIMILARITY_INVALID: 'bridge.similarity_invalid.v1',
});

const TASK_WORD_KEYS = Object.freeze([
    'management', 'diagnosis', 'treatment', 'therapy', 'care', 'update',
    'review', 'guideline', 'guidelines', 'sg',
]);

module.exports = {
    REASON_CODES,
    TASK_WORD_KEYS,
};
