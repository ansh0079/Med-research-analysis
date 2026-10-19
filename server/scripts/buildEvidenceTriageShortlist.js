'use strict';

/**
 * Build a curator triage shortlist for the pending evidence-repair work queue
 * (cohorts evidence_support_weak / evidence_not_resolvable_in_app_db, enqueued by
 * enqueueQuestionRepairQueue.js). Curators work the list through
 * PATCH /api/admin/question-evidence-review (reviewEvidenceRepairItem); this script
 * only reads and never writes to the database.
 *
 * Usage: node server/scripts/buildEvidenceTriageShortlist.js [--db path] [--out dir]
 * Output: <out>/evidence-repair-triage.csv and evidence-repair-triage-summary.json
 */

const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const EVIDENCE_COHORTS = ['evidence_not_resolvable_in_app_db', 'evidence_support_weak'];
const COHORT_PREFIX = {
    evidence_not_resolvable_in_app_db: 'UNRES',
    evidence_support_weak: 'WEAK',
};
const BATCH_SIZE = 10;

function parseArgs(argv) {
    const args = { db: process.env.DATABASE_PATH || './database/app.db', out: './labeler-handoff' };
    for (let i = 2; i < argv.length; i += 1) {
        if (argv[i] === '--db') { args.db = argv[i + 1]; i += 1; }
        if (argv[i] === '--out') { args.out = argv[i + 1]; i += 1; }
    }
    return args;
}

function parseJson(value, fallback) {
    if (value && typeof value === 'object') return value;
    try { return JSON.parse(value); } catch { return fallback; }
}

function csvCell(value) {
    const s = value == null ? '' : String(value);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * Heuristic suggestion only — the curator decides. The point is to front-load the
 * mechanical calls so review time goes to the genuinely ambiguous items.
 *   unresolvable_guideline_link + citation-bearing sourceRefs -> human verifies the
 *     excerpt text actually substantiates the claim (refs exist but don't resolve
 *     to a DB row, so the excerpt is all the evidence there is)
 *   unresolvable_guideline_link + no refs at all             -> retire candidate
 *   dangling_numeric_ref / weak_support_with_refs            -> needs human judgment
 */
function refHasEvidenceText(ref) {
    if (!ref || typeof ref !== 'object') return false;
    return Boolean(ref.excerpt || ref.quote || ref.text || ref.citation || ref.guidelineEv || ref.evidence);
}

function suggestAction(cohort, evidenceKind, question) {
    const refs = Array.isArray(question?.sourceRefs) ? question.sourceRefs : [];
    if (cohort === 'evidence_not_resolvable_in_app_db') {
        return refs.some(refHasEvidenceText)
            ? 'human_check_citation_excerpt'
            : 'retire_candidate_no_refs';
    }
    if (evidenceKind === 'dangling_numeric_ref') return 'human_check_numeric_ref';
    return refs.length ? 'human_check_weak_support' : 'human_check_no_refs';
}

function main() {
    const args = parseArgs(process.argv);
    const sqlite = new Database(path.resolve(args.db), { readonly: true });
    const rows = sqlite.prepare(
        `SELECT object_key, question_index, cohort, topic, evidence_kind, reason
         FROM question_work_queue
         WHERE status = 'pending' AND cohort IN ('evidence_support_weak', 'evidence_not_resolvable_in_app_db')
         ORDER BY cohort, topic, object_key, question_index`,
    ).all();
    const objects = new Map();
    for (const r of rows) {
        if (!objects.has(r.object_key)) {
            const o = sqlite.prepare('SELECT object_type, object_payload FROM teaching_objects WHERE object_key = ?').get(r.object_key);
            objects.set(r.object_key, parseJson(o?.object_payload, {}));
        }
    }
    sqlite.close();

    const items = rows.map((r) => {
        const question = objects.get(r.object_key)?.mcqs?.[r.question_index] || {};
        const refs = Array.isArray(question.sourceRefs) ? question.sourceRefs : [];
        return {
            cohort: r.cohort,
            evidence_kind: r.evidence_kind,
            topic: r.topic || '(no topic)',
            object_key: r.object_key,
            question_index: r.question_index,
            question_excerpt: String(question.question || '').slice(0, 140),
            n_options: Array.isArray(question.options) ? question.options.length : (question.options && typeof question.options === 'object' ? Object.keys(question.options).length : 0),
            has_explanation: Boolean(question.explanation),
            n_source_refs: refs.length,
            ref_excerpt_sample: String(refs[0]?.excerpt || refs[0]?.quote || refs[0]?.citation || refs[0]?.guidelineEv || '').slice(0, 120),
            suggested_action: suggestAction(r.cohort, r.evidence_kind, question),
        };
    });

    // Batches within each cohort, filled in topic order so a batch stays clinically coherent.
    const batches = [];
    for (const cohort of EVIDENCE_COHORTS) {
        const list = items.filter((i) => i.cohort === cohort);
        const prefix = COHORT_PREFIX[cohort];
        for (let start = 0, n = 1; start < list.length; start += BATCH_SIZE, n += 1) {
            for (const item of list.slice(start, start + BATCH_SIZE)) item.batch_id = `${prefix}-${String(n).padStart(2, '0')}`;
        }
        batches.push({ cohort, prefix, items: list.length, batch_count: Math.ceil(list.length / BATCH_SIZE) });
    }

    const header = ['batch_id', 'suggested_action', 'cohort', 'evidence_kind', 'topic', 'object_key', 'question_index',
        'question_excerpt', 'n_options', 'has_explanation', 'n_source_refs', 'ref_excerpt_sample'];
    const lines = [header.join(',')];
    for (const item of items) lines.push(header.map((h) => csvCell(item[h])).join(','));

    const outDir = path.resolve(args.out);
    fs.mkdirSync(outDir, { recursive: true });
    const csvPath = path.join(outDir, 'evidence-repair-triage.csv');
    fs.writeFileSync(csvPath, lines.join('\n') + '\n');

    const bySuggestion = {};
    for (const i of items) bySuggestion[i.suggested_action] = (bySuggestion[i.suggested_action] || 0) + 1;
    const summary = {
        generated_at: new Date().toISOString(),
        total_items: items.length,
        cohorts: batches,
        suggested_action_counts: bySuggestion,
        review_endpoint: 'PATCH /api/admin/question-evidence-review',
        csv: csvPath,
    };
    const summaryPath = path.join(outDir, 'evidence-repair-triage-summary.json');
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2) + '\n');
    console.log(JSON.stringify(summary, null, 2));
}

if (require.main === module) main();
module.exports = { suggestAction };
