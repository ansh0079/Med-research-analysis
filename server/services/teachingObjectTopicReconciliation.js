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

    const classify = (input) => {
        const key = matchKey(input, normalize);
        if (!key) return null;
        const exact = [...new Map(
            variants.filter((candidate) => candidate.key === key)
                .map((candidate) => [candidate.item.topic, candidate]),
        ).values()];
        if (exact.length === 1) {
            return {
                item: exact[0].item,
                matchType: matchKey(exact[0].item.topic, normalize) === key ? 'canonical_exact' : 'alias_exact',
                confidence: 1,
                reviewRequired: false,
            };
        }
        if (exact.length > 1) {
            return {
                item: null,
                candidates: exact.map((candidate) => candidate.item),
                matchType: 'ambiguous_exact',
                confidence: 0,
                reviewRequired: true,
            };
        }

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
        if (ranked[1] && ranked[0][1] - ranked[1][1] < 0.05) {
            return {
                item: null,
                candidates: ranked.slice(0, 3).map(([item]) => item),
                matchType: 'ambiguous_fuzzy',
                confidence: ranked[0][1],
                reviewRequired: true,
            };
        }
        return {
            item: ranked[0][0],
            matchType: 'fuzzy_suggestion',
            confidence: ranked[0][1],
            reviewRequired: true,
        };
    };

    const match = (input) => {
        const result = classify(input);
        return result && !result.reviewRequired ? result.item : null;
    };
    match.classify = classify;
    match.suggest = (input) => classify(input)?.item || null;
    return match;
}

function canRegisterGeneratedTopic(topic, objectTypes, normalize) {
    if (![...objectTypes].some((type) => GENERATED_OBJECT_TYPES.has(type))) return false;
    if (/\b\d{6,}\b/.test(String(topic || ''))) return false;
    return matchKey(topic, normalize).split(' ').length >= 2;
}

async function resolveOrRegisterTopic(db, topic, objectTypes, flagshipMatcher, { registerMissing = false } = {}) {
    let topicId = await db.resolveCurriculumTopicId(topic).catch(() => null);
    if (topicId || !registerMissing) return { topicId, registered: false, matchedFlagship: false };

    const match = typeof flagshipMatcher?.classify === 'function'
        ? flagshipMatcher.classify(topic)
        : (() => {
            const item = flagshipMatcher(topic);
            return item ? { item, matchType: 'exact', confidence: 1, reviewRequired: false } : null;
        })();
    if (match?.reviewRequired) {
        return {
            topicId: null,
            registered: false,
            matchedFlagship: false,
            reviewRequired: true,
            suggestedTopic: match.item?.topic || null,
            matchType: match.matchType,
            confidence: match.confidence,
        };
    }
    const flagship = match?.item || null;
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
            seedStatus: 'not_seeded',
            sortOrder: 3000,
        });
        topicId = row?.id || null;
        registered = Boolean(topicId);
    }
    if (!topicId) return { topicId: null, registered: false, matchedFlagship: Boolean(flagship) };

    const aliases = new Set([topic, displayName]);
    const resolution = flagship ? 'orphan_reconciliation_exact' : 'orphan_reconciliation_identity';
    const confidence = flagship ? 0.95 : 1;
    for (const alias of aliases) {
        await db.recordTopicAlias(alias, topicId, resolution, confidence).catch(() => false);
    }
    return {
        topicId,
        registered,
        matchedFlagship: Boolean(flagship),
        reviewRequired: false,
        matchType: match?.matchType || 'identity',
        confidence,
    };
}

module.exports = {
    GENERATED_OBJECT_TYPES,
    matchKey,
    buildFlagshipMatcher,
    canRegisterGeneratedTopic,
    resolveOrRegisterTopic,
};
