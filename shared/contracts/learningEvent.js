'use strict';

const { z } = require('zod');

const LearningEventTypeSchema = z.enum([
    'search',
    'quiz_attempt',
    'quiz_session',
    'agent_message',
    'agent_turn_memory',
    'agent_session_reflection',
    'recommendation_shown',
    'recommendation_clicked',
    'search_feedback',
    'breakthrough_moment',
    'claim_recalled',
]);

const LearningEventSchema = z.object({
    eventType: LearningEventTypeSchema,
    userId: z.string().optional(),
    topic: z.string().optional(),
    normalizedTopic: z.string().optional(),
    payload: z.record(z.string(), z.any()).optional(),
    createdAt: z.string().datetime().optional(),
}).passthrough();

module.exports = { LearningEventSchema, LearningEventTypeSchema };
