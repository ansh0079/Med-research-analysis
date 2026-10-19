'use strict';

/**
 * Apply curator decisions from a CSV to the question work queue through
 * reviewEvidenceRepairItem — the same audited completion path the PATCH endpoint
 * uses, so bulk decisions land in the queue row, the question_audit ledger and
 * (for retirements) mcq_review_overrides exactly like individually curated ones.
 *
 * CSV columns: object_key, question_index, cohort, decision, notes
 * Idempotent: rows whose queue item is no longer 'pending' are skipped.
 *
 * Usage: node server/scripts/applyQueueDecisionsFromCsv.js <csv> [--apply]
 * Without --apply it dry-runs and prints what would be decided.
 */

const fs = require('path');
const fsp = require('fs');
const Database = require('better-sqlite3');
const { reviewEvidenceRepairItem } = require('../services/questionIndex/questionIndexReviewService');

function parseCsv(text) {
    const rows = [];
    let cur = []; let field = ''; let inQ = false;
    for (let i = 0; i < text.length; i += 1) {
        const c = text[i];
        if (inQ) {
            if (c === '"') { if (text[i + 1] === '"') { field += '"'; i += 1; } else inQ = false; } else field += c;
        } else if (c === '"') inQ = true;
        else if (c === ',') { cur.push(field); field = ''; }
        else if (c === '\n') { cur.push(field); rows.push(cur); cur = []; field = ''; }
        else field += c;
    }
    if (field || cur.length) { cur.push(field); rows.push(cur); }
    const header = rows.shift().map((h) => h.trim());
    return rows.filter((r) => r.length > 1).map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ''])));
}

async function main() {
    const csvArg = process.argv.find((a) => a.endsWith('.csv'));
    if (!csvArg) throw new Error('usage: applyQueueDecisionsFromCsv.js <csv> [--apply]');
    const apply = process.argv.includes('--apply');
    const decisions = parseCsv(fsp.readFileSync(fs.resolve(csvArg), 'utf8'));
    const sqlite = new Database(fs.resolve('./database/app.db'));
    const db = {
        get: (s, p = []) => sqlite.prepare(s).get(...p),
        all: (s, p = []) => sqlite.prepare(s).all(...p),
        run: (s, p = []) => sqlite.prepare(s).run(...p),
    };
    let applied = 0; let skipped = 0; let failed = 0;
    for (const d of decisions) {
        try {
            if (!apply) {
                const row = db.get('SELECT status FROM question_work_queue WHERE object_key = ? AND question_index = ? AND cohort = ?', [d.object_key, Number(d.question_index), d.cohort]);
                if (row?.status === 'pending') { applied += 1; console.log('WOULD', d.decision, d.object_key + '#' + d.question_index); }
                else skipped += 1;
                continue;
            }
            await reviewEvidenceRepairItem(db, {
                objectKey: d.object_key,
                questionIndex: Number(d.question_index),
                cohort: d.cohort,
                decision: d.decision,
                notes: d.notes || null,
                userId: 'bulk-curator',
            });
            applied += 1;
            console.log('DONE', d.decision, d.object_key.split(':').pop() + '#' + d.question_index);
        } catch (e) {
            failed += 1;
            console.log('SKIP', d.object_key + '#' + d.question_index, '-', e.message);
        }
    }
    console.log(JSON.stringify({ apply, total: decisions.length, applied, skipped, failed }));
    sqlite.close();
}

if (require.main === module) {
    main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
}
