#!/usr/bin/env node
'use strict';

/**
 * Evidence-support audit for generated teaching content.
 *
 * Answers, for the content actually stored: is each claim answerable from the
 * passage it cites, and does each question have an answer that is defensible
 * rather than guessable from its shape.
 *
 * This is the structural pass. It runs over the whole corpus, costs nothing per
 * item and needs no model. What it cannot decide -- whether a claim genuinely
 * follows from a passage that shares its vocabulary -- is left to a judged
 * sample, which has to be calibrated against human labels before its numbers
 * mean anything.
 *
 * Usage:
 *   node scripts/audit-evidence-support.js
 *   node scripts/audit-evidence-support.js --limit 2000
 *   node scripts/audit-evidence-support.js --format markdown > report.md
 *
 * Judged pass (costs one model call per sampled claim):
 *   node scripts/audit-evidence-support.js --judge 200 --calibration-out labels.json
 *   # a human fills in the "human" field of each row in labels.json, then
 *   node scripts/audit-evidence-support.js --judge 200 --calibration-in labels.json
 */

const fs = require('fs');
const path = require('path');
const db = require('../database');
const { auditEvidenceSupport } = require('../server/services/evidenceSupportAuditService');
const { claimStructureFindings, claimKind } = require('../server/utils/evidenceSupport');
const { judgeClaim, buildJudgeReport, reweightToCorpus } = require('../server/services/evidenceSupportJudge');
const { serverConfig } = require('../config');

const args = process.argv.slice(2);
const flag = (name, fallback = null) => {
    const i = args.indexOf(name);
    return i === -1 ? fallback : args[i + 1];
};
const limit = Number(flag('--limit', '0')) || 0;
const format = flag('--format', 'table');
const judgeCount = Number(flag('--judge', '0')) || 0;
const calibrationOut = flag('--calibration-out');
const calibrationIn = flag('--calibration-in');
const negativeControl = Number(flag('--negative-control', '0')) || 0;

/**
 * Random sample, never the first N rows. A contiguous block of this table is a
 * single generation run over adjacent topics, so its defect rate says nothing
 * about the corpus.
 */
function sample(rows, n) {
    const pool = [...rows];
    for (let i = pool.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, n);
}

/**
 * Runs the judge over claims the structural pass already proved unsupportable,
 * and reports how many it catches.
 *
 * A judge that returns "supported" for everything agrees with most of a corpus
 * that is mostly fine, and looks convincing until it is asked about a claim
 * whose passage shares no vocabulary with it at all. This is the cheap standing
 * check that the judge discriminates; re-run it whenever the model changes.
 * It is a floor, not a validation: these cases are obvious, and a judge can
 * pass this and still miss a claim that quietly overstates its passage. Only
 * human labels settle that.
 */
async function runNegativeControl(database, count) {
    const rows = await database.all(
        `SELECT claim_text, evidence_quote FROM teaching_object_claims
         WHERE evidence_quote IS NOT NULL AND length(trim(evidence_quote)) >= 40`,
        []
    );
    const known = rows.filter((row) => claimStructureFindings({
        claimText: row.claim_text, evidenceQuote: row.evidence_quote,
    }).some((f) => f.code === 'quote_shares_no_vocabulary'));

    const picked = sample(known, count);
    let caught = 0;
    const missed = [];
    for (const row of picked) {
        const verdict = await judgeClaim(
            { claimText: row.claim_text, evidenceQuote: row.evidence_quote },
            { serverConfig }
        );
        const value = verdict ? verdict.verdict : null;
        if (value && value !== 'supported') caught += 1;
        else missed.push({ claim: String(row.claim_text).slice(0, 120), verdict: value });
    }
    return { tested: picked.length, caught, missed };
}

/**
 * Stratified sample for calibration.
 *
 * A uniform sample of this corpus is roughly 95% supported, so 200 claims yield
 * ~10 unsupported ones and kappa computed on them swings wildly. Over-sampling
 * the structurally flagged stratum gives the labeller both classes to separate.
 *
 * The cost is that the sample is no longer representative, so a prevalence read
 * straight off it would be badly wrong. Each row therefore carries its stratum
 * and that stratum's sampling weight (population / sampled), which is what any
 * later corpus-wide rate must be reweighted by. Agreement — the thing
 * calibration is for — is unaffected by stratification.
 */
