'use strict';

const logger = require('../config/logger');

const LEARNING_SIGNAL_TYPES = Object.freeze({
    SEARCH_IMPRESSION: 'search_impression',
    SEARCH_CLICK: 'search_click',
    SEARCH_SAVE: 'search_save',
    SEARCH_DWELL: 'search_dwell',
    SEARCH_FEEDBACK_HELPFUL: 'search_feedback_helpful',
    SEARCH_FEEDBACK_NOT_HELPFUL: 'search_feedback_not_helpful',
    SEARCH_REWARD_ATTRIBUTED: 'search_reward_attributed',
    SEARCH_REWARD_SKIPPED: 'search_reward_skipped',
    QUIZ_REWARD_ATTRIBUTED: 'quiz_reward_attributed',
    QUIZ_MISS_FOR_SEARCH: 'quiz_miss_for_search',
});

async function recordLearningSignal(db, {
    userId = null,
    sessionId = null,
    eventType,
    topic = '',
    articleUid = null,
    searchId = null,
    decisionId = null,
    sourceType = 'search',
    sourceId = null,
    payload = {},
} = {}) {
    if (!db || typeof db.recordLearningEvent !== 'function' || !eventType) return null;

    const safePayload = {
        ...(payload && typeof payload === 'object' ? payload : { value: payload }),
        ...(sessionId ? { sessionId } : {}),
        ...(searchId != null ? { searchId: Number(searchId) } : {}),
        ...(decisionId != null ? { decisionId: Number(decisionId) } : {}),
        ...(articleUid ? { articleUid: String(articleUid) } : {}),
    };

    return db.recordLearningEvent({
        userId: userId || null,
        eventType,
        topic: topic || safePayload.topic || safePayload.query || safePayload.normalizedTopic || '',
        sourceType,
        sourceId: sourceId != null
            ? sourceId
            : (decisionId != null ? `decision:${decisionId}` : (searchId != null ? `search:${searchId}` : null)),
        payload: safePayload,
    }).catch((err) => {
        logger.debug({ err, eventType, userId, sessionId }, 'recordLearningSignal failed');
        return null;
    });
}

module.exports = {
    LEARNING_SIGNAL_TYPES,
    recordLearningSignal,
};
