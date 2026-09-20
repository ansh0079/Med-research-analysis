'use strict';

/**
 * Consumes registry and source-change events. Supersession marks generated
 * artefacts for revision; retraction withdraws them immediately.
 */

function changeCount(result) {
    return Number(result?.changes ?? result?.rowCount ?? 0);
}

async function markTopicArtifacts(db, { normalizedTopic, reviewState, verificationStatus = null } = {}) {
    const topic = String(normalizedTopic || '').trim().toLowerCase();
    if (!topic || !db || typeof db.run !== 'function') {
        return { teachingObjects: 0, claims: 0 };
    }
    const now = new Date().toISOString();
    let teachingObjects = 0;
    let claims = 0;
    try {
        const objects = await db.run(
            `UPDATE teaching_objects
             SET review_state = ?, updated_at = ?
             WHERE review_state != ?
               AND (
                 lower(COALESCE(normalized_topic, '')) = ?
                 OR lower(COALESCE(topic, '')) = ?
               )`,
            [reviewState, now, reviewState, topic, topic]
        );
        teachingObjects = changeCount(objects);
    } catch {
        teachingObjects = 0;
    }
    try {
        const claimRows = await db.run(
            `UPDATE teaching_object_claims
             SET review_state = ?,
                 verification_status = COALESCE(?, verification_status),
                 updated_at = ?
             WHERE review_state != ?
               AND lower(COALESCE(normalized_topic, '')) = ?`,
            [reviewState, verificationStatus, now, reviewState, topic]
        );
        claims = changeCount(claimRows);
    } catch {
        claims = 0;
    }
    return { teachingObjects, claims };
}

async function invalidateArtifactsForSupersededConcept(db, { normalizedTopic } = {}) {
    return markTopicArtifacts(db, {
        normalizedTopic,
        reviewState: 'needs_revision',
        verificationStatus: 'unverified',
    });
}

async function invalidateArtifactsForRetractedSource(db, { articleUid, normalizedTopic } = {}) {
    const uid = String(articleUid || '').trim();
    const now = new Date().toISOString();
    let teachingObjects = 0;
    let claims = 0;
    if (db && typeof db.run === 'function' && uid) {
        try {
            const objects = await db.run(
                `UPDATE teaching_objects
                 SET review_state = 'needs_revision', updated_at = ?
                 WHERE review_state != 'needs_revision'
                   AND lower(COALESCE(article_uid, '')) = lower(?)`,
                [now, uid]
            );
            teachingObjects = changeCount(objects);
        } catch {
            teachingObjects = 0;
        }
        try {
            const claimRows = await db.run(
                `UPDATE teaching_object_claims
                 SET review_state = 'needs_revision',
                     verification_status = 'unverified',
                     updated_at = ?
                 WHERE review_state != 'needs_revision'
                   AND lower(COALESCE(article_uid, '')) = lower(?)`,
                [now, uid]
            );
            claims = changeCount(claimRows);
        } catch {
            claims = 0;
        }
    }
    if (normalizedTopic) {
        const byTopic = await markTopicArtifacts(db, {
            normalizedTopic,
            reviewState: 'needs_revision',
            verificationStatus: 'unverified',
        });
        teachingObjects += byTopic.teachingObjects;
        claims += byTopic.claims;
    }
    return { teachingObjects, claims, withdrawn: true };
}

async function consumeInvalidationEvent(db, event = {}) {
    const type = String(event.eventType || event.type || '').toLowerCase();
    if (type === 'source_retracted' || type === 'retraction') {
        return invalidateArtifactsForRetractedSource(db, event);
    }
    return invalidateArtifactsForSupersededConcept(db, event);
}

module.exports = {
    invalidateArtifactsForSupersededConcept,
    invalidateArtifactsForRetractedSource,
    consumeInvalidationEvent,
};