function stratifiedSample(rows, count) {
    const flagged = [];
    const clean = [];
    for (const row of rows) {
        const hasFinding = claimStructureFindings({
            claimText: row.claim_text, evidenceQuote: row.evidence_quote,
        }).length > 0;
        (hasFinding ? flagged : clean).push(row);
    }

    const wantFlagged = Math.min(flagged.length, Math.round(count * 0.3));
    const wantClean = Math.min(clean.length, count - wantFlagged);
    const weight = (population, sampled) => (sampled ? population / sampled : null);

    return [
        ...sample(flagged, wantFlagged).map((row) => ({
            ...row, stratum: 'structurally_flagged', samplingWeight: weight(flagged.length, wantFlagged),
        })),
        ...sample(clean, wantClean).map((row) => ({
            ...row, stratum: 'no_structural_finding', samplingWeight: weight(clean.length, wantClean),
        })),
    ];
}

async function runJudgedPass(database, count) {
    const all = await database.all(
        `SELECT claim_key, claim_text, evidence_quote, source_path FROM teaching_object_claims
         WHERE evidence_quote IS NOT NULL AND length(trim(evidence_quote)) >= 40`,
        []
    );
    // Only assertions can be judged for entailment. A limitations entry or a
    // whatNotToOverclaim line is not supposed to be stated by the passage.
    const rows = all.filter((row) => claimKind(row.source_path) !== 'meta');
    const excludedMeta = all.length - rows.length;
    const picked = stratifiedSample(rows, count);
    console.error(`  judging ${picked.length} of ${rows.length} judgeable claims`
        + ` (${excludedMeta} excluded as not passage assertions)`);
    const judged = [];
    for (const [index, row] of picked.entries()) {
        const verdict = await judgeClaim(
            { claimText: row.claim_text, evidenceQuote: row.evidence_quote },
            { serverConfig }
        );
        judged.push({
            claimKey: row.claim_key,
            claimKind: claimKind(row.source_path),
            sourcePath: row.source_path || null,
            stratum: row.stratum,
            samplingWeight: row.samplingWeight,
            claimText: row.claim_text,
            evidenceQuote: row.evidence_quote,
            verdict: verdict ? verdict.verdict : null,
            reason: verdict ? verdict.reason : null,
        });
        if ((index + 1) % 25 === 0) console.error(`  judged ${index + 1}/${picked.length}`);
    }
    return judged;
}

const pct = (value) => (value === null || value === undefined ? 'n/a' : `${(value * 100).toFixed(1)}%`);

function renderTable(report) {
    const lines = [];
    const { claims, mcqs } = report;

    lines.push(`Claims audited: ${claims.total}`);
    lines.push(`  with a structural problem: ${claims.affected} (${pct(claims.total ? claims.affected / claims.total : null)})`);
    for (const f of claims.findings) {
        lines.push(`    ${String(f.count).padStart(6)}  ${f.code}`);
        if (f.example) lines.push(`            e.g. ${f.example.claim}`);
    }

    lines.push('');
    lines.push(`Questions audited: ${mcqs.total}`);
    lines.push(`  with a structural problem: ${mcqs.affected} (${pct(mcqs.total ? mcqs.affected / mcqs.total : null)})`);
    for (const f of mcqs.findings) {
        lines.push(`    ${String(f.count).padStart(6)}  ${f.code}`);
    }

    const { cueing } = mcqs;
    lines.push('');
    lines.push('Answer cueing (can the key be picked from form alone?)');
    lines.push(`  key is the single longest option: ${cueing.keyIsLongest} (${pct(cueing.observedRate)})`);
    lines.push(`  rate expected by chance:          ${pct(cueing.chanceRate)}`);
    lines.push(`  questions cued beyond chance:     ${cueing.excessOverChance ?? 'n/a'}`);
    lines.push('');
    lines.push('Structural checks only. A claim with no finding here is not thereby');
    lines.push('supported -- that needs a judged, human-calibrated sample.');
    return lines.join('\n');
}

function renderMarkdown(report) {
    const { claims, mcqs, generatedAt } = report;
    const lines = [`# Evidence-support audit`, '', `Generated ${generatedAt}`, ''];
    lines.push(`## Claims`, '', `${claims.affected} of ${claims.total} carry a structural problem.`, '');
    lines.push('| finding | count |', '| --- | ---: |');
    for (const f of claims.findings) lines.push(`| \`${f.code}\` | ${f.count} |`);
    lines.push('', `## Questions`, '', `${mcqs.affected} of ${mcqs.total} carry a structural problem.`, '');
    lines.push('| finding | count |', '| --- | ---: |');
    for (const f of mcqs.findings) lines.push(`| \`${f.code}\` | ${f.count} |`);
    lines.push('', '## Answer cueing', '');
    lines.push(`Observed ${pct(mcqs.cueing.observedRate)} against a chance rate of ${pct(mcqs.cueing.chanceRate)}`
        + ` — ${mcqs.cueing.excessOverChance} questions cued beyond chance.`);
    lines.push('', '_Structural checks only; an unflagged claim is not thereby supported._');
    return lines.join('\n');
}

