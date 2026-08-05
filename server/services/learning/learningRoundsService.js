'use strict';

/**
 * Structured learning round: 3 claim recall, 2 appraisal, 1 case, 1 overclaim trap.
 */
async function buildLearningRoundItems(db, userId, topic) {
    const [claims, mastery] = await Promise.all([
        db.listTeachingObjectClaimsForTopic(topic, { limit: 40 }).catch(() => []),
        userId ? db.getUserClaimMastery(userId, topic, { limit: 40 }).catch(() => []) : Promise.resolve([]),
    ]);
    const masteryMap = new Map(mastery.map((m) => [m.claimKey, m]));
    const weak = claims.filter((c) => {
        const m = masteryMap.get(c.claimKey);
        return !m || m.masteryState === 'weak' || m.masteryState === 'untested';
    });
    const strong = claims.filter((c) => masteryMap.get(c.claimKey)?.masteryState === 'mastered');
    const pool = weak.length >= 3 ? weak : claims;

    const pick = (arr, n) => [...arr].sort(() => Math.random() - 0.5).slice(0, n);
    const items = [];

    for (const [i, claim] of pick(pool, 3).entries()) {
        items.push({
            itemType: 'claim_recall',
            claimKey: claim.claimKey,
            questionText: `Recall the key teaching point: ${String(claim.claimText).slice(0, 280)}`,
            options: ['I can state it accurately', 'I need to review the source', 'Unsure'],
            correctAnswer: 'I can state it accurately',
            explanation: claim.verificationReason || claim.claimText,
            sortOrder: i,
        });
    }

    for (const [i, claim] of pick(claims, 2).entries()) {
        items.push({
            itemType: 'evidence_appraisal',
            claimKey: claim.claimKey,
            questionText: `What is the main limitation of evidence supporting: "${String(claim.claimText).slice(0, 200)}"?`,
            options: ['Population applicability', 'Surrogate outcomes', 'Industry funding bias', 'All may apply'],
            correctAnswer: 'All may apply',
            explanation: 'Appraise design, population, outcomes, and funding before changing practice.',
            sortOrder: 10 + i,
        });
    }

    const caseClaim = pick(weak.length ? weak : claims, 1)[0] || claims[0];
    if (caseClaim) {
        items.push({
            itemType: 'clinical_application',
            claimKey: caseClaim.claimKey,
            questionText: `Clinical application: A patient scenario matches "${String(caseClaim.claimText).slice(0, 160)}". What is your first management step?`,
            options: ['Apply trial result directly', 'Check guideline + patient factors', 'Defer — insufficient evidence'],
            correctAnswer: 'Check guideline + patient factors',
            explanation: 'Bridge trial evidence to bedside using guidelines and patient context.',
            sortOrder: 20,
        });
    }

    const overclaimSource = claims.find((c) => c.conceptKey === 'misconception_trap')
        || pick(strong.length ? strong : claims, 1)[0];
    if (overclaimSource) {
        items.push({
            itemType: 'overclaim_trap',
            claimKey: overclaimSource.claimKey,
            questionText: `What should you NOT overclaim from: "${String(overclaimSource.claimText).slice(0, 200)}"?`,
            options: [
                'Causality beyond the study design',
                'Applicability outside the studied population',
                'Benefit in all subgroups without data',
                'All of the above',
            ],
            correctAnswer: 'All of the above',
            explanation: 'Avoid extrapolating beyond design, population, and reported subgroup analyses.',
            sortOrder: 30,
        });
    }

    return items.slice(0, 7);
}

async function createLearningRound(db, userId, topic) {
    const items = await buildLearningRoundItems(db, userId, topic);
    if (typeof db.createLearningRound !== 'function') {
        return { topic, items, persisted: false };
    }
    const round = await db.createLearningRound({ userId, topic, items });
    return { round, persisted: true };
}

module.exports = { buildLearningRoundItems, createLearningRound };
