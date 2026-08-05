'use strict';

const VALID_QUESTION_TYPES = new Set([
    'recall',
    'clinical_application',
    'trial_interpretation',
    'guideline',
    'pitfall',
]);

const VALID_DIFFICULTIES = new Set(['easy', 'medium', 'hard']);
const SOURCE_LABEL_PATTERN = /\[(Trial|Guideline|Topic memory|Evidence|Source \d+|G\d+)\]$/i;
const ABSOLUTE_CLAIM_PATTERN = /\b(always|never|guarantees?|cures?|eliminates?|no risk|completely safe)\b/i;
const UNSAFE_DIRECTIVE_PATTERN = /\b(start|stop|increase|decrease|prescribe|administer|withhold)\b[^.]{0,80}\b(immediately|without|regardless|all patients|every patient)\b/i;

function uniqueStrings(values) {
    return new Set((Array.isArray(values) ? values : []).map((value) => String(value || '').trim().toLowerCase()).filter(Boolean));
}

function correctLetter(question) {
    const raw = String(question?.correctAnswer || '').trim().toUpperCase();
    const match = raw.match(/^[A-D]/);
    return match ? match[0] : null;
}

function optionLetters(options) {
    return (Array.isArray(options) ? options : [])
        .map((option) => String(option || '').trim().match(/^([A-D])\s*:/i)?.[1]?.toUpperCase())
        .filter(Boolean);
}

function hasClinicalVignette(questionText) {
    const text = String(questionText || '');
    const hasAge = /\b\d{1,3}[- ]year[- ]old\b/i.test(text) || /\b(age|aged)\s+\d{1,3}\b/i.test(text);
    const hasSex = /\b(man|woman|male|female|boy|girl|patient)\b/i.test(text);
    const hasClinicalDetail = /\b(presents?|history|examination|blood pressure|heart rate|oxygen|hypoxa?emia|creatinine|fever|pain|dyspnoea|dyspnea|ards|pneumonia|ventilat(?:ed|ion|or)|comorbid|medication|laboratory|x-ray|ct|ecg)\b/i.test(text);
    return hasAge && hasSex && hasClinicalDetail;
}

function hasAllDistractorRationales(question) {
    const letter = correctLetter(question);
    const rationale = question?.distractorRationale;
    if (!letter || !rationale || typeof rationale !== 'object') return false;
    return ['A', 'B', 'C', 'D']
        .filter((candidate) => candidate !== letter)
        .every((candidate) => String(rationale[candidate] || '').trim().length >= 12);
}

function scoreMcq(question, options = {}) {
    const issues = [];
    let score = 100;
    const qType = String(question?.questionType || '').trim();
    const difficulty = String(question?.difficulty || '').trim();
    const opts = Array.isArray(question?.options) ? question.options : [];
    const letters = optionLetters(opts);
    const answer = correctLetter(question);
    const questionText = String(question?.question || '');
    const explanation = String(question?.explanation || '');

    if (!VALID_QUESTION_TYPES.has(qType)) {
        issues.push('invalid_question_type');
        score -= 12;
    }
    if (!VALID_DIFFICULTIES.has(difficulty)) {
        issues.push('invalid_difficulty');
        score -= 8;
    }
    if (opts.length !== 4 || uniqueStrings(letters).size !== 4) {
        issues.push('invalid_option_shape');
        score -= 18;
    }
    if (!answer || !letters.includes(answer)) {
        issues.push('invalid_correct_answer');
        score -= 18;
    }
    if (uniqueStrings(opts.map((opt) => opt.replace(/^[A-D]\s*:\s*/i, ''))).size !== opts.length) {
        issues.push('duplicate_options');
        score -= 12;
    }
    if (/\ball of the above\b|\bnone of the above\b/i.test(opts.join(' '))) {
        issues.push('non_discriminating_option');
        score -= 8;
    }
    if (['clinical_application', 'guideline', 'pitfall'].includes(qType) && !hasClinicalVignette(questionText)) {
        issues.push('missing_clinical_vignette');
        score -= 12;
    }
    if (explanation.length < 80) {
        issues.push('thin_explanation');
        score -= 10;
    }
    if (options.requireSourceLabel !== false && !SOURCE_LABEL_PATTERN.test(explanation.trim())) {
        issues.push('missing_source_label');
        score -= 10;
    }
    if (!hasAllDistractorRationales(question)) {
        issues.push('missing_distractor_rationales');
        score -= 12;
    }
    if (options.requireClaimKey && !question?.claimKey) {
        issues.push('missing_claim_key');
        score -= 10;
    }
    const correctOption = opts.find((opt) => String(opt || '').trim().toUpperCase().startsWith(`${answer}:`)) || '';
    const combinedText = `${questionText} ${correctOption} ${explanation}`;
    if (ABSOLUTE_CLAIM_PATTERN.test(combinedText)) {
        issues.push('absolute_or_overclaimed_language');
        score -= 10;
    }
    if (UNSAFE_DIRECTIVE_PATTERN.test(combinedText)) {
        issues.push('unsafe_directive_language');
        score -= 18;
    }

    return {
        score: Math.max(0, score),
        pass: score >= (options.passScore ?? 80) && issues.length <= (options.maxIssues ?? 2),
        issues,
    };
}

