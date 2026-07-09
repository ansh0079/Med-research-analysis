const {
    inferTopicFromArticle,
    bestTopicKeyFromText,
} = require('../../server/services/topicInferenceService');

describe('topicInferenceService', () => {
    test('prefers search context over title fallback', () => {
        const result = inferTopicFromArticle(
            { title: 'Randomized trial of ventilation strategies in lung injury', uid: 'x1' },
            { searchTopic: 'ARDS' }
        );
        expect(result.source).toBe('search_context');
        expect(result.canonicalTopic).toContain('respiratory');
    });

    test('matches curated topic map from title', () => {
        const result = inferTopicFromArticle({
            title: 'Early goal-directed therapy in severe sepsis and septic shock',
            uid: 'x2',
        });
        expect(['sepsis', 'septic shock']).toContain(result.displayTopic);
        expect(result.confidence).toBeGreaterThan(0.7);
    });

    test('uses synapse topics when present', () => {
        const result = inferTopicFromArticle({
            title: 'Ventilator management strategies',
            _synapseTopics: ['copd'],
            uid: 'x3',
        });
        expect(result.source).toBe('synapse');
        expect(result.displayTopic).toBe('copd');
    });

    test('falls back to title tokens with low confidence', () => {
        const result = inferTopicFromArticle({
            title: 'Novel biomarker discovery cohort analysis',
            uid: 'x4',
        });
        expect(result.source).toBe('title_fallback');
        expect(result.confidence).toBeLessThan(0.5);
    });

    test('bestTopicKeyFromText finds sepsis in prose', () => {
        expect(bestTopicKeyFromText('Management of septic shock in ICU')).toBe('sepsis');
    });
});
