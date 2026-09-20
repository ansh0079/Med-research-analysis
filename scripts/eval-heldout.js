#!/usr/bin/env node
/**
 * Held-out evaluation of the ranking path on frozen candidates (no provider calls).
 *
 *   npm run eval:heldout            print the report and write eval-results/heldout-<timestamp>.json
 *   npm run eval:heldout -- --gate  exit 1 unless the evaluation PASSED (use in release checks)
 *
 * Missing labels, an invalid fixture, too few cases, or thresholds nobody has agreed are all
 * reported as their own status and are never a pass. See server/services/heldoutEval.js.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { evaluateHeldout } = require('../server/services/heldoutEval');

const gate = process.argv.includes('--gate');
const report = evaluateHeldout();

function pct(x) { return x == null ? 'n/a' : `${(x * 100).toFixed(1)}%`; }
function num(m) { return m?.mean == null ? 'n/a' : `${m.mean.toFixed(3)} [${m.lo.toFixed(3)}, ${m.hi.toFixed(3)}]`; }
function prop(m) { return m?.rate == null ? 'n/a' : `${pct(m.rate)} [${pct(m.lo)}, ${pct(m.hi)}] (n=${m.n})`; }

console.log(`Held-out evaluation: ${report.status.toUpperCase()}`);
console.log(`baseline commit: ${report.provenance.baselineCommit || 'unknown'}   providers called: none (frozen candidates)`);
for (const d of report.provenance.datasets || []) console.log(`dataset: ${d.file} v${d.version} sha256:${d.sha256}`);
if (report.provenance.thresholdsHash) console.log(`thresholds: agreed by ${report.provenance.thresholdsAgreedBy} on ${report.provenance.thresholdsAgreedAt} (${report.provenance.thresholdsHash.slice(0, 12)})`);
for (const p of report.problems || []) console.log(`  problem: ${p}`);

if (report.metrics) {
    const m = report.metrics;
    console.log(`\ncases: ${m.cases} (${m.rankableCases} rankable, ${m.retrievalGapCases} with no on-topic candidate: missing evidence, not ranking error)`);
    console.log(`nDCG@10        ${num(m.ndcg10)}`);
    console.log(`MRR            ${num(m.mrr)}`);
    console.log(`Recall@10      ${num(m.recall10)}`);
    console.log(`contamination  ${prop(m.contaminationRate)}   (cases serving an off-topic result in the top 10)`);
    console.log(`false rejection ${prop(m.falseRejectionRate)}  (on-topic candidates removed by eligibility)`);
    console.log(`labeler agreement: kappa ${report.agreement.kappa ?? 'n/a'} over ${report.agreement.pairs} double-labelled candidate(s)`);
    for (const [field, groups] of Object.entries(report.subgroups)) {
        console.log(`\nby ${field}:`);
        for (const [name, g] of Object.entries(groups)) {
            console.log(`  ${name.padEnd(28)} n=${String(g.cases).padStart(3)}  nDCG ${g.ndcg10.mean ?? 'n/a'}  contamination ${pct(g.contaminationRate.rate)}${g.underpowered ? '  (underpowered)' : ''}`);
        }
    }
}
for (const f of report.failures || []) console.log(`  FAIL ${f.metric}: observed ${f.observed}, bound ${f.min ?? f.max} (checked against ${f.checkedAgainst})`);

const dir = path.resolve(__dirname, '..', 'eval-results');
fs.mkdirSync(dir, { recursive: true });
const out = path.join(dir, `heldout-${Date.now()}.json`);
fs.writeFileSync(out, JSON.stringify(report, null, 2));
console.log(`\nreport written to ${path.relative(process.cwd(), out)}`);

if (gate && !report.passed) process.exit(1);
if (report.status === 'invalid') process.exit(1);
