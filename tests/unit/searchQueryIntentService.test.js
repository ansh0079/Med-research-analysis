'use strict';

const {
    deriveSearchIntentProfile,
    routeSearchSources,
} = require('../../server/services/searchQueryIntentService');

describe('searchQueryIntentService', () => {
    test('detects landmark queries and maps them to therapeutic bouquet ranking', () => {
        const profile = deriveSearchIntentProfile('landmark trial low tidal volume ventilation ARDS');
        expect(profile.primaryIntent).toBe('landmark');
        expect(profile.bouquetIntent).toBe('therapeutic');
        expect(profile.preferredArchetypes[0]).toBe('landmark_rct');
    });

    test('augments default sources but respects explicit source selection', () => {
        const profile = deriveSearchIntentProfile('mechanism of cytokine storm');
        expect(routeSearchSources(['pubmed', 'openalex'], profile, { explicitSources: false }))
            .toEqual(['openalex', 'pubmed']);
        expect(routeSearchSources(['pubmed'], profile, { explicitSources: true }))
            .toEqual(['pubmed']);
    });

    test('Semantic Scholar is retired: never routed in, whether requested or added by intent', () => {
        const intents = [
            'mechanism of cytokine storm', 'latest evidence sepsis 2025', 'landmark trial ARDS',
            'guideline for heart failure', 'apixaban safety', 'sepsis',
        ];
        for (const query of intents) {
            const profile = deriveSearchIntentProfile(query);
            for (const explicitSources of [true, false]) {
                const routed = routeSearchSources(['pubmed', 'openalex', 'semantic', 'semantic-scholar'], profile, { explicitSources });
                expect(routed).not.toContain('semantic');
                expect(routed).not.toContain('semantic-scholar');
                expect(routed).toEqual(expect.arrayContaining(['pubmed', 'openalex']));
            }
        }
    });

    test('falls back to PubMed and OpenAlex when only the retired source was requested', () => {
        const profile = deriveSearchIntentProfile('sepsis');
        expect(routeSearchSources(['semantic'], profile, { explicitSources: true })).toEqual(['pubmed', 'openalex']);
    });
});
