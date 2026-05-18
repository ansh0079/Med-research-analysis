const { buildSynthesisPrompt } = require('../../server/prompts');

describe('synthesis trajectory prompt', () => {
    test('includes knowledge delta instructions when previous queries are supplied', () => {
        const prompt = buildSynthesisPrompt(
            [{ title: 'New septic shock vasopressor RCT', abstract: 'Subgroup results for vasopressor timing.', pubdate: '2026', pubtype: ['Randomized Controlled Trial'] }],
            'vasopressors in septic shock',
            [],
            { previousQueries: ['sepsis management', 'fluids in sepsis'] }
        );

        expect(prompt).toContain('SESSION TRAJECTORY');
        expect(prompt).toContain('Knowledge Delta');
        expect(prompt).toContain('Do not repeat basic definitions');
        expect(prompt).toContain('sepsis management -> fluids in sepsis');
        expect(prompt).toContain('evidenceDisagreement');
        expect(prompt).toContain('practiceImpact');
    });
});
