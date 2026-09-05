'use strict';

const { buildSynthesisPrompt } = require('../../server/prompts');
const {
    validateSynthesisCitations,
    extractAndValidateCitations,
    extractSynthesisClaims,
} = require('../../server/services/ai/synthesisGenerationCore');
const {
    CURATED_PUBMED_ARTICLES,
    GROUNDED_CURATED_SYNTHESIS,
    MISGROUNDED_CURATED_SYNTHESIS,
} = require('../fixtures/curatedPubMedCorpus');

describe('curated PubMed synthesis trust corpus', () => {
    test('prompt includes each curated abstract for citation grounding', () => {
        const prompt = buildSynthesisPrompt(CURATED_PUBMED_ARTICLES, 'ICU landmark trials');
        expect(prompt).toContain('6 ml per kilogram');
        expect(prompt).toContain('Early goal-directed therapy');
        expect(prompt).toContain('NICE-SUGAR');
        expect(prompt).toContain('[STUDY 1]');
        expect(prompt).toContain('[STUDY 3]');
    });

    test('grounded synthesis cites the exact landmark for each claim', async () => {
        const synthesis = {
            ...GROUNDED_CURATED_SYNTHESIS,
            _contextArticles: CURATED_PUBMED_ARTICLES,
        };
        const result = await validateSynthesisCitations(synthesis, {
            sourceCount: CURATED_PUBMED_ARTICLES.length,
            guidelineCount: 0,
        });
        expect(result.ok).toBe(true);
        expect(result.citationRelevance.hasIrrelevantCitations).toBe(false);
        expect(result.citationRelevance.issues).toEqual([]);

        const tidal = extractAndValidateCitations(
            'Lower tidal volume of 6 ml/kg reduced ARDS mortality versus 12 ml/kg [1].',
            CURATED_PUBMED_ARTICLES
        );
        expect(tidal).toHaveLength(1);
        expect(tidal[0].sourceIndex).toBe(1);
        expect(tidal[0].valid).toBe(true);

        const sepsis = extractAndValidateCitations(
            'Early goal-directed therapy reduced in-hospital sepsis mortality [2].',
            CURATED_PUBMED_ARTICLES
        );
        expect(sepsis[0].sourceIndex).toBe(2);
        expect(sepsis[0].valid).toBe(true);

        const glucose = extractAndValidateCitations(
            'Intensive glucose control increased ICU mortality versus conventional control [3].',
            CURATED_PUBMED_ARTICLES
        );
        expect(glucose[0].sourceIndex).toBe(3);
        expect(glucose[0].valid).toBe(true);

        const claims = extractSynthesisClaims(synthesis);
        expect(claims.some((c) => /tidal volume/i.test(c))).toBe(true);
        expect(claims.some((c) => /goal-directed/i.test(c))).toBe(true);
        expect(claims.some((c) => /glucose/i.test(c))).toBe(true);
    });

    test('mis-cited ARDS claim against NICE-SUGAR fails grounding', async () => {
        const synthesis = {
            ...MISGROUNDED_CURATED_SYNTHESIS,
            _contextArticles: CURATED_PUBMED_ARTICLES,
        };
        const result = await validateSynthesisCitations(synthesis, {
            sourceCount: CURATED_PUBMED_ARTICLES.length,
            guidelineCount: 0,
        });
        expect(result.citationRelevance.hasIrrelevantCitations).toBe(true);
        const bottomLine = extractAndValidateCitations(
            synthesis.clinicalBottomLine,
            CURATED_PUBMED_ARTICLES
        );
        expect(bottomLine[0].sourceIndex).toBe(3);
        expect(bottomLine[0].valid).toBe(false);
    });
});
