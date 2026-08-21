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
            .toEqual(['semantic', 'openalex', 'pubmed']);
        expect(routeSearchSources(['pubmed'], profile, { explicitSources: true }))
            .toEqual(['pubmed']);
    });
});
