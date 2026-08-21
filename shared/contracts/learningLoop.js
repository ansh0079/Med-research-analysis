'use strict';

const LEARNING_LOOP_CONTRACT_VERSION = 1;

const LEARNING_LOOP_STAGES = Object.freeze({
    DECISION: 'decision',
    EXPOSURE: 'exposure',
    INTERACTION: 'interaction',
    FEEDBACK: 'feedback',
    OUTCOME: 'outcome',
    REWARD: 'reward',
    OBSERVABILITY: 'observability',
});

const LEARNING_LOOP_EVENT_STAGE = Object.freeze({
    search_impression: LEARNING_LOOP_STAGES.EXPOSURE,
    search_click: LEARNING_LOOP_STAGES.INTERACTION,
    search_save: LEARNING_LOOP_STAGES.INTERACTION,
    search_dwell: LEARNING_LOOP_STAGES.INTERACTION,
    paper_click: LEARNING_LOOP_STAGES.INTERACTION,
    paper_save: LEARNING_LOOP_STAGES.INTERACTION,
    paper_dwell: LEARNING_LOOP_STAGES.INTERACTION,
    paper_view: LEARNING_LOOP_STAGES.INTERACTION,
    search_feedback_helpful: LEARNING_LOOP_STAGES.FEEDBACK,
    search_feedback_not_helpful: LEARNING_LOOP_STAGES.FEEDBACK,
    search_feedback: LEARNING_LOOP_STAGES.FEEDBACK,
    synopsis_preference: LEARNING_LOOP_STAGES.FEEDBACK,
    quiz_attempt: LEARNING_LOOP_STAGES.OUTCOME,
    quiz_session: LEARNING_LOOP_STAGES.OUTCOME,
    quiz_completed: LEARNING_LOOP_STAGES.OUTCOME,
    quiz_miss_for_search: LEARNING_LOOP_STAGES.OUTCOME,
    case_attempted: LEARNING_LOOP_STAGES.OUTCOME,
    case_scenario_completed: LEARNING_LOOP_STAGES.OUTCOME,
    search_reward_attributed: LEARNING_LOOP_STAGES.REWARD,
    search_reward_skipped: LEARNING_LOOP_STAGES.REWARD,
    quiz_reward_attributed: LEARNING_LOOP_STAGES.REWARD,
    agent_quiz_reward_attributed: LEARNING_LOOP_STAGES.REWARD,
    recommendation_shown: LEARNING_LOOP_STAGES.EXPOSURE,
    recommendation_clicked: LEARNING_LOOP_STAGES.INTERACTION,
    topic_open: LEARNING_LOOP_STAGES.INTERACTION,
    case_open: LEARNING_LOOP_STAGES.INTERACTION,
    agent_turn_completed: LEARNING_LOOP_STAGES.OUTCOME,
    agent_turn_memory: LEARNING_LOOP_STAGES.OBSERVABILITY,
    topic_evolved: LEARNING_LOOP_STAGES.OUTCOME,
    guideline_anchored: LEARNING_LOOP_STAGES.OUTCOME,
    mentor_guideline_fidelity: LEARNING_LOOP_STAGES.OBSERVABILITY,
    mentor_memory_feedback: LEARNING_LOOP_STAGES.OBSERVABILITY,
    topic_synthesized: LEARNING_LOOP_STAGES.OUTCOME,
});

const REQUIRED_FIELDS_BY_EVENT = Object.freeze({
    search_impression: ['searchId'],
});

function learningLoopStageForEventType(eventType) {
    return LEARNING_LOOP_EVENT_STAGE[String(eventType || '')] || null;
}

function describeLearningLoopEvent(eventType) {
    const stage = learningLoopStageForEventType(eventType);
    return {
        version: LEARNING_LOOP_CONTRACT_VERSION,
        eventType: String(eventType || ''),
        stage,
        known: Boolean(stage),
    };
}

function normalizeLearningLoopPayload({
    eventType,
    payload = {},
    userId = null,
    sessionId = null,
    articleUid = null,
    searchId = null,
    decisionId = null,
} = {}) {
    const descriptor = describeLearningLoopEvent(eventType);
    const normalized = {
        ...(payload && typeof payload === 'object' ? payload : { value: payload }),
        learningLoopContractVersion: descriptor.version,
    };
    if (descriptor.stage) normalized.learningLoopStage = descriptor.stage;
    if (sessionId) normalized.sessionId = sessionId;
    if (searchId != null) normalized.searchId = Number(searchId);
    if (decisionId != null) normalized.decisionId = Number(decisionId);
    if (articleUid) normalized.articleUid = String(articleUid);
    if (userId) normalized.userId = String(userId);
    return normalized;
}

function validateLearningLoopSignal(signal = {}) {
    const eventType = String(signal.eventType || '');
    const descriptor = describeLearningLoopEvent(eventType);
    const payload = signal.payload && typeof signal.payload === 'object' ? signal.payload : {};
    const errors = [];

    if (!eventType) errors.push('eventType is required');
    if (!descriptor.known) errors.push(`unknown learning loop event type: ${eventType || '(empty)'}`);

    const fields = REQUIRED_FIELDS_BY_EVENT[eventType] || [];
    for (const field of fields) {
        const hasField = signal[field] != null || payload[field] != null;
        if (!hasField) errors.push(`${field} is required for ${descriptor.stage} events`);
    }

    if (descriptor.stage === LEARNING_LOOP_STAGES.REWARD) {
        const hasDecisionOrReason = signal.decisionId != null
            || payload.decisionId != null
            || payload.reason != null
            || eventType.endsWith('_skipped');
        if (!hasDecisionOrReason) {
            errors.push('reward events require decisionId or a skipped-reward reason');
        }
    }

    const hasActor = signal.userId || signal.sessionId || payload.userId || payload.sessionId;
    if (!hasActor) errors.push('userId or sessionId is required for attribution');

    return {
        ok: errors.length === 0,
        errors,
        stage: descriptor.stage,
        version: descriptor.version,
    };
}

module.exports = {
    LEARNING_LOOP_CONTRACT_VERSION,
    LEARNING_LOOP_STAGES,
    LEARNING_LOOP_EVENT_STAGE,
    learningLoopStageForEventType,
    describeLearningLoopEvent,
    normalizeLearningLoopPayload,
    validateLearningLoopSignal,
};
