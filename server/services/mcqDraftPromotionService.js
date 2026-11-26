'use strict';

/**
 * Review and promotion of evidence-locked MCQ drafts (evidence_locked_mcq_drafts).
 *
 * Drafts are written by the offline evidence pipeline with review_state 'unreviewed' and are never served.
 * The path to learners is:
 *   1. reviewMcqDraft   — a clinician approves, rejects, or asks for changes. Approval re-checks every exact
 *                         quote against stored full text first, so a draft whose source was later quarantined
 *                         or replaced cannot be approved.
 *   2. promoteTopic     — every approved draft for a topic is re-verified again and copied into ONE
 *                         teaching_objects row (object_type 'verified_topic_mcq', review_state 'verified'),
 *                         which the quiz routes serve, including when MCQ_EVIDENCE_GATE=on. The row is rebuilt
 *                         from scratch each time, so a draft rejected after promotion drops out on the next run.
 * Drafts whose quotes no longer verify at promotion are sent back to 'needs_changes' with the reason.
 */

const { verifyExactAnchors, normalizeText } = require('./evidenceLockedMcqDraftService');

const DECISIONS = ['approved', 'rejected', 'needs_changes'];

/**
 * Beta policy: unreviewed drafts that pass the exact-quote check are served to learners, each marked
 * reviewStatus 'needs_review' so the quiz shows a "Needs review" label. Approval flips the label to 'reviewed'.
 * Set MCQ_PROMOTE_UNREVIEWED=off to serve approved drafts only.
 */
const promoteUnreviewedByDefault = () => String(process.env.MCQ_PROMOTE_UNREVIEWED || 'on').toLowerCase() !== 'off';
const normalizeTopic = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
const topicSlug = (value) => normalizeTopic(value).replace(/ /g, '-').slice(0, 200);
const objectKeyFor = (normalizedTopic) => `verified-mcq:${topicSlug(normalizedTopic)}`;

function parse(value, fallback) {
    try { return typeof value === 'string' ? JSON.parse(value) : (value ?? fallback); } catch { return fallback; }
}

function mapDraft(row) {
    if (!row) return null;
    return {
        id: row.id,
        draftKey: row.draft_key,
        batchId: row.batch_id,
        topic: row.topic,
        normalizedTopic: row.normalized_topic,
        curriculumTopicId: row.curriculum_topic_id || null,
        question: parse(row.replacement_payload, {}),
        documentIds: parse(row.guideline_document_ids, []),
        validationStatus: row.validation_status,
        reviewState: row.review_state,
        reviewerNotes: row.reviewer_notes || null,
        reviewedBy: row.reviewed_by || null,
        reviewedAt: row.reviewed_at || null,
        promotedAt: row.promoted_at || null,
        promotedObjectKey: row.promoted_object_key || null,
    };
}

async function listMcqDrafts(db, { state = '', topic = '', limit = 50, offset = 0 } = {}) {
    const where = [];
    const params = [];
    if (state) { where.push('review_state = ?'); params.push(String(state)); }
    if (topic) { where.push('normalized_topic LIKE ?'); params.push(`%${normalizeTopic(topic)}%`); }
    const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const rows = await db.all(
        `SELECT * FROM evidence_locked_mcq_drafts ${clause} ORDER BY normalized_topic, id LIMIT ? OFFSET ?`,
        [...params, limit, offset],
    );
    const counts = await db.all('SELECT review_state, COUNT(*) AS n FROM evidence_locked_mcq_drafts GROUP BY review_state');
    return {
        items: rows.map(mapDraft),
        counts: Object.fromEntries(counts.map((c) => [c.review_state, Number(c.n)])),
    };
}

async function getMcqDraft(db, draftId) {
    return mapDraft(await db.get('SELECT * FROM evidence_locked_mcq_drafts WHERE id = ?', [Number(draftId)]));
}

