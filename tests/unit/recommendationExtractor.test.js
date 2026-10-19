'use strict';

const { extractRecommendationSentences } = require('../../server/services/agentHelpers/recommendationExtractor');
const { renderTopSourcesDocument } = require('../../server/services/agentHelpers/topSources');

describe('extractRecommendationSentences', () => {
    test('quotes recommendation sentences exactly and drops caveats and study design', () => {
        const text = 'Results were pooled across trials. We recommend that patients with severe alcoholic hepatitis receive prednisolone for 28 days unless contraindicated. '
            + 'Future studies should test this further in larger trials. Abstinence is strongly recommended for all patients with alcohol-related liver disease. '
            + 'Patients were included if older than 18 years of age.';
        expect(extractRecommendationSentences(text)).toEqual([
            'We recommend that patients with severe alcoholic hepatitis receive prednisolone for 28 days unless contraindicated.',
            'Abstinence is strongly recommended for all patients with alcohol-related liver disease.',
        ]);
    });

    test('quotes the sentences that follow a conclusions marker', () => {
        const text = 'Background was given here and is long enough to be a sentence on its own. Conclusions Naltrexone remained the best supported option for craving. '
            + 'Acamprosate showed smaller effects in the pooled analysis. Larger trials are awaited by the field.';
        const out = extractRecommendationSentences(text);
        expect(out).toContain('Conclusions Naltrexone remained the best supported option for craving.');
        expect(out).toContain('Acamprosate showed smaller effects in the pooled analysis.');
    });

    test('drops keyword lists and acknowledgements even beside a conclusions marker', () => {
        const text = 'Conclusions Steroids should be offered to eligible patients with severe disease. Keywords: alcohol, hepatitis, steroids, survival, trials. '
            + 'Acknowledgments The authors used a large language model to edit the manuscript text.';
        const out = extractRecommendationSentences(text);
        expect(out).toHaveLength(1);
        expect(out[0]).toContain('Steroids should be offered');
    });

    test('never returns the same sentence twice and respects the cap', () => {
        const s = 'We recommend that clinicians screen every adult patient for the condition at first contact.';
        expect(extractRecommendationSentences(`${s} ${s}`)).toHaveLength(1);
        const many = Array.from({ length: 80 }, (_, i) => `We recommend measure number ${i} for every patient seen in clinic today.`).join(' ');
        expect(extractRecommendationSentences(many, { max: 10 })).toHaveLength(10);
    });
});

describe('top-sources document with stored full text', () => {
    const documents = [{
        id: 7, title: 'A meta-analysis of steroids in alcoholic hepatitis', source_year: 2024, full_text_source: 'jats',
        text_excerpt: 'Abstract only excerpt that should not be shown when full text exists.',
    }];

    test('quotes recommendations from the stored full text of an open-access document', () => {
        const fullText = `${'Filler sentence about methods and the many trials that were screened for inclusion. '.repeat(40)}`
            + 'We recommend that corticosteroids be offered to patients with severe alcoholic hepatitis and a Maddrey score above 32.';
        const { markdown } = renderTopSourcesDocument({ topic: '', guidelines: [], articles: [], documents, fullTexts: { 7: { text: fullText, source: 'jats' } }, count: 5 });
        expect(markdown).toContain('quoted exactly');
        expect(markdown).toContain('1. We recommend that corticosteroids be offered to patients with severe alcoholic hepatitis and a Maddrey score above 32.');
        expect(markdown).not.toContain('should not be shown when full text exists');
    });

    test('says plainly when only the abstract is stored', () => {
        const { markdown } = renderTopSourcesDocument({ topic: '', guidelines: [], articles: [], documents, fullTexts: {}, count: 5 });
        expect(markdown).toContain('Only the abstract is stored');
    });
});
