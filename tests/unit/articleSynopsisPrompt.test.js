const { buildSynopsisPrompt } = require('../../server/prompts');

describe('article synopsis prompt', () => {
    test('asks for critical appraisal fields in Bottom Line style', () => {
        const prompt = buildSynopsisPrompt({
            title: 'Trial of extracorporeal carbon dioxide removal in COPD exacerbations',
            abstract: 'A randomised clinical trial reporting no significant difference in ventilator-free days and more adverse events.',
            pubdate: '2024',
            source: 'AJRCCM',
            pubtype: ['Randomized Controlled Trial'],
        });

        expect(prompt).toContain('The Bottom Line');
        expect(prompt).toContain('"primaryOutcome"');
        expect(prompt).toContain('"safetyOutcomes"');
        expect(prompt).toContain('"strengths"');
        expect(prompt).toContain('"weaknesses"');
        expect(prompt).toContain('"whatNotToOverclaim"');
        expect(prompt).toContain('"quizFocusPoints"');
        expect(prompt).toContain('neutral result');
    });
});
