const {
    decayTopicConfidence,
    inferTopicVolatility,
    topicRefreshPriority,
} = require('../../server/services/topicKnowledgeFreshness');

describe('topicKnowledgeFreshness', () => {
    const now = new Date('2026-05-16T00:00:00.000Z');

    test('infers high volatility for fast-moving therapeutic areas', () => {
        expect(inferTopicVolatility('GLP-1 agonists for obesity')).toBe('high');
        expect(inferTopicVolatility('COVID therapeutics')).toBe('high');
    });

    test('decays high-volatility confidence faster than stable confidence', () => {
        const refreshedAt = '2025-11-16T00:00:00.000Z';
        const high = decayTopicConfidence({
            confidence: 0.8,
            refreshedAt,
            topic: 'GLP-1 agonists',
            now,
        });
        const stable = decayTopicConfidence({
            confidence: 0.8,
            refreshedAt,
            topic: 'basic physiology',
            now,
        });

        expect(high.volatility).toBe('high');
        expect(stable.volatility).toBe('stable');
        expect(high.effectiveConfidence).toBeLessThan(stable.effectiveConfidence);
        expect(high.confidenceDecay).toBeGreaterThan(stable.confidenceDecay);
    });

    test('refresh priority combines confidence decay with signal activity', () => {
        const priority = topicRefreshPriority({
            confidence: 0.8,
            refreshedAt: '2025-11-16T00:00:00.000Z',
            topic: 'COVID therapeutics',
            totalSignals: 12,
            distinctArticles: 6,
            now,
        });

        expect(priority.priorityScore).toBeGreaterThan(priority.confidenceDecay);
        expect(priority.reason).toBe('confidence_decay_high_volatility');
    });

    test('missing knowledge gets immediate priority even without confidence', () => {
        const priority = topicRefreshPriority({
            topic: 'septic shock',
            totalSignals: 5,
            distinctArticles: 3,
            hasKnowledge: false,
            now,
        });

        expect(priority.priorityScore).toBeGreaterThan(1);
        expect(priority.reason).toBe('missing_knowledge');
    });
});
