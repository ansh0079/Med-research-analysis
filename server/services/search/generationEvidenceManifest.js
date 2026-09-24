'use strict';

/**
 * The complete manifest of what a generation actually read.
 *
 * Evidence lineage answers "which search snapshot is this quiz from". It does not answer "is the
 * snapshot the whole of what the model saw", and that gap was real: guideline recommendations and
 * teaching-object text (clinical bottom lines, grounded claims, misconception traps) were built into
 * the prompt, while recording them on the snapshot was best-effort - a failure logged a warning and
 * generation continued reporting lineage 'linked'. That claims a replay that cannot happen.
 *
 * This module records every non-article input as an immutable source version alongside the articles,
 * and reports whether the manifest is COMPLETE. An incomplete manifest is not a warning: it is a
 * provenance state that callers must act on, and under enforcement it caps provenance-asserting
 * verification labels exactly as unlinked lineage does.
 */

const logger = require('../../config/logger');
const crypto = require('crypto');
const { addEvidenceToSnapshot, getEvidenceSnapshot, buildSourceVersion } = require('./searchEvidenceSnapshot');
const { PROVENANCE_ASSERTING, lineageEnforcementMode } = require('./generationEvidenceContext');

/** Input kinds a generation can read, beyond the searched articles themselves. */
const INPUT_KINDS = Object.freeze({ GUIDELINE: 'guideline', TEACHING_OBJECT: 'teaching_object' });

function text(value, limit = Infinity) {
    return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, limit);
}

function contextToEvidenceArticle(kind, value) {
    const body = text(JSON.stringify(value));
    const hash = crypto.createHash('sha256').update(body).digest('hex');
    return { uid: `quiz_context:${kind}:${hash}`, title: `Quiz ${kind} context`, abstract: body, source: 'quiz_context' };
}

/**
 * A teaching object as an evidence article, so the same content-addressed store versions it.
 * The abstract is the exact text the prompt builder produces for this object - versioning anything
 * else would record something the model did not read.
 */
function teachingObjectToEvidenceArticle(object = {}, contextText = '') {
    const key = object.objectKey || object.object_key || object.id || object.articleUid || object.topic;
    return {
        uid: `teaching_object:${key}`,
        title: text(object.title || object.topic || `Teaching object ${key}`, 300),
        abstract: text(contextText),
        source: 'teaching_object',
        pubtype: [],
    };
}

/**
 * Record the non-article inputs on the snapshot and report what the generation can prove it read.
 *
 * @returns {Promise<{complete: boolean, inputs: object[], missing: object[], reason: string|null}>}
 */
async function recordGenerationInputs(db, {
    snapshotId = null,
    userId = null,
    sessionId = null,
    guidelines = [],
    teachingObjects = [],
    teachingObjectContext = '',
    communityTopPicks = [],
    topicKnowledge = null,
    claimAnchors = [],
    guidelineToEvidenceArticle,
    reason = 'generation_context',
} = {}) {
    const wanted = [];
    for (const guideline of Array.isArray(guidelines) ? guidelines : []) {
        wanted.push({ kind: INPUT_KINDS.GUIDELINE, article: guidelineToEvidenceArticle(guideline) });
    }
    // Teaching objects reach the model as one built block, so one version covers exactly that text.
    const usedTeaching = (Array.isArray(teachingObjects) ? teachingObjects : []).slice(0, 5);
    if (usedTeaching.length && text(teachingObjectContext)) {
        for (const object of usedTeaching) {
            wanted.push({
                kind: INPUT_KINDS.TEACHING_OBJECT,
                article: teachingObjectToEvidenceArticle(object, teachingObjectContext),
            });
        }
    }
    for (const [kind, value] of [
        ['community', communityTopPicks], ['topic_knowledge', topicKnowledge], ['claim_anchors', claimAnchors],
    ]) {
        if (value != null && (!Array.isArray(value) || value.length)) {
            wanted.push({ kind, article: contextToEvidenceArticle(kind, value) });
        }
    }

    if (!wanted.length) return { complete: true, inputs: [], missing: [], reason: null };
    if (!snapshotId) {
        // Nothing to attach the inputs to. Honest state: the generation read context it cannot prove.
        return {
            complete: false,
            inputs: [],
            missing: wanted.map((w) => ({ kind: w.kind, uid: w.article.uid, reason: 'no_snapshot' })),
            reason: 'no_snapshot',
        };
    }

    const tooLong = wanted.filter((w) => buildSourceVersion(w.article).truncated);
    const recordable = wanted.filter((w) => !tooLong.includes(w));
    try {
        const added = recordable.length
            ? await addEvidenceToSnapshot(db, snapshotId, recordable.map((w) => w.article), { userId, sessionId, reason })
            : { ok: true, added: [] };
        if (added?.ok === false) throw new Error(`snapshot addition rejected: ${added.reason || 'unknown'}`);
        const versionByUid = new Map((added?.added || []).map((entry) => [entry.uid, entry.versionId]));
        if (versionByUid.size < recordable.length) {
            try {
                const found = await getEvidenceSnapshot(db, snapshotId, { userId, sessionId, withSources: false });
                if (found.ok) {
                    for (const entry of found.snapshot.additionalEvidence) versionByUid.set(entry.uid, entry.versionId);
                }
            } catch (err) {
                logger.warn({ err, snapshotId }, 'checking existing generation inputs failed');
            }
        }
        const inputs = [];
        const missing = tooLong.map((w) => ({ kind: w.kind, uid: w.article.uid, reason: 'truncated_source' }));
        for (const { kind, article } of recordable) {
            const versionId = versionByUid.get(article.uid);
            if (versionId) inputs.push({ kind, uid: article.uid, versionId });
            else missing.push({ kind, uid: article.uid, reason: 'not_recorded' });
        }
        return { complete: missing.length === 0, inputs, missing, reason: missing.length ? 'partially_recorded' : null };
    } catch (err) {
        logger.warn({ err, snapshotId }, 'recording generation inputs failed; manifest is incomplete');
        return {
            complete: false,
            inputs: [],
            missing: wanted.map((w) => ({ kind: w.kind, uid: w.article.uid, reason: 'record_failed' })),
            reason: 'record_failed',
        };
    }
}

/**
 * Cap a provenance-asserting label when the manifest is incomplete and enforcement is on.
 *
 * Applied after the lineage cap, not instead of it: linked lineage over an incomplete manifest is
 * still a generation whose inputs cannot all be replayed.
 */
function capVerificationForManifest(verificationStatus, manifest, env = process.env) {
    if (!manifest || manifest.complete !== false) return verificationStatus;
    if (lineageEnforcementMode(env) !== 'enforce') return verificationStatus;
    return PROVENANCE_ASSERTING.has(verificationStatus) ? 'unverified' : verificationStatus;
}

/** The slim form stored on generated content and returned to clients. */
function publicManifest(manifest) {
    if (!manifest) return { complete: true, inputs: 0, missing: [] };
    return {
        complete: Boolean(manifest.complete),
        inputs: manifest.inputs?.length || 0,
        missing: (manifest.missing || []).map((m) => ({ kind: m.kind, reason: m.reason })),
    };
}

module.exports = {
    INPUT_KINDS,
    teachingObjectToEvidenceArticle,
    recordGenerationInputs,
    capVerificationForManifest,
    publicManifest,
};
