'use strict';

/**
 * Build a human calibration worksheet for synopsis claim support.
 *
 * The semantic judge (--judge in audit-evidence-support.js) needs human labels
 * before its verdicts may affect serving (SYNOPSIS_CLAIM_SUPPORT=enforce).
 * This script emits a stratified sample of judgeable claims with structural
 * findings already attached, in the same row shape the calibration flow
 * consumes (--calibration-in). No model calls: human labels only.
 *
 * Usage:
 *   node scripts/build-claim-calibration-worksheet.js --out labeler-handoff/claim-support-calibration.json --count 200
 */

const fs = require('fs');
const path = require('path');
const db = require('../database');
const { claimStructureFindings, claimKind } = require('../server/utils/evidenceSupport');

/** Deterministic shuffle so the worksheet is reproducible across runs. */
function seededShuffle(rows, seed = 20261016) {
    let s = seed >>> 0;
    const rand = () => {
        s = (s * 1664525 + 1013904223) >>> 0;
        return s / 0xffffffff;
    };
    const pool = [...rows];
    for (let i = pool.length - 1; i > 0; i -= 1) {
        const j = Math.floor(rand() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool;
}

/**
 * Stratified sample: ~30% structurally flagged claims so both classes are
 * present for the labeller. NOT representative — reweight by samplingWeight.
 */
function stratifiedClaimSample(rows, count) {
    const flagged = [];
    const clean = [];
    for (const row of rows) {
        const findings = claimStructureFindings({
            claimText: row.claim_text,
            evidenceQuote: row.evidence_quote,
        });
        (findings.length ? flagged : clean).push({ ...row, structuralFindings: findings.map((f) => f.code) });
    }
    const wantFlagged = Math.min(flagged.length, Math.round(count * 0.3));
    const wantClean = Math.min(clean.length, count - wantFlagged);
    const weight = (population, sampled) => (sampled ? population / sampled : null);
    return [
        ...seededShuffle(flagged).slice(0, wantFlagged).map((row) => ({
            ...row, stratum: 'structurally_flagged', samplingWeight: weight(flagged.length, wantFlagged),
        })),
        ...seededShuffle(clean).slice(0, wantClean).map((row) => ({
            ...row, stratum: 'no_structural_finding', samplingWeight: weight(clean.length, wantClean),
        })),
    ];
}

function toWorksheetRow(row) {
    return {
        claimKey: row.claim_key,
        claimKind: claimKind(row.source_path),
        sourcePath: row.source_path || null,
        stratum: row.stratum,
        samplingWeight: row.samplingWeight,
        claimText: row.claim_text,
        evidenceQuote: row.evidence_quote,
        structuralFindings: row.structuralFindings || [],
        judge: null,
        human: '', // labeller fills: supported | partially_supported | unsupported | passage_unusable
    };
}

async function main() {
    const args = process.argv.slice(2);
    const outIdx = args.indexOf('--out');
    const countIdx = args.indexOf('--count');
    const out = outIdx >= 0 ? args[outIdx + 1] : path.join('labeler-handoff', 'claim-support-calibration.json');
    const count = Math.min(Math.max(Number(countIdx >= 0 ? args[countIdx + 1] : 200) || 200, 20), 1000);

    await db.connect();
    const rows = await db.all(
        `SELECT claim_key, claim_text, evidence_quote, source_path
         FROM teaching_object_claims
         WHERE evidence_quote IS NOT NULL AND length(trim(evidence_quote)) >= 40`
    ).catch(() => []);
    await db.close();

    const judgeable = rows.filter((r) => claimKind(r.source_path) !== 'meta');
    const sampled = stratifiedClaimSample(judgeable, count);
    const worksheet = {
        instructions: {
            task: 'For each row set "human" to one of: supported, partially_supported, unsupported, passage_unusable.',
            rule: 'Judge only whether the passage states or entails the claim. A claim can be true in medicine and still be unsupported by this passage.',
            stratified: 'This sample over-samples structurally flagged claims. Do not read a corpus-wide rate off it without reweighting by samplingWeight.',
            judge: 'judge is null here (structural worksheet only). Merge with model verdicts before running the calibration flow.',
        },
        generatedAt: new Date().toISOString(),
        population: { judgeableClaims: judgeable.length, sampled: sampled.length },
        rows: sampled.map(toWorksheetRow),
    };

    fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
    fs.writeFileSync(out, JSON.stringify(worksheet, null, 2));
    console.log(`Worksheet: ${out} — ${sampled.length} rows from ${judgeable.length} judgeable claims`);
}

if (require.main === module) {
    main().catch((err) => { console.error(err); process.exit(1); });
}

module.exports = { stratifiedClaimSample, seededShuffle };
