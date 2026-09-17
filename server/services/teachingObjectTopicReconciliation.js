'use strict';

const GENERATED_OBJECT_TYPES = new Set([
    'cold_start_mcq',
    'guideline_mcq',
    'guideline_summary',
    'topic_consensus',
]);

function matchKey(value, normalize) {
    return normalize(String(value || '').replace(/['’]s\b/gi, '').replace(/\bbarretts\b/gi, 'barrett'))
        .split(/\s+/)
        .filter((token) => token.length > 1 && !/^\d{6,}$/.test(token))
        .join(' ');
}

function buildFlagshipMatcher(topics, normalize) {
    const variants = [];
    for (const item of Array.isArray(topics) ? topics : []) {
        const values = [item.topic, ...(Array.isArray(item.aliases) ? item.aliases : [])];
        for (const value of values) {
            const key = matchKey(value, normalize);
            if (key) variants.push({ key, tokens: new Set(key.split(' ')), item });
        }
    }

    return (input) => {
        const key = matchKey(input, normalize);
        if (!key) return null;
        const exact = variants.find((candidate) => candidate.key === key);
        if (exact) return exact.item;

        const inputTokens = new Set(key.split(' '));
        const scores = new Map();
        for (const candidate of variants) {
            const intersection = [...candidate.tokens].filter((token) => inputTokens.has(token)).length;
            if (intersection < 2) continue;
            const candidateCoverage = intersection / candidate.tokens.size;
            const inputCoverage = intersection / inputTokens.size;
            if (candidateCoverage < 1 && inputCoverage < 0.8) continue;
            const score = candidateCoverage * 0.6 + inputCoverage * 0.4 + Math.min(intersection, 8) * 0.01;
            const previous = scores.get(candidate.item);
            if (previous === undefined || score > previous) scores.set(candidate.item, score);
        }
        const ranked = [...scores.entries()].sort((a, b) => b[1] - a[1]);
        if (!ranked.length || ranked[0][1] < 0.72) return null;
        if (ranked[1] && ranked[0][1] - ranked[1][1] < 0.05) return null;
        return ranked[0][0];
    };
}

function canRegisterGeneratedTopic(topic, objectTypes, normalize) {
    if (![...objectTypes].some((type) => GENERATED_OBJECT_TYPES.has(type))) return false;
    if (/\b\d{6,}\b/.test(String(topic || ''))) return false;
    return matchKey(topic, normalize).split(' ').length >= 2;
}

async function resolveOrRegisterTopic(db, topic, objectTypes, flagshipMatcher, { registerMissing = false } = {}) {
    let topicId = await db.resolveCurriculumTopicId(topic).catch(() => null);
    if (topicId || !registerMissing) return { topicId, registered: false, matchedFlagship: false };

    const flagship = flagshipMatcher(topic);
    const shouldRegister = flagship || canRegisterGeneratedTopic(topic, objectTypes, (value) => db.normalizeTopic(value));
    if (!shouldRegister) return { topicId: null, registered: false, matchedFlagship: false };

    const displayName = flagship?.topic || topic;
    topicId = await db.resolveCurriculumTopicId(displayName).catch(() => null);
    let registered = false;
    if (!topicId) {
        const row = await db.upsertCurriculumSeedTopic({
            displayName,
            suggestedQuery: flagship?.searchQueries?.[0] || displayName,
            block: flagship?.block || 'Recovered teaching topics',
            priority: flagship?.priority || 'medium',
            volatility: 'moderate',
            seedStatus: 'seeded_with_warnings',
            sortOrder: 3000,
        });
        topicId = row?.id || null;
        registered = Boolean(topicId);
    }
    if (!topicId) return { topicId: null, registered: false, matchedFlagship: Boolean(flagship) };

    const aliases = new Set([topic, displayName, ...(flagship?.aliases || [])]);
    for (const alias of aliases) {
        await db.recordTopicAlias(alias, topicId, 'orphan_reconciliation', flagship ? 0.9 : 0.75).catch(() => false);
    }
    return { topicId, registered, matchedFlagship: Boolean(flagship) };
}

module.exports = {
    GENERATED_OBJECT_TYPES,
    matchKey,
    buildFlagshipMatcher,
    canRegisterGeneratedTopic,
    resolveOrRegisterTopic,
};
