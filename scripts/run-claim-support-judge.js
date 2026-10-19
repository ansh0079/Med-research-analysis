'use strict';

/**
 * Run the evidence-support judge over a calibration worksheet and merge the
 * verdicts into the `judge` field of each row (the merge step the worksheet
 * instructions reference). Idempotent: rows that already carry a judge verdict
 * are skipped unless --rejudge.
 *
 * Usage:
 *   node scripts/run-claim-support-judge.js \
 *     --worksheet labeler-handoff/claim-support-calibration.json [--limit N]
 *   ... --write     # apply (default is dry-run)
 *   ... --rejudge   # overwrite existing judge verdicts
 *
 * Needs AI provider keys configured (same providers as the app); verdict-less
 * rows keep judge=null and are reported.
 */

const fs = require('fs');
const { judgeClaim } = require('../server/services/evidenceSupportJudge');

function parseArgs(argv) {
    const args = { write: false, rejudge: false, limit: 0 };
    for (let i = 0; i < argv.length; i += 1) {
        if (argv[i] === '--write') args.write = true;
        else if (argv[i] === '--rejudge') args.rejudge = true;
        else if (argv[i] === '--worksheet') args.worksheet = argv[++i];
        else if (argv[i] === '--limit') args.limit = Number(argv[++i]) || 0;
    }
    return args;
}

async function run({ worksheet, write = false, rejudge = false, limit = 0, judge = judgeClaim, serverConfig = {} } = {}) {
    if (!worksheet) throw new Error('--worksheet is required');
    const sheet = JSON.parse(fs.readFileSync(worksheet, 'utf8'));
    const rows = Array.isArray(sheet.rows) ? sheet.rows : [];

    const todo = rows
        .map((row, index) => ({ row, index }))
        .filter(({ row }) => rejudge || !row.judge?.verdict)
        .filter(({ row }) => String(row.claimText || '').trim() && String(row.evidenceQuote || '').trim())
        .slice(0, limit > 0 ? limit : undefined);

    let judged = 0;
    let failed = 0;
    for (const { row, index } of todo) {
        const verdict = await judge(
            { claimText: row.claimText, evidenceQuote: row.evidenceQuote },
            { serverConfig }
        ).catch(() => null);
        if (write) {
            if (verdict) rows[index] = { ...row, judge: verdict };
            else rows[index] = { ...row, judge: null };
        }
        if (verdict) judged += 1;
        else failed += 1;
    }

    if (write) {
        sheet.rows = rows;
        sheet.judgeMergedAt = new Date().toISOString();
        fs.writeFileSync(worksheet, JSON.stringify(sheet, null, 2));
    }
    return {
        rows: rows.length,
        toJudge: todo.length,
        judged,
        failed,
        written: Boolean(write),
    };
}

if (require.main === module) {
    run(parseArgs(process.argv.slice(2))).then((r) => {
        console.log(JSON.stringify(r, null, 2));
        process.exit(0);
    }).catch((err) => {
        console.error(err.message || err);
        process.exit(1);
    });
}

module.exports = { run, parseArgs };
