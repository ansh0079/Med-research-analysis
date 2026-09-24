'use strict';

/**
 * The canonical clinical vocabulary. The behaviour that matters is scope containment: the flat
 * tag equality this replaced called a guideline about children a mismatch for an adolescent
 * question, which dropped real evidence.
 */

const {
    populationsIn, sexIn, toCanonicalPopulation, populationAncestry, populationCovers,
    studyDesign, issuingBody, jurisdictionOf, sectionEntries, clinicalFacts, queryFacts,
} = require('../../server/services/clinical/clinicalFacts');

describe('population', () => {
    test('reads the populations a text states, and none it does not', () => {
        expect(populationsIn('A trial in preterm infants')).toEqual(expect.arrayContaining(['neonatal']));
        expect(populationsIn('Management of hypertension')).toEqual([]);
    });

    test('a narrower group is covered by a source about the wider one', () => {
        expect(populationAncestry('adolescent')).toEqual(['adolescent', 'child']);
        expect(populationCovers(['child'], 'adolescent')).toBe(true);
        expect(populationCovers(['adult'], 'older_adult')).toBe(true);
    });

    test('a wider question is NOT answered by a narrower source', () => {
        expect(populationCovers(['adolescent'], 'adult')).toBe(false);
        expect(populationCovers(['neonatal'], 'adult')).toBe(false);
    });

    test('a source that states no population is silent, not a mismatch', () => {
        expect(populationCovers([], 'child')).toBe(true);
    });

    test('legacy tag names still resolve: stored rows and the pipeline pass them', () => {
        expect(toCanonicalPopulation('paediatric')).toBe('child');
        expect(toCanonicalPopulation('elderly')).toBe('older_adult');
        expect(toCanonicalPopulation('child')).toBe('child');
        expect(toCanonicalPopulation('children in hospital')).toBe('child');
        expect(toCanonicalPopulation('')).toBeNull();
    });

    test('sex is a separate axis and never enters the hierarchy', () => {
        expect(sexIn('Outcomes in women after myocardial infarction')).toEqual(['female']);
        expect(populationsIn('Outcomes in women')).toEqual([]);
        // Sex wording changes nothing on the age axis: this still reads only the hierarchy.
        expect(populationCovers(['adult'], 'older_adult')).toBe(true);
        expect(populationCovers(['older_adult'], 'adult')).toBe(false);
    });
});

describe('study design', () => {
    const design = (pubtype, title = '') => studyDesign({ pubtype, title });

    test('names the design from publication types', () => {
        expect(design(['Randomized Controlled Trial'])).toBe('rct');
        expect(design(['Meta-Analysis'])).toBe('meta_analysis');
        expect(design(['Case Reports'])).toBe('case_report');
    });

    test('falls back to the title when types are absent', () => {
        expect(design([], 'A systematic review of statin therapy')).toBe('systematic_review');
    });

    test('an article with neither types nor title is unknown, not weak', () => {
        expect(design([], '')).toBeNull();
    });

    test('a guideline is a guideline before it is anything else', () => {
        expect(design(['Practice Guideline', 'Review'])).toBe('guideline');
    });
});

describe('issuer and jurisdiction', () => {
    test('recognises an issuing body and the jurisdiction it belongs to', () => {
        expect(issuingBody({ title: 'NICE guideline on hypertension' })).toMatchObject({ jurisdiction: 'uk' });
        expect(jurisdictionOf({ title: '2023 ESC Guidelines for heart failure' })).toBe('europe');
    });

    test('an explicitly declared jurisdiction wins over inference', () => {
        expect(jurisdictionOf({ title: 'NICE guideline', _registry: { jurisdiction: 'US' } })).toBe('us');
    });

    test('an unknown body has no jurisdiction rather than a guessed one', () => {
        expect(jurisdictionOf({ title: 'Local hospital protocol' })).toBeNull();
    });
});

describe('section text', () => {
    test('reads both shapes the pipelines produce', () => {
        expect(sectionEntries({ sections: { Results: ' a   b ' } })).toEqual([['Results', 'a b']]);
        expect(sectionEntries({ _fullTextSections: { Methods: 'c' } })).toEqual([['Methods', 'c']]);
    });

    test('an empty sections object does not hide full-text sections behind it', () => {
        expect(sectionEntries({ sections: {}, _fullTextSections: { Methods: 'c' } })).toEqual([['Methods', 'c']]);
    });
});

describe('facts for an article and a query', () => {
    test('one call answers every axis, and repeats are the same object', () => {
        const article = { title: 'NICE guideline: asthma in children', pubtype: ['Practice Guideline'] };
        const facts = clinicalFacts(article);
        expect(facts).toMatchObject({ design: 'guideline', isGuideline: true, jurisdiction: 'uk' });
        expect(facts.populations).toContain('child');
        expect(clinicalFacts(article)).toBe(facts); // cached per article
    });

    test('a query states its own population and jurisdiction', () => {
        expect(queryFacts('NICE guidance for pregnant women')).toMatchObject({
            population: 'pregnancy', jurisdiction: 'uk',
        });
        expect(queryFacts('heart failure treatment').population).toBeNull();
    });
});
