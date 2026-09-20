#!/usr/bin/env node
/**
 * Report held-out labeling worksheet state: coverage against the section 14.1
 * stratification targets, per-family/intent/dimension distribution, and the
 * graduation path from scenario to release-gate fixture.
 * Exits 1 only if the worksheet itself is structurally invalid.
 */
const {
    loadWorksheet,
    validateWorksheet,
    summarizeCoverage,
    checkAggregateDiversity,
    WorksheetError,
} = require('../server/services/heldoutWorksheet');
const { describeDatasets, loadReleaseGateCases } = require('../server/services/evalDatasetPolicy');

try {
    const sheet = loadWorksheet();
    validateWorksheet(sheet);
    const cov = summarizeCoverage(sheet);
    console.log(`Worksheet: ${cov.total} seed scenarios across ${Object.keys(cov.byIntent).length} intents, ${Object.keys(cov.byDimension).length} dimensions, ${Object.keys(cov.byFamily).length} families`);
    console.log('\nBy intent:');
    for (const [k, v] of Object.entries(cov.byIntent)) console.log(`  ${k}: ${v}`);
    console.log('\nBy family:');
    for (const [k, v] of Object.entries(cov.byFamily).sort((a, b) => b[1] - a[1])) console.log(`  ${k}: ${v}`);
    const per = sheet.targets?.judgedCandidatesPerScenario || '3-5';
    console.log(`\nTargets: ${sheet.targets?.labelledQueryScenarios || '?'} labelled scenarios, ${per} judged candidates each`);
    console.log('Reviewer rule:', sheet.targets?.reviewerRule || '?');

    const gate = describeDatasets();
    console.log(`\nRelease gate: ${gate.heldout.cases} graduated held-out case(s)`);
    if (gate.heldout.cases > 0) {
        const { cases } = loadReleaseGateCases();
        const { problems, unknownQueries } = checkAggregateDiversity(cases, sheet);
        for (const p of problems) console.log(`  STRATIFICATION WARNING: ${p}`);
        for (const q of unknownQueries) console.log(`  no worksheet scenario for graduated query: ${q}`);
        if (problems.length === 0 && unknownQueries.length === 0) {
            console.log('  Aggregate stratification guard: pass');
        }
    } else {
        console.log('Next step: reviewers label candidates per scenario watchFor/guidance, then graduate');
        console.log('validated fixtures to the top level of tests/fixtures/heldout/ (validated by');
        console.log('server/services/heldoutWorksheet.js#validateGraduatedFixture).');
    }
} catch (err) {
    if (err instanceof WorksheetError) {
        console.error(`INVALID worksheet: ${err.message}`);
        process.exit(1);
    }
    throw err;
}
