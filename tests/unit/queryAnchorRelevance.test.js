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
