jest.mock('../../server/services/unifiedEvidenceSearch', () => ({
    fetchUnifiedEvidence: jest.fn(),
}));

const { fetchUnifiedEvidence } = require('../../server/services/unifiedEvidenceSearch');
const { refineSeminalKnowledgeFromCommunity } = require('../../server/services/communitySeminalRefinementService');

describe('communitySeminalRefinementService', () => {
    test('uses community-engaged evidence and upserts refreshed topic knowledge', async () => {
        const articles = [
            { uid: 'pmid-1', title: 'Landmark paper', abstract: 'Important RCT.', pubdate: '2025', pubtype: ['Randomized Controlled Trial'] },
            { uid: 'pmid-2', title: 'Review paper', abstract: 'Important review.', pubdate: '2024', pubtype: ['Systematic Review'] },
            { uid: 'pmid-3', title: 'Safety paper', abstract: 'Important safety signal.', pubdate: '2026', pubtype: ['Journal Article'] },
        ];
        fetchUnifiedEvidence.mockResolvedValueOnce(articles);

        const fetchImpl = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                candidates: [{
                    content: { parts: [{ text: JSON.stringify({
                        mentorMessage: 'Use the landmark RCT first [1].',
                        seminalPapers: [{ sourceIndex: 1, title: 'Landmark paper', whySeminal: 'practice changing', clinicalPrinciple: 'changes care', evidenceStrength: 'HIGH' }],
                        coreTeachingPoints: [{ claim: 'Teaching point [1]', sourceIndices: [1], confidence: 'HIGH' }],
                        caseGenerationHooks: ['case'],
                        mcqAngles: ['mcq'],
                        controversies: [],
                        keywords: ['keyword'],
                    }) }] },
                }],
            }),
        });
        const db = {
            getTopicKnowledge: jest.fn().mockResolvedValue({ topic: 'sepsis', knowledge: { mentorMessage: 'old' } }),
            upsertTopicKnowledge: jest.fn().mockResolvedValue({ id: 1 }),
        };

        const result = await refineSeminalKnowledgeFromCommunity({
            topic: 'sepsis',
            normalizedTopic: 'sepsis',
            communityArticles: [{ uid: 'pmid-1', engagement_score: 10, total_dwell_ms: 90000 }],
            serverConfig: { keys: { gemini: 'test' } },
            db,
            fetchImpl,
        });

        expect(fetchUnifiedEvidence).toHaveBeenCalledWith(expect.objectContaining({
            query: 'sepsis',
            safeLimit: 30,
        }));
        expect(db.upsertTopicKnowledge).toHaveBeenCalledWith(
            'sepsis',
            expect.objectContaining({ mentorMessage: 'Use the landmark RCT first [1].' }),
            expect.arrayContaining([expect.objectContaining({ uid: 'pmid-1', sourceIndex: 1 })]),
            'ai_refreshed',
            0.72
        );
        expect(result).toMatchObject({
            selectedArticleCount: 3,
            communitySeedCount: 1,
            provider: 'gemini',
        });
    });
});
