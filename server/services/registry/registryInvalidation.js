'use strict';

/**
 * Source-change invalidation: what happens to generated artefacts when the evidence
 * under them changes. Three separate policies, because the clinical consequence differs:
 *
 *   retraction   the source should no longer support anything. Artefacts derived from that
 *                article are WITHDRAWN: excluded from every serving query and never
 *                restored by regeneration or by a later, weaker event.
 *   correction   the source stands but changed. Artefacts derived from it are marked
 *                needs_revision and stay servable until re-verified.
 *   supersession a newer guideline edition replaced an older one. Topic-level artefacts for
 *                the condition (not single-paper ones) are marked needs_revision, and their
 *                claims lose verified status.
 *
 * Nothing here deletes a row: completed learning attempts keep resolving their content by
 * key. Every step reports its own failure. `ok`/`withdrawn` are true only when every write
 * succeeded, so a caller (the durable queue) can retry instead of believing a partial
 * update.
 */

const logger = require('../../config/logger');
const { expandNormalizedTopicKeys } = require('../../utils/topicSynonyms');

const EVENT_TYPES = Object.freeze({
    RETRACTION: 'retraction',
    CORRECTION: 'correction',
    SUPERSESSION: 'supersession',
});

const EVENT_TYPE_ALIASES = Object.freeze({
    retraction: EVENT_TYPES.RETRACTION,
    source_retracted: EVENT_TYPES.RETRACTION,
    correction: EVENT_TYPES.CORRECTION,
    source_corrected: EVENT_TYPES.CORRECTION,
    supersession: EVENT_TYPES.SUPERSESSION,
    registry_edition_superseded: EVENT_TYPES.SUPERSESSION,
});

const WITHDRAWN = 'withdrawn';
const NEEDS_REVISION = 'needs_revision';

function changeCount(result) {
    return Number(result?.changes ?? result?.rowCount ?? 0);
}

function normalizeTopic(value) {
    return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
}

function escapeLike(value) {
    return String(value).replace(/[\\%_]/g, '\\$&');
}

/**
 * The same article is identified as "pubmed-123", "pmid:123" or "123" by different
 * pipelines. Match all of them; matching only the string we were handed silently misses
 * artefacts.
 */
function articleUidVariants(uid) {
    const raw = String(uid || '').trim().toLowerCase();
    if (!raw) return [];
    const variants = new Set([raw]);
    const pmid = raw.match(/^(?:pubmed[-:_]?|pmid[-:_]?)?(\d{4,9})$/);
    if (pmid) {
        const n = pmid[1];
        variants.add(n);
        variants.add(`pubmed-${n}`);
        variants.add(`pmid:${n}`);
        variants.add(`pmid-${n}`);
    }
    return [...variants];
}

function placeholders(list) {
    return list.map(() => '?').join(', ');
}

/** Run one write; record a failure instead of swallowing it. */
async function step(report, name, fn) {
    try {
        return await fn();
    } catch (err) {
        const message = String(err?.message || err).slice(0, 300);
        report.errors.push({ step: name, message });
        logger.warn({ err, step: name, eventType: report.eventType }, 'source invalidation step failed');
        return null;
    }
}

function newReport(eventType, extra = {}) {
    return {
        eventType,
        policy: eventType,
        teachingObjects: 0,
        claims: 0,
        topicKnowledge: 0,
        errors: [],
        ...extra,
    };
}

function finish(report) {
    report.ok = report.errors.length === 0;
    report.withdrawn = report.eventType === EVENT_TYPES.RETRACTION && report.ok;
    return report;
}

function requireDb(db) {
    if (!db || typeof db.run !== 'function') {
        throw new Error('source invalidation requires a database handle with run()');
    }
}

/**
 * Article-scoped update of teaching objects and their claims. `targetState` is never
 * applied over 'withdrawn', and never re-applied over itself, so events are idempotent
 * and cannot restore or downgrade withdrawn content.
 */
