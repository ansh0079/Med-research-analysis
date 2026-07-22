'use strict';

/**
 * Post-turn mentor guideline fidelity: score assistant replies against stored
 * guidelines / teaching points and emit learning signals + optional bandit rewards.
 */

const logger = require('../config/logger');
const { LEARNING_SIGNAL_TYPES, recordLearningSignal } = require('./learningSignalService');
const {
    POLICY_TEACHING_STRATEGY,
    recordBanditReward,
} = require('./personalizationBanditService');

function tokenize(text) {
    return String(text || '')
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter((t) => t.length >= 4);
}

function overlapScore(replyTokens, sourceText) {
    const sourceTokens = new Set(tokenize(sourceText));
    if (!sourceTokens.size || !replyTokens.length) return 0;
    let hits = 0;
    for (const t of replyTokens) {
        if (sourceTokens.has(t)) hits += 1;
    }
    return hits / Math.min(24, sourceTokens.size);
}

/**
 * @returns {Promise<{ score: number, guidelineHits: number, teachingHits: number, reward: number|null }>}
 */
async function scoreMentorGuidelineFidelity(db, {
    topic,
    assistantReply,
    userId = null,
    sessionId = null,
    conversationId = null,
    banditMeta = null,
} = {}) {
    const reply = String(assistantReply || '').trim();
    if (!topic || reply.length < 40 || typeof db?.getGuidelinesByTopic !== 'function') {
        return { score: 0, guidelineHits: 0, teachingHits: 0, reward: null, skipped: true };
    }

    const [guidelines, knowledge] = await Promise.all([
        db.getGuidelinesByTopic(topic, { limit: 12 }).catch(() => []),
        db.getTopicKnowledge?.(topic).catch(() => null),
    ]);

    const replyTokens = tokenize(reply);
    const guidelineTexts = (guidelines || [])
        .map((g) => g.recommendationText || g.recommendation_text || '')
        .filter(Boolean);
    const teachingPoints = Array.isArray(knowledge?.knowledge?.teachingPoints)
        ? knowledge.knowledge.teachingPoints
        : [];

    let guidelineHits = 0;
    for (const text of guidelineTexts) {
        if (overlapScore(replyTokens, text) >= 0.18) guidelineHits += 1;
    }

    let teachingHits = 0;
    for (const tp of teachingPoints.slice(0, 8)) {
        const claim = typeof tp === 'string' ? tp : (tp?.claim || '');
        if (overlapScore(replyTokens, claim) >= 0.2) teachingHits += 1;
    }

    const citesGuideline = /\[G\d+\]/i.test(reply) || /\bguideline/i.test(reply);
    const denom = Math.max(1, Math.min(3, guidelineTexts.length) + Math.min(3, teachingPoints.length));
    const score = Math.max(0, Math.min(1, (guidelineHits + teachingHits + (citesGuideline ? 0.5 : 0)) / denom));

    let reward = null;
    if (score >= 0.55) reward = Math.min(1, 0.55 + score * 0.4);
    else if (score < 0.25 && (guidelineTexts.length > 0 || teachingPoints.length > 0)) reward = 0.15;

    await recordLearningSignal(db, {
        userId,
        sessionId,
        eventType: LEARNING_SIGNAL_TYPES.MENTOR_GUIDELINE_FIDELITY,
        topic,
        sourceType: 'agent_chat',
        sourceId: conversationId ? String(conversationId) : null,
        payload: {
            score,
            guidelineHits,
            teachingHits,
            guidelineCount: guidelineTexts.length,
            teachingPointCount: teachingPoints.length,
            citesGuideline,
            reward,
        },
    });

    const armId = banditMeta?.armId || banditMeta?.teachingStrategyArmId || null;
    if (armId && reward != null) {
        await recordBanditReward(db, POLICY_TEACHING_STRATEGY, armId, reward, userId).catch((err) => {
            logger.debug({ err, topic, armId }, 'fidelity bandit reward failed');
        });
    }

    return {
        score,
        guidelineHits,
        teachingHits,
        reward,
        skipped: false,
    };
}

module.exports = {
    scoreMentorGuidelineFidelity,
    overlapScore,
};
