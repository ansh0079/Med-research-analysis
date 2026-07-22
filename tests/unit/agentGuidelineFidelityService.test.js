'use strict';

const {
    scoreMentorGuidelineFidelity,
    overlapScore,
} = require('../../server/services/agentGuidelineFidelityService');

describe('agentGuidelineFidelityService', () => {
    it('scores token overlap between reply and guideline text', () => {
        const replyTokens = 'avoid rapid blood pressure reduction in hypertensive encephalopathy'.split(/\s+/);
        const score = overlapScore(replyTokens, 'Avoid rapid blood pressure reduction in PRES management');
        expect(score).toBeGreaterThan(0.2);
    });

    it('records fidelity learning signal and optional bandit reward', async () => {
        const events = [];
        const rewards = [];
        const db = {
            getGuidelinesByTopic: jest.fn(async () => ([
                { recommendationText: 'Manage severe hypertension carefully with gradual blood pressure reduction' },
            ])),
            getTopicKnowledge: jest.fn(async () => ({
                knowledge: {
                    teachingPoints: [
                        { claim: 'MRI is preferred imaging for PRES diagnosis' },
                        { claim: 'Avoid rapid blood pressure drops' },
                    ],
                },
            })),
            recordLearningEvent: jest.fn(async (row) => {
                events.push(row);
                return { id: events.length };
            }),
            recordPersonalizationArmPull: jest.fn(async (...args) => {
                rewards.push(args);
                return true;
            }),
            listPersonalizationArmStates: jest.fn(async () => []),
        };

        const result = await scoreMentorGuidelineFidelity(db, {
            topic: 'PRES',
            assistantReply: 'In PRES, MRI is preferred imaging and you should avoid rapid blood pressure drops. See [G1].',
            userId: 'user-1',
            sessionId: 'sess-1',
            conversationId: 42,
            banditMeta: { armId: 'direct', policyType: 'agent_teaching_strategy' },
        });

        expect(result.skipped).toBe(false);
        expect(result.score).toBeGreaterThan(0.3);
        expect(events.some((e) => e.eventType === 'mentor_guideline_fidelity')).toBe(true);
        expect(rewards.length).toBeGreaterThan(0);
    });
});
