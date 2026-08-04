'use strict';

const {
    POLICY_CASE_DIFFICULTY,
    CASE_DIFFICULTY_ARMS,
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
 * Thompson-sample case difficulty among easy/medium/hard.
 * @returns {{ armId: string, difficulty: 'easy'|'medium'|'hard', scopeKey: string, sampled: number|null }}
 */
async function selectCaseDifficultyArm(db, userId) {
    const armIds = Object.keys(CASE_DIFFICULTY_ARMS);
    const fallback = 'difficulty:medium';
    if (!isBanditEnabled() || !db?.listPersonalizationArmStates) {
        return {
            armId: fallback,
            difficulty: CASE_DIFFICULTY_ARMS[fallback].difficulty,
            scopeKey: 'global',
            sampled: null,
        };
    }

    const userScope = scopeKeyForUser(userId);
    await ensurePolicyArms(db, POLICY_CASE_DIFFICULTY, armIds, 'global');
    if (userId) await ensurePolicyArms(db, POLICY_CASE_DIFFICULTY, armIds, userScope);

    const density = await policyHasDenseGlobalData(db, POLICY_CASE_DIFFICULTY, fallback, armIds);
    if (!density.ok) {
        return {
            armId: fallback,
            difficulty: CASE_DIFFICULTY_ARMS[fallback].difficulty,
            scopeKey: 'global',
            sampled: null,
            selectionSource: 'density_gate',
            densityGate: { globalPulls: density.globalPulls, minGlobalPulls: MIN_GLOBAL_PULLS_FOR_POLICY },
        };
    }

    const userRows = userId
        ? await db.listPersonalizationArmStates(POLICY_CASE_DIFFICULTY, userScope).catch(() => [])
        : [];
    const userPulls = userRows.reduce((sum, r) => sum + Number(r.pulls || 0), 0);
    const [globalSamples, userSamples] = await Promise.all([
        loadArmSamples(db, POLICY_CASE_DIFFICULTY, armIds, 'global'),
        userId ? loadArmSamples(db, POLICY_CASE_DIFFICULTY, armIds, userScope) : Promise.resolve({}),
    ]);
    const { armId: bestArm, sampled: bestSample } = chooseArmBySamples(
        armIds,
        globalSamples,
        userSamples,
        userPulls,
        fallback
    );
    const scopeKey = userPulls >= MIN_PULLS_FOR_USER_ARM ? userScope : 'global';
    const meta = CASE_DIFFICULTY_ARMS[bestArm] || CASE_DIFFICULTY_ARMS[fallback];
    return { armId: bestArm, difficulty: meta.difficulty, scopeKey, sampled: bestSample };
}

module.exports = {
    selectCaseDifficultyArm,
};
