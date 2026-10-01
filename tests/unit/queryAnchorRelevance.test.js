'use strict';

/**
 * Regression test for the revert of commit 7f8e9324 — "a paper that never
 * mentions the condition ranked first for it". "AKI diagnosis and management"
 * returned *Management of toxicities from immunotherapy* first: "diagnosis"
 * and "management" saturated relevance at 1.00 with "aki" absent, and the
 * prestige composite (Surviving Sepsis ≈ 160 on 5,314 citations) could not be
 * overtaken by the capped relevance points.
 *
 * The original commit introduced `queryAnchorTerms` / GENERIC_QUERY_TERMS in
 * queryRelevance.js. The current implementation reached the same semantics
 * through server/utils/conditionQuery.js (`originalConditionTerms` /
 * GENERIC_CLINICAL_TERMS / `articleMatchesConditionTerm`), plus abbreviation
 * disambiguation on top. These tests pin the behaviour either way, so the
 * semantics cannot silently regress again:
 *   - a paper matching none of the terms that name the condition scores 0
 *     and is gated out, whatever its citations;
 *   - scaffolding ("diagnosis", "management") cannot saturate relevance;
 *   - scaffolding-only queries keep the old ratio rules (nothing gated out).
 */

const {
    queryMatchScore, isOffTopic,
} = require('../../server/services/evidenceBouquet/queryRelevance');
const {
    originalConditionTerms, GENERIC_CLINICAL_TERMS,
} = require('../../server/utils/conditionQuery');

const QUERY = 'AKI diagnosis and management';

const ESMO = {
    title: 'Management of toxicities from immunotherapy: ESMO Clinical Practice Guideline for diagnosis, treatment and follow-up',
    abstract: 'Guidance on diagnosis and management of immune-related adverse events including nephritis.',
};
const SEPSIS = {
    title: 'Surviving sepsis campaign: international guidelines for management of sepsis and septic shock 2021',
    abstract: 'Recommendations for management of sepsis and septic shock including fluid resuscitation and vasopressors.',
};
const AKI = {
    title: 'Acute kidney injury in patients with cirrhosis: ADQI and ICA joint consensus',
    abstract: 'New diagnostic criteria, work-up, management and follow-up for acute kidney injury in cirrhosis including hepatorenal syndrome-AKI.',
};

describe('condition-term anchoring', () => {
    it('keeps the condition and drops the scaffolding', () => {
        expect(originalConditionTerms(QUERY)).toEqual(['aki']);
    });

    it('returns nothing to anchor on when the query is only scaffolding', () => {
        // Then no anchor can be required, and the ratio rules apply as before.
        expect(originalConditionTerms('diagnosis and management')).toEqual([]);
    });

    it('treats the words that appear in any guideline title as generic', () => {
        for (const term of ['diagnosis', 'management', 'treatment', 'guidelines']) {
            expect(GENERIC_CLINICAL_TERMS.has(term)).toBe(true);
        }
        expect(GENERIC_CLINICAL_TERMS.has('aki')).toBe(false);
        expect(GENERIC_CLINICAL_TERMS.has('sepsis')).toBe(false);
        expect(GENERIC_CLINICAL_TERMS.has('acute')).toBe(false);
        expect(GENERIC_CLINICAL_TERMS.has('chronic')).toBe(false);
    });
});

describe('relevance for "AKI diagnosis and management"', () => {
    it('scores a paper that never mentions the condition at zero', () => {
        // Before: 1.00, because "diagnosis" and "management" were in its title
        // at 1.5x weight and no term was required.
        expect(queryMatchScore(ESMO, QUERY)).toBe(0);
        expect(queryMatchScore(SEPSIS, QUERY)).toBe(0);
    });

    it('gates those papers out instead of ranking them on prestige', () => {
        // Surviving Sepsis carried 5,314 citations and a composite of 159.8,
        // which no relevance weighting of 22 points could overcome.
        expect(isOffTopic(ESMO, QUERY)).toBe(true);
        expect(isOffTopic(SEPSIS, QUERY)).toBe(true);
    });

    it('keeps the on-topic paper', () => {
        expect(isOffTopic(AKI, QUERY)).toBe(false);
        expect(queryMatchScore(AKI, QUERY)).toBeGreaterThan(0);
    });

    it('still ranks a paper matching the condition above one matching scaffolding', () => {
        expect(queryMatchScore(AKI, QUERY)).toBeGreaterThan(queryMatchScore(ESMO, QUERY));
    });
});

describe('queries made only of scaffolding', () => {
    it('do not gate everything out', () => {
        // No anchor exists, so the ratio rules must still apply.
        expect(isOffTopic(ESMO, 'diagnosis and management')).toBe(false);
    });
});

describe('a single-concept query', () => {
    it('requires that concept', () => {
        expect(isOffTopic(SEPSIS, 'sepsis')).toBe(false);
        expect(isOffTopic(AKI, 'sepsis')).toBe(true);
    });
});

