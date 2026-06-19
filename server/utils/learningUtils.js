const logger = require('../config/logger');

function calculateMastery(attempts) {
    const byType = {};
    for (const a of attempts) {
        const type = a.question_type || a.questionType;
        if (!byType[type]) byType[type] = [];
        byType[type].push(a);
    }
    const scores = {};
    for (const [type, typeAttempts] of Object.entries(byType)) {
        const recent = typeAttempts.slice(-10);
        let weightedSum = 0;
        let totalWeight = 0;
        for (let i = 0; i < recent.length; i++) {
            const weight = Math.pow(0.9, recent.length - 1 - i);
            const correct = (recent[i].is_correct === 1 || recent[i].isCorrect === true) ? 1 : 0;
            weightedSum += correct * weight;
            totalWeight += weight;
        }
        scores[type] = totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 100) : 0;
    }
    const values = Object.values(scores);
    const overall = values.length > 0 ? Math.round(values.reduce((s, v) => s + v, 0) / values.length) : 0;
    return { overall, byType: scores };
}

function nextReviewDate(masteryScore) {
    const now = new Date();
    if (masteryScore >= 90) return new Date(now.getTime() + 14 * 86400000).toISOString();
    if (masteryScore >= 75) return new Date(now.getTime() + 7 * 86400000).toISOString();
    if (masteryScore >= 60) return new Date(now.getTime() + 3 * 86400000).toISOString();
    if (masteryScore >= 40) return new Date(now.getTime() + 1 * 86400000).toISOString();
    return now.toISOString();
}

function updateStreak(profile) {
    const today = new Date().toISOString().slice(0, 10);
    const last = profile.lastStudyDate ? profile.lastStudyDate.slice(0, 10) : null;
    if (last === today) return profile; // already studied today
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    let currentStreak = profile.currentStreak || 0;
    let longestStreak = profile.longestStreak || 0;
    if (last === yesterday) {
        currentStreak += 1;
    } else {
        currentStreak = 1;
    }
    if (currentStreak > longestStreak) longestStreak = currentStreak;
    return { ...profile, currentStreak, longestStreak, lastStudyDate: new Date().toISOString() };
}

function buildOutline(topicKnowledge) {
    const knowledge = topicKnowledge?.knowledge || {};
    const teachingPoints = Array.isArray(knowledge.teachingPoints)
        ? knowledge.teachingPoints
        : Array.isArray(knowledge.coreTeachingPoints) ? knowledge.coreTeachingPoints : [];
    const mcqAngles = Array.isArray(knowledge.mcqAngles) ? knowledge.mcqAngles : [];
    const sourceArticles = Array.isArray(topicKnowledge?.sourceArticles) ? topicKnowledge.sourceArticles : [];

    const nodes = [];
    teachingPoints.slice(0, 12).forEach((point, index) => {
        const label = typeof point === 'string' ? point : (point.claim || point.point || point.text || `Teaching point ${index + 1}`);
        const sourceIndices = Array.isArray(point?.sourceIndices) ? point.sourceIndices : [];
        nodes.push({
            id: `tp-${index + 1}`,
            kind: 'teaching_point',
            label: String(label).slice(0, 240),
            sourceIndices,
        });
    });
    mcqAngles.slice(0, 8).forEach((angle, index) => {
        nodes.push({
            id: `mcq-${index + 1}`,
            kind: 'mcq_angle',
            label: String(angle).slice(0, 240),
            sourceIndices: [],
        });
    });
    sourceArticles.slice(0, 10).forEach((article, index) => {
        const sourceIndex = Number(article.sourceIndex || index + 1);
        nodes.push({
            id: `src-${sourceIndex}`,
            kind: 'source_article',
            label: String(article.title || `Source ${sourceIndex}`).slice(0, 240),
            sourceIndices: [sourceIndex],
            articleUid: article.uid || null,
        });
    });
    return {
        id: topicKnowledge?.id || null,
        topic: topicKnowledge?.topic || null,
        nodes,
    };
}

function initialCoverage(nodes) {
    return Object.fromEntries((nodes || []).map((node) => [
        node.id,
        { seen: false, quizAttempts: 0, correct: 0, lastAttemptAt: null },
    ]));
}

function updateCoverage(run, attempts = []) {
    const coverage = { ...(run?.nodeCoverage || {}) };
    const now = new Date().toISOString();
    for (const attempt of attempts) {
        const nodeId = attempt.outlineNodeId;
        if (!nodeId) continue;
        const current = coverage[nodeId] || { seen: false, quizAttempts: 0, correct: 0, lastAttemptAt: null };
        coverage[nodeId] = {
            ...current,
            seen: true,
            quizAttempts: Number(current.quizAttempts || 0) + 1,
            correct: Number(current.correct || 0) + (attempt.isCorrect ? 1 : 0),
            lastAttemptAt: now,
        };
    }
    return coverage;
}

