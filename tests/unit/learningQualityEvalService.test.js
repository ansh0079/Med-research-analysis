'use strict';

const fixture = require('../fixtures/learning-quality-gold.json');
const {
    evaluateMcqSet,
    scoreCaseOutput,
    evaluateLearningPlan,
    summarizeLearningQuality,
    evaluateFixture,
} = require('../../server/services/learningQualityEvalService');

describe('learning quality eval service', () => {
    test('separates grounded MCQ sets from thin or unsafe MCQ sets', () => {
        const good = fixture.mcqSets.find((row) => row.id === 'ards_guideline_good');
        const bad = fixture.mcqSets.find((row) => row.id === 'unsafe_thin_bad');

        const goodResult = evaluateMcqSet(good.questions, good.options);
        const badResult = evaluateMcqSet(bad.questions, bad.options);

        expect(goodResult.pass).toBe(true);
        expect(goodResult.typeCoverage).toBeGreaterThanOrEqual(3);
        expect(goodResult.avgScore).toBeGreaterThanOrEqual(90);

        expect(badResult.pass).toBe(false);
        expect(badResult.rows.flatMap((row) => row.issues)).toEqual(expect.arrayContaining([
            'duplicate_options',
            'thin_explanation',
            'missing_source_label',
            'unsafe_directive_language',
        ]));
    });

    test('separates grounded case outputs from ungrounded clinical cases', () => {
        const good = fixture.caseOutputs.find((row) => row.id === 'ards_case_good');
        const bad = fixture.caseOutputs.find((row) => row.id === 'case_bad_no_grounding');

        const goodResult = scoreCaseOutput(good.case, good.options);
        const badResult = scoreCaseOutput(bad.case, bad.options);

        expect(goodResult.pass).toBe(true);
        expect(goodResult.mcqEval.pass).toBe(true);

        expect(badResult.pass).toBe(false);
        expect(badResult.issues).toEqual(expect.arrayContaining([
            'missing_patientPresentation',
            'case_mcq_quality_below_gate',
            'intervention_invalid_citation',
            'paper_application_invalid_index',
            'weak_disclaimer',
        ]));
    });

    test('learning-plan scoring rewards learner-state targeting', () => {
        const good = fixture.learningPlans.find((row) => row.id === 'targets_weak_claim_good');
        const bad = fixture.learningPlans.find((row) => row.id === 'ignores_learner_state_bad');

        const goodResult = evaluateLearningPlan(good.plan, good.options);
        const badResult = evaluateLearningPlan(bad.plan, bad.options);

        expect(goodResult.pass).toBe(true);
        expect(goodResult.score).toBe(100);

        expect(badResult.pass).toBe(false);
        expect(badResult.issues).toEqual(expect.arrayContaining([
            'does_not_target_weak_claim',
            'does_not_target_misconception',
            'does_not_target_due_spaced_rep_node',
            'wrong_difficulty_calibration',
            'missing_expected_question_type',
        ]));
    });

    test('gold fixture summary passes while preserving pass/fail expectations', () => {
        const result = evaluateFixture(fixture);

        expect(result.summary.pass).toBe(true);
        expect(result.summary.expectationFailures).toEqual([]);
        expect(result.mcq.map((row) => row.pass)).toEqual([true, false]);
        expect(result.case.map((row) => row.pass)).toEqual([true, false]);
        expect(result.learning.map((row) => row.pass)).toEqual([true, false]);
    });

    test('summary gate fails when a category average falls below threshold', () => {
        const summary = summarizeLearningQuality(
            {
                mcq: [{ pass: true, avgScore: 100 }],
                case: [{ pass: true, score: 100 }],
                learning: [{ pass: true, score: 70 }],
            },
            { minLearningAvg: 90 }
        );

        expect(summary.pass).toBe(false);
        expect(summary.learning.avgScore).toBe(70);
    });
});