describe('negated and compound forms are not condition hits', () => {
    // Production, 2026-10-01: "diagnosis and management of alcoholic hepatitis"
    // returned the NAFLD practice guidance and NAFLD reviews — "alcoholic" was
    // substring-matching "nonalcoholic" and "hepatitis" was matching
    // "steatohepatitis", so the off-topic gate saw two condition hits.
    const NAFLD_GUIDANCE = {
        title: 'The diagnosis and management of nonalcoholic fatty liver disease: Practice guidance from the AASLD',
        abstract: 'Nonalcoholic fatty liver disease (NAFLD) and its progressive form nonalcoholic steatohepatitis (NASH) are leading causes of chronic liver disease.',
    };
    const AH_GUIDANCE = {
        title: 'Diagnosis and Treatment of Alcohol-Associated Liver Diseases: 2019 Practice Guidance',
        abstract: 'Alcoholic hepatitis is a clinical syndrome of jaundice and liver failure in patients with heavy alcohol use.',
    };

    it('does not match a term inside its negation or a compound word', () => {
        const { textHasTerm } = require('../../server/utils/conditionQuery');
        expect(textHasTerm(NAFLD_GUIDANCE.title.toLowerCase(), 'alcoholic')).toBe(false);
        expect(textHasTerm('non-alcoholic fatty liver disease', 'alcoholic')).toBe(false);
        expect(textHasTerm('nonalcoholic steatohepatitis (nash)', 'hepatitis')).toBe(false);
        expect(textHasTerm('alcoholic hepatitis is a clinical syndrome', 'alcoholic')).toBe(true);
        expect(textHasTerm('patients with chronic hepatitis b', 'hepatitis')).toBe(true);
        // Suffixes still match: the anchor is the word start, not the word end.
        expect(textHasTerm('antibiotics should be given early', 'antibiotic')).toBe(true);
    });

    it('gates NAFLD out of an alcoholic-hepatitis search', () => {
        expect(isOffTopic(NAFLD_GUIDANCE, 'diagnosis and management of alcoholic hepatitis')).toBe(true);
    });

    it('keeps the actual alcoholic-hepatitis guidance', () => {
        expect(isOffTopic(AH_GUIDANCE, 'diagnosis and management of alcoholic hepatitis')).toBe(false);
    });
});

describe('title anchoring in the final order', () => {
    // Production, 2026-10-01: "diagnosis and management of alcoholic hepatitis"
    // ranked "Management of Hepatocellular Carcinoma" and "The global burden of
    // liver disease" above five papers with alcoholic hepatitis in the title —
    // legitimate abstract mentions, wrong prominence.
    const { prioritizeTitleAnchoredResults } = require('../../server/services/evidenceBouquet/queryRelevance');
    const Q = 'diagnosis and management of alcoholic hepatitis';
    const TITLED = { uid: 'titled', title: 'Alcoholic Hepatitis: Diagnosis and Management', abstract: 'Review.' };
    const TITLED_2 = { uid: 'titled2', title: 'Diagnosis and Treatment of Alcohol-Associated Liver Diseases', abstract: 'Guidance.' };
    const PASSING_MENTION = { uid: 'hcc', title: 'Management of Hepatocellular Carcinoma', abstract: 'Risk factors include hepatitis B, hepatitis C and alcoholic liver disease.' };
    const BURDEN = { uid: 'burden', title: 'The global burden of liver disease: The major impact of China', abstract: 'Causes include viral hepatitis, nonalcoholic fatty liver disease and alcoholic liver disease.' };

    it('moves passing mentions below papers whose titles name the condition', () => {
        const out = prioritizeTitleAnchoredResults([PASSING_MENTION, TITLED, BURDEN, TITLED_2], Q);
        expect(out.map((a) => a.uid)).toEqual(['titled', 'titled2', 'hcc', 'burden']);
    });

    it('is a stable partition: relative order inside each group is preserved', () => {
        const out = prioritizeTitleAnchoredResults([BURDEN, PASSING_MENTION, TITLED_2, TITLED], Q);
        expect(out.map((a) => a.uid)).toEqual(['titled2', 'titled', 'burden', 'hcc']);
    });

    it('never demotes a curated landmark pin whose title is a trial acronym', () => {
        const PIN = { uid: 'pin', title: 'STEROIDS AH trial', abstract: 'Randomized.', _pinnedLandmark: true };
        const out = prioritizeTitleAnchoredResults([PIN, TITLED], Q);
        expect(out[0].uid).toBe('pin');
    });

    it('leaves the order untouched when nothing or everything title-matches, or there is no condition term', () => {
        const allTitled = [TITLED, TITLED_2];
        expect(prioritizeTitleAnchoredResults(allTitled, Q).map((a) => a.uid)).toEqual(['titled', 'titled2']);
        const scaffolding = [PASSING_MENTION, TITLED];
        expect(prioritizeTitleAnchoredResults(scaffolding, 'diagnosis and management').map((a) => a.uid)).toEqual(['hcc', 'titled']);
    });

    it('non-alcoholic in the title does not count as naming the condition', () => {
        const NAFLD_TITLED = { uid: 'nafld', title: 'Nutritional assessments of patients with non-alcoholic fatty liver disease', abstract: 'Also discusses alcoholic liver disease.' };
        const out = prioritizeTitleAnchoredResults([NAFLD_TITLED, TITLED], Q);
        expect(out.map((a) => a.uid)).toEqual(['titled', 'nafld']);
    });
});