/** Build the stored question served by the quiz routes from a verified draft. */
function toServedQuestion(draft, documents) {
    const q = draft.question;
    const docOf = (anchor) => documents.get(String(anchor.documentId)) || {};
    const anchors = [
        { ...q.answerEvidenceAnchor, role: 'answer' },
        ...(q.explanationEvidenceAnchors || []).map((a) => ({ ...a, role: 'explanation' })),
    ].map((a) => ({ documentId: Number(a.documentId), pmid: docOf(a).pmid || null, exactQuote: normalizeText(a.exactQuote), role: a.role }));
    const sourceRefs = [];
    for (const doc of documents.values()) {
        if (!doc) continue;
        sourceRefs.push({
            documentId: Number(doc.id), pmid: doc.pmid || null, pmcid: doc.pmcid || null,
            doi: doc.doi || null, title: doc.title || null, sourceUrl: doc.source_url || null,
        });
    }
    return {
        id: `elmcq:${String(draft.draftKey).slice(0, 16)}`,
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        difficulty: q.difficulty || 'medium',
        questionType: q.questionType || 'guideline',
        sourceRefs,
        evidenceAnchors: anchors,
        draftKey: draft.draftKey,
        // 'needs_review' until a clinician approves the draft; the learner UI labels it accordingly.
        reviewStatus: draft.reviewState === 'approved' ? 'reviewed' : 'needs_review',
        reviewedBy: draft.reviewedBy,
        reviewedAt: draft.reviewedAt,
    };
}

/**
 * Rebuild the live verified_topic_mcq object for one topic from its approved drafts.
 * @returns {{objectKey:string, promoted:number, sentBack:Array<{id:number, errors:string[]}>}}
 */
async function promoteTopic(db, { normalizedTopic, now = new Date().toISOString(), apply = true, includeUnreviewed = promoteUnreviewedByDefault() }) {
    const key = normalizeTopic(normalizedTopic);
    if (!key) throw new Error('Invalid topic');
    const states = includeUnreviewed ? "('approved', 'unreviewed')" : "('approved')";
    const rows = await db.all(
        `SELECT * FROM evidence_locked_mcq_drafts WHERE normalized_topic = ? AND review_state IN ${states} ORDER BY id`,
        [key],
    );
    const objectKey = objectKeyFor(key);
    const questions = [];
    const promotedIds = [];
    const sentBack = [];
    for (const draft of rows.map(mapDraft)) {
        const check = await verifyExactAnchors(db, draft.question);
        if (!check.ok) { sentBack.push({ id: draft.id, errors: check.errors }); continue; }
        questions.push(toServedQuestion(draft, check.documents));
        promotedIds.push(draft.id);
    }
    const existing = await db.get('SELECT id FROM teaching_objects WHERE object_key = ?', [objectKey]);
    if (!apply) return { objectKey, promoted: questions.length, sentBack, wouldWrite: questions.length > 0 || Boolean(existing) };

    for (const item of sentBack) {
        await db.run(
            `UPDATE evidence_locked_mcq_drafts SET review_state = 'needs_changes', reviewer_notes = ?, promoted_at = NULL,
                promoted_object_key = NULL, updated_at = ? WHERE id = ?`,
            [`Promotion check failed ${now.slice(0, 10)}: ${item.errors.join('; ')}`.slice(0, 4000), now, item.id],
        );
    }
    if (!questions.length && !existing) return { objectKey, promoted: 0, sentBack };

    const displayName = rows[0]?.topic || key;
    const payload = {
        topicKey: topicSlug(key),
        topicDisplayName: displayName,
        coverageNote: questions.some((q) => q.reviewStatus === 'needs_review')
            ? 'Every answer and explanation is anchored to an exact quote from stored full text. Questions marked needs_review have not yet been checked by a clinician.'
            : 'Clinician-approved questions; every answer and explanation is anchored to an exact quote from stored full text.',
        source: 'evidence_locked_mcq_drafts',
        promotedAt: now,
        mcqs: questions,
    };
    await db.upsertTeachingObject({
        objectKey,
        objectType: 'verified_topic_mcq',
        topic: displayName,
        provider: 'evidence_locked_review',
        model: null,
        confidence: 0.9,
        payload,
        // An emptied topic (every draft rejected) is parked rather than served.
        reviewState: questions.length ? 'verified' : 'needs_revision',
        generatedAt: now,
    });
    const curriculumTopicId = rows.find((r) => r.curriculum_topic_id)?.curriculum_topic_id;
    if (curriculumTopicId) {
        await db.run('UPDATE teaching_objects SET curriculum_topic_id = ? WHERE object_key = ? AND curriculum_topic_id IS NULL',
            [curriculumTopicId, objectKey]).catch(() => null);
    }
    if (promotedIds.length) {
        const marks = promotedIds.map(() => '?').join(', ');
        await db.run(
            `UPDATE evidence_locked_mcq_drafts SET promoted_at = ?, promoted_object_key = ?, updated_at = ? WHERE id IN (${marks})`,
            [now, objectKey, now, ...promotedIds],
        );
    }
    return { objectKey, promoted: questions.length, sentBack };
}

