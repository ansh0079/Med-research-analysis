const {
    collectTopicReadiness,
    readinessTier,
    missingSignals,
} = require('../../server/services/topicReadinessService');

function createMockDb() {
    const responses = new Map();
    const db = {
        normalizeTopic: (value) => String(value || '').toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').replace(/\s+/g, ' ').trim(),
        get: jest.fn(async (sql) => {
            const table = String(sql).match(/FROM\s+(\w+)/i)?.[1];
            return { count: responses.get(`count:${table}`) ?? 0 };
        }),
        all: jest.fn(async (sql) => {
            const text = String(sql);
            if (text.includes('FROM curriculum_topics')) return responses.get('curriculum') || [];
            if (text.includes('FROM topic_knowledge')) return responses.get('knowledge') || [];
            if (text.includes('FROM topic_guidelines')) return responses.get('guidelines') || [];
            if (text.includes('FROM teaching_objects')) return responses.get('teachingObjects') || [];
            if (text.includes('FROM teaching_object_claims')) return responses.get('claims') || [];
            return [];
        }),
        set(key, value) {
            responses.set(key, value);
            return this;
        },
    };
    return db;
}

describe('topicReadinessService', () => {
    test('assigns readiness tiers from content counts', () => {
        expect(readinessTier({
            topicKnowledge: { id: 1 },
            counts: { sourceArticles: 3, guidelines: 1, claims: 8, teachingObjects: 3, mcqObjects: 1 },
        })).toBe('flagship');

        expect(readinessTier({
            topicKnowledge: { id: 1 },
            counts: { sourceArticles: 1, guidelines: 0, claims: 5, teachingObjects: 2, mcqObjects: 0 },
        })).toBe('learner_ready');

        expect(readinessTier({
            topicKnowledge: null,
            counts: { sourceArticles: 0, guidelines: 1, claims: 0, teachingObjects: 0, mcqObjects: 0 },
        })).toBe('search_ready');

        expect(readinessTier({
            topicKnowledge: null,
            counts: {},
        })).toBe('needs_enrichment');
    });

    test('reports missing signals for learner readiness', () => {
        expect(missingSignals({
            topicKnowledge: null,
            counts: { sourceArticles: 1, guidelines: 0, claims: 2, teachingObjects: 0, mcqObjects: 0 },
        })).toEqual([
            'topic_knowledge',
            'source_articles',
            'guidelines',
            'claims',
            'teaching_objects',
            'mcqs',
        ]);
    });

    test('collects canonical topics from curriculum and topic knowledge', async () => {
        const db = createMockDb()
            .set('curriculum', [
                {
                    id: 10,
                    display_name: 'Sepsis',
                    suggested_query: 'sepsis septic shock',
                    priority: 'high',
                    volatility: 'high',
                    seed_status: 'seeded',
                    block_name: 'Infectious Diseases / Sepsis',
                },
            ])
            .set('knowledge', [
                {
                    id: 20,
                    topic: 'Sepsis',
                    normalized_topic: 'sepsis',
                    status: 'ai_generated',
                    confidence: 0.8,
                    source_articles: JSON.stringify([{ uid: 'a' }, { uid: 'b' }, { uid: 'c' }]),
                    updated_at: '2026-01-01T00:00:00.000Z',
                },
                {
                    id: 21,
                    topic: 'ARDS',
                    normalized_topic: 'ards',
                    status: 'ai_generated',
                    confidence: 0.7,
                    source_articles: JSON.stringify([{ uid: 'x' }, { uid: 'y' }]),
                    updated_at: '2026-01-02T00:00:00.000Z',
                },
            ])
            .set('guidelines', [{ normalized_topic: 'sepsis', count: 1 }])
            .set('teachingObjects', [{ normalized_topic: 'sepsis', total: 3, papers: 2, mcqs: 1 }])
            .set('claims', [{ normalized_topic: 'sepsis', count: 8 }]);

        const report = await collectTopicReadiness(db);

        expect(report.summary.canonicalTopics).toBe(2);
        expect(report.summary.curriculumTopics).toBe(1);
        expect(report.summary.topicKnowledgeRows).toBe(2);
        expect(report.summary.knowledgeOnlyTopics).toBe(1);
        expect(report.summary.byTier.flagship).toBe(1);
        expect(report.summary.byTier.search_ready).toBe(1);
        expect(report.topics.find((topic) => topic.displayName === 'Sepsis').tier).toBe('flagship');
        expect(report.topics.find((topic) => topic.displayName === 'ARDS').source).toBe('topic_knowledge');
    });

    test('attaches topic_knowledge via aliases_normalized when display names differ', async () => {
        const db = createMockDb()
            .set('curriculum', [
                {
                    id: 11,
                    display_name: 'Guideline-directed medical therapy for HFrEF',
                    suggested_query: 'HFrEF GDMT',
                    priority: 'high',
                    volatility: 'high',
                    seed_status: 'seeded',
                    block_name: 'Cardiology',
                },
            ])
            .set('knowledge', [
                {
                    id: 30,
                    topic: 'Heart failure with reduced ejection fraction',
                    normalized_topic: 'heart failure with reduced ejection fraction',
                    canonical_normalized: 'heart failure with reduced ejection fraction',
                    aliases_normalized: JSON.stringify([
                        'heart failure with reduced ejection fraction',
                        'guideline directed medical therapy for hfref',
                        'hfref',
                    ]),
                    status: 'ai_generated',
                    confidence: 0.75,
                    source_articles: JSON.stringify([{ uid: 'a' }, { uid: 'b' }, { uid: 'c' }]),
                    updated_at: '2026-01-01T00:00:00.000Z',
                },
            ])
            .set('guidelines', [{
                normalized_topic: 'guideline-directed medical therapy for hfref',
                count: 4,
            }])
            .set('teachingObjects', [{
                normalized_topic: 'guideline-directed medical therapy for hfref',
                total: 5,
                papers: 3,
                mcqs: 1,
            }])
            .set('claims', [{
                normalized_topic: 'guideline-directed medical therapy for hfref',
                count: 17,
            }]);

        const report = await collectTopicReadiness(db);
        const row = report.topics.find((t) => t.displayName === 'Guideline-directed medical therapy for HFrEF');
        expect(row.topicKnowledge).toBeTruthy();
        expect(row.counts.sourceArticles).toBe(3);
        expect(row.counts.guidelines).toBe(4);
        expect(row.tier).toBe('flagship');
    });
});
