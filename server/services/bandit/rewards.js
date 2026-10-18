'use strict';

const logger = require('../../config/logger');
const {
    POLICY_SEARCH_RANKING,
    POLICY_SYNOPSIS_STYLE,
    POLICY_TEACHING_STRATEGY,
} = require('./constants');
const { scopeKeyForUser } = require('./sampling');

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
 * Apply a Beta update. When applicationKey is provided, the pull is idempotent
 * (duplicate keys no-op). Without a key, falls back to the legacy always-pull path.
 */
async function recordBanditReward(db, policyType, armId, reward, userId = null, opts = {}) {
    if (!armId) return { applied: false, reason: 'missing_arm' };
    const normalizedArmId = normalizeBanditArmId(policyType, armId);
    if (!normalizedArmId) return { applied: false, reason: 'missing_arm' };

    const {
        applicationKey = null,
        decisionId = null,
        source = null,
    } = opts || {};

    const scopeKey = userId ? scopeKeyForUser(userId) : 'global';
    const scopes = scopeKey === 'global' ? ['global'] : [scopeKey, 'global'];

    if (applicationKey && db?.recordPersonalizationArmPullIdempotent) {
        let anyApplied = false;
        for (const sk of scopes) {
            const key = sk === 'global' && scopes.length > 1
                ? `${applicationKey}:global`
                : applicationKey;
            const result = await db.recordPersonalizationArmPullIdempotent({
                policyType,
                armId: normalizedArmId,
                reward,
                scopeKey: sk,
                applicationKey: key,
                decisionId,
                source,
            }).catch((err) => {
                logger.warn({ err, policyType, armId: normalizedArmId }, 'idempotent arm pull failed');
                return { applied: false };
            });
            if (result?.applied) anyApplied = true;
        }
        return { applied: anyApplied, applicationKey, armId: normalizedArmId };
    }

    if (!db?.recordPersonalizationArmPull) return { applied: false, reason: 'no_db' };
    for (const sk of scopes) {
        await db.recordPersonalizationArmPull(policyType, normalizedArmId, reward, sk).catch((err) => {
            logger.warn({ err, policyType, armId: normalizedArmId, scopeKey: sk }, 'recordPersonalizationArmPull failed');
        });
    }
    return { applied: true, armId: normalizedArmId, legacy: true };
}

function decisionContext(row) {
    try {
        return row?.context_json ? JSON.parse(row.context_json) : {};
    } catch {
        return {};
    }
}

function sameId(left, right) {
    return left != null && right != null && String(left) === String(right);
}

async function reconcileImpressionRewards(db, {
    days = 60,
    pageSize = 500,
    noEngagementGraceHours = 24,
    censorAfterDays = 7,
    maxPages = 20,
} = {}) {
    if (!db?.listPersonalizationDecisionsPendingReward || !db?.updatePersonalizationDecisionReward) {
        return { updated: 0 };
    }
    const { reconcileQuizOutcomeDecisionReward } = require('./quizClaimPolicy');
    const { immediateImpressionReward } = require('./searchRankingPolicy');
    let updated = 0;
    let censored = 0;
    let scanned = 0;
    let afterId = 0;
    const now = Date.now();
    const zeroCutoff = now - Math.max(Number(noEngagementGraceHours) || 24, 1) * 3600000;
    const censorCutoff = now - Math.max(Number(censorAfterDays) || 7, 1) * 86400000;

    for (let page = 0; page < Math.max(Number(maxPages) || 20, 1); page += 1) {
        const pending = await db.listPersonalizationDecisionsPendingReward({
            days,
            limit: pageSize,
            afterId,
        });
        if (!pending.length) break;
        afterId = Math.max(afterId, ...pending.map((row) => Number(row.id) || 0));
        scanned += pending.length;

        for (const row of pending) {
            if (row.policy_type === POLICY_SYNOPSIS_STYLE || row.policy_type === POLICY_TEACHING_STRATEGY) {
                const didUpdate = await reconcileQuizOutcomeDecisionReward(db, row, { days });
                if (didUpdate) updated += 1;
                continue;
            }
            if (row.policy_type !== POLICY_SEARCH_RANKING || !row.article_uid || !db?.findRecentSearchImpressionsForAttribution) continue;
            const context = decisionContext(row);
            const impressions = await db.findRecentSearchImpressionsForAttribution(row.user_id || null, {
                sessionId: context.sessionId || null,
                searchId: row.search_id,
                normalizedTopic: row.normalized_topic,
                articleUid: row.article_uid,
                days,
                limit: 5,
            }).catch(() => []);
            const impression = impressions.find((item) => sameId(item.search_id, row.search_id));
            const createdAt = Date.parse(row.created_at || '');
            if (!impression) {
                if (Number.isFinite(createdAt) && createdAt <= censorCutoff
                    && db.markPersonalizationDecisionRewardCensored) {
                    const didCensor = await db.markPersonalizationDecisionRewardCensored(row.id);
                    if (didCensor) censored += 1;
                }
                continue;
            }

            const immediate = immediateImpressionReward(impression);
            if (immediate <= 0 && (!Number.isFinite(createdAt) || createdAt > zeroCutoff)) continue;
            const delayed = Number(row.delayed_reward || 0);
            const total = Math.max(-1, Math.min(1, immediate + delayed));
            await db.updatePersonalizationDecisionReward(row.id, {
                immediateReward: immediate,
                delayedReward: delayed,
                totalReward: total,
            });
            await recordBanditReward(db, POLICY_SEARCH_RANKING, row.arm_id, total, row.user_id, {
                applicationKey: `decision:${row.id}:total:${Number(total).toFixed(4)}`,
                decisionId: row.id,
                source: 'reconcile_impression',
            });
            updated += 1;
        }
        if (pending.length < pageSize) break;
    }
    return { scanned, updated, censored };
}

module.exports = {
    recordBanditReward,
    normalizeBanditArmId,
    reconcileImpressionRewards,
};
