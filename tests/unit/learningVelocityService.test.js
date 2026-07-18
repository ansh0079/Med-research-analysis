const {
    computeVelocityFromSnapshots,
    formatLearningVelocity,
    getQuizLiftReport,
} = require('../../server/services/learningVelocityService');

describe('learningVelocityService', () => {
    test('computeVelocityFromSnapshots returns null with insufficient data', () => {
        expect(computeVelocityFromSnapshots([{ overallScore: 50, createdAt: '2026-06-01T00:00:00.000Z' }])).toBeNull();
    });

    test('computeVelocityFromSnapshots calculates points per day', () => {
        const velocity = computeVelocityFromSnapshots([
            { overallScore: 40, createdAt: '2026-06-01T00:00:00.000Z' },
            { overallScore: 55, createdAt: '2026-06-03T00:00:00.000Z' },
        ], 7);
        expect(velocity.deltaPoints).toBe(15);
        expect(velocity.pointsPerDay).toBeGreaterThan(0);
        expect(velocity.trend).toBe('improving');
    });

    test('formatLearningVelocity renders compact metric', () => {
        const text = formatLearningVelocity({
            pointsPerDay: 2.5,
            fromScore: 40,
            toScore: 55,
            daysSpanned: 6,
            trend: 'improving',
        });
        expect(text).toContain('LEARNING VELOCITY');
        expect(text).toContain('+2.5');
    });

    test('getQuizLiftReport flags recent agent tutoring', async () => {
        const now = Date.now();
        const db = {
            listTopicMasterySnapshots: jest.fn().mockResolvedValue([
                { overallScore: 40, createdAt: new Date(now - 3 * 86400000).toISOString() },
                { overallScore: 62, createdAt: new Date(now - 3600000).toISOString() },
            ]),
            listLearningEvents: jest.fn().mockResolvedValue([
                {
                    eventType: 'agent_turn_completed',
                    occurredAt: new Date(now - 2 * 3600000).toISOString(),
                },
            ]),
        };
        const lift = await getQuizLiftReport(db, 'user-1', 'heart failure', { days: 7 });
        expect(lift).toMatchObject({
            beforeMastery: 40,
            afterMastery: 62,
            afterAgentTutoring: true,
        });
        expect(lift.summary).toMatch(/40% → 62%/);
    });
});
