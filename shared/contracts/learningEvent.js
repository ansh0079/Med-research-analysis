'use strict';

const { z } = require('zod');

const KNOWN_LEARNING_EVENT_TYPES = [
    'search',
    'quiz_attempt',
    'quiz_session',
    'quiz_session_feedback',
    'quiz_completed',
    'agent_message',
    'agent_turn_completed',
    'agent_turn_memory',
    'agent_session_reflection',
    'recommendation_shown',
    'recommendation_clicked',
    'topic_open',
    'case_open',
    'case_attempted',
    'case_generated',
    'case_scenario_completed',
    'search_feedback',
    'breakthrough_moment',
    'claim_seen',
    'claim_recalled',
    'claim_gap',
    'mcq_answered',
    'validation_mismatch',
    'quiz_error_patterns',
    'search_impression',
    'search_click',
    'search_save',
    'search_dwell',
    'search_feedback_helpful',
    'search_feedback_not_helpful',
    'search_reward_attributed',
    'search_reward_skipped',
    'quiz_reward_attributed',
    'quiz_miss_for_search',
    'agent_quiz_reward_attributed',
    'paper_click',
    'paper_save',
    'paper_dwell',
    'paper_view',
    'guideline_stale',
    'regional_guideline_divergence',
    'claim_conflicts_guideline',
    'claim_guideline_uncertain',
];

const LearningEventTypeSchema = z.enum(KNOWN_LEARNING_EVENT_TYPES);

const LearningEventSchema = z.object({
    eventType: LearningEventTypeSchema,
    userId: z.string().optional(),
    topic: z.string().optional(),
    normalizedTopic: z.string().optional(),
    payload: z.record(z.string(), z.any()).optional(),
    createdAt: z.string().datetime().optional(),
}).passthrough();

module.exports = { KNOWN_LEARNING_EVENT_TYPES, LearningEventSchema, LearningEventTypeSchema };
