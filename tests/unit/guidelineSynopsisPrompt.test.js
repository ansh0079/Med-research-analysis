'use strict';

/**
 * Appraising a guideline as if it were a trial produces nothing useful.
 *
 * Reported by a reader: opening the EASL ascites guideline from search results
 * and asking for a synopsis returned a summary of the abstract rather than the
 * guideline's recommendations. The cause is the synopsis schema, which asks for
 * a primary outcome, effect sizes, confidence intervals, p-values, sample size
 * and risk of bias. A practice guideline has none of those, so the model
 * satisfies the fields the only way it can -- by paraphrasing the abstract.
 *
 * PubMed labels these documents reliably ("Practice Guideline", "Consensus
 * Statement"), so the prompt now reframes what each field should contain when
 * the article is one. Field *names* are unchanged on purpose: rendering,
 * citation validation, grounding and trust labelling all consume this shape.
 */

const { buildSynopsisPrompt } = require('../../server/prompts');

const article = (pubtype) => ({
    title: 'EASL clinical practice guidelines on the management of ascites',
    abstract: 'These guidelines cover the management of ascites in cirrhosis.',
    journal: 'J Hepatol',
    pubtype,
});

describe('synopsis prompt for guideline documents', () => {
    test.each([
        [['Journal Article', 'Practice Guideline', 'Review']],
        [['Consensus Statement', 'Journal Article']],
        [['Guideline']],
    ])('reframes the task for %s', (pubtype) => {
        expect(buildSynopsisPrompt(article(pubtype), {})).toContain('NOT A STUDY');
    });

    test('asks for the recommendations, which is what a reader wants from a guideline', () => {
        const prompt = buildSynopsisPrompt(article(['Practice Guideline']), {});
        expect(prompt).toContain('RECOMMENDATIONS THEMSELVES');
        expect(prompt).toMatch(/graded strength/i);
    });

    test('tells the model not to invent trial statistics it cannot have', () => {
        const prompt = buildSynopsisPrompt(article(['Practice Guideline']), {});
        expect(prompt).toMatch(/no primary outcome, effect size, confidence interval, p-value or sample\s+size/i);
    });

    test('rates trust on the issuing body rather than sample size', () => {
        const prompt = buildSynopsisPrompt(article(['Practice Guideline']), {});
        expect(prompt).toMatch(/never sample size or risk of bias/i);
    });
});

describe('synopsis prompt for everything else', () => {
    test.each([
        [['Randomized Controlled Trial']],
        [['Journal Article', 'Review']],
        [['Meta-Analysis']],
        [undefined],
    ])('leaves %s on the study-shaped path', (pubtype) => {
        expect(buildSynopsisPrompt(article(pubtype), {})).not.toContain('NOT A STUDY');
    });

    test('does not treat a trial that merely cites guidelines as a guideline', () => {
        const trial = {
            title: 'Terlipressin versus placebo, a guideline-concordant randomised trial',
            abstract: 'We followed EASL guideline recommendations for enrolment.',
            pubtype: ['Randomized Controlled Trial'],
        };
        expect(buildSynopsisPrompt(trial, {})).not.toContain('NOT A STUDY');
    });
});

describe('the output contract is unchanged', () => {
    test.each(['mainFindings', 'bottomLine', 'trustRating', 'takeaway', 'practiceImplication'])(
        'both paths still request %s',
        (field) => {
            expect(buildSynopsisPrompt(article(['Practice Guideline']), {})).toContain(`"${field}"`);
            expect(buildSynopsisPrompt(article(['Randomized Controlled Trial']), {})).toContain(`"${field}"`);
        },
    );
});
