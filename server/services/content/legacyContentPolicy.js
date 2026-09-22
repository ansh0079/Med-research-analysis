'use strict';

/**
 * What content written before evidence lineage existed is allowed to claim.
 *
 * The legacy audit marked 11,703 teaching objects `legacy_unlinked`: generated before snapshots
 * existed, so there is no record of what the model actually read. Marking them was right, and
 * attaching a snapshot retrospectively would have been a lie - it would assert we know sources we do
 * not know. But the marker changed the data and nothing else: those rows are still served through
 * six read paths, indistinguishable from content whose sources can be produced on demand.
 *
 * This module is the one place that decides what `legacy_unlinked` means at serving time:
 *
 *  - It is NOT a quality judgement. Legacy content may be perfectly good; it is unproven, not wrong,
 *    so nothing here hides or deletes it.
 *  - It IS a provenance ceiling. Content whose sources cannot be produced may not carry a label that
 *    asserts identifiable source text, under the same enforcement flag as the rest of the lineage
 *    rules (enforced by default, with explicit shadow mode for rollback).
 *  - A generation that reads legacy content inherits the ceiling. A quiz built on teaching-object
 *    text nobody can trace cannot claim guideline support, even though the manifest truthfully
 *    records that it read that text. The manifest says what was read; this says what may be claimed.
 */

const { PROVENANCE_ASSERTING, lineageEnforcementMode } = require('../search/generationEvidenceContext');
const { recordProvenanceShadowCap } = require('../ops/observabilityMetrics');

/** Written before lineage existed and never linked to a snapshot. */
const LEGACY_UNLINKED = 'legacy_unlinked';
/**
 * Legacy content nobody can reach through the curriculum, which we have decided not to regenerate.
 * Retired is not deleted: it stays readable if something links to it directly, and the marker can be
 * cleared. What it stops is the content seeding NEW clinical material - building on sources we
 * cannot produce, for a topic no reader opens, is how an unprovable corpus grows itself.
 */
const LEGACY_RETIRED = 'legacy_retired';

function lineageStatusOf(object) {
    return String(object?.lineageStatus || object?.lineage_status || '').toLowerCase();
}

function isRetired(object) {
    return lineageStatusOf(object) === LEGACY_RETIRED;
}

function isLegacyUnlinked(object) {
    if (!object) return false;
    const status = lineageStatusOf(object);
    if (status === LEGACY_UNLINKED || status === LEGACY_RETIRED) return true;
    // A row predating the audit carries neither a snapshot nor a marker; it is legacy all the same.
    const snapshot = object.evidenceSnapshotId ?? object.evidence_snapshot_id;
    return !status && !snapshot;
}

/**
 * Can this object's sources be produced on demand?
 * Unprovable is the honest default: a caller that cannot say yes must not get a yes.
 */
function isProvable(object) {
    const status = lineageStatusOf(object);
    const snapshot = object?.evidenceSnapshotId ?? object?.evidence_snapshot_id;
    return Boolean(snapshot) && (status === 'linked' || status === 'linked_with_additions');
}

/**
 * The provenance an API response should carry alongside legacy content, so a reader (and the UI)
 * can tell the difference rather than having to assume.
 */
function describeProvenance(object) {
    if (!object) return { lineage: null, provable: false, reason: 'no_object' };
    if (isRetired(object)) {
        return {
            lineage: LEGACY_RETIRED,
            provable: false,
            reason: 'unprovable and outside the curriculum; retired rather than regenerated',
        };
    }
    if (isLegacyUnlinked(object)) {
        return {
            lineage: LEGACY_UNLINKED,
            provable: false,
            reason: 'generated before evidence snapshots existed; original sources were never recorded',
        };
    }
    if (!isProvable(object)) {
        return {
            lineage: lineageStatusOf(object) || 'unlinked',
            provable: false,
            reason: 'no linked, replayable evidence snapshot is recorded for this object',
        };
    }
    return {
        lineage: String(object.lineageStatus || object.lineage_status || 'linked'),
        provable: true,
        reason: null,
    };
}

/** Attach provenance to an object served to a client, without altering its content. */
function annotateProvenance(object) {
    if (!object) return object;
    return { ...object, provenance: describeProvenance(object) };
}

/**
 * Cap a provenance-asserting label on legacy content.
 *
 * Same shape and same flag as the lineage and manifest caps, so provenance rules are enforced or
 * shadowed together rather than one of the three quietly behaving differently.
 */
function capVerificationForLegacy(verificationStatus, object, env = process.env) {
    if (isProvable(object)) return verificationStatus;
    if (!PROVENANCE_ASSERTING.has(verificationStatus)) return verificationStatus;
    if (lineageEnforcementMode(env) !== 'enforce') {
        // Shadow: the label stands, but the near-miss is counted so the cost of enforcing is known
        // before it is paid.
        recordProvenanceShadowCap('legacy_object', verificationStatus);
        return verificationStatus;
    }
    return 'unverified';
}

/**
 * Split objects about to be used as generation context.
 *
 * Both halves are still usable - legacy text is often the only material there is for a topic, and
 * withholding it would degrade the product to make a metric look better. The split exists so the
 * caller can record that it read unprovable input and cap what the result may assert.
 */
function partitionByProvenance(objects = []) {
    const list = Array.isArray(objects) ? objects : [];
    const provable = list.filter((o) => isProvable(o));
    return { provable, legacy: list.filter((o) => !isProvable(o)) };
}

/** True when any context used by a generation is unprovable, so the result inherits the ceiling. */
function contextIsUnprovable(objects = []) {
    return partitionByProvenance(objects).legacy.length > 0;
}

/**
 * Context a new generation may build on. Retired content is excluded: it is still readable, but it
 * does not get to seed fresh clinical material. Everything else - including ordinary legacy content -
 * stays, because withholding the only material a topic has would degrade the product to improve a
 * metric; the ceiling handles what the result may claim.
 */
function usableAsContext(objects = []) {
    return (Array.isArray(objects) ? objects : []).filter((o) => !isRetired(o));
}

/**
 * Cap a label on content GENERATED FROM the given context objects.
 *
 * The manifest records that the model read this text; this decides what the result may assert about
 * it. If any input's sources cannot be produced, the output cannot claim identifiable source
 * support either - provenance does not improve by being passed through a generation.
 */
function capVerificationForContext(verificationStatus, contextObjects, env = process.env) {
    if (!contextIsUnprovable(contextObjects)) return verificationStatus;
    if (!PROVENANCE_ASSERTING.has(verificationStatus)) return verificationStatus;
    if (lineageEnforcementMode(env) !== 'enforce') {
        recordProvenanceShadowCap('legacy_context', verificationStatus);
        return verificationStatus;
    }
    return 'unverified';
}

module.exports = {
    LEGACY_UNLINKED,
    LEGACY_RETIRED,
    isLegacyUnlinked,
    isRetired,
    usableAsContext,
    isProvable,
    describeProvenance,
    annotateProvenance,
    capVerificationForLegacy,
    capVerificationForContext,
    partitionByProvenance,
    contextIsUnprovable,
};
