/**
 * Nightly rollup: learning_events → user_learning_profiles.weak_topics
 */

const logger = require('../config/logger');

const ROLLUP_EVENT_TYPES = new Set([
    'agent_turn_memory',
    'quiz_session_feedback',
    'claim_gap',
]);

function collectWeakTopicLabels(events = [], { days = 30 } = {}) {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    const topics = new Set();

    for (const event of Array.isArray(events) ? events : []) {
        if (!ROLLUP_EVENT_TYPES.has(event.eventType)) continue;
        const t = event.occurredAt ? new Date(event.occurredAt).getTime() : 0;
        if (t && t < cutoff) continue;

        const payload = event.payload && typeof event.payload === 'object' ? event.payload : {};
        const topicLabel = String(event.topic || '').trim();
        if (topicLabel.length >= 2) topics.add(topicLabel.slice(0, 120));

        if (event.eventType === 'quiz_session_feedback') {
            for (const w of Array.isArray(payload.weakAreas) ? payload.weakAreas : []) {
                const label = String(w || '').trim();
                if (label.length >= 2) topics.add(label.slice(0, 120));
            }
        }
        if (event.eventType === 'agent_turn_memory') {
            for (const m of Array.isArray(payload.misconceptions) ? payload.misconceptions : []) {
                const label = String(m || '').trim();
                if (label.length >= 8 && topicLabel) topics.add(topicLabel.slice(0, 120));
            }
            for (const f of Array.isArray(payload.focusAreas) ? payload.focusAreas : []) {
                const label = String(f || '').trim();
                if (label.length >= 4 && topicLabel) topics.add(topicLabel.slice(0, 120));
            }
        }
    }

    return [...topics];
}

function mergeWeakTopics(existing = [], incoming = [], maxTopics = 25) {
    const merged = [...new Set([
        ...(Array.isArray(existing) ? existing.map(String) : []),
        ...(Array.isArray(incoming) ? incoming.map(String) : []),
    ].map((t) => t.trim()).filter((t) => t.length >= 2))];
    return merged.slice(0, maxTopics);
}

async function rollupUserWeakTopics(db, userId, { days = 30, maxTopics = 25 } = {}) {
    if (!db || !userId || typeof db.listLearningEvents !== 'function') {
        return { userId, updated: false, weakTopics: [] };
    }

    const events = await db.listLearningEvents({ userId, limit: 400 }).catch((err) => {
        logger.warn({ err, userId }, 'rollup listLearningEvents failed');
        return [];
    });
    const incoming = collectWeakTopicLabels(events, { days });
    if (incoming.length === 0) {
        return { userId, updated: false, weakTopics: [] };
    }

    let existing = [];
    if (typeof db.getLearningProfile === 'function') {
        const profile = await db.getLearningProfile(userId).catch(() => null);
        existing = profile?.weakTopics || [];
    }

    const weakTopics = mergeWeakTopics(existing, incoming, maxTopics);
    if (typeof db.upsertLearningProfile === 'function') {
        await db.upsertLearningProfile(userId, { weakTopics });
    }

    return { userId, updated: true, weakTopics };
}

async function rollupAllLearnerProfiles(db, { days = 30 } = {}) {
    if (!db || typeof db.all !== 'function') {
        return { usersProcessed: 0, usersUpdated: 0 };
    }

    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const rows = await db.all(
        `SELECT DISTINCT user_id FROM learning_events
         WHERE user_id IS NOT NULL AND user_id != '' AND occurred_at >= ?`,
        [cutoff]
    ).catch((err) => {
        logger.warn({ err }, 'rollup distinct users query failed');
        return [];
    });

    let usersUpdated = 0;
    for (const row of rows) {
        const userId = row.user_id || row.userId;
        if (!userId) continue;
        const result = await rollupUserWeakTopics(db, userId, { days });
        if (result.updated) usersUpdated += 1;
    }

    return { usersProcessed: rows.length, usersUpdated };
}

module.exports = {
    ROLLUP_EVENT_TYPES,
    collectWeakTopicLabels,
    mergeWeakTopics,
    rollupUserWeakTopics,
    rollupAllLearnerProfiles,
};
