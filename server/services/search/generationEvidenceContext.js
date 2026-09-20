'use strict';

/**
 * Evidence lineage for generation (synopsis, quiz, case) and for the attempts made on it.
 *
 * A generation request may carry the id of the search snapshot it was made from. This module
 * turns that into one of four lineage states and, when the snapshot is valid, makes the
 * snapshot's stored text authoritative over whatever the client sent:
 *
 *   linked                  the snapshot is the caller's, replayable, and covers every article used
 *   linked_with_additions   the same, but generation used evidence the search did not show; the
 *                           additions are recorded on the snapshot, not silently merged
 *   unlinked                no snapshot id was supplied (topic-based or legacy client)
 *   invalid                 an id was supplied but is unknown, not the caller's, not replayable,
 *                           or the lookup failed. Never treated as linked.
 *
 * Verification labels are only as strong as the lineage behind them. With
 * EVIDENCE_LINEAGE_ENFORCEMENT=enforce, a provenance label stronger than abstract_only cannot be
 * issued for content whose lineage is not linked. The default is shadow: the state is recorded and
 * reported, labels are unchanged, so turning enforcement on is a measured decision.
 */

const logger = require('../../config/logger');
const {
    getEvidenceSnapshot,
    addEvidenceToSnapshot,
    persistSearchEvidenceSnapshot,
} = require('./searchEvidenceSnapshot');

const LINEAGE_STATUS = Object.freeze({
    LINKED: 'linked',
    LINKED_WITH_ADDITIONS: 'linked_with_additions',
    UNLINKED: 'unlinked',
    INVALID: 'invalid',
});

/** Provenance labels that assert the content is supported by identifiable source text. */
const PROVENANCE_ASSERTING = new Set(['guideline_supported', 'source_verified', 'full_text_available']);

function lineageEnforcementMode(env = process.env) {
    return String(env.EVIDENCE_LINEAGE_ENFORCEMENT || 'shadow').toLowerCase() === 'enforce' ? 'enforce' : 'shadow';
}

function isLinked(lineage) {
    return lineage?.status === LINEAGE_STATUS.LINKED || lineage?.status === LINEAGE_STATUS.LINKED_WITH_ADDITIONS;
}

function articleKey(article) {
    return String(article?.uid || article?.pmid || article?.id || '').trim();
}

/** Rebuild the text fields of an article from the immutable source version it was snapshotted as. */
function applySourceVersion(article, source) {
    if (!source) return article;
    const title = source.passages.find((p) => p.kind === 'title')?.text;
    const abstract = source.passages.filter((p) => p.kind === 'abstract').map((p) => p.text).join(' ');
    return {
        ...article,
        title: title || article.title,
        abstract: abstract || article.abstract,
        _snapshotVersionId: source.id,
        _snapshotAccessState: source.accessState,
    };
}

/**
 * @returns {Promise<{ lineage: { snapshotId: string|null, status: string, sourceVersions: object },
 *                     articles: object[], additions: object[] }>}
 */
