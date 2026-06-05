'use strict';

const logger = require('../config/logger');
const { buildLearningTrajectorySection, formatLearnerSnapshot } = require('./learnerStateService');
const { applyClaimGapOverlay } = require('./claimRemediationService');
const { computeOutlineGaps, formatUncoveredOutlinePrompt } = require('./outlineCoverageService');
const { getLearningVelocity, formatLearningVelocity } = require('./learningVelocityService');
const {
    groupMisconceptionsByCategory,
    formatCategoryMisconceptionSummary,
} = require('./misconceptionCategoryService');

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

function buildMisconceptionLogFromAttempts(attempts = []) {
    const failedAttempts = (Array.isArray(attempts) ? attempts : []).filter(
        (a) => a.is_correct === 0 || a.is_correct === false || a.isCorrect === false
    );
    const misconceptionLog = {};
    for (const attempt of failedAttempts.slice(0, 10)) {
        const qType = attempt.question_type || attempt.questionType || 'unknown';
        if (!misconceptionLog[qType]) misconceptionLog[qType] = { count: 0, outlineNodes: new Set() };
        misconceptionLog[qType].count += 1;
        const nodeId = attempt.outline_node_id || attempt.outlineNodeId;
        if (nodeId) misconceptionLog[qType].outlineNodes.add(nodeId);
    }
    for (const key of Object.keys(misconceptionLog)) {
        misconceptionLog[key].outlineNodes = Array.from(misconceptionLog[key].outlineNodes);
    }
    return misconceptionLog;
}

/**
 * Shared prompt supplement for quiz + agent (keeps personalization text in sync).
 */
function formatLearnerPromptSupplement(context, { misconceptionLog = null } = {}) {
    if (!context) return '';

    const parts = [];

    if (Array.isArray(context.previousQueries) && context.previousQueries.length > 0) {
        parts.push(
            `SESSION TRAJECTORY: ${context.previousQueries.join(' -> ')}\nPrefer questions on angles not yet covered in this session.`
        );
    }

    const profileWeak = Array.isArray(context.profileWeakTopics) ? context.profileWeakTopics : [];
    const crossTopicWeak = (Array.isArray(context.weakTopics) ? context.weakTopics : [])
        .map((t) => t.topic || t)
        .filter(Boolean);
    const allWeakTopics = [...new Set([...profileWeak, ...crossTopicWeak])].slice(0, 6);
    if (allWeakTopics.length) {
        parts.push(`PROFILE / CROSS-TOPIC WEAK AREAS: ${allWeakTopics.join(', ')}`);
    }

    const weakClaims = (Array.isArray(context.claimMastery) ? context.claimMastery : [])
        .filter((c) => c.masteryState === 'weak' || c.mastery_state === 'weak')
        .slice(0, 5);
    if (weakClaims.length) {
        parts.push(
            `CLAIM GAPS TO TARGET:\n${weakClaims.map((c) => `- [CLAIM-${c.claimKey}] ${String(c.claimText || '').slice(0, 220)}`).join('\n')}`
        );
    }

    if (context.learningTrajectory) {
        parts.push(String(context.learningTrajectory).trim().slice(0, 1800));
    }

    const snapshotText = formatLearnerSnapshot(context.learnerSnapshot);
    if (snapshotText) {
        parts.push(`LEARNER SNAPSHOT:\n${snapshotText}`);
    }

    if (misconceptionLog && Object.keys(misconceptionLog).length > 0) {
        const lines = Object.entries(misconceptionLog)
            .map(([qType, data]) => {
                const nodes = Array.isArray(data.outlineNodes) && data.outlineNodes.length > 0
                    ? ` (nodes: ${data.outlineNodes.join(', ')})`
                    : '';
                return `  - ${qType}: ${data.count} recent miss(es)${nodes}`;
            })
            .join('\n');
        parts.push(
            `LEARNER MISCONCEPTION LOG — recent incorrect attempt patterns:\n${lines}\nGenerate at least one question targeting the most frequent failure type.`
        );
    }

    const categorySummary = formatCategoryMisconceptionSummary(context.misconceptionCategories || []);
    if (categorySummary) {
        parts.push(categorySummary);
    }

    const uncoveredPrompt = formatUncoveredOutlinePrompt(context.uncoveredOutlineNodes);
    if (uncoveredPrompt) {
        parts.push(uncoveredPrompt);
    }

    const velocityText = formatLearningVelocity(context.learningVelocity);
    if (velocityText) {
        parts.push(velocityText);
    }

    return parts.filter(Boolean).join('\n\n');
}

async function enrichLearnerContextForQuiz(db, params = {}) {
    const context = await buildLearnerContext(db, params);
    if (!context || !params.userId) {
        return context;
    }

    const [attempts, personalMisconceptions] = await Promise.all([
        typeof db.getQuizAttempts === 'function'
            ? safe(
                'getQuizAttempts',
                () => db.getQuizAttempts({
                    userId: params.userId,
                    topic: params.topic,
                    limit: params.recentAttemptLimit || 20,
                }),
                []
            )
            : Promise.resolve([]),
        typeof db.getUserClaimMisconceptions === 'function'
            ? safe(
                'getUserClaimMisconceptions',
                () => db.getUserClaimMisconceptions(params.userId, params.topic, { limit: 12 }),
                []
            )
            : Promise.resolve([]),
    ]);

    return {
        ...context,
        misconceptionLog: buildMisconceptionLogFromAttempts(attempts),
        misconceptionCategories: groupMisconceptionsByCategory(personalMisconceptions),
        personalMisconceptions,
    };
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
    topicKnowledge = null,
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

    const [outlineGaps, learningVelocity, personalMisconceptions] = await Promise.all([
        topicKnowledge
            ? safe(
                'computeOutlineGaps',
                () => computeOutlineGaps(db, userId, cleanTopic, topicKnowledge, topicMemory),
                null
            )
            : Promise.resolve(null),
        safe(
            'getLearningVelocity',
            () => getLearningVelocity(db, userId, cleanTopic, { days: 7 }),
            null
        ),
        typeof db.getUserClaimMisconceptions === 'function'
            ? safe(
                'getUserClaimMisconceptions',
                () => db.getUserClaimMisconceptions(userId, cleanTopic, { limit: 12 }),
                []
            )
            : Promise.resolve([]),
    ]);

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
        learningVelocity,
        uncoveredOutlineNodes: outlineGaps?.uncoveredNodes || [],
        weakOutlineNodes: outlineGaps?.weakNodes || [],
        misconceptionCategories: groupMisconceptionsByCategory(personalMisconceptions),
        personalMisconceptions,
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
            learningVelocity ||
            (outlineGaps?.uncoveredNodes?.length > 0) ||
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
        uncoveredOutlineNodeCount: Array.isArray(context?.uncoveredOutlineNodes) ? context.uncoveredOutlineNodes.length : 0,
        learningVelocity: context?.learningVelocity?.pointsPerDay ?? null,
        learningTrend: context?.learningVelocity?.trend ?? null,
    };
}

module.exports = {
    buildLearnerContext,
    enrichLearnerContextForQuiz,
    publicLearnerContextSummary,
    compactWeakTopics,
    profileWeakTopics,
    buildMisconceptionLogFromAttempts,
    formatLearnerPromptSupplement,
};
