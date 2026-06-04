/**
 * Map agent-detected misconceptions to teaching claims and surface gaps in retrieval.
 */

const logger = require('../config/logger');

function resolveClaimMasteryState({ attempts = 0, correct = 0, gapSignals = 0 } = {}) {
    const gap = Number(gapSignals || 0);
    const n = Number(attempts || 0);
    const c = Number(correct || 0);
    if (gap > 0) return 'weak';
    if (n === 0) return 'untested';
    return c / Math.max(1, n) >= 0.8 ? 'mastered' : 'weak';
}

function tokenize(text) {
    return String(text || '')
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 4);
}

function overlapScore(needle, haystack) {
    const words = tokenize(needle);
    if (words.length === 0) return 0;
    const blob = String(haystack || '').toLowerCase();
    let hits = 0;
    for (const w of words) {
        if (blob.includes(w)) hits += 1;
    }
    return hits / words.length;
}

function matchMisconceptionsToClaims(misconceptions = [], claims = []) {
    const matched = [];
    const seen = new Set();
    for (const misc of misconceptions) {
        const phrase = String(misc || '').trim();
        if (phrase.length < 10) continue;
        for (const claim of claims) {
            const key = claim.claimKey || claim.claim_key;
            if (!key || seen.has(key)) continue;
            const text = claim.claimText || claim.claim_text || '';
            const score = overlapScore(phrase, text);
            if (score >= 0.4 || String(text).toLowerCase().includes(phrase.toLowerCase().slice(0, 48))) {
                seen.add(key);
                matched.push({ claimKey: key, misconception: phrase, score });
            }
        }
    }
    return matched;
}

async function getRecentClaimGapKeys(db, userId, topic, { days = 90, limit = 50 } = {}) {
    if (!db || !userId || typeof db.listLearningEvents !== 'function') return new Set();
    try {
        const events = await db.listLearningEvents({
            userId,
            topic,
            eventType: 'claim_gap',
            limit: Math.min(Math.max(limit, 1), 100),
        });
        const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
        const keys = new Set();
        for (const e of Array.isArray(events) ? events : []) {
            const t = e.occurredAt ? new Date(e.occurredAt).getTime() : 0;
            if (t && t < cutoff) continue;
            if (e.claimKey) keys.add(String(e.claimKey));
        }
        return keys;
    } catch (err) {
        logger.warn({ err, userId, topic }, 'getRecentClaimGapKeys failed');
        return new Set();
    }
}

async function recordClaimGapsFromMisconceptions({
    db,
    userId,
    topic,
    misconceptions = [],
    sourceType = 'agent_conversation',
    sourceId = null,
} = {}) {
    if (!db || !userId || !topic || typeof db.recordLearningEvent !== 'function') {
        return { recorded: 0, matches: [] };
    }
    const list = Array.isArray(misconceptions) ? misconceptions.map(String).filter(Boolean).slice(0, 6) : [];
    if (list.length === 0) return { recorded: 0, matches: [] };

    let claims = [];
    if (typeof db.listTeachingObjectClaimsForTopic === 'function') {
        claims = await db.listTeachingObjectClaimsForTopic(topic, { limit: 80 }).catch(() => []);
    }
    const matches = matchMisconceptionsToClaims(list, claims);
    let recorded = 0;
    for (const m of matches) {
        await db.recordLearningEvent({
            userId,
            eventType: 'claim_gap',
            topic,
            claimKey: m.claimKey,
            sourceType,
            sourceId: sourceId != null ? String(sourceId) : null,
            payload: { misconception: m.misconception, matchScore: m.score },
        }).catch((err) => logger.warn({ err }, 'claim_gap event failed'));
        recorded += 1;
    }
    return { recorded, matches };
}

async function applyClaimGapOverlay(db, userId, topic, claimMastery = []) {
    if (!userId || !Array.isArray(claimMastery) || claimMastery.length === 0) {
        return claimMastery;
    }
    const gapKeys = await getRecentClaimGapKeys(db, userId, topic);
    if (gapKeys.size === 0) return claimMastery;
    return claimMastery.map((row) => {
        const key = row.claimKey || row.claim_key;
        if (!key || !gapKeys.has(String(key))) return row;
        if (row.masteryState === 'weak') return row;
        return { ...row, masteryState: 'weak', _claimGapSignal: true };
    });
}

module.exports = {
    resolveClaimMasteryState,
    tokenize,
    overlapScore,
    matchMisconceptionsToClaims,
    getRecentClaimGapKeys,
    recordClaimGapsFromMisconceptions,
    applyClaimGapOverlay,
};
