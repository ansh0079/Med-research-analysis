'use strict';

const {
    POLICY_TEACHING_STRATEGY,
    TEACHING_STRATEGY_ARMS,
    MIN_PULLS_FOR_USER_ARM,
    MIN_GLOBAL_PULLS_FOR_POLICY,
} = require('./constants');
const {
    isBanditEnabled,
    scopeKeyForUser,
    ensurePolicyArms,
    loadArmSamples,
    policyHasDenseGlobalData,
    chooseArmBySamples,
} = require('./sampling');

/**
 * Select a teaching strategy arm for a given user using Thompson sampling.
 *
 * @returns {{ armId, strategy, scopeKey, sampled }}
 */
async function selectTeachingStrategyArm(db, userId) {
    const armIds = Object.keys(TEACHING_STRATEGY_ARMS);
    if (!isBanditEnabled() || !db?.listPersonalizationArmStates) {
        return { armId: 'direct', strategy: TEACHING_STRATEGY_ARMS.direct, scopeKey: 'global', sampled: null };
    }

    const userScope = scopeKeyForUser(userId);
    await ensurePolicyArms(db, POLICY_TEACHING_STRATEGY, armIds, 'global');
    if (userId) await ensurePolicyArms(db, POLICY_TEACHING_STRATEGY, armIds, userScope);

    const density = await policyHasDenseGlobalData(db, POLICY_TEACHING_STRATEGY, 'direct', armIds);
    if (!density.ok) {
        return {
            armId: 'direct',
            strategy: TEACHING_STRATEGY_ARMS.direct,
            scopeKey: 'global',
            sampled: null,
            selectionSource: 'density_gate',
            densityGate: { globalPulls: density.globalPulls, minGlobalPulls: MIN_GLOBAL_PULLS_FOR_POLICY },
        };
    }

    const userRows = userId
        ? await db.listPersonalizationArmStates(POLICY_TEACHING_STRATEGY, userScope).catch(() => [])
        : [];
    const userPulls = userRows.reduce((sum, r) => sum + Number(r.pulls || 0), 0);
    const [globalSamples, userSamples] = await Promise.all([
        loadArmSamples(db, POLICY_TEACHING_STRATEGY, armIds, 'global'),
        userId ? loadArmSamples(db, POLICY_TEACHING_STRATEGY, armIds, userScope) : Promise.resolve({}),
    ]);
    const { armId: bestArm, sampled: bestSample } = chooseArmBySamples(
        armIds,
        globalSamples,
        userSamples,
        userPulls,
        'direct'
    );
    const scopeKey = userPulls >= MIN_PULLS_FOR_USER_ARM ? userScope : 'global';

    return { armId: bestArm, strategy: TEACHING_STRATEGY_ARMS[bestArm], scopeKey, sampled: bestSample };
}

module.exports = {
    selectTeachingStrategyArm,
};
