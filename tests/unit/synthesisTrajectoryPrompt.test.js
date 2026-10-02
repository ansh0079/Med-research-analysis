const { buildSynthesisPrompt } = require('../../server/prompts');
const { selectTopSynthesisArticles } = require('../../server/services/ai/synthesisGenerationCore');

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

    test('includes the complete 20-paper synopsis set and identifies Study 1 as highest priority', () => {
        const articles = Array.from({ length: 20 }, (_, index) => ({
            title: `Evidence paper ${index + 1}`,
            abstract: `Abstract ${index + 1}`,
            pubdate: '2026',
            pubtype: ['Journal Article'],
        }));

        const prompt = buildSynthesisPrompt(articles, 'evidence topic');

        expect(prompt).toContain('[STUDY 20]');
        expect(prompt).toContain('STUDY 1 is the highest-priority included source');
        expect(prompt).toContain('synopsis of the supplied evidence set');
    });

    test('selects the strongest eligible evidence before high-impact weaker designs', () => {
        const selected = selectTopSynthesisArticles([
            { uid: 'observational', title: 'Popular cohort', _ebmScore: 3, _quality: { grade: 'A' }, _impact: { score: 99 } },
            { uid: 'rct', title: 'Randomised trial', _ebmScore: 9, _quality: { grade: 'B' }, _impact: { score: 1 } },
            { uid: 'review', title: 'Retracted review', _ebmScore: 10, _quality: { grade: 'A' }, _retraction: { isRetracted: true } },
        ]);

        expect(selected.map((article) => article.uid)).toEqual(['rct', 'observational']);
    });
});
