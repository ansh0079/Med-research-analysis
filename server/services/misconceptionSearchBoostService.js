'use strict';

const logger = require('../config/logger');
const { classifyCalibrationAttempt } = require('./confidenceCalibrationService');
const { getInferredMisconceptionsForTopic } = require('./misconceptionInferenceService');

function normalizeUid(value) {
    return String(value || '').trim().toLowerCase();
}

function tokenize(text) {
    return String(text || '').toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length > 4);
}

function phraseOverlapScore(blob, phrases = []) {
    const haystack = String(blob || '').toLowerCase();
    let score = 0;
    for (const phrase of phrases) {
        const tokens = tokenize(phrase);
        if (!tokens.length) continue;
        const hits = tokens.filter((t) => haystack.includes(t)).length;
        if (hits >= Math.min(2, tokens.length)) score += 0.35;
        else if (hits >= 1) score += 0.15;
    }
    return Math.min(1.2, score);
}

async function loadMisconceptionBoostContext(db, userId, topic) {
    const empty = {
        correctiveArticleUids: new Map(),
        weakClaimKeys: new Set(),
        misconceptionPhrases: [],
        dangerousClaimKeys: new Set(),
    };
    if (!db || !topic) return empty;

    const normalizedTopic = typeof db.normalizeTopic === 'function' ? db.normalizeTopic(topic) : '';
    const correctiveArticleUids = new Map();
    const weakClaimKeys = new Set();
    const dangerousClaimKeys = new Set();
    const misconceptionPhrases = [];

    try {
        if (userId && typeof db.getUserClaimMastery === 'function') {
            const mastery = await db.getUserClaimMastery(userId, topic, { limit: 40 }).catch(() => []);
            for (const row of Array.isArray(mastery) ? mastery : []) {
                if (row.masteryState === 'weak' || (row.attempts > 0 && row.correct < row.attempts)) {
                    weakClaimKeys.add(row.claimKey);
                    if (row.claimText) misconceptionPhrases.push(String(row.claimText).slice(0, 180));
                    if (row.articleUid) {
                        const uid = normalizeUid(row.articleUid);
                        correctiveArticleUids.set(uid, Math.max(correctiveArticleUids.get(uid) || 0, 0.9));
                    }
                }
            }
        }

        if (userId) {
            const inferred = await getInferredMisconceptionsForTopic(db, userId, topic, { lookbackLimit: 12 }).catch(() => []);
            for (const item of Array.isArray(inferred) ? inferred : []) {
                const phrase = item?.description || item?.phrase || item?.label || item?.tag;
                if (phrase) misconceptionPhrases.push(String(phrase));
                if (item?.claimKey) weakClaimKeys.add(item.claimKey);
            }
        }

        if (userId && typeof db.all === 'function') {
            const miscRows = await db.all(
                `SELECT claim_key, wrong_option_text, count
                 FROM user_claim_misconceptions
                 WHERE user_id = ? AND normalized_topic = ?
                 ORDER BY count DESC LIMIT 12`,
                [String(userId), normalizedTopic]
            ).catch(() => []);
            for (const row of miscRows) {
                if (row.claim_key) weakClaimKeys.add(row.claim_key);
                if (row.wrong_option_text) misconceptionPhrases.push(String(row.wrong_option_text).slice(0, 160));
            }
        }

        if (userId && typeof db.getQuizAttempts === 'function') {
            const attempts = await db.getQuizAttempts({ userId, topic, limit: 40, offset: 0 }).catch(() => []);
            for (const attempt of Array.isArray(attempts) ? attempts : []) {
                const bucket = classifyCalibrationAttempt({
                    isCorrect: attempt.is_correct === 1 || attempt.isCorrect === true,
                    confidence: attempt.confidence,
                });
                if (bucket.bucket === 'dangerous_misconception' && attempt.claim_key) {
                    dangerousClaimKeys.add(attempt.claim_key);
                }
            }
        }

        if (typeof db.listTeachingObjectClaimsForTopic === 'function') {
            const claims = await db.listTeachingObjectClaimsForTopic(topic, { limit: 80 }).catch(() => []);
            const targetKeys = new Set([...weakClaimKeys, ...dangerousClaimKeys]);
            for (const claim of Array.isArray(claims) ? claims : []) {
                const isTrap = claim.conceptKey === 'misconception_trap';
                const isRelevant = targetKeys.has(claim.claimKey)
                    || (isTrap && misconceptionPhrases.length > 0);
                if (!isRelevant || !claim.articleUid) continue;
                const uid = normalizeUid(claim.articleUid);
                const weight = dangerousClaimKeys.has(claim.claimKey) ? 1.35
                    : isTrap ? 1.1
                        : 0.85;
                correctiveArticleUids.set(uid, Math.max(correctiveArticleUids.get(uid) || 0, weight));
                if (claim.claimText) misconceptionPhrases.push(String(claim.claimText).slice(0, 180));
            }
        }
    } catch (err) {
        logger.warn({ err, topic }, 'loadMisconceptionBoostContext failed');
    }

    return {
        correctiveArticleUids,
        weakClaimKeys,
        misconceptionPhrases: [...new Set(misconceptionPhrases)].slice(0, 12),
        dangerousClaimKeys,
    };
}

function misconceptionArticleBoost(article, boostContext, weights = {}) {
    if (!boostContext) return 0;
    const misconceptionWeight = Number(weights.misconception || 1);
    let boost = 0;

    for (const uid of [
        article?.uid,
        article?.pmid,
        article?.doi,
    ].map(normalizeUid).filter(Boolean)) {
        const corrective = boostContext.correctiveArticleUids?.get(uid);
        if (corrective) boost = Math.max(boost, Math.min(2.2, corrective * misconceptionWeight));
    }

    if (boostContext.misconceptionPhrases?.length) {
        const blob = `${article?.title || ''} ${article?.abstract || ''}`;
        const overlap = phraseOverlapScore(blob, boostContext.misconceptionPhrases);
        if (overlap > 0) boost = Math.max(boost, Math.min(1.6, overlap * misconceptionWeight));
    }

    return boost;
}

module.exports = {
    loadMisconceptionBoostContext,
    misconceptionArticleBoost,
    phraseOverlapScore,
};
