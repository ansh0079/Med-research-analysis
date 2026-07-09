'use strict';

/**
 * Confidence Calibration Service
 *
 * Calculates calibrated confidence scores for AI-generated content
 * to help users understand when to trust or verify outputs
 */

/**
 * Calculates calibrated confidence for synthesis results
 */
function calculateSynthesisConfidence(synthesisResult) {
    const factors = {
        fullTextCoverage: Number(synthesisResult.audit?.fullTextCoverageRatio || 0),
        citationRelevance: synthesisResult.citationValidation?.citationRelevance?.hasIrrelevantCitations ? 0.7 : 1.0,
        sourceCount: Math.min((synthesisResult.sources?.length || 0) / 10, 1.0),
        evidenceGrade: getEvidenceGradeWeight(synthesisResult.synthesis?.evidenceGrade),
        retractionWarning: synthesisResult.retractionWarning ? 0.3 : 1.0,
        sourceQuality: calculateAverageSourceQuality(synthesisResult.sources)
    };

    const weights = {
        fullTextCoverage: 0.25,
        citationRelevance: 0.20,
        sourceCount: 0.15,
        evidenceGrade: 0.20,
        retractionWarning: 0.10,
        sourceQuality: 0.10
    };

    const score = Object.keys(factors).reduce((sum, key) => {
        return sum + (factors[key] * weights[key]);
    }, 0);

    const calibratedScore = Math.round(score * 100);

    return {
        score: calibratedScore,
        label: getConfidenceLabel(calibratedScore),
        color: getConfidenceColor(calibratedScore),
        factors: Object.entries(factors).map(([name, value]) => ({
            name: formatFactorName(name),
            value: Math.round(value * 100),
            weight: Math.round(weights[name] * 100),
            contribution: Math.round(value * weights[name] * 100)
        })),
        recommendation: getConfidenceRecommendation(calibratedScore, factors),
        trustLevel: getTrustLevel(calibratedScore)
    };
}

/**
 * Calculates confidence for MCQ questions
 */
function calculateMCQConfidence(mcq, metadata = {}) {
    const factors = {
        validation: metadata.validationPassed ? 1.0 : 0.5,
        sourceReference: mcq.sourceReference ? 0.9 : 0.6,
        diversityScore: metadata.diversityScore || 0.7,
        userFeedback: calculateUserFeedbackScore(metadata.previousAttempts),
        generationModel: metadata.provider === 'gemini' ? 0.85 : 0.75
    };

    const weights = {
        validation: 0.35,
        sourceReference: 0.25,
        diversityScore: 0.20,
        userFeedback: 0.15,
        generationModel: 0.05
    };

    const score = Object.keys(factors).reduce((sum, key) => {
        return sum + (factors[key] * weights[key]);
    }, 0);

    return {
        score: Math.round(score * 100),
        label: getConfidenceLabel(Math.round(score * 100)),
        factors,
        recommendation: score < 0.7 ? 'Review question carefully - may have issues' : null
    };
}

/**
 * Calculates confidence for case scenarios
 */
function calculateCaseConfidence(caseScenario) {
    const factors = {
        branchingDepth: Math.min(Object.keys(caseScenario.decisionTree || {}).length / 4, 1.0),
        outcomeVariety: Math.min(Object.keys(caseScenario.outcomes || {}).length / 3, 1.0),
        feedbackQuality: assessFeedbackQuality(caseScenario),
        clinicalRealism: 0.8  // Placeholder - would need expert review
    };

    const score = Object.values(factors).reduce((sum, val) => sum + val, 0) / Object.keys(factors).length;

    return {
        score: Math.round(score * 100),
        label: getConfidenceLabel(Math.round(score * 100)),
        factors
    };
}

// Maps the app's 1-5 pre-answer confidence slider ("1 = guessing, 5 = certain")
// to a predicted probability of being correct, so it can be compared against
// observed accuracy. 5 maps to 0.95 rather than 1.0 — claiming literal 100%
// certainty is a stronger claim than the UI's "certain" label warrants, and
// keeping it under 1.0 avoids Brier-score edge behavior at exactly 0/1.
const CONFIDENCE_TO_PROBABILITY = { 1: 0.2, 2: 0.4, 3: 0.6, 4: 0.8, 5: 0.95 };
const MIN_BUCKET_SAMPLE_FOR_VERDICT = 5;

