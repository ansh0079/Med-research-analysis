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

    test('includes guideline and topic knowledge context and larger full-text excerpts', () => {
        const longResults = 'mortality benefit '.repeat(600);
        const prompt = buildSynopsisPrompt({
            title: 'Trial of intervention in COPD',
            abstract: 'Trial abstract.',
            pubdate: '2025',
            pubtype: ['Randomized Controlled Trial'],
            _fullTextIndexed: true,
            _fullTextWordCount: 12000,
            _fullTextSections: {
                results: longResults,
                methods: 'multicentre randomized methods '.repeat(200),
            },
        }, {
            topic: 'COPD exacerbation',
            guidelines: [{
                sourceBody: 'GOLD',
                sourceYear: 2025,
                recommendationText: 'Use non-invasive ventilation when indicated.',
                recommendationStrength: 'Strong',
            }],
            topicKnowledge: {
                knowledge: 'NIV is a central context point for COPD exacerbation appraisal.',
                sourceArticles: ['Seminal COPD trial'],
            },
        });

        expect(prompt).toContain('Guideline context');
        expect(prompt).toContain('GOLD');
        expect(prompt).toContain('Curated topic knowledge');
        expect(prompt).toContain('NIV is a central context point');
        expect(prompt).toContain(longResults.slice(0, 7000));
    });
});