(async () => {
    // Created before any work: a judged pass costs a model call per claim, and
    // discovering the output directory is missing after 200 of them throws the
    // whole run away.
    const outDir = path.resolve(process.cwd(), 'eval-results');
    fs.mkdirSync(outDir, { recursive: true });
    if (calibrationOut) fs.mkdirSync(path.dirname(path.resolve(calibrationOut)), { recursive: true });

    await db.connect();
    const report = await auditEvidenceSupport(db, { limit });

    if (negativeControl > 0) {
        report.negativeControl = await runNegativeControl(db, negativeControl);
    }

    if (judgeCount > 0) {
        const judged = await runJudgedPass(db, judgeCount);
        let calibration = [];
        if (calibrationIn) {
            // Rows a human has labelled; unlabelled rows are dropped, not assumed.
            const loaded = JSON.parse(fs.readFileSync(calibrationIn, 'utf8'));
            calibration = (Array.isArray(loaded) ? loaded : loaded.rows || [])
                .filter((row) => row && row.human && row.verdict)
                .map((row) => ({ judge: row.verdict, human: row.human }));
        }
        report.judged = buildJudgeReport({ judged, calibration });
        report.judgedItems = judged;
        report.corpusEstimate = reweightToCorpus(judged);

        // Written before anything else can fail: these verdicts cost one model
        // call each and cannot be recovered from a crashed process.
        fs.writeFileSync(path.join(outDir, `judged-raw-${Date.now()}.json`), JSON.stringify(judged, null, 2));

        if (calibrationOut) {
            // Blank "human" field for a clinician to fill in. The judge's own
            // verdict is included so disagreements can be reviewed, which does
            // risk anchoring the labeller -- worth it only because the
            // alternative is labelling 200 claims with no way to spot-check.
            fs.writeFileSync(calibrationOut, JSON.stringify({
                instructions: {
                    task: 'For each row set "human" to one of: supported, partially_supported, '
                        + 'unsupported, passage_unusable.',
                    rule: 'Judge only whether the passage states or entails the claim. A claim can '
                        + 'be true in medicine and still be unsupported by this passage.',
                    stratified: 'This sample over-samples structurally flagged claims so both '
                        + 'classes are present. Do not read a corpus-wide rate off it without '
                        + 'reweighting by samplingWeight.',
                    note: 'The judge verdict is shown so disagreements can be reviewed. It may '
                        + 'anchor you — decide from the passage first, then look.',
                },
                rows: judged.map((row) => ({ ...row, human: '' })),
            }, null, 2));
            console.error(`Calibration sheet written to ${calibrationOut} (${judged.length} rows)`);
        }
    }

    const jsonPath = path.join(outDir, `evidence-support-${Date.now()}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));

    console.log(format === 'markdown' ? renderMarkdown(report) : renderTable(report));
    if (report.negativeControl) {
        const nc = report.negativeControl;
        console.log('');
        console.log(`Judge negative control: caught ${nc.caught}/${nc.tested} claims already known unsupportable`);
        for (const miss of nc.missed.slice(0, 5)) {
            console.log(`  MISSED (${miss.verdict || 'no verdict'}): ${miss.claim}`);
        }
    }
    if (report.judged) {
        const j = report.judged;
        console.log('');
        console.log(`Judged sample: ${j.judged} claims (${j.noVerdict} with no usable verdict)`);
        for (const [verdict, count] of Object.entries(j.counts)) {
            console.log(`  ${String(count).padStart(6)}  ${verdict}`);
        }
        console.log(j.reportable
            ? `  judge/human agreement: kappa ${j.calibration.kappa.toFixed(2)} over n=${j.calibration.n}`
            : `  NOT REPORTABLE — ${j.caveat}`);

        const corpus = report.corpusEstimate;
        if (corpus) {
            console.log('');
            console.log('Corpus estimate, reweighted from the stratified sample');
            if (!j.reportable) {
                // Printing a number here before the judge is calibrated is how a
                // judged guess becomes a quoted statistic, so withhold the figures.
                console.log('  withheld — the judge is not calibrated, so these would be a guess');
            } else {
                for (const [verdict, rate] of Object.entries(corpus.rates)) {
                    console.log(`  ${verdict.padEnd(22)} ${pct(rate)}`);
                }
                console.log(`  (${corpus.unjudged} sampled claims had no usable verdict and are excluded)`);
            }
        }
    }
    console.log(`\nFull report: ${path.relative(process.cwd(), jsonPath)}`);
    process.exit(0);
})().catch((error) => {
    console.error(`audit-evidence-support failed: ${error.message}`);
    process.exit(1);
});
