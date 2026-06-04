'use strict';

const logger = require('../config/logger');
const { buildLearningTrajectorySection } = require('./learnerStateService');
const { applyClaimGapOverlay } = require('./claimRemediationService');

async function safe(label, fn, fallback) {
    try {
        return await fn();
    } catch (err) {
        logger.warn({ err }, `${label} failed`);
        return fallback;
    }
}

function compactWeakTopics(rows, limit = 5) {
    return (Array.isArray(rows) ? rows : [])
        .filter((m) => Number(m.overallScore ?? m.overall_score ?? 100) < 60)
        .sort((a, b) => Number(a.overallScore ?? a.overall_score ?? 100) - Number(b.overallScore ?? b.overall_score ?? 100))
        .slice(0, limit);
}

function profileWeakTopics(profile) {
    return Array.isArray(profile?.weakTopics)
        ? profile.weakTopics.map(String).filter(Boolean).slice(0, 8)
        : [];
}

async function buildLearnerContext(db, {
    userId,
    topic,
    previousQueries = [],
    includeClaimMastery = true,
    includeTrajectory = true,
    includeWeakTopics = true,
    claimLimit = 25,
    weakTopicLimit = 10,
    trajectoryLimit = 10,
    trajectoryDays = 120,
    persistedConversation = null,
} = {}) {
    if (!db || !userId || !topic) {
        return null;
    }

    const cleanTopic = String(topic).trim().slice(0, 200);
    const [
        profile,
        mastery,
        topicMemory,
        weakTopicRows,
        claimMasteryRaw,
        learningTrajectory,
    ] = await Promise.all([
        typeof db.getLearningProfile === 'function'
            ? safe('getLearningProfile', () => db.getLearningProfile(userId), null)
            : Promise.resolve(null),
        typeof db.getUserTopicMastery === 'function'
            ? safe('getUserTopicMastery', () => db.getUserTopicMastery(userId, cleanTopic), null)
            : Promise.resolve(null),
        typeof db.getUserTopicMemory === 'function'
            ? safe('getUserTopicMemory', () => db.getUserTopicMemory(userId, cleanTopic), null)
            : Promise.resolve(null),
        includeWeakTopics && typeof db.listUserTopicMastery === 'function'
            ? safe('listUserTopicMastery', () => db.listUserTopicMastery(userId, { limit: weakTopicLimit, offset: 0 }), [])
            : Promise.resolve([]),
        includeClaimMastery && typeof db.getUserClaimMastery === 'function'
            ? safe('getUserClaimMastery', () => db.getUserClaimMastery(userId, cleanTopic, { limit: claimLimit }), [])
            : Promise.resolve([]),
        includeTrajectory
            ? buildLearningTrajectorySection(db, userId, cleanTopic, { limit: trajectoryLimit, days: trajectoryDays })
            : Promise.resolve(null),
    ]);

    const claimMastery = includeClaimMastery
        ? await applyClaimGapOverlay(db, userId, cleanTopic, Array.isArray(claimMasteryRaw) ? claimMasteryRaw : [])
        : [];

    const weakTopics = compactWeakTopics(weakTopicRows, 5);
    const profileWeakTopicList = profileWeakTopics(profile);

    return {
        userId,
        topic: cleanTopic,
        profile,
        mastery,
        weakTopics,
        profileWeakTopics: profileWeakTopicList,
        previousQueries: Array.isArray(previousQueries) ? previousQueries.slice(-5) : [],
        topicMemory,
        claimMastery,
        learningTrajectory,
        persistedConversationSummary: persistedConversation?.conversationSummary || null,
        learnerSnapshot: persistedConversation?.learnerSnapshot || null,
        hasPersonalization: Boolean(
            profile ||
            mastery ||
            topicMemory ||
            weakTopics.length ||
            profileWeakTopicList.length ||
            claimMastery.length ||
            learningTrajectory ||
            persistedConversation?.conversationSummary
        ),
    };
}

function publicLearnerContextSummary(context) {
    return {
        hasPersonalization: Boolean(context?.hasPersonalization),
        memoryTier: context?.topicMemory?.memoryTier || context?.topicMemory?.memory_tier || 'none',
        searchCount: Number(context?.topicMemory?.searchCount || context?.topicMemory?.search_count || 0),
        weakTopicCount: Array.isArray(context?.weakTopics) ? context.weakTopics.length : 0,
        profileWeakTopicCount: Array.isArray(context?.profileWeakTopics) ? context.profileWeakTopics.length : 0,
        claimMasteryCount: Array.isArray(context?.claimMastery) ? context.claimMastery.length : 0,
        weakClaimCount: Array.isArray(context?.claimMastery)
            ? context.claimMastery.filter((c) => c.masteryState === 'weak' || c.mastery_state === 'weak').length
            : 0,
        hasTrajectory: Boolean(context?.learningTrajectory),
        hasConversationMemory: Boolean(context?.persistedConversationSummary || context?.learnerSnapshot),
    };
}

module.exports = {
    buildLearnerContext,
    publicLearnerContextSummary,
    compactWeakTopics,
    profileWeakTopics,
};
