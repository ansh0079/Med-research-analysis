'use strict';

/**
 * Generate Markdown tables for the PR body:
 *  - 17 corrections: ID | old answer -> new answer | one-line reason
 *  - 65 withdrawals: ID | verdict
 *
 * Usage:
 *   node tools/review-md-tables.js \
 *     --csv /home/ubuntu/.cursor/projects/workspace/uploads/MCQ_Evidence_Review_320_d9cd.csv \
 *     --json data/mcq-review/review-2026-10-04.json \
 *     --out reports/mcq-review-2026-10-04.md
 */

const fs = require('fs');
const path = require('path');

function parseArgs(argv = process.argv.slice(2)) {
    const idxCsv = argv.indexOf('--csv');
    const idxJson = argv.indexOf('--json');
    const idxOut = argv.indexOf('--out');
    if (idxCsv < 0 || idxJson < 0 || idxOut < 0) {
        console.error('Usage: node tools/review-md-tables.js --csv <path> --json <path> --out <path>');
        process.exit(1);
    }
    return { csvPath: argv[idxCsv + 1], jsonPath: argv[idxJson + 1], outPath: argv[idxOut + 1] };
}

function csvSplit(line) {
    const out = [];
    let cur = '';
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
            if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
            else inQ = !inQ;
        } else if (ch === ',' && !inQ) {
            out.push(cur);
            cur = '';
        } else {
            cur += ch;
        }
    }
    out.push(cur);
    return out.map((s) => s.trim());
}

function normalizeVerdict(v) {
    const t = String(v || '').toLowerCase();
    if (t.includes('wrong')) return 'Wrong answer';
    if (t.includes('unsafe')) return 'Unsafe';
    if (t.includes('unsupported')) return 'Unsupported';
    if (t.includes('ambiguous')) return 'Ambiguous';
    if (t.includes('outdated')) return 'Outdated';
    if (t.includes('ok')) return 'OK';
    return v;
}

function oneLine(s) {
    return String(s || '').replace(/\s+/g, ' ').trim();
}

function main() {
    const { csvPath, jsonPath, outPath } = parseArgs();
    const json = JSON.parse(fs.readFileSync(path.resolve(jsonPath), 'utf8'));
    const raw = fs.readFileSync(path.resolve(csvPath), 'utf8').split(/\r?\n/);
    const header = csvSplit(raw[0] || '');
    const col = (name) => header.findIndex((h) => h.toLowerCase().startsWith(name.toLowerCase()));
    const idxId = col('Question ID');
    const idxVerdict = col('REVIEWER VERDICT');
    const idxNotes = col('REVIEWER NOTES');
    const idxSug = col('Suggested answer');
    const idxCorrect = col('Correct answer');
    if ([idxId, idxVerdict, idxNotes, idxSug, idxCorrect].some((i) => i < 0)) {
        console.error('Missing expected columns in CSV header');
        process.exit(2);
    }
    const byId = new Map();
    for (let i = 1; i < raw.length; i++) {
        const line = raw[i];
        if (!line || !line.trim()) continue;
        const cols = csvSplit(line);
        const id = cols[idxId];
        const verdict = normalizeVerdict(cols[idxVerdict]);
        const notes = cols[idxNotes] || '';
        const sug = cols[idxSug] || '';
        const old = cols[idxCorrect] || '';
        if (!id) continue;
        byId.set(id, { verdict, notes, sug, old });
    }

    const corrRows = [];
    for (const c of json.corrections || []) {
        const row = byId.get(c.questionId) || {};
        corrRows.push({
            id: c.questionId,
            change: `${row.old || ''} → ${c.suggestedAnswer}`,
            reason: oneLine(c.newExplanation || row.notes || c.notes || '').slice(0, 160),
            edit: (Array.isArray(c.optionEdits) && c.optionEdits.length) ? `${c.optionEdits.map(e => `${e.letter}: ${e.after}`).join(' | ')}` : (c.optionReplacement ? `${c.optionReplacement.letter}: ${c.optionReplacement.text}` : ''),
        });
    }
    const wdRows = [];
    for (const w of json.withdrawals || []) {
        wdRows.push({ id: w.questionId, verdict: w.verdict });
    }

    const corrMd = [
        `### Corrections (${(json.corrections || []).length})`,
        '',
        '| ID | Old → New | Edited option text | New explanation |',
        '|---|---|---|---|',
        ...corrRows.map((r) => `| ${r.id} | ${r.change} | ${r.edit || ''} | ${r.reason} |`),
    ].join('\n');
    const wdMd = [
        `### Withdrawals (${(json.withdrawals || []).length})`,
        '',
        '| ID | Verdict |',
        '|---|---|',
        ...wdRows.map((r) => `| ${r.id} | ${r.verdict} |`),
    ].join('\n');

    const md = `${corrMd}\n\n${wdMd}\n`;
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, md);
    console.log(`Wrote ${outPath}`);
}

main();

