'use strict';

/**
 * Canonical teaching-claim lifecycle (verification_status encodes stage).
 *
 * Doctor-facing trust ladder:
 *   generated → abstract_only → full_text_verified → guideline_supported → curator_reviewed
 *
 * Internal statuses map onto ladder steps (see TRUST_LADDER).
 */

const LIFECYCLE_STAGES = [
    'agent_draft',
    'abstract_only',
    'full_text_available',
    'source_verified',
    'guideline_supported',
    'guideline_uncertain',
    'guideline_conflict',
    'human_reviewed',
    'stale_needs_refresh',
];

/** Doctor-visible trust ladder (ordered). */
const TRUST_LADDER = [
    {
        tier: 'generated',
        label: 'Generated claim',
        description: 'Extracted by AI; not yet tied to primary full text.',
        statuses: new Set(['unverified', 'agent_draft', 'synthesis_inferred']),
    },
    {
        tier: 'abstract_only',
        label: 'Abstract only',
        description: 'Grounded in abstract or synthesis; full text not yet verified.',
        statuses: new Set(['abstract_only']),
    },
    {
        tier: 'full_text_verified',
        label: 'Full-text verified',
        description: 'Indexed full text used in synopsis or source-verified.',
        statuses: new Set(['full_text_available', 'source_verified']),
    },
    {
        tier: 'guideline_supported',
        label: 'Guideline supported',
        description: 'Aligned with guideline library (supported, uncertain, or conflict flagged).',
        statuses: new Set(['guideline_supported', 'guideline_uncertain', 'guideline_conflict']),
    },
    {
        tier: 'curator_reviewed',
        label: 'Curator reviewed',
        description: 'Signed off by a curator for teaching use.',
        statuses: new Set(['human_reviewed']),
    },
];

const STALE_STATUSES = new Set(['stale_needs_refresh']);

const STAGE_LABELS = {
    agent_draft: 'Agent draft',
    abstract_only: 'Abstract only',
    full_text_available: 'Full text ready',
    source_verified: 'Source verified',
    guideline_supported: 'Guideline supported',
    guideline_uncertain: 'Guideline uncertain',
    guideline_conflict: 'Guideline conflict',
    human_reviewed: 'Curator reviewed',
    stale_needs_refresh: 'Stale — needs refresh',
    synthesis_inferred: 'Synthesis inferred',
    unverified: 'Unverified',
};

const STAGE_ACTIONS = {
    agent_draft: 'Verify against primary source or run paper synopsis.',
    abstract_only: 'Index full text or run synopsis when PDF is available.',
    full_text_available: 'Re-run synopsis to upgrade claims from full text.',
    source_verified: 'Run guideline alignment or curator review.',
    guideline_supported: 'Optional curator sign-off for teaching use.',
    guideline_uncertain: 'Manual guideline review recommended.',
    guideline_conflict: 'Resolve conflict with guideline library or edit claim.',
    human_reviewed: 'Monitor for new evidence; refresh when stale.',
    stale_needs_refresh: 'Queue or run synopsis regeneration.',
    synthesis_inferred: 'Ground in primary papers or verify citations.',
    unverified: 'Run synopsis or assign verification status.',
};

/** Stricter promotion graph — no skipping trust tiers. */
const ALLOWED_TRANSITIONS = {
    agent_draft: new Set(['abstract_only', 'full_text_available', 'source_verified', 'synthesis_inferred', 'stale_needs_refresh', 'unverified']),
    abstract_only: new Set(['full_text_available', 'source_verified', 'stale_needs_refresh']),
    full_text_available: new Set(['source_verified', 'stale_needs_refresh', 'abstract_only']),
    source_verified: new Set(['guideline_supported', 'guideline_uncertain', 'guideline_conflict', 'human_reviewed', 'stale_needs_refresh']),
    guideline_supported: new Set(['human_reviewed', 'guideline_conflict', 'guideline_uncertain', 'stale_needs_refresh']),
    guideline_uncertain: new Set(['guideline_supported', 'guideline_conflict', 'human_reviewed', 'source_verified', 'stale_needs_refresh']),
    guideline_conflict: new Set(['human_reviewed', 'guideline_supported', 'source_verified', 'stale_needs_refresh']),
    human_reviewed: new Set(['stale_needs_refresh', 'source_verified', 'guideline_supported']),
    stale_needs_refresh: new Set(['full_text_available', 'source_verified', 'abstract_only', 'agent_draft', 'synthesis_inferred']),
    synthesis_inferred: new Set(['abstract_only', 'full_text_available', 'source_verified', 'stale_needs_refresh']),
    unverified: new Set(['abstract_only', 'agent_draft', 'full_text_available', 'source_verified', 'synthesis_inferred', 'stale_needs_refresh']),
};

const GUIDELINE_STATUSES = new Set(['guideline_supported', 'guideline_uncertain', 'guideline_conflict']);

function normalizeStatus(status) {
    return String(status || 'unverified').trim() || 'unverified';
}

function statusToTrustTier(status) {
    const s = normalizeStatus(status);
    if (STALE_STATUSES.has(s)) return 'abstract_only';
    for (const step of TRUST_LADDER) {
        if (step.statuses.has(s)) return step.tier;
    }
    return 'generated';
}

