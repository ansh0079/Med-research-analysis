'use strict';

/**
 * Apply human MCQ review outcomes:
 * - Withdraw: hide unsafe/unsupported/ambiguous questions without hard-deleting; record reason.
 * - Correct: fix wrong answers with suggested answer and rewritten explanation; record before/after.
 *
 * Modes:
 *   node server/scripts/applyMcqReviewEdits.js --data /review/review.json --dry-run
 *   node server/scripts/applyMcqReviewEdits.js --data /review/review.json --apply
 *
 * The data file format:
 * {
 *   "withdrawals": [{ "questionId": "guideline-mcq:topic-slug#3", "verdict": "Unsupported", "reason": "Low textual support", "notes": "..." }, ...],
 *   "corrections": [{
 *     "questionId": "paper-mcq:topic-slug#1",
 *     "verdict": "Wrong answer",
 *     "notes": "Brief reviewer note justifying the change",
 *     "suggestedAnswer": "B",               // letter A..E or exact option text
 *     "source": "NICE NG156 (2020) ...",    // current source text or url
 *     "stemFix": null                       // optional minimal new stem text; when present replaces the stored stem
 *   }, ...]
 * }
 *

 * Optional correction fields: newExplanation (up to 1500 chars), fullOptions (["A: ...", ...] replaces all options).
 * Optional "topicAssignments": [{ questionId, topicName, reviewState, notes }] sets question_topic_index topic by
 * exact curriculum_topics.display_name (case-insensitive); unresolved names are reported, never guessed.
 * --dry-run performs no writes.
 *
 * Idempotent: running --apply twice makes no further changes.
 * Writes are strictly per-question; batches are never withdrawn wholesale.
 */

const fs = require('fs');
const path = require('path');
const { loadEnv } = require('../../config');
loadEnv();
const db = require('../../database');
const { logAudit, AUDIT_ACTIONS } = require('../services/auditLogService');
const { questionHash } = require('../services/questionIndex/questionIndexService');
const { contentHash } = require('../services/questionAudit/questionAuditService');

function parseArgs(argv = process.argv.slice(2)) {
    const args = new Set(argv);
    const dataIdx = argv.indexOf('--data');
    const data = dataIdx >= 0 ? argv[dataIdx + 1] : null;
    const mode = args.has('--apply') ? 'apply' : 'dry-run';
    if (!data || !fs.existsSync(data)) {
        throw new Error('Missing --data <path-to-json> (see header comment for format).');
    }
    return { dataPath: data, apply: mode === 'apply' };
}

