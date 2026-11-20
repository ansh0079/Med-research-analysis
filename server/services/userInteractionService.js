'use strict';

const { emit } = require('../lib/eventBus');
const { normalizeSearchId } = require('../../shared/searchId');
const {
    attributeSearchInteractionReward,
    attributeSynopsisStyleReward,
    attributeRecommendationFollowThrough,
} = require('./search/searchLearningOutcomeService');

const INTERACTION_EVENT_MAP = {
    click: 'paper_click',
    save: 'paper_save',
    dwell: 'paper_dwell',
    view: 'paper_view',
};

function buildInteractionPayload({
    type,
    userId = null,
    sessionId = null,
    paperId,
    searchId = null,
    topic = null,
    duration = null,
    sectionsRead = [],
    position = null,
    metadata = {},
} = {}) {
    return {
        type,
        userId,
        sessionId,
        paperId: String(paperId || '').trim(),
        searchId: normalizeSearchId(searchId),
        topic: topic ? String(topic).slice(0, 240) : null,
        duration: duration != null ? Number(duration) : null,
        sectionsRead: Array.isArray(sectionsRead) ? sectionsRead.slice(0, 12) : [],
        position: position != null ? Number(position) : null,
        metadata,
        occurredAt: new Date().toISOString(),
    };
}

async function trackUserInteraction(db, input, { logger } = {}) {
    const payload = buildInteractionPayload(input);
    if (!payload.paperId) return null;

    emit('user.interaction', payload);

    const tasks = [];

    if (db?.recordUserInteraction) {
        tasks.push(
            db.recordUserInteraction({
                userId: payload.userId,
                sessionId: payload.sessionId,
                articleId: payload.paperId,
                interactionType: input.rawType || payload.type.replace('paper_', ''),
                dwellTime: payload.duration,
            }).catch((err) => {
                logger?.warn?.({ err }, 'recordUserInteraction failed');
            })
        );
    }

    if (db?.recordLearningEvent && payload.userId) {
        const eventType = INTERACTION_EVENT_MAP[input.rawType || payload.type.replace('paper_', '')] || 'paper_view';
        tasks.push(
            db.recordLearningEvent({
                userId: payload.userId,
                eventType,
                topic: payload.topic || '',
                sourceType: 'search_interaction',
                sourceId: payload.searchId != null ? String(payload.searchId) : payload.paperId,
                payload: {
                    paperId: payload.paperId,
                    duration: payload.duration,
                    sectionsRead: payload.sectionsRead,
                    position: payload.position,
                    ...payload.metadata,
                },
            }).catch((err) => {
                logger?.warn?.({ err }, 'recordLearningEvent failed');
            })
        );
    }

    const rawInteraction = String(input.rawType || payload.type.replace('paper_', '') || '').toLowerCase();
    const isClick = rawInteraction === 'click' || Boolean(payload.metadata?.clicked);
    const isSave = rawInteraction === 'save' || Boolean(payload.metadata?.saved);
    const dwellMs = payload.duration != null ? Number(payload.duration) : 0;

    if (db?.all && (payload.userId || payload.sessionId)) {
        if (isClick || isSave || dwellMs >= 5000) {
            tasks.push(
                attributeSearchInteractionReward(db, payload.userId, {
                    searchId: payload.searchId,
                    articleUid: payload.paperId,
                    decisionId: payload.metadata?.decisionId || null,
                    interactionType: rawInteraction,
                    dwellMs,
                    wasClicked: isClick,
                    wasSaved: isSave,
                    sessionId: payload.sessionId,
                    topic: payload.topic || '',
                }).catch((err) => {
                    logger?.warn?.({ err }, 'attributeSearchInteractionReward failed');
                })
            );
        }

        if (isSave || dwellMs >= 15000 || payload.metadata?.feedback) {
            tasks.push(
                attributeSynopsisStyleReward(db, {
                    userId: payload.userId,
                    sessionId: payload.sessionId,
                    topic: payload.topic || '',
                    styleArm: payload.metadata?.styleArm || null,
                    articleUid: payload.paperId,
                    decisionId: payload.metadata?.synopsisDecisionId || null,
                    dwellTimeMs: dwellMs,
                    feedback: payload.metadata?.feedback || null,
                    reason: payload.metadata?.reason || null,
                    isSaved: isSave,
                }).catch((err) => {
                    logger?.warn?.({ err }, 'attributeSynopsisStyleReward failed');
                })
            );
        }

        if (payload.topic && (isClick || isSave || dwellMs >= 15000)) {
            const normalizedTopic = typeof db.normalizeTopic === 'function'
                ? db.normalizeTopic(payload.topic)
                : String(payload.topic).toLowerCase().trim();
            tasks.push(
                attributeRecommendationFollowThrough(db, payload.userId, {
                    topic: payload.topic,
                    normalizedTopic,
                    eventType: INTERACTION_EVENT_MAP[rawInteraction] || 'paper_view',
                    sessionId: payload.sessionId,
                }).catch((err) => {
                    logger?.warn?.({ err }, 'attributeRecommendationFollowThrough failed');
                })
            );
        }
    }

    await Promise.allSettled(tasks);
    return payload;
}

function registerInteractionHandlers({ db, logger } = {}) {
    const { on } = require('../lib/eventBus');
    return on('user.interaction', (payload) => {
        if (!db?.logEvent) return;
        db.logEvent('user_interaction', payload.sessionId, {
            type: payload.type,
            paperId: payload.paperId,
            searchId: payload.searchId,
            duration: payload.duration,
            sectionsRead: payload.sectionsRead,
        }).catch((err) => {
            logger?.warn?.({ err }, 'analytics user_interaction log failed');
        });
    });
}

module.exports = {
    buildInteractionPayload,
    trackUserInteraction,
    registerInteractionHandlers,
};
