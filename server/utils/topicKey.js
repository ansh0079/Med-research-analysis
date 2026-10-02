'use strict';

// The one place topic strings become storage keys. Writers and readers that
// key the same data differently silently lose it: topic knowledge saved under
// the canonical "acute kidney injury" was looked up as "aki diagnosis", never
// found, and regenerated every hour. Anything that stores or reads by topic
// should go through these helpers.

const { expandNormalizedTopicKeys, resolveCanonicalNormalized } = require('./topicSynonyms');

/** Case/punctuation-insensitive form. Safe for exact-query keys (search caches). */
function normalizeTopic(topic) {
    return String(topic || '')
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 180);
}

/**
 * The synonym cluster's anchor ("AKI diagnosis" -> "acute kidney injury").
 * Deliberately lossy: use it to group topic-level knowledge and learning
 * signals, never to key search results, which differ by qualifier.
 */
function canonicalTopic(topic) {
    return resolveCanonicalNormalized(topic, normalizeTopic) || normalizeTopic(topic);
}

/** Every normalized key a topic's signals may have been recorded under, itself first. */
function topicGroupKeys(topic) {
    const normalized = normalizeTopic(topic);
    if (!normalized) return [];
    return [...new Set([normalized, ...expandNormalizedTopicKeys(normalized, normalizeTopic)])].filter(Boolean);
}

module.exports = { normalizeTopic, canonicalTopic, topicGroupKeys };
