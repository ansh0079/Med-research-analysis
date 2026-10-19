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

async function reconcileImpressionRewards(db, { days = 7, pageSize = 500, unattributableAfterDays = 7 } = {}) {
    if (!db?.listPersonalizationDecisionsPendingReward || !db?.updatePersonalizationDecisionReward) {
        return { updated: 0 };
    }
    const { reconcileQuizOutcomeDecisionReward } = require('./quizClaimPolicy');
    const { immediateImpressionReward } = require('./searchRankingPolicy');
    const { estimateExaminationProbabilities, loadPositionStats, ipsWeight } = require('./positionPropensity');
    let updated = 0;
    let closedUnattributable = 0;
    let ipsWeighted = 0;
    let lastId = 0;
    let positionEstimated = null;
    const unattributableBefore = new Date(Date.now() - unattributableAfterDays * 86400000).toISOString();
    // Page through every pending decision by id watermark. Zero-closure removes
    // rows from the pending set, but unattributable closes do not, so a watermark
    // (not re-querying the head) is what guarantees forward progress.
    for (let guard = 0; guard < 50; guard++) {
        let pending = null;
        if (guard === 0 && typeof db.listPersonalizationDecisionsPendingReward === 'function') {
            const mocked = await db.listPersonalizationDecisionsPendingReward({ days, limit: pageSize }).catch(() => null);
            if (Array.isArray(mocked) && mocked.length > 0) {
                pending = mocked;
            }
        }
        if (!pending) {
            pending = await db.all(
                `SELECT * FROM personalization_decisions
                 WHERE delayed_reward IS NULL AND created_at >= ?
                   AND id > ?
                 ORDER BY id ASC LIMIT ?`,
                [new Date(Date.now() - Math.min(Math.max(Number(days) || 7, 1), 60) * 86400000).toISOString(),
                 lastId, Math.min(Math.max(Number(pageSize) || 500, 50), 2000)]
            ).catch(() => []);
        }
        if (!pending.length) break;
        lastId = Number(pending[pending.length - 1].id);
        for (const row of pending) {
            if (row.policy_type === POLICY_SYNOPSIS_STYLE || row.policy_type === POLICY_TEACHING_STRATEGY) {
                const didUpdate = await reconcileQuizOutcomeDecisionReward(db, row, { days });
                if (didUpdate) updated += 1;
                continue;
            }
            if (row.policy_type !== POLICY_SEARCH_RANKING || !row.article_uid || !db?.findRecentSearchImpressionsForAttribution) continue;
            // Anonymous sessions have no user_id: attribute by the decision's own
            // search snapshot instead, so the reward loop still closes for them.
            const impressions = row.user_id
                ? await db.findRecentSearchImpressionsForAttribution(row.user_id, {
                    normalizedTopic: row.normalized_topic,
                    articleUid: row.article_uid,
                    days,
                    limit: 5,
                })
                : await db.findRecentSearchImpressionsForAttribution(null, {
                    searchId: row.search_id,
                    articleUid: row.article_uid,
                    days,
                    limit: 5,
                }).catch(() => []);
            const impression = impressions.find((i) => Number(i.search_id) === Number(row.search_id));
            // Do not fall back to impressions[0] — mismatched attribution injects noise into the posterior.
            if (!impression) {
                // No impression data will ever arrive for a search this old: close
                // as unattributable (reward_computed_at only, rewards stay NULL)
                // so the health check measures real stalls, not history.
                if (row.created_at < unattributableBefore) {
                    await db.updatePersonalizationDecisionReward(row.id, {});
                    closedUnattributable += 1;
                }
                continue;
            }
            // Position debiasing: engagement at rank k is inflated by examination
            // probability, not ranker quality. Weight by 1/P(examine|k), capped.
            if (!positionEstimated) {
                positionEstimated = estimateExaminationProbabilities(await loadPositionStats(db, { days }));
            }
            const rawImmediate = immediateImpressionReward(impression);
            const weight = rawImmediate > 0 ? ipsWeight(impression.position, positionEstimated) : 1;
            if (rawImmediate > 0 && weight > 1) ipsWeighted += 1;
            const immediate = Math.min(1, rawImmediate * weight);
            if (immediate <= 0 && row.delayed_reward == null) {
                // Attributable but no engagement: close the decision as a measured
                // zero instead of leaving it pending forever. Zero carries no signal,
                // so no bandit pull is applied — the posterior only moves on evidence.
                await db.updatePersonalizationDecisionReward(row.id, {
                    immediateReward: 0,
                    delayedReward: 0,
                    totalReward: 0,
                });
                updated += 1;
                continue;
            }
            const total = Math.min(1, immediate + Number(row.delayed_reward || 0));
            await db.updatePersonalizationDecisionReward(row.id, {
                immediateReward: immediate,
                delayedReward: row.delayed_reward,
                totalReward: total,
            });
            if (row.delayed_reward != null && total !== 0) {
                await recordBanditReward(db, POLICY_SEARCH_RANKING, row.arm_id, total, row.user_id, {
                    applicationKey: `decision:${row.id}:reconcile_impression`,
                    decisionId: row.id,
                    source: 'reconcile_impression',
                });
            }
            updated += 1;
        }
        if (pending.length < pageSize) break;
    }
    return { updated, closedUnattributable, ipsWeighted };
}

module.exports = {
    recordBanditReward,
    normalizeBanditArmId,
    reconcileImpressionRewards,
};
