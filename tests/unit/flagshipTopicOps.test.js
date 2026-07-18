'use strict';

const {
    curriculumMatchesFlagship,
    pickClusterWinner,
    buildLandmarkSourceArticles,
    mergeSourceArticles,
    flagshipMatchKeys,
} = require('../../server/services/flagshipTopicOps');

const sepsis = {
    topic: 'Sepsis and septic shock',
    aliases: ['sepsis', 'septic shock', 'Surviving Sepsis Campaign'],
    landmarkPmids: ['26903338', '34599691', '24635773'],
};

describe('flagshipTopicOps', () => {
    test('exact and contained alias matches stay in cluster', () => {
        expect(curriculumMatchesFlagship('Sepsis and septic shock', sepsis).match).toBe(true);
        expect(curriculumMatchesFlagship('sepsis', sepsis).match).toBe(true);
        expect(curriculumMatchesFlagship('Surviving Sepsis Campaign', sepsis).match).toBe(true);
        expect(curriculumMatchesFlagship(
            'Sepsis and septic shock: Sepsis-3 definitions, qSOFA, SOFA score, 1-hour bundle',
            sepsis
        ).match).toBe(true);
    });

    test('does not swallow sibling disease modifiers without fuzzy', () => {
        expect(curriculumMatchesFlagship('Neutropenic sepsis', sepsis).match).toBe(false);
        expect(curriculumMatchesFlagship('Septic arthritis', sepsis).match).toBe(false);
        expect(curriculumMatchesFlagship('Sepsis-associated AKI', sepsis).match).toBe(false);
        expect(curriculumMatchesFlagship('Transfusion-Related Acute Lung Injury', {
            topic: 'ARDS',
            aliases: ['acute respiratory distress syndrome', 'acute lung injury', 'ARDSNet'],
        }).match).toBe(false);
    });

    test('does not cross-match HFrEF with HFpEF curriculum rows', () => {
        const hfref = {
            topic: 'Heart failure with reduced ejection fraction',
            aliases: ['HFrEF', 'Guideline-directed medical therapy for HFrEF'],
        };
        expect(curriculumMatchesFlagship(
            'Heart failure with preserved ejection fraction (HFpEF): diagnosis and emerging therapies',
            hfref
        ).match).toBe(false);
        expect(curriculumMatchesFlagship(
            'Guideline-directed medical therapy for HFrEF: ARNI, beta-blockers, MRA, SGLT2',
            hfref
        ).match).toBe(true);
    });

    test('pickClusterWinner prefers exact flagship title then richest content', () => {
        const winner = pickClusterWinner([
            { id: 1, display_name: 'Sepsis definitions long form', guidelineCount: 4, claimCount: 20, teachingCount: 5 },
            { id: 2, display_name: 'Sepsis and septic shock', guidelineCount: 1, claimCount: 2, teachingCount: 1 },
        ], sepsis);
        expect(winner.id).toBe(2);
    });

    test('buildLandmarkSourceArticles normalizes PMIDs', () => {
        const articles = buildLandmarkSourceArticles(sepsis.landmarkPmids);
        expect(articles).toHaveLength(3);
        expect(articles[0]).toMatchObject({ pmid: '26903338', uid: 'pubmed-26903338', landmark: true });
    });

    test('mergeSourceArticles dedupes by pmid/uid', () => {
        const merged = mergeSourceArticles(
            [{ uid: 'pubmed-1', pmid: '1' }],
            [{ uid: 'pubmed-1', pmid: '1' }, { uid: 'pubmed-2', pmid: '2' }]
        );
        expect(merged.map((a) => a.pmid)).toEqual(['1', '2']);
    });

    test('flagshipMatchKeys includes aliases', () => {
        const keys = flagshipMatchKeys(sepsis);
        expect(keys).toEqual(expect.arrayContaining(['sepsis', 'septic shock', 'sepsis and septic shock']));
    });
});
