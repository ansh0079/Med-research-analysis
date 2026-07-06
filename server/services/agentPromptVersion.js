'use strict';

/**
 * Agent prompt versioning.
 *
 * The agent is the central learning feature; its system prompt evolves quickly.
 * This module exposes a single immutable version constant plus schema metadata
 * so that every turn, side-effect job, and teaching object can be traced back
 * to the prompt that produced it.
 *
 * Bump AGENT_PROMPT_VERSION whenever:
 *   - buildAgentSystemPrompt changes section ordering or content meaningfully.
 *   - A new context source is added to the prompt.
 *   - The truncation or scaffolding strategy changes.
 */

const AGENT_PROMPT_VERSION = '2025.07.06-1';

const AGENT_PROMPT_SCHEMA = {
    version: AGENT_PROMPT_VERSION,
    modelFamily: 'claude/gemini/mistral',
    sections: [
        'learner_profile',
        'training_stage_scaffolding',
        'topic_memory',
        'clinical_guidelines',
        'retrieval_context',
        'current_search_results',
        'cross_topic_bridges',
        'session_trajectory',
        'session_feedback',
        'final_user_turn',
    ],
    truncationStrategy: 'preserve_system_and_user_turn_trim_older_context',
    outputTokensByIntent: {
        quiz: 2500,
        case: 2500,
        guideline: 2500,
        appraisal: 2500,
        synopsis: 4000,
        agent_chat: 1800,
    },
};

module.exports = {
    AGENT_PROMPT_VERSION,
    AGENT_PROMPT_SCHEMA,
};
