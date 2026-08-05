'use strict';

const {
    compactTeachingObject,
    compactGroundedClaim,
    buildRetrievalContext,
    buildAgentEvidenceAnchors,
} = require('./agentHelpers/retrievalContext');
const {
    isTransientStreamError,
    formatAgentMistakesBlock,
} = require('./agentHelpers/streamAndMistakes');
const { buildAgentSystemPrompt } = require('./agentHelpers/systemPrompt');
const {
    inferDemandIntentRegex,
    isLlmIntentClassifierEnabled,
    inferDemandIntent,
} = require('./agentHelpers/intentClassification');
const {
    VALID_INTENTS,
    MAX_OUTPUT_TOKENS_BY_INTENT,
} = require('./agentHelpers/constants');
const {
    extractGroundedClaimsFromReply,
    extractGroundedClaimsStructured,
} = require('./agentHelpers/claimExtraction');
const {
    formatRecentMessages,
    normalizeConversationMessage,
    conversationMessageSignature,
    reconcileConversationHistory,
    summarizeOlderMessages,
    buildSessionFeedbackContext,
    parseHistoryForProvider,
} = require('./agentHelpers/conversationHistory');

module.exports = {
    compactTeachingObject,
    compactGroundedClaim,
    buildRetrievalContext,
    buildAgentEvidenceAnchors,
    isTransientStreamError,
    formatAgentMistakesBlock,
    buildAgentSystemPrompt,
    inferDemandIntentRegex,
    VALID_INTENTS,
    MAX_OUTPUT_TOKENS_BY_INTENT,
    isLlmIntentClassifierEnabled,
    inferDemandIntent,
    extractGroundedClaimsFromReply,
    extractGroundedClaimsStructured,
    formatRecentMessages,
    normalizeConversationMessage,
    conversationMessageSignature,
    reconcileConversationHistory,
    summarizeOlderMessages,
    buildSessionFeedbackContext,
    parseHistoryForProvider,
};
