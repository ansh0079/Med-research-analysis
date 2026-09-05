'use strict';

const CLOSED_REWARD_STATUSES = Object.freeze(['final', 'superseded']);
const OPEN_REWARD_STATUSES = Object.freeze(['pending', 'partial']);
const REWARD_STATUSES = Object.freeze(['pending', 'partial', 'final', 'superseded']);

function clampLoggedPropensity(value) {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) return null;
    return Math.min(1, n);
}

/**
 * Canonical selection payload stored on personalization_decisions.context_json.
 * Every policy must log the true serve probability (or a documented approximation).
 */
function buildSelectionContext({
    armId,
    propensity = null,
    propensityByArm = null,
    selectionSource = null,
    policy = null,
    extra = {},
} = {}) {
    const logged = clampLoggedPropensity(propensity);
    return {
        armId: armId != null ? String(armId) : null,
        propensity: logged,
        propensityByArm: propensityByArm && typeof propensityByArm === 'object' ? propensityByArm : null,
        selectionSource: selectionSource || null,
        policy: policy || null,
        loggedAt: new Date().toISOString(),
        ...extra,
    };
}

function isClosedRewardStatus(status) {
    return CLOSED_REWARD_STATUSES.includes(String(status || ''));
}

function resolveRewardStatus({
    currentStatus = 'pending',
    delayedReward = null,
    requestedStatus = null,
} = {}) {
    if (requestedStatus && REWARD_STATUSES.includes(requestedStatus)) return requestedStatus;
    if (currentStatus === 'superseded') return 'superseded';
    if (currentStatus === 'final') return 'final';
    if (delayedReward != null) return 'final';
    return currentStatus === 'pending' ? 'partial' : currentStatus || 'partial';
}

async function logPersonalizationSelection(db, {
    userId = null,
    policyType,
    armId,
    searchId = null,
    topic = null,
    normalizedTopic = null,
    articleUid = null,
    propensity = null,
    propensityByArm = null,
    selectionSource = null,
    extra = {},
} = {}) {
    if (!db?.insertPersonalizationDecision || !policyType || !armId) return null;
    return db.insertPersonalizationDecision({
        userId,
        policyType,
        armId,
        searchId,
        topic,
        normalizedTopic,
        articleUid,
        context: buildSelectionContext({
            armId,
            propensity,
            propensityByArm,
            selectionSource,
            policy: policyType,
            extra,
        }),
    });
}

module.exports = {
    CLOSED_REWARD_STATUSES,
    OPEN_REWARD_STATUSES,
    REWARD_STATUSES,
    clampLoggedPropensity,
    buildSelectionContext,
    isClosedRewardStatus,
    resolveRewardStatus,
    logPersonalizationSelection,
};
