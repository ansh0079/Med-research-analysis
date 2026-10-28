const { draftToKnowledge } = require('../../server/services/topicMentorDrafts');

describe('draftToKnowledge guideline recommendations', () => {
    const page = {
        mentor_intro: 'x',
        teaching_points: [{ claim: 'c', cites: ['111'], tier: 'guideline' }],
        sources: [{ pmid: '111', design: 'guideline', title: 't', year: '2012' }],
        guideline_recommendations: [{ pmid: '111', source: 'KDIGO AKI 2012', items: [{ num: '2.1.1', text: 'AKI is defined as any of the following.', grade: 'Not Graded', detail: 'SCr rise 0.3 mg/dl in 48 h' }, { text: '' }] }],
    };

    test('carries recommendations with a source index', () => {
        const { knowledge } = draftToKnowledge(page);
        expect(knowledge.guidelineRecommendations).toHaveLength(1);
        expect(knowledge.guidelineRecommendations[0]).toMatchObject({ pmid: '111', sourceIndex: 1 });
        expect(knowledge.guidelineRecommendations[0].items).toEqual([{ num: '2.1.1', text: 'AKI is defined as any of the following.', grade: 'Not Graded', detail: 'SCr rise 0.3 mg/dl in 48 h' }]);
    });

    test('is empty when the draft has none', () => {
        const { knowledge } = draftToKnowledge({ ...page, guideline_recommendations: undefined });
        expect(knowledge.guidelineRecommendations).toEqual([]);
    });
});
