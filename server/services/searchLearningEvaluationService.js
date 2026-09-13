'use strict';

function summarizeLearningOutcomes(rows = []) {
    const attempts = new Map();
    for (const row of rows) {
        if (!row.quiz_attempt_id || !row.bandit_arm_id || ![0, 1].includes(Number(row.is_correct))) continue;
        const key = `${row.user_id}:${row.quiz_attempt_id}`;
        const prior = attempts.get(key);
        if (prior && prior.bandit_arm_id !== row.bandit_arm_id) {
            attempts.set(key, { ...prior, ambiguous: true });
        } else if (!prior) attempts.set(key, row);
    }
    const groups = new Map();
    for (const row of attempts.values()) {
        if (row.ambiguous) continue;
        const group = groups.get(row.bandit_arm_id) || { attempts: 0, correct: 0, learners: new Set() };
        group.attempts++;
        group.correct += Number(row.is_correct);
        group.learners.add(String(row.user_id));
        groups.set(row.bandit_arm_id, group);
    }
    return {
        evidenceKind: 'observational_first_attempt_outcomes',
        promotionEligible: false,
        limitation: 'Arm comparisons are observational; a controlled evaluation is required to establish learning improvement.',
        totalAttempts: [...groups.values()].reduce((sum, group) => sum + group.attempts, 0),
        arms: [...groups].map(([armId, group]) => ({
            armId, attempts: group.attempts, learners: group.learners.size,
            correct: group.correct, accuracy: group.correct / group.attempts,
        })),
    };
}

async function collectSearchLearningEvaluation(db, { days = 14 } = {}) {
    const since = new Date(Date.now() - Math.min(90, Math.max(1, Number(days) || 14)) * 86400000).toISOString();
    try {
        const rows = await db.all(
            `SELECT o.user_id, o.quiz_attempt_id, o.bandit_arm_id, q.is_correct
             FROM search_learning_outcomes o
             JOIN quiz_attempts q ON q.id = o.quiz_attempt_id
                AND CAST(q.user_id AS TEXT) = CAST(o.user_id AS TEXT)
             WHERE o.attributed_at >= ? AND q.claim_key IS NOT NULL
               AND NOT EXISTS (
                   SELECT 1 FROM quiz_attempts prior
                   WHERE prior.user_id = q.user_id AND prior.claim_key = q.claim_key AND prior.id < q.id
               )
             ORDER BY o.id DESC LIMIT 10000`, [since]);
        return { available: true, ...summarizeLearningOutcomes(rows) };
    } catch {
        return { available: false, ...summarizeLearningOutcomes([]) };
    }
}

function assessLearningPromotionSafety(evaluation, candidateArmId, servingArmId) {
    const candidate = evaluation?.arms?.find((arm) => arm.armId === candidateArmId);
    const serving = evaluation?.arms?.find((arm) => arm.armId === servingArmId);
    if (!evaluation?.available || !candidate || !serving
        || [candidate, serving].some((arm) => arm.attempts < 30 || arm.learners < 10)) {
        return { pass: false, reason: 'Need at least 30 first attempts from 10 learners in each arm before promotion.' };
    }
    if (candidate.accuracy < serving.accuracy) {
        return { pass: false, reason: 'Candidate first-attempt accuracy is below the serving arm.' };
    }
    return { pass: true, reason: 'Observed learning outcomes show no regression; this is a safety check, not causal evidence.' };
}

module.exports = { summarizeLearningOutcomes, collectSearchLearningEvaluation, assessLearningPromotionSafety };