async function markArticleArtifacts(db, report, { uids, targetState, unverifyClaims }) {
    const now = new Date().toISOString();
    const inList = placeholders(uids);
    const objectGuard = `review_state NOT IN ('${WITHDRAWN}', ?)`;

    const objects = await step(report, 'teaching_objects', () => db.run(
        `UPDATE teaching_objects
         SET review_state = ?, updated_at = ?
         WHERE ${objectGuard}
           AND lower(COALESCE(article_uid, '')) IN (${inList})`,
        [targetState, now, targetState, ...uids]
    ));
    report.teachingObjects += changeCount(objects);

    const claims = await step(report, 'teaching_object_claims', () => db.run(
        `UPDATE teaching_object_claims
         SET review_state = ?,
             verification_status = CASE WHEN ? = 1 THEN 'unverified' ELSE verification_status END,
             updated_at = ?
         WHERE review_state NOT IN ('${WITHDRAWN}', ?)
           AND (
             lower(COALESCE(article_uid, '')) IN (${inList})
             OR object_key IN (
                 SELECT object_key FROM teaching_objects
                 WHERE lower(COALESCE(article_uid, '')) IN (${inList})
             )
           )`,
        [targetState, unverifyClaims ? 1 : 0, now, targetState, ...uids, ...uids]
    ));
    report.claims += changeCount(claims);
}

/**
 * Topic-level knowledge lists its source articles as JSON. A retraction sends it back for
 * regeneration (needs_revision drops the human-reviewed protection that would otherwise
 * stop a refresh); it is not withdrawn wholesale, because one paper does not void a topic.
 */
async function markTopicKnowledgeCiting(db, report, uids) {
    const now = new Date().toISOString();
    for (const uid of uids) {
        const result = await step(report, 'topic_knowledge', () => db.run(
            `UPDATE topic_knowledge
             SET status = '${NEEDS_REVISION}', updated_at = ?
             WHERE status NOT IN ('${NEEDS_REVISION}', '${WITHDRAWN}')
               AND lower(source_articles) LIKE ? ESCAPE '\\'`,
            [now, `%"${escapeLike(uid)}"%`]
        ));
        report.topicKnowledge += changeCount(result);
    }
}

async function invalidateArtifactsForRetractedSource(db, { articleUid } = {}) {
    requireDb(db);
    const report = newReport(EVENT_TYPES.RETRACTION, { articleUid: articleUid || null });
    const uids = articleUidVariants(articleUid);
    if (!uids.length) {
        report.errors.push({ step: 'validate', message: 'retraction event has no articleUid' });
        return finish(report);
    }
    await markArticleArtifacts(db, report, { uids, targetState: WITHDRAWN, unverifyClaims: true });
    await markTopicKnowledgeCiting(db, report, uids);
    // Cached AI analyses of this article are a cache, not history: drop them so a stale summary
    // of a retracted paper is not replayed. (Search-result caching lives 120s and re-checks
    // retraction status on each search, so it needs no purge.)
    const cached = await step(report, 'analysis_cache', () => db.run(
        `DELETE FROM analysis_cache WHERE lower(article_id) IN (${placeholders(uids)})`,
        uids
    ));
    report.cachedAnalyses = changeCount(cached);
    return finish(report);
}

async function invalidateArtifactsForCorrectedSource(db, { articleUid } = {}) {
    requireDb(db);
    const report = newReport(EVENT_TYPES.CORRECTION, { articleUid: articleUid || null });
    const uids = articleUidVariants(articleUid);
    if (!uids.length) {
        report.errors.push({ step: 'validate', message: 'correction event has no articleUid' });
        return finish(report);
    }
    // Verification is kept: a correction may not touch the cited claim. Review decides.
    await markArticleArtifacts(db, report, { uids, targetState: NEEDS_REVISION, unverifyClaims: false });
    return finish(report);
}

