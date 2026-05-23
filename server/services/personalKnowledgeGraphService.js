'use strict';

/**
 * Build a learner-specific knowledge graph: topic → paper → claim → quiz → mistake → review.
 */
async function buildPersonalKnowledgeGraph(db, userId, topic) {
    const normalized = db.normalizeTopic(topic);
    const [claims, mastery, review, rounds] = await Promise.all([
        db.listTeachingObjectClaimsForTopic(topic, { limit: 60 }).catch(() => []),
        userId ? db.getUserClaimMastery(userId, topic, { limit: 60 }).catch(() => []) : Promise.resolve([]),
        userId ? db.getUserTopicReview?.(userId, topic).catch(() => null) : Promise.resolve(null),
        userId && db.all
            ? db.all(
                `SELECT id, status, item_count, created_at FROM learning_rounds
                 WHERE user_id = ? AND normalized_topic = ? ORDER BY created_at DESC LIMIT 5`,
                [String(userId), normalized]
            ).catch(() => [])
            : Promise.resolve([]),
    ]);

    const masteryByKey = new Map(mastery.map((m) => [m.claimKey, m]));
    const paperNodes = new Map();
    const nodes = [];
    const edges = [];

    const topicNodeId = `topic:${normalized}`;
    nodes.push({ id: topicNodeId, type: 'topic', label: topic, normalizedTopic: normalized });

    for (const claim of claims) {
        const claimNodeId = `claim:${claim.claimKey}`;
        const m = masteryByKey.get(claim.claimKey);
        nodes.push({
            id: claimNodeId,
            type: 'claim',
            label: String(claim.claimText || '').slice(0, 200),
            claimKey: claim.claimKey,
            verificationStatus: claim.verificationStatus,
            masteryState: m?.masteryState || 'untested',
            attempts: m?.attempts || 0,
            accuracy: m?.accuracy ?? null,
        });
        edges.push({ from: topicNodeId, to: claimNodeId, relation: 'teaches' });

        if (claim.articleUid) {
            const paperId = `paper:${claim.articleUid}`;
            if (!paperNodes.has(paperId)) {
                paperNodes.set(paperId, { articleUid: claim.articleUid });
                nodes.push({ id: paperId, type: 'paper', label: claim.articleUid, articleUid: claim.articleUid });
                edges.push({ from: paperId, to: topicNodeId, relation: 'supports_topic' });
            }
            edges.push({ from: paperId, to: claimNodeId, relation: 'grounds' });
        }

        if (m && m.attempts > 0) {
            const quizNodeId = `quiz:${claim.claimKey}`;
            const lastWrong = m.correct < m.attempts;
            nodes.push({
                id: quizNodeId,
                type: 'quiz_history',
                label: `${m.correct}/${m.attempts} correct`,
                claimKey: claim.claimKey,
                lastAttemptAt: m.lastAttemptAt,
            });
            edges.push({ from: claimNodeId, to: quizNodeId, relation: 'tested_by' });
            if (lastWrong || m.masteryState === 'weak') {
                const mistakeId = `mistake:${claim.claimKey}`;
                nodes.push({
                    id: mistakeId,
                    type: 'mistake',
                    label: 'Prior weak recall or incorrect attempt',
                    claimKey: claim.claimKey,
                    conceptKey: claim.conceptKey || null,
                });
                edges.push({ from: quizNodeId, to: mistakeId, relation: 'mistake_on' });
                edges.push({ from: mistakeId, to: claimNodeId, relation: 'needs_review' });
            }
        }
    }

    if (review?.lastReviewedAt) {
        const reviewId = `review:${normalized}`;
        nodes.push({ id: reviewId, type: 'review', label: 'Last topic review', lastReviewedAt: review.lastReviewedAt });
        edges.push({ from: reviewId, to: topicNodeId, relation: 'reviewed' });
    }

    for (const round of rounds) {
        const roundId = `round:${round.id}`;
        nodes.push({
            id: roundId,
            type: 'learning_round',
            label: `Round #${round.id}`,
            status: round.status,
            itemCount: round.item_count,
            createdAt: round.created_at,
        });
        edges.push({ from: roundId, to: topicNodeId, relation: 'studied' });
    }

    const weakClaims = mastery
        .filter((m) => m.masteryState === 'weak' || (m.attempts > 0 && m.correct < m.attempts))
        .slice(0, 5)
        .map((m) => ({
            claimKey: m.claimKey,
            claimText: m.claimText,
            conceptKey: m.conceptKey,
            accuracy: m.accuracy,
            reasoningHint: inferMistakeHint(m),
        }));

    return {
        topic,
        normalizedTopic: normalized,
        nodes,
        edges,
        weakClaims,
        agentHooks: weakClaims.map((w) => ({
            claimKey: w.claimKey,
            prompt: `You previously struggled with: "${String(w.claimText || '').slice(0, 180)}". ${w.reasoningHint}`,
        })),
    };
}

function inferMistakeHint(masteryRow) {
    const text = String(masteryRow.claimText || '').toLowerCase();
    if (text.includes('applicab') || text.includes('exclusion') || text.includes('generaliz')) {
        return 'This often reflects applicability or external validity — compare new papers to that boundary.';
    }
    if (text.includes('guideline') || text.includes('recommend')) {
        return 'Check whether the new evidence aligns with or challenges guideline language.';
    }
    return 'Re-test this teaching point against the new paper’s population and outcomes.';
}

module.exports = { buildPersonalKnowledgeGraph, inferMistakeHint };
