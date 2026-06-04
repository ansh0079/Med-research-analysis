const {
    buildLearningTrajectorySection,
    formatLearnerSnapshot,
} = require('../../server/services/learnerStateService');

describe('learnerStateService', () => {
    test('buildLearningTrajectorySection formats recent events', async () => {
        const db = {
            listLearningEvents: jest.fn().mockResolvedValue([
                {
                    eventType: 'agent_message',
                    occurredAt: new Date().toISOString(),
                    payload: { role: 'user', intent: 'agent_chat' },
                },
                {
                    eventType: 'quiz_session_feedback',
                    occurredAt: new Date().toISOString(),
                    payload: { score: 2, totalQuestions: 5, weakAreas: ['trial interpretation'] },
                },
            ]),
        };
        const text = await buildLearningTrajectorySection(db, 'u1', 'ARDS', { limit: 5 });
        expect(text).toContain('agent_message');
        expect(text).toContain('quiz_session_feedback');
        expect(text).toContain('trial interpretation');
    });

    test('formatLearnerSnapshot renders focus and misconceptions', () => {
        const out = formatLearnerSnapshot({
            focusAreas: ['low tidal volume'],
            misconceptions: ['confuses ARDS with cardiogenic pulmonary edema'],
            openQuestion: 'When to prone?',
        });
        expect(out).toContain('low tidal volume');
        expect(out).toContain('cardiogenic');
        expect(out).toContain('When to prone?');
    });
});
