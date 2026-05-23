'use strict';

const { summarizeTopicLifecycle } = require('./claimLifecycleService');

const STRONG_MEMORY_MIN_CLAIMS = 3;
const STRONG_MEMORY_MIN_TRUSTED = 2;

function daysSince(iso) {
    if (!iso) return null;
    const t = Date.parse(iso);
    if (Number.isNaN(t)) return null;
    return Math.max(0, Math.floor((Date.now() - t) / 86400000));
}

/**
 * Learner-facing evidence memory summary for a topic.
 */
async function buildTopicEvidenceMemory(db, userId, topic) {
    const cleanTopic = String(topic || '').trim();
    const normalized = db.normalizeTopic(cleanTopic);

    const [claims, mastery, watchEvents, topicReview, snapshotRow] = await Promise.all([
        db.listTeachingObjectClaimsForTopic(cleanTopic, { limit: 80 }).catch(() => []),
        userId
            ? db.getUserClaimMastery(userId, cleanTopic, { limit: 80 }).catch(() => [])
            : Promise.resolve([]),
        db.listGuidelineWatchEvents?.(cleanTopic, { limit: 20 }).catch(() => []) || [],
        userId && db.getUserTopicReview
            ? db.getUserTopicReview(userId, cleanTopic).catch(() => null)
            : Promise.resolve(null),
        db.get?.(
            `SELECT generated_at FROM synthesis_snapshots
             WHERE normalized_topic = ?
             ORDER BY generated_at DESC LIMIT 1`,
            [normalized]
        ).catch(() => null),
    ]);

    const lifecycle = summarizeTopicLifecycle(claims);
    const trustedCount = (lifecycle.byStage.human_reviewed || 0)
        + (lifecycle.byStage.source_verified || 0)
        + (lifecycle.byStage.guideline_supported || 0);
    const strongEvidenceMemory = claims.length >= STRONG_MEMORY_MIN_CLAIMS
        && trustedCount >= STRONG_MEMORY_MIN_TRUSTED;

    const untestedForUser = mastery.filter((c) => c.masteryState === 'untested').length;
    const guidelineConflictCount = (lifecycle.byStage.guideline_conflict || 0)
        + watchEvents.filter((e) => String(e.eventType || '').includes('conflict') || e.severity === 'high').length;

    const claimUpdated = claims.reduce((max, c) => {
        const t = c.updatedAt ? Date.parse(c.updatedAt) : 0;
        return t > max ? t : max;
    }, 0);
    const refreshedAt = snapshotRow?.generated_at
        || (claimUpdated ? new Date(claimUpdated).toISOString() : null)
        || topicReview?.reviewedAt
        || null;
    const daysSinceRefresh = daysSince(refreshedAt);

    return {
        topic: cleanTopic,
        strongEvidenceMemory,
        totalClaims: claims.length,
        trustedClaimCount: trustedCount,
        untestedClaimCount: untestedForUser,
        guidelineConflictCount,
        refreshedAt,
        daysSinceRefresh,
        lifecycleNeedsAttention: lifecycle.needsAttention,
        messages: buildEvidenceMemoryMessages({
            strongEvidenceMemory,
            untestedClaimCount: untestedForUser,
            guidelineConflictCount,
            daysSinceRefresh,
        }),
    };
}

function buildEvidenceMemoryMessages({
    strongEvidenceMemory,
    untestedClaimCount,
    guidelineConflictCount,
    daysSinceRefresh,
}) {
    const messages = [];
    if (strongEvidenceMemory) {
        messages.push({ key: 'strong_memory', text: 'This topic has strong evidence memory', tone: 'positive' });
    }
    if (untestedClaimCount > 0) {
        messages.push({
            key: 'untested',
            text: `${untestedClaimCount} claim${untestedClaimCount === 1 ? '' : 's'} are untested for you`,
            tone: 'neutral',
        });
    }
    if (guidelineConflictCount > 0) {
        messages.push({
            key: 'conflict',
            text: `${guidelineConflictCount} guideline conflict${guidelineConflictCount === 1 ? '' : 's'} exist${guidelineConflictCount === 1 ? 's' : ''}`,
            tone: 'warning',
        });
    }
    if (daysSinceRefresh != null) {
        const unit = daysSinceRefresh === 1 ? 'day' : 'days';
        messages.push({
            key: 'refreshed',
            text: `This topic was refreshed ${daysSinceRefresh} ${unit} ago`,
            tone: 'neutral',
        });
    }
    return messages;
}

module.exports = {
    buildTopicEvidenceMemory,
    buildEvidenceMemoryMessages,
};
