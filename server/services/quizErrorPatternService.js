'use strict';

const { inferMisconceptionCategory } = require('./misconceptionCategoryService');

/**
 * Aggregate wrong-answer signals from a quiz session into actionable patterns.
 * @param {object[]} attempts - attempts with isCorrect, questionType, reasoningTags, claimKey, confidence
 * @param {{ topic?: string }} [options]
 */
function analyzeQuizErrorPatterns(attempts = [], { topic = '' } = {}) {
    const list = Array.isArray(attempts) ? attempts : [];
    const wrong = list.filter((attempt) => !attempt.isCorrect);
    const total = list.length;

    if (wrong.length === 0) {
        return {
            topic,
            hasPatterns: false,
            sessionMissed: 0,
            sessionTotal: total,
            missRate: 0,
            byQuestionType: {},
            dominantReasoningTags: [],
            recurringClaimKeys: [],
            misconceptionCategories: [],
            calibrationSignals: {},
            recommendations: [],
        };
    }

    const byQuestionType = {};
    const reasoningTagCounts = new Map();
    const claimKeyStats = new Map();
    const misconceptionCategoryCounts = new Map();
    const calibrationSignals = {
        high_confidence_wrong: 0,
        low_confidence_correct: 0,
        knowledge_gap: 0,
        needs_consolidation: 0,
    };

    for (const attempt of list) {
        const tags = Array.isArray(attempt.reasoningTags) ? attempt.reasoningTags : [];
        for (const tag of tags) {
            if (Object.prototype.hasOwnProperty.call(calibrationSignals, tag)) {
                calibrationSignals[tag] += 1;
            }
        }
    }

    for (const attempt of wrong) {
        const questionType = String(attempt.questionType || 'unknown');
        if (!byQuestionType[questionType]) {
            byQuestionType[questionType] = { missed: 0, claimKeys: new Set() };
        }
        byQuestionType[questionType].missed += 1;
        if (attempt.claimKey) byQuestionType[questionType].claimKeys.add(attempt.claimKey);

        for (const tag of Array.isArray(attempt.reasoningTags) ? attempt.reasoningTags : []) {
            reasoningTagCounts.set(tag, (reasoningTagCounts.get(tag) || 0) + 1);
        }

        if (attempt.claimKey) {
            const existing = claimKeyStats.get(attempt.claimKey) || {
                claimKey: attempt.claimKey,
                misses: 0,
                questionTypes: new Set(),
                tags: new Set(),
            };
            existing.misses += 1;
            if (attempt.questionType) existing.questionTypes.add(attempt.questionType);
            for (const tag of Array.isArray(attempt.reasoningTags) ? attempt.reasoningTags : []) {
                existing.tags.add(tag);
            }
            claimKeyStats.set(attempt.claimKey, existing);
        }

        const category = inferMisconceptionCategory({
            questionType: attempt.questionType,
            reasoningTags: attempt.reasoningTags || [],
            claimKey: attempt.claimKey,
        });
        if (category) {
            misconceptionCategoryCounts.set(category, (misconceptionCategoryCounts.get(category) || 0) + 1);
        }
    }

    const dominantReasoningTags = [...reasoningTagCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([tag, count]) => ({
            tag,
            count,
            pct: Math.round((count / wrong.length) * 100),
        }));

    const recurringClaimKeys = [...claimKeyStats.values()]
        .sort((a, b) => b.misses - a.misses)
        .slice(0, 6)
        .map((entry) => ({
            claimKey: entry.claimKey,
            misses: entry.misses,
            questionTypes: [...entry.questionTypes],
            reasoningTags: [...entry.tags].slice(0, 4),
        }));

    const misconceptionCategories = [...misconceptionCategoryCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([category, count]) => ({ category, count }));

    const byQuestionTypeOut = Object.fromEntries(
        Object.entries(byQuestionType).map(([type, stats]) => [
            type,
            { missed: stats.missed, claimKeys: [...stats.claimKeys].slice(0, 4) },
        ])
    );

    const recommendations = buildErrorPatternRecommendations({
        topic,
        dominantReasoningTags,
        recurringClaimKeys,
        misconceptionCategories,
        calibrationSignals,
        byQuestionType: byQuestionTypeOut,
    });

    return {
        topic,
        hasPatterns: true,
        sessionMissed: wrong.length,
        sessionTotal: total,
        missRate: total > 0 ? Math.round((wrong.length / total) * 100) : 0,
        byQuestionType: byQuestionTypeOut,
        dominantReasoningTags,
        recurringClaimKeys,
        misconceptionCategories,
        calibrationSignals,
        recommendations,
    };
}

function buildErrorPatternRecommendations({
    topic,
    dominantReasoningTags,
    recurringClaimKeys,
    misconceptionCategories,
    calibrationSignals,
    byQuestionType,
}) {
    const hints = [];
    const topTag = dominantReasoningTags[0]?.tag;
    const tagHints = {
        guideline_alignment_missed: 'Re-read current guideline recommendations and compare them to trial populations.',
        trial_design_weakness: 'Practice identifying randomisation, blinding, and bias before interpreting effect sizes.',
        misses_applicability: 'Ask whether the studied population matches your clinical scenario.',
        misses_outcome_hierarchy: 'Separate surrogate endpoints from patient-important outcomes.',
        overclaims_evidence: 'Check whether the evidence supports the strength of the conclusion.',
        high_confidence_wrong: 'Slow down on high-confidence guesses; verify against source claims.',
        concept_gap: 'Review core teaching points for this topic before the next quiz.',
    };
    if (topTag && tagHints[topTag]) hints.push(tagHints[topTag]);

    if (calibrationSignals.high_confidence_wrong >= 2) {
        hints.push('You were confident on several misses — use claim review to calibrate certainty.');
    }
    if (recurringClaimKeys.length > 0) {
        hints.push(`Revisit claim ${recurringClaimKeys[0].claimKey} (${recurringClaimKeys[0].misses} miss${recurringClaimKeys[0].misses === 1 ? '' : 'es'} this session).`);
    }
    if (misconceptionCategories[0]?.category) {
        hints.push(`Likely misconception pattern: ${misconceptionCategories[0].category.replace(/_/g, ' ')}.`);
    }

    const weakTypes = Object.entries(byQuestionType)
        .filter(([, stats]) => stats.missed >= 2)
        .map(([type]) => type);
    if (weakTypes.length > 0 && topic) {
        hints.push(`Focus next practice on ${weakTypes.slice(0, 2).join(' and ')} questions for ${topic}.`);
    }

    return hints.slice(0, 4);
}

module.exports = {
    analyzeQuizErrorPatterns,
    buildErrorPatternRecommendations,
};
