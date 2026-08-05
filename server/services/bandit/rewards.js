'use strict';

const logger = require('../../config/logger');
const {
    POLICY_SEARCH_RANKING,
    POLICY_SYNOPSIS_STYLE,
    POLICY_TEACHING_STRATEGY,
} = require('./constants');
const { scopeKeyForUser } = require('./sampling');
const {
    clampConfidence,
    attributionConfidenceForSource,
    globalPriorConfidence,
} = require('../learning/attributionConfidence');

function normalizeBanditArmId(policyType, armId) {
    const raw = String(armId || '').trim();
    if (!raw) return raw;
    // Map legacy anonymous search arm onto the canonical heuristic arm.
    if (policyType === POLICY_SEARCH_RANKING && raw === 'organic') {
        return 'heuristic_default';
    }
    return raw;
}

/**
 * @param {object} db
 * @param {string} policyType
 * @param {string} armId
 * @param {number} reward
 * @param {string|null} userId
 * @param {{ confidence?: number, sourceEvent?: string|null }} [options]
 */
async function recordBanditReward(db, policyType, armId, reward, userId = null, options = {}) {
    if (!db?.recordPersonalizationArmPull || !armId) return;
    const normalizedArmId = normalizeBanditArmId(policyType, armId);
    if (!normalizedArmId) return;

    const sourceEvent = options.sourceEvent || null;
    const confidence = clampConfidence(
        options.confidence != null
            ? options.confidence
            : attributionConfidenceForSource(sourceEvent),
        0.5
    );

    const scopeKey = userId ? scopeKeyForUser(userId) : 'global';
    await db.recordPersonalizationArmPull(policyType, normalizedArmId, reward, scopeKey, confidence).catch((err) => {
        logger.warn({ err, policyType, armId: normalizedArmId }, 'recordPersonalizationArmPull failed');
    });
    // Anonymous (no-user) rewards already write to 'global' above — don't double-count.
    // Per-user rewards also update the global prior at a reduced confidence so new
    // users benefit from aggregate behaviour without inheriting one user's prefs strongly.
    if (scopeKey !== 'global') {
        const globalConf = globalPriorConfidence(confidence);
        await db.recordPersonalizationArmPull(policyType, normalizedArmId, reward, 'global', globalConf).catch((err) => {
            logger.warn({ err, policyType, armId: normalizedArmId }, 'recordPersonalizationArmPull global failed');
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
        const sourceEvent = impression?.was_saved ? 'impression_saved'
            : (impression?.dwell_time_ms || 0) >= 12000 ? 'impression_dwell'
                : impression?.was_clicked ? 'impression_click'
                    : 'impression_engagement';
        const confidence = attributionConfidenceForSource(sourceEvent, {
            wasSaved: Boolean(impression?.was_saved),
            wasClicked: Boolean(impression?.was_clicked),
            dwellMs: Number(impression?.dwell_time_ms || 0),
        });
        await db.updatePersonalizationDecisionReward(row.id, {
            immediateReward: immediate,
            delayedReward: row.delayed_reward,
            totalReward: total,
            attributionConfidence: confidence,
            sourceEvent,
        });
        if (row.delayed_reward != null && total !== 0) {
            await recordBanditReward(db, POLICY_SEARCH_RANKING, row.arm_id, total, row.user_id, {
                confidence,
                sourceEvent,
            });
        }
        updated += 1;
    }
    return { updated };
}

module.exports = {
    recordBanditReward,
    normalizeBanditArmId,
    reconcileImpressionRewards,
};