/**
 * Record a clinician decision. Approval requires the quotes to verify now. A decision that removes a draft
 * already promoted rebuilds that topic's live object so the question stops being served.
 */
async function reviewMcqDraft(db, { draftId, decision, notes = '', userId = null, now = new Date().toISOString() }) {
    if (!DECISIONS.includes(decision)) throw new Error(`Invalid decision: ${decision}`);
    const draft = await getMcqDraft(db, draftId);
    if (!draft) throw new Error('Draft not found');
    if (decision === 'approved') {
        const check = await verifyExactAnchors(db, draft.question);
        if (!check.ok) throw new Error(`Invalid state: evidence no longer verifies (${check.errors.slice(0, 3).join('; ')})`);
    }
    await db.run(
        `UPDATE evidence_locked_mcq_drafts SET review_state = ?, reviewer_notes = ?, reviewed_by = ?, reviewed_at = ?, updated_at = ?
         WHERE id = ?`,
        [decision, String(notes || '').slice(0, 4000) || null, userId == null ? null : String(userId), now, now, draft.id],
    );
    let promotion = null;
    if (decision !== 'approved' && draft.promotedObjectKey) {
        await db.run('UPDATE evidence_locked_mcq_drafts SET promoted_at = NULL, promoted_object_key = NULL WHERE id = ?', [draft.id]);
        promotion = await promoteTopic(db, { normalizedTopic: draft.normalizedTopic, now });
    }
    return { draft: await getMcqDraft(db, draft.id), promotion };
}

/** Promote every topic that has approved drafts not yet copied into a live object. */
async function promotePendingTopics(db, { now = new Date().toISOString(), apply = true, topic = '', includeUnreviewed = promoteUnreviewedByDefault() } = {}) {
    const params = [];
    let filter = '';
    if (topic) { filter = 'AND normalized_topic = ?'; params.push(normalizeTopic(topic)); }
    const topics = await db.all(
        `SELECT DISTINCT normalized_topic FROM evidence_locked_mcq_drafts
         WHERE review_state IN ${includeUnreviewed ? "('approved', 'unreviewed')" : "('approved')"} AND promoted_at IS NULL ${filter} ORDER BY normalized_topic`,
        params,
    );
    const results = [];
    for (const row of topics) results.push(await promoteTopic(db, { normalizedTopic: row.normalized_topic, now, apply, includeUnreviewed }));
    return {
        topics: results.length,
        promoted: results.reduce((n, r) => n + r.promoted, 0),
        sentBack: results.reduce((n, r) => n + r.sentBack.length, 0),
        results,
    };
}

module.exports = {
    DECISIONS, listMcqDrafts, getMcqDraft, reviewMcqDraft, promoteTopic, promotePendingTopics, objectKeyFor, toServedQuestion,
};
