'use strict';

const { monthResetsAt, getUserUsageSummary } = require('../../server/services/usageService');

describe('usageService', () => {
    test('monthResetsAt returns first day of next month UTC', () => {
        expect(monthResetsAt('2026-07')).toBe('2026-08-01T00:00:00Z');
        expect(monthResetsAt('2026-12')).toBe('2027-01-01T00:00:00Z');
    });

    test('getUserUsageSummary builds meters from db rows', async () => {
        const db = {
            all: jest.fn().mockResolvedValue([
                { feature: 'ai_analysis', count: 2 },
                { feature: 'ai_synthesis', count: 1 },
            ]),
            get: jest.fn().mockResolvedValue({ count: 4 }),
        };
        const user = { id: 7, role: 'user', subscription_plan: 'free' };
        const summary = await getUserUsageSummary(db, user);
        expect(summary.plan).toBe('free');
        expect(summary.meters.aiAnalysesPerMonth.used).toBe(2);
        expect(summary.meters.synthesisPerMonth.used).toBe(1);
        expect(summary.meters.searchesPerDay.used).toBe(4);
    });
});
