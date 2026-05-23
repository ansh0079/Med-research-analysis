'use strict';

const logger = require('../config/logger');
const { enqueueRegenerationForArticleClaims } = require('./claimRegenerationService');

/**
 * After PDF full text is indexed, advance abstract-only claims to full_text_available
 * and queue synopsis regeneration to upgrade teaching claims.
 */
async function upgradeClaimsAfterFullText(db, articleUid, { minWordCount = 500, topic = '' } = {}) {
    const uid = String(articleUid || '').trim();
    if (!uid || typeof db.listTeachingObjectClaimsByObjectKey !== 'function') return { upgraded: 0, queued: 0 };

    const object = await db.getTeachingObjectForArticle(uid).catch(() => null);
    if (!object?.objectKey) return { upgraded: 0, queued: 0 };

    const claims = await db.listTeachingObjectClaimsByObjectKey(object.objectKey);
    let upgraded = 0;
    for (const claim of claims) {
        if (!claim?.claimKey) continue;
        if (claim.verificationStatus !== 'abstract_only' && claim.verificationStatus !== 'agent_draft') continue;
        try {
            const prior = claim.verificationStatus;
            await db.updateTeachingClaimVerification(claim.claimKey, {
                verificationStatus: 'full_text_available',
                verificationReason: `Full text is now indexed (${minWordCount}+ words). Synopsis regeneration queued to upgrade this claim.`,
                reviewerId: null,
            });
            if (typeof db.logClaimStatusChange === 'function') {
                await db.logClaimStatusChange(claim.claimKey, {
                    fromStatus: prior,
                    toStatus: 'full_text_available',
                    normalizedTopic: topic || claim.normalizedTopic || object.topic,
                    reason: 'PDF full text indexed',
                }).catch(() => {});
            }
            upgraded += 1;
        } catch (err) {
            logger.warn({ err, claimKey: claim.claimKey }, 'claim full-text upgrade failed');
        }
    }

    let queued = 0;
    if (upgraded > 0) {
        const regen = await enqueueRegenerationForArticleClaims(db, uid, {
            topic: topic || object.topic || object.normalizedTopic,
            triggerReason: 'full_text_indexed',
        }).catch(() => ({ queued: 0 }));
        queued = regen?.queued || 0;
    }

    return { upgraded, queued, articleUid: uid };
}

module.exports = { upgradeClaimsAfterFullText };
