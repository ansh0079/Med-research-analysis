/**
 * Misconception Inference Service
 *
 * Transforms raw quiz-miss data (user_claim_misconceptions) into structured
 * misconception tags that can be injected into future learning interactions.
 *
 * Rules for inference:
 * - Same claimKey + same wrongOptionText >= 3 times → inferred misconception
 * - Same misconceptionCategory >= 3 times across different claims → category-level misconception
 * - Tags include: claimKey, description, count, category, firstSeenAt, lastSeenAt
 */

const logger = require('../config/logger');

const MIN_OCCURRENCES_FOR_TAG = 3;
const MAX_TAGS_PER_TOPIC = 5;

/**
 * Generate a human-readable tag description from claim data.
 */
function describeMisconception(claimKey, wrongOptionText, category) {
    const cleanWrong = String(wrongOptionText || '').slice(0, 120).trim();
    const cleanClaim = String(claimKey || '').replace(/^(ck-|claim-)/i, '').replace(/-/g, ' ').trim();

    if (category === 'pitfall') {
        return `Repeatedly selects "${cleanWrong}" for ${cleanClaim} — likely a clinical pitfall`;
    }
    if (category === 'guideline') {
        return `Consistently confuses guideline recommendation for ${cleanClaim}`;
    }
    if (category === 'mechanism') {
        return `Mechanism misunderstanding on ${cleanClaim}`;
    }
    if (category === 'trial_interpretation') {
        return `Misreads trial evidence for ${cleanClaim}`;
    }
    return `Struggles with ${cleanClaim}: repeatedly chooses "${cleanWrong}"`;
}

/**
 * Infer misconception tags from a user's claim misconception rows.
 *
 * @param {object[]} rows — output from db.getUserClaimMisconceptions
 * @returns {object[]} inferred tags
 */
function inferMisconceptionTags(rows) {
    if (!Array.isArray(rows) || rows.length === 0) {
        return [];
    }

    const byClaimAndWrong = new Map();
    const byCategory = new Map();

    for (const row of rows) {
        const key = `${row.claimKey}::${row.wrongOptionText}`;
        const existing = byClaimAndWrong.get(key);
        if (existing) {
            existing.count += row.count || 1;
            existing.lastSeenAt = row.lastSeenAt;
        } else {
            byClaimAndWrong.set(key, {
                claimKey: row.claimKey,
                wrongOptionText: row.wrongOptionText,
                correctOptionText: row.correctOptionText,
                misconceptionCategory: row.misconceptionCategory || 'general',
                count: row.count || 1,
                firstSeenAt: row.lastSeenAt,
                lastSeenAt: row.lastSeenAt,
            });
        }

        const cat = row.misconceptionCategory || 'general';
        const catEntry = byCategory.get(cat);
        if (catEntry) {
            catEntry.count += row.count || 1;
            catEntry.claimKeys.add(row.claimKey);
        } else {
            byCategory.set(cat, {
                category: cat,
                count: row.count || 1,
                claimKeys: new Set([row.claimKey]),
            });
        }
    }

    const tags = [];

    // Pattern 1: same claim + same wrong answer >= 3 times
    for (const entry of byClaimAndWrong.values()) {
        if (entry.count >= MIN_OCCURRENCES_FOR_TAG) {
            tags.push({
                tag: `claim:${entry.claimKey}`,
                claimKey: entry.claimKey,
                description: describeMisconception(entry.claimKey, entry.wrongOptionText, entry.misconceptionCategory),
                category: entry.misconceptionCategory,
                count: entry.count,
                pattern: 'repeated_wrong_answer',
                firstSeenAt: entry.firstSeenAt,
                lastSeenAt: entry.lastSeenAt,
            });
        }
    }

    // Pattern 2: same category >= 3 times across different claims
    for (const entry of byCategory.values()) {
        if (entry.count >= MIN_OCCURRENCES_FOR_TAG && entry.claimKeys.size >= 2) {
            const categoryTag = `category:${entry.category}`;
            // Only add if not already covered by a claim-level tag for the same category
            const hasClaimLevelForCategory = tags.some(
                (t) => t.category === entry.category && t.pattern === 'repeated_wrong_answer'
            );
            if (!hasClaimLevelForCategory) {
                tags.push({
                    tag: categoryTag,
                    claimKey: null,
                    description: `Broad weakness in ${entry.category} questions across ${entry.claimKeys.size} concepts`,
                    category: entry.category,
                    count: entry.count,
                    pattern: 'category_weakness',
                    firstSeenAt: null,
                    lastSeenAt: null,
                });
            }
        }
    }

    // Sort by count descending, then slice
    tags.sort((a, b) => b.count - a.count);
    return tags.slice(0, MAX_TAGS_PER_TOPIC);
}

/**
 * Fetch misconceptions for a user/topic and infer tags.
 *
 * @param {object} db
 * @param {string} userId
 * @param {string} topic
 * @param {object} [options]
 * @param {number} [options.lookbackLimit=12]
 * @returns {Promise<object[]>}
 */
async function getInferredMisconceptionsForTopic(db, userId, topic, { lookbackLimit = 12 } = {}) {
    if (!db || !userId || !topic || typeof db.getUserClaimMisconceptions !== 'function') {
        return [];
    }
    try {
        const rows = await db.getUserClaimMisconceptions(userId, topic, { limit: lookbackLimit });
        return inferMisconceptionTags(rows);
    } catch (err) {
        logger.warn({ err, userId, topic }, 'getInferredMisconceptionsForTopic failed');
        return [];
    }
}

/**
 * Persist inferred misconception tags to user_topic_memory.
 *
 * @param {object} db
 * @param {string} userId
 * @param {string} topic
 * @param {object} [options]
 * @param {number} [options.lookbackLimit=12]
 * @returns {Promise<object|null>}
 */
async function updateInferredMisconceptionsForTopic(db, userId, topic, { lookbackLimit = 12 } = {}) {
    if (!db || !userId || !topic) {
        return null;
    }
    const tags = await getInferredMisconceptionsForTopic(db, userId, topic, { lookbackLimit });
    if (typeof db.updateUserTopicMemoryMisconceptions === 'function') {
        try {
            return await db.updateUserTopicMemoryMisconceptions(userId, topic, tags);
        } catch (err) {
            logger.warn({ err, userId, topic }, 'updateUserTopicMemoryMisconceptions failed');
            return null;
        }
    }
    return null;
}

module.exports = {
    inferMisconceptionTags,
    getInferredMisconceptionsForTopic,
    updateInferredMisconceptionsForTopic,
    MIN_OCCURRENCES_FOR_TAG,
    MAX_TAGS_PER_TOPIC,
};
