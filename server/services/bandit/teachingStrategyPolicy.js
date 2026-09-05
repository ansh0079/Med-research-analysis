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
    chooseArmBySamplesContextual,
} = require('./sampling');

/**
 * Select a teaching strategy arm for a given user using Thompson sampling.
 *
 * @returns {{ armId, strategy, scopeKey, sampled }}
 */
async function selectTeachingStrategyArm(db, userId) {
    const armIds = Object.keys(TEACHING_STRATEGY_ARMS);
    if (!isBanditEnabled() || !db?.listPersonalizationArmStates) {
        return {
            armId: 'direct',
            strategy: TEACHING_STRATEGY_ARMS.direct,
            scopeKey: 'global',
            sampled: null,
            propensity: 1,
        };
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
            propensity: 1,
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
    const chosen = chooseArmBySamplesContextual(
        armIds,
        globalSamples,
        userSamples,
        userPulls,
        'direct'
    );
    const scopeKey = userPulls >= MIN_PULLS_FOR_USER_ARM ? userScope : 'global';

    return {
        armId: chosen.armId,
        strategy: TEACHING_STRATEGY_ARMS[chosen.armId],
        scopeKey,
        sampled: chosen.sampled,
        propensity: chosen.propensity,
        propensityByArm: chosen.propensityByArm,
        selectionSource: 'thompson',
    };
}

module.exports = {
    selectTeachingStrategyArm,
};
