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
    loadArmPosterior,
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
    const [globalPosterior, userPosterior] = await Promise.all([
        loadArmPosterior(db, POLICY_TEACHING_STRATEGY, armIds, 'global'),
        userId ? loadArmPosterior(db, POLICY_TEACHING_STRATEGY, armIds, userScope) : Promise.resolve({ samples: {}, params: {} }),
    ]);
    const chosen = chooseArmBySamplesContextual(
        armIds,
        globalPosterior.samples,
        userPosterior.samples,
        userPulls,
        'direct',
        null,
        { paramsByArm: globalPosterior.params, userParamsByArm: userId ? userPosterior.params : null }
    );
    const scopeKey = userPulls >= MIN_PULLS_FOR_USER_ARM ? userScope : 'global';

    return {
        armId: chosen.armId,
        strategy: TEACHING_STRATEGY_ARMS[chosen.armId],
        scopeKey,
        sampled: chosen.sampled,
        propensity: chosen.propensity,
        propensityByArm: chosen.propensityByArm,
        selectionSource: chosen.selectionSource || 'argmax_thompson',
    };
}

module.exports = {
    selectTeachingStrategyArm,
};