function parseQuestionId(id) {
    const raw = String(id || '').trim();
    const m = raw.match(/^(.*?):(.+?)(?:#(\d+))?$/); // type:key#idx
    if (!m) return null;
    const objectKey = `${m[1]}:${m[2]}`;
    const index = m[3] == null ? null : parseInt(m[3], 10);
    return { objectKey, index };
}

async function findTeachingObjectForId(objectKey, index) {
    // Exact key first
    let row = await db.get('SELECT object_key, object_payload, review_state FROM teaching_objects WHERE object_key = ?', [objectKey]).catch(() => null);
    if (!row) {
        // Fuzzy: object_key LIKE 'prefix-%'
        const like = objectKey + '%';
        const candidates = await db.all('SELECT object_key, object_payload, review_state FROM teaching_objects WHERE object_key LIKE ?', [like]).catch(() => []);
        // Heuristic: choose the first that has an mcqs[index]
        for (const cand of candidates) {
            try {
                const p = JSON.parse(cand.object_payload || '{}');
                if (Array.isArray(p.mcqs) && index != null && p.mcqs[index]) { row = cand; break; }
            } catch { /* ignore */ }
        }
        // Fallback: pick the first candidate
        if (!row && candidates.length) row = candidates[0];
    }
    if (!row) return null;
    let payload;
    try { payload = JSON.parse(row.object_payload || '{}'); } catch { payload = {}; }
    return { objectKey: row.object_key, reviewState: row.review_state || 'unreviewed', payload };
}

function sanitizeExplanation(notes, source) {
    const parts = [];
    const n = String(notes || '').trim();
    const s = String(source || '').trim();
    if (n) parts.push(n);
    if (s) parts.push(`Source: ${s}`);
    const text = parts.join(' ');
    return text.slice(0, 700); // keep concise
}

function coerceLetter(value) {
    const v = String(value || '').trim();
    if (/^[A-E]$/i.test(v)) return v.toUpperCase();
    // Select-all-that-apply: "A,C" (any order/spacing) becomes the canonical sorted list.
    const parts = v.split(/[\s,;&]+/).filter(Boolean);
    if (parts.length > 1 && parts.every((p) => /^[A-E]$/i.test(p))) {
        return [...new Set(parts.map((p) => p.toUpperCase()))].sort().join(',');
    }
    return null;
}

function ensureOptionContainsCorrectAnswer(options, suggestedAnswer) {
    const letters = ['A', 'B', 'C', 'D', 'E'];
    const opts = Array.isArray(options) ? options.slice() : [];
    const letter = coerceLetter(suggestedAnswer);
    if (letter && letter.includes(',')) {
        // Every keyed letter must exist as an option; nothing is invented for a multi-answer key.
        const missing = letter.split(',').filter((l) => !opts[letters.indexOf(l)] || !String(opts[letters.indexOf(l)]).startsWith(`${l}:`));
        return { options: opts, changed: false, note: missing.length ? `Multi-answer key references missing options: ${missing.join(',')}` : null };
    }
    if (letter && letters.includes(letter)) {
        // Ensure "L: ..." exists and keep other options intact.
        const idx = letters.indexOf(letter);
        if (!opts[idx] || !String(opts[idx]).startsWith(`${letter}:`)) {
            const label = `${letter}: ${letter}`;
            // Replace or append to reach 5 options
            while (opts.length < 5) opts.push(`${letters[opts.length]}: `);
            opts[idx] = label;
            return { options: opts, changed: true, note: `Inserted placeholder for option ${letter}` };
        }
        return { options: opts, changed: false, note: null };
    }
    // Non-letter text: try to find and set the correct option to match
    const text = String(suggestedAnswer || '').trim();
    const found = opts.findIndex((o) => String(o || '').toLowerCase().includes(text.toLowerCase()));
    if (found >= 0) {
        const L = letters[found];
        return { options: opts, changed: false, note: null, coercedLetter: L };
    }
    // Replace the last option minimally.
    while (opts.length < 5) opts.push(`${letters[opts.length]}: `);
    const last = 4;
    opts[last] = `${letters[last]}: ${text}`;
    return { options: opts, changed: true, note: `Replaced option ${letters[last]} to add suggested answer text`, coercedLetter: letters[last] };
}

async function applyWithdraw(objectKey, index, questionId, verdict, reason, notes, { apply }) {
    const found = await findTeachingObjectForId(objectKey, index);
    if (!found) return { matched: false, details: 'object_not_found' };
    const mcqs = Array.isArray(found.payload?.mcqs) ? found.payload.mcqs : [];
    if (index == null || index < 0 || index >= mcqs.length) return { matched: false, details: 'index_out_of_range' };
    const q = mcqs[index];
    if (!q?.question) return { matched: false, details: 'question_missing' };
    const qhash = questionHash(q);
    if (apply) {
        // Idempotent insert ignore
        await db.run(
            `INSERT INTO mcq_review_overrides
                (question_id, object_key, question_index, action, verdict, reason, notes, question_hash, applied_at, applied_by)
             VALUES (?, ?, ?, 'withdraw', ?, ?, ?, ?, ?, ?)
             ON CONFLICT(question_id) DO NOTHING`,
            [questionId, found.objectKey, index, verdict || null, reason || null, notes || null, qhash || null, new Date().toISOString(), 'workflow:apply-mcq-review']
        ).catch(() => null);
        // Mark the specific assignment as retired when present
        await db.run(
            `UPDATE question_topic_index SET review_state = 'retired', category = 'unassignable'
             WHERE object_key = ? AND question_index = ?`,
            [found.objectKey, index]
        ).catch(() => null);
        const now = new Date().toISOString();
        await db.run(
            `UPDATE question_work_queue SET status = 'retired', completed_at = ?, updated_at = ?
             WHERE object_key = ? AND question_index = ? AND cohort = 'topic_repair'`,
            [now, now, found.objectKey, index]
        ).catch(() => null);
        await db.run(
            `UPDATE question_audit SET human_decision = 'retired', human_notes = ?, reviewed_by = ?, reviewed_at = ?,
             status = 'human_retired', question_hash = ?, content_hash = ?, updated_at = ?
             WHERE object_key = ? AND question_index = ?`,
            [notes || reason || verdict || null, 'workflow:apply-mcq-review', now, qhash, contentHash(q), now, found.objectKey, index]
        ).catch(() => null);
        await logAudit(db, {
            userId: null,
            action: AUDIT_ACTIONS.DATA_IMPORTED,
            resourceType: 'mcq',
            resourceId: questionId,
            changes: null,
            metadata: { action: 'withdraw', objectKey: found.objectKey, questionIndex: index, verdict, reason },
            severity: 'high',
        }).catch(() => {});
    }
    return { matched: true, details: 'ok' };
}

async function applyCorrection(objectKey, index, questionId, verdict, notes, suggestedAnswer, source, stemFix, { apply, newExplanation = null, optionReplacement = null, optionEdits = [], fullOptions = null }) {
    const found = await findTeachingObjectForId(objectKey, index);
    if (!found) return { matched: false, details: 'object_not_found' };
    const mcqs = Array.isArray(found.payload?.mcqs) ? found.payload.mcqs : [];
    if (index == null || index < 0 || index >= mcqs.length) return { matched: false, details: 'index_out_of_range' };
    const before = mcqs[index];
    if (!before?.question) return { matched: false, details: 'question_missing' };

    // New explanation
    const computedExplanation = newExplanation && String(newExplanation).trim()
        ? String(newExplanation).trim().slice(0, 1500)
        : sanitizeExplanation(notes, source);
    // Ensure options carry the suggested answer; coerce non-letter to a letter slot when needed.
    // Apply explicit option edits first, then ensure the suggested answer exists.
    const letters = ['A', 'B', 'C', 'D', 'E'];
    const workingOptions = Array.isArray(fullOptions) && fullOptions.length ? fullOptions.map((o) => String(o)) : (Array.isArray(before.options) ? before.options.slice() : []);
    if (Array.isArray(optionEdits) && optionEdits.length) {
        for (const edit of optionEdits) {
            const L = coerceLetter(edit?.letter);
            const text = String(edit?.after || '').trim();
            if (!L || !text) continue;
            const idx = letters.indexOf(L);
            // Pad only up to the edited index when the slot does not exist; do not append extra options.
            while (workingOptions.length <= idx) {
                workingOptions.push(`${letters[workingOptions.length]}: `);
            }
            workingOptions[idx] = `${L}: ${text}`;
        }
    }
    let fixed = ensureOptionContainsCorrectAnswer(workingOptions, suggestedAnswer);
    // If input specifies an explicit option replacement, prefer that.
    if (optionReplacement && coerceLetter(optionReplacement.letter) && String(optionReplacement.text || '').trim()) {
        const L = coerceLetter(optionReplacement.letter);
        const letters = ['A', 'B', 'C', 'D', 'E'];
        const opts = Array.isArray(before.options) ? before.options.slice() : [];
        const idx = letters.indexOf(L);
        // Pad only up to the replacement index when needed.
        while (opts.length <= idx) {
            opts.push(`${letters[opts.length]}: `);
        }
        opts[idx] = `${L}: ${String(optionReplacement.text).trim()}`;
        fixed = { options: opts, changed: true, note: `Replaced option ${L} to add suggested answer text`, coercedLetter: L };
    }
    const correctLetter = coerceLetter(suggestedAnswer) || fixed.coercedLetter || before.correctAnswer || 'A';
    const optionsChanged = Boolean(fixed.changed);
    const optionChangeNote = fixed.note || null;

    const after = {
        ...before,
        question: stemFix && String(stemFix || '').trim() ? String(stemFix).trim() : before.question,
        options: fixed.options,
        correctAnswer: correctLetter,
        explanation: computedExplanation || before.explanation || '',
    };
    if (correctLetter.includes(',')) after.multiAnswer = true;
    else delete after.multiAnswer;

    const qhash = questionHash(before);
    const newQhash = questionHash(after);

    if (apply) {
        // Write teaching_objects (upsert through mixin path is not available here; keep payload shape intact)
        const newPayload = { ...found.payload };
        newPayload.mcqs = mcqs.slice();
        newPayload.mcqs[index] = after;
        await db.run(
            `UPDATE teaching_objects SET object_payload = ?, updated_at = ? WHERE object_key = ?`,
            [JSON.stringify(newPayload), new Date().toISOString(), found.objectKey]
        );
        await db.run(
            `UPDATE question_topic_index SET question_hash = ? WHERE object_key = ? AND question_index = ?`,
            [newQhash, found.objectKey, index]
        ).catch(() => null);
        // Record override/audit snapshot
        await db.run(
            `INSERT INTO mcq_review_overrides
                (question_id, object_key, question_index, action, verdict, reason, notes, suggested_answer, new_explanation,
                 old_question_json, new_question_json, question_hash, applied_at, applied_by)
             VALUES (?, ?, ?, 'correct', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(question_id) DO UPDATE SET
                suggested_answer = excluded.suggested_answer,
                new_explanation = excluded.new_explanation,
                new_question_json = excluded.new_question_json,
                question_hash = excluded.question_hash,
                applied_at = excluded.applied_at`,
            [
                questionId, found.objectKey, index,
                verdict || null, (notes || optionChangeNote) || null, null,
                correctLetter, computedExplanation,
                JSON.stringify(before), JSON.stringify(after),
                newQhash, new Date().toISOString(), 'workflow:apply-mcq-review',
            ]
        ).catch(() => null);
        await logAudit(db, {
            userId: null,
            action: AUDIT_ACTIONS.DATA_IMPORTED,
            resourceType: 'mcq',
            resourceId: questionId,
            changes: { before, after, fields: ['question', 'options', 'correctAnswer', 'explanation'] },
            metadata: { action: 'correct', objectKey: found.objectKey, questionIndex: index, optionChangeNote },
            severity: 'high',
        }).catch(() => {});
    }
    return { matched: true, details: optionsChanged ? 'option_adjusted' : 'ok' };
}

async function applyTopicAssignment(parsed, topicName, reviewState, notes, { apply, createIfMissing = false, block = null }) {
    const found = await findTeachingObjectForId(parsed.objectKey, parsed.index);
    if (!found) return { resolved: false, details: 'object_not_found' };
    const indexRow = await db.get(
        'SELECT assigned_curriculum_topic_id FROM question_topic_index WHERE object_key = ? AND question_index = ?',
        [found.objectKey, parsed.index]
    ).catch(() => null);
    if (!indexRow) return { resolved: false, details: 'index_row_not_found' };

    let topic = await db.get(
        'SELECT id, display_name FROM curriculum_topics WHERE LOWER(display_name) = LOWER(?)',
        [String(topicName || '').trim()]
    ).catch(() => null);
    let created = false;
    if (!topic && createIfMissing) {
        if (!apply) return { resolved: true, details: 'would_create_topic', created: true };
        let blockName = String(block || '').trim();
        if (!blockName) {
            const current = await db.get(
                `SELECT b.name AS block_name FROM curriculum_topics t
                 LEFT JOIN curriculum_blocks b ON b.id = t.block_id
                 WHERE CAST(t.id AS TEXT) = ?`,
                [String(indexRow.assigned_curriculum_topic_id || '')]
            ).catch(() => null);
            blockName = current?.block_name || 'General Medicine';
        }
        if (typeof db.upsertCurriculumSeedTopic !== 'function') return { resolved: false, details: 'topic_create_unavailable' };
        await db.upsertCurriculumSeedTopic({
            displayName: String(topicName).trim(), suggestedQuery: String(topicName).trim(), block: blockName,
            sortOrder: 3000, priority: 'medium', volatility: 'moderate', seedStatus: 'not_seeded',
        });
        topic = await db.get(
            'SELECT id, display_name FROM curriculum_topics WHERE LOWER(display_name) = LOWER(?)',
            [String(topicName || '').trim()]
        ).catch(() => null);
        created = Boolean(topic);
    }
    if (!topic) return { resolved: false, details: 'topic_not_found' };

    if (apply) {
        const now = new Date().toISOString();
        const cluster = await db.get('SELECT cluster_id FROM topic_cluster_index WHERE curriculum_topic_id = ?', [String(topic.id)]).catch(() => null);
        await db.run(
            `UPDATE question_topic_index SET review_state = ?, reviewed_by = ?, reviewed_at = ?, review_notes = ?,
             assigned_curriculum_topic_id = ?, assigned_topic_name = ?, assigned_cluster_id = ?, category = 'aligned'
             WHERE object_key = ? AND question_index = ?`,
            [reviewState || 'approved', 'workflow:apply-mcq-review', now, notes || null,
                String(topic.id), topic.display_name, cluster?.cluster_id || String(topic.id), found.objectKey, parsed.index]
        );
        await db.run(
            `UPDATE question_work_queue SET status = 'repaired', completed_at = ?, updated_at = ?
             WHERE object_key = ? AND question_index = ? AND cohort = 'topic_repair'`,
            [now, now, found.objectKey, parsed.index]
        ).catch(() => null);
        const currentQuestion = found.payload?.mcqs?.[parsed.index];
        if (currentQuestion?.question) {
            await db.run(
                `UPDATE question_audit SET human_decision = 'approved', human_notes = ?, reviewed_by = ?, reviewed_at = ?,
                 status = 'human_approved', topic = ?, question_hash = ?, content_hash = ?, updated_at = ?
                 WHERE object_key = ? AND question_index = ?`,
                [notes || null, 'workflow:apply-mcq-review', now, topic.display_name,
                    questionHash(currentQuestion), contentHash(currentQuestion), now, found.objectKey, parsed.index]
            ).catch(() => null);
        }
    }
    return { resolved: true, details: created ? 'topic_created' : 'ok', created };
}

async function run() {
    const { dataPath, apply } = parseArgs();
    const raw = JSON.parse(fs.readFileSync(path.resolve(dataPath), 'utf8'));
    const withdrawals = Array.isArray(raw.withdrawals) ? raw.withdrawals : [];
    const corrections = Array.isArray(raw.corrections) ? raw.corrections : [];
    const topicAssignments = Array.isArray(raw.topicAssignments) ? raw.topicAssignments : [];

    await db.connect();
    await db.runMigrations();

    let wMatched = 0, wMissing = 0;
    let cMatched = 0, cMissing = 0;
    const missingIds = [];
    const optionAdjusted = [];

    for (const w of withdrawals) {
        const parsed = parseQuestionId(w.questionId);
        if (!parsed) { wMissing++; missingIds.push(w.questionId); continue; }
        const r = await applyWithdraw(parsed.objectKey, parsed.index, w.questionId, w.verdict, w.reason, w.notes, { apply });
        if (r.matched) wMatched++; else { wMissing++; missingIds.push(w.questionId); }
    }

    for (const c of corrections) {
        const parsed = parseQuestionId(c.questionId);
        if (!parsed) { cMissing++; missingIds.push(c.questionId); continue; }
        const r = await applyCorrection(
            parsed.objectKey,
            parsed.index,
            c.questionId,
            c.verdict,
            c.notes,
            c.suggestedAnswer,
            c.source,
            c.stemFix,
            { apply, newExplanation: c.newExplanation, optionEdits: c.optionEdits, fullOptions: c.fullOptions }
        );
        if (r.matched) {
            cMatched++;
            if (r.details === 'option_adjusted') optionAdjusted.push(c.questionId);
        } else { cMissing++; missingIds.push(c.questionId); }
    }

    const topicUnresolved = [];
    let tResolved = 0, tCreated = 0;
    for (const t of topicAssignments) {
        const parsed = parseQuestionId(t.questionId);
        if (!parsed) { topicUnresolved.push({ questionId: t.questionId, why: 'bad_id' }); continue; }
        const result = await applyTopicAssignment(parsed, t.topicName, t.reviewState, t.notes, {
            apply, createIfMissing: Boolean(t.createIfMissing), block: t.block,
        });
        if (result.resolved) { tResolved += 1; if (result.created) tCreated += 1; }
        else topicUnresolved.push({ questionId: t.questionId, topic: t.topicName, why: result.details });
    }

    const summary = {
        ok: true,
        mode: apply ? 'apply' : 'dry-run',
        withdrawals: { requested: withdrawals.length, matched: wMatched, missing: wMissing },
        corrections: { requested: corrections.length, matched: cMatched, missing: cMissing, optionAdjusted },
        topicAssignments: { requested: topicAssignments.length, resolved: tResolved, created: tCreated, unresolved: topicUnresolved },
        missingIds,
    };
    console.log(JSON.stringify(summary, null, 2));

    await db.close();
    if (missingIds.length || topicUnresolved.length) {
        throw new Error(`Review import incomplete: ${missingIds.length} missing question(s), ${topicUnresolved.length} unresolved topic assignment(s)`);
    }
    return summary;
}

if (require.main === module) {
    run().catch((err) => { console.error(err?.stack || String(err)); process.exit(1); });
}

module.exports = { run };

