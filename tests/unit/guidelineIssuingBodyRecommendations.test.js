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

const issuingBodyRecommendations = [
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
    const prompt = promptFor({ documentBody: 'EASL', issuingBodyRecommendations });

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

    test('attributes them to the organisation, not to this specific document', () => {
        // Body-level matching cannot tell which of an organisation's documents a
        // recommendation came from, so the prompt must not let the model imply
        // this one is its source.
        expect(prompt).toMatch(/Attribute them to EASL, not to this specific document/);
        expect(prompt).toMatch(/year differs from this document/);
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

    test('still says the summary may be incomplete or a different edition', () => {
        // Built from extracted rows attributed to the body, not this document's
        // full text. Claiming completeness here is exactly the overreach this
        // product cannot afford.
        expect(prompt).toMatch(/may be incomplete or reflect a different edition/);
    });

    test('still suppresses study-shaped fields', () => {
        expect(prompt).toMatch(/Set every study-shaped field to null/);
        expect(prompt).toContain('NOT A STUDY');
    });
});

describe('a guideline whose own recommendations are not known', () => {
    const prompt = promptFor({ documentBody: 'EASL', issuingBodyRecommendations: [] });

    test('falls back to saying so plainly', () => {
        expect(prompt).toMatch(/recommendations are therefore not\s+summarised here/);
        expect(prompt).toMatch(/Do NOT state or imply any recommendation as being from this document/);
    });

    test('does not ask for recommendations it does not have', () => {
        expect(prompt).not.toMatch(/mainFindings: state these recommendations/);
    });

    test.each([undefined, null, []])('treats %p as nothing known', (value) => {
        expect(promptFor({ documentBody: 'EASL', issuingBodyRecommendations: value }))
            .toMatch(/Do NOT state or imply any recommendation as being from this document/);
    });
});

describe('the framing only applies where it should', () => {
    test('a guideline with real text is summarised from that text', () => {
        const withText = buildSynopsisPrompt(easl, {
            guidelineTextMissing: false,
            documentBody: 'EASL',
            issuingBodyRecommendations,
        });
        expect(withText).toContain('NOT A STUDY');
        expect(withText).not.toContain('NO USABLE TEXT WAS RETRIEVED');
    });

    test('a trial never gets guideline framing, whatever context is passed', () => {
        const trial = { ...easl, title: 'Terlipressin versus placebo', pubtype: ['Randomized Controlled Trial'] };
        const prompt = buildSynopsisPrompt(trial, { guidelineTextMissing: true, documentBody: 'EASL', issuingBodyRecommendations });
        expect(prompt).not.toContain('NOT A STUDY');
        expect(prompt).not.toContain('Terlipressin plus albumin is first-line for HRS-AKI.');
    });
});
