'use strict';

/**
 * Consumes registry_edition_superseded: mark generated artifacts on the old
 * edition's concept as needing revision. Artifacts have no guideline-row
 * provenance yet, so this keys on normalized topic — the only durable link.
 */

function changeCount(result) {
    return Number(result?.changes ?? result?.rowCount ?? 0);
}

async function invalidateArtifactsForSupersededConcept(db, { normalizedTopic } = {}) {
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
             SET review_state = 'needs_revision', updated_at = ?
             WHERE review_state != 'needs_revision'
               AND (
                 lower(COALESCE(normalized_topic, '')) = ?
                 OR lower(COALESCE(topic, '')) = ?
               )`,
            [now, topic, topic]
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
               AND lower(COALESCE(normalized_topic, '')) = ?`,
            [now, topic]
        );
        claims = changeCount(claimRows);
    } catch {
        claims = 0;
    }
    return { teachingObjects, claims };
}

module.exports = {
    invalidateArtifactsForSupersededConcept,
};
