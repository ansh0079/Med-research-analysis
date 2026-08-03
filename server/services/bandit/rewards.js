'use strict';

const logger = require('../../config/logger');
const {
    POLICY_SEARCH_RANKING,
    POLICY_SYNOPSIS_STYLE,
    POLICY_TEACHING_STRATEGY,
} = require('./constants');
const { scopeKeyForUser } = require('./sampling');

async function recordBanditReward(db, policyType, armId, reward, userId = null) {
    if (!db?.recordPersonalizationArmPull || !armId) return;
    const scopeKey = userId ? scopeKeyForUser(userId) : 'global';
    await db.recordPersonalizationArmPull(policyType, armId, reward, scopeKey).catch((err) => {
        logger.warn({ err, policyType, armId }, 'recordPersonalizationArmPull failed');
    });
    // Anonymous (no-user) rewards already write to 'global' above — don't double-count.
    if (scopeKey !== 'global') {
        await db.recordPersonalizationArmPull(policyType, armId, reward, 'global').catch((err) => {
            logger.warn({ err, policyType, armId }, 'recordPersonalizationArmPull global failed');
        });
    }
}

async function reconcileImpressionRewards(db, { days = 7 } = {}) {
    if (!db?.listPersonalizationDecisionsPendingReward || !db?.updatePersonalizationDecisionReward) {
        return { updated: 0 };
    }
    const { reconcileQuizOutcomeDecisionReward } = require('./quizClaimPolicy');
    const { immediateImpressionReward } = require('./searchRankingPolicy');
    const pending = await db.listPersonalizationDecisionsPendingReward({ days, limit: 300 });
    let updated = 0;
    for (const row of pending) {
        if (row.policy_type === POLICY_SYNOPSIS_STYLE || row.policy_type === POLICY_TEACHING_STRATEGY) {
            const didUpdate = await reconcileQuizOutcomeDecisionReward(db, row, { days });
            if (didUpdate) updated += 1;
            continue;
        }
        if (row.policy_type !== POLICY_SEARCH_RANKING || !row.article_uid || !db?.findRecentSearchImpressionsForAttribution) continue;
        const impressions = row.user_id
            ? await db.findRecentSearchImpressionsForAttribution(row.user_id, {
                normalizedTopic: row.normalized_topic,
                articleUid: row.article_uid,
                days,
                limit: 5,
            })
            : [];
        const impression = impressions.find((i) => Number(i.search_id) === Number(row.search_id))
            || impressions[0];
        const immediate = impression ? immediateImpressionReward(impression) : 0;
        if (immediate <= 0 && row.delayed_reward == null) continue;
        const total = Math.min(1, immediate + Number(row.delayed_reward || 0));
        await db.updatePersonalizationDecisionReward(row.id, {
            immediateReward: immediate,
            delayedReward: row.delayed_reward,
            totalReward: total,
        });
        if (row.delayed_reward != null && total !== 0) {
            await recordBanditReward(db, POLICY_SEARCH_RANKING, row.arm_id, total, row.user_id);
        }
        updated += 1;
    }
    return { updated };
}

module.exports = {
    recordBanditReward,
    reconcileImpressionRewards,
};
