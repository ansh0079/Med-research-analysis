'use strict';

const crypto = require('crypto');

/**
 * Stable concept identifier for a quiz question: deterministic hash of
 * (topic, questionType, first 100 chars of question text) — or, if a
 * verified claim backs the question, (topic, claim) so paraphrased
 * regenerations of the same claim still collapse to one identity.
 *
 * Must stay byte-for-byte identical to whatever recordQuizAttempt uses when
 * an attempt is stored, since collectiveMemoryService's per-item p-value/
 * discrimination aggregation and adaptiveItemSelectionService's item lookup
 * both key off this same hash to join cached question content to its
 * accumulated attempt history.
 */
function computeConceptHash({ normalizedTopic, questionType, questionText, claimKey }) {
    const seed = claimKey
        ? `${normalizedTopic}|claim|${claimKey}`
        : `${normalizedTopic}|${questionType || ''}|${String(questionText || '').slice(0, 100)}`;
    return crypto.createHash('sha256').update(seed).digest('hex').slice(0, 32);
}

module.exports = { computeConceptHash };
