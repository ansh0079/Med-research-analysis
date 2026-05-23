'use strict';

const { getLifecycleLabel } = require('./claimLifecycleService');

const SAFETY_STATUSES = new Set(['guideline_conflict']);
const WEAKENING_TRANSITIONS = [
    ['source_verified', 'abstract_only'],
    ['source_verified', 'stale_needs_refresh'],
    ['human_reviewed', 'stale_needs_refresh'],
    ['guideline_supported', 'guideline_conflict'],
    ['guideline_supported', 'guideline_uncertain'],
];

function isWeakeningTransition(fromStatus, toStatus) {
    if (!fromStatus || !toStatus) return false;
    return WEAKENING_TRANSITIONS.some(([from, to]) => from === fromStatus && to === toStatus)
        || (fromStatus === 'source_verified' && toStatus === 'abstract_only');
}

function buildSummaryLines({ claimsChanged, safetyCautions, weakenedConclusions }) {
    const parts = [];
    if (claimsChanged > 0) parts.push(`${claimsChanged} claim${claimsChanged === 1 ? '' : 's'} changed`);
    if (safetyCautions > 0) parts.push(`${safetyCautions} safety caution${safetyCautions === 1 ? '' : 's'} emerged`);
    if (weakenedConclusions > 0) {
        parts.push(`${weakenedConclusions} prior conclusion${weakenedConclusions === 1 ? '' : 's'} weakened`);
    }
    if (!parts.length) return null;
    return `Since your last review, ${parts.join(', ')}.`;
}

async function buildEvidenceDeltaBrief(db, userId, topic) {
    const normalized = db.normalizeTopic(topic);
    const review = await db.getUserTopicReview?.(userId, topic).catch(() => null);
    const sinceIso = review?.lastReviewedAt || new Date(0).toISOString();

    const [history, currentClaims, regenQueue] = await Promise.all([
        db.getClaimStatusHistorySince?.(topic, sinceIso, { limit: 120 }) ?? Promise.resolve([]),
        db.listTeachingObjectClaimsForTopic(topic, { limit: 80 }).catch(() => []),
        db.listClaimRegenerationForTopic?.(topic, { limit: 10 }) ?? Promise.resolve([]),
    ]);

    const changedClaimKeys = new Set();
    const safetyEvents = [];
    const weakenedEvents = [];
    const changeDetails = [];

    for (const event of history) {
        changedClaimKeys.add(event.claimKey);
        if (SAFETY_STATUSES.has(event.toStatus)) {
            safetyEvents.push(event);
        }
        if (isWeakeningTransition(event.fromStatus, event.toStatus)) {
            weakenedEvents.push(event);
        }
        changeDetails.push({
            claimKey: event.claimKey,
            claimText: event.claimText,
            fromStatus: event.fromStatus,
            toStatus: event.toStatus,
            fromLabel: event.fromStatus ? getLifecycleLabel(event.fromStatus) : null,
            toLabel: getLifecycleLabel(event.toStatus),
            reason: event.reason,
            createdAt: event.createdAt,
        });
    }

    const newlyStale = currentClaims.filter((c) => {
        if (c.verificationStatus !== 'stale_needs_refresh' && c.verificationStatus !== 'full_text_available') return false;
        return !review?.lastReviewedAt || (c.updatedAt && c.updatedAt > sinceIso);
    });

    for (const claim of newlyStale) {
        if (!changedClaimKeys.has(claim.claimKey)) {
            changedClaimKeys.add(claim.claimKey);
            changeDetails.push({
                claimKey: claim.claimKey,
                claimText: claim.claimText,
                fromStatus: null,
                toStatus: claim.verificationStatus,
                fromLabel: null,
                toLabel: getLifecycleLabel(claim.verificationStatus),
                reason: claim.verificationReason,
                createdAt: claim.updatedAt,
            });
        }
    }

    const claimsChanged = changedClaimKeys.size;
    const safetyCautions = safetyEvents.length;
    const weakenedConclusions = weakenedEvents.length;
    const summary = buildSummaryLines({ claimsChanged, safetyCautions, weakenedConclusions });

    const pendingRegeneration = regenQueue.filter((r) => r.status === 'queued' || r.status === 'running');

    return {
        topic,
        normalizedTopic: normalized,
        hasPriorReview: Boolean(review?.lastReviewedAt),
        lastReviewedAt: review?.lastReviewedAt || null,
        sinceReviewedAt: sinceIso,
        claimsChanged,
        safetyCautions,
        weakenedConclusions,
        summary,
        significantChange: claimsChanged > 0 || safetyCautions > 0 || weakenedConclusions > 0,
        changes: changeDetails.slice(0, 12),
        pendingRegeneration: pendingRegeneration.slice(0, 6),
    };
}

module.exports = { buildEvidenceDeltaBrief, buildSummaryLines };
