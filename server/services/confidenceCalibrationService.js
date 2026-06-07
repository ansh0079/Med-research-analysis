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
    calculateCaseConfidence
};
