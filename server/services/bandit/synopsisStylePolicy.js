'use strict';

const {
    POLICY_SYNOPSIS_STYLE,
    SYNOPSIS_STYLE_ARMS,
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
 * Select a synopsis style arm for a given user using Thompson sampling.
 * Falls back to global scope until MIN_PULLS_FOR_USER_ARM pulls are logged.
 *
 * @returns {{ armId, style, scopeKey, sampled }}
 */
async function selectSynopsisStyleArm(db, userId) {
    const armIds = Object.keys(SYNOPSIS_STYLE_ARMS);
    if (!isBanditEnabled() || !db?.listPersonalizationArmStates) {
        return {
            armId: 'bottom_line_first',
            style: SYNOPSIS_STYLE_ARMS.bottom_line_first,
            scopeKey: 'global',
            sampled: null,
            propensity: 1,
            selectionSource: 'disabled',
        };
    }

    const userScope = scopeKeyForUser(userId);
    await ensurePolicyArms(db, POLICY_SYNOPSIS_STYLE, armIds, 'global');
    if (userId) await ensurePolicyArms(db, POLICY_SYNOPSIS_STYLE, armIds, userScope);

    const density = await policyHasDenseGlobalData(db, POLICY_SYNOPSIS_STYLE, 'bottom_line_first', armIds);
    if (!density.ok) {
        return {
            armId: 'bottom_line_first',
            style: SYNOPSIS_STYLE_ARMS.bottom_line_first,
            scopeKey: 'global',
            sampled: null,
            selectionSource: 'density_gate',
            propensity: 1,
            densityGate: { globalPulls: density.globalPulls, minGlobalPulls: MIN_GLOBAL_PULLS_FOR_POLICY },
        };
    }

    const userRows = userId
        ? await db.listPersonalizationArmStates(POLICY_SYNOPSIS_STYLE, userScope).catch(() => [])
        : [];
    const userPulls = userRows.reduce((sum, r) => sum + Number(r.pulls || 0), 0);
    const [globalSamples, userSamples] = await Promise.all([
        loadArmSamples(db, POLICY_SYNOPSIS_STYLE, armIds, 'global'),
        userId ? loadArmSamples(db, POLICY_SYNOPSIS_STYLE, armIds, userScope) : Promise.resolve({}),
    ]);
    const chosen = chooseArmBySamples(
        armIds,
        globalSamples,
        userSamples,
        userPulls,
        'bottom_line_first'
    );
    const scopeKey = userPulls >= MIN_PULLS_FOR_USER_ARM ? userScope : 'global';

    return {
        armId: chosen.armId,
        style: SYNOPSIS_STYLE_ARMS[chosen.armId],
        scopeKey,
        sampled: chosen.sampled,
        propensity: chosen.propensity,
        propensityByArm: chosen.propensityByArm,
        selectionSource: chosen.selectionSource || 'argmax_thompson',
    };
}

module.exports = {
    selectSynopsisStyleArm,
};
