'use strict';

function buildTopicOutline(topicKnowledge) {
    const knowledge = topicKnowledge?.knowledge || {};
    const teachingPoints = Array.isArray(knowledge.teachingPoints)
        ? knowledge.teachingPoints
        : Array.isArray(knowledge.coreTeachingPoints) ? knowledge.coreTeachingPoints : [];
    const mcqAngles = Array.isArray(knowledge.mcqAngles) ? knowledge.mcqAngles : [];
    const sourceArticles = Array.isArray(topicKnowledge?.sourceArticles) ? topicKnowledge.sourceArticles : [];

    const nodes = [];
    teachingPoints.slice(0, 12).forEach((point, index) => {
        const label = typeof point === 'string'
            ? point
            : (point.claim || point.point || point.text || `Teaching point ${index + 1}`);
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

async function getAttemptedOutlineNodeIds(db, userId, topic) {
    if (!db?.getQuizAttempts) return new Set();
    const attempts = await db.getQuizAttempts({ userId, topic, limit: 250 });
    const ids = new Set();
    for (const attempt of Array.isArray(attempts) ? attempts : []) {
        const nodeId = attempt.outline_node_id || attempt.outlineNodeId;
        if (nodeId) ids.add(nodeId);
    }
    return ids;
}

function computeUncoveredOutlineNodes(outline, attemptedIds, { limit = 6 } = {}) {
    const nodes = outline?.nodes || [];
    const attempted = attemptedIds instanceof Set ? attemptedIds : new Set(attemptedIds || []);
    return nodes
        .filter((node) => !attempted.has(node.id))
        .slice(0, limit)
        .map((node) => ({
            id: node.id,
            kind: node.kind,
            label: node.label,
        }));
}

function resolveWeakOutlineNodes(outline, weakOutlineNodeIds = [], { limit = 6 } = {}) {
    const nodeMap = new Map((outline?.nodes || []).map((node) => [node.id, node]));
    return (Array.isArray(weakOutlineNodeIds) ? weakOutlineNodeIds : [])
        .slice(0, limit)
        .map((id) => {
            const node = nodeMap.get(id);
            return {
                id,
                kind: node?.kind || 'unknown',
                label: node?.label || id,
            };
        });
}

async function computeOutlineGaps(db, userId, topic, topicKnowledge, topicMemory = null) {
    const outline = buildTopicOutline(topicKnowledge);
    const attemptedIds = await getAttemptedOutlineNodeIds(db, userId, topic);
    const uncoveredNodes = computeUncoveredOutlineNodes(outline, attemptedIds);
    const weakNodes = resolveWeakOutlineNodes(
        outline,
        topicMemory?.weakOutlineNodeIds || topicMemory?.weak_outline_node_ids || []
    );

    return {
        outline,
        uncoveredNodes,
        weakNodes,
        totalNodes: outline.nodes?.length || 0,
        coveredCount: Math.max((outline.nodes?.length || 0) - uncoveredNodes.length, 0),
    };
}

function formatUncoveredOutlinePrompt(uncoveredNodes = []) {
    if (!Array.isArray(uncoveredNodes) || uncoveredNodes.length === 0) return '';
    const lines = uncoveredNodes
        .slice(0, 6)
        .map((node) => `- [${node.id}] ${node.label}`)
        .join('\n');
    return `UNCOVERED OUTLINE NODES — not yet tested in quizzes for this learner:\n${lines}\nPROACTIVE INSTRUCTION: When teaching or suggesting next steps, prioritize at least one uncovered node above. Offer to explain or quiz it without waiting for the learner to ask.`;
}

module.exports = {
    buildTopicOutline,
    getAttemptedOutlineNodeIds,
    computeUncoveredOutlineNodes,
    resolveWeakOutlineNodes,
    computeOutlineGaps,
    formatUncoveredOutlinePrompt,
};