function evaluateMcqSet(questions, options = {}) {
    const rows = (Array.isArray(questions) ? questions : []).map((question, index) => ({
        index,
        ...scoreMcq(question, options),
    }));
    const avgScore = rows.length
        ? Math.round((rows.reduce((sum, row) => sum + row.score, 0) / rows.length) * 10) / 10
        : 0;
    const passRate = rows.length ? rows.filter((row) => row.pass).length / rows.length : 0;
    const typeCoverage = uniqueStrings((Array.isArray(questions) ? questions : []).map((q) => q.questionType)).size;
    const difficultyCoverage = uniqueStrings((Array.isArray(questions) ? questions : []).map((q) => q.difficulty)).size;
    return {
        count: rows.length,
        avgScore,
        passRate,
        typeCoverage,
        difficultyCoverage,
        rows,
        pass: rows.length >= (options.minCount ?? 3)
            && passRate >= (options.minPassRate ?? 0.8)
            && avgScore >= (options.minAverageScore ?? 82),
    };
}

function parseCitationNumbers(values) {
    return (Array.isArray(values) ? values : [])
        .map((value) => Number.parseInt(String(value), 10))
        .filter((value) => Number.isInteger(value) && value > 0);
}

function scoreCaseOutput(caseOutput, options = {}) {
    const issues = [];
    let score = 100;
    const evidenceCount = Math.max(0, Number(options.evidenceCount || 0));
    const requiredFields = [
        'caseSummary',
        'vignette',
        'patientPresentation',
        'keyDecisionPoint',
        'differentialReasoning',
        'evidenceExplanation',
        'disclaimer',
        'safetyNotes',
    ];

    for (const field of requiredFields) {
        if (!String(caseOutput?.[field] || '').trim()) {
            issues.push(`missing_${field}`);
            score -= 8;
        }
    }

    const interventions = Array.isArray(caseOutput?.interventions) ? caseOutput.interventions : [];
    if (interventions.length === 0) {
        issues.push('missing_interventions');
        score -= 8;
    }
    for (const intervention of interventions) {
        const citations = parseCitationNumbers(intervention.citations);
        if (citations.length === 0) {
            issues.push('intervention_missing_citations');
            score -= 6;
        }
        if (evidenceCount > 0 && citations.some((citation) => citation > evidenceCount)) {
            issues.push('intervention_invalid_citation');
            score -= 12;
        }
    }

    const mcqEval = evaluateMcqSet(caseOutput?.caseMCQs || [], {
        requireSourceLabel: false,
        minCount: 3,
        minPassRate: 0.75,
        minAverageScore: 78,
    });
    if (!mcqEval.pass) {
        issues.push('case_mcq_quality_below_gate');
        score -= 15;
    }

    const paperApplications = Array.isArray(caseOutput?.paperApplications) ? caseOutput.paperApplications : [];
    if (paperApplications.length === 0) {
        issues.push('missing_paper_applications');
        score -= 8;
    }
    if (evidenceCount > 0 && paperApplications.some((row) => Number(row.studyIndex) > evidenceCount || Number(row.studyIndex) < 1)) {
        issues.push('paper_application_invalid_index');
        score -= 10;
    }

    const disclaimer = String(caseOutput?.disclaimer || '');
    if (!/not a substitute|research support|clinical judgement|verify/i.test(disclaimer)) {
        issues.push('weak_disclaimer');
        score -= 10;
    }
    const narrativeFields = requiredFields.map((field) => caseOutput?.[field]);
    const interventionText = interventions.flatMap((row) => [row?.name, row?.rationale, row?.evidenceStrength]);
    const caseMcqSafetyText = (Array.isArray(caseOutput?.caseMCQs) ? caseOutput.caseMCQs : [])
        .flatMap((question) => {
            const answer = correctLetter(question);
            const correctOption = (Array.isArray(question?.options) ? question.options : [])
                .find((opt) => String(opt || '').trim().toUpperCase().startsWith(`${answer}:`));
            return [question?.question, correctOption, question?.explanation];
        });
    const combinedText = [...narrativeFields, ...interventionText, ...caseMcqSafetyText].join(' ');
    if (UNSAFE_DIRECTIVE_PATTERN.test(combinedText)) {
        issues.push('unsafe_directive_language');
        score -= 18;
    }

    const finalScore = Math.max(0, score);
    return {
        score: finalScore,
        pass: finalScore >= (options.passScore ?? 80) && issues.length <= (options.maxIssues ?? 3),
        issues,
        mcqEval,
    };
}

