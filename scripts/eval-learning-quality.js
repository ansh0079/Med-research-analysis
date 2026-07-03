#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const {
    evaluateMcqSet,
    scoreCaseOutput,
    evaluateLearningPlan,
    summarizeLearningQuality,
} = require('../server/services/learningQualityEvalService');

const args = process.argv.slice(2);

function flag(name, fallback) {
    const idx = args.indexOf(name);
    return idx === -1 ? fallback : args[idx + 1];
}

function pct(value) {
    return `${Math.round(Number(value || 0) * 100)}%`;
}

function loadFixture() {
    const fixturePath = path.resolve(process.cwd(), flag('--fixture', 'tests/fixtures/learning-quality-gold.json'));
    return {
        fixturePath,
        fixture: JSON.parse(fs.readFileSync(fixturePath, 'utf8')),
    };
}

function expectationOk(row) {
    return row.expectPass === undefined || Boolean(row.pass) === Boolean(row.expectPass);
}

function evaluateFixture(fixture) {
    const mcq = (fixture.mcqSets || []).map((spec) => {
        const result = evaluateMcqSet(spec.questions, spec.options || {});
        return {
            id: spec.id,
            expectPass: spec.expectPass,
            ...result,
            expectationOk: expectationOk({ ...result, expectPass: spec.expectPass }),
        };
    });

    const caseRows = (fixture.caseOutputs || []).map((spec) => {
        const result = scoreCaseOutput(spec.case, spec.options || {});
        return {
            id: spec.id,
            expectPass: spec.expectPass,
            ...result,
            expectationOk: expectationOk({ ...result, expectPass: spec.expectPass }),
        };
    });

    const learning = (fixture.learningPlans || []).map((spec) => {
        const result = evaluateLearningPlan(spec.plan, spec.options || {});
        return {
            id: spec.id,
            expectPass: spec.expectPass,
            ...result,
            expectationOk: expectationOk({ ...result, expectPass: spec.expectPass }),
        };
    });

    const summary = summarizeLearningQuality({ mcq, case: caseRows, learning }, fixture.thresholds || {});
    const expectationFailures = [...mcq, ...caseRows, ...learning].filter((row) => !row.expectationOk);
    return {
        summary: {
            ...summary,
            expectationFailures: expectationFailures.map((row) => row.id),
            pass: summary.pass && expectationFailures.length === 0,
        },
        mcq,
        case: caseRows,
        learning,
    };
}

function printRows(label, rows) {
    console.log(`\n${label}`);
    for (const row of rows) {
        const status = row.pass ? 'PASS' : 'FAIL';
        const expectation = row.expectPass === undefined ? '' : ` expected=${row.expectPass ? 'PASS' : 'FAIL'} ${row.expectationOk ? 'ok' : 'MISMATCH'}`;
        const score = row.avgScore ?? row.score;
        const issues = row.issues?.length ? ` issues=${row.issues.join(',')}` : '';
        console.log(`  ${status} ${row.id} score=${score}${expectation}${issues}`);
    }
}

function printSummary(result, fixturePath) {
    const s = result.summary;
    console.log('\nLearning Quality Eval');
    console.log(`Fixture: ${fixturePath}`);
    console.log(`MCQ:      count=${s.mcq.count} passRate=${pct(s.mcq.passRate)} avg=${s.mcq.avgScore}`);
    console.log(`Cases:    count=${s.case.count} passRate=${pct(s.case.passRate)} avg=${s.case.avgScore}`);
    console.log(`Learning: count=${s.learning.count} passRate=${pct(s.learning.passRate)} avg=${s.learning.avgScore}`);
    if (s.expectationFailures.length) {
        console.log(`Expectation mismatches: ${s.expectationFailures.join(', ')}`);
    }
    console.log(`Gate: ${s.pass ? 'PASS' : 'FAIL'}`);
}

function main() {
    const { fixturePath, fixture } = loadFixture();
    const result = evaluateFixture(fixture);
    printSummary(result, fixturePath);
    printRows('MCQ Sets', result.mcq);
    printRows('Case Outputs', result.case);
    printRows('Learning Plans', result.learning);

    if (args.includes('--json')) {
        console.log(JSON.stringify(result, null, 2));
    }

    process.exit(result.summary.pass ? 0 : 1);
}

if (require.main === module) {
    main();
}

module.exports = { evaluateFixture };