async function invalidateArtifactsForSupersededConcept(db, { normalizedTopic } = {}) {
    requireDb(db);
    const report = newReport(EVENT_TYPES.SUPERSESSION, { normalizedTopic: normalizedTopic || null });
    const topic = normalizeTopic(normalizedTopic);
    if (!topic) {
        report.errors.push({ step: 'validate', message: 'supersession event has no normalizedTopic' });
        return finish(report);
    }
    const keys = expandNormalizedTopicKeys(topic, normalizeTopic).map(normalizeTopic).filter(Boolean);
    const now = new Date().toISOString();
    const inList = placeholders(keys);
    // Artefacts derived from a single article (a paper synopsis, its MCQs) do not become stale
    // because a guideline was reissued. Everything else at topic level (guideline summaries and
    // MCQs, cold-start MCQs, consensus, answers) may cite the old edition, so it is revised.
    const guidelineObjects = `SELECT object_key FROM teaching_objects
         WHERE COALESCE(object_type, '') NOT IN ('paper', 'paper_mcq')
           AND lower(COALESCE(normalized_topic, '')) IN (${inList})`;

    const objects = await step(report, 'teaching_objects', () => db.run(
        `UPDATE teaching_objects
         SET review_state = '${NEEDS_REVISION}', updated_at = ?
         WHERE review_state NOT IN ('${WITHDRAWN}', '${NEEDS_REVISION}')
           AND COALESCE(object_type, '') NOT IN ('paper', 'paper_mcq')
           AND lower(COALESCE(normalized_topic, '')) IN (${inList})`,
        [now, ...keys]
    ));
    report.teachingObjects += changeCount(objects);

    const claims = await step(report, 'teaching_object_claims', () => db.run(
        `UPDATE teaching_object_claims
         SET review_state = '${NEEDS_REVISION}', verification_status = 'unverified', updated_at = ?
         WHERE review_state NOT IN ('${WITHDRAWN}', '${NEEDS_REVISION}')
           AND object_key IN (${guidelineObjects})`,
        [now, ...keys]
    ));
    report.claims += changeCount(claims);
    return finish(report);
}

/**
 * Dispatch a queued event. An unknown type is a failure, not a supersession: the previous
 * default branch treated any unrecognised event as a topic-wide revision.
 */
async function consumeInvalidationEvent(db, event = {}) {
    const raw = String(event.eventType || event.type || '').toLowerCase();
    const type = EVENT_TYPE_ALIASES[raw];
    if (type === EVENT_TYPES.RETRACTION) return invalidateArtifactsForRetractedSource(db, event);
    if (type === EVENT_TYPES.CORRECTION) return invalidateArtifactsForCorrectedSource(db, event);
    if (type === EVENT_TYPES.SUPERSESSION) return invalidateArtifactsForSupersededConcept(db, event);
    const report = newReport(raw || 'unknown');
    report.errors.push({ step: 'dispatch', message: `unknown invalidation event type "${raw}"` });
    return finish(report);
}

/**
 * Explicit, reviewer-attributed reversal of a withdrawal (a false-positive retraction).
 * Content returns as needs_revision, never as verified: it must be re-verified.
 */
async function reinstateWithdrawnArtifacts(db, { articleUid, reviewer } = {}) {
    requireDb(db);
    const report = newReport('reinstatement', { articleUid: articleUid || null, reviewer: reviewer || null });
    const uids = articleUidVariants(articleUid);
    if (!String(reviewer || '').trim()) report.errors.push({ step: 'validate', message: 'reinstatement needs a named reviewer' });
    if (!uids.length) report.errors.push({ step: 'validate', message: 'reinstatement needs an articleUid' });
    if (report.errors.length) return finish(report);

    const now = new Date().toISOString();
    const inList = placeholders(uids);
    const objects = await step(report, 'teaching_objects', () => db.run(
        `UPDATE teaching_objects SET review_state = '${NEEDS_REVISION}', updated_at = ?
         WHERE review_state = '${WITHDRAWN}' AND lower(COALESCE(article_uid, '')) IN (${inList})`,
        [now, ...uids]
    ));
    report.teachingObjects += changeCount(objects);
    const claims = await step(report, 'teaching_object_claims', () => db.run(
        `UPDATE teaching_object_claims SET review_state = '${NEEDS_REVISION}', updated_at = ?
         WHERE review_state = '${WITHDRAWN}'
           AND (
             lower(COALESCE(article_uid, '')) IN (${inList})
             OR object_key IN (
                 SELECT object_key FROM teaching_objects WHERE lower(COALESCE(article_uid, '')) IN (${inList})
             )
           )`,
        [now, ...uids, ...uids]
    ));
    report.claims += changeCount(claims);
    logger.warn({ articleUid, reviewer, ...report }, 'withdrawn artefacts reinstated for re-verification');
    return finish(report);
}

module.exports = {
    EVENT_TYPES,
    WITHDRAWN,
    NEEDS_REVISION,
    articleUidVariants,
    invalidateArtifactsForRetractedSource,
    invalidateArtifactsForCorrectedSource,
    invalidateArtifactsForSupersededConcept,
    consumeInvalidationEvent,
    reinstateWithdrawnArtifacts,
};
