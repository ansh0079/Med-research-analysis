'use strict';

/**
 * Route NEEDS_REPAIR questions from the full bank audit into question_work_queue
 * so the human review pipeline has a prioritized, deduplicated queue.
 *
 * The queue table (migration 113) was created for exactly this flow but had no
 * writer. This script is the writer: it reads the per-question audit CSV,
 * expands each flagged question to its (object_key, question_index) slot, and
 * enqueues rows the review UI / assignee workers can claim.
 *
 * Usage:
 *   node server/scripts/enqueueQuestionRepairQueue.js            # dry-run (default)
 *   node server/scripts/enqueueQuestionRepairQueue.js --apply    # write to DB
 *
 * Idempotent: a (object_key, question_index, cohort) row is inserted only once.
 */

const fs = require('fs');
const path = require('path');

const DEFAULT_CSV = path.join(__dirname, '..', '..', 'scratch', 'full_audit_live_db_per_question.csv');

const EVIDENCE_KIND = {
    weak_no_refs: 'dangling_numeric_ref',
    weak_with_refs: 'weak_support_with_refs',
    unresolvable_with_refs: 'unresolvable_guideline_link',
    unresolvable_no_refs: 'no_resolvable_evidence',
};

function parseAuditCsv(csvPath) {
    const lines = fs.readFileSync(csvPath, 'utf8').split('\n').filter(Boolean);
    const header = lines[0].split(',').map((s) => s.replace(/"/g, ''));
    return lines.slice(1).map((l) => {
        const cells = l.match(/"((?:[^"]|"")*)"/g).map((s) => s.slice(1, -1).replace(/""/g, '"'));
        return Object.fromEntries(header.map((h, i) => [h, cells[i]]));
    });
}

function classifyEvidenceKind(reason, hasRefs) {
    if (reason === 'evidence_support_weak') {
        return hasRefs ? EVIDENCE_KIND.weak_with_refs : EVIDENCE_KIND.weak_no_refs;
    }
    return hasRefs ? EVIDENCE_KIND.unresolvable_with_refs : EVIDENCE_KIND.unresolvable_no_refs;
}

async function run({ apply = false, csvPath = DEFAULT_CSV } = {}) {
    if (!fs.existsSync(csvPath)) {
        throw new Error(`audit CSV not found: ${csvPath} — run scratch/full_live_db_audit.js first`);
    }
    const records = parseAuditCsv(csvPath).filter((r) => r.verdict === 'NEEDS_REPAIR');
    const db = require('../../database');
    await db.connect();

    const objectKeys = [...new Set(records.map((r) => r.object_key))];
    const payloads = new Map();
    for (const key of objectKeys) {
        const row = await db.get('SELECT object_payload FROM teaching_objects WHERE object_key = ?', [key]);
        if (!row) continue;
        try {
            payloads.set(key, JSON.parse(row.object_payload));
        } catch {
            payloads.set(key, null);
        }
    }

    // Never re-enqueue a question a curator already decided (question_audit ledger):
    // 'approved' resolved the evidence concern; 'retired' is enforced via the
    // mcq_review_overrides withdrawal that the audit reads.
    const humanDecided = new Set();
    for (const key of objectKeys) {
        const decided = await db.all(
            'SELECT question_index FROM question_audit WHERE object_key = ? AND human_decision IS NOT NULL',
            [key],
        ).catch(() => []);
        decided.forEach((d) => humanDecided.add(`${key}#${d.question_index}`));
    }

    const now = new Date().toISOString();
    let queued = 0;
    let skipped = 0;
    const byKind = {};

    for (const rec of records) {
        const payload = payloads.get(rec.object_key);
        if (!payload) { skipped += 1; continue; }
        const questions = payload.mcqs || payload.questions || (payload.question ? [payload] : []);
        let idx = rec.question_uid.includes('#')
            ? Number(rec.question_uid.split('#').pop())
            : questions.findIndex((q) => q.id === rec.question_uid);
        let question = questions[idx];
        // Fallback: concurrent payload edits can shift array indexes between
        // the audit run and enqueue. Fall back to stem matching.
        if (!question || idx < 0) {
            const stemNorm = String(rec.stem || '').replace(/\s+/g, ' ').trim().toLowerCase();
            idx = questions.findIndex((q) => {
                const qStem = String(q.question || q.stem || '').replace(/\s+/g, ' ').trim().toLowerCase();
                return qStem && (qStem === stemNorm || qStem.startsWith(stemNorm.slice(0, 80)) || stemNorm.startsWith(qStem.slice(0, 80)));
            });
            question = questions[idx];
        }
        if (!question || idx < 0 || idx === undefined) { skipped += 1; continue; }
        if (humanDecided.has(`${rec.object_key}#${idx}`)) { skipped += 1; continue; }

        const hasRefs = Array.isArray(question.sourceRefs) && question.sourceRefs.length > 0;
        const kind = classifyEvidenceKind(rec.reason, hasRefs);
        byKind[kind] = (byKind[kind] || 0) + 1;

        if (!apply) { queued += 1; continue; }

        const existing = await db.get(
            'SELECT 1 AS x FROM question_work_queue WHERE object_key = ? AND question_index = ? AND cohort = ?',
            [rec.object_key, idx, rec.reason]
        );
        if (existing) { skipped += 1; continue; }

        await db.run(
            `INSERT INTO question_work_queue
             (object_key, question_index, cohort, status, topic, evidence_kind, reason, assigned_to, created_at, updated_at, completed_at)
             VALUES (?, ?, ?, 'pending', ?, ?, ?, NULL, ?, ?, NULL)`,
            [rec.object_key, idx, rec.reason, rec.topic || null, kind, rec.reason, now, now]
        );
        queued += 1;
    }

    await db.close();
    return { flagged: records.length, queued, skipped, byKind, apply };
}

if (require.main === module) {
    const apply = process.argv.includes('--apply');
    run({ apply }).then((r) => {
        console.log(JSON.stringify(r, null, 2));
        process.exit(0);
    }).catch((err) => {
        console.error(err);
        process.exit(1);
    });
}

module.exports = { run, parseAuditCsv, classifyEvidenceKind, EVIDENCE_KIND };
