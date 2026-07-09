const {
    meanReciprocalRank,
    ndcgAtK,
    buildSearchQualityMetrics,
    buildSearchOnlineQualityMetrics,
    buildSynthesisQualityMetrics,
    buildLearningAgentMetrics,
    isRelevantImpression,
} = require('../../server/services/qualityMetricsService');

describe('qualityMetricsService', () => {
    test('isRelevantImpression detects click, save, and long dwell', () => {
        expect(isRelevantImpression({ was_clicked: 1, was_saved: 0, dwell_time_ms: 0 })).toBe(true);
        expect(isRelevantImpression({ was_clicked: 0, was_saved: 1, dwell_time_ms: 0 })).toBe(true);
        expect(isRelevantImpression({ was_clicked: 0, was_saved: 0, dwell_time_ms: 30000 })).toBe(true);
        expect(isRelevantImpression({ was_clicked: 0, was_saved: 0, dwell_time_ms: 1000 })).toBe(false);
    });

    test('meanReciprocalRank averages reciprocal ranks per search session', () => {
        const sessions = [
            [
                { search_id: 1, position: 1, was_clicked: 0, was_saved: 0, dwell_time_ms: 0 },
                { search_id: 1, position: 2, was_clicked: 1, was_saved: 0, dwell_time_ms: 0 },
            ],
            [
                { search_id: 2, position: 1, was_clicked: 1, was_saved: 0, dwell_time_ms: 0 },
            ],
        ];
        expect(meanReciprocalRank(sessions)).toBeCloseTo((0.5 + 1) / 2);
    });

    test('ndcgAtK rewards relevant items ranked higher', () => {
        expect(ndcgAtK([1, 1, 0, 0], 4)).toBeGreaterThan(ndcgAtK([0, 0, 1, 1], 4));
    });

    test('buildSearchQualityMetrics aggregates CTR and latency', () => {
        const impressions = [
            { search_id: 1, position: 1, was_clicked: 1, was_saved: 0, dwell_time_ms: 0 },
            { search_id: 1, position: 2, was_clicked: 0, was_saved: 0, dwell_time_ms: 0 },
            { search_id: 2, position: 1, was_clicked: 0, was_saved: 0, dwell_time_ms: 0 },
            { search_id: 2, position: 2, was_clicked: 0, was_saved: 1, dwell_time_ms: 0 },
        ];
        const metrics = buildSearchQualityMetrics(impressions, [{ elapsed_ms: 4200 }, { elapsed_ms: 8000 }]);
        expect(metrics.sampleSize).toBe(2);
        expect(metrics.ctrTop3).toBeGreaterThan(0);
        expect(metrics.timeToRelevantPaperMs).toBe(6100);
    });

    test('buildSynthesisQualityMetrics averages user ratings', () => {
        const metrics = buildSynthesisQualityMetrics([
            { product_type: 'synthesis', factual_accuracy: 4, completeness: 5, clinical_usefulness: 4, time_saved_minutes: 20 },
            { product_type: 'synthesis', factual_accuracy: 2, completeness: 3, clinical_usefulness: 3, time_saved_minutes: 10 },
        ]);
        expect(metrics.sampleSize).toBe(2);
        expect(metrics.factualAccuracyScore).toBe(3);
        expect(metrics.clinicalUsefulnessScore).toBe(3.5);
        expect(metrics.avgTimeSavedMinutes).toBe(15);
    });

    test('buildLearningAgentMetrics computes retention and satisfaction', () => {
        const metrics = buildLearningAgentMetrics({
            retentionRows: [{ returned: 1 }, { returned: 0 }],
            refinementRows: [{ session_sequence_index: 2 }, { session_sequence_index: 4 }],
            memoryRows: [{ memory_score: 60 }, { memory_score: 80 }],
            satisfactionRows: [
                { event_type: 'feedback_helpful' },
                { event_type: 'feedback_helpful' },
                { event_type: 'feedback_confusing' },
            ],
        });
        expect(metrics.retentionImprovementRate).toBe(0.5);
        expect(metrics.avgSearchRefinementDepth).toBe(3);
        expect(metrics.avgKnowledgeMemoryScore).toBe(70);
        expect(metrics.recommendationSatisfactionRate).toBeCloseTo(2 / 3);
    });

    test('buildSearchOnlineQualityMetrics adds no-click and feedback signals', () => {
        const metrics = buildSearchOnlineQualityMetrics({
            impressionRows: [
                { search_id: 1, position: 1, was_clicked: 0, was_saved: 0, dwell_time_ms: 0 },
            ],
            feedbackStats: { helpful: 3, notHelpful: 1, notHelpfulRate: 0.25 },
            noClickStats: { noClickRate: 0.4, noClickCount: 4, searchCount: 10, sampleTopics: [{ topic: 'heart failure', count: 2 }] },
            volumeStats: { reformulationRate: 0.2, reformulatedSearches: 2, totalSearches: 10 },
            lowRecallRows: [{ display_query: 'ards ventilation' }],
            failureClusters: [{ topic: 'ards ventilation', lowRecallCount: 3 }],
        });
        expect(metrics.noClickRate).toBe(0.4);
        expect(metrics.searchNotHelpfulRate).toBe(0.25);
        expect(metrics.lowRecallQueryCount).toBe(1);
        expect(metrics.topicFailureClusters[0].topic).toBe('ards ventilation');
    });
});