function trustTierIndex(tier) {
    return TRUST_LADDER.findIndex((s) => s.tier === tier);
}

function getLifecycleLabel(status) {
    return STAGE_LABELS[normalizeStatus(status)] || normalizeStatus(status).replace(/_/g, ' ');
}

function getRecommendedAction(status) {
    return STAGE_ACTIONS[normalizeStatus(status)] || 'Review claim provenance.';
}

function canTransition(fromStatus, toStatus, { force = false } = {}) {
    if (force) return true;
    const from = normalizeStatus(fromStatus);
    const to = normalizeStatus(toStatus);
    if (from === to) return true;
    const allowed = ALLOWED_TRANSITIONS[from];
    return allowed ? allowed.has(to) : false;
}

function canPromoteToGuidelineStatus(fromStatus) {
    const tier = statusToTrustTier(fromStatus);
    const idx = trustTierIndex(tier);
    return idx >= trustTierIndex('full_text_verified');
}

function canPromoteToCuratorReviewed(fromStatus) {
    const s = normalizeStatus(fromStatus);
    if (s === 'human_reviewed') return true;
    return [
        'source_verified',
        'guideline_supported',
        'guideline_uncertain',
        'guideline_conflict',
    ].includes(s);
}

function getTrustLadderForClaim(claim = {}) {
    const status = normalizeStatus(claim.verificationStatus);
    const currentTier = statusToTrustTier(status);
    const currentIdx = trustTierIndex(currentTier);
    const isStale = STALE_STATUSES.has(status);

    const steps = TRUST_LADDER.map((step, idx) => ({
        tier: step.tier,
        label: step.label,
        description: step.description,
        reached: idx < currentIdx || (idx === currentIdx && !isStale),
        current: idx === currentIdx,
        stale: idx === currentIdx && isStale,
    }));

    return {
        claimKey: claim.claimKey || null,
        verificationStatus: status,
        currentTier,
        currentTierLabel: TRUST_LADDER[currentIdx]?.label || currentTier,
        isStale,
        steps,
    };
}

function describeClaimLifecycle(claim = {}) {
    const stage = normalizeStatus(claim.verificationStatus);
    const trust = getTrustLadderForClaim(claim);
    return {
        claimKey: claim.claimKey || null,
        claimText: claim.claimText || null,
        lifecycleStage: stage,
        lifecycleLabel: getLifecycleLabel(stage),
        lifecycleOrder: LIFECYCLE_STAGES.indexOf(stage) >= 0 ? LIFECYCLE_STAGES.indexOf(stage) : 99,
        recommendedAction: getRecommendedAction(stage),
        verificationReason: claim.verificationReason || null,
        updatedAt: claim.updatedAt || null,
        trustTier: trust.currentTier,
        trustLadder: trust.steps,
    };
}

function summarizeTopicLifecycle(claims = []) {
    const byStage = {};
    const byTrustTier = {};
    for (const claim of claims) {
        const stage = normalizeStatus(claim.verificationStatus);
        byStage[stage] = (byStage[stage] || 0) + 1;
        const tier = statusToTrustTier(stage);
        byTrustTier[tier] = (byTrustTier[tier] || 0) + 1;
    }
    const pipeline = LIFECYCLE_STAGES.map((stage) => ({
        stage,
        label: getLifecycleLabel(stage),
        count: byStage[stage] || 0,
    }));
    return {
        totalClaims: claims.length,
        byStage,
        byTrustTier,
        pipeline,
        needsAttention: (byStage.abstract_only || 0)
            + (byStage.full_text_available || 0)
            + (byStage.stale_needs_refresh || 0)
            + (byStage.guideline_conflict || 0)
            + (byStage.agent_draft || 0)
            + (byStage.synthesis_inferred || 0)
            + (byStage.unverified || 0),
    };
}

function assertTransitionAllowed(fromStatus, toStatus, { force = false } = {}) {
    const to = normalizeStatus(toStatus);
    if (GUIDELINE_STATUSES.has(to) && !canPromoteToGuidelineStatus(fromStatus) && !force) {
        const err = new Error('Claim must be full-text verified before guideline promotion');
        err.code = 'TRUST_TIER_BLOCKED';
        throw err;
    }
    if (to === 'human_reviewed' && !canPromoteToCuratorReviewed(fromStatus) && !force) {
        const err = new Error('Claim must be source-verified or guideline-aligned before curator review');
        err.code = 'TRUST_TIER_BLOCKED';
        throw err;
    }
    if (!canTransition(fromStatus, toStatus, { force })) {
        const err = new Error(`Invalid status transition: ${normalizeStatus(fromStatus)} → ${to}`);
        err.code = 'INVALID_TRANSITION';
        throw err;
    }
}

module.exports = {
    LIFECYCLE_STAGES,
    TRUST_LADDER,
    STAGE_LABELS,
    statusToTrustTier,
    getTrustLadderForClaim,
    getLifecycleLabel,
    getRecommendedAction,
    canTransition,
    canPromoteToGuidelineStatus,
    canPromoteToCuratorReviewed,
    assertTransitionAllowed,
    describeClaimLifecycle,
    summarizeTopicLifecycle,
    normalizeStatus,
};