function evaluateLearningPlan(plan, options = {}) {
    const issues = [];
    let score = 100;
    const weakClaims = uniqueStrings(options.weakClaimKeys || []);
    const misconceptionClaims = uniqueStrings(options.misconceptionClaimKeys || []);
    const dueOutlineNodes = uniqueStrings(options.dueOutlineNodeIds || []);
    const selectedClaims = uniqueStrings(plan?.selectedClaimKeys || []);
    const selectedNodes = uniqueStrings(plan?.selectedOutlineNodeIds || []);

    if (weakClaims.size > 0 && [...weakClaims].every((claim) => !selectedClaims.has(claim))) {
        issues.push('does_not_target_weak_claim');
        score -= 22;
    }
    if (misconceptionClaims.size > 0 && [...misconceptionClaims].every((claim) => !selectedClaims.has(claim))) {
        issues.push('does_not_target_misconception');
        score -= 22;
    }
    if (dueOutlineNodes.size > 0 && [...dueOutlineNodes].every((node) => !selectedNodes.has(node))) {
        issues.push('does_not_target_due_spaced_rep_node');
        score -= 16;
    }
    if (options.expectedDifficulty && plan?.difficulty !== options.expectedDifficulty) {
        issues.push('wrong_difficulty_calibration');
        score -= 18;
    }
    if (options.expectedQuestionType && !uniqueStrings(plan?.questionTypes || []).has(options.expectedQuestionType)) {
        issues.push('missing_expected_question_type');
        score -= 14;
    }
    if (Array.isArray(plan?.selectedClaimKeys) && plan.selectedClaimKeys.length !== selectedClaims.size) {
        issues.push('duplicate_claim_selection');
        score -= 8;
    }

    const finalScore = Math.max(0, score);
    return {
        score: finalScore,
        pass: finalScore >= (options.passScore ?? 80) && issues.length <= (options.maxIssues ?? 2),
        issues,
    };
}

function summarizeLearningQuality(results, thresholds = {}) {
    const mcqRows = results.mcq || [];
    const caseRows = results.case || [];
    const learningRows = results.learning || [];
    const passRate = (rows) => rows.length ? rows.filter((row) => row.pass).length / rows.length : 0;
    const avg = (rows) => rows.length
        ? Math.round((rows.reduce((sum, row) => sum + Number(row.score || row.avgScore || 0), 0) / rows.length) * 10) / 10
        : 0;
    const summary = {
        mcq: { count: mcqRows.length, passRate: passRate(mcqRows), avgScore: avg(mcqRows) },
        case: { count: caseRows.length, passRate: passRate(caseRows), avgScore: avg(caseRows) },
        learning: { count: learningRows.length, passRate: passRate(learningRows), avgScore: avg(learningRows) },
    };
    const gates = {
        mcqPassRate: thresholds.mcqPassRate ?? 0.8,
        casePassRate: thresholds.casePassRate ?? 0.8,
        learningPassRate: thresholds.learningPassRate ?? 0.8,
        minMcqAvg: thresholds.minMcqAvg ?? 82,
        minCaseAvg: thresholds.minCaseAvg ?? 80,
        minLearningAvg: thresholds.minLearningAvg ?? 82,
    };
    summary.pass = summary.mcq.passRate >= gates.mcqPassRate
        && summary.case.passRate >= gates.casePassRate
        && summary.learning.passRate >= gates.learningPassRate
        && summary.mcq.avgScore >= gates.minMcqAvg
        && summary.case.avgScore >= gates.minCaseAvg
        && summary.learning.avgScore >= gates.minLearningAvg;
    summary.gates = gates;
    return summary;
}

function expectationOk(row) {
    return row.expectPass === undefined || Boolean(row.pass) === Boolean(row.expectPass);
}

/**
 * Run every mcqSet/caseOutput/learningPlan in a gold fixture through its
 * matching scorer and roll the results up into one pass/fail summary. Shared
 * by scripts/eval-learning-quality.js (manual/CI runs) and
 * learningQualityEvalScheduler.js (nightly cron) so both use identical
 * scoring logic — see either caller for the fixture file shape.
 * @param {{ mcqSets?: object[], caseOutputs?: object[], learningPlans?: object[], thresholds?: object }} fixture
 */
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

module.exports = {
    scoreMcq,
    evaluateMcqSet,
    scoreCaseOutput,
    evaluateLearningPlan,
    summarizeLearningQuality,
    evaluateFixture,
};
