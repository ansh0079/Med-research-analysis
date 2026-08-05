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
    blendedArmSample,
    softmaxPropensities,
} = require('./sampling');
const { synopsisStyleMemoryBoosts } = require('../ai/synopsisStyleMemoryService');

/**
 * Select a synopsis style arm for a given user using Thompson sampling,
 * blended with slowly converging per-user style memory.
 *
 * @returns {{ armId, style, scopeKey, sampled, memoryBoosts? }}
 */
async function selectSynopsisStyleArm(db, userId) {
    const armIds = Object.keys(SYNOPSIS_STYLE_ARMS);
    if (!isBanditEnabled() || !db?.listPersonalizationArmStates) {
        return { armId: 'bottom_line_first', style: SYNOPSIS_STYLE_ARMS.bottom_line_first, scopeKey: 'global', sampled: null };
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
            densityGate: { globalPulls: density.globalPulls, minGlobalPulls: MIN_GLOBAL_PULLS_FOR_POLICY },
        };
    }

    const userRows = userId
        ? await db.listPersonalizationArmStates(POLICY_SYNOPSIS_STYLE, userScope).catch(() => [])
        : [];
    const userPulls = userRows.reduce((sum, r) => sum + Number(r.pulls || 0), 0);
    const [globalSamples, userSamples, memoryBoosts] = await Promise.all([
        loadArmSamples(db, POLICY_SYNOPSIS_STYLE, armIds, 'global'),
        userId ? loadArmSamples(db, POLICY_SYNOPSIS_STYLE, armIds, userScope) : Promise.resolve({}),
        userId ? synopsisStyleMemoryBoosts(db, userId) : Promise.resolve({}),
    ]);

    let bestArm = 'bottom_line_first';
    let bestSample = -1;
    const boostedScores = [];
    for (const armId of armIds) {
        const raw = blendedArmSample(globalSamples[armId] ?? 0.5, userSamples[armId], userPulls);
        const mem = Number(memoryBoosts[armId] || 1);
        const boosted = raw * mem;
        boostedScores.push(boosted);
        if (boosted > bestSample) {
            bestSample = boosted;
            bestArm = armId;
        }
    }
    const propensities = softmaxPropensities(boostedScores);
    const propensityByArm = {};
    armIds.forEach((id, i) => {
        propensityByArm[id] = propensities[i] ?? (1 / armIds.length);
    });
    const scopeKey = userPulls >= MIN_PULLS_FOR_USER_ARM ? userScope : 'global';

    return {
        armId: bestArm,
        style: SYNOPSIS_STYLE_ARMS[bestArm],
        scopeKey,
        sampled: bestSample,
        propensity: propensityByArm[bestArm],
        propensityByArm,
        memoryBoosts,
        selectionSource: 'thompson_style_memory',
    };
}

module.exports = {
    selectSynopsisStyleArm,
};
