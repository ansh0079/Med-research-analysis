const {
    collectWeakTopicLabels,
    mergeWeakTopics,
    rollupUserWeakTopics,
} = require('../../server/services/learnerProfileRollupService');

describe('learnerProfileRollupService', () => {
    test('collectWeakTopicLabels gathers topics from recent events', () => {
        const now = new Date().toISOString();
        const topics = collectWeakTopicLabels([
            {
                eventType: 'agent_turn_memory',
                topic: 'Heart failure',
                occurredAt: now,
                payload: { misconceptions: ['confused HFrEF with HFpEF'] },
            },
            {
                eventType: 'quiz_session_feedback',
                topic: 'Diabetes',
                occurredAt: now,
                payload: { weakAreas: ['insulin dosing'] },
            },
            {
                eventType: 'agent_session_reflection',
                topic: 'Sepsis',
                occurredAt: now,
                payload: { nextStudyFocus: 'Early antibiotics', persistentGaps: ['lactate interpretation'] },
            },
        ], { days: 30 });
        expect(topics).toEqual(expect.arrayContaining(['Heart failure', 'Diabetes', 'Sepsis']));
    });

    test('mergeWeakTopics dedupes and caps', () => {
        expect(mergeWeakTopics(['Heart failure', 'Diabetes'], ['Diabetes', 'Sepsis'], 2)).toEqual(['Heart failure', 'Diabetes']);
    });

    test('rollupUserWeakTopics upserts merged weak topics', async () => {
        const now = new Date().toISOString();
        let saved = null;
        const db = {
            listLearningEvents: async () => ([
                {
                    eventType: 'claim_gap',
                    topic: 'Sepsis',
                    occurredAt: now,
                    payload: {},
                    claimKey: 'ck-1',
                },
            ]),
            getLearningProfile: async () => ({ weakTopics: ['Old topic'] }),
            upsertLearningProfile: async (_userId, data) => {
                saved = data;
                return { weakTopics: data.weakTopics };
            },
        };
        const result = await rollupUserWeakTopics(db, 'user-1', { days: 30 });
        expect(result.updated).toBe(true);
        expect(saved.weakTopics).toEqual(expect.arrayContaining(['Old topic', 'Sepsis']));
    });
});
