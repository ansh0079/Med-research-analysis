#!/usr/bin/env node
/**
 * Offline search personalization eval (no HTTP server required).
 * Mirrors tests/unit/searchPersonalizationEval.test.js for local reports.
 */

const {
    applySearchLearningBoost,
    collectTrajectoryTerms,
} = require('../server/services/searchLearningService');
const { resolveClaimMasteryState } = require('../server/services/claimRemediationService');

const CASES = [
    {
        label: 'trajectory',
        articles: [
            { uid: 'a', title: 'Sacubitril in chronic heart failure', abstract: 'HFrEF', pmid: 'a' },
            { uid: 'b', title: 'Nutrition survey', abstract: 'diet', pmid: 'b' },
        ],
        query: 'heart failure',
        previousQueries: ['SGLT2 inhibitors heart failure'],
        expectUid: 'a',
    },
    {
        label: 'saved',
        articles: [
            { uid: 'x', title: 'Sepsis bundle', abstract: 'cohort', pmid: 'x' },
            { uid: 'y', title: 'Early antibiotics in sepsis', abstract: 'RCT', pmid: 'y' },
        ],
        query: 'sepsis',
        savedUid: 'y',
        expectUid: 'y',
    },
];

function runCase(testCase) {
    const context = {
        shouldPersonalize: true,
        preferredArticleUids: new Map(),
        savedArticleUids: testCase.savedUid ? new Map([[testCase.savedUid, 1]]) : new Map(),
        helpfulArticleUids: new Map(),
        notHelpfulArticleUids: new Map(),
        interactionArticleUids: new Map(),
        impressionArticleUids: new Map(),
        missedPaperUids: new Map(),
        weakArticleUids: new Set(),
        trajectoryTerms: collectTrajectoryTerms(testCase.previousQueries || [], []),
        profileWeakTopics: [],
    };
    const ranked = applySearchLearningBoost(testCase.articles, context);
    const top = ranked[0]?.uid;
    const pass = top === testCase.expectUid;
    return { pass, top, expected: testCase.expectUid };
}

function main() {
    console.log('\nSearch personalization eval (offline)\n');
    let passed = 0;
    for (const testCase of CASES) {
        const { pass, top, expected } = runCase(testCase);
        console.log(`  ${pass ? '✓' : '✗'} ${testCase.label.padEnd(12)} top=${top} expected=${expected}`);
        if (pass) passed += 1;
    }
    const masteryOk = resolveClaimMasteryState({ attempts: 5, correct: 5, gapSignals: 1 }) === 'weak';
    console.log(`  ${masteryOk ? '✓' : '✗'} claim_gap   mastery=weak when gap signal present`);
    if (masteryOk) passed += 1;

    const total = CASES.length + 1;
    console.log(`\n${passed}/${total} checks passed\n`);
    process.exit(passed === total ? 0 : 1);
}

main();
