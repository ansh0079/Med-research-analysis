const {
    buildTopicOutline,
    computeUncoveredOutlineNodes,
    formatUncoveredOutlinePrompt,
} = require('../../server/services/outlineCoverageService');

describe('outlineCoverageService', () => {
    test('buildTopicOutline creates teaching and mcq nodes', () => {
        const outline = buildTopicOutline({
            topic: 'ARDS',
            knowledge: {
                teachingPoints: ['Low tidal volume', { claim: 'PEEP titration' }],
                mcqAngles: ['VILI mechanism'],
            },
            sourceArticles: [{ title: 'ARDSNet', sourceIndex: 1 }],
        });
        expect(outline.nodes.map((n) => n.id)).toEqual(expect.arrayContaining(['tp-1', 'tp-2', 'mcq-1', 'src-1']));
    });

    test('computeUncoveredOutlineNodes filters attempted ids', () => {
        const outline = buildTopicOutline({
            knowledge: { teachingPoints: ['A', 'B'] },
        });
        const uncovered = computeUncoveredOutlineNodes(outline, new Set(['tp-1']));
        expect(uncovered).toHaveLength(1);
        expect(uncovered[0].id).toBe('tp-2');
    });

    test('formatUncoveredOutlinePrompt includes proactive instruction', () => {
        const text = formatUncoveredOutlinePrompt([{ id: 'tp-2', label: 'PEEP strategy' }]);
        expect(text).toContain('UNCOVERED OUTLINE NODES');
        expect(text).toContain('tp-2');
        expect(text).toContain('PROACTIVE INSTRUCTION');
    });
});
