'use strict';

// A shared pool of evidence-quiz questions.
//
// Questions written for one learner's search are stored once, under the topic plus the set of papers
// they were written from, and every later learner on the same evidence is served from the pool. A
// learner is only ever shown questions they have not answered, and the model is only asked for the
// shortfall. The same papers therefore cost one generation, not one per person.
//
// The pool holds questions, not people: nothing here records who a question was written for.
// Grading stays per-serve (each served question gets its own signed token), so sharing a question
// shares its content, never an answer commitment.

const crypto = require('crypto');
const { teachingObjectTopicSlug } = require('../../utils/teachingObjectKeys');

// Stored as a live_quiz_mcq so the write policy's item gates apply and the topic quiz can serve it too.
const POOL_OBJECT_TYPE = 'live_quiz_mcq';
const POOL_MAX_QUESTIONS = 40;
const POOL_MAX_AGE_DAYS = Number(process.env.QUIZ_BATCH_REUSE_MAX_AGE_DAYS) > 0
    ? Number(process.env.QUIZ_BATCH_REUSE_MAX_AGE_DAYS)
    : 30;

const sha = (text) => crypto.createHash('sha256').update(String(text)).digest('hex');

/** Wording-insensitive identity for a question stem, so a paraphrased-in-case copy is still the same question. */
function questionFingerprint(text) {
    const normalised = String(text || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    return normalised ? sha(normalised).slice(0, 20) : '';
}

/** One pool per topic and evidence set; the same papers in any order are the same pool. */
function poolKey(db, topic, articles = []) {
    const ids = [...new Set((articles || [])
        .map((a) => String(a?.uid || a?.pmid || a?.doi || '').trim().toLowerCase())
        .filter(Boolean))].sort();
    return `quiz-pool:${teachingObjectTopicSlug(db, topic)}:${sha(ids.join('|')).slice(0, 16)}`.slice(0, 240);
}

/** Pooled questions that are still fresh. A withdrawn pool (retracted source) serves nothing. */
async function loadPool(db, key, { now = Date.now(), maxAgeDays = POOL_MAX_AGE_DAYS } = {}) {
    if (!db?.getTeachingObjectByKey || !key) return [];
    const object = await db.getTeachingObjectByKey(key).catch(() => null);
    if (!object || object.reviewState === 'withdrawn') return [];
    const stored = Array.isArray(object.payload?.mcqs) ? object.payload.mcqs : [];
    return stored.filter((q) => {
        const at = Date.parse(q?.poolGeneratedAt || '');
        return q?.question && q?.correctAnswer && Number.isFinite(at) && (now - at) / 86400000 <= maxAgeDays;
    });
}

/** Fingerprints of what this learner has already answered on the topic, plus what the client says it holds. */
async function seenFingerprints(db, { userId, topic, shown = [] } = {}) {
    const seen = new Set((shown || []).map(questionFingerprint).filter(Boolean));
    if (userId && typeof db?.getQuizAttempts === 'function') {
        const attempts = await db.getQuizAttempts({ userId, topic, limit: 200 }).catch(() => []);
        for (const attempt of attempts) seen.add(questionFingerprint(attempt.questionText || attempt.question_text));
    }
    seen.delete('');
    return seen;
}

function unseenQuestions(pool, seen) {
    return pool.filter((q) => !seen.has(questionFingerprint(q.question)));
}

/** A pooled question as it is served: its stable id is the pool's, so every learner's attempt joins up. */
function asPoolQuestion(question, now = Date.now()) {
    const fingerprint = questionFingerprint(question.question);
    return {
        ...question,
        id: `pool_${fingerprint}`,
        poolGeneratedAt: question.poolGeneratedAt || new Date(now).toISOString(),
    };
}

/**
 * Add new questions to the pool, dropping repeats and keeping the newest POOL_MAX_QUESTIONS.
 * Two learners writing at once can overwrite each other's additions; the loser's questions are
 * simply regenerated later, so this does not take a lock.
 */
async function addToPool(db, key, { topic, questions, provider, model, confidence, evidenceLineage, manifestComplete } = {}) {
    if (!db?.upsertTeachingObject || !key || !questions?.length) return 0;
    const existing = await loadPool(db, key);
    const byFingerprint = new Map(existing.map((q) => [questionFingerprint(q.question), q]));
    let added = 0;
    // One timestamp per batch: questions written together keep the order they were written in.
    const now = Date.now();
    for (const question of questions) {
        const fingerprint = questionFingerprint(question.question);
        if (!fingerprint || byFingerprint.has(fingerprint)) continue;
        byFingerprint.set(fingerprint, asPoolQuestion(question, now));
        added += 1;
    }
    if (added === 0) return 0;
    const merged = [...byFingerprint.values()]
        .sort((a, b) => Date.parse(b.poolGeneratedAt) - Date.parse(a.poolGeneratedAt))
        .slice(0, POOL_MAX_QUESTIONS);
    await db.upsertTeachingObject({
        objectKey: key,
        objectType: POOL_OBJECT_TYPE,
        normalizedTopic: db.normalizeTopic(topic),
        topic,
        title: `Shared quiz questions: ${topic}`,
        payload: { mcqs: merged, sharedPool: true, cacheScopeUserId: null, generatedAt: new Date().toISOString() },
        provider,
        model,
        confidence,
        evidenceSnapshotId: evidenceLineage?.snapshotId || null,
        lineageStatus: evidenceLineage?.status || null,
        manifestComplete: Boolean(manifestComplete),
    });
    return added;
}

module.exports = {
    POOL_OBJECT_TYPE,
    POOL_MAX_QUESTIONS,
    questionFingerprint,
    poolKey,
    loadPool,
    seenFingerprints,
    unseenQuestions,
    asPoolQuestion,
    addToPool,
};
