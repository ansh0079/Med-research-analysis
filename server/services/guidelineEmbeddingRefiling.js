'use strict';

/**
 * Embedding-based re-filing of guideline recommendations.
 *
 * Problem 6 from the search review: coverage gaps looked like ranking faults.
 * 52 KDIGO recommendations sat in the structured corpus with none under any
 * AKI topic, because every retrieval fallback — exact keys, probe-word widening,
 * text-name probes — can only surface what a recommendation's own text names.
 * A rec about AKI filed under "contrast-induced nephropathy" whose text never
 * says "AKI" was unreachable by any query for AKI.
 *
 * This backfill closes that at write time, not query time:
 *   1. Each recommendation's text (topic + source body + recommendation) is
 *      embedded once.
 *   2. It is compared against one embedding per condition cluster
 *      (topicSynonyms TOPIC_SYNONYM_GROUPS -- AKI, sepsis, ACS, ...).
 *   3. If the best cosine similarity clears the threshold AND the row is not
 *      already reachable under that condition's keys, it is filed in
 *      topic_guideline_refiling under the cluster's canonical key.
 *
 * Query time (getGuidelinesByTopic) is then a constant-time side-table join
 * for the query's condition group -- no per-query vector scan -- and the
 * existing relevance scoring ranks whatever the join surfaces.
 *
 * One row per guideline: the single best condition, so a recommendation cannot
 * be re-filed into every sibling topic at once. Refiled rows bypass the
 * score > 0 floor at query time (not naming the condition literally is their
 * whole point) but stay in the same ranking, so a weak refiled rec still loses
 * to a strong literal match.
 */

const crypto = require('crypto');
const logger = require('../config/logger');
const { generateEmbedding } = require('../embeddings');
const { getEmbeddingOptions } = require('./embeddingOptions');
const { TOPIC_SYNONYM_GROUPS, resolveConditionGroupForTopic } = require('../utils/topicSynonyms');

const DEFAULT_SIMILARITY_THRESHOLD = 0.3;
const DEFAULT_BATCH_LIMIT = 200;

let conditionIndexCache = null;

function cosineSimilarity(a, b) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length === 0 || a.length !== b.length) return 0;
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i += 1) {
        const x = Number(a[i]) || 0;
        const y = Number(b[i]) || 0;
        dot += x * y;
        normA += x * x;
        normB += y * y;
    }
    if (!normA || !normB) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function textHash(text) {
    return crypto.createHash('sha1').update(String(text || '')).digest('hex');
}

function dehyphenate(value) {
    return String(value || '').replace(/-/g, ' ');
}

/**
 * One entry per condition cluster: the canonical (longest) normalized phrase
 * plus every synonym-group key, for reachable-under checks.
 */
function buildConditionIndexEntries(normalizeFn) {
    const normalize = typeof normalizeFn === 'function' ? normalizeFn : ((s) => String(s || '').toLowerCase().trim());
    return TOPIC_SYNONYM_GROUPS.map((group) => {
        const keys = [...new Set(group.map((g) => normalize(g)).filter(Boolean))];
        if (!keys.length) return null;
        const canonicalNormalized = keys.reduce((best, k) => (k.length > best.length ? k : best));
        return { canonicalNormalized, keys };
    }).filter(Boolean);
}

/**
 * Load (or build) the condition index: one embedding per cluster's canonical
 * phrase. Cached in module memory for the process lifetime; pass
 * { refresh: true } to rebuild.
 */
async function loadConditionIndex(serverConfig, { refresh = false, embedFn } = {}) {
    if (conditionIndexCache && !refresh) return conditionIndexCache;
    const embed = typeof embedFn === 'function' ? embedFn : (text) => generateEmbedding(text, getEmbeddingOptions(serverConfig));
    const entries = buildConditionIndexEntries();
    const index = [];
    for (const entry of entries) {
        index.push({ ...entry, embedding: await embed(entry.canonicalNormalized) });
    }
    conditionIndexCache = index;
    return index;
}

function clearConditionIndexCache() {
    conditionIndexCache = null;
}

/**
 * File one recommendation row against the condition index.
 * Exported for tests.
 *
 * @returns {Promise<{canonicalNormalized: string, similarity: number}|null>}
 */
async function fileRecommendationRow(row, conditionIndex, { embedFn, threshold } = {}) {
    const text = `${row.topic || ''}. ${row.source_body || ''}. ${row.recommendation_text || ''}`.trim();
    if (!text || text.length < 20) return null;
    const embed = typeof embedFn === 'function' ? embedFn : ((t) => generateEmbedding(t, {}));
    const rowEmbedding = await embed(text);
    if (!Array.isArray(rowEmbedding) || !rowEmbedding.length) return null;

    let best = null;
    for (const condition of conditionIndex) {
        const similarity = cosineSimilarity(rowEmbedding, condition.embedding);
        if (!best || similarity > best.similarity) {
            best = { canonicalNormalized: condition.canonicalNormalized, similarity, keys: condition.keys };
        }
    }
    if (!best || best.similarity < threshold) return null;
    // Already reachable under this condition's keys — re-filing adds nothing.
    const rowKey = dehyphenate(row.normalized_topic || '');
    if (best.keys.some((k) => dehyphenate(k) === rowKey)) return null;
    return { canonicalNormalized: best.canonicalNormalized, similarity: best.similarity };
}