/**
 * Aggregate a reliability diagram: for each confidence level 1-5, the
 * observed accuracy vs. what that confidence level predicts, and the gap
 * between them. A well-calibrated learner has gap ≈ 0 at every level; large
 * negative gaps at high confidence = overconfidence, large positive gaps at
 * low confidence = underconfidence (a milder, lower-priority problem).
 * @param {Array<{ isCorrect: boolean, confidence: number|null }>} attempts
 * @returns {Array<{ confidenceLevel: number, predictedProbability: number, observedAccuracy: number|null, gap: number|null, count: number }>}
 */
function computeCalibrationCurve(attempts) {
    const byLevel = new Map([1, 2, 3, 4, 5].map((level) => [level, { correct: 0, total: 0 }]));
    for (const a of attempts || []) {
        const level = Math.round(Number(a.confidence));
        if (!byLevel.has(level)) continue;
        const bucket = byLevel.get(level);
        bucket.total += 1;
        if (a.isCorrect) bucket.correct += 1;
    }
    return [...byLevel.entries()].map(([confidenceLevel, { correct, total }]) => {
        const predictedProbability = CONFIDENCE_TO_PROBABILITY[confidenceLevel];
        const observedAccuracy = total > 0 ? correct / total : null;
        return {
            confidenceLevel,
            predictedProbability,
            observedAccuracy,
            gap: observedAccuracy != null ? Math.round((observedAccuracy - predictedProbability) * 100) / 100 : null,
            count: total,
        };
    });
}

/**
 * Brier score: mean squared error between predicted probability (from
 * confidence) and the binary outcome. 0 = perfect, 0.25 = the score from
 * always predicting 50/50, 1 = maximally wrong every time.
 */
function computeBrierScore(attempts) {
    const scored = (attempts || []).filter((a) => CONFIDENCE_TO_PROBABILITY[Math.round(Number(a.confidence))] != null);
    if (scored.length === 0) return null;
    const sumSquaredError = scored.reduce((sum, a) => {
        const p = CONFIDENCE_TO_PROBABILITY[Math.round(Number(a.confidence))];
        const outcome = a.isCorrect ? 1 : 0;
        return sum + (p - outcome) ** 2;
    }, 0);
    return Math.round((sumSquaredError / scored.length) * 1000) / 1000;
}

/**
 * Human-readable calibration verdict, keyed on the highest-confidence bucket
 * with enough samples to trust — that's the one that matters most for
 * clinical safety (a learner confidently wrong is the dangerous case).
 */
function describeCalibrationVerdict(curve) {
    const trustworthy = curve.filter((b) => b.count >= MIN_BUCKET_SAMPLE_FOR_VERDICT && b.gap != null);
    if (trustworthy.length === 0) {
        return { verdict: 'insufficient_data', message: 'Not enough confidence-rated attempts yet to assess calibration.' };
    }
    const highestConfidenceBucket = trustworthy.reduce((best, b) => (b.confidenceLevel > best.confidenceLevel ? b : best));
    if (highestConfidenceBucket.gap <= -0.2) {
        return {
            verdict: 'overconfident',
            message: `When you rate yourself confidence ${highestConfidenceBucket.confidenceLevel}/5, you're actually right only ${Math.round(highestConfidenceBucket.observedAccuracy * 100)}% of the time — worth double-checking answers you feel certain about.`,
        };
    }
    const lowestConfidenceBucket = trustworthy.reduce((worst, b) => (b.confidenceLevel < worst.confidenceLevel ? b : worst));
    if (lowestConfidenceBucket.gap >= 0.3) {
        return {
            verdict: 'underconfident',
            message: `At confidence ${lowestConfidenceBucket.confidenceLevel}/5 ("guessing") you're actually right ${Math.round(lowestConfidenceBucket.observedAccuracy * 100)}% of the time — you may know more than you think.`,
        };
    }
    return { verdict: 'well_calibrated', message: 'Your confidence ratings track your actual accuracy reasonably well.' };
}

/**
 * Full calibration summary for a set of confidence-rated attempts: the
 * reliability curve, Brier score, bucket counts by risk category (reusing
 * classifyCalibrationAttempt), and a plain-language verdict.
 * @param {Array<{ isCorrect: boolean, confidence: number|null }>} attempts
 */
