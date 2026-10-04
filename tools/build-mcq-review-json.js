'use strict';

/**
 * Build the review JSON from the uploaded CSV:
 *   - withdrawals: verdict in { Unsafe, Unsupported, Ambiguous }
 *   - corrections: verdict == 'Wrong answer'
 *
 * Usage:
 *   node tools/build-mcq-review-json.js \
 *     --csv /home/ubuntu/.cursor/projects/workspace/uploads/MCQ_Evidence_Review_320_d9cd.csv \
 *     --out data/mcq-review/review-2026-10-04.json
 */

const fs = require('fs');
const path = require('path');

function parseArgs(argv = process.argv.slice(2)) {
    const idxCsv = argv.indexOf('--csv');
    const idxOut = argv.indexOf('--out');
    if (idxCsv < 0 || idxOut < 0) {
        console.error('Usage: node tools/build-mcq-review-json.js --csv <path> --out <path>');
        process.exit(1);
    }
    return { csvPath: argv[idxCsv + 1], outPath: argv[idxOut + 1] };
}

function csvSplit(line) {
    // Basic CSV split handling commas in quotes
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

function coerceStemFix(notes) {
    const n = String(notes || '');
    const m = n.match(/(?:Stem(?:\s*fix)?|Rewrite|Replace stem)[:-]\s*([^.;]+.*?)(?:$|[.][\s]|;)/i);
    return m ? m[1].trim() : null;
}

function oneLine(s) {
    return String(s || '').replace(/\s+/g, ' ').trim();
}

function build() {
    const { csvPath, outPath } = parseArgs();
    const raw = fs.readFileSync(path.resolve(csvPath), 'utf8').split(/\r?\n/);
    const header = csvSplit(raw[0] || '');
    const col = (name) => header.findIndex((h) => h.toLowerCase().startsWith(name.toLowerCase()));
    const idxId = col('Question ID');
    const idxVerdict = col('REVIEWER VERDICT');
    const idxNotes = col('REVIEWER NOTES');
    const idxSug = col('Suggested answer');
    const idxSrc = col('Current source');
    const idxCorrect = col('Correct answer');
    if ([idxId, idxVerdict, idxNotes, idxSug, idxSrc].some((i) => i < 0)) {
        console.error('Missing expected columns in CSV header');
        process.exit(2);
    }

    const withdrawals = [];
    const corrections = [];

    for (let i = 1; i < raw.length; i++) {
        const line = raw[i];
        if (!line || !line.trim()) continue;
        const cols = csvSplit(line);
        const id = cols[idxId];
        const verdict = normalizeVerdict(cols[idxVerdict]);
        const notes = cols[idxNotes] || '';
        const suggested = cols[idxSug] || '';
        const source = cols[idxSrc] || '';
        const oldAnswer = cols[idxCorrect] || '';
        if (!id) continue;
        if (['Unsafe', 'Unsupported', 'Ambiguous'].includes(verdict)) {
            withdrawals.push({
                questionId: id,
                verdict,
                reason: oneLine(notes).slice(0, 160),
                notes: notes,
            });
            continue;
        }
        if (verdict === 'Wrong answer') {
            const stemFix = coerceStemFix(notes);
            const isLetter = /^[A-E]$/i.test(String(suggested || ''));
            const correction = {
                questionId: id,
                verdict,
                notes,
                suggestedAnswer: String(suggested || '').trim(),
                source,
                stemFix: stemFix || null,
                // Pre-computed explanation: 1–3 sentences from notes + source.
                newExplanation: [oneLine(notes), source ? `Source: ${oneLine(source)}` : ''].filter(Boolean).join(' ').slice(0, 700),
            };
            if (!isLetter && suggested) {
                correction.optionReplacement = { letter: 'E', text: String(suggested).trim() };
            }
            correction._oldAnswer = oldAnswer;
            corrections.push(correction);
        }
    }

    // Keep only the required fields in output (drop helper fields)
    const cleanCorrections = corrections.map((c) => {
        const { _oldAnswer, ...rest } = c;
        return rest;
    });

    const out = { withdrawals, corrections: cleanCorrections };
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
    console.log(`Wrote ${out.withdrawals.length} withdrawals and ${out.corrections.length} corrections to ${outPath}`);
}

build();

