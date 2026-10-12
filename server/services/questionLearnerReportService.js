'use strict';

const crypto = require('crypto');

function reject(message) {
    const error = new Error(message);
    error.status = 400;
    return error;
}

function hasSourceUrl(value) {
    return /^https?:\/\/\S+$/i.test(String(value || '').trim());
}

/**
 * Store a learner's topic suggestion, or an answer challenge that includes a source.
 * Neither report rewrites the question.
 */
async function recordLearnerReport(db, input = {}) {
    const kind = input.kind;
    if (kind !== 'topic_suggestion' && kind !== 'answer_challenge') {
        throw reject('Choose a topic suggestion or an answer challenge');
    }
    const questionId = String(input.questionId || '').trim();
    if (!questionId) throw reject('Question is missing');
    const suggestedTopic = String(input.suggestedTopic || '').trim().slice(0, 200);
    const suggestedAnswer = String(input.suggestedAnswer || '').trim().toUpperCase();
    const evidenceText = String(input.evidenceText || '').trim().slice(0, 2000);
    const evidenceUrl = String(input.evidenceUrl || '').trim().slice(0, 500);
    if (kind === 'topic_suggestion') {
        if (suggestedTopic.length < 3) throw reject('Name the topic you think this question belongs to');
    } else {
        if (!/^[A-E]$/.test(suggestedAnswer)) throw reject('Choose the answer you think is right');
        if (!hasSourceUrl(evidenceUrl) && evidenceText.length < 40) {
            throw reject('Add a link or a short quotation from a guideline or paper');
        }
    }
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.run(
        `INSERT INTO question_learner_reports (
            id, user_id, question_id, kind, current_topic, suggested_topic, suggested_answer,
            evidence_text, evidence_url, created_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            id,
            input.userId || null,
            questionId.slice(0, 300),
            kind,
            input.currentTopic ? String(input.currentTopic).slice(0, 200) : null,
            kind === 'topic_suggestion' ? suggestedTopic : null,
            kind === 'answer_challenge' ? suggestedAnswer : null,
            evidenceText || null,
            evidenceUrl || null,
            now,
        ],
    );
    return { id };
}

module.exports = { recordLearnerReport };
