#!/usr/bin/env node
/**
 * Report tuning vs held-out eval dataset state. Exits 1 only when the held-out
 * directory contains an invalid fixture; an empty held-out set is reported, not failed,
 * so the report is honest about the gap instead of blocking unrelated work.
 */
const { describeDatasets } = require('../server/services/evalDatasetPolicy');

const report = describeDatasets();
console.log('Tuning fixtures (may be overfit to; never used by the release gate):');
for (const t of report.tuning) {
    console.log(`  ${t.file}: ${t.cases} cases, ${t.withProvenance} with full provenance`);
}
console.log('\nHeld-out (release gate):');
if (report.heldout.error) {
    console.log(`  INVALID: ${report.heldout.error}`);
    process.exit(1);
}
console.log(`  ${report.heldout.cases} labelled cases in ${report.heldout.files} file(s)`);
if (report.heldout.cases === 0) {
    console.log('  No held-out labels exist: ranking has no validation beyond tuning fixtures.');
    console.log('  See tests/fixtures/heldout/README.md.');
}

// Progress against the labeling worksheet, and whether what exists is fit to gate on.
const { loadWorksheet, summarizeCoverage } = require('../server/services/heldoutWorksheet');
const { evaluateHeldout } = require('../server/services/heldoutEval');

const sheet = summarizeCoverage(loadWorksheet());
const evaluation = evaluateHeldout();
console.log(`\nLabeling worksheet: ${sheet.total} scenarios defined (target 100-200 labelled scenarios)`);
console.log(`Labelled scenarios: ${evaluation.labelledCases ?? 0}`);
if (evaluation.agreement?.pairs) {
    console.log(`Labeler agreement: kappa ${evaluation.agreement.kappa} over ${evaluation.agreement.pairs} double-labelled candidate(s)`);
}
console.log(`Release evaluation status: ${evaluation.status}`);
for (const p of (evaluation.problems || []).slice(0, 10)) console.log(`  ${p}`);
if (process.argv.includes('--require-labels') && !evaluation.passed) {
    console.log('\n--require-labels: the held-out evaluation has not passed.');
    process.exit(1);
}