function summarizeCalibration(attempts) {
    const rated = (attempts || []).filter((a) => a.confidence != null && Number.isFinite(Number(a.confidence)));
    const curve = computeCalibrationCurve(rated);
    const brierScore = computeBrierScore(rated);
    const { verdict, message } = describeCalibrationVerdict(curve);

    const bucketCounts = { dangerous_misconception: 0, needs_consolidation: 0, calibrated_correct: 0, low_confidence_incorrect: 0 };
    for (const a of rated) {
        const { bucket } = classifyCalibrationAttempt(a);
        if (bucket in bucketCounts) bucketCounts[bucket] += 1;
    }

    return {
        sampleSize: rated.length,
        curve,
        brierScore,
        verdict,
        message,
        bucketCounts,
    };
}

function classifyCalibrationAttempt({ isCorrect, confidence }) {
    const value = Number(confidence);
    const normalizedConfidence = Number.isFinite(value) ? value : 0;
    if (!isCorrect && normalizedConfidence >= 4) {
        return {
            bucket: 'dangerous_misconception',
            severity: 'high',
            label: 'High confidence incorrect answer',
        };
    }
    if (isCorrect && normalizedConfidence <= 2) {
        return {
            bucket: 'needs_consolidation',
            severity: 'medium',
            label: 'Correct but low confidence',
        };
    }
    return {
        bucket: isCorrect ? 'calibrated_correct' : 'low_confidence_incorrect',
        severity: 'low',
        label: isCorrect ? 'Calibrated correct answer' : 'Low confidence incorrect answer',
    };
}

// Helper functions

function getEvidenceGradeWeight(grade) {
    const gradeMap = {
        'HIGH': 1.0,
        'MODERATE': 0.75,
        'LOW': 0.5,
        'VERY_LOW': 0.3
    };
    return gradeMap[grade] || 0.5;
}

function calculateAverageSourceQuality(sources = []) {
    if (!sources.length) return 0.5;

    const qualities = sources.map(s => {
        // Assume quality score is stored in _quality if available
        return s._quality?.score ? s._quality.score / 100 : 0.7;
    });

    return qualities.reduce((sum, q) => sum + q, 0) / qualities.length;
}

function calculateUserFeedbackScore(attempts = []) {
    if (!attempts || attempts.length === 0) return 0.7;  // Neutral default

    const correctRate = attempts.filter(a => a.isCorrect).length / attempts.length;
    return correctRate;
}

function assessFeedbackQuality(caseScenario) {
    const tree = caseScenario.decisionTree || {};
    const nodes = Object.values(tree);

    if (nodes.length === 0) return 0.5;

    const hasDetailedFeedback = nodes.every(node =>
        Array.isArray(node.options) &&
        node.options.every(opt => opt.feedback && opt.feedback.length > 50)
    );

    return hasDetailedFeedback ? 1.0 : 0.6;
}

function getConfidenceLabel(score) {
    if (score >= 85) return 'High Confidence';
    if (score >= 70) return 'Moderate Confidence';
    if (score >= 50) return 'Low Confidence';
    return 'Very Low Confidence';
}

function getConfidenceColor(score) {
    if (score >= 85) return 'green';
    if (score >= 70) return 'blue';
    if (score >= 50) return 'yellow';
    return 'red';
}

function getTrustLevel(score) {
    if (score >= 85) return 'high';
    if (score >= 70) return 'moderate';
    if (score >= 50) return 'low';
    return 'verify_required';
}

function getConfidenceRecommendation(score, factors) {
    const recommendations = [];

    if (score < 70) {
        recommendations.push('Verify with primary sources before clinical application');
    }

    if (factors.fullTextCoverage < 0.3) {
        recommendations.push('Limited to abstracts - may miss critical methodology details');
    }

    if (factors.retractionWarning < 1.0) {
        recommendations.push('Contains retracted sources - exercise extreme caution');
    }

    if (factors.citationRelevance < 0.9) {
        recommendations.push('Some citations may not fully support claims - verify independently');
    }

    if (factors.sourceCount < 0.5) {
        recommendations.push('Based on limited sources - seek additional evidence');
    }

    return recommendations.length > 0 ? recommendations : null;
}

function formatFactorName(name) {
    return name
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase())
        .trim();
}

module.exports = {
    calculateSynthesisConfidence,
    calculateMCQConfidence,
    calculateCaseConfidence,
    classifyCalibrationAttempt,
    computeCalibrationCurve,
    computeBrierScore,
    describeCalibrationVerdict,
    summarizeCalibration,
    CONFIDENCE_TO_PROBABILITY,
};
