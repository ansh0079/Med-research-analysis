'use strict';

const {
    detectLexicalContradictions,
    compactContradictionCard,
} = require('../../server/services/guidelineContradictionService');
const { buildRetrievalContext } = require('../../server/services/agentHelpers/retrievalContext');

describe('guidelineContradictionService', () => {
    test('detects opposing recommend vs do-not rows from different bodies', () => {
        const cards = detectLexicalContradictions([
            {
                id: 'a',
                sourceBody: 'NICE',
                recommendationText: 'Offer nimodipine to adults after aneurysmal subarachnoid haemorrhage to reduce poor outcome.',
            },
            {
                id: 'b',
                sourceBody: 'ESC',
                recommendationText: 'Do not offer nimodipine routinely after aneurysmal subarachnoid haemorrhage.',
            },
            {
                id: 'c',
                sourceBody: 'NICE',
                recommendationText: 'Offer nimodipine again from the same body.',
            },
        ]);
        expect(cards).toHaveLength(1);
        expect(cards[0].severity).toBe('minor');
        expect(cards[0].contradictionSummary).toMatch(/NICE|ESC/);
    });

    test('agent retrieval context renders contradiction cards', () => {
        const text = buildRetrievalContext({
            contradictions: [{
                severity: 'major',
                contradictionSummary: 'NICE and ESC disagree on BP targets after ICH.',
                guidelineA: { sourceBody: 'NICE' },
                guidelineB: { sourceBody: 'AHA/ASA' },
            }],
        });
        expect(text).toContain('Cross-body guideline contradiction cards');
        expect(text).toContain('[MAJOR]');
        expect(text).toContain('NICE vs AHA/ASA');
        expect(compactContradictionCard({
            severity: 'minor',
            contradictionSummary: 'Threshold difference',
            guidelineA: { sourceBody: 'WHO' },
            guidelineB: { sourceBody: 'ESC' },
        })).toContain('[MINOR]');
    });
});
