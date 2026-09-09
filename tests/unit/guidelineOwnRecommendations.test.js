'use strict';

/**
 * "We should in synopsis mention what that particular document says or
 * proposes."
 *
 * A guideline with no retrievable text used to produce "the text could not be
 * retrieved" -- honest, and useless to the clinician who opened it. Often the
 * corpus does hold recommendations extracted from that very guideline, filed
 * under its issuing body. Where they exist, they are the answer.
 *
 * The hard constraint is attribution. Recommendations from another organisation
 * must never be summarised as this document's, so the prompt only receives rows
 * whose issuing body matched, and is told explicitly not to reach for the
 * other-organisation context that sits elsewhere in the same prompt.
 */

const { buildSynopsisPrompt } = require('../../server/prompts');

const easl = {
    title: 'EASL clinical practice guidelines on the management of ascites',
    abstract: '',
    journal: 'J Hepatol',
    pubtype: ['Journal Article', 'Practice Guideline'],
};

const ownRecommendations = [
    {
        sourceBody: 'EASL',
        sourceYear: 2018,
        recommendationText: 'Terlipressin plus albumin is first-line for HRS-AKI.',
        recommendationStrength: 'strong',
    },
    { sourceBody: 'EASL', sourceYear: 2018, recommendationText: 'Large-volume paracentesis with albumin cover.' },
];

const promptFor = (context) => buildSynopsisPrompt(easl, { guidelineTextMissing: true, ...context });

describe('a guideline whose own recommendations are known', () => {
    const prompt = promptFor({ documentBody: 'EASL', ownRecommendations });

    test('carries the recommendations themselves', () => {
        expect(prompt).toContain('Terlipressin plus albumin is first-line for HRS-AKI.');
        expect(prompt).toContain('Large-volume paracentesis with albumin cover.');
    });

    test('keeps the graded strength attached to the recommendation', () => {
        expect(prompt).toContain('[strength: strong]');
    });

    test('names the body they are attributed to', () => {
        expect(prompt).toContain('EASL');
    });

    test('asks for them in mainFindings, which is what the reader came for', () => {
        expect(prompt).toMatch(/mainFindings: state these recommendations/);
    });

    test('does not tell the model the document could not be summarised', () => {
        expect(prompt).not.toMatch(/recommendations are therefore not\s+summarised here/);
    });

    test('forbids extending them or borrowing other bodies context', () => {
        expect(prompt).toMatch(/Use ONLY the recommendations above/);
        expect(prompt).toMatch(/do not draw on the separate guideline context from other organisations/);
    });

    test('still says the summary may be incomplete', () => {
        // Built from extracted rows, not the full text. Claiming completeness
        // here is exactly the overreach this product cannot afford.
        expect(prompt).toMatch(/may be incomplete/);
    });

    test('still suppresses study-shaped fields', () => {
        expect(prompt).toMatch(/Set every study-shaped field to null/);
        expect(prompt).toContain('NOT A STUDY');
    });
});

describe('a guideline whose own recommendations are not known', () => {
    const prompt = promptFor({ documentBody: 'EASL', ownRecommendations: [] });

    test('falls back to saying so plainly', () => {
        expect(prompt).toMatch(/recommendations are therefore not\s+summarised here/);
        expect(prompt).toMatch(/Do NOT state or imply any recommendation as being from this document/);
    });

    test('does not ask for recommendations it does not have', () => {
        expect(prompt).not.toMatch(/mainFindings: state these recommendations/);
    });

    test.each([undefined, null, []])('treats %p as nothing known', (value) => {
        expect(promptFor({ documentBody: 'EASL', ownRecommendations: value }))
            .toMatch(/Do NOT state or imply any recommendation as being from this document/);
    });
});

describe('the framing only applies where it should', () => {
    test('a guideline with real text is summarised from that text', () => {
        const withText = buildSynopsisPrompt(easl, {
            guidelineTextMissing: false,
            documentBody: 'EASL',
            ownRecommendations,
        });
        expect(withText).toContain('NOT A STUDY');
        expect(withText).not.toContain('NO USABLE TEXT WAS RETRIEVED');
    });

    test('a trial never gets guideline framing, whatever context is passed', () => {
        const trial = { ...easl, title: 'Terlipressin versus placebo', pubtype: ['Randomized Controlled Trial'] };
        const prompt = buildSynopsisPrompt(trial, { guidelineTextMissing: true, documentBody: 'EASL', ownRecommendations });
        expect(prompt).not.toContain('NOT A STUDY');
        expect(prompt).not.toContain('Terlipressin plus albumin is first-line for HRS-AKI.');
    });
});