async function resolveGenerationEvidence(db, {
    snapshotId = null,
    userId = null,
    sessionId = null,
    articles = [],
    reason = 'generation',
} = {}) {
    const requested = Array.isArray(articles) ? articles : [];
    const unlinked = (status, extra = {}) => ({
        lineage: { snapshotId: null, status, sourceVersions: {}, ...extra },
        articles: requested,
        additions: [],
    });
    const id = String(snapshotId || '').trim();
    if (!id) return unlinked(LINEAGE_STATUS.UNLINKED);

    let found;
    try {
        found = await getEvidenceSnapshot(db, id, { userId, sessionId });
    } catch (err) {
        logger.warn({ err }, 'generation evidence lookup failed');
        return unlinked(LINEAGE_STATUS.INVALID, { reason: 'lookup_failed' });
    }
    if (!found.ok) return unlinked(LINEAGE_STATUS.INVALID, { reason: found.reason });
    const snapshot = found.snapshot;
    if (!snapshot.replayable) return unlinked(LINEAGE_STATUS.INVALID, { reason: 'not_replayable' });

    const byKey = new Map();
    for (const item of snapshot.items) if (item.source) byKey.set(item.uid, item.source);
    for (const item of snapshot.additionalEvidence) if (item.source && !byKey.has(item.uid)) byKey.set(item.uid, item.source);

    const resolved = [];
    const additions = [];
    const sourceVersions = {};
    for (const article of requested) {
        const key = articleKey(article);
        const source = byKey.get(key);
        if (source) {
            resolved.push(applySourceVersion(article, source));
            sourceVersions[key] = source.id;
        } else {
            resolved.push(article);
            additions.push(article);
        }
    }
    if (additions.length) {
        try {
            const added = await addEvidenceToSnapshot(db, id, additions, { userId, sessionId, reason });
            for (const entry of added.added || []) sourceVersions[entry.uid] = entry.versionId;
        } catch (err) {
            logger.warn({ err }, 'recording additional generation evidence failed');
            return unlinked(LINEAGE_STATUS.INVALID, { reason: 'addition_failed' });
        }
    }
    return {
        lineage: {
            snapshotId: id,
            status: additions.length ? LINEAGE_STATUS.LINKED_WITH_ADDITIONS : LINEAGE_STATUS.LINKED,
            sourceVersions,
        },
        articles: resolved,
        additions,
    };
}

/**
 * Topic-based generation (a case built from stored guidelines, a topic quiz) has no search to
 * link to, so it snapshots the evidence it actually uses. Its lineage is 'linked' to that
 * snapshot; the snapshot's origin says it was not produced by a search.
 */
async function snapshotTopicEvidence(db, { topic, articles, userId = null, sessionId = null, origin = 'topic_generation' } = {}) {
    const result = await persistSearchEvidenceSnapshot(db, {
        query: topic,
        queryRepresentation: { version: 1, originalQuery: topic, origin },
        articles,
        userId,
        sessionId,
        origin,
    });
    if (result.status !== 'persisted') {
        return { snapshotId: null, status: LINEAGE_STATUS.INVALID, sourceVersions: {}, reason: result.status };
    }
    return { snapshotId: result.id, status: LINEAGE_STATUS.LINKED, sourceVersions: result.sourceVersions || {} };
}

/** Cap a provenance-asserting label when lineage does not back it and enforcement is on. */
function capVerificationForLineage(verificationStatus, lineage, env = process.env) {
    if (lineageEnforcementMode(env) !== 'enforce') return verificationStatus;
    if (isLinked(lineage)) return verificationStatus;
    return PROVENANCE_ASSERTING.has(verificationStatus) ? 'unverified' : verificationStatus;
}

/** A stored guideline recommendation expressed as an evidence article, so it can be snapshotted. */
function guidelineToEvidenceArticle(guideline = {}) {
    const body = guideline.sourceBody || guideline.source_body || 'Guideline';
    const year = guideline.sourceYear || guideline.source_year || null;
    return {
        uid: `guideline:${guideline.id}`,
        title: `${body}${year ? ` ${year}` : ''} guideline: ${guideline.topic || ''}`.trim(),
        abstract: String(guideline.recommendationText || guideline.recommendation_text || ''),
        source: 'guideline',
        year,
        url: guideline.sourceUrl || guideline.source_url || null,
        pubtype: ['Practice Guideline'],
    };
}

/** Slim form returned to clients and stored on generated content. */
function publicLineage(lineage) {
    return { snapshotId: lineage?.snapshotId || null, status: lineage?.status || LINEAGE_STATUS.UNLINKED };
}

module.exports = {
    LINEAGE_STATUS,
    PROVENANCE_ASSERTING,
    lineageEnforcementMode,
    isLinked,
    resolveGenerationEvidence,
    snapshotTopicEvidence,
    guidelineToEvidenceArticle,
    capVerificationForLineage,
    publicLineage,
};
