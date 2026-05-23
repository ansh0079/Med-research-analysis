'use strict';

const logger = require('../config/logger');
const { classifyClaimGuidelineAlignment } = require('./claimGuidelineAlignmentService');

const { canPromoteToGuidelineStatus } = require('./claimLifecycleService');

const AUTO_APPLY_STATUSES = new Set([
    'guideline_supported',
    'guideline_uncertain',
    'guideline_conflict',
]);

async function alignClaimWithGuidelines(db, claim, { apply = false, reviewerId = null } = {}) {
    const topic = claim.topic || claim.normalizedTopic || '';
    const guidelines = topic
        ? await db.getGuidelinesByTopic(topic, { limit: 12 }).catch((err) => {
            logger.warn({ err, topic }, 'getGuidelinesByTopic failed');
            return [];
        })
        : [];
    const alignment = classifyClaimGuidelineAlignment(claim, guidelines);
    let updatedClaim = claim;
    if (apply && AUTO_APPLY_STATUSES.has(alignment.recommendedVerificationStatus)) {
        if (!canPromoteToGuidelineStatus(claim.verificationStatus)) {
            return { claim, alignment, guidelineCount: guidelines.length, skipped: true, reason: 'requires_full_text_verified' };
        }
        updatedClaim = await db.updateTeachingClaimVerification(claim.claimKey, {
            verificationStatus: alignment.recommendedVerificationStatus,
            verificationReason: alignment.reason,
            reviewerId,
        });
    }
    return { claim: updatedClaim, alignment, guidelineCount: guidelines.length };
}

async function alignTopicClaimsWithGuidelines(db, topic, { limit = 40, apply = true, reviewerId = null } = {}) {
    const claims = await db.listTeachingObjectClaimsForTopic(topic, { limit });
    const results = [];
    for (const claim of claims) {
        if (!claim?.claimKey) continue;
        if (claim.verificationStatus === 'human_reviewed') {
            results.push({ claimKey: claim.claimKey, skipped: true, reason: 'curator_reviewed' });
            continue;
        }
        if (!canPromoteToGuidelineStatus(claim.verificationStatus)) {
            results.push({ claimKey: claim.claimKey, skipped: true, reason: 'requires_full_text_verified' });
            continue;
        }
        try {
            const row = await alignClaimWithGuidelines(db, claim, { apply, reviewerId });
            results.push({
                claimKey: claim.claimKey,
                alignmentStatus: row.alignment.alignmentStatus,
                recommendedVerificationStatus: row.alignment.recommendedVerificationStatus,
                applied: apply && AUTO_APPLY_STATUSES.has(row.alignment.recommendedVerificationStatus),
            });
        } catch (err) {
            logger.warn({ err, claimKey: claim.claimKey }, 'guideline align failed');
            results.push({ claimKey: claim.claimKey, error: err.message });
        }
    }
    return { topic, processed: results.length, results };
}

module.exports = {
    alignClaimWithGuidelines,
    alignTopicClaimsWithGuidelines,
    AUTO_APPLY_STATUSES,
};