/**
 * Backfill a bounded batch of recommendations. Re-runnable: rows whose text is
 * unchanged (same embedded_text_hash) are skipped, so a scheduled job can call
 * this on an interval and only new/changed rows pay for an embedding.
 *
 * @param {object} deps
 * @param {object} deps.db
 * @param {object} deps.serverConfig
 * @param {object} [deps.options]
 * @param {number} [deps.options.limit]
 * @param {number} [deps.options.offset]
 * @param {number} [deps.options.threshold]
 * @param {function} [deps.options.embedFn] - test injection
 * @param {object} [deps.log]
 */
async function backfillGuidelineRefiling({ db, serverConfig, options = {}, log = logger }) {
    const outcome = { scanned: 0, embedded: 0, refiled: 0, skippedUnchanged: 0, skippedBelowThreshold: 0, errors: 0, skipped: null };
    if (!db || typeof db.listGuidelineRefilingCandidates !== 'function') {
        outcome.skipped = 'no_db';
        return outcome;
    }
    if (!getEmbeddingOptions(serverConfig || {}).geminiKey && !getEmbeddingOptions(serverConfig || {}).openaiKey && typeof options.embedFn !== 'function') {
        outcome.skipped = 'no_embedding_key';
        return outcome;
    }
    const threshold = Math.min(0.99, Math.max(0, Number(options.threshold ?? DEFAULT_SIMILARITY_THRESHOLD) || DEFAULT_SIMILARITY_THRESHOLD));
    const limit = Math.min(Math.max(parseInt(String(options.limit ?? DEFAULT_BATCH_LIMIT), 10) || DEFAULT_BATCH_LIMIT, 1), 1000);
    const offset = Math.max(parseInt(String(options.offset ?? 0), 10) || 0, 0);

    let conditionIndex;
    try {
        conditionIndex = await loadConditionIndex(serverConfig, { refresh: Boolean(options.refreshIndex), embedFn: options.embedFn });
    } catch (err) {
        log.warn({ err }, 'guideline refiling: condition index embeddings failed');
        outcome.skipped = 'condition_index_failed';
        return outcome;
    }

    const candidates = await db.listGuidelineRefilingCandidates({ limit, offset });
    outcome.scanned = candidates.length;

    for (const row of candidates) {
        const text = `${row.topic || ''}. ${row.source_body || ''}. ${row.recommendation_text || ''}`.trim();
        const hash = textHash(text);
        if (row.refiling_hash && row.refiling_hash === hash) {
            outcome.skippedUnchanged += 1;
            continue;
        }
        try {
            const filing = await fileRecommendationRow(row, conditionIndex, { embedFn: options.embedFn, threshold });
            outcome.embedded += 1;
            if (!filing) {
                outcome.skippedBelowThreshold += 1;
                // Persist the negative result too, so the row is not re-embedded
                // every batch. canonical '' marks below-threshold.
                await db.upsertGuidelineRefiling({
                    guidelineId: row.id,
                    canonicalNormalized: '',
                    similarity: 0,
                    sourceTopicNormalized: row.normalized_topic || '',
                    textHash: hash,
                }).catch(() => false);
                continue;
            }
            outcome.refiled += 1;
            await db.upsertGuidelineRefiling({
                guidelineId: row.id,
                canonicalNormalized: filing.canonicalNormalized,
                similarity: filing.similarity,
                sourceTopicNormalized: row.normalized_topic || '',
                textHash: hash,
            });
        } catch (err) {
            outcome.errors += 1;
            log.warn({ err, guidelineId: row.id }, 'guideline refiling: row failed');
        }
    }
    return outcome;
}

/**
 * Resolve the condition group for a raw topic — the query-time counterpart of
 * the filing decision. Re-exported so callers do not import topicSynonyms twice.
 */
function conditionGroupForTopic(rawTopic, normalizeFn) {
    return resolveConditionGroupForTopic(rawTopic, normalizeFn);
}

module.exports = {
    backfillGuidelineRefiling,
    cosineSimilarity,
    textHash,
    buildConditionIndexEntries,
    loadConditionIndex,
    clearConditionIndexCache,
    fileRecommendationRow,
    conditionGroupForTopic,
    DEFAULT_SIMILARITY_THRESHOLD,
};