function summarizeRunGaps(run, outline) {
    const nodes = outline?.nodes || [];
    const coverage = run?.nodeCoverage || {};
    const withCoverage = nodes.map((node) => {
        const cov = coverage[node.id] || { seen: false, quizAttempts: 0, correct: 0, lastAttemptAt: null };
        const quizAttempts = Number(cov.quizAttempts || 0);
        const correct = Number(cov.correct || 0);
        const accuracy = quizAttempts > 0 ? Math.round((correct / quizAttempts) * 100) : null;
        return {
            id: node.id,
            kind: node.kind,
            label: node.label,
            sourceIndices: node.sourceIndices || [],
            articleUid: node.articleUid || null,
            seen: Boolean(cov.seen),
            quizAttempts,
            correct,
            accuracy,
            lastAttemptAt: cov.lastAttemptAt || null,
        };
    });
    const uncovered = withCoverage.filter((node) => !node.seen);
    const weak = withCoverage.filter((node) => node.seen && typeof node.accuracy === 'number' && node.accuracy < 70);
    return {
        totalNodes: nodes.length,
        coveredNodes: withCoverage.filter((node) => node.seen).length,
        uncoveredNodes: uncovered.slice(0, 6),
        weakNodes: weak.sort((a, b) => (a.accuracy ?? 0) - (b.accuracy ?? 0)).slice(0, 6),
    };
}

function textIncludes(text, needles) {
    const haystack = String(text || '').toLowerCase();
    return needles.some((needle) => haystack.includes(needle));
}

function inferEvidenceJudgement(attempt) {
    const questionType = String(attempt.questionType || '').toLowerCase();
    const combined = [
        attempt.questionText,
        attempt.userAnswer,
        attempt.correctAnswer,
        attempt.explanation,
        attempt.outlineLabel,
    ].filter(Boolean).join(' ');
    const tags = new Set();

    if (attempt.isCorrect && Number(attempt.confidence || 0) > 0 && Number(attempt.confidence || 0) <= 2) {
        tags.add('low_confidence_correct');
    }
    const confidence = Number(attempt.confidence || 0);
    if (!attempt.isCorrect && confidence >= 4) {
        tags.add('high_confidence_wrong');
    }
    if (!attempt.isCorrect && confidence > 0 && confidence <= 2) {
        tags.add('knowledge_gap');
    }
    if (attempt.isCorrect && confidence > 0 && confidence <= 2) {
        tags.add('needs_consolidation');
    }
    if (!attempt.isCorrect) {
        if (questionType === 'guideline' || textIncludes(combined, ['guideline', 'recommendation', 'nice', 'esc', 'aha', 'ats', 'idsa'])) {
            tags.add('guideline_alignment_missed');
        }
        if (questionType === 'trial_interpretation' || textIncludes(combined, ['random', 'bias', 'blinding', 'allocation', 'confounding', 'intention-to-treat', 'noninferiority'])) {
            tags.add('trial_design_weakness');
        }
        if (textIncludes(combined, ['subgroup', 'excluded', 'applicability', 'external validity', 'population', 'selected patients'])) {
            tags.add('misses_applicability');
        }
        if (textIncludes(combined, ['surrogate', 'composite', 'primary outcome', 'secondary outcome', 'mortality', 'patient-important'])) {
            tags.add('misses_outcome_hierarchy');
        }
        if (textIncludes(combined, ['overclaim', 'not powered', 'underpowered', 'neutral result', 'confidence interval', 'absolute risk', 'relative risk'])) {
            tags.add('overclaims_evidence');
        }
        if (tags.size === 0) tags.add('concept_gap');
    }

    const reasoningTags = [...tags].slice(0, 8);
    return {
        reasoningTags,
        reasoningNote: reasoningTags.length
            ? `Auto-classified evidence judgement signal: ${reasoningTags.join(', ')}`
            : null,
    };
}

function normalizeAttemptClaimKey(attempt) {
    const direct = String(attempt?.claimKey || '').trim();
    if (direct) return direct;
    const outline = String(attempt?.outlineNodeId || '').trim();
    if (outline.startsWith('claim:')) return outline.slice('claim:'.length).trim();
    const questionId = String(attempt?.questionId || '').trim();
    if (questionId.startsWith('claim:')) return questionId.slice('claim:'.length).trim();
    return null;
}

module.exports = {
    calculateMastery,
    nextReviewDate,
    updateStreak,
    buildOutline,
    initialCoverage,
    updateCoverage,
    summarizeRunGaps,
    textIncludes,
    inferEvidenceJudgement,
    normalizeAttemptClaimKey,
};
